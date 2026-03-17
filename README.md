# 编码时间监控工具

一个基于 Node.js 的编码时间监控工具，帮助开发者管理编码时间，避免过度编码，保持健康的工作生活平衡。

## 🎯 主要功能

### 📊 核心功能
- **文件监控** - 实时监控代码文件变更
- **会话跟踪** - 自动记录编码会话
- **时间统计** - 精确计算编码时长
- **智能提醒** - 多种提醒规则保护健康
- **数据持久化** - 可靠的数据存储
- **状态通知** - 定期推送编码状态

### 🔔 通知系统
- **状态更新通知** - 每60分钟推送编码状态
- **每日时长提醒** - 4小时/6小时/8小时分级提醒
- **深夜编码提醒** - 23:00-07:00 期间提醒
- **休息提醒** - 连续编码2小时提醒
- **会话结束通知** - 显示编码时长和文件变更数

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 初始化配置
```bash
npm run setup
```

### 添加监控项目
```bash
npm run add-project
```

### 启动监控服务
```bash
npm run pm2:start
```

## 📖 使用说明

### 基本命令

#### 启动和停止
```bash
# 启动监控服务
npm run pm2:start

# 停止监控服务
npm run pm2:stop

# 重启监控服务
npm run pm2:restart

# 查看服务状态
npm run pm2:status
```

#### 查看统计
```bash
# 查看当前状态
npm run status

# 查看今日统计
npm run stats --today

# 查看本周统计
npm run stats --week

# 查看指定项目统计
npm run stats --project <项目名>
```

#### 配置管理
```bash
# 查看配置
npm run config --show

# 编辑配置文件
npm run config --edit

# 重置配置
npm run config --reset
```

#### 项目管理
```bash
# 添加新项目
npm run add-project

# 重置统计数据
npm run reset-stats
```

### PM2 高级命令

```bash
# 设置开机自启动
npm run pm2:startup

# 查看日志
npm run pm2:logs

# 删除进程
npm run pm2:delete
```

## ⚙️ 配置说明

### 配置文件位置
`~/.code-time-monitor/config.json`

### 主要配置项

#### 项目配置
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "项目名称",
      "path": "/绝对路径/到项目",
      "enabled": true
    }
  ]
}
```

#### 提醒阈值
```json
{
  "limits": {
    "dailyWarning": 4,    // 4小时轻度提醒
    "dailyAlert": 6,      // 6小时中度提醒
    "dailyMax": 8         // 8小时严重警告
  }
}
```

#### 深夜模式
```json
{
  "nightMode": {
    "enabled": true,
    "startTime": "23:00",  // 开始时间
    "endTime": "07:00"     // 结束时间
  }
}
```

#### 休息提醒
```json
{
  "breakReminder": {
    "enabled": true,
    "intervalMinutes": 120  // 连续编码120分钟后提醒
  }
}
```

#### 通知设置
```json
{
  "notifications": {
    "enabled": true,  // 启用通知
    "sound": true     // 启用声音
  }
}
```

#### 文件监控设置
```json
{
  "monitoring": {
    "fileExtensions": [".js", ".ts", ".jsx", ".tsx", ".vue", ".py", ".go", ".rs"],
    "ignoredDirs": ["node_modules", ".git", "dist", "build", "coverage"],
    "idleTimeout": 300,     // 5分钟无操作视为会话结束
    "debounceDelay": 1000   // 文件变更防抖延迟
  }
}
```

## 📊 统计数据

### 今日统计
- 总编码时长
- 编码会话次数
- 平均会话时长
- 按项目分布

### 会话信息
- 开始和结束时间
- 编码时长
- 文件变更次数
- 触及的文件数量

### 历史数据
- 按日期记录
- 按项目分组
- 小时级分布

## 🔔 通知类型

### 1. 状态更新通知
每60分钟自动推送，显示：
- 今日编码时长
- 会话次数
- 监控项目数

### 2. 每日时长提醒
- **4小时** - 轻度提醒："今日已编码 4小时，注意休息"
- **6小时** - 中度警告："今日已编码 6小时，建议休息"
- **8小时** - 严重警告："今日已编码 8小时，建议停止工作"

### 3. 深夜编码提醒
在 23:00-07:00 期间，每30分钟提醒：
"当前时间 01:30，建议明天再继续"

### 4. 休息提醒
连续编码2小时后提醒：
"已连续编码 2小时，建议休息一下"

### 5. 会话结束通知
会话结束时显示：
- 项目名称
- 本次编码时长
- 文件变更次数

## 🛠️ 技术架构

### 核心模块
- **ConfigManager** - 配置管理
- **FileWatcher** - 文件监控
- **SessionManager** - 会话管理
- **Persistence** - 数据持久化
- **EnhancedNotificationSystem** - 增强通知系统
- **StatsAnalyzer** - 统计分析
- **CLICommands** - 命令行接口

### 技术栈
- Node.js 18+
- PM2 - 进程管理
- chokidar - 文件监控
- node-notifier - macOS 通知
- Winston - 日志管理

## 📁 项目结构

```
code-time-monitor/
├── src/
│   ├── app.js                   # 主应用
│   ├── index.js                 # 入口文件
│   ├── config/                  # 配置管理
│   ├── monitor/                 # 文件监控
│   ├── tracker/                 # 会话跟踪
│   ├── notification/            # 通知系统
│   ├── stats/                   # 统计分析
│   ├── cli/                     # 命令行接口
│   └── utils/                   # 工具函数
├── data/                        # 数据目录
│   ├── config.json             # 用户配置
│   └── stats.json              # 统计数据
├── logs/                        # 日志目录
├── icons/                       # 图标资源
├── ecosystem.config.cjs        # PM2 配置
├── package.json
└── README.md
```

## 🔧 故障排除

### 服务无法启动
```bash
# 检查 PM2 状态
npm run pm2:status

# 查看错误日志
tail -f logs/error.log

# 重启服务
npm run pm2:restart
```

### 通知不显示
1. 检查 macOS 系统通知设置
2. 确认 `notifications.enabled` 为 `true`
3. 检查应用通知权限

### 文件监控不工作
1. 确认项目路径正确
2. 检查文件扩展名配置
3. 查看监控日志：
```bash
npm run pm2:logs
```

## 🎯 使用场景

### 1. 个人时间管理
跟踪每日编码时间，避免过度工作

### 2. 团队健康监控
团队成员可以了解工作强度

### 3. 项目统计
了解不同项目的编码时间分布

### 4. 效率分析
通过会话数据分析编码习惯

## 📝 注意事项

1. **隐私安全** - 只监控文件变更，不读取文件内容
2. **性能影响** - 轻量级监控，对性能影响极小
3. **数据存储** - 所有数据存储在本地，不上传云端
4. **系统要求** - 需要 Node.js 18+ 环境

## 🚀 未来规划

- [ ] 数据导出功能（CSV/JSON）
- [ ] 周报/月报生成
- [ ] Web 界面
- [ ] 多平台支持（Windows/Linux）
- [ ] 云端同步（可选）

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请提交 Issue。
