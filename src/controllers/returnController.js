import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import database from "../db/db.js";
import { sendEmail } from "../utils/sendEmail.js";
import { returnRequestedTemplate, returnStatusTemplate } from "../utils/emailTemplates.js";

// POST /api/v1/return — user creates a return request
export const createReturn = catchAsyncErrors(async (req, res, next) => {
  const { order_id, reason, description } = req.body;

  if (!order_id || !reason) {
    return next(new ErrorHandler("Order ID and reason are required.", 400));
  }

  // verify the order belongs to this user and was delivered
  const order = await database.query(
    `SELECT * FROM orders WHERE id = $1 AND buyer_id = $2`,
    [order_id, req.user.id]
  );
  if (order.rows.length === 0) return next(new ErrorHandler("Order not found.", 404));
  if (order.rows[0].order_status !== 'Delivered') {
    return next(new ErrorHandler("You can only return delivered orders.", 400));
  }

  // check no existing return for same order
  const existing = await database.query(
    `SELECT id FROM returns WHERE order_id = $1 AND user_id = $2`,
    [order_id, req.user.id]
  );
  if (existing.rows.length > 0) {
    return next(new ErrorHandler("A return request already exists for this order.", 400));
  }

  // upload return images if provided
  let images = [];
  if (req.files && req.files.images) {
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "Return_Images",
        width: 800,
        crop: "scale",
      });
      images.push({ url: result.secure_url, public_id: result.public_id });
    }
  }

  const result = await database.query(
    `INSERT INTO returns (order_id, user_id, reason, description, images)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [order_id, req.user.id, reason, description || null, JSON.stringify(images)]
  );

  // send email notification
  try {
    await sendEmail({
      email: req.user.email,
      subject: "Return Request Received - ShopEase",
      message: returnRequestedTemplate({
        userName: req.user.name,
        orderId: order_id,
        returnId: result.rows[0].id,
        reason,
      }),
    });
  } catch (e) { console.error("Return email failed:", e.message); }

  res.status(201).json({ success: true, message: "Return request submitted.", returnRequest: result.rows[0] });
});

// GET /api/v1/return/my — user gets their returns
export const getMyReturns = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(
    `SELECT r.*, o.total_price FROM returns r
     JOIN orders o ON o.id = r.order_id
     WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.status(200).json({ success: true, returns: result.rows });
});

// GET /api/v1/return/admin/all — admin gets all returns
export const getAllReturns = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.query;
  const conditions = [];
  const values = [];
  if (status) {
    conditions.push(`r.status = $1`);
    values.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await database.query(
    `SELECT r.*, u.name AS user_name, u.email AS user_email, o.total_price
     FROM returns r
     JOIN users u ON u.id = r.user_id
     JOIN orders o ON o.id = r.order_id
     ${where}
     ORDER BY r.created_at DESC`,
    values
  );
  res.status(200).json({ success: true, returns: result.rows });
});

// PUT /api/v1/return/admin/:id — admin updates return status
export const updateReturnStatus = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { status, refund_amount, admin_note } = req.body;

  const validStatuses = ['Approved', 'Rejected', 'Refunded'];
  if (!validStatuses.includes(status)) {
    return next(new ErrorHandler("Invalid status value.", 400));
  }

  const returnReq = await database.query(`SELECT * FROM returns WHERE id = $1`, [id]);
  if (returnReq.rows.length === 0) return next(new ErrorHandler("Return request not found.", 404));

  const result = await database.query(
    `UPDATE returns SET status=$1, refund_amount=$2, admin_note=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [status, refund_amount || 0, admin_note || null, id]
  );

  // get user info for email
  const user = await database.query(`SELECT * FROM users WHERE id = $1`, [returnReq.rows[0].user_id]);
  try {
    await sendEmail({
      email: user.rows[0].email,
      subject: `Return Request ${status} - ShopEase`,
      message: returnStatusTemplate({
        userName: user.rows[0].name,
        returnId: id,
        status,
        refundAmount: refund_amount || 0,
        adminNote: admin_note,
      }),
    });
  } catch (e) { console.error("Return status email failed:", e.message); }

  res.status(200).json({ success: true, message: `Return ${status.toLowerCase()}.`, returnRequest: result.rows[0] });
});
