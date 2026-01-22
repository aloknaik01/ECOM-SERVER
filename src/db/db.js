import pkg from "pg";
const { Client } = pkg;

const database = new Client({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_DATABASE || "mern_ecommerce_store",
  password: process.env.DB_PASSWORD || "alok@pgadmin",
  port: process.env.DB_PORT || 5432,
});

try {
  await database.connect();
  console.log("Connected to the database successfully");
} catch (error) {
  console.error("Database connection failed:", error);
  process.exit(1);
}

export default database;