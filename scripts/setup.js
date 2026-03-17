#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function setup() {
  console.log('🚀 开始设置编码时间监控工具...\n');

  try {
    // 创建必要的目录
    const directories = [
      path.join(PROJECT_ROOT, 'data'),
      path.join(PROJECT_ROOT, 'logs'),
      path.join(PROJECT_ROOT, 'templates')
    ];

    console.log('创建目录...');
    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`  ✓ ${dir}`);
    }

    // 检查配置文件
    const configPath = path.join(PROJECT_ROOT, 'data', 'config.json');
    const defaultConfigPath = path.join(PROJECT_ROOT, 'templates', 'default-config.json');

    try {
      await fs.access(configPath);
      console.log(`  ✓ 配置文件已存在: ${configPath}`);
    } catch {
      console.log(`  创建配置文件: ${configPath}`);
      await fs.copyFile(defaultConfigPath, configPath);
    }

    // 检查统计数据文件
    const statsPath = path.join(PROJECT_ROOT, 'data', 'stats.json');

    try {
      await fs.access(statsPath);
      console.log(`  ✓ 统计数据文件已存在: ${statsPath}`);
    } catch {
      console.log(`  创建统计数据文件: ${statsPath}`);
      const emptyStats = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        today: {
          date: new Date().toISOString().split('T')[0],
          totalMinutes: 0,
          sessions: [],
          byProject: {},
          hourlyDistribution: {}
        },
        history: {},
        notifications: {
          lastDailyWarning: null,
          lastNightReminder: null,
          lastBreakReminder: null
        }
      };
      await fs.writeFile(statsPath, JSON.stringify(emptyStats, null, 2));
    }

    console.log('\n✅ 设置完成！\n');
    console.log('下一步:');
    console.log('  1. 添加要监控的项目:');
    console.log('     npm run add-project');
    console.log('');
    console.log('  2. 启动监控服务:');
    console.log('     npm run pm2:start');
    console.log('');
    console.log('  3. 查看运行状态:');
    console.log('     npm run status');
    console.log('');

  } catch (error) {
    console.error('\n❌ 设置失败:', error.message);
    process.exit(1);
  }
}

setup();