import database from "../db/db.js";

// Migration: add images column to existing reviews table
export async function addImagesToReviews() {
  try {
    await database.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
    `);
  } catch (error) {
    console.error("Failed to add images column to reviews table.", error);
  }
}
