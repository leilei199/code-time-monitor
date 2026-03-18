#!/usr/bin/env node

import CodeTimeMonitorApp from './app.js';
import ConfigManager from './config/manager.js';
import { ConfigWizard } from './config/wizard.js';
import logger from './utils/logger.js';
import { ensureDir } from './utils/path.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // 如果是 CLI 命令，直接使用 CLI 入口
  if (command && ['status', 'stats', 'sessions', 'add-project', 'config', 'reset-stats', 'start', 'stop', 'restart', 'logs', 'startup', 'delete', 'show', 'data', 'version', 'reset'].includes(command)) {
    await import('./cli/index.js');
    return;
  }

  // 默认行为：启动监控服务
  try {
    // 确保必要的目录存在
    await ensureDir('./data');
    await ensureDir('./logs');
    
    // 加载配置
    const configManager = new ConfigManager();
    await configManager.load();
    const config = configManager.get();
    
    // 检查是否有项目配置
    if (config.projects.length === 0) {
      logger.info('首次使用？欢迎使用编码时间监控工具！');
      
      const wizard = new ConfigWizard(configManager);
      await wizard.run();
      
      await configManager.save();
    }
    
    // 检查是否有启用的项目
    const enabledProjects = configManager.getProjects(true);
    if (enabledProjects.length === 0) {
      logger.warn('没有启用的项目，请先配置项目');
      logger.info('使用以下命令添加项目:');
      logger.info('  ctm config add');
      process.exit(0);
    }
    
    // 启动应用
    const app = new CodeTimeMonitorApp();
    const started = await app.start();
    
    if (started) {
      logger.info('编码时间监控工具正在运行...');
      logger.info('监控项目:');
      enabledProjects.forEach(project => {
        logger.info(`  • ${project.name}`);
      });
      logger.info('使用以下命令查看状态:');
      logger.info('  ctm show status');
      logger.info('  ctm show stats');
      logger.info('使用以下命令停止监控:');
      logger.info('  ctm service stop');
      
      // 保持进程运行
      process.on('SIGINT', async () => {
        logger.info('正在停止...');
        await app.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        await app.stop();
        process.exit(0);
      });
    }
  } catch (error) {
    logger.error('应用启动失败:', error);
    console.error('\n❌ 启动失败:', error.message);
    console.error('');
    console.error('请检查:');
    console.error('  1. 配置文件是否正确');
    console.error('  2. 项目路径是否存在');
    console.error('  3. 查看日志文件: ./logs/error.log');
    console.error('');
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('未捕获的错误:', error);
  process.exit(1);
});