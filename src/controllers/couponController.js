import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import database from "../db/db.js";

// ADMIN: Create Coupon
// POST /api/v1/coupon/admin/create
export const createCoupon = catchAsyncErrors(async (req, res, next) => {
  const { 
    code, 
    discount_type, 
    discount_value, 
    min_purchase_amount, 
    max_discount_amount,
    usage_limit,
    valid_until 
  } = req.body;

  if (!code || !discount_type || !discount_value || !valid_until) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  // Check if code already exists
  const existing = await database.query(
    "SELECT id FROM coupons WHERE UPPER(code) = UPPER($1)",
    [code]
  );

  if (existing.rows.length > 0) {
    return next(new ErrorHandler("Coupon code already exists", 400));
  }

  // Validate discount value
  if (discount_type === 'percentage' && discount_value > 100) {
    return next(new ErrorHandler("Percentage discount cannot exceed 100%", 400));
  }

  const result = await database.query(
    `INSERT INTO coupons 
    (code, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, valid_until, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      code.toUpperCase(),
      discount_type,
      discount_value,
      min_purchase_amount || 0,
      max_discount_amount || null,
      usage_limit || null,
      valid_until,
      req.user.id
    ]
  );

  res.status(201).json({
    success: true,
    message: "Coupon created successfully",
    coupon: result.rows[0]
  });
});

// ADMIN: Get All Coupons
// GET /api/v1/coupon/admin/all
export const getAllCoupons = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`
    SELECT 
      c.*,
      u.name as created_by_name,
      (c.usage_limit IS NULL OR c.used_count < c.usage_limit) as is_available,
      (c.valid_until > CURRENT_TIMESTAMP) as is_valid
    FROM coupons c
    JOIN users u ON c.created_by = u.id
    ORDER BY c.created_at DESC
  `);

  res.status(200).json({
    success: true,
    coupons: result.rows
  });
});

// ADMIN: Update Coupon
// PUT /api/v1/coupon/admin/update/:id
export const updateCoupon = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { 
    discount_type, 
    discount_value, 
    min_purchase_amount, 
    max_discount_amount,
    usage_limit,
    valid_until,
    is_active
  } = req.body;

  // Check if coupon exists
  const coupon = await database.query("SELECT * FROM coupons WHERE id = $1", [id]);
  if (coupon.rows.length === 0) {
    return next(new ErrorHandler("Coupon not found", 404));
  }

  const result = await database.query(
    `UPDATE coupons SET
      discount_type = $1,
      discount_value = $2,
      min_purchase_amount = $3,
      max_discount_amount = $4,
      usage_limit = $5,
      valid_until = $6,
      is_active = $7
    WHERE id = $8 RETURNING *`,
    [
      discount_type || coupon.rows[0].discount_type,
      discount_value || coupon.rows[0].discount_value,
      min_purchase_amount !== undefined ? min_purchase_amount : coupon.rows[0].min_purchase_amount,
      max_discount_amount !== undefined ? max_discount_amount : coupon.rows[0].max_discount_amount,
      usage_limit !== undefined ? usage_limit : coupon.rows[0].usage_limit,
      valid_until || coupon.rows[0].valid_until,
      is_active !== undefined ? is_active : coupon.rows[0].is_active,
      id
    ]
  );

  res.status(200).json({
    success: true,
    message: "Coupon updated successfully",
    coupon: result.rows[0]
  });
});

// ADMIN: Delete Coupon
// DELETE /api/v1/coupon/admin/delete/:id
export const deleteCoupon = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const result = await database.query(
    "DELETE FROM coupons WHERE id = $1 RETURNING *",
    [id]
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Coupon not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Coupon deleted successfully"
  });
});

// USER: Validate and Apply Coupon
// POST /api/v1/coupon/validate
export const validateCoupon = catchAsyncErrors(async (req, res, next) => {
  const { code, cart_total } = req.body;
  const userId = req.user.id;

  if (!code || !cart_total) {
    return next(new ErrorHandler("Please provide coupon code and cart total", 400));
  }

  // Get coupon details
  const couponResult = await database.query(
    `SELECT * FROM coupons 
     WHERE UPPER(code) = UPPER($1) 
     AND is_active = true 
     AND valid_until > CURRENT_TIMESTAMP`,
    [code]
  );

  if (couponResult.rows.length === 0) {
    return next(new ErrorHandler("Invalid or expired coupon code", 400));
  }

  const coupon = couponResult.rows[0];

  // Check minimum purchase amount
  if (cart_total < coupon.min_purchase_amount) {
    return next(
      new ErrorHandler(
        `Minimum purchase amount is $${coupon.min_purchase_amount}`,
        400
      )
    );
  }

  // Check usage limit
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return next(new ErrorHandler("Coupon usage limit reached", 400));
  }

  // Check if user already used this coupon (optional - remove if you want unlimited use per user)
  const usageCheck = await database.query(
    "SELECT id FROM coupon_usage WHERE user_id = $1 AND coupon_id = $2",
    [userId, coupon.id]
  );

  if (usageCheck.rows.length > 0) {
    return next(new ErrorHandler("You have already used this coupon", 400));
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = (cart_total * coupon.discount_value) / 100;
    // Apply max discount limit if set
    if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }
  } else {
    // Fixed discount
    discount = coupon.discount_value;
  }

  // Discount cannot exceed cart total
  if (discount > cart_total) {
    discount = cart_total;
  }

  const final_total = cart_total - discount;

  res.status(200).json({
    success: true,
    message: "Coupon applied successfully",
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value
    },
    discount: parseFloat(discount.toFixed(2)),
    original_total: parseFloat(cart_total.toFixed(2)),
    final_total: parseFloat(final_total.toFixed(2))
  });
});

// Record Coupon Usage (called after order is placed)
// POST /api/v1/coupon/record-usage
export const recordCouponUsage = catchAsyncErrors(async (req, res, next) => {
  const { coupon_id, order_id, discount_applied } = req.body;
  const userId = req.user.id;

  if (!coupon_id || !order_id || !discount_applied) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  // Record usage
  await database.query(
    `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_applied)
     VALUES ($1, $2, $3, $4)`,
    [coupon_id, userId, order_id, discount_applied]
  );

  // Increment used count
  await database.query(
    "UPDATE coupons SET used_count = used_count + 1 WHERE id = $1",
    [coupon_id]
  );

  res.status(200).json({
    success: true,
    message: "Coupon usage recorded"
  });
});

// USER: Get Available Coupons
// GET /api/v1/coupon/available
export const getAvailableCoupons = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`
    SELECT 
      id, code, discount_type, discount_value, 
      min_purchase_amount, max_discount_amount, 
      valid_until, usage_limit, used_count
    FROM coupons
    WHERE is_active = true 
    AND valid_until > CURRENT_TIMESTAMP
    AND (usage_limit IS NULL OR used_count < usage_limit)
    ORDER BY created_at DESC
  `);

  res.status(200).json({
    success: true,
    coupons: result.rows
  });
});