const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

// En production sur Railway, la base est stockée sur un volume persistant (/data)
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'boutique.db');
const db = new DatabaseSync(DB_PATH);

// Fiabilité : mode WAL (écritures plus sûres) + clés étrangères actives
try {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
} catch {}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'vendeur',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      grammage TEXT,
      size TEXT,
      color TEXT,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Migrations — ajout de colonnes si elles n'existent pas encore
  try { db.exec("ALTER TABLE products ADD COLUMN price_unit REAL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE sales ADD COLUMN unit_type TEXT DEFAULT 'douzaine'"); } catch {}
  try { db.exec("ALTER TABLE sales ADD COLUMN receipt_number TEXT"); } catch {}

  // Migration one-shot : les stocks étaient saisis en DOUZAINES → conversion en UNITÉS (×12)
  // 1 douzaine = 12 t-shirts. Le flag 'stock_in_units' garantit qu'on ne convertit qu'une fois.
  const stockMigrated = db.prepare("SELECT value FROM settings WHERE key = 'stock_in_units'").get();
  if (!stockMigrated) {
    db.exec('UPDATE products SET stock = stock * 12, low_stock_threshold = low_stock_threshold * 12');
    db.prepare("INSERT INTO settings (key, value) VALUES ('stock_in_units', '1')").run();
    console.log('✅ Migration : stocks convertis de douzaines en unités (×12)');
  }

  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('✅ Compte admin créé — identifiant: admin / mot de passe: admin123');
  }
}

module.exports = { db, initDatabase };
