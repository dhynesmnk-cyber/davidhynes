# Browser tests

The site has no build and no runtime dependencies. These tests do — Playwright,
installed only here, never shipped (`build.sh` copies just the site files).

```
cd tests && npm init -y && npm i playwright && npx playwright install chromium
```

If a Chromium is already on the machine, skip the download and point at it:
`export CHROME_PATH=/path/to/chrome`.

Serve the site from the repo root, then run whichever script you need:

```
python3 -m http.server 8099          # from the repo root, in another shell
node tests/suite.js                  # functional pass/fail
node tests/flight.js                 # altitude settling behaviour
node tests/perf.js                   # frame times, desktop and phone
node tests/shots.js fly hive text    # screenshots into /tmp
node tests/shots.js --phone projects
```

`BASE_URL` overrides the origin, so the same scripts can be pointed at a
deploy preview once the network allows it.

Everything runs against a software rasteriser in CI-like environments, which
is roughly two frames a second. That is why the scripts speed up the
simulation clock rather than waiting in real time, and why frame numbers from
`perf.js` are only meaningful relative to each other.
