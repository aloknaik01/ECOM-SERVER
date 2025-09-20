import express from "express";
import {
  getUser,
  login,
  logout,
  register,
} from "../controller/authController.js";
import { isAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/getme", isAuth, getUser);
router.get("/logout", isAuth, logout);
export default router;
