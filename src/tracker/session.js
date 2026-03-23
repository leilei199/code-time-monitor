import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class Session {
  constructor(projectId, projectName) {
    // 生成更有语义的ID：项目名_日期时间_随机数
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '').slice(0, 14); // 20260318T171800
    const randomId = uuidv4().slice(0, 8); // 取UUID前8位作为随机标识
    this.id = `${projectName}_${dateStr}_${randomId}`;

    this.projectId = projectId;
    this.projectName = projectName;
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.filesTouched = new Set();
  }

  recordFileChange(filePath) {
    this.lastActivity = Date.now();
    this.filesTouched.add(filePath);
  }

  getIdleTime() {
    return Date.now() - this.lastActivity;
  }

  getIdleTimeMinutes() {
    return Math.floor(this.getIdleTime() / 60000);
  }

  /**
   * 活跃时长（用于实时展示）：最后一次文件变更 - 会话开始
   * 仅反映已确认有操作的时间跨度，不含尾部等待
   */
  getDurationMinutes() {
    return Math.floor((this.lastActivity - this.startTime) / 60000);
  }

  /**
   * 落库时长：会话真正结束的时刻 - 会话开始
   * 包含最后一次操作后的思考时间，由 endSession() 传入结束时刻
   */
  toJSON(endTime = Date.now()) {
    return {
      id: this.id,
      projectId: this.projectId,
      projectName: this.projectName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMinutes: Math.floor((endTime - this.startTime) / 60000),
      filesTouched: Array.from(this.filesTouched)
    };
  }

  // 从数据创建 Session 对象（用于恢复活跃会话）
  static fromData(sessionData) {
    const session = new Session(sessionData.projectId, sessionData.projectName);
    session.id = sessionData.id;
    session.startTime = sessionData.startTime;
    session.lastActivity = sessionData.lastActivity;
    session.filesTouched = new Set(sessionData.filesTouched);
    return session;
  }
}

export class SessionManager {
  constructor(configManager, eventManager) {
    this.configManager = configManager;
    this.eventManager = eventManager;
    this.activeSessions = new Map();
    this.idleTimers = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.eventManager.onFileChange(async (event) => {
      await this.handleFileChange(event);
    });
  }

  async handleFileChange(event) {
    const { projectId, filePath } = event;

    this.clearIdleTimer(projectId);

    if (!this.activeSessions.has(projectId)) {
      await this.startSession(event);
    } else {
      this.updateSession(projectId, filePath);
    }

    this.setIdleTimer(projectId);
  }

  async startSession(event) {
    const project = this.configManager.getProject(event.projectId);
    if (!project) {
      logger.warn(`项目 ${event.projectId} 不存在`);
      return;
    }

    const session = new Session(project.id, project.name);
    session.recordFileChange(event.filePath);

    this.activeSessions.set(project.id, session);

    this.eventManager.emitSessionStart(session);
    logger.info(`会话开始: ${project.name}_${session.id}`);
  }

  updateSession(projectId, filePath) {
    const session = this.activeSessions.get(projectId);
    if (session) {
      session.recordFileChange(filePath);
    }
  }

  async endSession(projectId) {
    const session = this.activeSessions.get(projectId);
    if (!session) {
      return;
    }

    const sessionData = session.toJSON(Date.now());

    this.eventManager.emitSessionEnd(sessionData);
    this.activeSessions.delete(projectId);

    logger.info(`会话结束: ${sessionData.projectName}_${sessionData.id} (${sessionData.durationMinutes}分钟)`);

    if (sessionData.filesTouched && sessionData.filesTouched.length > 0) {
      logger.info(`  修改文件 (${sessionData.filesTouched.length}个):`);
      sessionData.filesTouched.forEach((file, index) => {
        logger.info(`    ${index + 1}. ${file}`);
      });
    }

    return sessionData;
  }

  setIdleTimer(projectId) {
    this.clearIdleTimer(projectId);

    const config = this.configManager.get();
    const timeout = config.monitoring.idleTimeout * 1000;
    const timer = setTimeout(() => {
      this.endSession(projectId);
    }, timeout);

    this.idleTimers.set(projectId, timer);
  }

  clearIdleTimer(projectId) {
    const timer = this.idleTimers.get(projectId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(projectId);
    }
  }

  async endAllSessions() {
    const sessionIds = Array.from(this.activeSessions.keys());
    const sessions = [];

    for (const projectId of sessionIds) {
      const session = await this.endSession(projectId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  getActiveSession(projectId) {
    return this.activeSessions.get(projectId);
  }

  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  hasActiveSession(projectId) {
    return this.activeSessions.has(projectId);
  }
}

export default SessionManager;