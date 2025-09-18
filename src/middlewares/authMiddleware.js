import jwt from "jsonwebtoken";
import database from "../db/db.js";
import ErrorHandler from "./errorMiddleware.js";
import { catchError } from "./catchError.js";
import conf from "../config/conf.js";

export const isAuth = catchError(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHandler("User is not Authenticated", 401));
  }

  const decoded = jwt.verify(token, conf.jwt.secretKey);

  const user = await database.query(`SELECT * FROM users WHERE id=&1 LIMIT 1`, [
    decoded.id,
  ]);

  req.user = user.rows[0];
  next();
});
