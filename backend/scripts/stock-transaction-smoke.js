if (!process.env.DATABASE_PATH) {
  console.error('Set DATABASE_PATH to a disposable SQLite database before running this smoke check.');
  process.exit(1);
}

const stockService = require('../src/services/stockService');
const db = require('../src/db/database');

console.log('--- Testing Stock Transactions ---');

// Mock user and req
const mockUser = { id: 1, name: 'Admin User', role: 'admin' };
const mockReq = { ip: '127.0.0.1' };

// Get a test material and 2 test godowns
const material = db.prepare('SELECT * FROM materials WHERE is_deleted = 0 LIMIT 1').get();
const godowns = db.prepare('SELECT * FROM godowns WHERE is_active = 1 LIMIT 2').all();

if (!material || godowns.length < 2) {
  console.error('Material or Godowns not found for testing.');
  process.exit(1);
}

const godownA = godowns[0];
const godownB = godowns[1];

console.log(`Test Material: ${material.name} (ID: ${material.id})`);
console.log(`Godown A: ${godownA.name} (ID: ${godownA.id})`);
console.log(`Godown B: ${godownB.name} (ID: ${godownB.id})`);

// 1. Check initial stocks
const initialStockA = db.prepare('SELECT quantity FROM stock WHERE godown_id = ? AND material_id = ?').get(godownA.id, material.id)?.quantity || 0;
const initialStockB = db.prepare('SELECT quantity FROM stock WHERE godown_id = ? AND material_id = ?').get(godownB.id, material.id)?.quantity || 0;

console.log(`\nInitial Stock A: ${initialStockA}, Initial Stock B: ${initialStockB}`);

// 2. Test Stock IN (Add 50)
console.log('\n--- 1. Testing Stock IN (+50 to Godown A) ---');
const inResult = stockService.stockIn({
  godownId: godownA.id,
  materialId: material.id,
  quantity: 50,
  supplier: 'Test Supplier',
  referenceNo: 'TEST-PO-01',
  remarks: 'Automated test in',
  user: mockUser,
  req: mockReq
});

console.log('Stock IN result:', inResult);
const afterInStockA = db.prepare('SELECT quantity FROM stock WHERE godown_id = ? AND material_id = ?').get(godownA.id, material.id)?.quantity;
console.log(`Stock in DB after IN: ${afterInStockA} (Expected: ${initialStockA + 50})`);
if (afterInStockA !== initialStockA + 50) throw new Error('Stock IN verification failed');

// 3. Test Transfer Stock (Transfer 20 from Godown A to Godown B)
console.log('\n--- 2. Testing Stock Transfer (20 from Godown A -> Godown B) ---');
const trfResult = stockService.transferStock({
  fromGodownId: godownA.id,
  toGodownId: godownB.id,
  materialId: material.id,
  quantity: 20,
  reason: 'Automated test transfer',
  user: mockUser,
  req: mockReq
});

console.log('Transfer result:', trfResult);
const afterTrfStockA = db.prepare('SELECT quantity FROM stock WHERE godown_id = ? AND material_id = ?').get(godownA.id, material.id)?.quantity;
const afterTrfStockB = db.prepare('SELECT quantity FROM stock WHERE godown_id = ? AND material_id = ?').get(godownB.id, material.id)?.quantity;
console.log(`Stock in DB after Transfer - Godown A: ${afterTrfStockA} (Expected: ${afterInStockA - 20}), Godown B: ${afterTrfStockB} (Expected: ${initialStockB + 20})`);
if (afterTrfStockA !== afterInStockA - 20 || afterTrfStockB !== initialStockB + 20) throw new Error('Stock Transfer verification failed');

// 4. Test Stock OUT (Dispatch 15 from Godown A)
console.log('\n--- 3. Testing Stock OUT (-15 from Godown A) ---');
const outResult = stockService.stockOut({
  godownId: godownA.id,
  materialId: material.id,
  quantity: 15,
  customer: 'Test Customer',
  referenceNo: 'TEST-INV-01',
  remarks: 'Automated test out',
  user: mockUser,
  req: mockReq
});

console.log('Stock OUT result:', outResult);
const afterOutStockA = db.prepare('SELECT quantity FROM stock WHERE godown_id = ? AND material_id = ?').get(godownA.id, material.id)?.quantity;
console.log(`Stock in DB after OUT: ${afterOutStockA} (Expected: ${afterTrfStockA - 15})`);
if (afterOutStockA !== afterTrfStockA - 15) throw new Error('Stock OUT verification failed');

console.log('\n✅ ALL 3 TRANSACTION CASES PASSED PERFECTLY!');
