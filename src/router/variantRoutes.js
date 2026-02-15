import express from "express";
import {
  addVariant,
  updateVariant,
  deleteVariant,
  getProductVariants,
  getVariantById,
  getAllVariants,
  getAvailableSizes,
  getAvailableColors,
  findVariant
} from "../controllers/variantController.js";
import { isAuthenticated, authorizedRoles } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ADMIN ROUTES
router.post("/admin/add/:productId", isAuthenticated, authorizedRoles("Admin"), addVariant);
router.put("/admin/update/:variantId", isAuthenticated, authorizedRoles("Admin"), updateVariant);
router.delete("/admin/delete/:variantId", isAuthenticated, authorizedRoles("Admin"), deleteVariant);
router.get("/admin/all", isAuthenticated, authorizedRoles("Admin"), getAllVariants);

// PUBLIC ROUTES
router.get("/product/:productId", getProductVariants);
router.get("/sizes/:productId", getAvailableSizes);
router.get("/colors/:productId", getAvailableColors);
router.get("/find/:productId", findVariant);
router.get("/:variantId", getVariantById);

export default router;