import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

const PREVIEW_PORT = 5199;
const CDP_PORT = 9231;
const BASE = `http://localhost:${PREVIEW_PORT}/?debug=1`;
const OUT = 'tmp-smoke';
const BROWSER = process.argv.includes('--browser=edge') || process.env.PUNKGUN_BROWSER === 'edge' ? 'edge' : 'chrome';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitHttp(url, timeout = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Not up yet.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function chromePath() {
  const chrome = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  const edge = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ];
  const candidates =
    process.env.CHROME_PATH ? [process.env.CHROME_PATH] :
    platform() === 'win32'
      ? [...(BROWSER === 'edge' ? edge : chrome), ...(BROWSER === 'edge' ? chrome : edge)]
      : platform() === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find((path) => existsSync(path)) ?? null;
}

function killTree(proc) {
  if (!proc?.pid) return;
  if (platform() === 'win32') {
    spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    proc.kill('SIGKILL');
  }
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (message.method) {
        this.events.push(message);
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
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

  on(method, listener) {
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), listener]);
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      const details = result.exceptionDetails;
      throw new Error(
        `${details.text ?? 'page evaluation failed'}: ${
          details.exception?.description ?? details.exception?.value ?? 'no exception detail'
        }`,
      );
    }
    return result.result?.value;
  }
}

