#!/usr/bin/env node

import { Command } from 'commander';
import { CLICommands } from './commands.js';
import { CLIUI } from './ui.js';
import logger from '../utils/logger.js';

const program = new Command();
const commands = new CLICommands();

program
  .name('code-time-monitor')
  .description('编码时间监控工具')
  .version('1.0.0');

program
  .command('help')
  .description('显示帮助信息')
  .action(() => {
    console.log(`
编码时间监控工具

可用命令:
  ctm version           查看版本号
  ctm setup             初始化配置
  ctm start             启动监控服务
  ctm stop              停止监控服务
  ctm restart           重启监控服务
  ctm logs              查看日志
  ctm startup           设置开机自启动
  ctm delete            删除监控服务
  ctm status            查看运行状态
  ctm stats             查看编码统计
  ctm stats --today     查看今日统计
  ctm stats --week      查看本周统计
  ctm stats --notify    发送统计通知
  ctm add-project       添加监控项目
  ctm config            管理配置
  ctm reset-stats       重置统计数据
  ctm help              显示帮助信息

获取更多帮助:
  ctm <command> --help
    `);
  });

program
  .command('version')
  .description('查看版本号')
  .action(async () => {
    try {
      await commands.version();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('初始化配置')
  .action(async () => {
    try {
      await commands.setup();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('启动监控服务')
  .action(async () => {
    try {
      await commands.start();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('停止监控服务')
  .action(async () => {
    try {
      await commands.stop();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('restart')
  .description('重启监控服务')
  .action(async () => {
    try {
      await commands.restart();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('查看日志')
  .action(async () => {
    try {
      await commands.logs();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('startup')
  .description('设置开机自启动')
  .action(async () => {
    try {
      await commands.startup();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('删除监控服务')
  .action(async () => {
    try {
      await commands.delete();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('查看运行状态')
  .action(async () => {
    try {
      await commands.status();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('查看编码统计')
  .option('--today', '今日统计')
  .option('--week', '本周统计')
  .option('--project <name>', '指定项目统计')
  .option('--notify', '发送通知')
  .action(async (options) => {
    try {
      await commands.stats(options);
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('add-project')
  .description('添加监控项目')
  .action(async () => {
    try {
      await commands.addProject();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('管理配置')
  .option('--show', '显示当前配置')
  .option('--edit', '编辑配置文件')
  .option('--reset', '重置为默认配置')
  .action(async (options) => {
    try {
      let action = 'show';
      if (options.edit) action = 'edit';
      if (options.reset) action = 'reset';
      await commands.config(action);
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('reset-stats')
  .description('重置统计数据')
  .action(async () => {
    try {
      await commands.resetStats();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

program.parse();