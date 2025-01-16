import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import logger from '../utils/logger';
import { pool } from '@/config/database';

export { pool };

export class Database {
  static async query<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.info('Abfrage ausgeführt', {
        query: text,
        duration: `${duration}ms`,
        rowCount: result.rowCount,
      });

      return result;
    } catch (error) {
      logger.error('Fehler bei der Abfrage', {
        query: text,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  static async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaktionsfehler', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async queryOne<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }
}
