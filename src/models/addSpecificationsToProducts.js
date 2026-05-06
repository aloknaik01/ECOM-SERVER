import database from "../db/db.js";

// Migration: add specifications column to existing products table
export async function addSpecificationsToProducts() {
  try {
    await database.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb;
    `);
    console.log("Added specifications column to products table");
  } catch (error) {
    console.error("Failed to add specifications column to products table.", error);
  }
}
