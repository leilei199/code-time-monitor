export const DEFAULT_CONFIG = {
  version: '1.0.0',
  projects: [],
  limits: {
    dailyWarning: 4,
    dailyAlert: 6,
    dailyMax: 8
  },
  nightMode: {
    enabled: true,
    startTime: '23:00',
    endTime: '07:00'
  },
  breakReminder: {
    enabled: true,
    intervalMinutes: 120
  },
  monitoring: {
    fileExtensions: [
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
      '.py', '.java', '.go', '.rs', '.cpp', '.h', '.c',
      '.css', '.scss', '.less', '.html', '.json'
    ],
    ignoredDirs: [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '.next', '.nuxt', '.cache', 'tmp', 'temp'
    ],
    idleTimeout: 1800,
    debounceDelay: 1000
  },
  notifications: {
    enabled: true,
    sound: true
  }
};

export const CONFIG_SCHEMA = {
  type: 'object',
  required: ['version', 'projects', 'limits', 'nightMode', 'breakReminder', 'monitoring', 'notifications'],
  properties: {
    version: { type: 'string' },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'path', 'enabled', 'createdAt'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          path: { type: 'string' },
          enabled: { type: 'boolean' },
          fileExtensions: { type: 'array' },
          ignoredDirs: { type: 'array' },
          createdAt: { type: 'string' }
        }
      }
    },
    limits: {
      type: 'object',
      required: ['dailyWarning', 'dailyAlert', 'dailyMax'],
      properties: {
        dailyWarning: { type: 'number', minimum: 1 },
        dailyAlert: { type: 'number', minimum: 1 },
        dailyMax: { type: 'number', minimum: 1 }
      }
    },
    nightMode: {
      type: 'object',
      required: ['enabled', 'startTime', 'endTime'],
      properties: {
        enabled: { type: 'boolean' },
        startTime: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
        endTime: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' }
      }
    },
    breakReminder: {
      type: 'object',
      required: ['enabled', 'intervalMinutes'],
      properties: {
        enabled: { type: 'boolean' },
        intervalMinutes: { type: 'number', minimum: 1 }
      }
    },
    monitoring: {
      type: 'object',
      required: ['fileExtensions', 'ignoredDirs', 'idleTimeout', 'debounceDelay'],
      properties: {
        fileExtensions: { type: 'array' },
        ignoredDirs: { type: 'array' },
        idleTimeout: { type: 'number', minimum: 10 },
        debounceDelay: { type: 'number', minimum: 0 }
      }
    },
    notifications: {
      type: 'object',
      required: ['enabled', 'sound'],
      properties: {
        enabled: { type: 'boolean' },
        sound: { type: 'boolean' }
      }
    }
  }
};