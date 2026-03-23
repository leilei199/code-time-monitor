import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';
import { getLogDir } from './path.js';

export class LogCleaner {
  constructor(config) {
    this.config = config.logCleanup || {
      enabled: true,
      intervalHours: 24,
      keepDays: 7,
      maxSizeMB: 100
    };
    this.cleanTimer = null;
    this.logDir = getLogDir();
  }

  /**
   * 启动定时清理任务
   */
  start() {
    if (!this.config.enabled) {
      logger.debug('日志清理已禁用');
      return;
    }

    // 立即执行一次清理
    this.clean().catch(error => {
      logger.error('日志清理失败:', error.message);
    });

    // 设置定时清理（默认每天凌晨3点）
    this.scheduleNextClean();
  }

  /**
   * 安排下次清理时间
   */
  scheduleNextClean() {
    if (this.cleanTimer) {
      clearTimeout(this.cleanTimer);
    }

    // 计算到凌晨3点的时间
    const now = new Date();
    const nextClean = new Date(now);
    nextClean.setHours(3, 0, 0, 0);
    
    // 如果已经过了今天的凌晨3点，就安排到明天
    if (nextClean <= now) {
      nextClean.setDate(nextClean.getDate() + 1);
    }

    const delay = nextClean.getTime() - now.getTime();
    
    logger.debug(`下次日志清理时间: ${nextClean.toLocaleString('zh-CN')} (剩余 ${Math.round(delay / 1000 / 60)} 分钟)`);
    
    this.cleanTimer = setTimeout(() => {
      this.clean().catch(error => {
        logger.error('日志清理失败:', error.message);
      });
      this.scheduleNextClean(); // 递归安排下一次
    }, delay);
  }

  /**
   * 停止清理任务
   */
  stop() {
    if (this.cleanTimer) {
      clearTimeout(this.cleanTimer);
      this.cleanTimer = null;
    }
  }

  /**
   * 执行日志清理
   */
  async clean() {
    try {
      logger.info('开始清理日志...');

      const stats = await this.getLogStats();
      
      if (stats.totalSizeMB > this.config.maxSizeMB) {
        logger.info(`日志总大小 ${stats.totalSizeMB.toFixed(2)}MB 超过阈值 ${this.config.maxSizeMB}MB，开始清理`);
        await this.cleanBySize(stats.totalSizeMB);
      } else {
        await this.cleanByAge();
      }

      const newStats = await this.getLogStats();
      logger.info(`日志清理完成: ${stats.totalSizeMB.toFixed(2)}MB → ${newStats.totalSizeMB.toFixed(2)}MB`);
    } catch (error) {
      logger.error('日志清理失败:', error.message);
      throw error;
    }
  }

  /**
   * 按文件年龄清理（保留最近 N 天）
   */
  async cleanByAge() {
    const files = await this.getLogFiles();
    const now = Date.now();
    const maxAge = this.config.keepDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of files) {
      const age = now - file.mtimeMs;
      if (age > maxAge) {
        try {
          await fs.unlink(file.path);
          deletedCount++;
          deletedSize += file.size;
          logger.debug(`删除旧日志: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        } catch (error) {
          logger.warn(`删除日志文件失败 ${file.name}:`, error.message);
        }
      }
    }

    if (deletedCount > 0) {
      logger.info(`按年龄清理: 删除 ${deletedCount} 个文件，释放 ${(deletedSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * 按总大小清理（删除最老的文件直到总大小低于阈值）
   */
  async cleanBySize(currentSizeMB) {
    const files = await this.getLogFiles();
    const targetSizeMB = this.config.maxSizeMB * 0.8; // 清理到阈值的80%

    let deletedCount = 0;
    let deletedSize = 0;
    let totalSize = currentSizeMB * 1024 * 1024;

    // 按修改时间排序，删除最老的
    files.sort((a, b) => a.mtimeMs - b.mtimeMs);

    for (const file of files) {
      if (totalSize <= targetSizeMB * 1024 * 1024) {
        break;
      }

      try {
        await fs.unlink(file.path);
        deletedCount++;
        deletedSize += file.size;
        totalSize -= file.size;
        logger.debug(`删除日志: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      } catch (error) {
        logger.warn(`删除日志文件失败 ${file.name}:`, error.message);
      }
    }

    if (deletedCount > 0) {
      logger.info(`按大小清理: 删除 ${deletedCount} 个文件，释放 ${(deletedSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * 获取所有日志文件信息
   */
  async getLogFiles() {
    try {
      const entries = await fs.readdir(this.logDir, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const filePath = path.join(this.logDir, entry.name);
        const stats = await fs.stat(filePath);

        files.push({
          name: entry.name,
          path: filePath,
          size: stats.size,
          mtimeMs: stats.mtimeMs
        });
      }

      return files;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats() {
    const files = await this.getLogFiles();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      fileCount: files.length,
      totalSize,
      totalSizeMB: totalSize / 1024 / 1024,
      files: files.map(f => ({
        name: f.name,
        sizeMB: f.size / 1024 / 1024,
        mtime: new Date(f.mtimeMs)
      }))
    };
  }
}

export default LogCleaner;
