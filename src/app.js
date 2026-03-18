import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { createTables } from "./utils/createTables.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import authRouter from "./router/authRoutes.js";
import productRouter from "./router/productRoutes.js";
import adminRouter from "./router/adminRoutes.js";
import orderRouter from "./router/orderRoutes.js";
import couponRouter from "./router/couponRoutes.js";
import variantRouter from "./router/variantRoutes.js";
import vendorRouter from "./router/vendorRoutes.js";
import wishlistRouter from "./router/wishlistRoutes.js";
import addressRouter from "./router/addressRoutes.js";
import returnRouter from "./router/returnRoutes.js";
import flashSaleRouter from "./router/flashSaleRoutes.js";
import { sendEmail } from "./utils/sendEmail.js";
import { orderConfirmationTemplate } from "./utils/emailTemplates.js";
import Stripe from "stripe";
import database from "./db/db.js";

dotenv.config();

const app = express();

// Initialize Stripe with environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key");
// console.log("Stripe Key:", process.env.STRIPE_SECRET_KEY);

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Webhook endpoint BEFORE body parsing middleware
app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message || error}`);
    }

    // Handle the event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent_client_secret = event.data.object.client_secret;

      try {
        // Update payment status
        const updatedPaymentStatus = "Paid";
        const paymentTableUpdateResult = await database.query(
          `UPDATE payments SET payment_status = $1 WHERE payment_intent_id = $2 RETURNING *`,
          [updatedPaymentStatus, paymentIntent_client_secret]
        );

        if (paymentTableUpdateResult.rows.length === 0) {
          console.error("Payment not found for client_secret:", paymentIntent_client_secret);
          return res.status(404).send("Payment not found");
        }

        // Update order paid_at timestamp
        await database.query(
          `UPDATE orders SET paid_at = NOW() WHERE id = $1 RETURNING *`,
          [paymentTableUpdateResult.rows[0].order_id]
        );

        // Reduce stock for each product
        const orderId = paymentTableUpdateResult.rows[0].order_id;
        const { rows: orderedItems } = await database.query(
          `SELECT id, product_id, quantity, price FROM order_items WHERE order_id = $1`,
          [orderId]
        );

        // Update stock and process vendor sales for each item
        for (const item of orderedItems) {
          await database.query(
            `UPDATE products SET stock = stock - $1 WHERE id = $2`,
            [item.quantity, item.product_id]
          );

          // Check if item belongs to a vendor
          const { rows: prodWithVendor } = await database.query(
            `SELECT p.vendor_id, v.commission_rate
             FROM products p
             LEFT JOIN vendors v ON p.vendor_id = v.id
             WHERE p.id = $1`,
            [item.product_id]
          );

          if (prodWithVendor.length > 0 && prodWithVendor[0].vendor_id) {
            const vendor_id = prodWithVendor[0].vendor_id;
            const commission_rate = prodWithVendor[0].commission_rate || 0;
            const sale_amount = item.price * item.quantity;
            const commission_amount = (sale_amount * commission_rate) / 100;
            const vendor_earnings = sale_amount - commission_amount;

            await database.query(
              `INSERT INTO vendor_sales 
                (vendor_id, order_id, order_item_id, product_id, quantity, sale_amount, commission_rate, commission_amount, vendor_earnings)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                vendor_id, orderId, item.id, item.product_id, item.quantity,
                sale_amount, commission_rate, commission_amount, vendor_earnings
              ]
            );

            // Update vendor pending balance
            await database.query(
              `UPDATE vendors SET pending_balance = pending_balance + $1 WHERE id = $2`,
              [vendor_earnings, vendor_id]
            );
          }
        }

        // Send Confirmation Email
        const orderData = await database.query(
          `SELECT o.*, u.email, u.name 
           FROM orders o 
           JOIN users u ON o.buyer_id = u.id 
           WHERE o.id = $1`,
          [orderId]
        );
        const shippingData = await database.query(`SELECT * FROM shipping_info WHERE order_id = $1`, [orderId]);
        const itemsData = await database.query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);

        if (orderData.rows.length > 0) {
          const order = orderData.rows[0];
          try {
            await sendEmail({
              email: order.email,
              subject: "Order Confirmed - ShopEase",
              message: orderConfirmationTemplate({
                userName: order.name,
                orderId: orderId,
                totalPrice: order.total_price,
                items: itemsData.rows,
                shippingAddress: shippingData.rows[0]
              })
            });
          } catch (e) {
            console.error("Failed to send confirmation email:", e.message);
          }
        }

        console.log("Payment successful, order updated:", orderId);
      } catch (error) {
        console.error("Error processing webhook:", error);
        return res.status(500).send("Error updating order");
      }
    }

    res.status(200).send({ received: true });
  }
);

// Regular middleware (AFTER webhook)
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    tempFileDir: "./uploads",
    useTempFiles: true,
  })
);

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/coupon", couponRouter);
app.use("/api/v1/variant", variantRouter);
app.use("/api/v1/vendor", vendorRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/address", addressRouter);
app.use("/api/v1/return", returnRouter);
app.use("/api/v1/flash-sale", flashSaleRouter);

// Create database tables
createTables();

// Error handling middleware
app.use(errorMiddleware);

export default app;