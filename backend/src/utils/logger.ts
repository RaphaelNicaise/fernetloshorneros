type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function formatMessage(level: LogLevel, message: string, ...args: any[]): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'error':
      console.error(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'debug':
      console.debug(prefix, message, ...args);
      break;
    default:
      console.log(prefix, message, ...args);
      break;
  }
}

export const logger = {
  info: (message: string, ...args: any[]) => formatMessage('info', message, ...args),
  warn: (message: string, ...args: any[]) => formatMessage('warn', message, ...args),
  error: (message: string, ...args: any[]) => formatMessage('error', message, ...args),
  debug: (message: string, ...args: any[]) => formatMessage('debug', message, ...args),
};
