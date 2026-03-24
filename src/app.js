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
import Stripe from "stripe";
import database from "./db/db.js";
import { finalizeOrderAfterPayment } from "./utils/paymentProcessing.js";

dotenv.config();

const app = express();

// Initialize Stripe with environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key");
// console.log("Stripe Key:", process.env.STRIPE_SECRET_KEY);

async function initDatabase({ retries = 5 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await createTables();
      console.log("Database tables ensured.");
      return;
    } catch (err) {
      lastErr = err;
      const waitMs = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      console.error(
        `Database initialization failed (attempt ${attempt}/${retries}). Retrying in ${waitMs}ms.`,
        err?.message || err
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  console.error(
    "Database initialization failed after all retries. Server will continue running, but DB-backed endpoints will fail until connectivity is restored.",
    lastErr?.message || lastErr
  );
}

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
      const paymentIntentId = event.data.object.id;

      try {
        // Update payment status
        const updatedPaymentStatus = "Paid";
        const paymentTableUpdateResult = await database.query(
          `UPDATE payments SET payment_status = $1 WHERE payment_intent_id = $2 RETURNING *`,
          [updatedPaymentStatus, paymentIntentId]
        );

        if (paymentTableUpdateResult.rows.length === 0) {
          console.error("Payment not found for payment intent:", paymentIntentId);
          return res.status(404).send("Payment not found");
        }

        const orderId = paymentTableUpdateResult.rows[0].order_id;
        await finalizeOrderAfterPayment(orderId);

        console.log("Payment successful, order updated:", orderId);
      } catch (error) {
        console.error("Error processing webhook:", error);
        return res.status(500).send("Error updating order");
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntentId = event.data.object.id;
      try {
        await database.query(
          `UPDATE payments SET payment_status = 'Failed' WHERE payment_intent_id = $1`,
          [paymentIntentId]
        );
      } catch (error) {
        console.error("Failed to mark payment failed:", error);
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
void initDatabase();

// Error handling middleware
app.use(errorMiddleware);

export default app;