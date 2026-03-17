import database from "../db/db.js";

export async function createReturnsTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        reason TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Refunded')),
        refund_amount DECIMAL(10,2) DEFAULT 0,
        images JSONB DEFAULT '[]',
        admin_note TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  } catch (error) {
    console.error("Failed To Create Returns Table.", error);
    process.exit(1);
  }
}
