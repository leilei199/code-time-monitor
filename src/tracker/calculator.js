import dayjs from 'dayjs';

export class TimeCalculator {
  static formatDuration(minutes) {
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

  static formatTime(timestamp) {
    return dayjs(timestamp).format('HH:mm');
  }

  static formatDate(timestamp) {
    return dayjs(timestamp).format('YYYY-MM-DD');
  }

  static formatDateTime(timestamp) {
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
  }

  static getTodayStart() {
    return dayjs().startOf('day').valueOf();
  }

  static getTodayEnd() {
    return dayjs().endOf('day').valueOf();
  }

  static getWeekStart() {
    return dayjs().startOf('week').valueOf();
  }

  static getWeekEnd() {
    return dayjs().endOf('week').valueOf();
  }

  static getMonthStart() {
    return dayjs().startOf('month').valueOf();
  }

  static getMonthEnd() {
    return dayjs().endOf('month').valueOf();
  }

  static isToday(timestamp) {
    return dayjs(timestamp).isSame(dayjs(), 'day');
  }

  static isNightTime(timeString) {
    const hour = dayjs(timeString, 'HH:mm').hour();
    return hour >= 23 || hour < 7;
  }

  static calculateCodingIntensity(sessions) {
    if (sessions.length === 0) {
      return 0;
    }

    const totalChanges = sessions.reduce((sum, s) => sum + s.fileChanges, 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    
    if (totalMinutes === 0) {
      return 0;
    }

    return Math.round((totalChanges / totalMinutes) * 60);
  }

  static getIntensityLabel(intensity) {
    if (intensity === 0) return '无';
    if (intensity < 10) return '低';
    if (intensity < 30) return '中';
    if (intensity < 60) return '高';
    return '极高';
  }
}

export default TimeCalculator;