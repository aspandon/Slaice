// Shared helper: a logged-in Orbit page, reusing the saved session (state.json).
// Credentials come from tools/orbit/.orbit.env (git-ignored) or the environment:
//   ORBIT_USER=…   ORBIT_PASS=…
// Never commit credentials. Chromium: $CHROMIUM_PATH or the pre-installed one.
import { chromium } from 'playwright';
import fs from 'fs';
const dir = new URL('.', import.meta.url).pathname;
const file = dir + '.orbit.env';
const env = { ...process.env, ...(fs.existsSync(file) ? Object.fromEntries(fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => l.split('='))) : {}) };
export const SPACE = 'https://19c11949.orbit-6cb.pages.dev/pmtool?tab=agile&space=752c94c7-74c4-4f27-8ee2-1bcd0531f277';
const CHROMIUM = env.CHROMIUM_PATH || [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium',
].find((p) => fs.existsSync(p));
export async function open() {
  const b = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
  const state = fs.existsSync(dir + 'state.json') ? dir + 'state.json' : undefined;
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, storageState: state });
  const p = await ctx.newPage();
  await p.goto(SPACE, { waitUntil: 'networkidle' });
  if (p.url().includes('/login')) {
    if (!env.ORBIT_USER || !env.ORBIT_PASS) throw new Error('Set ORBIT_USER / ORBIT_PASS (tools/orbit/.orbit.env) — ask the user for them.');
    await p.fill('input[name=username]', env.ORBIT_USER);
    await p.fill('input[name=password]', env.ORBIT_PASS);
    await p.click('button:has-text("Sign In")');
    await p.waitForURL((u) => !u.toString().includes('/login'), { timeout: 20000 });
    await p.goto(SPACE, { waitUntil: 'networkidle' });
  }
  await ctx.storageState({ path: dir + 'state.json' });
  return { b, p };
}
