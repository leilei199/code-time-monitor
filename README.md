# Code Time Monitor (ctm)

编码时间监控工具 - 帮助开发者智能管理编码时间，保持健康的工作生活平衡

## ✨ 特性

### 核心功能
- **实时统计** - 显示包含活跃会话的实时编码时长
- **会话详情** - 查看每次会话的开始时间、结束时间、文件变更等详细信息
- **智能启动** - 一键启动，自动检测并提示添加项目
- **黑名单模式** - 支持 .gitignore，智能排除不需要监控的文件
- **灵活配置** - 项目级别的监控范围和模式配置
- **健康提醒** - 多种提醒规则保护健康（时长提醒、深夜提醒、休息提醒）

### 新增功能
- **语义化会话ID** - 每个会话都有独特的 ID（格式：`项目名_日期时间_随机标识`）
- **定时会话日志** - 每1分钟记录活跃会话状态
- **一键重置** - 清空所有数据和配置，重新开始
- **扩展监控范围** - 默认支持 .md 和 .json 文件监控
- **精确日志** - 所有日志都包含时间戳

## 🚀 快速开始

### 安装
```bash
npm install -g code-time-monitor
```

### 初始化
```bash
# 首次使用会自动引导配置
ctm start
```

### 基本使用
```bash
# 启动监控服务
ctm start

# 查看状态（包含活跃会话）
ctm show status

# 查看今日统计（实时）
ctm show stats --today

# 查看会话详情
ctm show sessions
```

## 📖 命令参考

### 服务管理

#### 一键启动
```bash
ctm start
```
- 自动检查项目配置
- 如果没有项目，提示添加
- 显示将要监控的项目列表

#### 停止服务
```bash
ctm stop
```

#### 重启服务
```bash
ctm restart
```

#### 查看日志
```bash
ctm logs
```
实时查看服务日志（按 Ctrl+C 退出）

### 状态和统计

#### 查看运行状态
```bash
ctm show status
```
显示内容：
- 监控服务状态
- 项目配置列表
- 活跃会话（进行中的会话）
- 今日统计（包含活跃会话时长）

#### 查看编码统计
```bash
# 今日统计（默认）
ctm show stats

# 今日统计
ctm show stats --today

# 本周统计
ctm show stats --week

# 指定项目统计
ctm show stats --project <项目名>

# 发送统计通知
ctm show stats --notify
```

#### 查看会话详情
```bash
# 查看今日会话
ctm show sessions

# 查看指定日期会话
ctm show sessions --date 2026-03-18

# 简化显示（不显示文件列表）
ctm show sessions --simple
```

会话详情包括：
- 会话ID（语义化格式）
- 开始和结束时间
- 编码时长
- 文件变更次数
- 涉及的文件列表

### 配置管理

#### 添加项目
```bash
ctm config add
```
交互式添加新项目：
- 项目名称
- 项目路径
- 是否使用 .gitignore

#### 编辑配置
```bash
ctm config edit
```
在默认编辑器中打开配置文件

### 数据管理

#### 重置统计数据
```bash
ctm data reset
```
清空所有统计数据，保留项目配置

#### 一键重置
```bash
ctm reset
```
完整重置所有内容：
1. 停止监控服务
2. 删除所有统计数据
3. 重置配置（包括所有项目）
4. 清理临时文件

⚠️ 此操作不可恢复！

### 其他命令

#### 查看版本
```bash
ctm --version
```

## ⚙️ 配置说明

### 配置文件位置
`data/config.json`

### 全局配置示例
```json
{
  "version": "2.0.0",
  "monitoring": {
    "idleTimeout": 1800,
    "debounceDelay": 1000,
    "useBlacklist": true,
    "fileExtensions": [
      ".js", ".ts", ".jsx", ".tsx", ".vue", ".svelte",
      ".py", ".java", ".go", ".rs", ".cpp", ".h", ".c",
      ".css", ".scss", ".less", ".html", ".json", ".md"
    ],
    "ignoredDirs": [
      "node_modules", ".git", "dist", "build", "coverage", "logs", ".idea"
    ]
  },
  "limits": {
    "dailyWarning": 4,
    "dailyAlert": 6,
    "dailyMax": 8
  },
  "nightMode": {
    "enabled": true,
    "startTime": "23:00",
    "endTime": "07:00"
  },
  "breakReminder": {
    "enabled": true,
    "intervalMinutes": 120
  },
  "notifications": {
    "enabled": true,
    "sound": true
  }
}
```

