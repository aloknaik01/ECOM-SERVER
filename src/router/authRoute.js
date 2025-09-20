import express from "express";
import { getUser, login, register } from "../controller/authController.js";
import { isAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/getme", isAuth, getUser);
export default router;
