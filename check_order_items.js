import database from "./src/db/db.js";

async function check() {
  const res = await database.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_items'");
  console.log(res.rows);
  process.exit(0);
}
check();
