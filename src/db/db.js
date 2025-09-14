import pkg from "pg";
const { Client } = pkg;
import conf from "../config/conf.js";

const database = new Client({
  user: conf.db.db_user,
  host: conf.db.db_host,
  database: conf.db.db_name,
  password: conf.db.db_password,
  port: conf.db.db_port,
});

try {
  database.connect();
  console.log("Databse Connected Succesfully!");
} catch (error) {
  console.log("Some error occured while connecting to databse!", error);
  process.exit(1);
}

export default database;
