// Runs the Supabase migrations + security test suite on a real PostgreSQL
// engine (PGlite, PostgreSQL compiled to WebAssembly) with a small shim for
// Supabase's auth/storage schemas. Usage:
//   npm i @electric-sql/pglite   (once)
//   node tests/db/run-db-tests.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = p => readFileSync(join(root, p), 'utf8');
const db = new PGlite();

async function run(label, sql) {
  try { await db.exec(sql); console.log('  ok   ' + label); }
  catch (e) { console.error('  FAIL ' + label + '\n       ' + e.message); process.exit(1); }
}

console.log('Applying shim, migrations and seeds:');
await run('tests/db/supabase_shim.sql', read('tests/db/supabase_shim.sql'));
for (const f of readdirSync(join(root, 'supabase/migrations')).sort()) await run('migrations/' + f, read('supabase/migrations/' + f));
await run('seed/01_categories.sql', read('supabase/seed/01_categories.sql'));
await run('seed/02_savings_schemes.sql', read('supabase/seed/02_savings_schemes.sql'));
await run('seed/dev_only_demo_products.sql', read('supabase/seed/dev_only_demo_products.sql'));
// migrations must be re-runnable without errors or data loss
for (const f of readdirSync(join(root, 'supabase/migrations')).sort()) await run('re-run migrations/' + f, read('supabase/migrations/' + f));

// Execute each suite but keep the results: swap the final ROLLBACK for a read of the results table.
async function suite(file, title) {
  const sql = read(file).replace(/\nrollback;\s*$/, '\n');
  const out = await db.exec(sql);
  const rows = out.filter(r => r.fields && r.fields.some(f => f.name === 'detail')).pop().rows;
  await db.exec('rollback');
  let failed = 0;
  console.log('\n' + title + ':');
  for (const r of rows) {
    if (!r.passed) failed++;
    console.log((r.passed ? '  PASS ' : '  FAIL ') + r.name + (r.passed ? '' : '\n       ' + r.detail));
  }
  console.log(`  -> ${rows.length - failed} passed, ${failed} failed, ${rows.length} total`);
  return { total: rows.length, failed };
}
const a = await suite('supabase/tests/security_tests.sql', 'Phase 4 security tests');
const b = await suite('supabase/tests/savings_security_tests.sql', 'Phase 5 savings security tests');
const total = a.total + b.total, failed = a.failed + b.failed;
console.log(`\n${total - failed} passed, ${failed} failed, ${total} total`);
process.exit(failed ? 1 : 0);
