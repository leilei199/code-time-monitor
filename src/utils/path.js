import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getProjectRoot = () => {
  // 使用 package.json 的位置作为包根目录
  return path.resolve(__dirname, '../..');
};

export const getPackageRoot = () => {
  // 更可靠的方法：找到 node_modules 上级的 package.json
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    try {
      const { existsSync } = require('fs');
      if (existsSync(packageJsonPath)) {
        return currentDir;
      }
    } catch (error) {
      // 忽略错误，继续向上查找
    }
    currentDir = path.dirname(currentDir);
  }
  // 回退到原来的方法
  return path.resolve(__dirname, '../..');
};

export const getDataDir = () => {
  return path.join(getPackageRoot(), 'data');
};

export const getConfigPath = () => {
  return path.join(getDataDir(), 'config.json');
};

export const getStatsPath = () => {
  return path.join(getDataDir(), 'stats.json');
};

export const getLogDir = () => {
  return path.join(getPackageRoot(), 'logs');
};

export const getTemplatesDir = () => {
  return path.join(getPackageRoot(), 'templates');
};

export const getDefaultConfigPath = () => {
  return path.join(getTemplatesDir(), 'default-config.json');
};

export const getHomeDir = () => {
  return os.homedir();
};

export const expandHomePath = (filePath) => {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
};

export const resolveAbsolutePath = (filePath) => {
  const expanded = expandHomePath(filePath);
  return path.resolve(expanded);
};

export const isSubdirectory = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

export const ensureDir = async (dirPath) => {
  const { mkdir } = await import('fs/promises');
  await mkdir(dirPath, { recursive: true });
};