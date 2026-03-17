import EventEmitter from 'events';

export class FileChangeEvent {
  constructor(projectId, eventType, filePath, timestamp) {
    this.projectId = projectId;
    this.eventType = eventType;
    this.filePath = filePath;
    this.timestamp = timestamp;
  }
}

export class EventManager extends EventEmitter {
  constructor() {
    super();
    this.eventQueue = [];
    this.isProcessing = false;
  }

  emitFileChange(event) {
    this.emit('file-change', event);
  }

  onFileChange(handler) {
    this.on('file-change', handler);
  }

  offFileChange(handler) {
    this.off('file-change', handler);
  }

  emitSessionStart(session) {
    this.emit('session-start', session);
  }

  onSessionStart(handler) {
    this.on('session-start', handler);
  }

  emitSessionEnd(session) {
    this.emit('session-end', session);
  }

  onSessionEnd(handler) {
    this.on('session-end', handler);
  }

  emitError(error) {
    this.emit('error', error);
  }

  onError(handler) {
    this.on('error', handler);
  }

  removeAllListeners() {
    super.removeAllListeners();
  }
}

export default EventManager;