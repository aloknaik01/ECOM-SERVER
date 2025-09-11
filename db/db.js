import pkg from "pg";
const { Client } = pkg;
import { conf } from "../src/config/conf.js";

const database = new Client({
  user: conf.db_user,
  host: conf.db_host,
  database: conf.db_password,
  password: conf.db_name,
  port: conf.db_port,
});

try {
  database.connect();
  console.log("Databse Connected Succesfully!");
} catch (error) {
  console.log("Some error occured while connecting to databse!", error);
  process.exit(1);
}

export default database;
