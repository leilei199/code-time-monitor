import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

export class FileFilter {
  constructor(config) {
    this.ignoredDirs = config.monitoring.ignoredDirs || [];
    this.configuredExtensions = config.monitoring.fileExtensions || [];
    this.useBlacklist = config.monitoring.useBlacklist !== false; // 默认使用黑名单模式
    this.gitignoreCache = new Map();
  }

  async shouldWatch(filePath, project) {
    // 黑名单模式：除了明确排除的，其他都监控
    if (this.getUseBlacklist(project)) {
      return this.shouldWatchBlacklist(filePath, project);
    }
    
    // 白名单模式：只有扩展名在列表中的才监控
    return this.shouldWatchWhitelist(filePath, project);
  }

  getUseBlacklist(project) {
    if (project.monitoring && project.monitoring.useBlacklist !== undefined) {
      return project.monitoring.useBlacklist;
    }
    return this.useBlacklist;
  }

  getFileExtensions(project) {
    if (project.monitoring && project.monitoring.fileExtensions) {
      return project.monitoring.fileExtensions;
    }
    return this.configuredExtensions;
  }

  getIgnoredDirs(project) {
    let dirs = [...this.ignoredDirs];
    if (project.monitoring && project.monitoring.ignoredDirs) {
      dirs = [...dirs, ...project.monitoring.ignoredDirs];
    }
    if (project.ignoredDirs) {
      dirs = [...dirs, ...project.ignoredDirs];
    }
    return dirs;
  }

  async shouldWatchBlacklist(filePath, project) {
    const ext = path.extname(filePath);
    const extensions = this.getFileExtensions(project);
    const ignoredDirs = this.getIgnoredDirs(project);
    
    // 检查是否在忽略的目录中
    if (this.isInIgnoredDir(filePath, ignoredDirs)) {
      return false;
    }
    
    // 检查是否是临时文件
    if (this.isTempFile(filePath)) {
      return false;
    }
    
    // 检查 gitignore 规则
    const ignored = await this.isIgnoredByGitignore(filePath, project.path);
    if (ignored) {
      return false;
    }
    
    // 如果配置了扩展名白名单，则检查扩展名
    if (extensions.length > 0) {
      return extensions.includes(ext);
    }
    
    // 没有配置扩展名白名单，监控所有文件
    return true;
  }

  shouldWatchWhitelist(filePath, project) {
    const ext = path.extname(filePath);
    const extensions = this.getFileExtensions(project);
    const ignoredDirs = this.getIgnoredDirs(project);
    
    const hasValidExtension = extensions.length > 0 && extensions.includes(ext);
    const isIgnoredDir = this.isInIgnoredDir(filePath, ignoredDirs);
    const isHiddenFile = this.isHiddenFile(filePath);
    const isTempFile = this.isTempFile(filePath);

    return hasValidExtension && !isIgnoredDir && !isHiddenFile && !isTempFile;
  }

  isInIgnoredDir(filePath, ignoredDirs) {
    const parts = path.normalize(filePath).split(path.sep);
    return parts.some(part => ignoredDirs.includes(part));
  }

  isHiddenFile(filePath) {
    const fileName = path.basename(filePath);
    return fileName.startsWith('.');
  }

  isTempFile(filePath) {
    const fileName = path.basename(filePath);
    return fileName.endsWith('~') || 
           fileName.endsWith('.swp') || 
           fileName.endsWith('.tmp') ||
           fileName.startsWith('#') ||
           fileName.endsWith('#') ||
           fileName.endsWith('.bak') ||
           fileName === '.DS_Store';
  }

  async isIgnoredByGitignore(filePath, projectPath) {
    try {
      const gitignorePath = path.join(projectPath, '.gitignore');
      let patterns;
      
      if (this.gitignoreCache.has(gitignorePath)) {
        patterns = this.gitignoreCache.get(gitignorePath);
      } else {
        try {
          const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
          patterns = this.parseGitignore(gitignoreContent);
          this.gitignoreCache.set(gitignorePath, patterns);
        } catch (error) {
          // .gitignore 文件不存在或无法读取，不忽略
          patterns = [];
          this.gitignoreCache.set(gitignorePath, patterns);
        }
      }
      
      // 计算相对路径
      const relativePath = path.relative(projectPath, filePath);
      return this.matchesGitignorePatterns(relativePath, patterns);
    } catch (error) {
      logger.debug(`检查 gitignore 失败: ${error.message}`);
      return false;
    }
  }

  parseGitignore(content) {
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        // 简单处理 gitignore 模式
        let pattern = line;
        let isNegation = pattern.startsWith('!');
        if (isNegation) {
          pattern = pattern.slice(1);
        }
        
        // 处理以 / 开头的模式
        if (pattern.startsWith('/')) {
          pattern = pattern.slice(1);
        }
        
        // 处理以 / 结尾的目录
        if (pattern.endsWith('/')) {
          pattern = pattern.slice(0, -1);
        }
        
        return { pattern, isNegation };
      });
  }

  matchesGitignorePatterns(filePath, patterns) {
    // 简单的 gitignore 匹配逻辑
    for (const { pattern, isNegation } of patterns) {
      if (this.matchPattern(filePath, pattern)) {
        return !isNegation;
      }
    }
    return false;
  }

  matchPattern(filePath, pattern) {
    // 如果模式以 / 结尾，匹配目录
    if (pattern.endsWith('/')) {
      const dirPattern = pattern.slice(0, -1);
      return filePath.startsWith(dirPattern + '/');
    }
    
    // 如果模式包含 /，匹配完整路径
    if (pattern.includes('/')) {
      // 处理通配符
      const regex = new RegExp(
        '^' + pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
        + '$'
      );
      return regex.test(filePath);
    }
    
    // 简单的文件名匹配
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    
    // 处理通配符
    const regex = new RegExp(
      '^' + pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
      + '$'
    );
    
    // 匹配文件名或完整路径
    return regex.test(fileName) || regex.test(filePath);
  }

  async getIgnorePatterns(project) {
    const projectPath = project.path;
    const ignoredDirs = this.getIgnoredDirs(project);
    
    if (this.getUseBlacklist(project)) {
      // 黑名单模式：只排除明确要忽略的
      const patterns = [
        ...ignoredDirs.map(dir => `**/${dir}/**`),
        '**/*~',
        '**/*.swp',
        '**/*.tmp',
        '**/#*',
        '**/*#',
        '**/*.bak',
        '**/.DS_Store'
      ];

      // 添加 .gitignore 规则
      const gitignorePath = path.join(projectPath, '.gitignore');
      try {
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        const lines = gitignoreContent.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
        patterns.push(...lines);
      } catch (error) {
        // .gitignore 文件不存在，忽略
      }

      return patterns;
    } else {
      // 白名单模式
      const patterns = [
        ...ignoredDirs.map(dir => `**/${dir}/**`),
        '**/.*',
        '**/*~',
        '**/*.swp',
        '**/*.tmp',
        '**/#*',
        '**/*#'
      ];

      return patterns;
    }
  }

  clearCache() {
    this.gitignoreCache.clear();
  }
}

export default FileFilter;