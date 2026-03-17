import logger from '../utils/logger.js';

export class NotificationQueue {
  constructor(notificationSystem) {
    this.notificationSystem = notificationSystem;
    this.queue = [];
    this.isProcessing = false;
    this.minInterval = 5000; // 5秒最小间隔
    this.lastNotificationTime = 0;
  }

  async add(notification) {
    this.queue.push(notification);
    
    if (!this.isProcessing) {
      await this.process();
    }
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      await this.send(notification);
    }

    this.isProcessing = false;
  }

  async send(notification) {
    const now = Date.now();
    const timeSinceLastNotification = now - this.lastNotificationTime;

    if (timeSinceLastNotification < this.minInterval) {
      const delay = this.minInterval - timeSinceLastNotification;
      await this.sleep(delay);
    }

    try {
      switch (notification.type) {
        case 'daily-limit':
          this.notificationSystem.notifyDailyLimit(
            notification.minutes,
            notification.level
          );
          break;
        case 'night-mode':
          this.notificationSystem.notifyNightMode(notification.message);
          break;
        case 'break-reminder':
          this.notificationSystem.notifyBreakReminder(notification.duration);
          break;
        case 'session-end':
          this.notificationSystem.notifySessionEnd(notification.session);
          break;
        default:
          logger.warn('未知的通知类型:', notification.type);
      }

      this.lastNotificationTime = Date.now();
    } catch (error) {
      logger.error('发送通知失败:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clear() {
    this.queue = [];
  }

  getQueueLength() {
    return this.queue.length;
  }
}

export default NotificationQueue;