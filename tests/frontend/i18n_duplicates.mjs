// Finds translation keys defined in more than one file with DIFFERENT text
// (a later addStrings() silently overwrites an earlier one). Run: node tests/frontend/i18n_duplicates.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../../', import.meta.url).pathname;
let bad = 0;
// Deliberate overrides: the admin navigation renamed these menu labels in Phase 2.
const ALLOWED = ['a_payments', 'a_goldrate'];
for (const html of ['index.html', 'admin.html']) {
  const srcs = [...readFileSync(root + html, 'utf8').matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !s.includes('vendor'));
  const seen = {};
  for (const s of srcs) {
    const code = readFileSync(root + s, 'utf8');
    const ctx = { out: [] }; vm.createContext(ctx);
    for (const m of code.matchAll(/addStrings\((\{[\s\S]*?\})\s*,\s*(\{[\s\S]*?\})\);/g)) {
      try { vm.runInContext('out.push([' + m[1] + ',' + m[2] + '])', ctx); } catch (e) { /* skip */ }
    }
    if (s === 'js/i18n.js') { const c2 = { store: { get: (k, d) => d }, document: { documentElement: {} } }; vm.createContext(c2); vm.runInContext(code.replace(/let lang/, 'var lang').replace(/const I18N/, 'var I18N'), c2); ctx.out.push([c2.I18N.en, c2.I18N.ta]); }
    for (const [en] of ctx.out) for (const k of Object.keys(en)) {
      if (seen[k] && seen[k].text !== en[k] && !ALLOWED.includes(k)) { bad++; console.log(html + ': key "' + k + '" in ' + seen[k].file + ' is overwritten by ' + s); }
      seen[k] = { file: s, text: en[k] };
    }
  }
}
console.log(bad ? bad + ' conflicting keys' : 'no conflicting keys');
process.exit(bad ? 1 : 0);
