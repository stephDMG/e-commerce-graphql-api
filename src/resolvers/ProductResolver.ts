// src/resolvers/ProductResolver.ts
import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Int,
  FieldResolver,
  Root,
} from 'type-graphql';

import { redisService } from '@/services/RedisService';
import { pool } from '@/core/database';
//import { CurrencyService } from '@/services/CurrencyService';
//import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import * as yup from 'yup';
import logger from '@/utils/logger';
import { Category, Product, ProductVariant, Review } from '@/entities/Product';
import {
  ProductDB,
  CategoryDB,
  ReviewDB,
  ProductVariantDB,
} from '@/entities/types';
import { CreateProductInput } from '@/entities/inputs/ProductInput';

// Validierungsschema für die Eingabe
const productSchema = yup.object({
  name: yup.string().required().min(3).max(100),
  description: yup.string().required().min(10),
  price: yup.number().positive().required(),
  sku: yup.string().nullable(),
  brand: yup.string().nullable(),
  stock: yup.number().integer().min(0).required(),
  categoryId: yup.string().uuid().required(),
  variants: yup.array().of(
    yup.object({
      color: yup.string().required(),
      size: yup.string().required(),
      price: yup.number().positive().required(),
      stock: yup.number().integer().min(0).required(),
    }),
  ),
});

// Resolver für Produkte
@Resolver(Product)
export class ProductResolver {
  private productData: Map<string, ProductDB> = new Map();
  private reviewData: Map<string, ReviewDB[]> = new Map();
  private variantData: Map<string, ProductVariantDB[]> = new Map();

