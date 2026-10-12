import { SPACE } from './orbit.mjs';
const wait = (p, ms = 800) => p.waitForTimeout(ms);
export async function backlog(p) { await p.goto(SPACE, { waitUntil: 'networkidle' }); await wait(p, 1200); }
export async function keys(p) { await backlog(p); return new Set((await p.locator('main').innerText()).match(/AENR-\d+/g) || []); }
export async function openItem(p, key) {
  await p.goto(SPACE.replace('tab=agile&', `tab=agile&backlog=${key}&`), { waitUntil: 'networkidle' });
  await wait(p, 1500);
}
export async function keyOf(p) { return (await p.locator('main div:text-matches("^[A-Z]+-\\\\d+$")').first().innerText()).trim(); }
export async function createTop(p, { title, type, priority }) {
  await backlog(p);
  await p.getByText(/AENR-\d+/).first().waitFor();
  await p.getByRole('button', { name: 'Create', exact: true }).click();
  await p.locator('[role=dialog] input[placeholder="Enter project title"]').waitFor();
  const dlg = p.locator('[role=dialog]').last();
  await dlg.locator('input[placeholder="Enter project title"]').fill(title);
  const s = dlg.locator('select');
  await s.nth(0).selectOption({ label: type });
  if (priority) await s.nth(1).selectOption({ label: priority });
  const before = await keysNoNav(p);
  await dlg.getByRole('button', { name: 'Create', exact: true }).click();
  await wait(p, 2000);
  return newKey(p, before);
}
async function keysNoNav(p) { return new Set((await p.locator('main').innerText()).match(/AENR-\d+/g) || []); }
async function newKey(p, before) {
  for (let i = 0; i < 4; i++) { const after = await keys(p); const n = [...after].filter(k => !before.has(k)); if (n.length === 1) return n[0]; if (n.length > 1) throw new Error('many new keys ' + n); await p.waitForTimeout(2000); }
  throw new Error('item was not created');
}
export async function addChild(p, parentTitle, { title, type, priority }) {
  await openItem(p, parentTitle);
  await p.getByTitle('Add new item').click({ force: true });
  await wait(p);
  await p.locator('input[placeholder="Enter item name..."]').fill(title);
  const form = p.locator('input[placeholder="Enter item name..."]').locator('xpath=ancestor::div[.//select][1]');
  const s = form.locator('select');
  await s.nth(0).selectOption({ label: type });
  if (priority) await s.nth(1).selectOption({ label: priority });
  const before = await keysNoNav(p);
  await form.getByRole('button', { name: 'Create', exact: true }).click();
  await wait(p, 2000);
  const after = await keysNoNav(p);
  const n = [...after].filter(k => !before.has(k));
  if (n.length === 1) return n[0];
  return newKey(p, await keys(p).then(() => before));
}
export async function setDescription(p, key, html) {
  const probe = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(-6).join(' ');
  for (let attempt = 0; attempt < 3; attempt++) {
    await setDescriptionOnce(p, key, html);
    await openItem(p, key);
    const txt = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
    if (txt.includes(probe)) return;
    await wait(p, 2000);
  }
  throw new Error('description did not save for ' + key);
}
async function setDescriptionOnce(p, title, html) {
  await openItem(p, title);
  await p.getByTitle('Edit description').click({ force: true });
  await wait(p);
  const ok = await p.evaluate((h) => {
    const c = document.querySelector('main .ql-container');
    const q = c && (c.__quill || (window.Quill && window.Quill.find(c)));
    if (!q) return false;
    q.setContents([]); q.clipboard.dangerouslyPasteHTML(0, h); return true;
  }, html);
  if (!ok) throw new Error('no quill instance');
  await p.getByRole('button', { name: 'Save', exact: true }).click();
  await wait(p, 3000);
}
export async function setPriority(p, title, priority) {
  await openItem(p, title);
  const sel = p.locator('main select').filter({ has: p.locator('option', { hasText: 'Critical' }) }).last();
  await sel.selectOption({ label: priority }); await wait(p, 1200);
}
export async function addDep(p, title, depType, otherTitle) {
  await openItem(p, title);
  await p.getByTitle('Add a dependency').click({ force: true });
  await wait(p);
  const box = p.getByRole('button', { name: 'Add Dependency' }).locator('xpath=ancestor::div[.//select][1]');
  const s = box.locator('select');
  const opts = await s.nth(0).locator('option').allInnerTexts();
  const label = opts.find(o => o.includes(otherTitle + ' ') || o.endsWith(otherTitle) || o.includes(otherTitle));
  if (!label) {
    const sec = await p.locator('main').innerText();
    const i = sec.search(/Dependencies & Related/i);
    if (sec.slice(i, sec.search(/COMMENTS \(/)).includes(otherTitle)) { await p.getByRole('button', { name: 'Cancel' }).last().click().catch(()=>{}); console.log('  (already linked)', title, otherTitle); return; }
    throw new Error('dep target not found: ' + otherTitle);
  }
  await s.nth(0).selectOption({ label });
  await s.nth(1).selectOption({ label: depType });
  await p.getByRole('button', { name: 'Add Dependency' }).click();
  await wait(p, 1500);
}
export async function setPoints(p, title, n) {
  await openItem(p, title);
  const inp = p.locator('main input[type=number]').last();
  await inp.fill(String(n)); await inp.press('Enter'); await wait(p, 1200);
}
export async function setTitle(p, key, title) {
  await openItem(p, key);
  await p.getByTitle('Click to edit title').click();
  await wait(p, 500);
  const inp = p.locator('main input:focus, main textarea:focus').first();
  await inp.fill(title); await inp.press('Enter'); await wait(p, 1200);
}
export async function getPoints(p, key) {
  await openItem(p, key);
  return (await p.getByRole('button', { name: /Story points/ }).first().innerText()).trim();
}
export async function archive(p, key) {
  await openItem(p, key);
  await p.getByRole('button', { name: 'More actions' }).click(); await wait(p, 500);
  await p.getByText('Archive', { exact: true }).click(); await wait(p, 800);
  const confirm = p.locator('[role=dialog] button, [role=alertdialog] button').filter({ hasText: /^(Archive|Confirm|Yes)/ });
  if (await confirm.count()) { await confirm.last().click(); await wait(p, 1200); }
}
export async function setStatus(p, key, status) {
  await openItem(p, key);
  await p.getByTitle('Click to change status').first().click(); await wait(p, 700);
  await p.locator('select:has(option[value="in_progress"])').first().selectOption({ label: status }); await wait(p, 1500);
  await openItem(p, key);
  return (await p.getByTitle('Click to change status').first().innerText()).trim();
}
export async function moveUnder(p, epicKey, itemKey) {
  await openItem(p, epicKey);
  await p.getByTitle('Move existing item here').click({ force: true }); await wait(p, 800);
  await p.getByRole('button', { name: '-- Select an item --' }).click(); await wait(p, 800);
  const search = p.locator('input[placeholder*="earch"]').last();
  if (await search.isVisible().catch(() => false)) { await search.fill(itemKey); await wait(p, 800); }
  const opt = p.getByText(new RegExp(itemKey + '\\b')).last();
  if (!(await opt.isVisible().catch(() => false))) throw new Error(itemKey + ' not offered');
  await opt.click(); await wait(p, 600);
  await p.getByRole('button', { name: 'Move Here', exact: true }).click(); await wait(p, 1800);
}
export async function setSprint(p, key, sprintLabelPart) {
  await openItem(p, key);
  await p.getByRole('button', { name: /^Sprint:/ }).first().click(); await wait(p, 700);
  const sel = p.locator('select:has(option:text-is("No sprint (Backlog)"))').first();
  const opts = await sel.locator('option').allInnerTexts();
  const label = opts.find(o => o.includes(sprintLabelPart));
  await sel.selectOption({ label }); await wait(p, 900);
  const confirm = p.getByRole('button', { name: 'Add to Sprint', exact: true });
  if (await confirm.isVisible().catch(() => false)) { await confirm.click(); await wait(p, 2000); }
  await openItem(p, key);
  return (await p.getByRole('button', { name: /^Sprint:/ }).first().getAttribute('aria-label'));
}
