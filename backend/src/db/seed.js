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
  const adminPassword = bcrypt.hashSync('admin123', salt);
  const managerPassword = bcrypt.hashSync('manager123', salt);
  const supervisorPassword = bcrypt.hashSync('supervisor123', salt);

  const insertGodown = db.prepare(`
    INSERT INTO godowns (name, code, location, description) VALUES (?, ?, ?, ?)
  `);

  const g1 = insertGodown.run('Godown 1', 'GDN-01', 'North Industrial Zone, Warehouse A', 'Primary central distribution warehouse').lastInsertRowid;
  const g2 = insertGodown.run('Godown 2', 'GDN-02', 'South Port Logistics Hub', 'Import and bulk material storage').lastInsertRowid;
  const g3 = insertGodown.run('Godown 3', 'GDN-03', 'East City Depot, Sector 4', 'Retail supply and express fulfillment').lastInsertRowid;
  const g4 = insertGodown.run('Godown 4', 'GDN-04', 'West Highway Complex, Bay 7', 'Overflow and heavy granite/marble yard').lastInsertRowid;

  const insertUser = db.prepare(`
    INSERT INTO users (name, username, email, mobile, password_hash, role, assigned_godown_id, can_stock_in, can_stock_out, can_adjust, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const uAdmin = insertUser.run('Admin Owner', 'admin', 'admin@decostone.com', '+91 9876543210', adminPassword, 'admin', null, 1, 1, 1, 1).lastInsertRowid;
  const uManager = insertUser.run('Operations Manager', 'manager', 'manager@decostone.com', '+91 9876543211', managerPassword, 'manager', null, 1, 1, 1, 1).lastInsertRowid;
  const uSup = insertUser.run('Godown Supervisor', 'supervisor', 'supervisor@decostone.com', '+91 9876543214', supervisorPassword, 'supervisor', g1, 1, 1, 0, 1).lastInsertRowid;
  const uSup1 = insertUser.run('Supervisor G1', 'supervisor1', 'sup1@decostone.com', '+91 9876543212', supervisorPassword, 'supervisor', g1, 1, 1, 0, 1).lastInsertRowid;
  const uSup2 = insertUser.run('Supervisor G2', 'supervisor2', 'sup2@decostone.com', '+91 9876543213', supervisorPassword, 'supervisor', g2, 1, 1, 0, 1).lastInsertRowid;

  const insertCategory = db.prepare(`
    INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)
  `);

  const catTiles = insertCategory.run('Tiles', 'Glazed vitrified, porcelain, ceramic wall & floor tiles', 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=500&auto=format&fit=crop&q=60').lastInsertRowid;
  const catMarble = insertCategory.run('Marble & Granite', 'Imported Italian marble, premium granite slabs and quartz', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60').lastInsertRowid;
  const catBath = insertCategory.run('Bathroom Ware', 'Designer wash basins, brass faucets, rain shower systems', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60').lastInsertRowid;
  const catSink = insertCategory.run('Kitchen Sinks', 'Quartz composite, handmade SS-304 single and double bowl sinks', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&auto=format&fit=crop&q=60').lastInsertRowid;
  const catSanitary = insertCategory.run('Sanitary Ware', 'Rimless wall hung commodes, concealed flush tanks, urinals', 'https://images.unsplash.com/photo-1585058177579-24751433eb0c?w=500&auto=format&fit=crop&q=60').lastInsertRowid;

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
      category_id: catTiles,
      brand: 'DecoStone Elite',
      description: 'High gloss nano-polished vitrified tile with micro-crystalline coating',
      size: '600x600 mm',
      color: 'Pure Pearl White',
      unit: 'Box',
      purchase_price: 450,
      selling_price: 680,
      min_stock_level: 40,
      image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=500&auto=format&fit=crop&q=60',
      stocks: [100, 50, 75, 25] // G1, G2, G3, G4
    },
    {
      sku: 'MAR-001',
      name: 'Statuario Italian Marble Slab',
      category_id: catMarble,
      brand: 'Carrara Pure',
      description: 'First choice Italian Statuario marble with dramatic grey veining',
      size: '8x4 ft (18mm)',
      color: 'White & Grey Vein',
      unit: 'Sq.Ft',
      purchase_price: 650,
      selling_price: 950,
      min_stock_level: 150,
      image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60',
      stocks: [400, 300, 200, 150]
    },
    {
      sku: 'GRA-001',
      name: 'Midnight Black Galaxy Granite',
      category_id: catMarble,
      brand: 'DecoStone Classic',
      description: 'Heavy duty polished black granite with subtle copper/golden specks',
      size: '10x3 ft (20mm)',
      color: 'Deep Black & Gold Flakes',
      unit: 'Sq.Ft',
      purchase_price: 180,
      selling_price: 260,
      min_stock_level: 100,
      image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&auto=format&fit=crop&q=60',
      stocks: [200, 120, 90, 40]
    },
    {
      sku: 'SAN-001',
      name: 'AquaWave Cascade Ceramic Basin',
      category_id: catBath,
      brand: 'DecoVogue',
      description: 'Countertop tabletop oval wash basin with anti-bacterial glaze',
      size: '450x350x120 mm',
      color: 'Matte Ivory',
      unit: 'Piece',
      purchase_price: 1400,
      selling_price: 2250,
      min_stock_level: 20,
      image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60',
      stocks: [35, 20, 15, 8]
    },
    {
      sku: 'KSK-001',
      name: 'Nero Dual Bowl Quartz Kitchen Sink',
      category_id: catSink,
      brand: 'DecoStone QuartzCraft',
      description: '80% granite composite sink with scratch and heat resistance up to 280°C',
      size: '36x18x9 inch',
      color: 'Metallic Black',
      unit: 'Piece',
      purchase_price: 4200,
      selling_price: 6500,
      min_stock_level: 15,
      image_url: 'https://images.unsplash.com/photo-1585058177579-24751433eb0c?w=500&auto=format&fit=crop&q=60',
      stocks: [25, 18, 12, 5]
    },
    {
      sku: 'TIL-002',
      name: 'Calacatta Gold Porcelain Large Slab',
      category_id: catTiles,
      brand: 'DecoStone Luxe',
      description: 'Continuous vein book-matched large format porcelain slab for feature walls',
      size: '1200x600 mm',
      color: 'Calacatta Gold',
      unit: 'Box',
      purchase_price: 850,
      selling_price: 1350,
      min_stock_level: 30,
      image_url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=500&auto=format&fit=crop&q=60',
      stocks: [80, 40, 20, 10]
    },
    {
      sku: 'SAN-002',
      name: 'Wall-Hung Rimless Smart Commode',
      category_id: catSanitary,
      brand: 'DecoSan Luxe',
      description: 'Tornado flush ceramic closet with soft-close UF slim seat cover',
      size: '520x360x360 mm',
      color: 'Gloss White',
      unit: 'Piece',
      purchase_price: 4800,
      selling_price: 7400,
      min_stock_level: 15,
      image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60',
      stocks: [18, 14, 6, 4]
    },
    {
      sku: 'SAN-003',
      name: 'Brushed Gold Tall Basin Mixer Tap',
      category_id: catBath,
      brand: 'DecoBrass',
      description: 'Solid brass body with electroplated brushed gold finish & ceramic cartridge',
      size: 'Height 300 mm',
      color: 'Brushed Champagne Gold',
      unit: 'Piece',
      purchase_price: 1600,
      selling_price: 2700,
      min_stock_level: 20,
      image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=500&auto=format&fit=crop&q=60',
      stocks: [8, 5, 4, 2] // Low stock alert! (Total 19, individual godowns low)
    }
  ];

  const godownIds = [g1, g2, g3, g4];

  materialsData.forEach((m, idx) => {
    const matId = insertMaterial.run(
      m.sku, m.name, m.category_id, m.brand, m.description,
      m.size, m.color, m.unit, m.purchase_price, m.selling_price,
      m.min_stock_level, m.image_url
    ).lastInsertRowid;

    godownIds.forEach((gId, gIdx) => {
      const qty = m.stocks[gIdx];
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

  insertTransfer.run('TRF-2026-0001', g1, g3, 1, 20, 'Depot stock replenishment for retail order', 'COMPLETED', uManager);
  insertTxn.run('TXN-TRF-001A', 'TRANSFER_OUT', g1, 1, 20, 100, 80, uManager, 'TRF-2026-0001', null, 'Transfer to Godown 3');
  insertTxn.run('TXN-TRF-001B', 'TRANSFER_IN', g3, 1, 20, 75, 95, uManager, 'TRF-2026-0001', null, 'Transfer from Godown 1');
  db.prepare('UPDATE stock SET quantity = 80 WHERE godown_id = ? AND material_id = ?').run(g1, 1);
  db.prepare('UPDATE stock SET quantity = 95 WHERE godown_id = ? AND material_id = ?').run(g3, 1);

  // Insert sample Stock IN
  insertTxn.run('TXN-IN-001', 'STOCK_IN', g1, 2, 50, 400, 450, uAdmin, 'PO-2026-889', 'Carrara Mines Italy', 'New container consignment arrived');
  db.prepare('UPDATE stock SET quantity = quantity + 50 WHERE godown_id = ? AND material_id = ?').run(g1, 2);

  // Insert sample Stock OUT
  insertTxn.run('TXN-OUT-001', 'STOCK_OUT', g3, 1, 10, 95, 85, uSup1, 'INV-2026-1044', 'Horizon Luxury Villas', 'Customer order dispatch');
  db.prepare('UPDATE stock SET quantity = 85 WHERE godown_id = ? AND material_id = ?').run(g3, 1);

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
