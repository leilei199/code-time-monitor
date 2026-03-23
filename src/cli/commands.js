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
    
    // 尝试读取活跃会话信息
    this.activeSessions = await this.loadActiveSessions();
  }

  async loadActiveSessions() {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { getDataDir } = await import('../utils/path.js');
      const activeSessionsPath = path.join(getDataDir(), 'active-sessions.json');

      const data = await fs.readFile(activeSessionsPath, 'utf-8');
      const activeSessionsData = JSON.parse(data);

      // 检查服务是否正在运行
      const { execSync } = await import('child_process');
      const pm2Cmd = await this.getPm2Command();
      const statusOutput = execSync(`${pm2Cmd} status`, { encoding: 'utf-8' });
      
      if (!statusOutput.includes('code-time-monitor') || !statusOutput.includes('online')) {
        logger.debug('监控服务未运行，忽略活跃会话数据');
        return [];
      }

      // 检查数据是否过期（超过5分钟）
      const dataAge = Date.now() - activeSessionsData.timestamp;
      if (dataAge > 5 * 60 * 1000) {
        logger.debug('活跃会话数据已过期，监控服务可能异常');
        return [];
      }

      // 使用 Session.fromData 重建 Session 对象
      const { Session } = await import('../tracker/session.js');
      return activeSessionsData.sessions.map(sessionData => Session.fromData(sessionData));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.debug('读取活跃会话信息失败:', error.message);
      }
      return [];
    }
  }

  async status() {
    await this.init();
    const projects = this.configManager.getProjects();

    // 复用 StatsAnalyzer，传入活跃会话，保证口径与 ctm stats 完全一致
    const summary = await this.statsAnalyzer.getTodaySummary(this.activeSessions || []);

    CLIUI.title('📊 编码时间监控工具 - 状态');
    
    // 检查监控服务状态
    try {
      const { execSync } = await import('child_process');
      const pm2Cmd = await this.getPm2Command();
      const statusOutput = execSync(`${pm2Cmd} status`, { encoding: 'utf-8' });
      
      if (statusOutput.includes('code-time-monitor') && statusOutput.includes('online')) {
        console.log('监控服务: ✅ 运行中');
      } else if (statusOutput.includes('code-time-monitor') && statusOutput.includes('stopped')) {
        console.log('监控服务: ⏸️  已停止');
      } else if (statusOutput.includes('code-time-monitor') && statusOutput.includes('errored')) {
        console.log('监控服务: ❌ 错误');
      } else {
        console.log('监控服务: ⚠️  未运行');
      }
    } catch (error) {
      console.log('监控服务: ⚠️  无法获取状态');
      console.log('  提示: 使用 "ctm start" 启动监控服务');
    }
    
    console.log('');
    
    console.log('项目配置:');
    if (projects.length === 0) {
      console.log('  暂无配置的项目');
      console.log('  使用 "ctm config add" 添加项目');
    } else {
      projects.forEach(project => {
        const status = project.enabled ? '✓ 监控中' : '✗ 已禁用';
        console.log(`  • ${project.name}: ${status}`);
        console.log(`    路径: ${project.path}`);
      });
    }
    
    // 显示活跃会话
    if (summary.hasActiveSessions) {
      console.log('\n活跃会话:');
      for (const session of summary.activeSessions) {
        console.log(`  • ${session.projectName}: 进行中 (${session.durationMinutes}分钟)`);
      }
    }

    console.log('\n今日统计:');
    const { TimeCalculator } = await import('../tracker/calculator.js');
    console.log(`  总时长: ${TimeCalculator.formatDuration(summary.totalMinutes)}`);
    console.log(`  会话数: ${summary.totalSessions}`);
    if (summary.hasActiveSessions) {
      console.log(`  活跃会话: ${summary.activeSessions.length}个`);
    }
    
    if (Object.keys(summary.byProject).length > 0) {
      console.log('\n按项目:');
      for (const [project, minutes] of Object.entries(summary.byProject)) {
        console.log(`  • ${project}: ${TimeCalculator.formatDuration(minutes)}`);
      }
    }
    
    console.log('');
  }

  async stats(options) {
    await this.init();

    let summary, title, message;

    const activeSessions = this.activeSessions || [];

    if (options.today) {
      summary = await this.statsAnalyzer.getTodaySummary(activeSessions);
      console.log(this.statsReport.formatTodaySummary(summary));
      title = '今日编码统计';
      message = `今日编码时长: ${this.formatTime(summary.totalMinutes)}`;
    } else if (options.week) {
      summary = await this.statsAnalyzer.getWeekSummary(activeSessions);
      console.log(this.statsReport.formatWeekSummary(summary));
      title = '本周编码统计';
      message = `本周编码时长: ${this.formatTime(summary.totalMinutes)}`;
    } else if (options.project) {
      summary = await this.statsAnalyzer.getProjectSummary(options.project, activeSessions);
      console.log(this.statsReport.formatProjectSummary(summary));
      title = `项目 ${options.project} 统计`;
      message = `编码时长: ${this.formatTime(summary.totalMinutes)}`;
    } else {
      summary = await this.statsAnalyzer.getTodaySummary(activeSessions);
      console.log(this.statsReport.formatTodaySummary(summary));
      title = '今日编码统计';
      message = `今日编码时长: ${this.formatTime(summary.totalMinutes)}`;
    }

    // 发送通知
    if (options.notify) {
      await this.sendNotification(title, message);
    }
  }

  async sessions(options = {}) {
    await this.init();

    // --current：查看当前活跃会话详情
    if (options.current) {
      await this.showCurrentSessions();
      return;
    }

    const { Persistence } = await import('../tracker/persistence.js');
    const persistence = new Persistence(this.configManager);

    // 确定日期
    let dateStr;
    if (options.date) {
      dateStr = options.date;
    } else {
      dateStr = new Date().toISOString().split('T')[0];
    }

    const dayData = await persistence.getDaySessions(dateStr);

    CLIUI.title(`📅 ${dateStr} 会话详情`);

    if (dayData.sessions.length === 0) {
      console.log('该日期没有会话记录');
      console.log('');
      return;
    }

    console.log(`总时长: ${this.formatTime(dayData.totalMinutes)}`);
    console.log(`会话数: ${dayData.sessions.length}`);
    console.log('');

    // 按时间排序
    const sortedSessions = [...dayData.sessions].sort((a, b) => {
      return new Date(a.startTime) - new Date(b.startTime);
    });

    // 显示每个会话详情
    sortedSessions.forEach((session, index) => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      const startStr = startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const endStr = endTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

      console.log(`${index + 1}. ${session.projectName} [${session.id}]`);
      console.log(`   时间: ${startStr} - ${endStr} (${session.durationMinutes}分钟)`);

      if (session.filesTouched && session.filesTouched.length > 0) {
        const filesCount = session.filesTouched.length;
        console.log(`   涉及文件: ${filesCount}个`);
        if (!options.simple && filesCount <= 10) {
          session.filesTouched.forEach(file => {
            console.log(`     • ${file}`);
          });
        } else if (!options.simple && filesCount > 10) {
          session.filesTouched.slice(0, 10).forEach(file => {
            console.log(`     • ${file}`);
          });
          console.log(`     ... 还有 ${filesCount - 10} 个文件`);
        }
      }
      console.log('');
    });

    // 按项目汇总
    if (Object.keys(dayData.byProject).length > 0) {
      console.log('按项目汇总:');
      for (const [project, minutes] of Object.entries(dayData.byProject)) {
        const projectSessions = dayData.sessions.filter(s => s.projectName === project);
        console.log(`  • ${project}: ${this.formatTime(minutes)} (${projectSessions.length}个会话)`);
      }
      console.log('');
    }
  }

  async showCurrentSessions() {
    CLIUI.title('⚡ 当前活跃会话');

    if (!this.activeSessions || this.activeSessions.length === 0) {
      console.log('当前没有活跃会话');
      console.log('');
      console.log('提示: 活跃会话数据每30秒更新一次，请确认监控服务正在运行');
      console.log('');
      return;
    }

    const now = Date.now();
    let totalActiveMinutes = 0;

    this.activeSessions.forEach((session, index) => {
      const durationMinutes = session.getDurationMinutes();
      const idleMinutes = session.getIdleTimeMinutes();
      const startTime = new Date(session.startTime);
      const startStr = startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const elapsedMinutes = Math.floor((now - session.startTime) / 60000);

      totalActiveMinutes += durationMinutes;

      console.log(`${index + 1}. ${session.projectName}`);
      console.log(`   开始时间: ${startStr}（已过 ${elapsedMinutes} 分钟）`);
      console.log(`   进行中: ${this.formatTime(durationMinutes)}（距上次操作 ${idleMinutes} 分钟）`);

      if (session.filesTouched && session.filesTouched.size > 0) {
        const files = Array.from(session.filesTouched);
        console.log(`   涉及文件: ${files.length}个`);
        files.slice(0, 10).forEach(file => {
          console.log(`     • ${file}`);
        });
        if (files.length > 10) {
          console.log(`     ... 还有 ${files.length - 10} 个文件`);
        }
      }
      console.log('');
    });

    console.log(`活跃会话数: ${this.activeSessions.length}个`);
    console.log(`本轮合计: ${this.formatTime(totalActiveMinutes)}`);
    console.log('');
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

  async startService() {
    await this.init();
    
    const projects = this.configManager.getProjects();
    const enabledProjects = this.configManager.getProjects(true);
    
    console.log('\n🚀 启动编码时间监控工具...\n');
    
    // 检查是否有启用的项目
    if (enabledProjects.length === 0) {
      if (projects.length === 0) {
        console.log('⚠️  还没有配置任何项目\n');
        console.log('需要先添加项目才能启动监控服务\n');
        
        const inquirer = await import('inquirer');
        const { addNow } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'addNow',
            message: '是否现在添加项目？',
            default: true
          }
        ]);
        
        if (addNow) {
          await this.addProject();
          
          // 重新加载配置
          await this.configManager.load();
          const newEnabledProjects = this.configManager.getProjects(true);
          
          if (newEnabledProjects.length === 0) {
            console.log('\n没有启用的项目，无法启动监控服务');
            return;
          }
        } else {
          console.log('\n你可以稍后使用以下命令添加项目：');
          console.log('  ctm config add\n');
          return;
        }
      } else {
        console.log('⚠️  没有启用的项目\n');
        console.log('当前项目：');
        projects.forEach(project => {
          const status = project.enabled ? '✓' : '✗';
          console.log(`  ${status} ${project.name}`);
        });
        console.log('\n请先启用项目：');
        console.log('  ctm config edit\n');
        return;
      }
    }
    
    // 显示要监控的项目
    console.log('将要监控的项目：');
    enabledProjects.forEach(project => {
      console.log(`  • ${project.name}`);
    });
    console.log('');
    
    try {
      await this.start();
      console.log('\n✅ 监控服务已启动！\n');
      console.log('使用以下命令查看状态：');
      console.log('  ctm show status\n');
    } catch (error) {
      console.error('\n❌ 启动失败:', error.message);
      console.log('\n请检查：');
      console.log('  1. 项目路径是否存在');
      console.log('  2. 查看日志: ctm service logs\n');
      throw error;
    }
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

  async purgeAll() {
    await this.init();
    
    const inquirer = await import('inquirer');
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '⚠️  警告：此操作将执行以下操作：\n' +
                  '  1. 停止所有监控服务\n' +
                  '  2. 删除所有统计数据\n' +
                  '  3. 重置所有配置（包括项目配置）\n' +
                  '  4. 删除所有项目\n\n' +
                  '确定要执行吗？此操作不可恢复！',
        default: false
      }
    ]);
    
    if (!confirm) {
      CLIUI.info('操作已取消');
      return;
    }
    
    console.log('\n🗑️  开始清理所有数据...\n');
    
    try {
      // 1. 停止监控服务
      console.log('1. 停止监控服务...');
      try {
        await this.stop();
      } catch (error) {
        console.log('   ⚠️  监控服务未运行或停止失败');
      }
      
      // 2. 重置配置（删除所有项目）
      console.log('2. 重置配置...');
      this.configManager.reset();
      await this.configManager.save();
      console.log('   ✓ 配置已重置');
      
      // 3. 重置统计数据
      console.log('3. 重置统计数据...');
      const { Persistence } = await import('../tracker/persistence.js');
      const persistence = new Persistence(this.configManager);
      await persistence.resetStats();
      console.log('   ✓ 统计数据已重置');
      
      // 4. 清理活跃会话文件
      console.log('4. 清理活跃会话文件...');
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { getDataDir } = await import('../utils/path.js');
        const activeSessionsPath = path.join(getDataDir(), 'active-sessions.json');
        await fs.unlink(activeSessionsPath).catch(() => {});
        console.log('   ✓ 活跃会话文件已清理');
      } catch (error) {
        console.log('   ⚠️  清理活跃会话文件失败');
      }
      
      console.log('\n✅ 所有数据已清理完成！\n');
      console.log('下一步：');
      console.log('  1. 重新添加项目：');
      console.log('     ctm config add');
      console.log('');
      console.log('  2. 启动监控服务：');
      console.log('     ctm start');
      console.log('');
      
    } catch (error) {
      console.error('\n❌ 清理失败:', error.message);
      console.error('\n请手动检查并清理以下文件：');
      console.error('  - data/config.json');
      console.error('  - data/stats.json');
      console.error('  - data/active-sessions.json');
      console.error('');
      process.exit(1);
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
    const { execSync } = await import('child_process');
    const { getLogDir } = await import('../utils/path.js');
    const logDir = getLogDir();
    const outLogPath = `${logDir}/out.log`;
    const errorLogPath = `${logDir}/error.log`;
    
    console.log('\n📋 查看日志文件 (按 Ctrl+C 退出)\n');
    
    try {
      // 使用 tail -f 实时查看 out.log（PM2 标准输出）
      execSync(`tail -f ${outLogPath}`, { stdio: 'inherit' });
    } catch (error) {
      if (error.signal === 'SIGINT') {
        console.log('\n已退出日志查看');
      } else {
        // 如果 out.log 不存在，尝试查看 error.log
        try {
          execSync(`tail -f ${errorLogPath}`, { stdio: 'inherit' });
        } catch (error2) {
          if (error2.signal === 'SIGINT') {
            console.log('\n已退出日志查看');
          } else {
            console.error('\n❌ 查看日志失败，日志文件可能不存在');
            console.log(`\n日志目录: ${logDir}`);
            console.log('你可以直接查看日志文件:');
            console.log(`  cat ${outLogPath}`);
            console.log(`  tail -f ${outLogPath}\n`);
            process.exit(1);
          }
        }
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