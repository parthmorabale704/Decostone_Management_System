const db = require('../db/database');
const { logAudit } = require('./auditService');

function generateTransactionId(prefix = 'TXN') {
  const year = new Date().getFullYear();
  const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${year}-${randomHex}`;
}

function generateTransferId() {
  const year = new Date().getFullYear();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM stock_transfers
    WHERE strftime('%Y', created_at) = ?
  `).get(String(year));
  const count = (row ? row.count : 0) + 1;
  const seq = String(count).padStart(4, '0');
  return `TRF-${year}-${seq}`;
}

// Ensure stock row exists for godown + material
function ensureStockRecord(godownId, materialId) {
  const existing = db.prepare('SELECT * FROM stock WHERE godown_id = ? AND material_id = ?').get(godownId, materialId);
  if (!existing) {
    db.prepare('INSERT INTO stock (godown_id, material_id, quantity) VALUES (?, ?, 0)').run(godownId, materialId);
    return { godown_id: godownId, material_id: materialId, quantity: 0 };
  }
  return existing;
}

// Keep tracked batches in sync when they exist; legacy/opening stock remains unallocated.
function consumeTrackedLots(godownId, materialId, quantity, destinationGodownId = null) {
  let remaining = Number(quantity);
  const lots = db.prepare(`SELECT * FROM stock_lots WHERE godown_id=? AND material_id=? AND quantity>0
    ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date ASC, created_at ASC, id ASC`).all(godownId, materialId);
  for (const lot of lots) {
    if (remaining <= 0) break;
    const moved = Math.min(remaining, Number(lot.quantity));
    db.prepare('UPDATE stock_lots SET quantity=quantity-? WHERE id=?').run(moved, lot.id);
    if (destinationGodownId) {
      db.prepare(`INSERT INTO stock_lots(material_id,godown_id,lot_code,shade_code,caliber,expiry_date,quantity)
        VALUES(?,?,?,?,?,?,?) ON CONFLICT(material_id,godown_id,lot_code) DO UPDATE SET quantity=stock_lots.quantity+excluded.quantity,
        shade_code=COALESCE(excluded.shade_code,stock_lots.shade_code),caliber=COALESCE(excluded.caliber,stock_lots.caliber),
        expiry_date=COALESCE(excluded.expiry_date,stock_lots.expiry_date)`)
        .run(materialId,destinationGodownId,lot.lot_code,lot.shade_code,lot.caliber,lot.expiry_date,moved);
    }
    remaining -= moved;
  }
}

