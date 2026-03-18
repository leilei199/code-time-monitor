import chokidar from 'chokidar';
import { FileFilter } from './filter.js';
import { FileChangeEvent, EventManager } from './events.js';
import logger from '../utils/logger.js';

export class FileWatcher {
  constructor(config, eventManager) {
    this.config = config;
    this.eventManager = eventManager;
    this.watchers = new Map();
    this.fileFilter = new FileFilter(config);
    this.debounceTimers = new Map();
    this.debounceDelay = config.monitoring.debounceDelay || 1000;
  }

  async start(project) {
    if (this.watchers.has(project.id)) {
      logger.warn(`项目 ${project.name} 已经在监控中`);
      return;
    }

    try {
      const ignorePatterns = this.fileFilter.getIgnorePatterns(project);

      const watcher = chokidar.watch(project.path, {
        ignored: ignorePatterns,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        },
        persistent: true,
        ignorePermissionErrors: true,
        followSymlinks: false
      });

      const handleChange = async (eventType, filePath) => {
        try {
          const shouldWatch = await this.fileFilter.shouldWatch(filePath, project);
          if (!shouldWatch) {
            return;
          }
          
          logger.debug(`文件变更: ${eventType} - ${filePath}`);
          this.debouncedHandleChange(project.id, eventType, filePath);
        } catch (error) {
          logger.debug(`处理文件变更失败: ${error.message}`);
        }
      };

      watcher
        .on('add', (path) => handleChange('add', path).catch(e => {}))
        .on('change', (path) => handleChange('change', path).catch(e => {}))
        .on('unlink', (path) => handleChange('unlink', path).catch(e => {}))
        .on('error', (error) => {
          logger.error(`监控错误 [${project.name}]:`, error.message);
          this.eventManager.emitError({
            projectId: project.id,
            error
          });
        })
        .on('ready', () => {
          logger.info(`开始监控项目: ${project.name}`);
        });

      this.watchers.set(project.id, watcher);
      logger.info(`已启动文件监控: ${project.name}`);
    } catch (error) {
      logger.error(`启动监控失败 [${project.name}]:`, error.message);
      throw error;
    }
  }

  debouncedHandleChange(projectId, eventType, filePath) {
    const key = `${projectId}:${filePath}`;
    
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      const event = new FileChangeEvent(
        projectId,
        eventType,
        filePath,
        Date.now()
      );
      this.eventManager.emitFileChange(event);
      this.debounceTimers.delete(key);
    }, this.debounceDelay);

    this.debounceTimers.set(key, timer);
  }

  async stop(projectId) {
    const watcher = this.watchers.get(projectId);
    if (!watcher) {
      logger.warn(`项目 ${projectId} 未在监控中`);
      return;
    }

    try {
      await watcher.close();
      this.watchers.delete(projectId);
      logger.info(`已停止监控项目: ${projectId}`);
    } catch (error) {
      logger.error(`停止监控失败 [${projectId}]:`, error.message);
      throw error;
    }
  }

  async stopAll() {
    const stopPromises = Array.from(this.watchers.keys()).map(id => 
      this.stop(id)
    );
    await Promise.all(stopPromises);
    logger.info('已停止所有监控');
  }

  isWatching(projectId) {
    return this.watchers.has(projectId);
  }

  getWatchingProjects() {
    return Array.from(this.watchers.keys());
  }
}

export default FileWatcher;