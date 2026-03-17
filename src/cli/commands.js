import { StatsAnalyzer } from '../stats/analyzer.js';
import { StatsReport } from '../stats/report.js';
import { CLIUI } from './ui.js';
import ConfigManager from '../config/manager.js';
import { ConfigWizard } from '../config/wizard.js';
import { EnhancedNotificationSystem } from '../notification/enhanced-notifier.js';
import {
  ensureDir,
  getDataDir,
  getLogDir,
  getTemplatesDir,
  getConfigPath,
  getStatsPath,
  getDefaultConfigPath
} from '../utils/path.js';

export class CLICommands {
  constructor() {
    this.configManager = new ConfigManager();
    this.statsAnalyzer = null;
    this.statsReport = new StatsReport();
    this.notificationSystem = null;
  }

  async checkPm2() {
    const { execSync } = await import('child_process');
    try {
      // 使用 npx 来查找和执行 pm2
      execSync('npx pm2 --version', { stdio: 'pipe' });
    } catch (error) {
      console.error('\n❌ 错误: 未找到 pm2');
      console.log('\npm2 应该随 code-time-monitor 自动安装');
      console.log('如果仍然出现问题，请尝试手动安装:');
      console.log('  npm install -g pm2');
      console.log('  或');
      console.log('  tnpm install -g pm2\n');
      process.exit(1);
    }
  }

  async getPm2Command() {
    // 使用 npx 来确保能找到 pm2
    return 'npx pm2';
  }

  async version() {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const packageJson = require('../../package.json');
    console.log(`code-time-monitor v${packageJson.version}`);
  }

