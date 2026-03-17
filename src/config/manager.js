import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_CONFIG, CONFIG_SCHEMA } from './schema.js';
import { validateConfig } from '../utils/validator.js';
import { 
  getConfigPath, 
  getDataDir, 
  getDefaultConfigPath,
  ensureDir 
} from '../utils/path.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = getConfigPath();
  }

  async load() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      
      const validation = validateConfig(this.config);
      if (!validation.valid) {
        logger.error('配置验证失败:', validation.errors);
        throw new Error('配置文件格式错误');
      }
      
      logger.info('配置加载成功');
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('配置文件不存在，使用默认配置');
        this.config = { ...DEFAULT_CONFIG };
        await this.save();
        return this.config;
      }
      logger.error('加载配置失败:', error.message);
      throw error;
    }
  }

  async save() {
    try {
      await ensureDir(getDataDir());
      await fs.writeFile(
        this.configPath, 
        JSON.stringify(this.config, null, 2), 
        'utf-8'
      );
      logger.info('配置保存成功');
    } catch (error) {
      logger.error('保存配置失败:', error.message);
      throw error;
    }
  }

  get() {
    return this.config;
  }

  update(updates) {
    this.config = { ...this.config, ...updates };
    return this.config;
  }

  addProject(projectConfig) {
    const newProject = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      enabled: true,
      ...projectConfig
    };
    
    this.config.projects.push(newProject);
    logger.info(`添加项目: ${newProject.name}`);
    return newProject;
  }

  removeProject(projectId) {
    const index = this.config.projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      const removed = this.config.projects.splice(index, 1)[0];
      logger.info(`移除项目: ${removed.name}`);
      return removed;
    }
    return null;
  }

  getProject(projectId) {
    return this.config.projects.find(p => p.id === projectId);
  }

  getProjects(enabledOnly = false) {
    if (enabledOnly) {
      return this.config.projects.filter(p => p.enabled);
    }
    return this.config.projects;
  }

  updateProject(projectId, updates) {
    const project = this.getProject(projectId);
    if (project) {
      Object.assign(project, updates);
      logger.info(`更新项目: ${project.name}`);
      return project;
    }
    return null;
  }

  reset() {
    this.config = { ...DEFAULT_CONFIG };
    logger.info('配置已重置为默认值');
    return this.config;
  }

  async migrate() {
    const currentVersion = this.config.version;
    const targetVersion = DEFAULT_CONFIG.version;
    
    if (currentVersion === targetVersion) {
      logger.info('配置版本已是最新');
      return;
    }
    
    logger.info(`配置迁移: ${currentVersion} -> ${targetVersion}`);
    
    if (currentVersion < '1.0.0') {
      this.config = { ...DEFAULT_CONFIG, ...this.config };
    }
    
    this.config.version = targetVersion;
    await this.save();
    logger.info('配置迁移完成');
  }
}

export default ConfigManager;