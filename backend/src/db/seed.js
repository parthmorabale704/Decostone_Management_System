const db = require('./database');
const bcrypt = require('bcryptjs');

function seed() {
  const seedData = db.transaction(() => {
  console.log('🌱 Seeding DecoStone database...');

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (process.env.NODE_ENV === 'production') {
    if (userCount > 0) {
      const defaultCredentials = [
        ['admin', 'admin123'],
        ['manager', 'manager123'],
        ['supervisor', 'supervisor123'],
        ['supervisor1', 'supervisor123'],
        ['supervisor2', 'supervisor123']
      ];
      const existingUsers = db.prepare('SELECT username, password_hash FROM users').all();
      const hasDemoCredentials = existingUsers.some(user => {
        const credential = defaultCredentials.find(([username]) => username === user.username);
        return credential && bcrypt.compareSync(credential[1], user.password_hash);
      });
      if (hasDemoCredentials) {
        throw new Error('Default demo passwords are still active. Change or remove demo accounts before running in production.');
      }
      console.log('Production database already has users. Skipping bootstrap.');
      return;
    }

    const { BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;
    if (!BOOTSTRAP_ADMIN_USERNAME || !BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD || BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
      throw new Error('Set BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL, and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters before first production start.');
    }
    const hash = bcrypt.hashSync(BOOTSTRAP_ADMIN_PASSWORD, bcrypt.genSaltSync(12));
    db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role, can_stock_in, can_stock_out, can_adjust, is_active)
      VALUES (?, ?, ?, ?, 'admin', 1, 1, 1, 1)
    `).run(process.env.BOOTSTRAP_ADMIN_NAME || 'Administrator', BOOTSTRAP_ADMIN_USERNAME.trim().toLowerCase(), BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase(), hash);
    console.log('Production administrator account created.');
    return;
  }

  if (userCount > 0) {
    console.log('Database already contains data. Skipping seed.');
    return;
  }

  const salt = bcrypt.genSaltSync(10);

  // Demo data is represented as objects. Keys link seed records without relying
  // on generated database IDs or on the order in which records are inserted.
  const godownData = [
    { key: 'g1', name: 'Godown 1', code: 'GDN-01', location: 'North Industrial Zone, Warehouse A', description: 'Primary central distribution warehouse' },
    { key: 'g2', name: 'Godown 2', code: 'GDN-02', location: 'South Port Logistics Hub', description: 'Import and bulk material storage' },
    { key: 'g3', name: 'Godown 3', code: 'GDN-03', location: 'East City Depot, Sector 4', description: 'Retail supply and express fulfillment' },
    { key: 'g4', name: 'Godown 4', code: 'GDN-04', location: 'West Highway Complex, Bay 7', description: 'Overflow and heavy granite/marble yard' }
  ];
  const insertGodown = db.prepare('INSERT INTO godowns (name, code, location, description) VALUES (?, ?, ?, ?)');
  const godownIds = Object.fromEntries(godownData.map(godown => [
    godown.key,
    Number(insertGodown.run(godown.name, godown.code, godown.location, godown.description).lastInsertRowid)
  ]));
  const g1 = godownIds.g1;
  const g3 = godownIds.g3;

  const userData = [
    { key: 'admin', name: 'Admin Owner', username: 'admin', email: 'admin@decostone.com', mobile: '+91 9876543210', password: 'admin123', role: 'admin', permissions: { can_stock_in: 1, can_stock_out: 1, can_adjust: 1 } },
    { key: 'manager', name: 'Operations Manager', username: 'manager', email: 'manager@decostone.com', mobile: '+91 9876543211', password: 'manager123', role: 'manager', permissions: { can_stock_in: 1, can_stock_out: 1, can_adjust: 1 } },
    { key: 'supervisor', name: 'Godown Supervisor', username: 'supervisor', email: 'supervisor@decostone.com', mobile: '+91 9876543214', password: 'supervisor123', role: 'supervisor', assigned_godown_key: 'g1', permissions: { can_stock_in: 1, can_stock_out: 1, can_adjust: 0 } },
    { key: 'supervisor1', name: 'Supervisor G1', username: 'supervisor1', email: 'sup1@decostone.com', mobile: '+91 9876543212', password: 'supervisor123', role: 'supervisor', assigned_godown_key: 'g1', permissions: { can_stock_in: 1, can_stock_out: 1, can_adjust: 0 } },
    { key: 'supervisor2', name: 'Supervisor G2', username: 'supervisor2', email: 'sup2@decostone.com', mobile: '+91 9876543213', password: 'supervisor123', role: 'supervisor', assigned_godown_key: 'g2', permissions: { can_stock_in: 1, can_stock_out: 1, can_adjust: 0 } }
  ];
  const insertUser = db.prepare(`
    INSERT INTO users (name, username, email, mobile, password_hash, role, assigned_godown_id, can_stock_in, can_stock_out, can_adjust, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const userIds = Object.fromEntries(userData.map(user => {
    const passwordHash = bcrypt.hashSync(user.password, salt);
    const permissions = user.permissions;
    const result = insertUser.run(
      user.name, user.username, user.email, user.mobile, passwordHash, user.role,
      user.assigned_godown_key ? godownIds[user.assigned_godown_key] : null,
      permissions.can_stock_in, permissions.can_stock_out, permissions.can_adjust
    );
    return [user.key, Number(result.lastInsertRowid)];
  }));
  const uAdmin = userIds.admin;
  const uManager = userIds.manager;
  const uSup1 = userIds.supervisor1;

  const categoryData = [
    { key: 'tiles', name: 'Tiles', description: 'Glazed vitrified, porcelain, ceramic wall & floor tiles', image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=500&auto=format&fit=crop&q=60' },
    { key: 'marble', name: 'Marble & Granite', description: 'Imported Italian marble, premium granite slabs and quartz', image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60' },
    { key: 'bathroom', name: 'Bathroom Ware', description: 'Designer wash basins, brass faucets, rain shower systems', image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60' },
    { key: 'sinks', name: 'Kitchen Sinks', description: 'Quartz composite, handmade SS-304 single and double bowl sinks', image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&auto=format&fit=crop&q=60' }
  ];
  const insertCategory = db.prepare('INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)');
  const categoryIds = Object.fromEntries(categoryData.map(category => [
    category.key,
    Number(insertCategory.run(category.name, category.description, category.image_url).lastInsertRowid)
  ]));

  const insertMaterial = db.prepare(`
    INSERT INTO materials (sku, name, category_id, brand, description, size, color, unit, purchase_price, selling_price, min_stock_level, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStock = db.prepare(`
    INSERT INTO stock (godown_id, material_id, quantity) VALUES (?, ?, ?)
  `);

  const insertTxn = db.prepare(`
    INSERT INTO stock_transactions (transaction_id, transaction_type, godown_id, material_id, quantity, previous_stock, new_stock, user_id, reference_no, partner_name, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const materialsData = [
    {
      sku: 'TIL-001',
      name: 'Royal White Glossy Tile',
      category_key: 'tiles',
      brand: 'DecoStone Elite',
      description: 'High gloss nano-polished vitrified tile with micro-crystalline coating',
      size: '600x600 mm',
      color: 'Pure Pearl White',
      unit: 'Box',
      purchase_price: 450,
      selling_price: 680,
      min_stock_level: 40,
      image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=500&auto=format&fit=crop&q=60',
      stocks: { g1: 100, g2: 50, g3: 75, g4: 25 }
    },
    {
      sku: 'MAR-001',
      name: 'Statuario Italian Marble Slab',
      category_key: 'marble',
      brand: 'Carrara Pure',
      description: 'First choice Italian Statuario marble with dramatic grey veining',
      size: '8x4 ft (18mm)',
      color: 'White & Grey Vein',
      unit: 'Sq.Ft',
      purchase_price: 650,
      selling_price: 950,
      min_stock_level: 150,
      image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60',
      stocks: { g1: 400, g2: 300, g3: 200, g4: 150 }
    },
    {
      sku: 'GRA-001',
      name: 'Midnight Black Galaxy Granite',
      category_key: 'marble',
      brand: 'DecoStone Classic',
      description: 'Heavy duty polished black granite with subtle copper/golden specks',
      size: '10x3 ft (20mm)',
      color: 'Deep Black & Gold Flakes',
      unit: 'Sq.Ft',
      purchase_price: 180,
      selling_price: 260,
      min_stock_level: 100,
      image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&auto=format&fit=crop&q=60',
      stocks: { g1: 200, g2: 120, g3: 90, g4: 40 }
    },
    {
      sku: 'SAN-001',
      name: 'AquaWave Cascade Ceramic Basin',
      category_key: 'bathroom',
      brand: 'DecoVogue',
      description: 'Countertop tabletop oval wash basin with anti-bacterial glaze',
      size: '450x350x120 mm',
      color: 'Matte Ivory',
      unit: 'Piece',
      purchase_price: 1400,
      selling_price: 2250,
      min_stock_level: 20,
      image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60',
      stocks: { g1: 35, g2: 20, g3: 15, g4: 8 }
    },
    {
      sku: 'KSK-001',
      name: 'Nero Dual Bowl Quartz Kitchen Sink',
      category_key: 'sinks',
      brand: 'DecoStone QuartzCraft',
      description: '80% granite composite sink with scratch and heat resistance up to 280°C',
      size: '36x18x9 inch',
      color: 'Metallic Black',
      unit: 'Piece',
      purchase_price: 4200,
      selling_price: 6500,
      min_stock_level: 15,
      image_url: 'https://images.unsplash.com/photo-1585058177579-24751433eb0c?w=500&auto=format&fit=crop&q=60',
      stocks: { g1: 25, g2: 18, g3: 12, g4: 5 }
    },
    {
      sku: 'TIL-002',
      name: 'Calacatta Gold Porcelain Large Slab',
      category_key: 'tiles',
      brand: 'DecoStone Luxe',
      description: 'Continuous vein book-matched large format porcelain slab for feature walls',
      size: '1200x600 mm',
      color: 'Calacatta Gold',
      unit: 'Box',
      purchase_price: 850,
      selling_price: 1350,
      min_stock_level: 30,
      image_url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=500&auto=format&fit=crop&q=60',
      stocks: { g1: 80, g2: 40, g3: 20, g4: 10 }
    },
    {
      sku: 'SAN-003',
      name: 'Brushed Gold Tall Basin Mixer Tap',
      category_key: 'bathroom',
      brand: 'DecoBrass',
      description: 'Solid brass body with electroplated brushed gold finish & ceramic cartridge',
      size: 'Height 300 mm',
      color: 'Brushed Champagne Gold',
      unit: 'Piece',
      purchase_price: 1600,
      selling_price: 2700,
      min_stock_level: 20,
      image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=500&auto=format&fit=crop&q=60',
      stocks: { g1: 8, g2: 5, g3: 4, g4: 2 } // Low stock alert! (Total 19, individual godowns low)
    }
  ];

  const materialIds = {};

  materialsData.forEach((m, idx) => {
    const matId = insertMaterial.run(
      m.sku, m.name, categoryIds[m.category_key], m.brand, m.description,
      m.size, m.color, m.unit, m.purchase_price, m.selling_price,
      m.min_stock_level, m.image_url
    ).lastInsertRowid;
    materialIds[m.sku] = Number(matId);

    godownData.forEach((godown, gIdx) => {
      const gId = godownIds[godown.key];
      const qty = Number(m.stocks[godown.key] || 0);
      insertStock.run(gId, matId, qty);

      insertTxn.run(
        `TXN-INIT-${idx + 1}-${gIdx + 1}`,
        'OPENING_STOCK',
        gId,
        matId,
        qty,
        0,
        qty,
        uAdmin,
        'SYSTEM-INIT',
        'DecoStone Initial Setup',
        'Initial warehouse inventory setup'
      );
    });
  });

  // Insert some sample realistic transfers and transactions for dashboard demonstration
  const insertTransfer = db.prepare(`
    INSERT INTO stock_transfers (transfer_id, from_godown_id, to_godown_id, material_id, quantity, reason, status, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tileId = materialIds['TIL-001'];
  const marbleId = materialIds['MAR-001'];
  const transferQuantity = 20;
  const getStock = db.prepare('SELECT quantity FROM stock WHERE godown_id = ? AND material_id = ?');
  const updateStock = db.prepare('UPDATE stock SET quantity = ? WHERE godown_id = ? AND material_id = ?');
  const tileG1BeforeTransfer = getStock.get(g1, tileId).quantity;
  const tileG3BeforeTransfer = getStock.get(g3, tileId).quantity;
  insertTransfer.run('TRF-2026-0001', g1, g3, tileId, transferQuantity, 'Depot stock replenishment for retail order', 'COMPLETED', uManager);
  insertTxn.run('TXN-TRF-001A', 'TRANSFER_OUT', g1, tileId, transferQuantity, tileG1BeforeTransfer, tileG1BeforeTransfer - transferQuantity, uManager, 'TRF-2026-0001', null, 'Transfer to Godown 3');
  insertTxn.run('TXN-TRF-001B', 'TRANSFER_IN', g3, tileId, transferQuantity, tileG3BeforeTransfer, tileG3BeforeTransfer + transferQuantity, uManager, 'TRF-2026-0001', null, 'Transfer from Godown 1');
  updateStock.run(tileG1BeforeTransfer - transferQuantity, g1, tileId);
  updateStock.run(tileG3BeforeTransfer + transferQuantity, g3, tileId);

  // Insert sample Stock IN
  const receiptQuantity = 50;
  const marbleG1BeforeReceipt = getStock.get(g1, marbleId).quantity;
  insertTxn.run('TXN-IN-001', 'STOCK_IN', g1, marbleId, receiptQuantity, marbleG1BeforeReceipt, marbleG1BeforeReceipt + receiptQuantity, uAdmin, 'PO-2026-889', 'Carrara Mines Italy', 'New container consignment arrived');
  updateStock.run(marbleG1BeforeReceipt + receiptQuantity, g1, marbleId);

  // Insert sample Stock OUT
  const dispatchQuantity = 10;
  const tileG3BeforeDispatch = getStock.get(g3, tileId).quantity;
  insertTxn.run('TXN-OUT-001', 'STOCK_OUT', g3, tileId, dispatchQuantity, tileG3BeforeDispatch, tileG3BeforeDispatch - dispatchQuantity, uSup1, 'INV-2026-1044', 'Horizon Luxury Villas', 'Customer order dispatch');
  updateStock.run(tileG3BeforeDispatch - dispatchQuantity, g3, tileId);

  // Insert audit logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, role, action, details, ip_address, affected_table, affected_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(uAdmin, 'Admin Owner', 'admin', 'SYSTEM_INITIALIZATION', 'Initialized DecoStone system with 4 Godowns and initial inventory', '127.0.0.1', 'system', '1');
  insertAudit.run(uAdmin, 'Admin Owner', 'admin', 'USER_LOGIN', 'User admin logged in successfully', '127.0.0.1', 'users', String(uAdmin));
  insertAudit.run(uManager, 'Operations Manager', 'manager', 'TRANSFER_STOCK', 'Transferred 20 boxes TIL-001 from Godown 1 to Godown 3', '127.0.0.1', 'stock_transfers', 'TRF-2026-0001');

  // System settings
  const insertSetting = db.prepare(`
    INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)
  `);
  insertSetting.run('company_name', 'DecoStone Materials LLP', 'Official company name');
  insertSetting.run('currency_symbol', '₹', 'Display currency symbol');
  insertSetting.run('low_stock_threshold_alert', 'true', 'Send automated alerts when stock reaches minimum');

  console.log('✅ DecoStone database seeded successfully!');
  });
  seedData();
}

if (require.main === module) {
  seed();
}

module.exports = seed;
