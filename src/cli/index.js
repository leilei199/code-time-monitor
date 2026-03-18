#!/usr/bin/env node

import { Command } from 'commander';
import { CLICommands } from './commands.js';
import logger from '../utils/logger.js';

const program = new Command();
const commands = new CLICommands();

program
  .name('ctm')
  .description('编码时间监控工具 - 帮助开发者管理编码时间')
  .version('2.0.0');

// ========== 向后兼容的旧命令 ==========

const oldCommands = [
  { name: 'status', newCmd: 'ctm show status', action: 'status' },
  { name: 'add-project', newCmd: 'ctm config add', action: 'addProject' },
  { name: 'reset-stats', newCmd: 'ctm data reset', action: 'resetStats' }
];

for (const cmd of oldCommands) {
  const cmdObj = program.command(cmd.name);
  cmdObj.description(''); // 空描述
  cmdObj._hidden = true; // 设置为隐藏
  cmdObj.action(async () => {
    console.log(`\n⚠️  该命令已废弃，请使用: ${cmd.newCmd}\n`);
    try {
      await commands[cmd.action]();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });
}

// ========== 新的命令结构 ==========

// ctm start - 一键启动监控服务
program
  .command('start')
  .description('一键启动监控服务（如果没有项目会提示添加）')
  .action(async () => {
    try {
      await commands.startService();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

// ctm stop - 停止监控服务
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

// ctm restart - 重启监控服务
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

// ctm logs - 查看日志
program
  .command('logs')
  .description('查看服务日志')
  .action(async () => {
    try {
      await commands.logs();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

// ctm startup - 设置开机自启动
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

// ctm delete - 删除监控服务
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

// ctm show - 查看运行状态和统计信息
const showCmd = program
  .command('show')
  .description('查看运行状态和统计信息');

showCmd
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

showCmd
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

showCmd
  .command('sessions')
  .description('查看会话详情')
  .option('--date <date>', '指定日期 (YYYY-MM-DD)')
  .option('--simple', '简化显示')
  .action(async (options) => {
    try {
      await commands.sessions(options);
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

// ctm config - 配置管理
const configCmd = program
  .command('config')
  .description('配置管理');

configCmd
  .command('show')
  .description('显示当前配置')
  .action(async () => {
    try {
      await commands.config('show');
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

configCmd
  .command('edit')
  .description('编辑配置文件')
  .action(async () => {
    try {
      await commands.config('edit');
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

configCmd
  .command('reset')
  .description('重置为默认配置')
  .action(async () => {
    try {
      await commands.config('reset');
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

configCmd
  .command('add')
  .description('添加监控项目')
  .action(async () => {
    try {
      await commands.addProject();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

// ctm data - 数据管理
const dataCmd = program
  .command('data')
  .description('数据管理');

dataCmd
  .command('reset')
  .description('重置所有统计数据')
  .action(async () => {
    try {
      await commands.resetStats();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

// ctm reset - 一键重置所有数据
program
  .command('reset')
  .description('一键重置所有数据（停止监控、删除统计、重置配置）')
  .action(async () => {
    try {
      await commands.purgeAll();
    } catch (error) {
      logger.error('命令执行失败:', error.message);
      process.exit(1);
    }
  });

// ctm version - 查看版本
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


// 导出 program 对象
export { program };

// 如果直接运行此文件，则解析命令
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
} else {
  program.parse(process.argv);
}