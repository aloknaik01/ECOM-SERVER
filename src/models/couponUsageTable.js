import database from "../db/db.js";

export async function createCouponUsageTable() {
  try {
    const query = `CREATE TABLE IF NOT EXISTS coupon_usage (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      coupon_id UUID NOT NULL,
      user_id UUID NOT NULL,
      order_id UUID NOT NULL,
      discount_applied DECIMAL(10,2) NOT NULL,
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      UNIQUE(user_id, coupon_id, order_id)
    );`;
    
    await database.query(query);
    console.log("Coupon Usage Table Created Successfully");
  } catch (error) {
    console.error("Failed To Create Coupon Usage Table.", error);
    process.exit(1);
  }
}