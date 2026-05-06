import database from "./src/db/db.js";
async function check() {
  const res = await database.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
  console.log(res.rows);
  const res2 = await database.query("SELECT * FROM pg_enum");
  console.log(res2.rows);
  process.exit(0);
}
check();
