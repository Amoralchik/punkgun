// Visual QA: open every menu/overlay in headless Chrome and screenshot it
// into tmp-menus/. Not a pass/fail test — a review aid for UI passes.
//   npm run build && node scripts/menu-shots.mjs [--width=1365 --height=768]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const WIDTH = arg('width', 1365);
const HEIGHT = arg('height', 768);
const PREVIEW_PORT = 5198;
const CDP_PORT = 9232;
const OUT = 'tmp-menus';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHttp(url, timeout = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function chromePath() {
  const candidates = process.env.CHROME_PATH
    ? [process.env.CHROME_PATH]
    : platform() === 'win32'
      ? [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        ]
      : platform() === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium'];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function killTree(proc) {
  if (!proc?.pid) return;
  if (platform() === 'win32') spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  else proc.kill('SIGKILL');
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    return res.result?.value;
  }
}

/** Each step: setup JS (may be async), then a capture named `name`. */
const STEPS = [
  ['tour', `1`],
  ['room', `document.querySelector('[data-act="tour-skip"], [data-act="skip-tour"]')?.click(); [...document.querySelectorAll('button')].find((b) => /skip tour/i.test(b.textContent))?.click(); 1`],
  ['terminal-contracts', `window.__game.openPanel(); 1`],
  ['terminal-gear', `document.querySelector('.sh-tab[data-tab="gear"]').click(); 1`],
  ['terminal-market', `document.querySelector('.sh-tab[data-tab="market"]').click(); 1`],
  ['terminal-record', `document.querySelector('.sh-tab[data-tab="record"]').click(); 1`],
  ['case', `document.querySelector('.sh-tab[data-tab="contracts"]').click(); document.getElementById('sh-case').click(); 1`],
  ['workbench', `(async () => {
    document.querySelector('[data-act="close-case"]')?.click();
    const g = window.__game; g.profile.data.money = 5000;
    document.querySelector('.sh-tab[data-tab="market"]').click();
    const buy = [...document.querySelectorAll('#sh-shop button')].find((b) => /BUY/.test(b.textContent));
    buy?.click();
    await new Promise((r) => setTimeout(r, 120));
    document.getElementById('sh-workbench').click();
    return 1; })()`],
  ['clinic', `document.getElementById('wb-close')?.click(); window.__game.safehouse.openStation('clinic'); 1`],
  ['station-contracts', `document.querySelector('[data-act="close-augments"]')?.click(); window.__game.safehouse.openStation('contracts'); 1`],
  ['station-market', `window.__game.safehouse.openStation('market'); 1`],
  ['station-supplies', `window.__game.safehouse.openStation('supplies'); 1`],
  ['station-archive', `window.__game.safehouse.openStation('archive'); 1`],
  ['station-fabricator', `window.__game.safehouse.openStation('fabricator'); 1`],
  ['station-operator', `window.__game.safehouse.openStation('operator'); 1`],
  ['station-sanctuary', `window.__game.safehouse.openStation('sanctuary'); 1`],
  ['station-ventures', `window.__game.safehouse.openVentures(); 1`],
  ['station-deploy', `window.__game.safehouse.openDeploy(); 1`],
  ['lifepath', `document.querySelector('[data-act="close-station"]')?.click(); window.__game.openPanel(); document.querySelector('.sh-tab[data-tab="record"]').click(); document.getElementById('sh-new-game').click(); 1`],
  ['manual', `document.querySelector('[data-act="lifepath-cancel"]')?.click(); document.getElementById('sh-manual').click(); 1`],
  ['brief', `(async () => {
    document.querySelector('[data-act="close-manual"], #manual-close')?.click();
    const g = window.__game;
    document.querySelector('[data-act="close-panel"]')?.click();
    await new Promise((r) => setTimeout(r, 200));
    const c = g.contracts.find((x) => !x.locked && x.authored) ?? g.contracts.find((x) => !x.locked);
    g.launcher.start(c.id, 'standard');
    return 1; })()`],
  ['dialogue', `1`],
  ['run-hud', `(async () => {
    const g = window.__game;
    for (let i = 0; i < 20 && g.dialogueOpen; i++) {
      const ch = document.querySelector('.dialogue-choice:not([disabled])');
      if (ch) ch.click(); else document.querySelector('[data-act="dialogue-next"]')?.click();
      await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 2600));
    return 1; })()`],
  ['pause', `window.__game.pauseGame(); 1`],
  ['pause-settings', `document.querySelector('#overlay-pause [data-act="settings"]').click(); 1`],
  ['breach', `(() => { const g = window.__game; g.resumeGame(); const w = g.world; w.emit({ type: 'breachStart', x: w.player.x, y: w.player.y, angle: 0, nodeId: 1, hazard: 'camera' }); return 1; })()`],
  ['death', `(async () => {
    const g = window.__game; document.querySelector('#overlay-breach [data-act="breach-abort"], #overlay-breach [data-act="close-breach"]')?.click();
    g.breach?.close?.(); g.state = 'playing';
    const w = g.world; w.player.invulnT = 0; w.player.armor = 0; w.killPlayer(0);
    await new Promise((r) => setTimeout(r, 2200));
    return 1; })()`],
];

async function main() {
  if (!existsSync('dist/index.html')) throw new Error('Run `npm run build` first.');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], { stdio: 'ignore' });
  const chrome = chromePath();
  if (!chrome) throw new Error('No Chrome/Edge found.');
  const browser = spawn(chrome, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    `--window-size=${WIDTH},${HEIGHT}`, `--remote-debugging-port=${CDP_PORT}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${join(process.cwd(), OUT, 'profile')}`, 'about:blank',
  ], { stdio: 'ignore' });
  let socket;
  const report = [];
  try {
    await waitHttp(`http://localhost:${PREVIEW_PORT}/index.html`);
    await waitHttp(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const target = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(`http://localhost:${PREVIEW_PORT}/?debug=1`)}`, { method: 'PUT' }).then((r) => r.json());
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); });
    const cdp = new Cdp(socket);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    for (let i = 0; i < 100; i++) {
      try { if (await cdp.evaluate('window.__punkgunReady === true')) break; } catch { /* loading */ }
      await sleep(200);
    }
    for (const [name, js] of STEPS) {
      try {
        await cdp.evaluate(js);
        await sleep(450);
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT, `${name}.png`), Buffer.from(shot.data, 'base64'));
        const open = await cdp.evaluate(`[...document.querySelectorAll('.overlay:not(.hidden)')].map((e) => e.id).join(',')`);
        report.push(`${name}: ok [${open}]`);
      } catch (error) {
        report.push(`${name}: FAILED ${error.message.split('\n')[0]}`);
      }
    }
  } finally {
    socket?.close();
    killTree(browser);
    killTree(server);
  }
  console.log(report.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
