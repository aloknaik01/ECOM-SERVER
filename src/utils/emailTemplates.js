// ── Shared HTML wrapper ──────────────────────────────────────────────────────
const wrap = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; color: #374151; }
    .body h2 { color: #111827; font-size: 20px; margin-top: 0; }
    .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; }
    .info-value { color: #111827; font-weight: 600; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; }
    .status-processing { background: #fef3c7; color: #92400e; }
    .status-shipped { background: #dbeafe; color: #1e40af; }
    .status-delivered { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-refunded { background: #ede9fe; color: #5b21b6; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 40px; text-align: center; color: #9ca3af; font-size: 13px; }
    .flash-banner { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; text-align: center; padding: 24px; border-radius: 8px; margin: 20px 0; }
    .flash-banner .discount { font-size: 48px; font-weight: 800; }
    .flash-banner .ends { font-size: 14px; opacity: 0.9; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🛍️ ShopEase</h1>
      <p>${title}</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ShopEase. All rights reserved.</p>
      <p>You received this email because you have an account with us.</p>
    </div>
  </div>
</body>
</html>
`;

// ── Template 1: Order Confirmation ───────────────────────────────────────────
export const orderConfirmationTemplate = ({ userName, orderId, totalPrice, items, shippingAddress }) => {
  const itemRows = items.map(item => `
    <div class="info-row">
      <span class="info-label">${item.name} × ${item.quantity}</span>
      <span class="info-value">₹${Number(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');

  return wrap('Order Confirmation', `
    <h2>Thank you for your order, ${userName}! 🎉</h2>
    <p>Your order has been placed successfully and is being processed. We'll notify you when it ships.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Order ID</span>
        <span class="info-value">#${orderId.slice(0, 8).toUpperCase()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="status-badge status-processing">Processing</span></span>
      </div>
      ${itemRows}
      <div class="info-row">
        <span class="info-label"><strong>Total</strong></span>
        <span class="info-value" style="color:#6366f1"><strong>₹${Number(totalPrice).toFixed(2)}</strong></span>
      </div>
    </div>
    ${shippingAddress ? `
    <div class="info-box">
      <strong>Shipping To:</strong>
      <p style="margin:8px 0 0; color:#374151; font-size:14px; line-height:1.6">
        ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.zip}
      </p>
    </div>` : ''}
  `);
};

// ── Template 2: Order Shipped ────────────────────────────────────────────────
export const orderShippedTemplate = ({ userName, orderId, trackingInfo }) => wrap('Your Order Has Shipped!', `
  <h2>Your order is on its way, ${userName}! 🚚</h2>
  <p>Great news! Your order has been handed over to the courier and is en route to you.</p>
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Order ID</span>
      <span class="info-value">#${orderId.slice(0, 8).toUpperCase()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Status</span>
      <span class="info-value"><span class="status-badge status-shipped">Shipped</span></span>
    </div>
    ${trackingInfo ? `<div class="info-row"><span class="info-label">Tracking</span><span class="info-value">${trackingInfo}</span></div>` : ''}
  </div>
  <p style="color:#6b7280;font-size:14px">Estimated delivery: 3-5 business days</p>
`);

// ── Template 3: Order Delivered ──────────────────────────────────────────────
export const orderDeliveredTemplate = ({ userName, orderId }) => wrap('Order Delivered!', `
  <h2>Your order has been delivered! 📦</h2>
  <p>Hi ${userName}, we hope you love your purchase! Your order has been successfully delivered.</p>
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Order ID</span>
      <span class="info-value">#${orderId.slice(0, 8).toUpperCase()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Status</span>
      <span class="info-value"><span class="status-badge status-delivered">Delivered</span></span>
    </div>
  </div>
  <p>Enjoying your purchase? Please share your feedback — your review helps other shoppers!</p>
`);

// ── Template 4: Return Request Received ─────────────────────────────────────
export const returnRequestedTemplate = ({ userName, orderId, returnId, reason }) => wrap('Return Request Received', `
  <h2>Return request submitted, ${userName}</h2>
  <p>We've received your return request and our team will review it within 24-48 hours.</p>
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Return ID</span>
      <span class="info-value">#${returnId.slice(0, 8).toUpperCase()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Order ID</span>
      <span class="info-value">#${orderId.slice(0, 8).toUpperCase()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Reason</span>
      <span class="info-value">${reason}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Status</span>
      <span class="info-value"><span class="status-badge status-processing">Pending Review</span></span>
    </div>
  </div>
`);

// ── Template 5: Return Status Updated ───────────────────────────────────────
export const returnStatusTemplate = ({ userName, returnId, status, refundAmount, adminNote }) => {
  const statusClass = status === 'Approved' || status === 'Refunded' ? 'status-delivered' : 'status-cancelled';
  return wrap(`Return ${status}`, `
    <h2>Return request ${status.toLowerCase()}, ${userName}</h2>
    <p>${status === 'Approved' ? 'Your return has been approved! Your refund will be processed shortly.' :
        status === 'Refunded' ? 'Your refund has been processed successfully!' :
        'Unfortunately, your return request has been rejected.'}</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Return ID</span>
        <span class="info-value">#${returnId.slice(0, 8).toUpperCase()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="status-badge ${statusClass}">${status}</span></span>
      </div>
      ${refundAmount > 0 ? `<div class="info-row"><span class="info-label">Refund Amount</span><span class="info-value" style="color:#059669">₹${Number(refundAmount).toFixed(2)}</span></div>` : ''}
      ${adminNote ? `<div class="info-row"><span class="info-label">Note</span><span class="info-value">${adminNote}</span></div>` : ''}
    </div>
  `);
};

// ── Template 6: Flash Sale Alert ─────────────────────────────────────────────
export const flashSaleTemplate = ({ userName, productName, discountPercent, endTime }) => wrap('⚡ Flash Sale Alert!', `
  <h2>Hey ${userName}, a flash sale is live!</h2>
  <div class="flash-banner">
    <div style="font-size:18px;font-weight:600">${productName}</div>
    <div class="discount">${discountPercent}% OFF</div>
    <div class="ends">⏰ Ends: ${new Date(endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
  </div>
  <p style="text-align:center;color:#6b7280">Hurry! This deal won't last long. Limited stock available.</p>
`);
