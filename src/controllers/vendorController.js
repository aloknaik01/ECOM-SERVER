import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import database from "../db/db.js";

// USER: Register as Vendor
// POST /api/v1/vendor/register
export const registerVendor = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { 
    store_name, 
    store_description, 
    business_email, 
    business_phone,
    business_address,
    tax_id,
    bank_account_number,
    bank_name
  } = req.body;

  if (!store_name || !business_email) {
    return next(new ErrorHandler("Store name and business email are required", 400));
  }

  // Check if user is already a vendor
  const existingVendor = await database.query(
    "SELECT id FROM vendors WHERE user_id = $1",
    [userId]
  );

  if (existingVendor.rows.length > 0) {
    return next(new ErrorHandler("You are already registered as a vendor", 400));
  }

  // Upload store logo if provided
  let storeLogo = null;
  if (req.files && req.files.store_logo) {
    const result = await cloudinary.uploader.upload(req.files.store_logo.tempFilePath, {
      folder: "Vendor_Logos",
      width: 500,
      height: 500,
      crop: "fill",
    });
    storeLogo = { url: result.secure_url, public_id: result.public_id };
  }

  // Upload verification documents
  let verificationDocs = [];
  if (req.files && req.files.verification_documents) {
    const docs = Array.isArray(req.files.verification_documents)
      ? req.files.verification_documents
      : [req.files.verification_documents];

    for (const doc of docs) {
      const result = await cloudinary.uploader.upload(doc.tempFilePath, {
        folder: "Vendor_Documents",
        resource_type: "auto",
      });
      verificationDocs.push({
        url: result.secure_url,
        public_id: result.public_id,
        name: doc.name
      });
    }
  }

  const vendor = await database.query(
    `INSERT INTO vendors 
     (user_id, store_name, store_description, store_logo, business_email, business_phone, 
      business_address, tax_id, bank_account_number, bank_name, verification_documents)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      userId,
      store_name,
      store_description || null,
      JSON.stringify(storeLogo),
      business_email,
      business_phone || null,
      business_address || null,
      tax_id || null,
      bank_account_number || null,
      bank_name || null,
      JSON.stringify(verificationDocs)
    ]
  );

  res.status(201).json({
    success: true,
    message: "Vendor registration submitted. Awaiting admin approval.",
    vendor: vendor.rows[0]
  });
});

// VENDOR: Get My Vendor Profile
// GET /api/v1/vendor/me
export const getMyVendorProfile = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  const result = await database.query(
    `SELECT v.*, u.name as user_name, u.email as user_email
     FROM vendors v
     JOIN users u ON v.user_id = u.id
     WHERE v.user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Vendor profile not found", 404));
  }

  res.status(200).json({
    success: true,
    vendor: result.rows[0]
  });
});

// VENDOR: Update Vendor Profile
// PUT /api/v1/vendor/update
export const updateVendorProfile = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const {
    store_name,
    store_description,
    business_email,
    business_phone,
    business_address,
    bank_account_number,
    bank_name
  } = req.body;

  // Get current vendor
  const vendor = await database.query(
    "SELECT * FROM vendors WHERE user_id = $1",
    [userId]
  );

  if (vendor.rows.length === 0) {
    return next(new ErrorHandler("Vendor not found", 404));
  }

  // Handle logo upload
  let storeLogo = vendor.rows[0].store_logo;
  if (req.files && req.files.store_logo) {
    // Delete old logo
    if (storeLogo && storeLogo.public_id) {
      await cloudinary.uploader.destroy(storeLogo.public_id);
    }

    const result = await cloudinary.uploader.upload(req.files.store_logo.tempFilePath, {
      folder: "Vendor_Logos",
      width: 500,
      height: 500,
      crop: "fill",
    });
    storeLogo = { url: result.secure_url, public_id: result.public_id };
  }

  const updated = await database.query(
    `UPDATE vendors SET
     store_name = $1, store_description = $2, store_logo = $3,
     business_email = $4, business_phone = $5, business_address = $6,
     bank_account_number = $7, bank_name = $8
     WHERE user_id = $9 RETURNING *`,
    [
      store_name || vendor.rows[0].store_name,
      store_description !== undefined ? store_description : vendor.rows[0].store_description,
      JSON.stringify(storeLogo),
      business_email || vendor.rows[0].business_email,
      business_phone !== undefined ? business_phone : vendor.rows[0].business_phone,
      business_address !== undefined ? business_address : vendor.rows[0].business_address,
      bank_account_number !== undefined ? bank_account_number : vendor.rows[0].bank_account_number,
      bank_name !== undefined ? bank_name : vendor.rows[0].bank_name,
      userId
    ]
  );

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    vendor: updated.rows[0]
  });
});

