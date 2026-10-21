const db = require('../db/database');
let isPolling = false;

async function pollLowStockAlerts() {
  const webhook = process.env.LOW_STOCK_WEBHOOK_URL;
  if (!webhook || isPolling) return;
  isPolling = true;
  try {
  const items = db.prepare(`SELECT s.godown_id,s.material_id,s.quantity current_stock,m.min_stock_level,m.name material_name,m.sku,m.unit,g.name godown_name
    FROM stock s JOIN materials m ON m.id=s.material_id JOIN godowns g ON g.id=s.godown_id
    WHERE m.is_deleted=0 AND s.quantity<=m.min_stock_level AND g.is_active=1 ORDER BY g.name,m.name`).all();
  for (const item of items) {
    const date = new Date().toISOString().slice(0, 10);
    const dedupeKey = `LOW_STOCK:${date}:${item.godown_id}:${item.material_id}`;
    const payload = { event: 'low_stock', ...item, occurred_at: new Date().toISOString() };
    const inserted = db.prepare(`INSERT OR IGNORE INTO notification_outbox(event_type,payload,dedupe_key) VALUES('LOW_STOCK',?,?)`)
      .run(JSON.stringify(payload), dedupeKey);
    const rowId = inserted.changes ? inserted.lastInsertRowid : db.prepare(`SELECT id FROM notification_outbox WHERE dedupe_key=? AND status IN ('FAILED','SENDING') AND attempts<3`).get(dedupeKey)?.id;
    if (!rowId) continue;
    db.prepare("UPDATE notification_outbox SET status='SENDING',last_error=NULL WHERE id=?").run(rowId);
    try {
      const response = await fetch(webhook, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Low stock: ${item.material_name} (${item.sku}) at ${item.godown_name}: ${item.current_stock} ${item.unit} on hand; minimum ${item.min_stock_level}.`, ...payload }),
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}.`);
      db.prepare(`UPDATE notification_outbox SET status='DELIVERED',attempts=attempts+1,delivered_at=CURRENT_TIMESTAMP WHERE id=?`).run(rowId);
    } catch (error) {
      db.prepare(`UPDATE notification_outbox SET status='FAILED',attempts=attempts+1,last_error=? WHERE id=?`).run(error.message, rowId);
      console.error('Low-stock webhook delivery failed:', error.message);
    }
  }
  } finally { isPolling = false; }
}

function startLowStockNotifications() {
  if (!process.env.LOW_STOCK_WEBHOOK_URL) return;
  const poll = () => pollLowStockAlerts().catch((error) => console.error('Low-stock alert polling failed:', error.message));
  const initialTimer = setTimeout(poll, 10_000);
  initialTimer.unref?.();
  const interval = setInterval(poll, 15 * 60 * 1000);
  interval.unref?.();
}

module.exports = { startLowStockNotifications, pollLowStockAlerts };
