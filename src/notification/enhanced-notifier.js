import notifier from 'node-notifier';
import logger from '../utils/logger.js';

export class EnhancedNotificationSystem {
  constructor(config, persistence) {
    this.config = config;
    this.persistence = persistence;
    this.enabled = config.notifications?.enabled !== false;
    this.soundEnabled = config.notifications?.sound !== false;
    this.statusInterval = null;
    this.statusEnabled = false;
    this.statusIntervalMinutes = 60; // 默认每60分钟发送一次状态
  }

  notify(title, message, options = {}) {
    if (!this.enabled) {
      logger.debug('通知已禁用，跳过通知:', title);
      return;
    }

    const notificationOptions = {
      title,
      message,
      sound: this.soundEnabled,
      wait: false,
      timeout: 5,
      ...options
    };

    notifier.notify(notificationOptions, (error, response) => {
      if (error) {
        logger.error('发送通知失败:', error.message);
      } else {
        logger.info(`发送通知: ${title}`);
      }
    });
  }

  notifyDailyLimit(minutes, level) {
    const levelMessages = {
      status: {
        title: '⏱️ 编码时间播报',
        message: `今日已编码 ${this.formatTime(minutes)}`
      },
      medium: {
        title: '编码时长提醒',
        message: `今日已编码 ${this.formatTime(minutes)}，注意休息`
      },
      high: {
        title: '编码时长警告',
        message: `今日已编码 ${this.formatTime(minutes)}，建议休息`
      },
      critical: {
        title: '编码时长严重警告',
        message: `今日已编码 ${this.formatTime(minutes)}，建议停止工作`
      }
    };

    const config = levelMessages[level] || levelMessages.status;
    this.notify(config.title, config.message);
  }

  notifyNightMode(currentTime) {
    this.notify(
      '深夜编码提醒',
      `当前时间 ${currentTime}，建议明天再继续`
    );
  }

  notifyBreakReminder(duration) {
    this.notify(
      '休息提醒',
      `已连续编码 ${this.formatTime(duration)}，建议做个人吧`
    );
  }

  notifySessionEnd(session) {
    this.notify(
      '编码会话结束',
      `${session.projectName}: 本次编码 ${this.formatTime(session.durationMinutes)}，修改了 ${session.fileChanges} 个文件`
    );
  }

  notifyError(error) {
    this.notify(
      '错误',
      `发生错误: ${error.message}`
    );
  }

  // 新增：状态通知功能
  async sendStatusUpdate() {
    try {
      const stats = await this.getTodayStats();
      const statusText = this.formatStatusText(stats);
      
      this.notify(
        '⏱️ 编码时间状态',
        statusText,
        { timeout: 10 } // 状态通知显示时间长一些
      );
      
      logger.info('状态通知已发送');
    } catch (error) {
      logger.error('发送状态通知失败:', error.message);
    }
  }

  async getTodayStats() {
    try {
      const stats = await this.persistence.loadStats();
      const today = stats.today;
      
      return {
        totalMinutes: today.totalMinutes || 0,
        sessions: today.sessions?.length || 0,
        activeProjects: Object.keys(today.byProject || {}).length
      };
    } catch (error) {
      logger.error('获取统计数据失败:', error.message);
      return {
        totalMinutes: 0,
        sessions: 0,
        activeProjects: 0
      };
    }
  }

  formatStatusText(stats) {
    const hours = Math.floor(stats.totalMinutes / 60);
    const minutes = stats.totalMinutes % 60;
    const timeText = hours > 0 
      ? `${hours}小时${minutes}分钟` 
      : `${minutes}分钟`;

    return `今日编码: ${timeText}\n会话数: ${stats.sessions}次\n监控项目: ${stats.activeProjects}个`;
  }

  enableStatusUpdates(intervalMinutes = 60) {
    if (this.statusEnabled) {
      logger.warn('状态更新已启用');
      return;
    }

    this.statusEnabled = true;
    this.statusIntervalMinutes = Math.max(15, Math.min(180, intervalMinutes));
    
    // 立即发送一次状态
    this.sendStatusUpdate();
    
    // 定期发送状态更新
    this.statusInterval = setInterval(() => {
      this.sendStatusUpdate();
    }, this.statusIntervalMinutes * 60 * 1000);
    
    logger.info(`状态更新已启用，间隔: ${this.statusIntervalMinutes} 分钟`);
  }

  disableStatusUpdates() {
    if (!this.statusEnabled) {
      return;
    }

    this.statusEnabled = false;
    
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    
    logger.info('状态更新已禁用');
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

  enable() {
    this.enabled = true;
    logger.info('通知已启用');
  }

  disable() {
    this.enabled = false;
    logger.info('通知已禁用');
  }

  enableSound() {
    this.soundEnabled = true;
    logger.info('通知声音已启用');
  }

  disableSound() {
    this.soundEnabled = false;
    logger.info('通知声音已禁用');
  }

  cleanup() {
    this.disableStatusUpdates();
  }
}

export default EnhancedNotificationSystem;
