// src/entities/inputs/ProductInput.ts

import { InputType, Field, Float, Int } from 'type-graphql';

@InputType()
export class ProductVariantInput {
  @Field()
  color: string;

  @Field()
  size: string;

  @Field(() => Float)
  price: number;

  @Field(() => Int)
  stock: number;
}

@InputType()
export class CreateProductInput {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => Float)
  price: number;

  @Field({ nullable: true })
  sku?: string;

  @Field({ nullable: true })
  brand?: string;

  @Field(() => Int)
  stock: number;

  @Field()
  categoryId: string;

  @Field(() => [ProductVariantInput], { nullable: true })
  variants?: ProductVariantInput[];
}
