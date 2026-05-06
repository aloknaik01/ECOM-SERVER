import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkInWishlist,
} from "../controllers/wishlistController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.get("/", isAuthenticated, getWishlist);
router.post("/add/:productId", isAuthenticated, addToWishlist);
router.delete("/remove/:productId", isAuthenticated, removeFromWishlist);
router.delete("/clear", isAuthenticated, clearWishlist);
router.get("/check/:productId", isAuthenticated, checkInWishlist);

export default router;