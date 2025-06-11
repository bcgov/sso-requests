import { createLogger, format, transports } from 'winston';

const logFormat = format.printf(({ timestamp, level, message, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json(), format.errors({ stack: true })),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),
  ],
});

export default logger;
