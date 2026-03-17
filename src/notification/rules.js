import dayjs from 'dayjs';
import { TimeCalculator } from '../tracker/calculator.js';
import logger from '../utils/logger.js';

export class NotificationRules {
  constructor(config, persistence) {
    this.config = config;
    this.persistence = persistence;
    this.dailyWarning = config.limits.dailyWarning * 60;
    this.dailyAlert = config.limits.dailyAlert * 60;
    this.dailyMax = config.limits.dailyMax * 60;
    this.nightMode = config.nightMode;
    this.breakReminder = config.breakReminder;
  }

  async checkDailyLimit(todayStats) {
    const totalMinutes = todayStats.totalMinutes || 0;
    
    if (totalMinutes >= this.dailyMax) {
      const shouldNotify = await this.shouldSend('DailyMax', 2 * 60 * 60 * 1000);
      if (shouldNotify) {
        return {
          type: 'daily-limit',
          level: 'critical',
          message: TimeCalculator.formatDuration(totalMinutes),
          notifyType: 'DailyMax'
        };
      }
    } else if (totalMinutes >= this.dailyAlert) {
      const shouldNotify = await this.shouldSend('DailyAlert', 60 * 60 * 1000);
      if (shouldNotify) {
        return {
          type: 'daily-limit',
          level: 'high',
          message: TimeCalculator.formatDuration(totalMinutes),
          notifyType: 'DailyAlert'
        };
      }
    } else if (totalMinutes >= this.dailyWarning) {
      const shouldNotify = await this.shouldSend('DailyWarning', 60 * 60 * 1000);
      if (shouldNotify) {
        return {
          type: 'daily-limit',
          level: 'medium',
          message: TimeCalculator.formatDuration(totalMinutes),
          notifyType: 'DailyWarning'
        };
      }
    }
    
    return null;
  }

  async checkNightMode() {
    if (!this.nightMode.enabled) {
      return null;
    }

    const now = dayjs();
    const hour = now.hour();
    
    const startHour = parseInt(this.nightMode.startTime.split(':')[0]);
    const endHour = parseInt(this.nightMode.endTime.split(':')[0]);
    
    const isNight = (hour >= startHour) || (hour < endHour);
    
    if (isNight) {
      const shouldNotify = await this.shouldSend('NightReminder', 30 * 60 * 1000);
      if (shouldNotify) {
        return {
          type: 'night-mode',
          message: TimeCalculator.formatTime(now.valueOf()),
          notifyType: 'NightReminder'
        };
      }
    }
    
    return null;
  }

  async checkBreakReminder(session) {
    if (!this.breakReminder.enabled) {
      return null;
    }

    const duration = session.durationMinutes || 0;
    const threshold = this.breakReminder.intervalMinutes;
    
    // 检查是否达到提醒间隔的倍数
    if (duration > 0 && duration % threshold === 0) {
      const shouldNotify = await this.shouldSend(`BreakReminder_${duration}`, 60 * 60 * 1000);
      if (shouldNotify) {
        return {
          type: 'break-reminder',
          message: TimeCalculator.formatDuration(duration),
          notifyType: 'BreakReminder'
        };
      }
    }
    
    return null;
  }

  async shouldSend(type, interval = 60 * 60 * 1000) {
    const lastSent = await this.persistence.getLastNotificationTime(type);
    const now = Date.now();

    if (!lastSent) {
      return true;
    }

    return (now - lastSent) >= interval;
  }

  async markNotificationSent(type) {
    await this.persistence.updateNotificationTime(type, Date.now());
  }

  async checkRules(context) {
    const rules = [];

    try {
      // 检查每日时长限制
      const todayStats = await this.persistence.getTodayStats();
      const dailyLimitRule = await this.checkDailyLimit(todayStats);
      if (dailyLimitRule) {
        rules.push(dailyLimitRule);
        await this.markNotificationSent(dailyLimitRule.notifyType);
      }

      // 检查深夜模式
      const nightModeRule = await this.checkNightMode();
      if (nightModeRule) {
        rules.push(nightModeRule);
        await this.markNotificationSent(nightModeRule.notifyType);
      }

      // 检查休息提醒（如果有活跃会话）
      if (context.session) {
        const breakReminderRule = await this.checkBreakReminder(context.session);
        if (breakReminderRule) {
          rules.push(breakReminderRule);
          await this.markNotificationSent(`BreakReminder_${context.session.durationMinutes}`);
        }
      }

    } catch (error) {
      logger.error('检查通知规则时出错:', error.message);
    }

    return rules;
  }
}

export default NotificationRules;