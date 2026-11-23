import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { platform } from 'node:os';
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

const PREVIEW_PORT = 5201;
const OUT = 'tmp-smoke';
const BROWSERS = { chromium, firefox, webkit };
const arg = process.argv.find((value) => value.startsWith('--browser='));
const name = arg ? arg.split('=')[1] : 'firefox';
const launcher = BROWSERS[name];
if (!launcher) throw new Error(`Unknown browser: ${name}`);

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
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'],
    { stdio: 'ignore' },
  );
  let browser;
  try {
    await waitHttp(`http://localhost:${PREVIEW_PORT}/index.html`);
    browser = await launcher.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`http://localhost:${PREVIEW_PORT}/?debug=1`);
    await page.waitForFunction(() => window.__punkgunReady === true, undefined, {
      timeout: 20_000,
    });
    const boot = await page.evaluate(() => ({
      fatal: !document.getElementById('fatal').classList.contains('hidden'),
      hub: !document.getElementById('hub').classList.contains('hidden'),
      contracts: window.__game.contracts.length,
    }));
    if (boot.fatal) throw new Error('Fatal overlay shown on boot.');
    if (!boot.hub) throw new Error('Hub hidden on boot.');
    if (boot.contracts < 3) throw new Error('Board has fewer than 3 contracts.');

    const started = await page.evaluate(() => {
      const game = window.__game;
      const contract =
        game.contracts.find((entry) => !entry.locked && entry.objective !== 'boss') ??
        game.contracts[0];
      game.launcher.start(contract.id, 'standard');
      return { title: contract.title, objective: contract.objective };
    });
    for (let i = 0; i < 20; i++) {
      const snapshot = await page.evaluate(() => ({
        dialogue: window.__game.dialogueOpen,
        state: window.__game.state,
      }));
      if (!snapshot.dialogue || snapshot.state === 'playing') break;
      await page.evaluate(() => {
        const choice = document.querySelector('.dialogue-choice:not([disabled])');
        if (choice) {
          choice.click();
          return;
        }
        document.querySelector('[data-act="dialogue-next"]')?.click();
      });
      await sleep(150);
    }
    await page.waitForFunction(
      () => window.__game.state === 'playing' && (window.__game.world?.time ?? 0) > 0.05,
      undefined,
      { timeout: 20_000 },
    );
    const playing = await page.evaluate(() => ({
      time: window.__game.world.time,
      objective: window.__game.world.objectiveText(),
      boons: window.__game.world.boons,
    }));
    await page.screenshot({ path: join(OUT, `${name}.png`) });
    if (errors.length > 0) throw new Error(`Console errors:\n${errors.join('\n')}`);
    console.log(
      JSON.stringify(
        {
          browser: name,
          boot: true,
          contracts: boot.contracts,
          started,
          playing: { time: Number(playing.time.toFixed(2)), objective: playing.objective, boons: playing.boons },
          screenshot: join(OUT, `${name}.png`),
        },
        null,
        2,
      ),
    );
    console.log(`SMOKE:${name.toUpperCase()}: PASS`);
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
    console.error(`SMOKE:${name.toUpperCase()}: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
