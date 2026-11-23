import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { chromium } from 'playwright';

const PREVIEW_PORT = 5202;
const MINUTES = Number(
  process.argv.find((value) => value.startsWith('--minutes='))?.split('=')[1] ?? 0,
);
const DURATION =
  Number.isFinite(MINUTES) && MINUTES > 0
    ? Math.round(MINUTES * 60_000)
    : Number(process.env.SOAK_MS ?? 60_000);
const HEAP_LIMIT_MB = 160;
const GROWTH_LIMIT_MB = 64;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitHttp(url, timeout = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function killTree(proc) {
  if (!proc?.pid) return;
  if (platform() === 'win32') {
    spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    proc.kill('SIGKILL');
  }
}

async function main() {
  if (!existsSync('dist/index.html')) throw new Error('dist missing. Run `npm run build` first.');
  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'],
    { stdio: 'ignore' },
  );
  let browser;
  try {
    await waitHttp(`http://localhost:${PREVIEW_PORT}/index.html`);
    browser = await chromium
      .launch({ headless: true, channel: 'chrome' })
      .catch(() => chromium.launch({ headless: true }));
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(`http://localhost:${PREVIEW_PORT}/?debug=1`);
    await page.waitForFunction(() => window.__punkgunReady === true, undefined, {
      timeout: 20_000,
    });

    const heap = async () => {
      const metrics = await cdp.send('Performance.getMetrics');
      const bytes = metrics.metrics.find((entry) => entry.name === 'JSHeapUsedSize')?.value ?? 0;
      return bytes / (1024 * 1024);
    };

    const samples = [await heap()];
    const started = Date.now();
    let cycles = 0;
    while (Date.now() - started < DURATION) {
      await page.evaluate(() => {
        const game = window.__game;
        if (game.state !== 'safehouse') game.returnToSafehouse();
        const contract =
          game.contracts.find((entry) => !entry.locked && entry.objective !== 'boss') ??
          game.contracts[0];
        game.launcher.start(contract.id, 'standard');
      });
      for (let i = 0; i < 12; i++) {
        const dialogue = await page.evaluate(() => ({
          open: window.__game.dialogueOpen,
          state: window.__game.state,
        }));
        if (!dialogue.open || dialogue.state === 'playing') break;
        await page.evaluate(() => {
          const choice = document.querySelector('.dialogue-choice:not([disabled])');
          if (choice) {
            choice.click();
            return;
          }
          document.querySelector('[data-act="dialogue-next"]')?.click();
        });
        await sleep(40);
      }
      await page.waitForFunction(
        () => window.__game.state === 'playing' && (window.__game.world?.time ?? 0) > 0.03,
        undefined,
        { timeout: 10_000 },
      );
      await sleep(80);
      if (cycles % 3 === 0) {
        await page.evaluate(() => {
          window.__game.openPanel();
          document.querySelector('[data-act="open-ventures"]')?.click();
          document.querySelector('[data-act="close-station"]')?.click();
          window.__game.closePanel();
        });
      }
      await page.evaluate(() => window.__game.returnToSafehouse());
      cycles++;
      if (cycles % 5 === 0) samples.push(await heap());
    }
    samples.push(await heap());

    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const growth = max - min;
    if (errors.length > 0) throw new Error(`Console errors:\n${errors.join('\n')}`);
    if (max > HEAP_LIMIT_MB) throw new Error(`JS heap ${max.toFixed(1)} MB exceeds ${HEAP_LIMIT_MB} MB`);
    if (growth > GROWTH_LIMIT_MB) {
      throw new Error(`JS heap grew ${growth.toFixed(1)} MB, over ${GROWTH_LIMIT_MB} MB`);
    }
    console.log(
      JSON.stringify(
        {
          durationSeconds: Math.round(DURATION / 1000),
          cycles,
          samples: samples.map((value) => Number(value.toFixed(1))),
          heapMb: { min: Number(min.toFixed(1)), max: Number(max.toFixed(1)), growth: Number(growth.toFixed(1)) },
          errors: 0,
        },
        null,
        2,
      ),
    );
    console.log('SOAK: PASS');
  } finally {
    try {
      await browser?.close();
    } catch {
      // Already closed.
    }
    killTree(server);
    await sleep(200);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`SOAK: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
