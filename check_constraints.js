import database from "./src/db/db.js";

async function check() {
  try {
    const res = await database.query(`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.conname = 'payments_payment_type_check';
    `);
    console.log("Constraint Definition:");
    console.log(res.rows[0]?.constraint_def);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
