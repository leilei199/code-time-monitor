import ConfigManager from './config/manager.js';
import { EventManager } from './monitor/events.js';
import { FileWatcher } from './monitor/watcher.js';
import { SessionManager } from './tracker/session.js';
import { Persistence } from './tracker/persistence.js';
import { EnhancedNotificationSystem } from './notification/enhanced-notifier.js';
import { NotificationRules } from './notification/rules.js';
import { NotificationQueue } from './notification/queue.js';
import { StatsAnalyzer } from './stats/analyzer.js';
import { LogCleaner } from './utils/log-cleaner.js';
import logger from './utils/logger.js';
import dayjs from 'dayjs';

class CodeTimeMonitorApp {
  constructor() {
    this.configManager = new ConfigManager();
    this.eventManager = new EventManager();
    this.persistence = null;
    this.fileWatcher = null;
    this.sessionManager = null;
    this.notificationSystem = null;
    this.notificationRules = null;
    this.notificationQueue = null;
    this.statsAnalyzer = null;
    this.logCleaner = null;
    this.isRunning = false;
  }

  async start() {
    try {
      logger.info('正在启动编码时间监控工具...');
      
      // 加载配置
      await this.configManager.load();
      const config = this.configManager.get();
      
      // 检查是否有配置的项目
      const projects = this.configManager.getProjects(true);
      if (projects.length === 0) {
        logger.warn('没有启用的项目，请先添加项目');
        return false;
      }
      
      // 初始化各模块
      this.persistence = new Persistence(this.configManager);
      this.fileWatcher = new FileWatcher(config, this.eventManager);
      this.sessionManager = new SessionManager(this.configManager, this.eventManager);
      this.notificationSystem = new EnhancedNotificationSystem(config, this.persistence);
      this.notificationRules = new NotificationRules(config, this.persistence);
      this.notificationQueue = new NotificationQueue(this.notificationSystem);
      this.statsAnalyzer = new StatsAnalyzer(this.persistence);
      this.logCleaner = new LogCleaner(config);
      
      // 每日时长提醒已合并至整点推送，无需独立状态播报
      
      // 设置会话结束处理
      this.eventManager.onSessionEnd(async (session) => {
        await this.persistence.saveSession(session);
        
        // 发送会话结束通知
        this.notificationQueue.add({
          type: 'session-end',
          session
        });
        
        // 检查提醒规则
        await this.checkNotifications();
      });
      
      // 设置错误处理
      this.eventManager.onError((error) => {
        logger.error('监控错误:', error.error);
      });
      
      // 启动文件监控
      for (const project of projects) {
        await this.fileWatcher.start(project);
      }
      
      // 定期检查通知规则
      this.notificationCheckInterval = setInterval(() => {
        this.checkNotifications();
      }, 60 * 1000); // 每分钟检查一次
      
      // 定期保存活跃会话信息（每30秒）
      this.activeSessionsSaveInterval = setInterval(() => {
        this.saveActiveSessionsToFile();
      }, 30 * 1000);
      
      // 定期log活跃会话状态（每1分钟）
      this.activeSessionsLogInterval = setInterval(() => {
        this.logActiveSessionsStatus();
      }, 1 * 60 * 1000);
      
      // 启动日志清理任务
      this.logCleaner.start();
      
      // 立即保存一次活跃会话信息
      this.saveActiveSessionsToFile();
      
      this.isRunning = true;
      logger.info('编码时间监控工具已启动');
      logger.info('整点状态播报已启用（每小时整点推送今日编码汇总）');
      logger.info(`监控项目数: ${projects.length}`);
      
      return true;
    } catch (error) {
      logger.error('启动失败:', error.message);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.info('监控未在运行');
      return;
    }
    
    logger.info('正在停止编码时间监控工具...');
    
    try {
      // 清除定时器
      if (this.notificationCheckInterval) {
        clearInterval(this.notificationCheckInterval);
      }
      
      if (this.activeSessionsSaveInterval) {
        clearInterval(this.activeSessionsSaveInterval);
      }
      
      if (this.activeSessionsLogInterval) {
        clearInterval(this.activeSessionsLogInterval);
      }
      
      // 结束所有活跃会话
      if (this.sessionManager) {
        const sessions = await this.sessionManager.endAllSessions();
        
        // 保存会话数据
        for (const session of sessions) {
          await this.persistence.saveSession(session);
        }
      }
      
      // 停止文件监控
      if (this.fileWatcher) {
        await this.fileWatcher.stopAll();
      }
      
      // 停止状态更新
      if (this.notificationSystem) {
        this.notificationSystem.cleanup();
      }
      
      // 停止日志清理任务
      if (this.logCleaner) {
        this.logCleaner.stop();
      }
      
      // 保存缓存数据
      if (this.persistence) {
        await this.persistence.shutdown();
      }
      
      // 清理活跃会话文件
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { getDataDir } = await import('./utils/path.js');
        const activeSessionsPath = path.join(getDataDir(), 'active-sessions.json');
        await fs.unlink(activeSessionsPath);
      } catch (error) {
        // 忽略文件不存在的错误
        if (error.code !== 'ENOENT') {
          logger.warn('清理活跃会话文件失败:', error.message);
        }
      }
      
      this.isRunning = false;
      logger.info('编码时间监控工具已停止');
    } catch (error) {
      logger.error('停止失败:', error.message);
      throw error;
    }
  }

  async checkNotifications() {
    try {
      const todayMinutes = await this.persistence.getTodayTotal();
      let session = null;

      if (this.sessionManager) {
        const activeSessions = this.sessionManager.getActiveSessions();
        session = activeSessions.length > 0 ? activeSessions[0] : null;
      }

      const rules = await this.notificationRules.checkRules({
        todayMinutes,
        session
      });

      for (const rule of rules) {
        this.notificationQueue.add(rule);
      }
    } catch (error) {
      logger.error('检查通知规则失败:', error.message, error.stack);
    }
  }

  async saveActiveSessionsToFile() {
    if (!this.sessionManager) {
      return;
    }

    try {
      const activeSessions = this.sessionManager.getActiveSessions();
      const sessionData = activeSessions.map(session => ({
        id: session.id,
        projectId: session.projectId,
        projectName: session.projectName,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        filesTouched: Array.from(session.filesTouched)
      }));

      const fs = await import('fs/promises');
      const path = await import('path');
      const { getDataDir } = await import('./utils/path.js');

      const activeSessionsPath = path.join(getDataDir(), 'active-sessions.json');
      
      // 原子写入：先写入临时文件，再重命名
      const tempPath = activeSessionsPath + '.tmp';
      await fs.writeFile(tempPath, JSON.stringify({
        timestamp: Date.now(),
        sessions: sessionData
      }, null, 2));
      await fs.rename(tempPath, activeSessionsPath);
    } catch (error) {
      logger.error('保存活跃会话信息失败:', error.message);
    }
  }

  logActiveSessionsStatus() {
    if (!this.sessionManager) {
      return;
    }

    try {
      const activeSessions = this.sessionManager.getActiveSessions();

      if (activeSessions.length === 0) {
        logger.info('活跃会话状态: 无活跃会话');
        return;
      }

      logger.info(`活跃会话状态: ${activeSessions.length}个活跃会话`);
      for (const session of activeSessions) {
        logger.info(`  • ${session.projectName}_${session.id}: 进行中 ${session.getDurationMinutes()}分钟 (距上次操作 ${session.getIdleTimeMinutes()}分钟, 修改 ${session.filesTouched.size}个文件)`);
      }
    } catch (error) {
      logger.error('记录活跃会话状态失败:', error.message);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      projects: this.configManager.getProjects(true).map(p => ({
        name: p.name,
        path: p.path
      }))
    };
  }
}

export default CodeTimeMonitorApp;
