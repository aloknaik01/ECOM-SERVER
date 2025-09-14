import { createUserTable } from "../models/userTable.js";
import { createOrdersTable } from "../models/ordersTable.js";
import { createOrderItemTable } from "../models/orderItemsTable.js";
import { createProductReviewsTable } from "../models/productReviewsTable.js";
import { createProductTable } from "../models/productTable.js";
import { createShippingInfoTable } from "../models/shippingInfoTable.js";
import { createPaymentsTable } from "../models/paymentsTable.js";

export async function createTables() {
  try {
    console.log("Starting table creation...");
    await createUserTable();
    await createProductTable();
    await createOrdersTable();
    await createOrderItemTable();
    await createProductReviewsTable();
    await createShippingInfoTable();
    await createPaymentsTable();
    console.log("All tables created successfully.");
  } catch (error) {
    console.error("Failed to create tables:", error);
    process.exit(1);
  }
}
