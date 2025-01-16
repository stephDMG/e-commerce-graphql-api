import { closeDatabase } from './config/database';
import logger from './utils/logger';

const shutdown = async () => {
  try {
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Fehler beim Herunterfahren der Anwendung', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
