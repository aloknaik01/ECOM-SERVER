import database from "../db/db.js";

// Migration: add icon column to existing products table
export async function addIconToProducts() {
  try {
    await database.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
    `);
    console.log("Added icon column to products table");
  } catch (error) {
    console.error("Failed to add icon column to products table.", error);
  }
}
