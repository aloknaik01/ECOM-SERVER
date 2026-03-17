import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import database from "../db/db.js";

// GET /api/v1/flash-sale/active — public: get currently active flash sales
export const getActiveFlashSales = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(
    `SELECT fs.*, p.name, p.price, p.images, p.ratings, p.stock, p.category
     FROM flash_sales fs
     JOIN products p ON p.id = fs.product_id
     WHERE fs.is_active = TRUE
       AND fs.start_time <= NOW()
       AND fs.end_time > NOW()
     ORDER BY fs.end_time ASC`
  );

  const salesWithDiscount = result.rows.map(s => ({
    ...s,
    sale_price: Number((s.price * (1 - s.discount_percent / 100)).toFixed(2)),
  }));

  res.status(200).json({ success: true, flashSales: salesWithDiscount });
});

// POST /api/v1/flash-sale/admin/create — admin creates a flash sale
export const createFlashSale = catchAsyncErrors(async (req, res, next) => {
  const { product_id, discount_percent, start_time, end_time } = req.body;

  if (!product_id || !discount_percent || !start_time || !end_time) {
    return next(new ErrorHandler("All fields are required.", 400));
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return next(new ErrorHandler("End time must be after start time.", 400));
  }

  const product = await database.query(`SELECT id FROM products WHERE id = $1`, [product_id]);
  if (product.rows.length === 0) return next(new ErrorHandler("Product not found.", 404));

  const result = await database.query(
    `INSERT INTO flash_sales (product_id, discount_percent, start_time, end_time)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [product_id, discount_percent, start_time, end_time]
  );

  res.status(201).json({ success: true, message: "Flash sale created.", flashSale: result.rows[0] });
});

// GET /api/v1/flash-sale/admin/all — admin lists all flash sales
export const getAllFlashSales = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(
    `SELECT fs.*, p.name AS product_name, p.price, p.images
     FROM flash_sales fs
     JOIN products p ON p.id = fs.product_id
     ORDER BY fs.created_at DESC`
  );
  res.status(200).json({ success: true, flashSales: result.rows });
});

// PUT /api/v1/flash-sale/admin/:id — admin updates a flash sale
export const updateFlashSale = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { discount_percent, start_time, end_time, is_active } = req.body;

  const result = await database.query(
    `UPDATE flash_sales SET discount_percent=COALESCE($1, discount_percent),
     start_time=COALESCE($2, start_time), end_time=COALESCE($3, end_time),
     is_active=COALESCE($4, is_active)
     WHERE id=$5 RETURNING *`,
    [discount_percent, start_time, end_time, is_active, id]
  );

  if (result.rows.length === 0) return next(new ErrorHandler("Flash sale not found.", 404));
  res.status(200).json({ success: true, message: "Flash sale updated.", flashSale: result.rows[0] });
});

// DELETE /api/v1/flash-sale/admin/:id — admin deletes a flash sale
export const deleteFlashSale = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`DELETE FROM flash_sales WHERE id = $1 RETURNING *`, [req.params.id]);
  if (result.rows.length === 0) return next(new ErrorHandler("Flash sale not found.", 404));
  res.status(200).json({ success: true, message: "Flash sale deleted." });
});
