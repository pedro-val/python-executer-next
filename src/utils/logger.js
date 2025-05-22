const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = process.env.LOG_LEVEL ? 
  (LOG_LEVELS[process.env.LOG_LEVEL.toLowerCase()] || LOG_LEVELS.info) : 
  LOG_LEVELS.info;

function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
}

function shouldLog(level) {
  return LOG_LEVELS[level] <= currentLevel;
}

export const logger = {
  error: (message, meta) => {
    if (shouldLog('error')) {
      console.error(formatLogMessage('error', message, meta));
    }
  },
  
  warn: (message, meta) => {
    if (shouldLog('warn')) {
      console.warn(formatLogMessage('warn', message, meta));
    }
  },
  
  info: (message, meta) => {
    if (shouldLog('info')) {
      console.info(formatLogMessage('info', message, meta));
    }
  },
  
  debug: (message, meta) => {
    if (shouldLog('debug')) {
      console.debug(formatLogMessage('debug', message, meta));
    }
  },
};