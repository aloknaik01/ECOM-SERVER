import express from "express";
import {
  registerVendor,
  getMyVendorProfile,
  updateVendorProfile,
  getVendorDashboardStats,
  requestPayout,
  getMyPayouts,
  getAllVendors,
  updateVendorStatus,
  processPayout,
  getVendorStore
} from "../controllers/vendorController.js";
import { isAuthenticated, authorizedRoles } from "../middlewares/authMiddleware.js";

const router = express.Router();

// VENDOR ROUTES (Authenticated Users)
router.post("/register", isAuthenticated, registerVendor);
router.get("/me", isAuthenticated, getMyVendorProfile);
router.put("/update", isAuthenticated, updateVendorProfile);
router.get("/dashboard-stats", isAuthenticated, getVendorDashboardStats);
router.post("/request-payout", isAuthenticated, requestPayout);
router.get("/payouts", isAuthenticated, getMyPayouts);

// ADMIN ROUTES
router.get("/admin/all", isAuthenticated, authorizedRoles("Admin"), getAllVendors);
router.put("/admin/update-status/:vendorId", isAuthenticated, authorizedRoles("Admin"), updateVendorStatus);
router.put("/admin/process-payout/:payoutId", isAuthenticated, authorizedRoles("Admin"), processPayout);

// PUBLIC ROUTES
router.get("/store/:vendorId", getVendorStore);

export default router;