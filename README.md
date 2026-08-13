# Bazaario — Full-Stack Ecommerce Demo

A complete, runnable ecommerce web app:

- **Frontend:** React 18 + Vite + Tailwind CSS (colorful UI, light/dark mode, register/login, product catalog, cart, checkout)
- **Backend:** Node.js + Express REST API
- **Database:** MySQL, via the `mysql2` driver (connection pool + real transactions on checkout)
- **Auth:** JWT-based register/login with hashed passwords (bcrypt)
- **Payments:** A **mock/test payment gateway** built into the backend. It validates card fields and simulates approve/decline — **no real money ever moves, no external payment provider is contacted.**

```
ecommerce-app/
├── backend/     Express API + SQLite database
└── frontend/    React + Vite + Tailwind UI
```

## 1. Prerequisites

- [Node.js](https://nodejs.org) v18 or newer (includes `npm`).
- **MySQL Server** (8.x, or MariaDB 10.x also works) installed and running locally.
  - macOS: `brew install mysql && brew services start mysql`
  - Windows: install MySQL Community Server from https://dev.mysql.com/downloads/mysql/
  - Linux (Debian/Ubuntu): `sudo apt install mysql-server && sudo systemctl start mysql`
  - Or skip installing MySQL locally and use Docker instead:
    `docker run --name bazaario-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=bazaario -p 3306:3306 -d mysql:8`

## 2. Create the database

Log into MySQL (skip if you used the Docker command above, which already creates the `bazaario` database):

```
mysql -u root -p
```
Then at the `mysql>` prompt:
```
CREATE DATABASE bazaario;
CREATE USER 'bazaario_user'@'localhost' IDENTIFIED BY 'bazaario_pass';
GRANT ALL PRIVILEGES ON bazaario.* TO 'bazaario_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

You don't need to create any tables by hand — the backend creates them automatically the first time it starts.

## 3. Set up and run the backend (API + database)

```bash
cd ecommerce-app/backend
npm install
cp .env.example .env
```

Open `.env` and set your MySQL credentials (defaults match step 2 above):
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=bazaario_user
DB_PASSWORD=bazaario_pass
DB_NAME=bazaario
```
If you used the Docker command instead, use `DB_USER=root` and `DB_PASSWORD=root`.

Then start the server:
```bash
npm start
```

What happens:
- `npm install` installs Express, mysql2, bcryptjs, jsonwebtoken, cors, dotenv.
- On first run, `db.js` connects to MySQL, **creates all tables** (`users`, `products`, `orders`, `order_items`), and **seeds 12 demo products** plus **one demo user** (`demo@example.com` / `password123`). It only seeds when those tables are empty, so restarting won't duplicate or wipe data.
- The server starts at **http://localhost:5000**. Visit `http://localhost:5000/api/health` to confirm it's running.
- If it can't reach MySQL, it logs a clear error and exits — check MySQL is running and your `.env` credentials are correct.

Leave this terminal running.

## 4. Set up and run the frontend

Open a **second terminal**:

```bash
cd ecommerce-app/frontend
npm install
npm run dev
```

- This starts the Vite dev server at **http://localhost:5173**.
- Vite is pre-configured (`vite.config.js`) to proxy any `/api/...` request to the backend on port 5000, so the two apps talk to each other automatically — no extra config needed.

Open **http://localhost:5173** in your browser.

## 5. Try it out

1. **Browse products** on the home page — filter by category or use the search bar.
2. **Register** a new account, or **log in** with the seeded demo account:
   - Email: `demo@example.com`
   - Password: `password123`
3. **Add items to your cart**, go to the cart page, and click **Checkout**.
4. On the checkout page, enter **any test card details**, for example:
   - Card number: `4242 4242 4242 4242`
   - Expiry: `12/29`
   - CVC: `123`
   - This will simulate a successful test payment (any card number is accepted for approval).
   - To test a **decline**, use a card number ending in `0002`, e.g. `4111 1111 1111 0002`.
5. After a successful "payment," view your purchase under **Orders**.
6. Toggle **dark/light mode** with the sun/moon icon in the top navigation bar.

## 6. Project structure in detail

### Backend (`backend/`)
```
backend/
├── server.js           Express app entry point (connects to MySQL, then starts listening)
├── db.js                MySQL connection pool, schema creation, and seed data
├── routes/
│   ├── auth.js           POST /api/auth/register, POST /api/auth/login
│   ├── products.js       GET  /api/products, /api/products/:id, /api/products/categories
│   └── orders.js         POST /api/orders/checkout (mock payment, real transaction), GET /api/orders
├── middleware/
│   └── auth.js           JWT verification middleware for protected routes
└── .env                  Your local MySQL connection details (create from .env.example)
```

### Frontend (`frontend/`)
```
frontend/
├── src/
│   ├── main.jsx              App entry, wraps providers (theme, auth, cart)
│   ├── App.jsx                Routes
│   ├── api.js                 fetch() wrapper for the backend API
│   ├── context/
│   │   ├── ThemeContext.jsx    Light/dark mode (persisted)
│   │   ├── AuthContext.jsx     Login/register/session state (JWT in localStorage)
│   │   └── CartContext.jsx     Shopping cart state (persisted)
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── ProductCard.jsx
│   └── pages/
│       ├── Home.jsx, ProductDetail.jsx
│       ├── Login.jsx, Register.jsx
│       ├── Cart.jsx, Checkout.jsx, Orders.jsx
```

## 7. Checking what's in the database

Everything a user registers or orders is stored permanently in MySQL (the `bazaario` database) until you delete it. A few ways to look:

**MySQL command line:**
```bash
mysql -u bazaario_user -p bazaario
```
```sql
SELECT id, name, email, created_at FROM users;
SELECT * FROM orders;
SELECT * FROM order_items;
```

**GUI options** (easier if you don't want to write SQL):
- [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) — official, free.
- [TablePlus](https://tableplus.com/) or [DBeaver](https://dbeaver.io/) — also free/lightweight, work with MySQL out of the box.
- VS Code's **"MySQL"** or **"Database Client"** extension lets you browse tables right in the editor.

Connect using the same host/port/user/password/database from your `backend/.env` file.

Note: passwords are stored as bcrypt hashes (not plain text) — that's intentional. Card numbers are never stored at all, only the last 4 digits, since this is a test payment flow.

## 8. Notes on the mock payment gateway

The "payment gateway" lives entirely in `backend/routes/orders.js` (function `mockChargeCard`). It:
- Validates the card number, expiry format, and CVC look plausible.
- Approves any card **except** one ending in `0002`, which it deliberately declines — handy for testing both success and failure flows.
- Never calls any external service, stores full card numbers, or moves real money. It only stores the **last 4 digits** of the card for the order record.

If you later want a real payment provider (e.g., Stripe test mode), you'd swap `mockChargeCard` for a call to that provider's test API — the rest of the app (cart, order creation, stock updates) stays the same.

## 9. Common issues

- **`Failed to start server... Is MySQL running?`:** make sure your MySQL server is actually running (`mysqladmin ping` should say "mysqld is alive"), and that `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` in `backend/.env` are correct.
- **`ER_ACCESS_DENIED_ERROR`:** your MySQL username/password in `.env` is wrong, or that user doesn't have privileges on the `bazaario` database — re-run the `GRANT ALL PRIVILEGES` command from step 2.
- **`ER_BAD_DB_ERROR: Unknown database 'bazaario'`:** you forgot to run `CREATE DATABASE bazaario;` — see step 2.
- **Port already in use:** change `PORT` in `backend/.env`, and update the proxy target in `frontend/vite.config.js` to match.
- **Login says "Invalid or expired session":** your JWT token expired (7 days) or `JWT_SECRET` changed — just log in again.
