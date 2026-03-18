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
import { createFlashSalesTable } from "../models/flashSalesTable.js";
import { createAddressesTable } from "../models/addressesTable.js";
import { createReturnsTable } from "../models/returnsTable.js";
import { addImagesToReviews } from "../models/addImagesToReviews.js";
import { addIconToProducts } from "../models/addIconToProducts.js";
import { addSpecificationsToProducts } from "../models/addSpecificationsToProducts.js";

export async function createTables() {
  await createUserTable();
  await createProductsTable();
  await createOrdersTable();
  await createOrderItemTable();
  await createShippingInfoTable();
  await createPaymentsTable();
  await createProductReviewsTable();

  // EXISTING TABLES
  await createWishlistTable();
  await createCouponsTable();
  await createCouponUsageTable();
  await createProductVariantsTable();
  await createVendorsTable();
  await createVendorPayoutsTable();
  await createVendorSalesTable();
  await addVendorToProducts();

  // NEW TABLES
  await createFlashSalesTable();
  await createAddressesTable();
  await createReturnsTable();

  // MIGRATIONS
  await addImagesToReviews();
  await addIconToProducts();
  await addSpecificationsToProducts();
}