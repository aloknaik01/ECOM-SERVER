import express from "express";
import { createReturn, getMyReturns, getAllReturns, updateReturnStatus } from "../controllers/returnController.js";
import { isAuthenticated, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", isAuthenticated, createReturn);
router.get("/my", isAuthenticated, getMyReturns);
router.get("/admin/all", isAuthenticated, isAdmin, getAllReturns);
router.put("/admin/:id", isAuthenticated, isAdmin, updateReturnStatus);

export default router;
