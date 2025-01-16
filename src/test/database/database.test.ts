import { closeDatabase } from '@/config/database';
import { Database } from '@/core/database';

describe('Database Tests', () => {
  // Definiere eine Schnittstelle für die Row-Typen
  interface UserRow {
    id: number;
    name: string;
    email: string;
  }

  beforeAll(async () => {
    // Sicherstellen, dass die Tabelle existiert, bevor die Tests beginnen
    await Database.query(
      'CREATE TABLE IF NOT EXISTS test_users (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL)',
    );
  });

  afterAll(async () => {
    // Aufräumen der Tabelle nach allen Tests
    await Database.query('DROP TABLE IF EXISTS test_users');
  });

  beforeEach(async () => {
    // Vor jedem Test die Tabelle leeren
    await Database.query('DELETE FROM test_users');
  });

  test('should insert a user into the database', async () => {
    const insertResult = await Database.query<UserRow>(
      'INSERT INTO test_users (name, email) VALUES ($1, $2) RETURNING *',
      ['Test User', 'test@example.com'],
    );

    expect(insertResult.rows).toHaveLength(1);
    expect(insertResult.rows[0]).toHaveProperty('id');
    expect(insertResult.rows[0].name).toBe('Test User');
    expect(insertResult.rows[0].email).toBe('test@example.com');
  });

  test('should query users from the database', async () => {
    // Füge einen Benutzer ein, bevor du ihn abfragst
    await Database.query<UserRow>(
      'INSERT INTO test_users (name, email) VALUES ($1, $2)',
      ['Another User', 'another@example.com'],
    );

    const queryResult = await Database.query<UserRow>(
      'SELECT * FROM test_users',
    );

    expect(queryResult.rows).toHaveLength(1); // Hier 1, weil wir nur einen Benutzer eingefügt haben
    expect(queryResult.rows[0]).toHaveProperty('id');
    expect(queryResult.rows[0].name).toBe('Another User');
    expect(queryResult.rows[0].email).toBe('another@example.com');
  });

  test('should handle errors gracefully', async () => {
    try {
      await Database.query('SELECT * FROM non_existent_table');
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as Error).message).toContain(
        'Relation »non_existent_table« existiert nicht',
      );
    }
  });
});

afterAll(async () => {
  await closeDatabase();
});
