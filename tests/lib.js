/* Shared harness for the browser tests. Playwright is a dev-only dependency:
   `npm i playwright` inside tests/, or point CHROME_PATH at a Chromium.
   Nothing here ships — build.sh only copies the site files into dist/. */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8099';

const ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader'
];

const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
};

async function launch() {
  const opts = { args: ARGS };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  return chromium.launch(opts);
}

/* Opens the garden and waits for boot. Returns the page with `logs` attached:
   any console error or uncaught exception lands there. */
async function open(browser, ctxOpts = {}) {
  const ctx = await browser.newContext(
    Object.assign({ viewport: { width: 1000, height: 620 } }, ctxOpts)
  );
  const page = await ctx.newPage();
  page.logs = [];
  page.on('console', m => {
    if (m.type() === 'error') page.logs.push('[console] ' + m.text());
  });
  page.on('pageerror', e => page.logs.push('[pageerror] ' + e.message));
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__gardenDebug, null, { timeout: 30000 });
  return page;
}

/* Software rendering runs at a couple of frames a second, so simulated time
   crawls. Speeding the clock up keeps the tests honest without long waits. */
const fast = (page, scale = 6) =>
  page.evaluate(s => { window.__gardenDebug.state.timeScale = s; }, scale);

const agl = page => page.evaluate(() => {
  const d = window.__gardenDebug, f = d.flight();
  return +(f.pos.y - d.groundY(f.pos.x, f.pos.z)).toFixed(2);
});

module.exports = { launch, open, fast, agl, BASE, PHONE };
