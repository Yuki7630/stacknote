// USER ONLY: deletes the mock-cloud database after a typed "yes" confirmation.
// This is the only code in the project allowed to delete data.
// Run with: npm run db:drop   (stop `npm run dev` first, or Windows may keep the files locked)
import { existsSync, unlinkSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import { DB_PATH } from '../src/db.js';

const files = [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`];
const existing = files.filter((f) => existsSync(f));

if (existing.length === 0) {
  console.log('No database files found. Nothing to delete.');
  process.exit(0);
}

console.log('This will permanently delete the mock-cloud database:');
for (const f of existing) console.log(`  ${f}`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('Type "yes" to delete, anything else cancels: ');
rl.close();

if (answer.trim() !== 'yes') {
  console.log('Cancelled. Nothing was deleted.');
  process.exit(0);
}

let failed = false;
for (const f of existing) {
  try {
    unlinkSync(f);
    console.log(`Deleted ${f}`);
  } catch (err) {
    failed = true;
    console.error(`Could not delete ${f}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (failed) {
  console.error('Some files were not deleted. Is the server (npm run dev) still running?');
  process.exit(1);
}
console.log('Database deleted. It will be recreated empty on the next server start.');
