// node peek.mjs AENR-123 — print an item's page text (title, status, points, description, deps).
import { open } from './orbit.mjs'; import * as o from './ops.mjs';
const { b, p } = await open();
await o.openItem(p, process.argv[2]);
console.log(await p.locator('main').innerText());
await b.close();
