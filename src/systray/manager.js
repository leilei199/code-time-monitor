import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SystrayManager {
  constructor(configManager, persistence) {
    this.configManager = configManager;
    this.persistence = persistence;
    this.menubar = null;
    this.isRunning = false;
    this.updateInterval = null;
  }

  async start() {
    try {
      // 动态导入 menubar
      const menubar = await import('menubar');
      
      const iconPath = path.join(__dirname, '../../icons/icon.png');
      
      // 检查图标文件是否存在
      const fs = await import('fs/promises');
      try {
        await fs.access(iconPath);
      } catch {
        logger.warn('状态栏图标文件不存在，跳过状态栏启动');
        return false;
      }
      
      logger.info('创建 menubar 实例...');
      
      // 创建 menubar 实例
      this.menubar = menubar.default({
        icon: iconPath,
        tooltip: '编码时间监控',
        preloadWindow: true,
        windowOptions: {
          width: 300,
          height: 400,
          resizable: false,
          show: false
        }
      });

      // 等待 menubar 准备就绪
      await new Promise((resolve, reject) => {
        this.menubar.on('ready', () => {
          logger.info('menubar 已准备就绪');
          this.setupTray();
          resolve();
        });
        
        this.menubar.on('error', (error) => {
          logger.error('menubar 错误:', error);
          reject(error);
        });
      });

      this.isRunning = true;
      logger.info('状态栏图标已启动');
      
      // 初始更新状态
      this.updateStatus();
      
      // 定期更新状态栏状态
      this.updateInterval = setInterval(() => {
        this.updateStatus();
      }, 60000); // 每分钟更新一次
      
      return true;
    } catch (error) {
      logger.error('启动状态栏图标失败:', error.message);
      logger.error('错误堆栈:', error.stack);
      return false;
    }
  }

  setupTray() {
    const { app, Tray, Menu } = this.menubar;
    
    // 创建菜单
    const menuTemplate = [
      {
        label: '今日统计',
        click: () => this.showTodayStats()
      },
      {
        label: '刷新状态',
        click: () => this.updateStatus()
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => this.exitApplication()
      }
    ];
    
    const menu = Menu.buildFromTemplate(menuTemplate);
    this.menubar.tray.setContextMenu(menu);
    
    // 设置工具提示
    this.menubar.tray.setToolTip('编码时间监控');
    
    logger.info('状态栏菜单已设置');
  }

  async stop() {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      
      if (this.menubar && this.isRunning) {
        try {
          this.menubar.app.quit();
        } catch (e) {
          logger.warn('停止状态栏图标时出错:', e.message);
        }
        this.isRunning = false;
        logger.info('状态栏图标已停止');
      }
    } catch (error) {
      logger.error('停止状态栏图标失败:', error.message);
    }
  }

  async showTodayStats() {
    try {
      const stats = await this.persistence.getTodayStats();
      const { TimeCalculator } = await import('../tracker/calculator.js');
      
      let projectInfo = '';
      if (Object.keys(stats.byProject).length > 0) {
        projectInfo = Object.entries(stats.byProject)
          .map(([name, minutes]) => `${name}: ${TimeCalculator.formatDuration(minutes)}`)
          .join('\n');
      }
      
      const message = `
今日编码统计
━━━━━━━━━━━━━━━━
总时长: ${TimeCalculator.formatDuration(stats.totalMinutes)}
会话数: ${stats.sessions.length}
项目数: ${Object.keys(stats.byProject).length}
${projectInfo ? '\n按项目:\n' + projectInfo : ''}
      `.trim();
      
      // 使用 macOS 通知显示统计
      const { NotificationSystem } = await import('../notification/notifier.js');
      const config = this.configManager.get();
      const notifier = new NotificationSystem(config);
      notifier.notify('今日统计', message);
      
    } catch (error) {
      logger.error('显示今日统计失败:', error.message);
    }
  }

  async updateStatus() {
    try {
      if (!this.isRunning || !this.menubar) {
        return;
      }

      const stats = await this.persistence.getTodayStats();
      const { TimeCalculator } = await import('../tracker/calculator.js');
      
      // 更新工具提示
      const tooltip = `编码时间监控 - 今日: ${TimeCalculator.formatDuration(stats.totalMinutes)}`;
      
      if (this.menubar.tray) {
        this.menubar.tray.setToolTip(tooltip);
      }
      
      logger.debug(`更新状态栏状态: ${tooltip}`);
      
    } catch (error) {
      logger.error('更新状态栏状态失败:', error.message);
    }
  }

  async exitApplication() {
    logger.info('从状态栏菜单触发退出');
    
    // 停止状态栏
    await this.stop();
    
    // 发送退出信号
    process.kill(process.pid, 'SIGTERM');
  }
}

export default SystrayManager;