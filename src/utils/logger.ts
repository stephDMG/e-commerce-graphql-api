import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
const { combine, timestamp, printf, colorize, errors } = format;

dotenv.config();

/**
 * Logger-Konfiguration für das E-Commerce-System
 * Unterstützt sowohl Konsolen-Logs als auch Dateilogs.
 */

// Definition des Log-Verzeichnisses und der Limits
const LOG_DIR = 'logs';
const MAX_FILE_SIZE = 5242880; // 5MB
const MAX_FILES = 5;

// Sicherstellen, dass das Log-Verzeichnis existiert
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Erweitertes Log-Format mit Metadaten
const logFormat = printf(
  ({ level, message, timestamp, service, ...metadata }) => {
    let msg = `[${timestamp}] [${service || 'API'}] ${level}: ${message}`;

    // Füge zusätzliche Metadaten hinzu, falls vorhanden
    if (Object.keys(metadata).length > 0) {
      msg += ` | ${JSON.stringify(metadata)}`;
    }

    return msg;
  },
);

// Logger-Instanz erstellen
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    // Stack-Traces für Fehler nur in Entwicklungsumgebungen aktivieren
    process.env.NODE_ENV === 'production'
      ? combine()
      : combine(errors({ stack: true })),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    // Konsolen-Transport mit Farben für die Entwicklung
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),

    // Fehlerprotokollierung in separater Datei
    new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
    }),

    // Kombinierte Logs in Datei speichern
    new transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
    }),
  ],

  // Ausnahmebehandlung
  exceptionHandlers: [
    new transports.File({
      filename: path.join(LOG_DIR, 'exceptions.log'),
      maxsize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
    }),
  ],
});

// Hilfsfunktionen für strukturiertes Logging
export const logInfo = (message: string, metadata?: object) => {
  logger.info(message, metadata);
};

export const logError = (message: string, error?: Error) => {
  logger.error(message, {
    error: error?.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack,
  });
};

export const logWarning = (message: string, metadata?: object) => {
  logger.warn(message, metadata);
};

export const logDebug = (message: string, metadata?: object) => {
  logger.debug(message, metadata);
};

export default logger;
