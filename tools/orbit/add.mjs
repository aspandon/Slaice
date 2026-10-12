// node add.mjs <batch.json> <EPIC-KEY> [--points N] [--sprint "Sprint 1"] [--status "In Progress"]
// Creates the batch's stories/defects under the epic (via run.mjs), then restores the
// epic description (Orbit wipes it when a child is added) and optionally sets
// points / sprint / status on each new item.
import { open } from './orbit.mjs'; import * as o from './ops.mjs'; import fs from 'fs'; import { execSync } from 'child_process';
const args = process.argv.slice(2);
const [file, epic] = args;
const opt = (k) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : undefined; };
const dir = new URL('.', import.meta.url).pathname;
let { b, p } = await open();
await o.openItem(p, epic);
await p.getByTitle('Edit description').click({ force: true }); await p.waitForTimeout(1500);
const html = await p.evaluate(() => { const c = document.querySelector('main .ql-container'); const q = c && (c.__quill || window.Quill?.find(c)); return q ? q.root.innerHTML : null; });
fs.writeFileSync(`${dir}epic-${epic}.html`, html || '');
await b.close();
console.log(execSync(`node ${dir}run.mjs ${file}`).toString());
const K = JSON.parse(fs.readFileSync(dir + 'keys.json', 'utf8'));
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
({ b, p } = await open());
try {
  const now = (await (async () => { await o.openItem(p, epic); return p.locator('main').innerText(); })());
  if (html && html.length > 50 && !now.includes(html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).slice(0, 6).join(' '))) { await o.setDescription(p, epic, html); console.log('restored', epic); }
  for (const s of d.stories) {
    const k = K[s.key];
    if (opt('--points')) { await o.setPoints(p, k, Number(opt('--points'))); console.log(k, 'points', await o.getPoints(p, k)); }
    if (opt('--sprint')) console.log(k, await o.setSprint(p, k, opt('--sprint')));
    if (opt('--status')) console.log(k, await o.setStatus(p, k, opt('--status')));
  }
} finally { await b.close(); }
