import database from "../db/db.js";

export async function createFlashSalesTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS flash_sales (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id UUID NOT NULL,
        discount_percent DECIMAL(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CHECK (end_time > start_time)
      );
    `);
  } catch (error) {
    console.error("Failed To Create Flash Sales Table.", error);
    process.exit(1);
  }
}