### 项目配置示例
```json
{
  "id": "uuid",
  "name": "my-project",
  "path": "/path/to/project",
  "enabled": true,
  "monitoring": {
    "useBlacklist": true,
    "fileExtensions": [".js", ".ts"],
    "ignoredDirs": ["node_modules", "build"]
  },
  "ignoredDirs": ["logs", "temp"]
}
```

### 配置说明

#### 监控模式

**黑名单模式** (`useBlacklist: true`)（推荐）：
- 默认监控所有文件（符合文件扩展名的）
- 排除 .gitignore 中的文件
- 排除临时文件和系统文件
- 排除 ignoredDirs 中的目录

**白名单模式** (`useBlacklist: false`)：
- 只监控指定扩展名的文件
- 更精确但需要手动配置

#### 项目级配置优先级
项目的监控配置可以覆盖全局配置：
```json
{
  "monitoring": {
    "useBlacklist": false,  // 覆盖全局设置
    "fileExtensions": [".py"],  // 覆盖全局扩展名
    "ignoredDirs": ["__pycache__"]  // 额外忽略的目录
  }
}
```

#### 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `idleTimeout` | 空闲超时时间（秒） | 1800 (30分钟) |
| `debounceDelay` | 文件变更防抖延迟（毫秒） | 1000 |
| `useBlacklist` | 是否使用黑名单模式 | true |
| `fileExtensions` | 监控的文件扩展名 | [js, ts, jsx, tsx, vue, svelte, py, java, go, rs, cpp, h, c, css, scss, less, html, json, md] |
| `ignoredDirs` | 忽略的目录 | [node_modules, .git, dist, build, coverage, logs, .idea] |
| `dailyWarning` | 每日轻度提醒时长（小时） | 4 |
| `dailyAlert` | 每日中度提醒时长（小时） | 6 |
| `dailyMax` | 每日最大提醒时长（小时） | 8 |

## 📊 统计数据

### 实时统计
所有统计数据都包含活跃会话的时长，无需等待会话结束。

### 今日统计
```bash
ctm show stats --today
```
- 总编码时长（实时）
- 编码会话次数（包含活跃会话）
- 平均会话时长
- 编码强度评级
- 按项目分布

### 会话详情
```bash
ctm show sessions
```
每个会话显示：
- 会话ID：`项目名_20260318123456_abc12345`
- 时间范围：开始时间 - 结束时间
- 编码时长
- 文件变更次数
- 涉及文件列表（最多显示10个）

### 活跃会话状态
每1分钟自动记录活跃会话状态到日志：
```
活跃会话状态: 2个活跃会话
  • myproject_20260318123456_abc12345: 进行中 45分钟 (空闲 2分钟, 变更 12次)
  • anotherproj_20260318123652_def67890: 进行中 30分钟 (空闲 0分钟, 变更 8次)
```

## 🔔 通知系统

### 通知类型

#### 1. 状态更新通知
每60分钟推送当前状态：
- 今日编码时长
- 会话次数
- 活跃会话数

#### 2. 每日时长提醒
- **4小时** - 轻度提醒："今日已编码 4小时，注意休息"
- **6小时** - 中度警告："今日已编码 6小时，建议休息"
- **8小时** - 严重警告："今日已编码 8小时，建议停止工作"

#### 3. 深夜编码提醒
在 23:00-07:00 期间，每30分钟提醒：
"当前时间 01:30，建议明天再继续"

#### 4. 休息提醒
连续编码2小时后提醒：
"已连续编码 2小时，建议休息一下"

#### 5. 会话结束通知
会话结束时显示：
- 项目名称和会话ID
- 本次编码时长
- 文件变更次数
- 涉及的文件列表

## 🛠️ 技术架构

### 核心模块
- **ConfigManager** - 配置管理
- **FileWatcher** - 文件监控（使用 chokidar）
- **FileFilter** - 文件过滤（支持黑名单/白名单）
- **SessionManager** - 会话管理
- **Persistence** - 数据持久化
- **StatsAnalyzer** - 统计分析（支持实时统计）
- **CLICommands** - 命令行接口
- **EnhancedNotificationSystem** - 增强通知系统

