import express from "express";
import {
  // ── admin ──
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  getProductStatistics,

  // ── public ──
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getAllCategories,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  searchProducts,

  // ── reviews ──
  postProductReview,
  deleteReview,

  // ── AI ──
  fetchAIFilteredProducts,
} from "../controllers/productController.js";
import { isAuthenticated, authorizedRoles } from "../middlewares/authMiddleware.js";

const router = express.Router();


// ADMIN ROUTES  (authenticated + Admin role)

router.post   ("/admin/create",      isAuthenticated, authorizedRoles("Admin"), createProduct);
router.put    ("/admin/update/:id",  isAuthenticated, authorizedRoles("Admin"), updateProduct);
router.delete ("/admin/delete/:id",  isAuthenticated, authorizedRoles("Admin"), deleteProduct);
router.get    ("/admin/all",         isAuthenticated, authorizedRoles("Admin"), getAllProductsAdmin);
router.get    ("/admin/statistics",  isAuthenticated, authorizedRoles("Admin"), getProductStatistics);


// PUBLIC ROUTES  (no auth required)

router.get("/all",                  getAllProducts);
router.get("/search",               searchProducts);
router.get("/categories",           getAllCategories);
router.get("/featured",             getFeaturedProducts);
router.get("/new-arrivals",         getNewArrivals);
router.get("/category/:category",   getProductsByCategory);

// ── must come AFTER the named static routes above ──
router.get("/:id",          getProductById);
router.get("/:id/related",  getRelatedProducts);


// REVIEW ROUTES  (authenticated users only)
router.put    ("/review/post/:productId",   isAuthenticated, postProductReview);
router.delete ("/review/delete/:productId", isAuthenticated, deleteReview);


// AI SEARCH  (authenticated users only)

router.post("/ai-search", isAuthenticated, fetchAIFilteredProducts);

export default router;