export interface ProductDB {
  id: string;
  name: string;
  description: string;
  price: number;
  sku?: string;
  brand?: string;
  stock: number;
  category_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductVariantDB {
  id: string;
  product_id: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  created_at: Date;
}

export interface CategoryDB {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ImageDB {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  created_at: Date;
}

export interface ReviewDB {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: Date;
}
