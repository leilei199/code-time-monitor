#!/usr/bin/env node

import CodeTimeMonitorApp from './app.js';
import ConfigManager from './config/manager.js';
import { ConfigWizard } from './config/wizard.js';
import logger from './utils/logger.js';
import { ensureDir } from './utils/path.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // CLI 命令直接转发
  if (command && ['status', 'stats', 'add-project', 'config', 'reset-stats'].includes(command)) {
    const { CLICommands } = await import('./cli/commands.js');
    const commands = new CLICommands();
    
    // 解析命令参数
    const options = {};
    for (let i = 1; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const key = args[i].slice(2);
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          options[key] = value;
          i++;
        } else {
          options[key] = true;
        }
      }
    }
    
    switch (command) {
      case 'status':
        await commands.status();
        break;
      case 'stats':
        await commands.stats(options);
        break;
      case 'add-project':
        await commands.addProject();
        break;
      case 'config':
        await commands.config(options.show ? 'show' : options.edit ? 'edit' : options.reset ? 'reset' : 'show');
        break;
      case 'reset-stats':
        await commands.resetStats();
        break;
    }
    
    process.exit(0);
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
      console.log('\n🚀 首次使用？欢迎使用编码时间监控工具！\n');
      
      const wizard = new ConfigWizard(configManager);
      await wizard.run();
      
      await configManager.save();
    }
    
    // 检查是否有启用的项目
    const enabledProjects = configManager.getProjects(true);
    if (enabledProjects.length === 0) {
      console.log('\n⚠️  没有启用的项目，请先配置项目\n');
      console.log('使用以下命令添加项目:');
      console.log('  ctm add-project');
      console.log('');
      process.exit(0);
    }
    
    // 启动应用
    const app = new CodeTimeMonitorApp();
    const started = await app.start();
    
    if (started) {
      console.log('\n✅ 编码时间监控工具正在运行...\n');
      console.log('监控项目:');
      enabledProjects.forEach(project => {
        console.log(`  • ${project.name}`);
      });
      console.log('');
      console.log('使用以下命令查看状态:');
      console.log('  ctm status');
      console.log('  ctm stats');
      console.log('');
      console.log('使用以下命令停止监控:');
      console.log('  ctm stop');
      console.log('');
      
      // 保持进程运行
      process.on('SIGINT', async () => {
        console.log('\n\n正在停止...');
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