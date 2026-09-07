/* Functional pass/fail over the whole experience. Exits non-zero on failure. */
const { launch, open, fast, PHONE } = require('./lib');

const failures = [];
const check = (name, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok ? '' : '  <- ' + detail));
  if (!ok) failures.push(name);
};
const wait = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const browser = await launch();

  /* boots under prefers-reduced-motion */
  {
    const p = await open(browser, { reducedMotion: 'reduce' });
    await p.click('#start-fly');
    await wait(p, 2500);
    check('reduced motion boots clean', p.logs.length === 0, p.logs.join(' | '));
    await p.context().close();
  }

  /* keyboard flight, tour toggles */
  {
    const p = await open(browser);
    await p.click('#start-fly');
    await wait(p, 400);
    await fast(p);
    const before = await p.evaluate(() => window.__gardenDebug.flight().pos.toArray());
    await p.keyboard.down('w'); await wait(p, 2500); await p.keyboard.up('w');
    const after = await p.evaluate(() => window.__gardenDebug.flight().pos.toArray());
    const moved = Math.hypot(...after.map((v, i) => v - before[i]));
    check('W moves the bee', moved > 3, 'moved ' + moved.toFixed(2));

    await p.keyboard.press('t'); await wait(p, 1200);
    check('T starts the tour',
      await p.evaluate(() => document.querySelector('#tour-btn').classList.contains('running')));
    await p.keyboard.press('Escape'); await wait(p, 600);
    check('Escape stops the tour',
      await p.evaluate(() => !document.querySelector('#tour-btn').classList.contains('running')));
    check('no errors during flight', p.logs.length === 0, p.logs.join(' | '));
    await p.context().close();
  }

  /* the tour yields to any input */
  {
    const p = await open(browser);
    await p.click('#start-tour'); await wait(p, 1500);
    await p.keyboard.down('d'); await wait(p, 900); await p.keyboard.up('d');
    await wait(p, 600);
    check('movement cancels the tour',
      await p.evaluate(() => !document.querySelector('#tour-btn').classList.contains('running')));
    await p.context().close();
  }

  /* the tour reaches every section in order */
  {
    const p = await open(browser);
    await p.click('#start-fly'); await wait(p, 400);
    await p.evaluate(() => {
      window.__gardenDebug.state.timeScale = 9;
      window.__gardenDebug.tour().dwell = 2;
    });
    await p.click('#tour-btn');
    const seen = new Set();
    let ended = false;
    for (let i = 0; i < 90; i++) {
      await wait(p, 1000);
      const st = await p.evaluate(() => {
        const t = window.__gardenDebug.tour();
        return { active: t.active, cur: t.current && t.current.id };
      });
      if (st.cur) seen.add(st.cur);
      if (!st.active) { ended = true; break; }
    }
    check('tour ends on its own', ended);
    check('tour visits all seven sections', seen.size === 7, [...seen].join(','));
    check('tour blooms the garden',
      await p.evaluate(() => document.querySelector('#pollen-n').textContent) === '7');
    await p.context().close();
  }

  /* the text escape hatch */
  {
    const p = await open(browser);
    await p.click('#start-text'); await wait(p, 500);
    check('text mode shows the resume', await p.evaluate(() =>
      document.body.classList.contains('text-mode') &&
      getComputedStyle(document.querySelector('#text-resume')).display !== 'none'));
    const heads = await p.evaluate(() =>
      [...document.querySelectorAll('#text-resume h2')].map(h => h.textContent.trim()));
    check('all eight headings present', heads.length === 8, heads.join(','));
    check('contact links present', await p.evaluate(() =>
      document.querySelectorAll('#text-resume a[href^="mailto"],#text-resume a[href^="tel"]').length) >= 2);
    await p.click('#world-btn'); await wait(p, 800);
    check('returns to the garden',
      await p.evaluate(() => !document.body.classList.contains('text-mode')));
    check('no errors in text mode', p.logs.length === 0, p.logs.join(' | '));
    await p.context().close();
  }

  /* audio is opt-in */
  {
    const p = await open(browser);
    await p.click('#start-fly'); await wait(p, 400);
    const pressed = () => p.evaluate(() => document.querySelector('#sound-btn').getAttribute('aria-pressed'));
    check('muted by default', await pressed() === 'false');
    await p.click('#sound-btn'); await wait(p, 900);
    check('toggles on', await pressed() === 'true');
    await p.click('#sound-btn'); await wait(p, 500);
    check('toggles off', await pressed() === 'false');
    await p.context().close();
  }

  /* completion, the reward flower, the payoff */
  {
    const p = await open(browser);
    await p.click('#start-fly'); await wait(p, 400);
    await p.evaluate(() => {
      window.__gardenDebug.state.timeScale = 8;
      window.__gardenDebug.bloomAll();
    });
    await wait(p, 3000);
    check('pollen reaches 7/7',
      await p.evaluate(() => document.querySelector('#pollen-n').textContent) === '7');
    check('hire-me flower created',
      await p.evaluate(() => !!window.__gardenDebug.flowers.get('hire')));
    check('CV button appears', await p.evaluate(() => !!document.querySelector('#cv-btn')));

    let card = false;
    for (let i = 0; i < 40 && !card; i++) {
      await wait(p, 1000);
      card = await p.evaluate(() => !document.querySelector('#finale').classList.contains('hide'));
    }
    check('finale card follows the flypast', card);

    await p.evaluate(() => document.querySelector('#finale-go').click());
    await wait(p, 12000);
    const hire = await p.evaluate(() => ({
      landed: window.__gardenDebug.flight().landed && window.__gardenDebug.flight().landed.id,
      cv: !!document.querySelector('#panel a[download]')
    }));
    check('Show me lands on the hire flower', hire.landed === 'hire', JSON.stringify(hire));
    check('contact panel offers the CV', hire.cv);
    check('no errors through completion', p.logs.length === 0, p.logs.join(' | '));
    await p.context().close();
  }

  /* layout survives being resized and reoriented */
  {
    const p = await open(browser);
    await p.click('#start-fly'); await wait(p, 600);
    await p.setViewportSize({ width: 400, height: 820 }); await wait(p, 1200);
    await p.setViewportSize({ width: 1200, height: 500 }); await wait(p, 1200);
    check('survives resizes', p.logs.length === 0, p.logs.join(' | '));
    await p.context().close();
  }

  /* phone layout: controls reachable, nothing overlapping the thumbs */
  {
    const p = await open(browser, PHONE);
    await p.click('#start-fly'); await wait(p, 800);
    const hit = await p.evaluate(() => {
      const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      const overlap = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
      const stick = box(document.querySelector('#stick'));
      const tour = box(document.querySelector('#tour-btn'));
      const map = box(document.querySelector('#map-wrap'));
      const up = box(document.querySelector('#alt-up'));
      return {
        tourClearOfStick: !overlap(tour, stick),
        tourClearOfAlt: !overlap(tour, up),
        mapClearOfAlt: !overlap(map, up),
        mapOnScreen: map.r <= innerWidth + 1 && map.b <= innerHeight + 1
      };
    });
    check('tour button clear of the stick', hit.tourClearOfStick);
    check('tour button clear of the altitude pads', hit.tourClearOfAlt);
    check('minimap clear of the altitude pads', hit.mapClearOfAlt);
    check('minimap fully on screen', hit.mapOnScreen);
    await p.context().close();
  }

  /* rendering stops when the tab is hidden */
  {
    const p = await open(browser);
    await p.click('#start-fly'); await wait(p, 600);
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await wait(p, 1500);
    const a = await p.evaluate(() => window.__gardenDebug.flight().pos.y);
    await wait(p, 1500);
    const b = await p.evaluate(() => window.__gardenDebug.flight().pos.y);
    check('rendering pauses when hidden', Math.abs(a - b) < 0.001, a + ' vs ' + b);
    await p.context().close();
  }

  await browser.close();
  console.log(failures.length ? '\n' + failures.length + ' FAILING: ' + failures.join(', ') : '\nall green');
  process.exit(failures.length ? 1 : 0);
})();
