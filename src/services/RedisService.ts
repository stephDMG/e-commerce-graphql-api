import { Redis, RedisOptions } from 'ioredis';
import logger from '../utils/logger';
import opossum from 'opossum';

/**
 * Redis-Service für das Caching von Daten
 * Diese Klasse implementiert das Singleton-Pattern und bietet eine robuste Verbindung zu Redis
 * mit Circuit Breaker, Verbindungswiederherstellung und umfangreichem Logging
 */
export class RedisService {
  private client: Redis;
  private static instance: RedisService;
  private isConnected: boolean = false;
  private circuitBreaker: any;

  /**
   * Privater Konstruktor für das Singleton-Pattern
   * Initialisiert den Redis-Client mit Konfigurationsoptionen
   */
  private constructor() {
    const redisConfig: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      // Verbindungswiederherstellungsstrategie mit exponentieller Verzögerung
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.info('Redis Verbindung wird neu versucht', { times, delay });
        return delay;
      },
      // Weitere Konfigurationsoptionen
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      autoResubscribe: true,
    };
    // Redis-Client und Circuit Breaker initialisieren
    this.client = new Redis(redisConfig);
    this.setupCircuitBreaker();
    this.setupEventHandlers();
  }

  /**
   * Konfiguriert den Circuit Breaker für Fehlertolerance
   * Verhindert Kaskadenfehler bei Verbindungsproblemen
   */
  private setupCircuitBreaker() {
    this.circuitBreaker = new opossum(
      async (command: keyof Redis, ...args: any[]) => {
        return await (this.client as any)[command](...args);
      },
      {
        timeout: 3000, // Zeitüberschreitung in Millisekunden
        errorThresholdPercentage: 50, // Fehlerrate für Öffnung
        resetTimeout: 30000, // Zeit bis zum Reset
      },
    );
  }

  /**
   * Richtet Event-Handler für die Redis-Verbindung ein
   * Überwacht Verbindungsstatus und loggt Ereignisse
   */
  private setupEventHandlers() {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis Verbindung hergestellt');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis Client Error', { error: error.message });
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis Verbindung beendet');
    });
  }

  /**
   * Gibt die Singleton-Instanz des RedisService zurück
   * Erstellt eine neue Instanz falls noch keine existiert
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Stellt sicher, dass eine aktive Verbindung zu Redis besteht
   * Versucht die Verbindung wiederherzustellen falls nötig
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.ping();
        this.isConnected = true;
      } catch (error) {
        logger.error('Redis Verbindungsfehler', {
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    }
  }

  /**
   * Speichert einen Wert in Redis
   * @param key - Schlüssel unter dem der Wert gespeichert wird
   * @param value - zu speichernder Wert
   * @param expirationInSeconds - optionale Ablaufzeit in Sekunden
   */
  async set(
    key: string,
    value: any,
    expirationInSeconds?: number,
  ): Promise<void> {
    try {
      await this.ensureConnection();
      const stringifiedValue = JSON.stringify(value);

      await this.circuitBreaker.fire(async () => {
        if (expirationInSeconds) {
          await this.client.set(
            key,
            stringifiedValue,
            'EX',
            expirationInSeconds,
          );
        } else {
          await this.client.set(key, stringifiedValue);
        }
      });

      logger.debug('Wert in Redis gesetzt', { key, expirationInSeconds });
    } catch (error) {
      logger.error('Fehler beim Setzen des Redis-Werts', {
        error: error instanceof Error ? error.message : error,
        key,
      });
      throw error;
    }
  }

  /**
   * Ruft einen Wert aus Redis ab
   * @param key - Schlüssel des abzurufenden Werts
   * @returns Der gespeicherte Wert oder null falls nicht vorhanden
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnection();
      const value = await this.circuitBreaker.fire(
        async () => await this.client.get(key),
      );

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Fehler beim Abrufen des Redis-Werts', {
        error: error instanceof Error ? error.message : error,
        key,
      });
      throw error;
    }
  }

  /**
   * Erstellt eine Pipeline für Batch-Operationen
   * Ermöglicht die Ausführung mehrerer Befehle in einer Transaktion
   */
  pipeline() {
    return this.client.pipeline();
  }

  /**
   * Erstellt eine Multi-Pipeline für atomare Transaktionen
   * Garantiert die atomare Ausführung mehrerer Befehle
   */
  multi() {
    return this.client.multi();
  }

  /**
   * Löscht einen oder mehrere Schlüssel aus Redis
   * @param keys - zu löschende Schlüssel
   */
  async del(...keys: string[]): Promise<void> {
    try {
      await this.ensureConnection();
      await this.circuitBreaker.fire(
        async () => await this.client.del(...keys),
      );
      logger.debug('Schlüssel aus Redis gelöscht', { keys });
    } catch (error) {
      logger.error('Fehler beim Löschen der Redis-Schlüssel', {
        error: error instanceof Error ? error.message : error,
        keys,
      });
      throw error;
    }
  }

  /**
   * Schließt die Verbindung zu Redis
   * Sollte beim Beenden der Anwendung aufgerufen werden
   */
  async close(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis Verbindung geschlossen');
      }
    } catch (error) {
      logger.error('Fehler beim Schließen der Redis-Verbindung', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}

// Exportiert die Singleton-Instanz
export const redisService = RedisService.getInstance();
