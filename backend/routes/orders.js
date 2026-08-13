const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// MySQL returns DECIMAL columns as strings; normalize them to numbers for the frontend.
function normalizeOrder(o) {
  return { ...o, total: Number(o.total) };
}
function normalizeItem(i) {
  return { ...i, price: Number(i.price) };
}

// --- Mock Payment Gateway (TEST MODE ONLY - no real money moves) ---
// Simulates common test-card behavior so the checkout flow can be exercised end-to-end.
function mockChargeCard({ cardNumber, expiry, cvc }) {
  const digitsOnly = (cardNumber || '').replace(/\s+/g, '');

  if (!digitsOnly || digitsOnly.length < 12) {
    return { success: false, error: 'Card number looks invalid.' };
  }
  if (!/^\d{3,4}$/.test(cvc || '')) {
    return { success: false, error: 'CVC looks invalid.' };
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry || '')) {
    return { success: false, error: 'Expiry must be in MM/YY format.' };
  }

  // Well-known test card conventions for a testing sandbox:
  // ends in 0002 -> simulate a decline; anything else -> approve.
  if (digitsOnly.endsWith('0002')) {
    return { success: false, error: 'Card was declined (test mode).' };
  }

  return { success: true, last4: digitsOnly.slice(-4) };
}

// POST /api/orders/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  const { items, payment } = req.body; // items: [{ productId, quantity }], payment: { cardNumber, expiry, cvc, method }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const connection = await pool.getConnection();
  try {
    // Validate products & compute total server-side (never trust client-sent prices)
    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const [rows] = await connection.query('SELECT * FROM products WHERE id = ?', [item.productId]);
      const product = rows[0];
      if (!product) {
        connection.release();
        return res.status(400).json({ error: `Product ${item.productId} not found.` });
      }
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      if (qty > product.stock) {
        connection.release();
        return res.status(400).json({ error: `Not enough stock for ${product.name}.` });
      }
      total += Number(product.price) * qty;
      resolvedItems.push({ product, qty });
    }
    total = Math.round(total * 100) / 100;

    const paymentResult = mockChargeCard(payment || {});
    if (!paymentResult.success) {
      connection.release();
      return res.status(402).json({ error: paymentResult.error });
    }

    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total, status, payment_method, card_last4) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, total, 'PAID', payment?.method || 'card', paymentResult.last4]
    );
    const orderId = orderResult.insertId;

    for (const { product, qty } of resolvedItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)',
        [orderId, product.id, product.name, product.price, qty]
      );
      await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, product.id]);
    }

    await connection.commit();

    const [[order]] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const [orderItems] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    res.status(201).json({
      order: normalizeOrder(order),
      items: orderItems.map(normalizeItem),
      message: 'Payment approved (test mode). Order placed.',
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: 'Checkout failed. Please try again.' });
  } finally {
    connection.release();
  }
});

// GET /api/orders (order history for the logged-in user)
router.get('/', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const withItems = await Promise.all(
      orders.map(async (o) => {
        const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
        return { ...normalizeOrder(o), items: items.map(normalizeItem) };
      })
    );
    res.json(withItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load orders.' });
  }
});

module.exports = router;