// VENDOR: Get My Dashboard Stats
// GET /api/v1/vendor/dashboard-stats
export const getVendorDashboardStats = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  // Get vendor ID
  const vendor = await database.query(
    "SELECT id, total_sales, pending_balance, paid_balance FROM vendors WHERE user_id = $1",
    [userId]
  );

  if (vendor.rows.length === 0) {
    return next(new ErrorHandler("Vendor not found", 404));
  }

  const vendorId = vendor.rows[0].id;

  // Total products
  const productsCount = await database.query(
    "SELECT COUNT(*) FROM products WHERE vendor_id = $1",
    [vendorId]
  );

  // Total orders (distinct orders containing vendor's products)
  const ordersCount = await database.query(
    "SELECT COUNT(DISTINCT order_id) FROM vendor_sales WHERE vendor_id = $1",
    [vendorId]
  );

  // This month sales
  const thisMonthSales = await database.query(
    `SELECT COALESCE(SUM(vendor_earnings), 0) as total
     FROM vendor_sales
     WHERE vendor_id = $1 
     AND sale_date >= date_trunc('month', CURRENT_DATE)`,
    [vendorId]
  );

  // Recent sales (last 30 days)
  const recentSales = await database.query(
    `SELECT 
      vs.*, 
      p.name as product_name,
      o.created_at as order_date
     FROM vendor_sales vs
     JOIN products p ON vs.product_id = p.id
     JOIN orders o ON vs.order_id = o.id
     WHERE vs.vendor_id = $1
     AND vs.sale_date >= CURRENT_DATE - INTERVAL '30 days'
     ORDER BY vs.sale_date DESC
     LIMIT 10`,
    [vendorId]
  );

  res.status(200).json({
    success: true,
    stats: {
      totalProducts: parseInt(productsCount.rows[0].count),
      totalOrders: parseInt(ordersCount.rows[0].count),
      totalSales: parseFloat(vendor.rows[0].total_sales) || 0,
      pendingBalance: parseFloat(vendor.rows[0].pending_balance) || 0,
      paidBalance: parseFloat(vendor.rows[0].paid_balance) || 0,
      thisMonthSales: parseFloat(thisMonthSales.rows[0].total) || 0,
      recentSales: recentSales.rows
    }
  });
});

// VENDOR: Request Payout
// POST /api/v1/vendor/request-payout
export const requestPayout = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorHandler("Invalid payout amount", 400));
  }

  // Get vendor
  const vendor = await database.query(
    "SELECT * FROM vendors WHERE user_id = $1 AND status = 'active'",
    [userId]
  );

  if (vendor.rows.length === 0) {
    return next(new ErrorHandler("Active vendor not found", 404));
  }

  const vendorData = vendor.rows[0];

  // Check if enough balance
  if (parseFloat(vendorData.pending_balance) < amount) {
    return next(new ErrorHandler("Insufficient balance", 400));
  }

  // Create payout request
  const payout = await database.query(
    `INSERT INTO vendor_payouts (vendor_id, amount)
     VALUES ($1, $2) RETURNING *`,
    [vendorData.id, amount]
  );

  // Update vendor pending balance
  await database.query(
    "UPDATE vendors SET pending_balance = pending_balance - $1 WHERE id = $2",
    [amount, vendorData.id]
  );

  res.status(201).json({
    success: true,
    message: "Payout request submitted successfully",
    payout: payout.rows[0]
  });
});

// VENDOR: Get My Payouts
// GET /api/v1/vendor/payouts
export const getMyPayouts = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  const vendor = await database.query(
    "SELECT id FROM vendors WHERE user_id = $1",
    [userId]
  );

  if (vendor.rows.length === 0) {
    return next(new ErrorHandler("Vendor not found", 404));
  }

  const payouts = await database.query(
    `SELECT * FROM vendor_payouts 
     WHERE vendor_id = $1 
     ORDER BY requested_at DESC`,
    [vendor.rows[0].id]
  );

  res.status(200).json({
    success: true,
    payouts: payouts.rows
  });
});