  async setup() {
    console.log('🚀 开始设置编码时间监控工具...\n');

    try {
      // 创建必要的目录
      const directories = [
        getDataDir(),
        getLogDir()
      ];

      console.log('创建目录...');
      for (const dir of directories) {
        await ensureDir(dir);
        console.log(`  ✓ ${dir}`);
      }

      // 检查配置文件
      const configPath = getConfigPath();
      const defaultConfigPath = getDefaultConfigPath();

      try {
        const { access } = await import('fs/promises');
        await access(configPath);
        console.log(`  ✓ 配置文件已存在: ${configPath}`);
      } catch {
        console.log(`  创建配置文件: ${configPath}`);
        const { copyFile } = await import('fs/promises');
        await copyFile(defaultConfigPath, configPath);
      }

      // 检查统计数据文件
      const statsPath = getStatsPath();

      try {
        const { access } = await import('fs/promises');
        await access(statsPath);
        console.log(`  ✓ 统计数据文件已存在: ${statsPath}`);
      } catch {
        console.log(`  创建统计数据文件: ${statsPath}`);
        const { writeFile } = await import('fs/promises');
        const emptyStats = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          today: {
            date: new Date().toISOString().split('T')[0],
            totalMinutes: 0,
            sessions: [],
            byProject: {},
            hourlyDistribution: {}
          },
          history: {},
          notifications: {
            lastDailyWarning: null,
            lastNightReminder: null,
            lastBreakReminder: null
          }
        };
        await writeFile(statsPath, JSON.stringify(emptyStats, null, 2));
      }

      console.log('\n✅ 设置完成！\n');
      console.log('下一步:');
      console.log('  1. 添加要监控的项目:');
      console.log('     ctm add-project');
      console.log('');
      console.log('  2. 启动监控服务:');
      console.log('     ctm start');
      console.log('');
      console.log('  3. 查看运行状态:');
      console.log('     ctm status');
      console.log('');

    } catch (error) {
      console.error('\n❌ 设置失败:', error.message);
      process.exit(1);
    }
  }

  async init() {
    await this.configManager.load();
    const { Persistence } = await import('../tracker/persistence.js');
    const persistence = new Persistence(this.configManager);
    this.statsAnalyzer = new StatsAnalyzer(persistence);
    
    // 初始化通知系统
    if (!this.notificationSystem) {
      this.notificationSystem = new EnhancedNotificationSystem(
        this.configManager.get(),
        persistence
      );
    }
  }

  async status() {
    await this.init();
    const projects = this.configManager.getProjects();
    const { SessionManager } = await import('../tracker/session.js');
    const { Persistence } = await import('../tracker/persistence.js');
    const persistence = new Persistence(this.configManager);
    const stats = await persistence.getTodayStats();
    
    CLIUI.title('📊 编码时间监控工具 - 状态');
    
    console.log('项目配置:');
    if (projects.length === 0) {
      console.log('  暂无配置的项目');
      console.log('  使用 "ctm add-project" 添加项目');
    } else {
      projects.forEach(project => {
        const status = project.enabled ? '✓ 监控中' : '✗ 已禁用';
        console.log(`  • ${project.name}: ${status}`);
        console.log(`    路径: ${project.path}`);
      });
    }
    
    console.log('\n今日统计:');
    const { TimeCalculator } = await import('../tracker/calculator.js');
    console.log(`  总时长: ${TimeCalculator.formatDuration(stats.totalMinutes)}`);
    console.log(`  会话数: ${stats.sessions.length}`);
    
    if (Object.keys(stats.byProject).length > 0) {
      console.log('\n按项目:');
      for (const [project, minutes] of Object.entries(stats.byProject)) {
        console.log(`  • ${project}: ${TimeCalculator.formatDuration(minutes)}`);
      }
    }
    
    console.log('');
  }

  async stats(options) {
    await this.init();

    let summary, title, message;

    if (options.today) {
      summary = await this.statsAnalyzer.getTodaySummary();
      console.log(this.statsReport.formatTodaySummary(summary));
      title = '今日编码统计';
      message = `今日编码时长: ${this.formatTime(summary.totalMinutes)}`;
    } else if (options.week) {
      summary = await this.statsAnalyzer.getWeekSummary();
      console.log(this.statsReport.formatWeekSummary(summary));
      title = '本周编码统计';
      message = `本周编码时长: ${this.formatTime(summary.totalMinutes)}`;
    } else if (options.project) {
      summary = await this.statsAnalyzer.getProjectSummary(options.project);
      console.log(this.statsReport.formatProjectSummary(summary));
      title = `项目 ${options.project} 统计`;
      message = `编码时长: ${this.formatTime(summary.totalMinutes)}`;
    } else {
      summary = await this.statsAnalyzer.getTodaySummary();
      console.log(this.statsReport.formatTodaySummary(summary));
      title = '今日编码统计';
      message = `今日编码时长: ${this.formatTime(summary.totalMinutes)}`;
    }

    // 发送通知
    if (options.notify) {
      await this.sendNotification(title, message);
    }
  }

  async sendNotification(title, message) {
    try {
      if (!this.notificationSystem) {
        await this.init();
      }
      
      // 使用统一的通知系统
      this.notificationSystem.notify(title, message, {
        timeout: 10 // CLI 通知显示时间稍长
      });
    } catch (error) {
      console.error('发送通知失败:', error.message);
    }
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}分钟`;
    }

    if (mins === 0) {
      return `${hours}小时`;
    }

    return `${hours}小时${mins}分钟`;
  }

  async addProject() {
    await this.init();
    
    const spinner = CLIUI.spinner('加载配置...');
    await spinner.start();
    await this.configManager.load();
    spinner.stop();
    
    const wizard = new ConfigWizard(this.configManager);
    await wizard.run();
  }

  async config(action) {
    await this.init();
    
    const config = this.configManager.get();
    
    if (action === 'show') {
      console.log('\n当前配置:');
      console.log(JSON.stringify(config, null, 2));
    } else if (action === 'edit') {
      const { getConfigPath } = await import('../utils/path.js');
      const configPath = getConfigPath();
      console.log(`\n配置文件路径: ${configPath}`);
      console.log('请使用文本编辑器打开编辑\n');
    } else if (action === 'reset') {
      const spinner = CLIUI.spinner('重置配置...');
      await spinner.start();
      
      this.configManager.reset();
      await this.configManager.save();
      
      spinner.stop();
      CLIUI.success('配置已重置为默认值');
    }
  }

  async resetStats() {
    await this.init();
    
    const inquirer = await import('inquirer');
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '确定要重置所有统计数据吗？此操作不可恢复。',
        default: false
      }
    ]);
    
    if (confirm) {
      const spinner = CLIUI.spinner('重置统计数据...');
      await spinner.start();
      
      const { Persistence } = await import('../tracker/persistence.js');
      const persistence = new Persistence(this.configManager);
      await persistence.resetStats();
      
      spinner.stop();
      CLIUI.success('统计数据已重置');
    } else {
      CLIUI.info('操作已取消');
    }
  }

  async start() {
    await this.checkPm2();
    const pm2Cmd = await this.getPm2Command();
    const { execSync } = await import('child_process');

    try {
      // 动态生成 ecosystem 配置
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const { writeFileSync, mkdtempSync, rmSync } = await import('fs');
      const os = await import('os');
      const { getPackageRoot, getLogDir } = await import('../utils/path.js');

      const packageRoot = getPackageRoot();
      const logDir = getLogDir();

      // 创建临时配置文件
      const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ctm-'));
      const tempConfigPath = path.join(tempDir, 'ecosystem.config.cjs');

      const ecosystemConfig = {
        apps: [{
          name: 'code-time-monitor',
          script: path.join(packageRoot, 'src', 'index.js'),
          instances: 1,
          autorestart: true,
          watch: false,
          max_memory_restart: '512M',
          env: {
            NODE_ENV: 'production'
          },
          error_file: path.join(logDir, 'error.log'),
          out_file: path.join(logDir, 'out.log'),
          merge_logs: true
        }]
      };

      writeFileSync(tempConfigPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)}`);

      console.log('🚀 启动监控服务...');
      execSync(`${pm2Cmd} start ${tempConfigPath}`, { stdio: 'inherit' });
      console.log('\n✅ 监控服务已启动');
      console.log('使用 "ctm status" 查看状态');

      // 清理临时文件
      setTimeout(() => {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch (error) {
          // 忽略清理错误
        }
      }, 1000);
    } catch (error) {
      console.error('\n❌ 启动失败:', error.message);
      process.exit(1);
    }
  }

  async stop() {
    await this.checkPm2();
    const pm2Cmd = await this.getPm2Command();
    const { execSync } = await import('child_process');
    try {
      console.log('🛑 停止监控服务...');
      execSync(`${pm2Cmd} stop code-time-monitor`, { stdio: 'inherit' });
      console.log('\n✅ 监控服务已停止');
    } catch (error) {
      console.error('\n❌ 停止失败:', error.message);
      process.exit(1);
    }
  }

  async restart() {
    await this.checkPm2();
    const pm2Cmd = await this.getPm2Command();
    const { execSync } = await import('child_process');
    try {
      console.log('🔄 重启监控服务...');
      execSync(`${pm2Cmd} restart code-time-monitor`, { stdio: 'inherit' });
      console.log('\n✅ 监控服务已重启');
    } catch (error) {
      console.error('\n❌ 重启失败:', error.message);
      process.exit(1);
    }
  }

  async logs() {
    await this.checkPm2();
    const pm2Cmd = await this.getPm2Command();
    const { execSync } = await import('child_process');
    try {
      console.log('📋 查看监控服务日志 (按 Ctrl+C 退出)\n');
      execSync(`${pm2Cmd} logs code-time-monitor`, { stdio: 'inherit' });
    } catch (error) {
      if (error.signal === 'SIGINT') {
        console.log('\n已退出日志查看');
      } else {
        console.error('\n❌ 查看日志失败:', error.message);
        process.exit(1);
      }
    }
  }

  async startup() {
    await this.checkPm2();
    const pm2Cmd = await this.getPm2Command();
    const { execSync } = await import('child_process');
    try {
      console.log('🚀 设置开机自启动...\n');

      // PM2 startup
      execSync(`${pm2Cmd} startup`, { stdio: 'inherit' });

      // 保存当前进程列表
      execSync(`${pm2Cmd} save`, { stdio: 'inherit' });

      console.log('\n✅ 开机自启动已设置');
      console.log('监控服务将在系统重启后自动启动');
    } catch (error) {
      console.error('\n❌ 设置开机自启动失败:', error.message);
      process.exit(1);
    }
  }

  async delete() {
    await this.checkPm2();
    const pm2Cmd = await this.getPm2Command();
    const inquirer = await import('inquirer');
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '确定要删除监控服务吗？此操作会停止并删除 PM2 进程。',
        default: false
      }
    ]);

    if (confirm) {
      const { execSync } = await import('child_process');
      try {
        console.log('🗑️ 删除监控服务...');
        execSync(`${pm2Cmd} delete code-time-monitor`, { stdio: 'inherit' });
        console.log('\n✅ 监控服务已删除');
      } catch (error) {
        console.error('\n❌ 删除失败:', error.message);
        process.exit(1);
      }
    } else {
      console.log('操作已取消');
    }
  }
}

export default CLICommands;