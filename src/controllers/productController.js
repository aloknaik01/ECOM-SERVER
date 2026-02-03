import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import { getAIRecommendation } from "../utils/getAIRecommendation.js";
import database from "../db/db.js";


// ADMIN ROUTES
// POST /api/v1/product/admin/create
export const createProduct = catchAsyncErrors(async (req, res, next) => {
  const { name, description, price, category, stock } = req.body;
  const created_by = req.user.id;

  if (!name || !description || !price || !category || !stock) {
    return next(
      new ErrorHandler("Please provide complete product details.", 400)
    );
  }

  let uploadedImages = [];
  if (req.files && req.files.images) {
    const images = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_Images",
        width: 1000,
        crop: "scale",
      });
      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  }

  const product = await database.query(
    `INSERT INTO products (name, description, price, category, stock, images, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [name, description, price, category, stock, JSON.stringify(uploadedImages), created_by]
  );

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    product: product.rows[0],
  });
});

// PUT /api/v1/product/admin/update/:id
export const updateProduct = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;                                        // ← fixed from productId
  const { name, description, price, category, stock } = req.body;

  if (!name || !description || !price || !category || !stock) {
    return next(
      new ErrorHandler("Please provide complete product details.", 400)
    );
  }

  const product = await database.query("SELECT * FROM products WHERE id = $1", [id]);
  if (product.rows.length === 0) {
    return next(new ErrorHandler("Product not found.", 404));
  }

  // ── handle new image uploads ──────────────────────────────────
  let images = product.rows[0].images; // keep existing images by default

  if (req.files && req.files.images) {
    // delete old images from cloudinary
    if (images && images.length > 0) {
      for (const img of images) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    // upload new images
    images = [];
    const newImages = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    for (const image of newImages) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_Images",
        width: 1000,
        crop: "scale",
      });
      images.push({ url: result.secure_url, public_id: result.public_id });
    }
  }

  const result = await database.query(
    `UPDATE products
     SET name = $1, description = $2, price = $3, category = $4, stock = $5, images = $6
     WHERE id = $7 RETURNING *`,
    [name, description, price, category, stock, JSON.stringify(images), id]
  );

  res.status(200).json({
    success: true,
    message: "Product updated successfully.",
    updatedProduct: result.rows[0],
  });
});

// DELETE /api/v1/product/admin/delete/:id
export const deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;                                        // ← fixed from productId

  const product = await database.query("SELECT * FROM products WHERE id = $1", [id]);
  if (product.rows.length === 0) {
    return next(new ErrorHandler("Product not found.", 404));
  }

  const images = product.rows[0].images;

  const deleteResult = await database.query(
    "DELETE FROM products WHERE id = $1 RETURNING *",
    [id]
  );
  if (deleteResult.rows.length === 0) {
    return next(new ErrorHandler("Failed to delete product.", 500));
  }

  // delete images from Cloudinary
  if (images && images.length > 0) {
    for (const image of images) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }

  res.status(200).json({
    success: true,
    message: "Product deleted successfully.",
  });
});

// GET /api/v1/product/admin/all
// Full product list for admin panel — includes review count, sold count, pagination & search
export const getAllProductsAdmin = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { search, category, minPrice, maxPrice, minStock, maxStock, sortBy, sortOrder } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (category) {
    conditions.push(`p.category ILIKE $${idx}`);
    values.push(`%${category}%`);
    idx++;
  }
  if (minPrice !== undefined && minPrice !== "") {
    conditions.push(`p.price >= $${idx}`);
    values.push(Number(minPrice));
    idx++;
  }
  if (maxPrice !== undefined && maxPrice !== "") {
    conditions.push(`p.price <= $${idx}`);
    values.push(Number(maxPrice));
    idx++;
  }
  if (minStock !== undefined && minStock !== "") {
    conditions.push(`p.stock >= $${idx}`);
    values.push(Number(minStock));
    idx++;
  }
  if (maxStock !== undefined && maxStock !== "") {
    conditions.push(`p.stock <= $${idx}`);
    values.push(Number(maxStock));
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // allowed sort columns (whitelist to prevent SQL injection)
  const allowedSort = ["name", "price", "stock", "created_at", "ratings", "total_sold"];
  const column = allowedSort.includes(sortBy) ? sortBy : "created_at";
  const direction = sortOrder === "asc" ? "ASC" : "DESC";

  // total count
  const countResult = await database.query(
    `SELECT COUNT(*) FROM products p ${whereClause}`,
    values
  );
  const totalProducts = parseInt(countResult.rows[0].count);

  // main query – join reviews for count, subquery for sold units
  const query = `
    SELECT
      p.*,
      COUNT(DISTINCT r.id)                          AS review_count,
      COALESCE(sold.total_sold, 0)                  AS total_sold,
      u.name                                        AS created_by_name
    FROM products p
    LEFT JOIN reviews r        ON p.id = r.product_id
    LEFT JOIN users u          ON p.created_by = u.id
    LEFT JOIN (
      SELECT oi.product_id, SUM(oi.quantity) AS total_sold
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.paid_at IS NOT NULL
      GROUP BY oi.product_id
    ) sold ON sold.product_id = p.id
    ${whereClause}
    GROUP BY p.id, sold.total_sold, u.name
    ORDER BY ${column === "total_sold" ? "sold.total_sold" : "p." + column} ${direction}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  values.push(limit, offset);

  const result = await database.query(query, values);

  res.status(200).json({
    success: true,
    totalProducts,
    currentPage: page,
    totalPages: Math.ceil(totalProducts / limit),
    limit,
    products: result.rows,
  });
});

