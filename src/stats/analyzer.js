import dayjs from 'dayjs';
import { TimeCalculator } from '../tracker/calculator.js';

export class StatsAnalyzer {
  constructor(persistence) {
    this.persistence = persistence;
  }

  async getTodaySummary() {
    const todayStats = await this.persistence.getTodayStats();
    
    const totalSessions = todayStats.sessions.length;
    const avgSessionDuration = totalSessions > 0
      ? Math.round(todayStats.totalMinutes / totalSessions)
      : 0;
    
    const intensity = TimeCalculator.calculateCodingIntensity(todayStats.sessions);
    const intensityLabel = TimeCalculator.getIntensityLabel(intensity);

    return {
      date: todayStats.date,
      totalMinutes: todayStats.totalMinutes,
      totalHours: Math.round(todayStats.totalMinutes / 60 * 10) / 10,
      totalSessions,
      avgSessionDuration,
      intensity,
      intensityLabel,
      byProject: todayStats.byProject || {},
      hourlyDistribution: todayStats.hourlyDistribution || {}
    };
  }

  async getWeekSummary() {
    const history = await this.persistence.getHistoryStats(7);
    
    const totalMinutes = history.reduce((sum, day) => sum + day.totalMinutes, 0);
    const totalSessions = history.reduce((sum, day) => sum + day.sessions.length, 0);
    
    const avgDailyMinutes = Math.round(totalMinutes / 7);
    const avgDailyHours = Math.round(avgDailyMinutes / 60 * 10) / 10;
    
    const workingDays = history.filter(day => day.totalMinutes > 0).length;
    
    return {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalSessions,
      avgDailyMinutes,
      avgDailyHours,
      workingDays,
      dailyStats: history
    };
  }

  async getMonthSummary() {
    const now = dayjs();
    const daysInMonth = now.daysInMonth();
    const history = await this.persistence.getHistoryStats(daysInMonth);
    
    const totalMinutes = history.reduce((sum, day) => sum + day.totalMinutes, 0);
    const totalSessions = history.reduce((sum, day) => sum + day.sessions.length, 0);
    
    const avgDailyMinutes = Math.round(totalMinutes / daysInMonth);
    const avgDailyHours = Math.round(avgDailyMinutes / 60 * 10) / 10;
    
    const workingDays = history.filter(day => day.totalMinutes > 0).length;
    
    return {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalSessions,
      avgDailyMinutes,
      avgDailyHours,
      workingDays,
      dailyStats: history
    };
  }

  async getProjectSummary(projectName) {
    const history = await this.persistence.getHistoryStats(30);
    
    let totalMinutes = 0;
    let totalSessions = 0;
    const dailyStats = [];
    
    for (const day of history) {
      const projectMinutes = day.byProject?.[projectName] || 0;
      const projectSessions = day.sessions.filter(s => s.projectName === projectName);
      
      if (projectMinutes > 0) {
        totalMinutes += projectMinutes;
        totalSessions += projectSessions.length;
        dailyStats.push({
          date: day.date,
          minutes: projectMinutes,
          sessions: projectSessions.length
        });
      }
    }
    
    return {
      projectName,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalSessions,
      avgSessionDuration: totalSessions > 0
        ? Math.round(totalMinutes / totalSessions)
        : 0,
      dailyStats
    };
  }

  async getPeakCodingHours(days = 30) {
    const history = await this.persistence.getHistoryStats(days);
    
    const hourlyData = {};
    
    for (const day of history) {
      const distribution = day.hourlyDistribution || {};
      
      for (const hour in distribution) {
        if (!hourlyData[hour]) {
          hourlyData[hour] = 0;
        }
        hourlyData[hour] += distribution[hour];
      }
    }
    
    // 排序找出高峰时段
    const sorted = Object.entries(hourlyData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return {
      peakHours: sorted.map(([hour, minutes]) => ({
        hour: parseInt(hour),
        totalMinutes: minutes,
        avgMinutes: Math.round(minutes / days),
        label: `${hour}:00-${parseInt(hour) + 1}:00`
      })),
      hourlyDistribution: hourlyData
    };
  }

  async getConsecutiveCodingDays() {
    const history = await this.persistence.getHistoryStats(365);
    
    let consecutiveDays = 0;
    let maxConsecutiveDays = 0;
    
    for (const day of history) {
      if (day.totalMinutes > 0) {
        consecutiveDays++;
        maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
      } else {
        consecutiveDays = 0;
      }
    }
    
    return {
      consecutiveDays,
      maxConsecutiveDays
    };
  }
}

export default StatsAnalyzer;