### 技术栈
- Node.js 18+
- PM2 - 进程管理
- chokidar - 文件监控
- node-notifier - macOS 通知
- Winston - 日志管理（支持彩色控制台和文件日志）

## 📁 项目结构

```
code-time-monitor/
├── src/
│   ├── app.js                   # 主应用
│   ├── index.js                 # 服务入口
│   ├── cli/                     # 命令行接口
│   │   ├── index.js            # CLI 入口
│   │   ├── commands.js         # 命令实现
│   │   └── ui.js               # UI 工具
│   ├── config/                  # 配置管理
│   │   ├── manager.js          # 配置管理器
│   │   ├── schema.js           # 配置模式
│   │   └── wizard.js           # 配置向导
│   ├── monitor/                 # 文件监控
│   │   ├── watcher.js          # 文件监视器
│   │   ├── filter.js           # 文件过滤器
│   │   └── events.js           # 事件管理
│   ├── tracker/                 # 会话跟踪
│   │   ├── session.js          # 会话类
│   │   ├── persistence.js      # 数据持久化
│   │   └── calculator.js       # 时间计算
│   ├── stats/                   # 统计分析
│   │   ├── analyzer.js         # 统计分析器
│   │   └── report.js           # 报告生成
│   ├── notification/            # 通知系统
│   │   ├── notifier.js         # 通知器
│   │   ├── enhanced-notifier.js # 增强通知
│   │   ├── rules.js            # 提醒规则
│   │   ├── queue.js            # 通知队列
│   │   └── status-notifier.js  # 状态通知
│   └── utils/                   # 工具函数
│       ├── logger.js           # 日志工具
│       ├── path.js             # 路径工具
│       └── validator.js        # 验证工具
├── data/                        # 数据目录
│   ├── config.json             # 用户配置
│   └── stats.json              # 统计数据
├── logs/                        # 日志目录
│   ├── combined.log            # 合并日志
│   └── error.log               # 错误日志
├── icons/                       # 图标资源
├── templates/                   # 模板文件
│   └── default-config.json     # 默认配置
├── ecosystem.config.cjs        # PM2 配置
├── package.json
└── README.md
```

## 🔧 故障排除

### 服务无法启动
```bash
# 检查服务状态
ctm show status

# 查看错误日志
tail -f logs/error.log

# 重启服务
ctm restart
```

### 统计不准确
- 确认服务正在运行：`ctm show status`
- 查看活跃会话是否被正确计入
- 检查日志是否有错误：`ctm logs`

### 文件监控不工作
1. 确认项目路径正确
2. 检查文件扩展名配置
3. 查看监控日志：`ctm logs`
4. 确认是否使用正确的监控模式

### 通知不显示
1. 检查 macOS 系统通知设置
2. 确认 `notifications.enabled` 为 `true`
3. 检查应用通知权限

### 重置所有数据
```bash
ctm reset
```
⚠️ 这会删除所有统计数据和项目配置，不可恢复！

## 🎯 使用场景

### 1. 个人时间管理
- 跟踪每日编码时间
- 避免过度工作
- 分析编码习惯

### 2. 项目统计
- 了解不同项目的编码时间分布
- 追踪特定项目的投入
- 生成项目报告

### 3. 健康编码
- 定时提醒休息
- 深夜编码警告
- 连续工作提醒

### 4. 团队协作
- 团队成员可以了解工作强度
- 合理分配任务
- 避免过度劳累

## 📝 更新日志

### 2.0.0 (2026-03-18)
- ✨ 新增实时统计功能
- ✨ 新增会话详情查看命令
- ✨ 新增语义化会话ID
- ✨ 新增一键启动和一键重置
- ✨ 新增黑名单模式和 .gitignore 支持
- ✨ 重构命令结构，使用子命令
- 🔧 优化日志，添加时间戳
- 🔧 增加空闲超时到30分钟
- 🔧 扩展监控范围，支持 .md 和 .json

## ⚠️ 注意事项

1. **隐私安全** - 只监控文件变更，不读取文件内容
2. **性能影响** - 轻量级监控，对性能影响极小
3. **数据存储** - 所有数据存储在本地，不上传云端
4. **系统要求** - 需要 Node.js 18+ 环境
5. **PM2 依赖** - 需要安装 PM2 进行进程管理

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请提交 Issue。