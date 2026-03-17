import path from 'path';
import fs from 'fs/promises';

export const validateProjectPath = async (projectPath) => {
  try {
    const resolvedPath = path.resolve(projectPath);
    const stats = await fs.stat(resolvedPath);
    
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: '路径不是一个有效的目录'
      };
    }
    
    return {
      valid: true,
      path: resolvedPath
    };
  } catch (error) {
    return {
      valid: false,
      error: `无法访问路径: ${error.message}`
    };
  }
};

export const validateFileExtension = (filename, allowedExtensions) => {
  const ext = path.extname(filename);
  return allowedExtensions.includes(ext);
};

export const validateConfig = (config) => {
  const errors = [];
  
  if (!config.version) {
    errors.push('缺少 version 字段');
  }
  
  if (!Array.isArray(config.projects)) {
    errors.push('projects 必须是数组');
  }
  
  if (!config.limits) {
    errors.push('缺少 limits 配置');
  } else {
    if (typeof config.limits.dailyWarning !== 'number') {
      errors.push('limits.dailyWarning 必须是数字');
    }
    if (typeof config.limits.dailyAlert !== 'number') {
      errors.push('limits.dailyAlert 必须是数字');
    }
    if (typeof config.limits.dailyMax !== 'number') {
      errors.push('limits.dailyMax 必须是数字');
    }
  }
  
  if (!config.monitoring) {
    errors.push('缺少 monitoring 配置');
  } else {
    if (!Array.isArray(config.monitoring.fileExtensions)) {
      errors.push('monitoring.fileExtensions 必须是数组');
    }
    if (!Array.isArray(config.monitoring.ignoredDirs)) {
      errors.push('monitoring.ignoredDirs 必须是数组');
    }
    if (typeof config.monitoring.idleTimeout !== 'number') {
      errors.push('monitoring.idleTimeout 必须是数字');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateTimeFormat = (timeString) => {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
};

export const sanitizeProjectName = (name) => {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
};