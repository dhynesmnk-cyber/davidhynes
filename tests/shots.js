/* Screenshots. `node tests/shots.js fly hive projects` writes /tmp/shot-<name>.png.
   Add --phone for the handset viewport. Scenes drive the garden through the
   debug hooks main.js exposes, because flying there by hand is slow under a
   software rasteriser. */
const { launch, open, fast, PHONE } = require('./lib');

const wait = (p, ms) => p.waitForTimeout(ms);
const goto = async (p, id, settle = 9000) => {
  await p.click('#start-fly'); await wait(p, 400); await fast(p);
  await p.evaluate(i => window.__gardenDebug.goto(i), id);
  await wait(p, settle);
};

const SCENES = {
  intro: async p => wait(p, 1500),
  fly: async p => { await p.click('#start-fly'); await fast(p); await wait(p, 6000); },
  text: async p => { await p.click('#start-text'); await wait(p, 800); },
  tour: async p => { await p.click('#start-tour'); await fast(p, 9); await wait(p, 14000); },
  hive: p => goto(p, 'hive'),
  work: p => goto(p, 'work'),
  projects: p => goto(p, 'projects'),
  method: p => goto(p, 'method'),
  toolkit: p => goto(p, 'toolkit'),
  background: p => goto(p, 'background'),
  writing: p => goto(p, 'writing'),
  bloom: async p => {
    await p.click('#start-fly'); await wait(p, 400); await fast(p, 8);
    await p.evaluate(() => window.__gardenDebug.bloomAll());
    await wait(p, 26000);
  }
};

(async () => {
  const args = process.argv.slice(2);
  const phone = args.includes('--phone');
  const names = args.filter(a => !a.startsWith('--'));
  if (!names.length) {
    console.log('scenes:', Object.keys(SCENES).join(', '));
    process.exit(0);
  }
  const browser = await launch();
  for (const name of names) {
    const scene = SCENES[name];
    if (!scene) { console.log('unknown scene:', name); continue; }
    const p = await open(browser, phone ? PHONE : { viewport: { width: 1000, height: 620 } });
    await scene(p);
    const out = `/tmp/shot-${name}${phone ? '-phone' : ''}.png`;
    await p.screenshot({ path: out });
    console.log(out, p.logs.length ? '(' + p.logs.join(' | ') + ')' : '');
    await p.context().close();
  }
  await browser.close();
})();
