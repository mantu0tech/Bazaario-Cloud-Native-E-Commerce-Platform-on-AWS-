const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Connection pool to the MySQL database (config comes from .env)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bazaario',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- Schema + seed data, run once when the server boots ---
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(100),
      image VARCHAR(500),
      stock INT DEFAULT 100,
      rating DECIMAL(2,1) DEFAULT 4.5
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'PAID',
      payment_method VARCHAR(50),
      card_last4 VARCHAR(4),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    ) ENGINE=InnoDB;
  `);

  // Seed products only if the table is empty
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM products');
  if (count === 0) {
    const products = [
      ['Aurora Wireless Headphones', 'Over-ear headphones with active noise cancellation and 40h battery life.', 89.99, 'Electronics', 'https://picsum.photos/seed/headphones/600/600', 40, 4.6],
      ['Nimbus Running Shoes', 'Lightweight breathable running shoes with responsive cushioning.', 64.50, 'Footwear', 'https://picsum.photos/seed/shoes/600/600', 60, 4.3],
      ['Solstice Smart Watch', 'Track workouts, sleep, and notifications with a vibrant AMOLED display.', 129.00, 'Electronics', 'https://picsum.photos/seed/watch/600/600', 25, 4.7],
      ['Terra Ceramic Mug Set', 'Set of 4 handcrafted ceramic mugs, dishwasher and microwave safe.', 24.99, 'Home', 'https://picsum.photos/seed/mugs/600/600', 100, 4.4],
      ['Voyage Canvas Backpack', 'Water-resistant 25L backpack with padded laptop sleeve.', 54.00, 'Accessories', 'https://picsum.photos/seed/backpack/600/600', 35, 4.5],
      ['Ember Cast Iron Skillet', '12-inch pre-seasoned cast iron skillet for stovetop and oven.', 39.99, 'Home', 'https://picsum.photos/seed/skillet/600/600', 50, 4.8],
      ['Zephyr Bluetooth Speaker', 'Portable waterproof speaker with 360-degree sound.', 45.00, 'Electronics', 'https://picsum.photos/seed/speaker/600/600', 45, 4.2],
      ['Meadow Cotton Hoodie', 'Soft brushed-fleece hoodie in a relaxed unisex fit.', 34.99, 'Apparel', 'https://picsum.photos/seed/hoodie/600/600', 80, 4.4],
      ['Cascade Water Bottle', 'Insulated stainless steel bottle, keeps drinks cold 24h.', 19.99, 'Accessories', 'https://picsum.photos/seed/bottle/600/600', 120, 4.6],
      ['Lumen Desk Lamp', 'Adjustable LED desk lamp with 3 brightness modes and USB port.', 29.99, 'Home', 'https://picsum.photos/seed/lamp/600/600', 55, 4.3],
      ['Drift Sunglasses', 'Polarized UV400 sunglasses with lightweight acetate frame.', 22.50, 'Accessories', 'https://picsum.photos/seed/sunglasses/600/600', 70, 4.1],
      ['Orbit Mechanical Keyboard', 'Hot-swappable mechanical keyboard with RGB backlighting.', 79.99, 'Electronics', 'https://picsum.photos/seed/keyboard/600/600', 30, 4.7],
    ];
    await pool.query(
      'INSERT INTO products (name, description, price, category, image, stock, rating) VALUES ?',
      [products]
    );
    console.log(`Seeded ${products.length} products.`);
  }

  // Seed a demo user only if the users table is empty
  const [[{ count: userCount }]] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (userCount === 0) {
    const hashed = await bcrypt.hash('password123', 10);
    await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [
      'Demo User',
      'demo@example.com',
      hashed,
    ]);
    console.log('Seeded demo user: demo@example.com / password123');
  }
}

module.exports = { pool, initDb };
