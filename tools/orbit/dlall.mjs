import { chromium } from 'playwright';
const S = process.env.S;
const only = process.env.ONLY;
const jobs0 = [
  ['admin', 'bookings', 'Export bookings', 'bookings'],
  ...['exec', 'revenue', 'payments', 'invoices', 'refunds', 'occupancy', 'ops', 'tickets', 'customers', 'channel', 'bookings'].map((r) => ['admin', `reporting?report=${r}`, 'Export the', `rep-${r}`]),
  ['admin', 'refunds', 'Export refunds', 'refunds'],
  ['admin', 'users', 'Export All guests|Export all guests', 'guests'],
  ['admin', 'privacy', 'Export the privacy log', 'privacy'],
  ['admin', 'privacy?tab=register', 'Export the record of processing', 'register'],
  ['admin', 'billing', 'Download INV', 'invoice'],
  ['accountant', 'monthend', 'Summary', 'monthend'],
  ['accountant', 'documents', 'Export documents', 'documents'],
  ['accountant', 'documents?tab=payments', 'Export payments', 'acc-payments'],
  ['accountant', 'commission', 'Export payout statement', 'payouts'],
  ['accountant', 'reports', 'Export invoices', 'acc-invoices'],
  ['platform', 'tenants', 'Export tenants', 'tenants'],
  ['customer', 'account', 'List receipts list', 'receipts'],
  ['admin', 'users', '^Export all guests', 'guests'],
  ['admin', 'billing', 'Download SL-', 'invoice'],
  ['admin', 'users?guest=3', 'Export guest data', 'guestdata', '^Privacy$'],
  ['admin', 'privacy?tab=requests&request=DSAR-204', 'Audit trail', 'dsar-audit'],
  ['admin', 'privacy?tab=processors', 'Download DPA', 'dpa'],
  ['cashier', 'register', 'Download the X report', 'xreport', 'X report'],
  ['platform', 'tenant/akti/audit', 'Export the', 'tenant-audit'],
  ['customer', 'account', '^Download ΑΠΥ-2026-004281$', 'receipt-doc', '^View$'],
  ['accountant', 'documents', '^Download Α-6149$', 'fiscal-doc', 'View Α-6149'],
];
const jobs = only ? jobs0.filter((j) => only.split(',').includes(j[3])) : jobs0;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [persona, hash, btn, out, pre] of jobs) {
  for (const fmt of ['PDF', 'CSV']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    try {
      await p.goto('http://localhost:5199/'); await p.evaluate((x) => { localStorage.setItem('slaice.gate.v1','1'); localStorage.setItem('slaice.v1', JSON.stringify({ signedIn: true, persona: x, consent: { decided: true } })); }, persona);
      await p.goto(`http://localhost:5199/#/${persona}/${hash}`); await p.reload(); await p.waitForTimeout(1800);
      if (pre) { await p.getByRole('button', { name: new RegExp(pre) }).first().click().catch(async () => { await p.getByText(new RegExp(pre)).first().click(); }); await p.waitForTimeout(700); }
      await p.getByRole('button', { name: new RegExp(btn) }).first().click(); await p.waitForTimeout(300);
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.getByRole('menuitem', { name: new RegExp(`^${fmt}`) }).click()]);
      const name = `${out}.${fmt.toLowerCase()}`;
      await dl.saveAs(`${S}/dl/${name}`);
      console.log('ok', name, dl.suggestedFilename(), errs.join('|'));
    } catch (e) { console.log('FAIL', out, fmt, String(e).split('\n')[0], errs.join('|')); }
    await ctx.close();
  }
}
await b.close();
