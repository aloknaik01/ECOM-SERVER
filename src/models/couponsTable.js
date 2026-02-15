import database from "../db/db.js";

export async function createCouponsTable() {
  try {
    const query = `CREATE TABLE IF NOT EXISTS coupons (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
      discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
      min_purchase_amount DECIMAL(10,2) DEFAULT 0,
      max_discount_amount DECIMAL(10,2),
      usage_limit INT,
      used_count INT DEFAULT 0,
      valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      valid_until TIMESTAMP NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by UUID NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );`;
    
    await database.query(query);
    console.log("Coupons Table Created Successfully");
  } catch (error) {
    console.error("Failed To Create Coupons Table.", error);
    process.exit(1);
  }
}