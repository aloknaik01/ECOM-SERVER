import database from "../db/db.js";

export async function createProductVariantsTable() {
  try {
    const query = `CREATE TABLE IF NOT EXISTS product_variants (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID NOT NULL,
      sku VARCHAR(100) UNIQUE,
      size VARCHAR(50),
      color VARCHAR(50),
      material VARCHAR(100),
      price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
      stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
      images JSONB DEFAULT '[]'::JSONB,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, size, color)
    );
    
    CREATE INDEX idx_variants_product_id ON product_variants(product_id);
    CREATE INDEX idx_variants_sku ON product_variants(sku);`;
    
    await database.query(query);
    console.log("Product Variants Table Created Successfully");
  } catch (error) {
    console.error("Failed To Create Product Variants Table.", error);
    process.exit(1);
  }
}