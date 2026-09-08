/* The flight model's altitude behaviour: climb hard, dive hard, and check
   the bee settles back to the height the flowers live at. */
const { launch, open, fast, agl } = require('./lib');

(async () => {
  const browser = await launch();
  const p = await open(browser, { viewport: { width: 700, height: 440 } });
  await p.click('#start-fly');
  await p.waitForTimeout(400);
  await fast(p);

  console.log('start                ', await agl(p), 'AGL');

  await p.keyboard.down(' ');
  await p.waitForTimeout(3000);
  await p.keyboard.up(' ');
  console.log('after a hard climb   ', await agl(p), 'AGL');
  for (const s of [2, 4, 8, 14]) {
    await p.waitForTimeout(s * 1000);
    console.log('  settling +' + s + 's        ', await agl(p), 'AGL');
  }

  await p.keyboard.down('Shift');
  await p.waitForTimeout(2500);
  await p.keyboard.up('Shift');
  console.log('after a hard dive    ', await agl(p), 'AGL');
  await p.waitForTimeout(14000);
  console.log('settled              ', await agl(p), 'AGL');

  console.log(p.logs.length ? p.logs.join('\n') : 'no errors');
  await browser.close();
})();
