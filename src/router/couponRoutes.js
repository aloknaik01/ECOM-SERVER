import express from "express";
import {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  recordCouponUsage,
  getAvailableCoupons
} from "../controllers/couponController.js";
import { isAuthenticated, authorizedRoles } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ADMIN ROUTES
router.post("/admin/create", isAuthenticated, authorizedRoles("Admin"), createCoupon);
router.get("/admin/all", isAuthenticated, authorizedRoles("Admin"), getAllCoupons);
router.put("/admin/update/:id", isAuthenticated, authorizedRoles("Admin"), updateCoupon);
router.delete("/admin/delete/:id", isAuthenticated, authorizedRoles("Admin"), deleteCoupon);

// USER ROUTES
router.post("/validate", isAuthenticated, validateCoupon);
router.post("/record-usage", isAuthenticated, recordCouponUsage);
router.get("/available", isAuthenticated, getAvailableCoupons);

export default router;