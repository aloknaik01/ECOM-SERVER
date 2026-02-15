import database from "../db/db.js";

// Run this AFTER vendors table is created
export async function addVendorToProducts() {
  try {
    // Check if column already exists
    const checkColumn = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='products' AND column_name='vendor_id'
    `);

    if (checkColumn.rows.length === 0) {
      // Add vendor_id column to products
      await database.query(`
        ALTER TABLE products 
        ADD COLUMN vendor_id UUID,
        ADD CONSTRAINT fk_products_vendor 
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
      `);

      // Create index
      await database.query(`
        CREATE INDEX idx_products_vendor_id ON products(vendor_id)
      `);

      console.log("Added vendor_id to products table");
    } else {
      console.log("vendor_id column already exists in products table");
    }
  } catch (error) {
    console.error("Failed to add vendor_id to products:", error);
    process.exit(1);
  }
}