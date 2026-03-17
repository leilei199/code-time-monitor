import { Notification as ElectronNotification, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StatusNotifier {
  constructor(config, persistence) {
    this.config = config;
    this.persistence = persistence;
    this.statusInterval = null;
    this.isEnabled = false;
    this.intervalMinutes = 60; // 默认每60分钟发送一次状态通知
    this.lastStatusTime = null;
  }

  enable() {
    if (this.isEnabled) {
      logger.warn('状态通知已启用');
      return;
    }

    this.isEnabled = true;
    this.startStatusUpdates();
    logger.info('状态通知系统已启用');
  }

  disable() {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;
    this.stopStatusUpdates();
    logger.info('状态通知系统已禁用');
  }

  setInterval(minutes) {
    this.intervalMinutes = Math.max(15, Math.min(180, minutes)); // 限制在15-180分钟之间
    if (this.isEnabled) {
      this.stopStatusUpdates();
      this.startStatusUpdates();
    }
    logger.info(`状态通知间隔已设置为 ${this.intervalMinutes} 分钟`);
  }

  async startStatusUpdates() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    // 立即发送一次状态
    await this.sendStatusUpdate();

    // 定期发送状态更新
    this.statusInterval = setInterval(() => {
      this.sendStatusUpdate();
    }, this.intervalMinutes * 60 * 1000);

    logger.info(`状态更新已启动，间隔: ${this.intervalMinutes} 分钟`);
  }

  stopStatusUpdates() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  async sendStatusUpdate() {
    try {
      if (!app.isReady()) {
        logger.warn('Electron 应用未就绪，跳过状态通知');
        return;
      }

      const stats = await this.getTodayStats();
      const statusText = this.formatStatusText(stats);

      const notification = new ElectronNotification({
        title: '⏱️ 编码时间状态',
        body: statusText,
        icon: path.join(__dirname, '../../icons/icon-large.png'),
        silent: true,
        urgency: 'low'
      });

      notification.show();
      this.lastStatusTime = Date.now();
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

  async sendSessionStartNotification(projectName) {
    try {
      if (!app.isReady()) {
        return;
      }

      const notification = new ElectronNotification({
        title: '🚀 开始编码',
        body: `项目: ${projectName}\n编码时间监控已启动`,
        icon: path.join(__dirname, '../../icons/icon-large.png'),
        silent: true,
        urgency: 'normal'
      });

      notification.show();
      logger.info(`会话开始通知已发送: ${projectName}`);
    } catch (error) {
      logger.error('发送会话开始通知失败:', error.message);
    }
  }

  async sendSessionEndNotification(sessionData) {
    try {
      if (!app.isReady()) {
        return;
      }

      const hours = Math.floor(sessionData.durationMinutes / 60);
      const minutes = sessionData.durationMinutes % 60;
      const timeText = hours > 0 
        ? `${hours}小时${minutes}分钟` 
        : `${minutes}分钟`;

      const notification = new ElectronNotification({
        title: '🎯 编码会话结束',
        body: `项目: ${sessionData.projectName}\n时长: ${timeText}\n文件变更: ${sessionData.fileChanges}次`,
        icon: path.join(__dirname, '../../icons/icon-large.png'),
        silent: true,
        urgency: 'normal'
      });

      notification.show();
      logger.info(`会话结束通知已发送: ${sessionData.projectName}`);
    } catch (error) {
      logger.error('发送会话结束通知失败:', error.message);
    }
  }

  cleanup() {
    this.stopStatusUpdates();
  }
}

export default StatusNotifier;