// GET /api/v1/product/admin/statistics
// Aggregate numbers for the admin dashboard
export const getProductStatistics = catchAsyncErrors(async (req, res, next) => {
  // total products
  const totalProductsRes = await database.query("SELECT COUNT(*) FROM products");
  const totalProducts = parseInt(totalProductsRes.rows[0].count);

  // total inventory (sum of all stock)
  const inventoryRes = await database.query("SELECT COALESCE(SUM(stock), 0) AS total FROM products");
  const totalInventory = parseInt(inventoryRes.rows[0].total);

  // out-of-stock count
  const outOfStockRes = await database.query("SELECT COUNT(*) FROM products WHERE stock = 0");
  const outOfStock = parseInt(outOfStockRes.rows[0].count);

  // low-stock count (1-5)
  const lowStockRes = await database.query("SELECT COUNT(*) FROM products WHERE stock BETWEEN 1 AND 5");
  const lowStock = parseInt(lowStockRes.rows[0].count);

  // products by category
  const categoriesRes = await database.query(`
    SELECT category, COUNT(*) AS count
    FROM products
    GROUP BY category
    ORDER BY count DESC
  `);

  // top 5 sold products (only paid orders)
  const topSoldRes = await database.query(`
    SELECT
      p.id,
      p.name,
      p.price,
      p.images,
      p.category,
      SUM(oi.quantity)  AS total_sold,
      SUM(oi.quantity * oi.price) AS revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders   o ON o.id = oi.order_id
    WHERE o.paid_at IS NOT NULL
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 5
  `);

  // average product rating
  const avgRatingRes = await database.query(`
    SELECT COALESCE(AVG(ratings), 0) AS avg_rating FROM products
  `);
  const avgRating = parseFloat(avgRatingRes.rows[0].avg_rating).toFixed(2);

  // total revenue from all paid orders
  const revenueRes = await database.query(`
    SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE paid_at IS NOT NULL
  `);
  const totalRevenue = parseFloat(revenueRes.rows[0].total);

  // total reviews across all products
  const reviewsRes = await database.query("SELECT COUNT(*) FROM reviews");
  const totalReviews = parseInt(reviewsRes.rows[0].count);

  res.status(200).json({
    success: true,
    statistics: {
      totalProducts,
      totalInventory,
      outOfStock,
      lowStock,
      avgRating,
      totalRevenue,
      totalReviews,
      productsByCategory: categoriesRes.rows,   // [{ category, count }]
      topSoldProducts: topSoldRes.rows,       // [{ id, name, price, images, category, total_sold, revenue }]
    },
  });
});


// PUBLIC ROUTES