  // Produkte abrufen
  @Query(() => [Product])
  async products(
    @Arg('limit', () => Int, { defaultValue: 10 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
  ): Promise<Product[]> {
    try {
      const cacheKey = `products:${limit}:${offset}`;
      const cachedProducts = await redisService.get<Product[]>(cacheKey);
      if (cachedProducts) {
        return cachedProducts;
      }

      const query = `
        SELECT p.*, c.name AS category_name, COALESCE(AVG(r.rating), 0) AS average_rating
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN reviews r ON r.product_id = p.id
        WHERE p.is_active = true
        GROUP BY p.id, c.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await pool.query(query, [limit, offset]);
      const products = result.rows;
      await redisService.set(cacheKey, products, 300);
      result.rows.forEach((row) => {
        this.productData.set(row.id, row);
      });
      return result.rows.map(this.mapProductDBToProduct);
    } catch (error) {
      logger.error('Fehler beim Abrufen der Produkte', { error });
      throw error;
    }
  }
  // genau ein Produkt abrufen
  @Query(() => Product, { nullable: true })
  async product(@Arg('id') id: string): Promise<Product | null> {
    try {
      const cacheKey = `product:${id}`;
      const cachedProduct = await redisService.get<Product>(cacheKey);
      if (cachedProduct) {
        return cachedProduct;
      }

      const query = `
        SELECT p.*, c.name AS category_name, COALESCE(AVG(r.rating), 0) AS average_rating
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN reviews r ON r.product_id = p.id
        WHERE p.id = $1 AND p.is_active = true
        GROUP BY p.id, c.id
      `;

      const result = await pool.query(query, [id]);
      const product = result.rows[0];

      if (!product) {
        return null;
      }

      await redisService.set(cacheKey, product, 3600);
      return product;
    } catch (error) {
      logger.error('Fehler beim Abrufen des Produkts', {
        error,
        productId: id,
      });
      throw error;
    }
  }
  // Produkt erstellen
  @Mutation(() => Product)
  async createProduct(
    @Arg('input', () => CreateProductInput) input: CreateProductInput,
  ): Promise<Product> {
    try {
      await productSchema.validate(input);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const productQuery = `
          INSERT INTO products (name, description, price, sku, brand, stock, category_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        const productResult = await client.query(productQuery, [
          input.name,
          input.description,
          input.price,
          input.sku,
          input.brand,
          input.stock,
          input.categoryId,
        ]);

        const product = productResult.rows[0];

        if (input.variants?.length) {
          const variantQuery = `
            INSERT INTO product_variants (product_id, color, size, price, stock)
            VALUES ($1, $2, $3, $4, $5)
          `;

          for (const variant of input.variants) {
            await client.query(variantQuery, [
              product.id,
              variant.color,
              variant.size,
              variant.price,
              variant.stock,
            ]);
          }
        }

        await client.query('COMMIT');
        await redisService.del('products:*');

        return product;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Fehler beim Erstellen des Produkts', { error, input });
      throw error;
    }
  }

  @FieldResolver(() => Category)
  async category(@Root() product: Product): Promise<Category> {
    const productRawData = this.productData.get(product.id);
    if (!productRawData) {
      throw new Error('Product data not found');
    }

    const cacheKey = `category:${productRawData.category_id}`;
    try {
      const cachedCategory = await redisService.get<Category>(cacheKey);
      if (cachedCategory) {
        return cachedCategory;
      }

      const query = 'SELECT * FROM categories WHERE id = $1';
      const result = await pool.query<CategoryDB>(query, [
        productRawData.category_id,
      ]);
      const category = this.mapCategoryDBToCategory(result.rows[0]);

      await redisService.set(cacheKey, category, 3600);
      return category;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Kategorie', {
        error,
        categoryId: productRawData.category_id,
      });
      throw error;
    }
  }

  @FieldResolver(() => [Review])
  async reviews(@Root() product: Product): Promise<Review[]> {
    const cacheKey = `reviews:${product.id}`;
    try {
      const cachedReviews = await redisService.get<Review[]>(cacheKey);
      if (cachedReviews) {
        return cachedReviews;
      }

      const query = 'SELECT * FROM reviews WHERE product_id = $1';
      const result = await pool.query<ReviewDB>(query, [product.id]);

      this.reviewData.set(product.id, result.rows);

      const reviews = result.rows.map(this.mapReviewDBToReview);
      await redisService.set(cacheKey, reviews, 1800);
      return reviews;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Bewertungen', {
        error,
        productId: product.id,
      });
      throw error;
    }
  }

  @FieldResolver(() => [ProductVariant])
  async variants(@Root() product: Product): Promise<ProductVariant[]> {
    const cacheKey = `variants:${product.id}`;
    try {
      const cachedVariants = await redisService.get<ProductVariant[]>(cacheKey);
      if (cachedVariants) {
        return cachedVariants;
      }

      const query = 'SELECT * FROM product_variants WHERE product_id = $1';
      const result = await pool.query<ProductVariantDB>(query, [product.id]);

      // Stocker les données brutes
      this.variantData.set(product.id, result.rows);

      const variants = result.rows.map(this.mapVariantDBToVariant);
      await redisService.set(cacheKey, variants, 1800);
      return variants;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Varianten', {
        error,
        productId: product.id,
      });
      throw error;
    }
  }

  private mapProductDBToProduct(productDB: ProductDB): Product {
    const product = new Product();
    product.id = productDB.id;
    product.name = productDB.name;
    product.description = productDB.description;
    product.price = productDB.price;
    product.sku = productDB.sku;
    product.brand = productDB.brand;
    product.stock = productDB.stock;
    return product;
  }

  private mapCategoryDBToCategory(categoryDB: CategoryDB): Category {
    const category = new Category();
    category.id = categoryDB.id;
    category.name = categoryDB.name;
    category.description = categoryDB.description;
    //category.parentCategoryId = categoryDB.parent_category_id;
    return category;
  }

  private mapReviewDBToReview(reviewDB: ReviewDB): Review {
    const review = new Review();
    review.id = reviewDB.id;
    review.userId = reviewDB.user_id;
    review.rating = reviewDB.rating;
    review.comment = reviewDB.comment;
    review.createdAt = reviewDB.created_at.toISOString();
    return review;
  }

  private mapVariantDBToVariant(variantDB: ProductVariantDB): ProductVariant {
    const variant = new ProductVariant();
    variant.id = variantDB.id;
    variant.color = variantDB.color;
    variant.size = variantDB.size;
    variant.price = variantDB.price;
    variant.stock = variantDB.stock;
    return variant;
  }
}
