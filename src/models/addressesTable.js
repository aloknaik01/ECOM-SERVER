import database from "../db/db.js";

export async function createAddressesTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT DEFAULT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        zip VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL DEFAULT 'India',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  } catch (error) {
    console.error("Failed To Create Addresses Table.", error);
    process.exit(1);
  }
}
