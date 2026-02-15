import { createWishlistTable } from "../models/wishlistTable.js";
import { createCouponsTable } from "../models/couponsTable.js";
import { createCouponUsageTable } from "../models/couponUsageTable.js";
import { createProductVariantsTable } from "../models/productVariantsTable.js";
import { createVendorsTable } from "../models/vendorsTable.js";
import { createVendorPayoutsTable } from "../models/vendorPayoutsTable.js";
import { createVendorSalesTable } from "../models/vendorSalesTable.js";
import { addVendorToProducts } from "../models/addVendorToProducts.js";
import { createUserTable } from "../models/userTable.js";
import { createOrdersTable } from "../models/ordersTable.js";
import { createOrderItemTable } from "../models/orderItemsTable.js";
import { createProductReviewsTable } from "../models/productReviewsTable.js";
import { createProductsTable } from "../models/productTable.js";
import { createShippingInfoTable } from "../models/shippingInfoTable.js";
import { createPaymentsTable } from "../models/paymentsTable.js";

export async function createTables() {
  await createUserTable();
  await createProductsTable();
  await createOrdersTable();
  await createOrderItemTable();
  await createShippingInfoTable();
  await createPaymentsTable();
  await createProductReviewsTable();
  
  // NEW TABLES
  await createWishlistTable();
  await createCouponsTable();
  await createCouponUsageTable();
  await createProductVariantsTable();
  await createVendorsTable();
  await createVendorPayoutsTable();
  await createVendorSalesTable();
  await addVendorToProducts();  
}