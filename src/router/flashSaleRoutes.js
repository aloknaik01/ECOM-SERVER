import express from "express";
import {
  getActiveFlashSales, createFlashSale, getAllFlashSales, updateFlashSale, deleteFlashSale
} from "../controllers/flashSaleController.js";
import { isAuthenticated, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/active", getActiveFlashSales);
router.post("/admin/create", isAuthenticated, isAdmin, createFlashSale);
router.get("/admin/all", isAuthenticated, isAdmin, getAllFlashSales);
router.put("/admin/:id", isAuthenticated, isAdmin, updateFlashSale);
router.delete("/admin/:id", isAuthenticated, isAdmin, deleteFlashSale);

export default router;
