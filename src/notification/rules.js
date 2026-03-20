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

    // 整点推送：只在每个自然小时的整点（分钟数为0）触发
    // 去重 key 包含日期和小时，保证每个整点最多推一次
    const now = dayjs();
    if (now.minute() !== 0) {
      return null;
    }

    const hourKey = now.format('YYYY-MM-DD_HH');
    const notifyKey = `HourlyStatus_${hourKey}`;
    const alreadySent = await this.shouldSend(notifyKey, 0) === false;
    if (alreadySent) {
      return null;
    }

    // 根据今日累计时长决定提醒级别，未达阈值则推纯状态播报
    let level = 'status';
    if (totalMinutes >= this.dailyMax) {
      level = 'critical';
    } else if (totalMinutes >= this.dailyAlert) {
      level = 'high';
    } else if (totalMinutes >= this.dailyWarning) {
      level = 'medium';
    }

    return {
      type: 'daily-limit',
      level,
      totalMinutes,
      message: TimeCalculator.formatDuration(totalMinutes),
      notifyType: notifyKey
    };
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
    if (duration <= 0) {
      return null;
    }

    // 不超过2小时：每60分钟提醒一次；超过2小时：每30分钟提醒一次
    const fatigueThresholdMinutes = 120;
    const normalIntervalMs = 60 * 60 * 1000;
    const intenseIntervalMs = 30 * 60 * 1000;

    const reminderIntervalMs = duration >= fatigueThresholdMinutes
      ? intenseIntervalMs
      : normalIntervalMs;

    const shouldNotify = await this.shouldSend('BreakReminder', reminderIntervalMs);
    if (shouldNotify) {
      return {
        type: 'break-reminder',
        message: TimeCalculator.formatDuration(duration),
        notifyType: 'BreakReminder'
      };
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