// GET /api/v1/product/all
// Full filterable, sortable, paginated product listing
export const getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;

  const { category, minPrice, maxPrice, ratings, availability, sortBy, sortOrder } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (category) {
    conditions.push(`p.category ILIKE $${idx}`);
    values.push(`%${category}%`);
    idx++;
  }
  if (minPrice !== undefined && minPrice !== "") {
    conditions.push(`p.price >= $${idx}`);
    values.push(Number(minPrice));
    idx++;
  }
  if (maxPrice !== undefined && maxPrice !== "") {
    conditions.push(`p.price <= $${idx}`);
    values.push(Number(maxPrice));
    idx++;
  }
  if (ratings) {
    conditions.push(`p.ratings >= $${idx}`);
    values.push(Number(ratings));
    idx++;
  }
  // availability filter
  if (availability === "in-stock") {
    conditions.push(`p.stock > 5`);
  } else if (availability === "limited") {
    conditions.push(`p.stock BETWEEN 1 AND 5`);
  } else if (availability === "out-of-stock") {
    conditions.push(`p.stock = 0`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // sort
  const allowedSort = ["price", "ratings", "created_at", "name"];
  const column = allowedSort.includes(sortBy) ? sortBy : "created_at";
  const direction = sortOrder === "asc" ? "ASC" : "DESC";

  // total
  const countRes = await database.query(`SELECT COUNT(*) FROM products p ${whereClause}`, values);
  const totalProducts = parseInt(countRes.rows[0].count);

  // products with review count
  const query = `
    SELECT p.*, COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.${column} ${direction}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  values.push(limit, offset);

  const result = await database.query(query, values);

  res.status(200).json({
    success: true,
    products: result.rows,
    totalProducts,
    currentPage: page,
    totalPages: Math.ceil(totalProducts / limit),
  });
});

// GET /api/v1/product/search?q=keyword
export const searchProducts = catchAsyncErrors(async (req, res, next) => {
  const { q } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;

  if (!q || !q.trim()) {
    return next(new ErrorHandler("Please provide a search keyword.", 400));
  }

  const pattern = `%${q.trim()}%`;

  const countRes = await database.query(
    `SELECT COUNT(*) FROM products
     WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1`,
    [pattern]
  );
  const totalProducts = parseInt(countRes.rows[0].count);

  const result = await database.query(
    `SELECT p.*, COUNT(r.id) AS review_count
     FROM products p
     LEFT JOIN reviews r ON p.id = r.product_id
     WHERE p.name ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [pattern, limit, offset]
  );

  res.status(200).json({
    success: true,
    products: result.rows,
    totalProducts,
    currentPage: page,
    totalPages: Math.ceil(totalProducts / limit),
    keyword: q.trim(),
  });
});

// GET /api/v1/product/categories
export const getAllCategories = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`
    SELECT
      category,
      COUNT(*)                                          AS product_count,
      COALESCE(AVG(ratings), 0)                         AS avg_rating,
      MIN(price)                                        AS min_price,
      MAX(price)                                        AS max_price
    FROM products
    GROUP BY category
    ORDER BY product_count DESC
  `);

  res.status(200).json({
    success: true,
    categories: result.rows,
  });
});

// GET /api/v1/product/featured   (top-rated, stock > 0, limit 8)
export const getFeaturedProducts = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`
    SELECT p.*, COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.stock > 0 AND p.ratings >= 4.0
    GROUP BY p.id
    ORDER BY p.ratings DESC, p.created_at DESC
    LIMIT 8
  `);

  res.status(200).json({
    success: true,
    featuredProducts: result.rows,
  });
});

// GET /api/v1/product/new-arrivals   (last 30 days, limit 8)
export const getNewArrivals = catchAsyncErrors(async (req, res, next) => {
  const result = await database.query(`
    SELECT p.*, COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 8
  `);

  res.status(200).json({
    success: true,
    newArrivals: result.rows,
  });
});

// GET /api/v1/product/category/:category
export const getProductsByCategory = catchAsyncErrors(async (req, res, next) => {
  const { category } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;

  const countRes = await database.query(
    "SELECT COUNT(*) FROM products WHERE category ILIKE $1",
    [`%${category}%`]
  );
  const totalProducts = parseInt(countRes.rows[0].count);

  if (totalProducts === 0) {
    return res.status(200).json({
      success: true,
      products: [],
      totalProducts: 0,
      currentPage: page,
      totalPages: 0,
      category,
    });
  }

  const result = await database.query(
    `SELECT p.*, COUNT(r.id) AS review_count
     FROM products p
     LEFT JOIN reviews r ON p.id = r.product_id
     WHERE p.category ILIKE $1
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${category}%`, limit, offset]
  );

  res.status(200).json({
    success: true,
    products: result.rows,
    totalProducts,
    currentPage: page,
    totalPages: Math.ceil(totalProducts / limit),
    category,
  });
});

