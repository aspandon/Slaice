import { open } from './orbit.mjs'; import * as o from './ops.mjs';
const [status, ...keys] = process.argv.slice(2);
const { b, p } = await open();
for (const k of keys) console.log(k, '->', await o.setStatus(p, k, status));
await b.close();
