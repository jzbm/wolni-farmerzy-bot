/**
 * Logger aplikacji
 */
import winston from 'winston';
import { config } from './config.js';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

// Upewnij się że folder logs istnieje
const logsDir = join(config.rootDir, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, account }) => {
      const accountInfo = account ? `[${account}] ` : '';
      const stackInfo = stack ? `\n${stack}` : '';
      return `${timestamp} [${level.toUpperCase()}] ${accountInfo}${message}${stackInfo}`;
    })
  ),
  transports: [
    // Logi do konsoli
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, account }) => {
          const accountInfo = account ? `[${account}] ` : '';
          return `${timestamp} [${level}] ${accountInfo}${message}`;
        })
      )
    }),
    // Logi do pliku
    new winston.transports.File({ 
      filename: join(logsDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: join(logsDir, 'combined.log') 
    }),
  ],
});

// Helper do logowania z informacją o koncie
export const createAccountLogger = (accountEmail) => {
  return {
    info: (msg) => logger.info(msg, { account: accountEmail }),
    warn: (msg) => logger.warn(msg, { account: accountEmail }),
    error: (msg, err) => logger.error(msg, { account: accountEmail, stack: err?.stack }),
    debug: (msg) => logger.debug(msg, { account: accountEmail }),
  };
};

export default logger;