// GET /api/v1/product/:id
export const getProductById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const result = await database.query(
    `SELECT p.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'review_id', r.id,
                  'rating',    r.rating,
                  'comment',   r.comment,
                  'created_at', r.created_at,
                  'reviewer',  json_build_object(
                                 'id',     u.id,
                                 'name',   u.name,
                                 'avatar', u.avatar
                               )
                )
              ) FILTER (WHERE r.id IS NOT NULL),
              '[]'
            ) AS reviews
     FROM products p
     LEFT JOIN reviews r ON p.id = r.product_id
     LEFT JOIN users   u ON r.user_id = u.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Product not found.", 404));
  }

  res.status(200).json({
    success: true,
    product: result.rows[0],
  });
});

// GET /api/v1/product/:id/related
// Same category, exclude current product, limit 8
export const getRelatedProducts = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // fetch the category of the requested product
  const productRes = await database.query(
    "SELECT category FROM products WHERE id = $1",
    [id]
  );

  if (productRes.rows.length === 0) {
    return next(new ErrorHandler("Product not found.", 404));
  }

  const { category } = productRes.rows[0];

  const result = await database.query(
    `SELECT p.*, COUNT(r.id) AS review_count
     FROM products p
     LEFT JOIN reviews r ON p.id = r.product_id
     WHERE p.category = $1 AND p.id <> $2
     GROUP BY p.id
     ORDER BY p.ratings DESC
     LIMIT 8`,
    [category, id]
  );

  res.status(200).json({
    success: true,
    relatedProducts: result.rows,
  });
});


// REVIEWS  (kept from original — routes will be added back)

// PUT /api/v1/product/review/post/:productId
export const postProductReview = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return next(new ErrorHandler("Please provide rating and comment.", 400));
  }

  // only allow reviews from verified purchasers
  const purchaseCheck = await database.query(
    `SELECT oi.product_id
     FROM order_items oi
     JOIN orders   o ON o.id  = oi.order_id
     JOIN payments p ON p.order_id = o.id
     WHERE o.buyer_id = $1
       AND oi.product_id = $2
       AND p.payment_status = 'Paid'
     LIMIT 1`,
    [req.user.id, productId]
  );

  if (purchaseCheck.rows.length === 0) {
    return res.status(403).json({
      success: false,
      message: "You can only review a product you've purchased.",
    });
  }

  const product = await database.query("SELECT * FROM products WHERE id = $1", [productId]);
  if (product.rows.length === 0) {
    return next(new ErrorHandler("Product not found.", 404));
  }

  // upsert review
  const existing = await database.query(
    "SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2",
    [productId, req.user.id]
  );

  let review;
  if (existing.rows.length > 0) {
    review = await database.query(
      "UPDATE reviews SET rating = $1, comment = $2 WHERE product_id = $3 AND user_id = $4 RETURNING *",
      [rating, comment, productId, req.user.id]
    );
  } else {
    review = await database.query(
      "INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
      [productId, req.user.id, rating, comment]
    );
  }

  // recalculate average rating on the product
  const avgRes = await database.query(
    "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = $1",
    [productId]
  );
  const updatedProduct = await database.query(
    "UPDATE products SET ratings = $1 WHERE id = $2 RETURNING *",
    [avgRes.rows[0].avg_rating, productId]
  );

  res.status(200).json({
    success: true,
    message: "Review posted.",
    review: review.rows[0],
    product: updatedProduct.rows[0],
  });
});

// DELETE /api/v1/product/review/delete/:productId
export const deleteReview = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  const review = await database.query(
    "DELETE FROM reviews WHERE product_id = $1 AND user_id = $2 RETURNING *",
    [productId, req.user.id]
  );

  if (review.rows.length === 0) {
    return next(new ErrorHandler("Review not found.", 404));
  }

  // recalculate average
  const avgRes = await database.query(
    "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = $1",
    [productId]
  );
  const updatedProduct = await database.query(
    "UPDATE products SET ratings = $1 WHERE id = $2 RETURNING *",
    [avgRes.rows[0].avg_rating, productId]
  );

  res.status(200).json({
    success: true,
    message: "Your review has been deleted.",
    review: review.rows[0],
    product: updatedProduct.rows[0],
  });
});


// AI SEARCH  (kept from original)

// POST /api/v1/product/ai-search
export const fetchAIFilteredProducts = catchAsyncErrors(async (req, res, next) => {
  const { userPrompt } = req.body;
  if (!userPrompt) {
    return next(new ErrorHandler("Provide a valid prompt.", 400));
  }

  const filterKeywords = (query) => {
    const stopWords = new Set([
      "the", "they", "them", "then", "I", "we", "you", "he", "she", "it", "is", "a", "an",
      "of", "and", "or", "to", "for", "from", "on", "who", "whom", "why", "when", "which",
      "with", "this", "that", "in", "at", "by", "be", "not", "was", "were", "has", "have",
      "had", "do", "does", "did", "so", "some", "any", "how", "can", "could", "should",
      "would", "there", "here", "just", "than", "because", "but", "its", "it's", "if",
    ]);
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => !stopWords.has(word))
      .map((word) => `%${word}%`);
  };

  const keywords = filterKeywords(userPrompt);

  // step 1 – broad SQL filter
  const result = await database.query(
    `SELECT * FROM products
     WHERE name        ILIKE ANY($1)
        OR description ILIKE ANY($1)
        OR category    ILIKE ANY($1)
     LIMIT 200`,
    [keywords]
  );

  if (result.rows.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No products found matching your prompt.",
      products: [],
    });
  }

  // step 2 – AI refinement via Gemini
  const { success, products } = await getAIRecommendation(
    req, res, userPrompt, result.rows
  );

  res.status(200).json({
    success,
    message: "AI filtered products.",
    products,
  });
});