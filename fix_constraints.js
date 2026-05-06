import database from "./src/db/db.js";

async function fixConstraints() {
  try {
    console.log("Dropping payment_type check constraint...");
    await database.query(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;`);
    
    console.log("Dropping payment_status check constraint...");
    await database.query(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;`);

    // Let's add them back with allowed values
    console.log("Adding updated check constraints...");
    await database.query(`ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN ('Online', 'COD'));`);
    await database.query(`ALTER TABLE payments ADD CONSTRAINT payments_payment_status_check CHECK (payment_status IN ('Pending', 'Paid', 'Failed'));`);

    console.log("Constraints fixed successfully!");
  } catch(e) {
    console.error("ERROR fixing constraints:", e);
  } finally {
    process.exit(0);
  }
}
fixConstraints();
