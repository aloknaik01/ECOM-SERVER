import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import database from "../db/db.js";

// GET /api/v1/address — get all addresses for logged-in user
export const getAddresses = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(
    `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [req.user.id]
  );
  res.status(200).json({ success: true, addresses: result.rows });
});

// POST /api/v1/address — add a new address
export const addAddress = catchAsyncErrors(async (req, res, next) => {
  const { full_name, phone, address_line1, address_line2, city, state, zip, country, is_default } = req.body;

  if (!full_name || !phone || !address_line1 || !city || !state || !zip) {
    return next(new ErrorHandler("Please provide all required address fields.", 400));
  }

  // If new address is default, unset all others
  if (is_default) {
    await database.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);
  }

  // If no addresses exist, make this default
  const count = await database.query(`SELECT COUNT(*) FROM addresses WHERE user_id = $1`, [req.user.id]);
  const makeDefault = is_default || parseInt(count.rows[0].count) === 0;

  const result = await database.query(
    `INSERT INTO addresses (user_id, full_name, phone, address_line1, address_line2, city, state, zip, country, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [req.user.id, full_name, phone, address_line1, address_line2 || null, city, state, zip, country || 'India', makeDefault]
  );

  res.status(201).json({ success: true, message: "Address added successfully.", address: result.rows[0] });
});

// PUT /api/v1/address/:id — update an address
export const updateAddress = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { full_name, phone, address_line1, address_line2, city, state, zip, country, is_default } = req.body;

  const existing = await database.query(`SELECT * FROM addresses WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
  if (existing.rows.length === 0) return next(new ErrorHandler("Address not found.", 404));

  if (is_default) {
    await database.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);
  }

  const result = await database.query(
    `UPDATE addresses SET full_name=$1, phone=$2, address_line1=$3, address_line2=$4, city=$5, state=$6, zip=$7, country=$8, is_default=$9
     WHERE id=$10 AND user_id=$11 RETURNING *`,
    [full_name, phone, address_line1, address_line2 || null, city, state, zip, country || 'India', is_default || false, id, req.user.id]
  );

  res.status(200).json({ success: true, message: "Address updated.", address: result.rows[0] });
});

// DELETE /api/v1/address/:id — delete an address
export const deleteAddress = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const result = await database.query(
    `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, req.user.id]
  );
  if (result.rows.length === 0) return next(new ErrorHandler("Address not found.", 404));

  // If deleted was default and others exist, make the newest one default
  if (result.rows[0].is_default) {
    await database.query(
      `UPDATE addresses SET is_default = TRUE WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
  }

  res.status(200).json({ success: true, message: "Address deleted." });
});

// PUT /api/v1/address/:id/default — set as default
export const setDefaultAddress = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const existing = await database.query(`SELECT * FROM addresses WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
  if (existing.rows.length === 0) return next(new ErrorHandler("Address not found.", 404));

  await database.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);
  const result = await database.query(
    `UPDATE addresses SET is_default = TRUE WHERE id = $1 RETURNING *`, [id]
  );

  res.status(200).json({ success: true, message: "Default address updated.", address: result.rows[0] });
});
