/* Simple timestamped logger to keep dependencies minimal */
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

const format = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaString}`;
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(format(LogLevel.INFO, message, meta));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(format(LogLevel.WARN, message, meta));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(format(LogLevel.ERROR, message, meta));
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.DEBUG?.toLowerCase() === 'true') {
      console.debug(format(LogLevel.DEBUG, message, meta));
    }
  },
};

export default logger;
