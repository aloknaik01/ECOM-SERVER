import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import database from "../db/db.js";

// ADMIN: Add Variant to Product
// POST /api/v1/variant/admin/add/:productId
export const addVariant = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { sku, size, color, material, price, stock, is_default } = req.body;

  // Check if product exists
  const productCheck = await database.query(
    "SELECT id FROM products WHERE id = $1",
    [productId]
  );

  if (productCheck.rows.length === 0) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check for duplicate size+color combination
  if (size || color) {
    const duplicateCheck = await database.query(
      `SELECT id FROM product_variants 
       WHERE product_id = $1 
       AND ($2::VARCHAR IS NULL OR size = $2) 
       AND ($3::VARCHAR IS NULL OR color = $3)`,
      [productId, size || null, color || null]
    );

    if (duplicateCheck.rows.length > 0) {
      return next(new ErrorHandler("Variant with this size/color already exists", 400));
    }
  }

  // Upload variant images if provided
  let uploadedImages = [];
  if (req.files && req.files.images) {
    const images = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Variant_Images",
        width: 1000,
        crop: "scale",
      });
      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  }

  // If this is default variant, unset other defaults
  if (is_default) {
    await database.query(
      "UPDATE product_variants SET is_default = false WHERE product_id = $1",
      [productId]
    );
  }

  const result = await database.query(
    `INSERT INTO product_variants 
     (product_id, sku, size, color, material, price, stock, images, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      productId,
      sku || null,
      size || null,
      color || null,
      material || null,
      price,
      stock,
      JSON.stringify(uploadedImages),
      is_default || false
    ]
  );

  res.status(201).json({
    success: true,
    message: "Variant added successfully",
    variant: result.rows[0]
  });
});

// ADMIN: Update Variant
// PUT /api/v1/variant/admin/update/:variantId
export const updateVariant = catchAsyncErrors(async (req, res, next) => {
  const { variantId } = req.params;
  const { size, color, material, price, stock, is_default } = req.body;

  // Check if variant exists
  const variantCheck = await database.query(
    "SELECT * FROM product_variants WHERE id = $1",
    [variantId]
  );

  if (variantCheck.rows.length === 0) {
    return next(new ErrorHandler("Variant not found", 404));
  }

  const variant = variantCheck.rows[0];

  // Handle new images
  let images = variant.images;
  if (req.files && req.files.images) {
    // Delete old images from cloudinary
    if (images && images.length > 0) {
      for (const img of images) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    // Upload new images
    images = [];
    const newImages = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    for (const image of newImages) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Variant_Images",
        width: 1000,
        crop: "scale",
      });
      images.push({ url: result.secure_url, public_id: result.public_id });
    }
  }

  // If setting as default, unset others
  if (is_default) {
    await database.query(
      "UPDATE product_variants SET is_default = false WHERE product_id = $1 AND id != $2",
      [variant.product_id, variantId]
    );
  }

  const result = await database.query(
    `UPDATE product_variants SET
     size = $1, color = $2, material = $3, price = $4, stock = $5, 
     images = $6, is_default = $7
     WHERE id = $8 RETURNING *`,
    [
      size || variant.size,
      color || variant.color,
      material || variant.material,
      price !== undefined ? price : variant.price,
      stock !== undefined ? stock : variant.stock,
      JSON.stringify(images),
      is_default !== undefined ? is_default : variant.is_default,
      variantId
    ]
  );

  res.status(200).json({
    success: true,
    message: "Variant updated successfully",
    variant: result.rows[0]
  });
});

// ADMIN: Delete Variant
// DELETE /api/v1/variant/admin/delete/:variantId
export const deleteVariant = catchAsyncErrors(async (req, res, next) => {
  const { variantId } = req.params;

  const variant = await database.query(
    "SELECT * FROM product_variants WHERE id = $1",
    [variantId]
  );

  if (variant.rows.length === 0) {
    return next(new ErrorHandler("Variant not found", 404));
  }

  // Delete images from cloudinary
  const images = variant.rows[0].images;
  if (images && images.length > 0) {
    for (const image of images) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }

  await database.query("DELETE FROM product_variants WHERE id = $1", [variantId]);

  res.status(200).json({
    success: true,
    message: "Variant deleted successfully"
  });
});

// PUBLIC: Get Product with All Variants
// GET /api/v1/variant/product/:productId
export const getProductVariants = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  // Get product details
  const product = await database.query(
    "SELECT * FROM products WHERE id = $1",
    [productId]
  );

  if (product.rows.length === 0) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Get all variants
  const variants = await database.query(
    `SELECT * FROM product_variants 
     WHERE product_id = $1 
     ORDER BY is_default DESC, created_at ASC`,
    [productId]
  );

  res.status(200).json({
    success: true,
    product: product.rows[0],
    variants: variants.rows
  });
});

// PUBLIC: Get Single Variant Details
// GET /api/v1/variant/:variantId
export const getVariantById = catchAsyncErrors(async (req, res, next) => {
  const { variantId } = req.params;

  const result = await database.query(
    `SELECT v.*, p.name as product_name, p.description, p.category
     FROM product_variants v
     JOIN products p ON v.product_id = p.id
     WHERE v.id = $1`,
    [variantId]
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Variant not found", 404));
  }

  res.status(200).json({
    success: true,
    variant: result.rows[0]
  });
});

// ADMIN: Get All Variants for Admin Panel
// GET /api/v1/variant/admin/all
export const getAllVariants = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(
    `SELECT v.*, p.name as product_name, p.category
     FROM product_variants v
     JOIN products p ON v.product_id = p.id
     ORDER BY v.created_at DESC`
  );

  res.status(200).json({
    success: true,
    variants: result.rows
  });
});

// Get Available Sizes for a Product
// GET /api/v1/variant/sizes/:productId
export const getAvailableSizes = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  const result = await database.query(
    `SELECT DISTINCT size, 
     SUM(stock) as total_stock,
     MIN(price) as min_price,
     MAX(price) as max_price
     FROM product_variants
     WHERE product_id = $1 AND size IS NOT NULL
     GROUP BY size
     ORDER BY size`,
    [productId]
  );

  res.status(200).json({
    success: true,
    sizes: result.rows
  });
});

// Get Available Colors for a Product (optionally filtered by size)
// GET /api/v1/variant/colors/:productId?size=M
export const getAvailableColors = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { size } = req.query;

  let query = `
    SELECT DISTINCT color, 
    SUM(stock) as total_stock,
    MIN(price) as min_price,
    MAX(price) as max_price
    FROM product_variants
    WHERE product_id = $1 AND color IS NOT NULL
  `;
  
  const params = [productId];
  
  if (size) {
    query += ` AND size = $2`;
    params.push(size);
  }
  
  query += ` GROUP BY color ORDER BY color`;

  const result = await database.query(query, params);

  res.status(200).json({
    success: true,
    colors: result.rows
  });
});

// Get Specific Variant by Size and Color
// GET /api/v1/variant/find/:productId?size=M&color=Red
export const findVariant = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { size, color } = req.query;

  if (!size && !color) {
    return next(new ErrorHandler("Please provide size or color", 400));
  }

  let query = "SELECT * FROM product_variants WHERE product_id = $1";
  const params = [productId];
  let paramIndex = 2;

  if (size) {
    query += ` AND size = $${paramIndex}`;
    params.push(size);
    paramIndex++;
  }

  if (color) {
    query += ` AND color = $${paramIndex}`;
    params.push(color);
  }

  const result = await database.query(query, params);

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Variant not found", 404));
  }

  res.status(200).json({
    success: true,
    variant: result.rows[0]
  });
});