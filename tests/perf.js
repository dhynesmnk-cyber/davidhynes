/* Median frame time on a desktop and a phone viewport, plus whether the
   runtime quality budget stepped itself down. Absolute numbers mean little
   under a software rasteriser — compare them against each other. */
const { launch, open, PHONE } = require('./lib');

(async () => {
  const browser = await launch();
  for (const [label, opts] of [
    ['desktop 900x560', { viewport: { width: 900, height: 560 } }],
    ['phone 390x844', PHONE]
  ]) {
    const p = await open(browser, opts);
    await p.click('#start-fly');
    await p.waitForTimeout(1000);
    await p.evaluate(() => {
      window.__frames = [];
      let last = performance.now();
      const tick = () => {
        const now = performance.now();
        window.__frames.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await p.waitForTimeout(9000);
    const r = await p.evaluate(() => {
      const a = window.__frames.slice(3).sort((x, y) => x - y);
      return {
        frames: a.length,
        medianMs: a.length ? +a[Math.floor(a.length / 2)].toFixed(1) : null,
        p90Ms: a.length ? +a[Math.floor(a.length * 0.9)].toFixed(1) : null,
        downgradeSteps: window.__gardenDebug.state.downgraded
      };
    });
    console.log(label.padEnd(18), JSON.stringify(r));
    await p.context().close();
  }
  await browser.close();
})();