// 1. Stock IN
function stockIn({ godownId, materialId, quantity, supplier, referenceNo, remarks, user, req }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive number greater than 0.');
  }

  const transaction = db.transaction(() => {
    // Check material and godown
    const material = db.prepare('SELECT id, name, sku FROM materials WHERE id = ? AND is_deleted = 0').get(materialId);
    if (!material) throw new Error('Material not found or is inactive.');

    const godown = db.prepare('SELECT id, name FROM godowns WHERE id = ? AND is_active = 1').get(godownId);
    if (!godown) throw new Error('Godown not found or is inactive.');

    const currentStockRow = ensureStockRecord(godownId, materialId);
    const prevStock = Number(currentStockRow.quantity);
    const newStock = prevStock + qty;
    if (!Number.isFinite(newStock)) throw new Error('Stock quantity is outside the supported range.');

    db.prepare('UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE godown_id = ? AND material_id = ?')
      .run(newStock, godownId, materialId);

    const txnId = generateTransactionId('TXN-IN');
    db.prepare(`
      INSERT INTO stock_transactions
      (transaction_id, transaction_type, godown_id, material_id, quantity, previous_stock, new_stock, user_id, reference_no, partner_name, reason)
      VALUES (?, 'STOCK_IN', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txnId, godownId, materialId, qty, prevStock, newStock, user.id, referenceNo || null, supplier || null, remarks || 'Stock Received');

    if (req) {
      logAudit(req, 'STOCK_IN', `Stock IN: ${qty} units of ${material.name} (${material.sku}) received into ${godown.name}. Ref: ${referenceNo || 'N/A'}`, 'stock', `${godownId}-${materialId}`);
    }

    return {
      success: true,
      transactionId: txnId,
      transactionType: 'STOCK_IN',
      materialId: Number(materialId),
      godownId: Number(godownId),
      material: material.name,
      godown: godown.name,
      quantityAdded: qty,
      previousStock: prevStock,
      newStock: newStock,
      createdAt: new Date().toISOString()
    };
  });

  return transaction();
}

// 2. Stock OUT
function stockOut({ godownId, materialId, quantity, customer, referenceNo, remarks, user, req }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive number greater than 0.');
  }

  const transaction = db.transaction(() => {
    const material = db.prepare('SELECT id, name, sku FROM materials WHERE id = ? AND is_deleted = 0').get(materialId);
    if (!material) throw new Error('Material not found or is inactive.');

    const godown = db.prepare('SELECT id, name FROM godowns WHERE id = ? AND is_active = 1').get(godownId);
    if (!godown) throw new Error('Godown not found or is inactive.');

    const currentStockRow = ensureStockRecord(godownId, materialId);
    const prevStock = Number(currentStockRow.quantity);

    if (prevStock < qty) {
      throw new Error(`Insufficient stock available. Current stock in ${godown.name} is ${prevStock}, requested ${qty}.`);
    }

    const newStock = prevStock - qty;

    db.prepare('UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE godown_id = ? AND material_id = ?')
      .run(newStock, godownId, materialId);
    consumeTrackedLots(godownId, materialId, qty);

    const txnId = generateTransactionId('TXN-OUT');
    db.prepare(`
      INSERT INTO stock_transactions
      (transaction_id, transaction_type, godown_id, material_id, quantity, previous_stock, new_stock, user_id, reference_no, partner_name, reason)
      VALUES (?, 'STOCK_OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txnId, godownId, materialId, qty, prevStock, newStock, user.id, referenceNo || null, customer || null, remarks || 'Stock Dispatched');

    if (req) {
      logAudit(req, 'STOCK_OUT', `Stock OUT: ${qty} units of ${material.name} (${material.sku}) dispatched from ${godown.name}. Ref: ${referenceNo || 'N/A'}`, 'stock', `${godownId}-${materialId}`);
    }

    return {
      success: true,
      transactionId: txnId,
      transactionType: 'STOCK_OUT',
      materialId: Number(materialId),
      godownId: Number(godownId),
      material: material.name,
      godown: godown.name,
      quantityRemoved: qty,
      previousStock: prevStock,
      newStock: newStock,
      createdAt: new Date().toISOString()
    };
  });

  return transaction();
}

// 3. Material Transfer (Single Atomic ACID Transaction across 2 Godowns)
function transferStock({ fromGodownId, toGodownId, materialId, quantity, reason, user, req }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Transfer quantity must be a positive number greater than 0.');
  }

  if (Number(fromGodownId) === Number(toGodownId)) {
    throw new Error('Source and destination godowns cannot be the same.');
  }

  const transaction = db.transaction(() => {
    const material = db.prepare('SELECT id, name, sku FROM materials WHERE id = ? AND is_deleted = 0').get(materialId);
    if (!material) throw new Error('Material not found or is inactive.');

    const fromGodown = db.prepare('SELECT id, name FROM godowns WHERE id = ? AND is_active = 1').get(fromGodownId);
    const toGodown = db.prepare('SELECT id, name FROM godowns WHERE id = ? AND is_active = 1').get(toGodownId);
    if (!fromGodown || !toGodown) throw new Error('Source or Destination Godown not found.');

    const sourceStockRow = ensureStockRecord(fromGodownId, materialId);
    const fromPrev = Number(sourceStockRow.quantity);

    if (fromPrev < qty) {
      throw new Error(`Insufficient stock available in source ${fromGodown.name}. Available: ${fromPrev}, requested transfer: ${qty}.`);
    }

    const destStockRow = ensureStockRecord(toGodownId, materialId);
    const toPrev = Number(destStockRow.quantity);

    const fromNew = fromPrev - qty;
    const toNew = toPrev + qty;
    if (!Number.isFinite(toNew)) throw new Error('Stock quantity is outside the supported range.');

    // Execute updates
    db.prepare('UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE godown_id = ? AND material_id = ?')
      .run(fromNew, fromGodownId, materialId);

    db.prepare('UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE godown_id = ? AND material_id = ?')
      .run(toNew, toGodownId, materialId);
    consumeTrackedLots(fromGodownId, materialId, qty, toGodownId);

    const transferId = generateTransferId();

    db.prepare(`
      INSERT INTO stock_transfers (transfer_id, from_godown_id, to_godown_id, material_id, quantity, reason, status, user_id)
      VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
    `).run(transferId, fromGodownId, toGodownId, materialId, qty, reason || null, user.id);

    // Source audit transaction (TRANSFER_OUT)
    db.prepare(`
      INSERT INTO stock_transactions
      (transaction_id, transaction_type, godown_id, material_id, quantity, previous_stock, new_stock, user_id, reference_no, transfer_id, reason)
      VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(generateTransactionId('TXN-TRF-OUT'), fromGodownId, materialId, qty, fromPrev, fromNew, user.id, transferId, transferId, `Transferred to ${toGodown.name}. ${reason || ''}`);

    // Destination audit transaction (TRANSFER_IN)
    db.prepare(`
      INSERT INTO stock_transactions
      (transaction_id, transaction_type, godown_id, material_id, quantity, previous_stock, new_stock, user_id, reference_no, transfer_id, reason)
      VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(generateTransactionId('TXN-TRF-IN'), toGodownId, materialId, qty, toPrev, toNew, user.id, transferId, transferId, `Transferred from ${fromGodown.name}. ${reason || ''}`);

    if (req) {
      logAudit(req, 'TRANSFER_STOCK', `Transfer ${transferId}: ${qty} units of ${material.name} moved from ${fromGodown.name} to ${toGodown.name}`, 'stock_transfers', transferId);
    }

    return {
      success: true,
      transferId,
      transactionType: 'TRANSFER',
      materialId: Number(materialId),
      fromGodownId: Number(fromGodownId),
      toGodownId: Number(toGodownId),
      material: material.name,
      fromGodown: fromGodown.name,
      toGodown: toGodown.name,
      quantityTransferred: qty,
      fromStockAfter: fromNew,
      toStockAfter: toNew,
      createdAt: new Date().toISOString()
    };
  });

  return transaction();
}

// 4. Stock Adjustment
function adjustStock({ godownId, materialId, physicalStock, reason, user, req }) {
  const targetQty = Number(physicalStock);
  if (!Number.isFinite(targetQty) || targetQty < 0) {
    throw new Error('Physical stock count must be a non-negative number.');
  }

  if (!reason || !reason.trim()) {
    throw new Error('Reason for adjustment is required (e.g., breakage, discrepancy, audit recount).');
  }

  const transaction = db.transaction(() => {
    const material = db.prepare('SELECT id, name, sku FROM materials WHERE id = ? AND is_deleted = 0').get(materialId);
    if (!material) throw new Error('Material not found or is inactive.');

    const godown = db.prepare('SELECT id, name FROM godowns WHERE id = ? AND is_active = 1').get(godownId);
    if (!godown) throw new Error('Godown not found or is inactive.');

    const currentStockRow = ensureStockRecord(godownId, materialId);
    const systemStock = Number(currentStockRow.quantity);
    const adjustmentQty = targetQty - systemStock;

    db.prepare('UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE godown_id = ? AND material_id = ?')
      .run(targetQty, godownId, materialId);
    if (adjustmentQty < 0) consumeTrackedLots(godownId, materialId, Math.abs(adjustmentQty));

    db.prepare(`
      INSERT INTO stock_adjustments (godown_id, material_id, system_stock, physical_stock, adjustment_quantity, reason, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(godownId, materialId, systemStock, targetQty, adjustmentQty, reason, user.id);

    const txnId = generateTransactionId('TXN-ADJ');
    db.prepare(`
      INSERT INTO stock_transactions
      (transaction_id, transaction_type, godown_id, material_id, quantity, previous_stock, new_stock, user_id, reference_no, reason)
      VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txnId, godownId, materialId, Math.abs(adjustmentQty), systemStock, targetQty, user.id, 'PHYSICAL-AUDIT', `Adjustment: ${adjustmentQty >= 0 ? '+' : ''}${adjustmentQty}. Reason: ${reason}`);

    if (req) {
      logAudit(req, 'STOCK_ADJUSTMENT', `Stock Adjusted for ${material.name} in ${godown.name}. System: ${systemStock} -> Physical: ${targetQty} (${adjustmentQty >= 0 ? '+' : ''}${adjustmentQty}). Reason: ${reason}`, 'stock_adjustments', txnId);
    }

    return {
      success: true,
      transactionId: txnId,
      transactionType: 'ADJUSTMENT',
      materialId: Number(materialId),
      godownId: Number(godownId),
      material: material.name,
      godown: godown.name,
      systemStock,
      physicalStock: targetQty,
      adjustmentQuantity: adjustmentQty,
      createdAt: new Date().toISOString()
    };
  });

  return transaction();
}

module.exports = {
  stockIn,
  stockOut,
  transferStock,
  adjustStock,
  ensureStockRecord,
  consumeTrackedLots
};
