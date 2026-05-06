import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import database from "../db/db.js";

// GET /api/v1/wishlist - Get user's wishlist
export const getWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  const result = await database.query(
    `SELECT 
      w.id as wishlist_id,
      w.created_at as added_at,
      p.id,
      p.name,
      p.description,
      p.price,
      p.category,
      p.ratings,
      p.images,
      p.stock,
      COUNT(r.id) as review_count
    FROM wishlists w
    JOIN products p ON w.product_id = p.id
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE w.user_id = $1
    GROUP BY w.id, w.created_at, p.id
    ORDER BY w.created_at DESC`,
    [userId]
  );

  res.status(200).json({
    success: true,
    wishlist: result.rows,
  });
});

// POST /api/v1/wishlist/add/:productId - Add to wishlist
export const addToWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.params;

  // Check if product exists
  const productCheck = await database.query(
    "SELECT id FROM products WHERE id = $1",
    [productId]
  );

  if (productCheck.rows.length === 0) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check if already in wishlist
  const existingCheck = await database.query(
    "SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );

  if (existingCheck.rows.length > 0) {
    return res.status(200).json({
      success: true,
      message: "Product already in wishlist",
    });
  }

  // Add to wishlist
  await database.query(
    "INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)",
    [userId, productId]
  );

  res.status(201).json({
    success: true,
    message: "Added to wishlist",
  });
});

// DELETE /api/v1/wishlist/remove/:productId - Remove from wishlist
export const removeFromWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.params;

  const result = await database.query(
    "DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2 RETURNING *",
    [userId, productId]
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Product not in wishlist", 404));
  }

  res.status(200).json({
    success: true,
    message: "Removed from wishlist",
  });
});

// DELETE /api/v1/wishlist/clear - Clear entire wishlist
export const clearWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  await database.query("DELETE FROM wishlists WHERE user_id = $1", [userId]);

  res.status(200).json({
    success: true,
    message: "Wishlist cleared",
  });
});

// GET /api/v1/wishlist/check/:productId - Check if product is in wishlist
export const checkInWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.params;

  const result = await database.query(
    "SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );

  res.status(200).json({
    success: true,
    inWishlist: result.rows.length > 0,
  });
});