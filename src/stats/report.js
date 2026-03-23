import { TimeCalculator } from '../tracker/calculator.js';

export class StatsReport {
  constructor() {
  }

  formatTodaySummary(summary) {
    const lines = [];
    
    lines.push('\n📊 今日统计');
    lines.push('─'.repeat(40));
    lines.push(`日期: ${summary.date}`);
    lines.push(`总编码时长: ${TimeCalculator.formatDuration(summary.totalMinutes)}`);
    lines.push(`会话次数: ${summary.totalSessions}`);
    
    if (summary.totalSessions > 0) {
      lines.push(`平均会话时长: ${TimeCalculator.formatDuration(summary.avgSessionDuration)}`);
    }
    
    if (Object.keys(summary.byProject).length > 0) {
      lines.push('\n按项目统计:');
      for (const [project, minutes] of Object.entries(summary.byProject)) {
        lines.push(`  • ${project}: ${TimeCalculator.formatDuration(minutes)}`);
      }
    }
    
    // 当日累计总编码时长超过2小时时，添加提示
    if (summary.totalMinutes >= 120) {
      lines.push('\n💡 提示: 做个人吧');
    }
    
    lines.push('');
    
    return lines.join('\n');
  }

  formatWeekSummary(summary) {
    const lines = [];
    
    lines.push('\n📊 本周统计');
    lines.push('─'.repeat(40));
    lines.push(`总编码时长: ${TimeCalculator.formatDuration(summary.totalMinutes)}`);
    lines.push(`总会话次数: ${summary.totalSessions}`);
    lines.push(`日均编码时长: ${TimeCalculator.formatDuration(summary.avgDailyMinutes)}`);
    lines.push(`工作天数: ${summary.workingDays} 天`);
    
    if (summary.dailyStats.length > 0) {
      lines.push('\n每日详情:');
      for (const day of summary.dailyStats) {
        const duration = TimeCalculator.formatDuration(day.totalMinutes);
        lines.push(`  ${day.date}: ${duration} (${day.sessions.length}次会话)`);
      }
    }
    
    lines.push('');
    
    return lines.join('\n');
  }

  formatMonthSummary(summary) {
    const lines = [];
    
    lines.push('\n📊 本月统计');
    lines.push('─'.repeat(40));
    lines.push(`总编码时长: ${TimeCalculator.formatDuration(summary.totalMinutes)}`);
    lines.push(`总会话次数: ${summary.totalSessions}`);
    lines.push(`日均编码时长: ${TimeCalculator.formatDuration(summary.avgDailyMinutes)}`);
    lines.push(`工作天数: ${summary.workingDays} 天`);
    
    lines.push('');
    
    return lines.join('\n');
  }

  formatProjectSummary(summary) {
    const lines = [];
    
    lines.push(`\n📊 项目统计: ${summary.projectName}`);
    lines.push('─'.repeat(40));
    lines.push(`总编码时长: ${TimeCalculator.formatDuration(summary.totalMinutes)}`);
    lines.push(`总会话次数: ${summary.totalSessions}`);
    
    if (summary.totalSessions > 0) {
      lines.push(`平均会话时长: ${TimeCalculator.formatDuration(summary.avgSessionDuration)}`);
    }
    
    if (summary.dailyStats.length > 0) {
      lines.push(`\n最近活跃日期 (${Math.min(summary.dailyStats.length, 10)}天):`);
      for (const day of summary.dailyStats.slice(-10)) {
        lines.push(`  ${day.date}: ${TimeCalculator.formatDuration(day.minutes)} (${day.sessions}次会话)`);
      }
    }
    
    lines.push('');
    
    return lines.join('\n');
  }

  formatPeakHours(summary) {
    const lines = [];
    
    lines.push('\n📊 编码高峰时段');
    lines.push('─'.repeat(40));
    
    if (summary.peakHours.length > 0) {
      lines.push('TOP 5 编码时段:');
      summary.peakHours.forEach((item, index) => {
        const avg = TimeCalculator.formatDuration(item.avgMinutes);
        lines.push(`  ${index + 1}. ${item.label}: 平均 ${avg}`);
      });
    } else {
      lines.push('暂无数据');
    }
    
    lines.push('');
    
    return lines.join('\n');
  }

  formatConsecutiveDays(summary) {
    const lines = [];
    
    lines.push('\n📊 连续编码统计');
    lines.push('─'.repeat(40));
    lines.push(`当前连续编码天数: ${summary.consecutiveDays} 天`);
    lines.push(`历史最长连续: ${summary.maxConsecutiveDays} 天`);
    lines.push('');
    
    return lines.join('\n');
  }

  formatActiveSessions(sessions) {
    const lines = [];
    
    if (sessions.length === 0) {
      lines.push('\n当前没有活跃的编码会话\n');
      return lines.join('\n');
    }
    
    lines.push('\n🔄 当前活跃会话');
    lines.push('─'.repeat(40));
    
    sessions.forEach(session => {
      const duration = TimeCalculator.formatDuration(session.getDuration() / 60000);
      lines.push(`项目: ${session.projectName}`);
      lines.push(`时长: ${duration}`);
      lines.push(`文件变更: ${session.fileChanges} 次`);
      lines.push('');
    });
    
    return lines.join('\n');
  }
}

export default StatsReport;