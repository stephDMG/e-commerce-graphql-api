// src/entities/Product.ts
import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class Image {
  @Field(() => ID)
  id: string;

  @Field()
  url: string;

  @Field({ nullable: true })
  altText?: string;
}

@ObjectType()
export class Review {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => Float)
  rating: number;

  @Field({ nullable: true })
  comment?: string;

  @Field()
  createdAt: string;
}

@ObjectType()
export class Category {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Category, { nullable: true })
  parentCategory?: Category;

  @Field(() => [Product], { nullable: true })
  products?: Product[];
}

@ObjectType()
export class ProductVariant {
  @Field(() => ID)
  id: string;

  @Field()
  color: string;

  @Field()
  size: string;

  @Field(() => Float)
  price: number;

  @Field(() => Int)
  stock: number;
}

@ObjectType()
export class Product {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => Float)
  price: number;

  @Field({ nullable: true })
  sku?: string;

  @Field({ nullable: true })
  brand?: string;

  @Field(() => Int)
  stock: number;

  @Field(() => Category)
  category: Category;

  @Field(() => [Image])
  images: Image[];

  @Field(() => [ProductVariant])
  variants: ProductVariant[];

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => [Review], { nullable: true })
  reviews?: Review[];
}