async function main() {
  if (!existsSync('dist/index.html')) {
    throw new Error('dist missing. Run `npm run build` first.');
  }
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'],
    { stdio: 'ignore' },
  );
  const chrome = chromePath();
  if (!chrome) {
    server.kill();
    throw new Error('No Chrome/Edge binary found for smoke test.');
  }
  const browserProcess = spawn(
    chrome,
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1365,768',
      `--remote-debugging-port=${CDP_PORT}`,
      '--remote-debugging-address=127.0.0.1',
      `--user-data-dir=${join(process.cwd(), OUT, 'profile')}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let chromeLog = '';
  browserProcess.stderr.on('data', (chunk) => {
    chromeLog += String(chunk);
    if (chromeLog.length > 6000) chromeLog = chromeLog.slice(-6000);
  });
  let socket;
  try {
    await waitHttp(`http://localhost:${PREVIEW_PORT}/index.html`);
    try {
      await waitHttp(`http://127.0.0.1:${CDP_PORT}/json/version`, 30_000);
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nChrome: ${chromeLog}`,
      );
    }
    const target = await fetch(
      `http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(BASE)}`,
      { method: 'PUT' },
    ).then((response) => response.json());
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    const cdp = new Cdp(socket);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    await cdp.send('Performance.enable');
    await cdp.send('Page.bringToFront');
    const errors = [];
    cdp.on('Runtime.exceptionThrown', (event) =>
      errors.push(event.exceptionDetails?.text ?? 'exception'),
    );
    cdp.on('Log.entryAdded', (event) => {
      if (event.entry.level === 'error') errors.push(event.entry.text);
    });
    cdp.on('Runtime.consoleAPICalled', (event) => {
      if (event.type === 'error') {
        errors.push(event.args.map((arg) => arg.value ?? arg.description).join(' '));
      }
    });

    const booted = await (async () => {
      const started = Date.now();
      while (Date.now() - started < 15_000) {
        try {
          if (await cdp.evaluate('window.__punkgunReady === true')) return true;
        } catch {
          // Navigation not committed yet.
        }
        await sleep(200);
      }
      return false;
    })();
    if (!booted) throw new Error('Game never exposed __punkgunReady.');

    const boot = await cdp.evaluate(`(() => ({
      fatal: !document.getElementById('fatal').classList.contains('hidden'),
      hub: !document.getElementById('hub').classList.contains('hidden'),
      canvas: !!document.getElementById('game'),
      contracts: window.__game.contracts.map(c => ({ id: c.id, title: c.title, objective: c.objective, locked: c.locked, boss: c.bossId })),
      saveVersion: JSON.parse(window.__game.profile.exportSave()).version
    }))()`);
    if (boot.fatal) throw new Error('Fatal overlay shown on boot.');
    if (!boot.hub) throw new Error('Hub hidden on boot.');
    if (!boot.canvas) throw new Error('Canvas missing.');
    if (boot.contracts.length < 3) throw new Error('Board has fewer than 3 contracts.');
    if (!boot.contracts[0].title.startsWith('DAILY //')) {
      throw new Error(`Daily contract missing from board: ${boot.contracts[0].title}`);
    }
    if (boot.saveVersion !== 2) throw new Error('Save export is not v2.');

    const tour = await cdp.evaluate(`(() => {
      document.querySelector('[data-act="close-manual"]')?.click();
      const visible = !document.getElementById('overlay-tour').classList.contains('hidden');
      document.querySelector('[data-act="tour-close"]')?.click();
      return visible;
    })()`);
    if (!tour) throw new Error('First-minute safehouse tour failed to open.');

    const started = await cdp.evaluate(`(() => {
      const g = window.__game;
      const contract = g.contracts.find(c => !c.locked && c.objective !== 'boss') ?? g.contracts[0];
      g.launcher.start(contract.id, 'standard');
      return { title: contract.title, objective: contract.objective };
    })()`);
    // Authored contracts open a dialogue with attribute/reputation choices.
    for (let i = 0; i < 20; i++) {
      const snapshot = await cdp.evaluate(
        `(() => ({ dialogue: !!window.__game.dialogueOpen, state: window.__game.state }))()`,
      );
      if (!snapshot.dialogue || snapshot.state === 'playing') break;
      await cdp.evaluate(`(() => {
        const choice = document.querySelector('.dialogue-choice:not([disabled])');
        if (choice) { choice.click(); return; }
        document.querySelector('[data-act="dialogue-next"]')?.click();
      })()`);
      await sleep(120);
    }
    const playing = await (async () => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 30000) {
        const state = await cdp.evaluate(
          `(() => { const g = window.__game; return { state: g.state, time: g.world?.time ?? 0, objective: g.world?.objectiveText?.() ?? '', nodes: g.world?.objectives?.length ?? 0, boons: g.world?.boons ?? [], hud: !document.getElementById('hud').classList.contains('off') }; })()`,
        );
        if (state.state === 'playing' && state.time > 0.05) return state;
        await sleep(150);
      }
      return null;
    })();
    if (!playing) {
      const debug = await cdp.evaluate(
        `(() => { const g = window.__game; return { state: g.state, time: g.world?.time ?? 0, acc: g.acc, briefT: g.briefT, fatal: document.getElementById('fatal-message')?.textContent ?? '', paused: !document.getElementById('overlay-pause').classList.contains('hidden'), hidden: document.visibilityState }; })()`,
      );
      throw new Error(`Mission did not advance: ${started.title}\n${JSON.stringify({ debug, errors })}`);
    }
    if (!playing.hud) throw new Error('HUD not visible during mission.');
    const breach = await cdp.evaluate(`(() => {
      const g = window.__game;
      g.state = 'breach';
      g.breach.open(4242, null, (g.world.seed ^ Math.imul(4242, 0x9e3779b1)) >>> 0);
      const open = !document.getElementById('overlay-breach').classList.contains('hidden');
      for (const step of g.breach.state.solution) {
        document.querySelector('[data-breach="' + step.row + ':' + step.column + '"]')?.click();
      }
      return {
        open,
        closed: document.getElementById('overlay-breach').classList.contains('hidden'),
        state: g.state,
      };
    })()`);
    if (!breach.open || !breach.closed || breach.state !== 'playing') {
      throw new Error(`Breach UI failed: ${JSON.stringify(breach)}`);
    }

    const performanceMetrics = await cdp.send('Performance.getMetrics');
    const metric = (name) =>
      performanceMetrics.metrics.find((entry) => entry.name === name)?.value ?? 0;
    const heapMb = metric('JSHeapUsedSize') / (1024 * 1024);
    if (heapMb > 160) throw new Error(`JS heap over budget: ${heapMb.toFixed(1)} MB`);

    await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))");
    await sleep(250);
    const paused = await cdp.evaluate(
      `(() => ({ state: window.__game.state, pauseVisible: !document.getElementById('overlay-pause').classList.contains('hidden') }))()`,
    );
    if (paused.state !== 'paused' || !paused.pauseVisible) throw new Error('Pause overlay failed: ' + JSON.stringify(paused));
    const locale = await cdp.evaluate(`(() => {
      document.querySelector('[data-act="settings"]')?.click();
      const select = document.getElementById('set-locale');
      select.value = 'es';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const active = document.documentElement.lang;
      const manual = document.getElementById('manual-sections').textContent;
      const tour = document.getElementById('tour-grid').textContent;
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        active,
        esManual: manual.includes('MOVIMIENTO Y COMBATE'),
        esTour: tour.includes('DESPLIEGUE'),
        enManual: document.getElementById('manual-sections').textContent.includes('MOVEMENT & COMBAT'),
      };
    })()`);
    if (!locale.active || locale.active !== 'es' || !locale.esManual || !locale.esTour || !locale.enManual) {
      throw new Error(`Locale switch failed: ${JSON.stringify(locale)}`);
    }
    const remap = await cdp.evaluate(`(() => {
      const button = document.querySelector('[data-remap="KeyR"]');
      button?.click();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', bubbles: true }));
      const changed = window.__game.settings.data.keymap.KeyR;
      document.querySelector('[data-remap="KeyR"]')?.click();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }));
      return { changed, restored: window.__game.settings.data.keymap.KeyR };
    })()`);
    if (remap.changed !== 'KeyT' || remap.restored !== 'KeyR') {
      throw new Error(`Key remap failed: ${JSON.stringify(remap)}`);
    }
    const gamepadMenu = await cdp.evaluate(`(async () => {
      const pad = {
        connected: true,
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0, touched: false })),
      };
      window.__fakePad = pad;
      Object.defineProperty(navigator, 'getGamepads', {
        configurable: true,
        value: () => [pad],
      });
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await wait(140);
      const first = document.activeElement?.textContent ?? '';
      pad.buttons[13] = { pressed: true, value: 1, touched: true };
      await wait(140);
      const second = document.activeElement?.textContent ?? '';
      pad.buttons[13] = { pressed: false, value: 0, touched: false };
      await wait(80);
      delete navigator.getGamepads;
      delete window.__fakePad;
      return { first, second };
    })()`);
    if (!gamepadMenu.first || gamepadMenu.first === gamepadMenu.second) {
      throw new Error(`Gamepad menu focus failed: ${JSON.stringify(gamepadMenu)}`);
    }

    await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))");
    await sleep(200);

    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, 'smoke.png'), Buffer.from(screenshot.data, 'base64'));

    await cdp.evaluate('window.__game.returnToSafehouse()');
    await sleep(250);
    const hub = await cdp.evaluate(
      `(() => ({ state: window.__game.state, hub: !document.getElementById('hub').classList.contains('hidden') }))()`,
    );
    if (hub.state !== 'safehouse' || !hub.hub) throw new Error('Return to safehouse failed.');

    const workbench = await cdp.evaluate(`(() => {
      window.__game.openPanel();
      document.getElementById('sh-workbench').click();
      const open = !document.getElementById('overlay-workbench').classList.contains('hidden');
      document.querySelector('[data-act="close-workbench"]')?.click();
      return open;
    })()`);
    if (!workbench) throw new Error('Workbench station failed to open.');

    const ventures = await cdp.evaluate(`(() => {
      document.getElementById('sh-ventures').click();
      const open = !document.getElementById('overlay-station').classList.contains('hidden')
        && document.getElementById('station-body').textContent.includes('NOODLE STAND');
      document.querySelector('[data-act="close-station"]')?.click();
      return open;
    })()`);
    if (!ventures) throw new Error('Ventures station failed to render.');

    const role = await cdp.evaluate(`(() => {
      window.__game.safehouse.openStation('operator');
      document.querySelector('[data-act="role"][data-id="solo"]')?.click();
      const value = window.__game.profile.data.role;
      document.querySelector('[data-act="close-station"]')?.click();
      return value;
    })()`);
    if (role !== 'solo') throw new Error(`Role selection failed: ${role}`);

    const exchange = await cdp.evaluate(`(() => {
      window.__game.safehouse.openStation('ventures');
      document.querySelector('[data-act="open-exchange"]')?.click();
      const open = !document.getElementById('overlay-station').classList.contains('hidden')
        && document.getElementById('station-body').textContent.includes('THE EXCHANGE')
        && !!document.querySelector('[data-act="stock-buy"]');
      document.querySelector('[data-act="close-station"]')?.click();
      return open;
    })()`);
    if (!exchange) throw new Error('Exchange station failed to render.');

    const sanctuary = await cdp.evaluate(`(() => {
      window.__game.openPanel();
      document.getElementById('sh-sanctuary').click();
      const open = !document.getElementById('overlay-station').classList.contains('hidden')
        && document.getElementById('station-title').textContent.includes('SANCTUARY')
        && !!document.querySelector('.room-diorama');
      document.querySelector('[data-act="close-station"]')?.click();
      return open;
    })()`);
    if (!sanctuary) throw new Error('Sanctuary diorama failed to render.');

    const challenge = await cdp.evaluate(`(() => {
      window.__game.openPanel();
      document.getElementById('sh-deploy').click();
      const options = document.querySelectorAll('[data-act="select-challenge"]');
      document.querySelector('[data-act="select-challenge"][data-id="glass"]')?.click();
      const selected = window.__game.profile.data.challenge;
      document.querySelector('[data-act="close-station"]')?.click();
      return { options: options.length, selected };
    })()`);
    if (challenge.options !== 4 || challenge.selected !== 'glass') {
      throw new Error(`Challenge selector failed: ${JSON.stringify(challenge)}`);
    }

    const armed = await cdp.evaluate(`(() => {
      const g = window.__game;
      g.profile.data.money = 999;
      g.profile.save();
      g.openPanel();
      document.getElementById('sh-new-game-head').click();
      return document.getElementById('sh-new-game-head').textContent;
    })()`);
    if (!armed.includes('CONFIRM')) throw new Error(`New game did not arm: ${armed}`);
    await cdp.evaluate(`document.getElementById('sh-new-game-head').click()`);
    await sleep(250);
    const lifepath = await cdp.evaluate(`(() => ({
      visible: !document.getElementById('overlay-lifepath').classList.contains('hidden'),
      choices: document.querySelectorAll('[data-act="lifepath"]').length,
    }))()`);
    if (!lifepath.visible || lifepath.choices !== 3) {
      throw new Error(`Lifepath chooser failed: ${JSON.stringify(lifepath)}`);
    }
    await cdp.evaluate(
      `document.querySelector('[data-act="lifepath"][data-id="street"]').click()`,
    );
    await sleep(250);
    const bossRush = await cdp.evaluate(`(() => {
      const game = window.__game;
      game.profile.data.finalCleared = true;
      game.returnToSafehouse();
      const contract = game.contracts.find((entry) => entry.bossRush);
      if (!contract) return { found: false };
      game.launcher.start(contract.id, 'standard');
      for (let i = 0; i < 12 && game.dialogueOpen; i++) {
        if (game.dialogueSession?.hasChoices) game.chooseDialogue('sublevel-remember');
        else game.advanceDialogue();
      }
      return {
        found: true,
        locked: contract.locked,
        dialogue: game.dialogueOpen,
        pending: Boolean(game.pendingRun),
        current: game.currentContract?.title,
        state: game.state,
        wave: game.world.bossRushProgress,
        mission: game.world.mission.bossRush,
        intro: document.getElementById('boss-intro-name').textContent,
        introVisible: !document.getElementById('boss-intro').classList.contains('hidden'),
        title: contract.title,
      };
    })()`);
    if (!bossRush.found || bossRush.state !== 'playing' || !bossRush.mission || !bossRush.introVisible || !bossRush.intro) {
      throw new Error(`Boss rush failed: ${JSON.stringify(bossRush)}`);
    }
    const phase = await cdp.evaluate(`(() => {
      const game = window.__game;
      game.onEvent({ type: 'bossPhase', x: 0, y: 0, angle: 0 });
      const visible = !document.getElementById('boss-phase').classList.contains('hidden');
      game.bossPhase.hide();
      return visible;
    })()`);
    if (!phase) throw new Error('Boss phase overlay failed.');
    await cdp.evaluate(`window.__game.returnToSafehouse()`);

    const ending = await cdp.evaluate(`(() => {
      const game = window.__game;
      game.ending.showChoice();
      const visible = !document.getElementById('overlay-ending').classList.contains('hidden');
      const options = document.querySelectorAll('[data-ending]').length;
      game.ending.close();
      return { visible, options };
    })()`);
    if (!ending.visible || ending.options < 3) {
      throw new Error(`Ending overlay failed: ${JSON.stringify(ending)}`);
    }

    const fresh = await cdp.evaluate(`(() => {
      document.querySelector('[data-act="close-manual"]')?.click();
      document.querySelector('[data-act="tour-close"]')?.click();
      return {
        money: window.__game.profile.data.money,
        level: window.__game.profile.data.level,
        lifepath: window.__game.profile.data.lifepath,
        contracts: window.__game.contracts.length,
        hub: !document.getElementById('hub').classList.contains('hidden'),
        lifepathHidden: document.getElementById('overlay-lifepath').classList.contains('hidden'),
      };
    })()`);
    if (
      fresh.money !== 60 ||
      fresh.level !== 1 ||
      fresh.lifepath !== 'street' ||
      fresh.contracts < 3 ||
      !fresh.hub ||
      !fresh.lifepathHidden
    ) {
      throw new Error(`New game reset failed: ${JSON.stringify(fresh)}`);
    }

    const offline = await cdp.evaluate(`(() => {
      window.dispatchEvent(new Event('offline'));
      const root = document.getElementById('system-toast');
      const message = document.getElementById('system-toast-message').textContent;
      const shown = !root.classList.contains('hidden');
      window.dispatchEvent(new Event('online'));
      return { shown, message, hidden: root.classList.contains('hidden') };
    })()`);
    if (!offline.shown || !offline.message.includes('OFFLINE') || !offline.hidden) {
      throw new Error(`Offline toast failed: ${JSON.stringify(offline)}`);
    }

    if (errors.length > 0) throw new Error(`Console errors:\n${errors.join('\n')}`);

    console.log(
      JSON.stringify(
        {
          browser: BROWSER,
          boot: true,
          contracts: boot.contracts.length,
          started,
          playing: { time: Number(playing.time.toFixed(2)), objective: playing.objective, nodes: playing.nodes, boons: playing.boons },
          memory: { heapMb: Number(heapMb.toFixed(1)), nodes: metric('Nodes') },
          breach: true,
          locale: true,
          remap: true,
          paused: true,
          returned: hub.state,
          workbench: true,
          ventures: true,
          role,
          bossRush,
          ending: true,
          phase: true,
          offline: true,
          gamepadMenu: true,
          newGame: fresh,
          screenshot: join(OUT, 'smoke.png'),
        },
        null,
        2,
      ),
    );
    console.log('SMOKE: PASS');
  } finally {
    try {
      socket?.close();
    } catch {
      // Already closed.
    }
    killTree(browserProcess);
    killTree(server);
    await sleep(200);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`SMOKE: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
