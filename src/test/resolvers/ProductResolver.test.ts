// __tests__/ProductResolver.spec.ts

import 'reflect-metadata';
import { ProductResolver } from '@/resolvers/ProductResolver';
import { pool } from '@/core/database';
import { redisService } from '@/services/RedisService';
import { CreateProductInput } from '@/entities/inputs/ProductInput';

// Mocks für externe Abhängigkeiten erstellen
jest.mock('@/core/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  },
}));

jest.mock('@/services/RedisService', () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('ProductResolver', () => {
  let resolver: ProductResolver;

  beforeAll(() => {
    resolver = new ProductResolver();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('products', () => {
    it('sollte eine Liste von Produkten zurückgeben', async () => {
      // Mock-Daten von PostgreSQL
      const mockProducts = [
        {
          id: '1',
          name: 'Produkt 1',
          description: 'Beschreibung 1',
          price: 100,
          sku: 'SKU1',
          brand: 'Marke1',
          stock: 10,
          category_id: 'cat1',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Simuliert eine Antwort von der Datenbank
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockProducts });

      // Simuliert die Abwesenheit eines Caches
      (redisService.get as jest.Mock).mockResolvedValueOnce(null);

      const result = await resolver.products(10, 0);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(redisService.set).toHaveBeenCalled(); // Überprüft, ob es im Cache gespeichert wurde
    });

    it('sollte Produkte aus dem Cache zurückgeben, falls verfügbar', async () => {
      // Simuliert Produkte aus dem Redis-Cache
      const mockCachedProducts = [
        {
          id: '2',
          name: 'Produkt 2',
          description: 'Beschreibung 2',
          price: 200,
          sku: 'SKU2',
          brand: 'Marke2',
          stock: 20,
        },
      ];

      (redisService.get as jest.Mock).mockResolvedValueOnce(mockCachedProducts);

      const result = await resolver.products(10, 0);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      // pool.query sollte nicht aufgerufen werden, wenn der Cache verwendet wird
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('createProduct', () => {
    it('sollte ein neues Produkt erstellen und zurückgeben', async () => {
      // Mock-Daten, die von der Datenbank zurückgegeben werden
      const mockInsertedProduct = {
        id: 'abc123',
        name: 'Neues Produkt',
        description: 'Detaillierte Beschreibung',
        price: 99.99,
        sku: null,
        brand: null,
        stock: 50,
        category_id: 'fd5f0dfe-a9ed-4234-b0a0-afc3c187c10b',
      };

      const clientMock = {
        query: jest
          .fn()
          // Erste Abfrage (INSERT Produkt), gibt eine Zeilenliste zurück
          .mockResolvedValueOnce({ rows: [mockInsertedProduct] })
          // Zweite Abfrage (z. B. SELECT Produkt), gibt auch eine Zeilenliste zurück
          .mockResolvedValueOnce({ rows: [mockInsertedProduct] })
          // Dritte Abfrage (z. B. ein weiterer SELECT oder UPDATE), gibt ebenfalls eine Zeilenliste zurück
          .mockResolvedValueOnce({ rows: [mockInsertedProduct] }),
        release: jest.fn(),
      };

      (pool.connect as jest.Mock).mockResolvedValueOnce(clientMock);

      // Verwendet eine gültige UUID
      const input = {
        name: 'Neues Produkt',
        description: 'Detaillierte Beschreibung',
        price: 99.99,
        stock: 50,
        categoryId: 'fd5f0dfe-a9ed-4234-b0a0-afc3c187c10b', // Gültige UUID
        variants: [],
      };

      const newProduct = await resolver.createProduct(input);

      expect(newProduct.id).toBe('abc123');
      expect(newProduct.name).toBe('Neues Produkt');
      expect(redisService.del).toHaveBeenCalledWith('products:*');
      // Überprüft, ob BEGIN/COMMIT aufgerufen wurden
      expect(clientMock.query).toHaveBeenCalledTimes(3);
    });

    it('sollte einen Fehler werfen, wenn die Validierung fehlschlägt', async () => {
      const invalidInput = {
        // Zum Beispiel fehlt der Name, um einen Validierungsfehler zu provozieren
        description: 'Fehlender Name',
        price: 10,
        stock: 5,
        categoryId: 'cat123',
      };

      if (invalidInput instanceof CreateProductInput) {
        await expect(
          resolver.createProduct(<CreateProductInput>invalidInput),
        ).rejects.toThrow();
      }
    });
  });
});
