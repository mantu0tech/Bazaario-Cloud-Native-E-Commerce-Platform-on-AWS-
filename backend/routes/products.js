const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// MySQL returns DECIMAL columns as strings; normalize them to numbers for the frontend.
function normalizeProduct(p) {
  return { ...p, price: Number(p.price), rating: Number(p.rating) };
}

// GET /api/products?category=&search=
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term);
    }

    const [products] = await pool.query(query, params);
    res.json(products.map(normalizeProduct));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM products');
    res.json(rows.map((r) => r.category));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load categories.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json(normalizeProduct(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load product.' });
  }
});

module.exports = router;
