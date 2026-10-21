const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDirectory = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data');
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(dataDirectory, 'decostone.db');

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS godowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    location TEXT,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'supervisor')),
    assigned_godown_id INTEGER REFERENCES godowns(id),
    can_stock_in INTEGER NOT NULL DEFAULT 1,
    can_stock_out INTEGER NOT NULL DEFAULT 1,
    can_adjust INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    brand TEXT,
    description TEXT,
    size TEXT,
    color TEXT,
    unit TEXT NOT NULL,
    purchase_price REAL NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    selling_price REAL NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    min_stock_level REAL NOT NULL DEFAULT 10 CHECK (min_stock_level >= 0),
    image_url TEXT,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS material_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    godown_id INTEGER NOT NULL REFERENCES godowns(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (godown_id, material_id)
  );

  CREATE TABLE IF NOT EXISTS stock_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id TEXT NOT NULL UNIQUE,
    from_godown_id INTEGER NOT NULL REFERENCES godowns(id),
    to_godown_id INTEGER NOT NULL REFERENCES godowns(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    godown_id INTEGER NOT NULL REFERENCES godowns(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    system_stock REAL NOT NULL,
    physical_stock REAL NOT NULL CHECK (physical_stock >= 0),
    adjustment_quantity REAL NOT NULL,
    reason TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL UNIQUE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'OPENING_STOCK')),
    godown_id INTEGER NOT NULL REFERENCES godowns(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    quantity REAL NOT NULL,
    previous_stock REAL NOT NULL,
    new_stock REAL NOT NULL CHECK (new_stock >= 0),
    user_id INTEGER NOT NULL REFERENCES users(id),
    reference_no TEXT,
    partner_name TEXT,
    reason TEXT,
    transfer_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    affected_table TEXT,
    affected_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_stock_transactions_created ON stock_transactions(created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_stock_transactions_godown ON stock_transactions(godown_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_stock_transactions_material ON stock_transactions(material_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
`);

module.exports = db;
