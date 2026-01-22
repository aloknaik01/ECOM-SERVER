// import express from "express";
// import {
//   createProduct,
//   fetchAllProducts,
//   updateProduct,
//   deleteProduct,
//   fetchSingleProduct,
//   postProductReview,
//   deleteReview,
//   fetchAIFilteredProducts,
// } from "../controllers/productController.js";
// import {
//   authorizedRoles,
//   isAuthenticated,
// } from "../middlewares/authMiddleware.js";

// const router = express.Router();

// router.post(
//   "/admin/create",
//   isAuthenticated,
//   authorizedRoles("Admin"),
//   createProduct
// );
// router.get("/", fetchAllProducts);
// router.get("/singleProduct/:productId", fetchSingleProduct);
// router.put("/post-new/review/:productId", isAuthenticated, postProductReview);
// router.delete("/delete/review/:productId", isAuthenticated, deleteReview);
// router.put(
//   "/admin/update/:productId",
//   isAuthenticated,
//   authorizedRoles("Admin"),
//   updateProduct
// );
// router.delete(
//   "/admin/delete/:productId",
//   isAuthenticated,
//   authorizedRoles("Admin"),
//   deleteProduct
// );
// router.post("/ai-search", isAuthenticated, fetchAIFilteredProducts);

// export default router;

import express from "express";
import {
  // Admin routes
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  getProductStatistics,
  
  // Public routes
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getAllCategories,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  searchProducts,
} from "../controllers/productController.js";
import { isAuthenticated, authorizedRoles } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ============= ADMIN ROUTES =============
// Admin - Create Product
router.post("/admin/create", isAuthenticated, authorizedRoles("Admin"), createProduct);

// Admin - Update Product
router.put("/admin/update/:id", isAuthenticated, authorizedRoles("Admin"), updateProduct);

// Admin - Delete Product
router.delete("/admin/delete/:id", isAuthenticated, authorizedRoles("Admin"), deleteProduct);

// Admin - Get All Products (with detailed info)
router.get("/admin/all", isAuthenticated, authorizedRoles("Admin"), getAllProductsAdmin);

// Admin - Get Statistics
router.get("/admin/statistics", isAuthenticated, authorizedRoles("Admin"), getProductStatistics);

// ============= PUBLIC ROUTES =============
// Get All Products (with filters)
router.get("/all", getAllProducts);

// Search Products
router.get("/search", searchProducts);

// Get All Categories
router.get("/categories", getAllCategories);

// Get Featured Products
router.get("/featured", getFeaturedProducts);

// Get New Arrivals
router.get("/new-arrivals", getNewArrivals);

// Get Products by Category
router.get("/category/:category", getProductsByCategory);

// Get Product by ID
router.get("/:id", getProductById);

// Get Related Products
router.get("/:id/related", getRelatedProducts);

export default router;