import path from 'path';
import { validateFileExtension } from '../utils/validator.js';

export class FileFilter {
  constructor(config) {
    this.allowedExtensions = config.monitoring.fileExtensions || [];
    this.ignoredDirs = config.monitoring.ignoredDirs || [];
  }

  shouldWatch(filePath) {
    const ext = path.extname(filePath);
    const hasValidExtension = this.allowedExtensions.includes(ext);
    const isIgnoredDir = this.isInIgnoredDir(filePath);
    const isHiddenFile = this.isHiddenFile(filePath);
    const isTempFile = this.isTempFile(filePath);

    return hasValidExtension && !isIgnoredDir && !isHiddenFile && !isTempFile;
  }

  isInIgnoredDir(filePath) {
    const parts = path.normalize(filePath).split(path.sep);
    return parts.some(part => this.ignoredDirs.includes(part));
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
           fileName.endsWith('#');
  }

  getIgnorePatterns(project) {
    const patterns = [
      ...this.ignoredDirs.map(dir => `**/${dir}/**`),
      '**/.*',
      '**/*~',
      '**/*.swp',
      '**/*.tmp',
      '**/#*',
      '**/*#'
    ];

    const projectIgnoredDirs = project.ignoredDirs || [];
    patterns.push(...projectIgnoredDirs.map(dir => `**/${dir}/**`));

    return patterns;
  }
}

export default FileFilter;