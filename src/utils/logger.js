/**
 * Logger estruturado para o Python Executer Next
 * Simula a funcionalidade do Winston em um ambiente Next.js
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Nível de log atual (pode ser configurado via variável de ambiente)
const currentLevel = process.env.LOG_LEVEL ? 
  (LOG_LEVELS[process.env.LOG_LEVEL.toLowerCase()] || LOG_LEVELS.info) : 
  LOG_LEVELS.info;

/**
 * Formata uma mensagem de log com timestamp e metadados
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
}

/**
 * Verifica se um nível de log deve ser exibido com base no nível atual
 */
function shouldLog(level) {
  return LOG_LEVELS[level] <= currentLevel;
}

/**
 * Logger estruturado
 */
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