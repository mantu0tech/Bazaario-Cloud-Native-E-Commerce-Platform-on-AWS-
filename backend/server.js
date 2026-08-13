require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', mode: 'TEST (mock payments, no real charges)' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.' }));

async function start() {
  try {
    await initDb(); // creates tables + seeds demo data in MySQL on first run
    app.listen(PORT, () => {
      console.log(`\n🛒 Ecommerce API running at http://localhost:${PORT}`);
      console.log(`   Health check:      http://localhost:${PORT}/api/health`);
      console.log(`   Demo login:        demo@example.com / password123`);
      console.log(`   Payment mode:      TEST ONLY - no real transactions are ever made\n`);
    });
  } catch (err) {
    console.error('Failed to start server. Is MySQL running and reachable with the credentials in .env?');
    console.error(err.message);
    process.exit(1);
  }
}

start();
