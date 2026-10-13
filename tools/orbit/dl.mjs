// Download an export: node dl.mjs <persona> <hash> <exportButtonName> <PDF|CSV> <outname> [extraClickText]
import { chromium } from 'playwright';
const [persona, hash, btn, fmt, out] = process.argv.slice(2);
const S = process.env.S;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5199/'); await p.evaluate((x) => { localStorage.setItem('slaice.gate.v1','1'); localStorage.setItem('slaice.v1', JSON.stringify({ signedIn: true, persona: x, consent: { decided: true } })); }, persona);
await p.goto(`http://localhost:5199/#/${persona}/${hash}`); await p.reload(); await p.waitForTimeout(1800);
await p.getByRole('button', { name: new RegExp(btn) }).first().click(); await p.waitForTimeout(300);
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.getByRole('menuitem', { name: new RegExp(`^${fmt}`) }).click()]);
await dl.saveAs(`${S}/dl/${out}`);
console.log('saved', out, dl.suggestedFilename(), errs.join('|') || '');
await b.close();
