import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchError } from "../middlewares/catchError.js";
import database from "../db/db.js";
import bcrypt from "bcrypt";
import { sendToken } from "../utils/jwtToken.js";

//register
export const register = catchError(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("All fields are required!", 400));
  }

  const isRegister = await database.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (isRegister.rows.length > 0) {
    return next(
      new ErrorHandler("User already registered with this email.", 400)
    );
  }

  const hashedPassword = await bcrypt.hash(String(password), Number(10));

  const user = await database.query(
    `INSERT INTO users (name, email, password) values($1, $2, $3) RETURNING *`,
    [name, email, hashedPassword]
  );

  sendToken(user.rows[0], 201, "User registered successfully", res);
});

//login
export const login = catchError(async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return next(new ErrorHandler("email and password is required!", 400));
  }

  const user = await database.query(`SELECT * FROM users WHERE email=$1`, [
    email,
  ]);

  if (user.rows.length === 0) {
    return next(new ErrorHandler("Invalid email and password", 401));
  }

  const isPassMatch = await bcrypt.compare(password, user.rows[0].password);

  if (!isPassMatch) {
    return next(new ErrorHandler("Invalid email and password", 401));
  }

  sendToken(user.rows[0], 200, "logged in", res);
});

export const getUser = catchError(async (req, res, next) => {
  const { user } = req;

  res.status(200).json({
    success: true,
    user,
  });
});

export const logout = catchError(async (req, res, next) => {});
