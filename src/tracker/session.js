import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export class Session {
  constructor(projectId, projectName) {
    this.id = uuidv4();
    this.projectId = projectId;
    this.projectName = projectName;
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.fileChanges = 0;
    this.filesTouched = new Set();
  }

  recordFileChange(filePath) {
    this.lastActivity = Date.now();
    this.fileChanges++;
    this.filesTouched.add(filePath);
  }

  getDuration() {
    return Date.now() - this.startTime;
  }

  getIdleTime() {
    return Date.now() - this.lastActivity;
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      projectName: this.projectName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: Math.floor(this.getDuration() / 60000),
      fileChanges: this.fileChanges,
      filesTouched: Array.from(this.filesTouched)
    };
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
    logger.info(`会话开始: ${project.name}`);
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

    const sessionData = session.toJSON();

    this.eventManager.emitSessionEnd(sessionData);
    this.activeSessions.delete(projectId);

    // 打印会话结束信息，包括文件变更详情
    logger.info(`会话结束: ${sessionData.projectName} (${sessionData.durationMinutes}分钟)`);

    if (sessionData.filesTouched && sessionData.filesTouched.length > 0) {
      logger.info(`  文件变更 (${sessionData.fileChanges}次):`);
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