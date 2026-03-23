import notifier from 'node-notifier';
import logger from '../utils/logger.js';

export class NotificationSystem {
  constructor(config) {
    this.config = config;
    this.enabled = config.notifications?.enabled !== false;
    this.soundEnabled = config.notifications?.sound !== false;
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
    const filesCount = session.filesTouched ? session.filesTouched.length : 0;
    this.notify(
      '编码会话结束',
      `${session.projectName}: 本次编码 ${this.formatTime(session.durationMinutes)}，修改了 ${filesCount} 个文件`
    );
  }

  notifyError(error) {
    this.notify(
      '错误',
      `发生错误: ${error.message}`
    );
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
}

export default NotificationSystem;