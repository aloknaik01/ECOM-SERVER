import jwt from "jsonwebtoken";
import { catchAsyncErrors } from "./catchAsyncError.js";
import ErrorHandler from "./errorMiddleware.js";
import database from "../db/db.js";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to access this resource.", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await database.query(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [decoded.id]
  );
  req.user = user.rows[0];
  next();
});

export const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resource.`,
          403
        )
      );
    }
    next();
  };
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return next(
      new ErrorHandler("Only Admins are allowed to access this resource.", 403)
    );
  }
  next();
};

export const isVendorOrAdmin = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role === 'Admin') {
    return next();
  }

  // Check if active vendor
  const vendorRes = await database.query(
    "SELECT id, status FROM vendors WHERE user_id = $1 AND status = 'active'",
    [req.user.id]
  );

  if (vendorRes.rows.length === 0) {
    return next(
      new ErrorHandler("Only Admins or Active Vendors can perform this action.", 403)
    );
  }

  req.vendor = vendorRes.rows[0];
  next();
});

