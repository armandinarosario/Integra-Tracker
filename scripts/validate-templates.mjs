// Valida ficheiros de modelo: node scripts/validate-templates.mjs [ficheiro.json ...]
// Sem argumentos, valida os modelos em public/templates.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const files = process.argv.slice(2);
if (!files.length) {
  for (const f of readdirSync('public/templates')) if (f.endsWith('.json') && f !== 'index.json') files.push(join('public/templates', f));
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const { validateTemplate } = await server.ssrLoadModule('/src/lib/validate.ts');
let failed = 0;
for (const f of files) {
  const errors = validateTemplate(JSON.parse(readFileSync(f, 'utf8')));
  if (errors.length) {
    failed++;
    console.log(`✗ ${f}`);
    for (const e of errors) console.log(`   - ${e}`);
  } else console.log(`✓ ${f}`);
}
await server.close();
process.exit(failed ? 1 : 0);
