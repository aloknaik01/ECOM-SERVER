import database from "../db/db.js";

export async function createWishlistTable() {
  try {
    const query = `CREATE TABLE IF NOT EXISTS wishlists (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      product_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );`;
    
    await database.query(query);
    console.log("Wishlist Table Created Successfully");
  } catch (error) {
    console.error("Failed To Create Wishlist Table.", error);
    process.exit(1);
  }
}