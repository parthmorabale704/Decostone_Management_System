const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

async function main() {
  const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : '';
  if (!sourcePath || !fs.existsSync(sourcePath) || !process.argv.includes('--confirm-offline')) {
    throw new Error('Usage: npm run db:restore -- <backup-file.db> --confirm-offline (stop the backend first).');
  }
  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  const integrity = source.pragma('integrity_check', { simple: true });
  const tables = new Set(source.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name));
  source.close();
  for (const table of ['users', 'materials', 'stock', 'stock_transactions']) {
    if (!tables.has(table)) throw new Error(`Backup is missing required table: ${table}`);
  }
  if (integrity !== 'ok') throw new Error(`Backup integrity check failed: ${integrity}`);

  const dataDirectory = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../../data');
  const targetPath = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(dataDirectory, 'decostone.db');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyCopy = path.join(path.dirname(targetPath), `pre-restore-${stamp}.db`);
  let current;
  if (fs.existsSync(targetPath)) {
    current = new Database(targetPath, { timeout: 0 });
    const checkpoint = current.pragma('wal_checkpoint(TRUNCATE)');
    if (checkpoint?.[0]?.busy) throw new Error('Database is in use. Stop the backend and retry.');
    await current.backup(safetyCopy);
    current.close();
    current = null;
  }

  const tempPath = `${targetPath}.restore.tmp`;
  fs.copyFileSync(sourcePath, tempPath);
  const temporary = new Database(tempPath, { readonly: true, fileMustExist: true });
  if (temporary.pragma('integrity_check', { simple: true }) !== 'ok') {
    temporary.close(); fs.rmSync(tempPath, { force: true }); throw new Error('Staged restore failed integrity validation.');
  }
  temporary.close();

  const replacedPath = `${targetPath}.replaced`;
  try {
    if (fs.existsSync(targetPath)) fs.renameSync(targetPath, replacedPath);
    fs.renameSync(tempPath, targetPath);
    fs.rmSync(replacedPath, { force: true });
    fs.rmSync(`${targetPath}-wal`, { force: true });
    fs.rmSync(`${targetPath}-shm`, { force: true });
  } catch (error) {
    if (!fs.existsSync(targetPath) && fs.existsSync(replacedPath)) fs.renameSync(replacedPath, targetPath);
    throw error;
  }
  console.log(`Database restored from ${sourcePath}. Safety copy: ${fs.existsSync(safetyCopy) ? safetyCopy : 'not needed'}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
