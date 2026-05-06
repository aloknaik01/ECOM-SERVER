import database from "./src/db/db.js";

async function clearAllOrders() {
  try {
    console.log("Beginning deletion of all orders and related records...");
    
    // We'll delete in order of dependencies if foreign keys don't have CASCADE.
    // Or we can just try TRUNCATE TABLE orders CASCADE
    await database.query("BEGIN");
    
    // Deleting from child tables first to avoid foreign key violations
    console.log("Deleting vendor_sales...");
    await database.query("DELETE FROM vendor_sales");

    console.log("Deleting payments...");
    await database.query("DELETE FROM payments");

    console.log("Deleting shipping_info...");
    await database.query("DELETE FROM shipping_info");

    console.log("Deleting order_items...");
    await database.query("DELETE FROM order_items");

    console.log("Deleting returns...");
    try {
      await database.query("DELETE FROM returns");
    } catch(e) {
      console.log("No returns table or error:", e.message);
    }

    console.log("Deleting orders...");
    await database.query("DELETE FROM orders");

    await database.query("COMMIT");
    console.log("Successfully deleted all orders and related data!");
  } catch(e) {
    await database.query("ROLLBACK");
    console.error("ERROR deleting orders:", e);
  } finally {
    process.exit(0);
  }
}
clearAllOrders();
