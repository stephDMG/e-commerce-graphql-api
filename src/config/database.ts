import * as dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';
import logger from '../utils/logger';

dotenv.config(); // Umgebungsvariablen laden

// Überprüfung der erforderlichen Umgebungsvariablen
const requiredEnvVars = [
  'DB_USER',
  'DB_HOST',
  'DB_NAME',
  'DB_PASSWORD',
  'DB_PORT',
];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    logger.error(`Die Umgebungsvariable ${varName} ist nicht definiert`);
    process.exit(1); // Beendet die Anwendung, wenn eine erforderliche Umgebungsvariable fehlt
  }
});

// Verbindung zur Datenbank herstellen
const dbConfig: PoolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),

  // Performance-Einstellungen
  max: 20, // Maximale Anzahl von Clients im Pool
  idleTimeoutMillis: 30000, // Maximale Inaktivitätszeit eines Clients
  connectionTimeoutMillis: 2000, // Maximale Zeit für Verbindungsaufbau
};

// Verbindungspool erstellen
export const pool = new Pool(dbConfig);

// Fehlerbehandlung für den Pool
pool.on('error', (err) => {
  logger.error('Unerwarteter Fehler im Client-Pool', {
    error: err.message,
    stack: err.stack,
  });
});

// Funktion zur Überprüfung der Verbindung
export const testDatabaseConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Datenbank erfolgreich verbunden', {
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Fehler bei der Überprüfung der Datenbankverbindung', {
      error: err.message,
    });
    throw error;
  }
};

/**
 * Schließt alle Datenbankverbindungen sicher
 * Wird typischerweise beim Beenden der Anwendung oder in Tests aufgerufen
 */
export const closeDatabase = async () => {
  try {
    logger.info('Schließe Datenbankverbindungen...');
    await pool.end();
    logger.info('Datenbankverbindungen erfolgreich geschlossen');
  } catch (error) {
    logger.error('Fehler beim Schließen der Datenbankverbindungen', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};
