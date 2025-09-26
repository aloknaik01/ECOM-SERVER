import express from "express";
import {
  forgotPassword,
  getUser,
  login,
  logout,
  register,
  resetPassowrd,
  updateFrofile,
  updatePassword,
} from "../controller/authController.js";
import { isAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/getme", isAuth, getUser);
router.get("/logout", isAuth, logout);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassowrd);
router.put("/password/update", isAuth, updatePassword);
router.put("/profile/update/",isAuth,  updateFrofile);
export default router;
