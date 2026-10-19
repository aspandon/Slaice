// Resumable: creates epics, stories (as children), descriptions, deps. State in keys.json.
import { open } from './orbit.mjs'; import * as o from './ops.mjs'; import fs from 'fs';
const d = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const limit = Number(process.argv[3] || 999);
// Epic and dependency targets may be given as Orbit keys (AENR-123) or as batch-local keys.
const KF = new URL('keys.json', import.meta.url).pathname;
const K = fs.existsSync(KF) ? JSON.parse(fs.readFileSync(KF,'utf8')) : {};
const save = () => fs.writeFileSync(KF, JSON.stringify(K, null, 1));
const key = (x) => K[x] ?? x;
const done = new Set(K.__done || []); const mark = (s) => { done.add(s); K.__done = [...done]; save(); };
const { b, p } = await open();
let n = 0;
try {
for (const e of d.epics) {
  if (!K[e.title]) { K[e.title] = await o.createTop(p, { title: e.title, type: 'Epic', priority: e.priority }); save(); console.log('epic', K[e.title], e.title); }
  if (!done.has('desc:'+e.title)) { await o.setDescription(p, K[e.title], e.html); mark('desc:'+e.title); }
}
for (const s of d.stories) {
  if (n >= limit) break;
  if (!K[s.key]) { K[s.key] = await o.addChild(p, key(s.epic), s); save(); console.log('story', K[s.key], s.title); n++; }
  if (!done.has('desc:'+s.key)) { await o.setDescription(p, K[s.key], s.html); mark('desc:'+s.key); }
}
if (n < limit) for (const [a, t, c] of d.deps) {
  const id = `dep:${a}:${t}:${c}`; if (done.has(id)) continue;
  await o.addDep(p, key(a), t, key(c)); mark(id); console.log('dep', key(a), t, key(c));
}
// Adding a child wipes the parent's description in Orbit, so re-apply epic descriptions last.
if (n < limit) for (const e of d.epics) { await o.setDescription(p, K[e.title], e.html); console.log('epic desc', K[e.title]); }
} finally { await b.close(); }
