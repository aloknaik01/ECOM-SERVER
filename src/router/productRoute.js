import express from "express";
import {
  createProduct
} from "../controller/productController.js";
import { isAuth, authorizeRoles } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/admin/add-product", isAuth, authorizeRoles("Admin"), createProduct);

export default router;
