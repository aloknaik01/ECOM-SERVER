import express from "express";
import {
  forgotPassword,
  getUser,
  login,
  logout,
  register,
  resetPassowrd,
  updatePassword,
} from "../controller/authController.js";
import { isAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/getme", isAuth, getUser);
router.get("/logout", isAuth, logout);
router.post("/password/forgot", forgotPassword);
router.put("/password/update", updatePassword);
router.put("/password/reset/:token", resetPassowrd);
export default router;
