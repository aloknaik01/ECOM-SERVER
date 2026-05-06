import database from "../db/db.js";
import { sendEmail } from "./sendEmail.js";
import { orderConfirmationTemplate } from "./emailTemplates.js";

export async function finalizeOrderAfterPayment(orderId, isPaid = true) {
  const { rows: existingOrders } = await database.query(
    `SELECT id, paid_at, order_status FROM orders WHERE id = $1 LIMIT 1`,
    [orderId]
  );

  if (existingOrders.length === 0) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // Idempotency: if this order is already finalized (status moved past Pending), exit silently.
  if (existingOrders[0].order_status !== 'Pending') {
    return;
  }

  // Mark as Processing so we don't run this function twice
  await database.query(
    `UPDATE orders SET order_status = 'Processing' WHERE id = $1`,
    [orderId]
  );

  if (isPaid) {
    await database.query(
      `UPDATE orders SET paid_at = NOW() WHERE id = $1`,
      [orderId]
    );
  }

  const { rows: orderedItems } = await database.query(
    `SELECT id, product_id, quantity, price FROM order_items WHERE order_id = $1`,
    [orderId]
  );

  for (const item of orderedItems) {
    await database.query(
      `UPDATE products SET stock = stock - $1 WHERE id = $2`,
      [item.quantity, item.product_id]
    );

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
          vendor_id,
          orderId,
          item.id,
          item.product_id,
          item.quantity,
          sale_amount,
          commission_rate,
          commission_amount,
          vendor_earnings,
        ]
      );

      await database.query(
        `UPDATE vendors SET pending_balance = pending_balance + $1 WHERE id = $2`,
        [vendor_earnings, vendor_id]
      );
    }
  }

  const orderData = await database.query(
    `SELECT o.*, u.email, u.name
     FROM orders o
     JOIN users u ON o.buyer_id = u.id
     WHERE o.id = $1`,
    [orderId]
  );
  const shippingData = await database.query(
    `SELECT * FROM shipping_info WHERE order_id = $1`,
    [orderId]
  );
  const itemsData = await database.query(
    `SELECT * FROM order_items WHERE order_id = $1`,
    [orderId]
  );

  if (orderData.rows.length > 0) {
    const order = orderData.rows[0];
    try {
      await sendEmail({
        email: order.email,
        subject: "Order Confirmed - ShopEase",
        message: orderConfirmationTemplate({
          userName: order.name,
          orderId,
          totalPrice: order.total_price,
          items: itemsData.rows,
          shippingAddress: shippingData.rows[0],
        }),
      });
    } catch (e) {
      console.error("Failed to send confirmation email:", e.message);
    }
  }
}
