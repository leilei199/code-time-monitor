import dayjs from 'dayjs';
import { TimeCalculator } from '../tracker/calculator.js';

export class StatsAnalyzer {
  constructor(persistence) {
    this.persistence = persistence;
  }

  async getTodaySummary(activeSessions = []) {
    const todayStats = await this.persistence.getTodayStats();

    // 计算活跃会话的额外时间
    let additionalMinutes = 0;
    const additionalByProject = {};
    const additionalSessions = [];

    for (const session of activeSessions) {
      const durationMinutes = session.getDurationMinutes();
      if (durationMinutes > 0) {
        additionalMinutes += durationMinutes;
        additionalSessions.push({
          id: session.id,
          projectName: session.projectName,
          durationMinutes,
          isActive: true
        });

        if (!additionalByProject[session.projectName]) {
          additionalByProject[session.projectName] = 0;
        }
        additionalByProject[session.projectName] += durationMinutes;
      }
    }

    const totalMinutes = todayStats.totalMinutes + additionalMinutes;
    const totalSessions = todayStats.sessions.length + additionalSessions.length;
    const avgSessionDuration = totalSessions > 0
      ? Math.round(totalMinutes / totalSessions)
      : 0;

    // 合并项目统计
    const byProject = { ...todayStats.byProject };
    for (const [project, minutes] of Object.entries(additionalByProject)) {
      if (!byProject[project]) {
        byProject[project] = 0;
      }
      byProject[project] += minutes;
    }

    // 合并所有会话用于计算强度
    const allSessions = [...todayStats.sessions, ...additionalSessions];
    const intensity = TimeCalculator.calculateCodingIntensity(allSessions);
    const intensityLabel = TimeCalculator.getIntensityLabel(intensity);

    return {
      date: todayStats.date,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalSessions,
      avgSessionDuration,
      intensity,
      intensityLabel,
      byProject,
      hourlyDistribution: todayStats.hourlyDistribution || {},
      activeSessions: additionalSessions,
      hasActiveSessions: additionalSessions.length > 0
    };
  }

  async getWeekSummary(activeSessions = []) {
    const history = await this.persistence.getHistoryStats(7);

    // 计算活跃会话的额外时间
    let additionalMinutes = 0;
    let additionalSessions = 0;

    for (const session of activeSessions) {
      const durationMinutes = session.getDurationMinutes();
      if (durationMinutes > 0) {
        additionalMinutes += durationMinutes;
        additionalSessions++;
      }
    }

    const totalMinutes = history.reduce((sum, day) => sum + day.totalMinutes, 0) + additionalMinutes;
    const totalSessions = history.reduce((sum, day) => sum + day.sessions.length, 0) + additionalSessions;

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
      dailyStats: history,
      hasActiveSessions: additionalSessions > 0
    };
  }

  async getMonthSummary(activeSessions = []) {
    const now = dayjs();
    const daysInMonth = now.daysInMonth();
    const history = await this.persistence.getHistoryStats(daysInMonth);

    // 计算活跃会话的额外时间
    let additionalMinutes = 0;
    let additionalSessions = 0;

    for (const session of activeSessions) {
      const durationMinutes = session.getDurationMinutes();
      if (durationMinutes > 0) {
        additionalMinutes += durationMinutes;
        additionalSessions++;
      }
    }

    const totalMinutes = history.reduce((sum, day) => sum + day.totalMinutes, 0) + additionalMinutes;
    const totalSessions = history.reduce((sum, day) => sum + day.sessions.length, 0) + additionalSessions;

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
      dailyStats: history,
      hasActiveSessions: additionalSessions > 0
    };
  }

  async getProjectSummary(projectName, activeSessions = []) {
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
    
    // 计算活跃会话的额外时间
    let additionalMinutes = 0;
    let additionalSessions = 0;

    for (const session of activeSessions) {
      if (session.projectName === projectName) {
        const durationMinutes = session.getDurationMinutes();
        if (durationMinutes > 0) {
          additionalMinutes += durationMinutes;
          additionalSessions++;
        }
      }
    }

    totalMinutes += additionalMinutes;
    totalSessions += additionalSessions;
    
    return {
      projectName,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalSessions,
      avgSessionDuration: totalSessions > 0
        ? Math.round(totalMinutes / totalSessions)
        : 0,
      dailyStats,
      hasActiveSessions: additionalSessions > 0
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