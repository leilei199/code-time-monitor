#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const MIGRATIONS = {
  '1.0.0': async (config) => {
    console.log('  迁移到版本 1.0.0...');
    return config;
  }
};

async function migrate() {
  console.log('🔄 开始数据迁移...\n');

  try {
    const configPath = path.join(PROJECT_ROOT, 'data', 'config.json');
    const statsPath = path.join(PROJECT_ROOT, 'data', 'stats.json');

    // 检查配置文件
    try {
      await fs.access(configPath);
    } catch {
      console.log('❌ 配置文件不存在，请先运行 npm run setup');
      process.exit(1);
    }

    // 读取配置
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const currentVersion = config.version || '0.0.0';
    const targetVersion = '1.0.0';

    console.log(`当前版本: ${currentVersion}`);
    console.log(`目标版本: ${targetVersion}`);

    if (currentVersion === targetVersion) {
      console.log('\n✅ 已经是最新版本\n');
      return;
    }

    // 执行迁移
    let migratedConfig = config;
    for (const version in MIGRATIONS) {
      if (version > currentVersion && version <= targetVersion) {
        migratedConfig = await MIGRATIONS[version](migratedConfig);
        console.log(`  ✓ 已迁移到版本 ${version}`);
      }
    }

    // 更新版本号
    migratedConfig.version = targetVersion;

    // 保存配置
    await fs.writeFile(configPath, JSON.stringify(migratedConfig, null, 2));

    console.log('\n✅ 数据迁移完成！\n');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

migrate();