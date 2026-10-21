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
    barcode TEXT,
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

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, contact_name TEXT,
    email TEXT, phone TEXT, address TEXT, tax_id TEXT, notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, contact_name TEXT,
    email TEXT, phone TEXT, address TEXT, tax_id TEXT, notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT NOT NULL UNIQUE,
    order_type TEXT NOT NULL CHECK (order_type IN ('PURCHASE', 'SALES')),
    party_id INTEGER NOT NULL, godown_id INTEGER NOT NULL REFERENCES godowns(id),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','RECEIVED','FULFILLED','CANCELLED')),
    notes TEXT, created_by INTEGER NOT NULL REFERENCES users(id), approved_by INTEGER REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS inventory_order_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES inventory_orders(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id), quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0), lot_code TEXT, shade_code TEXT, caliber TEXT, expiry_date TEXT
  );

  CREATE TABLE IF NOT EXISTS stock_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, material_id INTEGER NOT NULL REFERENCES materials(id),
    godown_id INTEGER NOT NULL REFERENCES godowns(id), lot_code TEXT NOT NULL,
    shade_code TEXT, caliber TEXT, expiry_date TEXT, quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(material_id, godown_id, lot_code)
  );

  CREATE TABLE IF NOT EXISTS count_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_no TEXT NOT NULL UNIQUE,
    godown_id INTEGER NOT NULL REFERENCES godowns(id), status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED')),
    created_by INTEGER NOT NULL REFERENCES users(id), reviewed_by INTEGER REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS count_session_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL REFERENCES count_sessions(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id), lot_code TEXT, expected_quantity REAL NOT NULL,
    counted_quantity REAL CHECK (counted_quantity >= 0), UNIQUE(session_id, material_id, lot_code)
  );

  CREATE TABLE IF NOT EXISTS notification_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT, dedupe_key TEXT UNIQUE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, delivered_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_stock_transactions_created ON stock_transactions(created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_stock_transactions_godown ON stock_transactions(godown_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_stock_transactions_material ON stock_transactions(material_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_inventory_orders_type_status ON inventory_orders(order_type, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_stock_lots_material ON stock_lots(material_id, godown_id, lot_code);
`);

db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

function ensureColumn(table, column, definition) {
  const columns = new Set(db.pragma(`table_info(${table})`).map(item => item.name));
  if (!columns.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Additive migrations remain safe for databases created by earlier app versions.
ensureColumn('materials', 'barcode', 'TEXT');
ensureColumn('inventory_order_lines', 'shade_code', 'TEXT');
ensureColumn('inventory_order_lines', 'caliber', 'TEXT');
ensureColumn('notification_outbox', 'dedupe_key', 'TEXT');
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_barcode ON materials(barcode) WHERE barcode IS NOT NULL AND barcode <> ''");
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_dedupe ON notification_outbox(dedupe_key) WHERE dedupe_key IS NOT NULL');
db.prepare('INSERT OR IGNORE INTO schema_migrations(version,name) VALUES(1,?)').run('operations-and-barcode-foundation');
db.prepare('INSERT OR IGNORE INTO schema_migrations(version,name) VALUES(2,?)').run('barcode-lot-alert-additions');

module.exports = db;