// ADMIN: Get All Vendors
// GET /api/v1/vendor/admin/all
export const getAllVendors = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.query;

  let query = `
    SELECT v.*, u.name as user_name, u.email as user_email
    FROM vendors v
    JOIN users u ON v.user_id = u.id
  `;

  const params = [];
  if (status) {
    query += " WHERE v.status = $1";
    params.push(status);
  }

  query += " ORDER BY v.created_at DESC";

  const result = await database.query(query, params);

  res.status(200).json({
    success: true,
    vendors: result.rows
  });
});

// ADMIN: Approve/Reject Vendor
// PUT /api/v1/vendor/admin/update-status/:vendorId
export const updateVendorStatus = catchAsyncErrors(async (req, res, next) => {
  const { vendorId } = req.params;
  const { status, commission_rate } = req.body;
  const adminId = req.user.id;

  if (!['active', 'rejected', 'suspended'].includes(status)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  const updateData = [status];
  let query = "UPDATE vendors SET status = $1";
  let paramIndex = 2;

  if (status === 'active') {
    query += `, approved_at = CURRENT_TIMESTAMP, approved_by = $${paramIndex}`;
    updateData.push(adminId);
    paramIndex++;

    if (commission_rate !== undefined) {
      query += `, commission_rate = $${paramIndex}`;
      updateData.push(commission_rate);
      paramIndex++;
    }
  }

  query += ` WHERE id = $${paramIndex} RETURNING *`;
  updateData.push(vendorId);

  const result = await database.query(query, updateData);

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Vendor not found", 404));
  }

  res.status(200).json({
    success: true,
    message: `Vendor ${status} successfully`,
    vendor: result.rows[0]
  });
});

// ADMIN: Process Payout
// PUT /api/v1/vendor/admin/process-payout/:payoutId
export const processPayout = catchAsyncErrors(async (req, res, next) => {
  const { payoutId } = req.params;
  const { status, transaction_id, notes } = req.body;
  const adminId = req.user.id;

  if (!['completed', 'failed'].includes(status)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  const payout = await database.query(
    "SELECT * FROM vendor_payouts WHERE id = $1",
    [payoutId]
  );

  if (payout.rows.length === 0) {
    return next(new ErrorHandler("Payout not found", 404));
  }

  const payoutData = payout.rows[0];

  // Update payout
  const updated = await database.query(
    `UPDATE vendor_payouts 
     SET status = $1, transaction_id = $2, notes = $3, 
         processed_at = CURRENT_TIMESTAMP, processed_by = $4
     WHERE id = $5 RETURNING *`,
    [status, transaction_id || null, notes || null, adminId, payoutId]
  );

  // If completed, update vendor paid_balance
  if (status === 'completed') {
    await database.query(
      "UPDATE vendors SET paid_balance = paid_balance + $1 WHERE id = $2",
      [payoutData.amount, payoutData.vendor_id]
    );

    // Mark associated sales as paid
    await database.query(
      `UPDATE vendor_sales 
       SET payout_status = 'paid', payout_id = $1
       WHERE vendor_id = $2 AND payout_status = 'pending'
       AND vendor_earnings <= $3`,
      [payoutId, payoutData.vendor_id, payoutData.amount]
    );
  } else if (status === 'failed') {
    // Return amount to pending balance
    await database.query(
      "UPDATE vendors SET pending_balance = pending_balance + $1 WHERE id = $2",
      [payoutData.amount, payoutData.vendor_id]
    );
  }

  res.status(200).json({
    success: true,
    message: `Payout ${status} successfully`,
    payout: updated.rows[0]
  });
});

// Get Vendor Store (Public)
// GET /api/v1/vendor/store/:vendorId
export const getVendorStore = catchAsyncErrors(async (req, res, next) => {
  const { vendorId } = req.params;

  const vendor = await database.query(
    `SELECT id, store_name, store_description, store_logo, created_at
     FROM vendors WHERE id = $1 AND status = 'active'`,
    [vendorId]
  );

  if (vendor.rows.length === 0) {
    return next(new ErrorHandler("Vendor store not found", 404));
  }

  // Get vendor products
  const products = await database.query(
    `SELECT * FROM products WHERE vendor_id = $1 AND stock > 0
     ORDER BY created_at DESC`,
    [vendorId]
  );

  res.status(200).json({
    success: true,
    vendor: vendor.rows[0],
    products: products.rows
  });
});