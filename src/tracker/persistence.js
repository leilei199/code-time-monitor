import fs from 'fs/promises';
import path from 'path';
import { getStatsPath, getDataDir, ensureDir } from '../utils/path.js';
import logger from '../utils/logger.js';
import dayjs from 'dayjs';

export class Persistence {
  constructor(configManager) {
    this.configManager = configManager;
    this.statsPath = getStatsPath();
    this.cache = new Map();
    this.saveTimer = null;
    this.saveInterval = 10 * 60 * 1000; // 10分钟
  }

  async loadStats() {
    try {
      const data = await fs.readFile(this.statsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return this.createEmptyStats();
      }
      logger.error('加载统计数据失败:', error.message);
      throw error;
    }
  }

  createEmptyStats() {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      today: {
        date: dayjs().format('YYYY-MM-DD'),
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
  }

  async saveSession(session) {
    let stats = await this.loadStats();
    
    const today = dayjs().format('YYYY-MM-DD');
    
    // 如果是新的一天，将今天的数据移到历史记录
    if (stats.today.date !== today) {
      stats.history[stats.today.date] = {
        totalMinutes: stats.today.totalMinutes,
        sessions: stats.today.sessions,
        byProject: stats.today.byProject,
        hourlyDistribution: stats.today.hourlyDistribution
      };
      
      stats.today = {
        date: today,
        totalMinutes: 0,
        sessions: [],
        byProject: {},
        hourlyDistribution: {}
      };
    }
    
    // 添加会话
    stats.today.sessions.push(session);
    
    // 更新总时长
    stats.today.totalMinutes += session.durationMinutes;
    
    // 更新项目统计
    if (!stats.today.byProject[session.projectName]) {
      stats.today.byProject[session.projectName] = 0;
    }
    stats.today.byProject[session.projectName] += session.durationMinutes;
    
    // 更新小时分布
    const hour = dayjs(session.startTime).hour();
    if (!stats.today.hourlyDistribution[hour]) {
      stats.today.hourlyDistribution[hour] = 0;
    }
    stats.today.hourlyDistribution[hour] += session.durationMinutes;
    
    // 更新时间戳
    stats.lastUpdated = new Date().toISOString();
    
    // 缓存数据
    this.cache.set('stats', stats);
    
    // 延迟保存
    this.scheduleSave();
    
    return stats;
  }

  scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(async () => {
      await this.flushCache();
    }, this.saveInterval);
  }

  async flushCache() {
    if (this.cache.has('stats')) {
      const stats = this.cache.get('stats');
      await this.writeStats(stats);
      this.cache.delete('stats');
    }
  }

  async writeStats(stats) {
    try {
      await ensureDir(getDataDir());
      await fs.writeFile(
        this.statsPath,
        JSON.stringify(stats, null, 2),
        'utf-8'
      );
      logger.debug('统计数据已保存');
    } catch (error) {
      logger.error('保存统计数据失败:', error.message);
      throw error;
    }
  }

  async getTodayStats() {
    const stats = await this.loadStats();
    const today = dayjs().format('YYYY-MM-DD');

    if (stats.today.date === today) {
      return stats.today;
    }

    return {
      date: today,
      totalMinutes: 0,
      sessions: [],
      byProject: {},
      hourlyDistribution: {}
    };
  }

  async getTodayTotal() {
    const todayStats = await this.getTodayStats();
    return todayStats.totalMinutes || 0;
  }

  async getHistoryStats(days = 7) {
    const stats = await this.loadStats();
    const result = [];
    
    const today = dayjs();
    
    for (let i = 0; i < days; i++) {
      const date = today.subtract(i, 'day').format('YYYY-MM-DD');
      
      if (date === stats.today.date) {
        result.push({
          date,
          totalMinutes: stats.today.totalMinutes,
          sessions: stats.today.sessions
        });
      } else if (stats.history[date]) {
        result.push(stats.history[date]);
      } else {
        result.push({
          date,
          totalMinutes: 0,
          sessions: []
        });
      }
    }
    
    return result.reverse();
  }

  async getDaySessions(dateStr) {
    const stats = await this.loadStats();
    
    // 如果是今天，返回今天的会话
    if (dateStr === stats.today.date) {
      return {
        date: stats.today.date,
        totalMinutes: stats.today.totalMinutes,
        sessions: stats.today.sessions,
        byProject: stats.today.byProject,
        hourlyDistribution: stats.today.hourlyDistribution
      };
    }
    
    // 否则返回历史记录中的数据
    if (stats.history[dateStr]) {
      return {
        date: dateStr,
        totalMinutes: stats.history[dateStr].totalMinutes,
        sessions: stats.history[dateStr].sessions,
        byProject: stats.history[dateStr].byProject || {},
        hourlyDistribution: stats.history[dateStr].hourlyDistribution || {}
      };
    }
    
    // 没有数据
    return {
      date: dateStr,
      totalMinutes: 0,
      sessions: [],
      byProject: {},
      hourlyDistribution: {}
    };
  }

  async updateNotificationTime(type, timestamp) {
    const stats = await this.loadStats();
    
    if (!stats.notifications) {
      stats.notifications = {};
    }
    
    stats.notifications[`last${type}`] = new Date(timestamp).toISOString();
    stats.lastUpdated = new Date().toISOString();
    
    this.cache.set('stats', stats);
    this.scheduleSave();
  }

  async getLastNotificationTime(type) {
    const stats = await this.loadStats();
    
    if (!stats.notifications) {
      return null;
    }
    
    const timestamp = stats.notifications[`last${type}`];
    return timestamp ? new Date(timestamp).valueOf() : null;
  }

  async resetStats() {
    const emptyStats = this.createEmptyStats();
    await this.writeStats(emptyStats);
    logger.info('统计数据已重置');
    return emptyStats;
  }

  async shutdown() {
    await this.flushCache();
    
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }
}

export default Persistence;