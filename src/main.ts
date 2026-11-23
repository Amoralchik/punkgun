import './style.css';
import { Game } from './game/game';
import { SystemToast } from './ui/system-toast';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const fatalRoot = document.getElementById('fatal')!;
const fatalMessage = document.getElementById('fatal-message')!;
const fatalReload = document.getElementById('fatal-reload') as HTMLButtonElement;

let running = true;
const toast = new SystemToast();

function fatal(message: string): void {
  if (!running) return;
  running = false;
  fatalMessage.textContent = message;
  fatalRoot.classList.remove('hidden');
  fatalReload.focus();
}

fatalReload.addEventListener('click', () => window.location.reload());

function registerServiceWorker(): void {
  const hadController = !!navigator.serviceWorker?.controller;
  window.addEventListener('offline', () => {
    toast.show('OFFLINE — CACHED SHELL ACTIVE', null, null);
  });
  window.addEventListener('online', () => {
    if (toast.visible) toast.hide();
  });
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      toast.show('UPDATE READY — RELOAD TO APPLY', 'RELOAD', () => window.location.reload());
    }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => console.warn('PUNKGUN offline worker registration failed', error));
  });
}

function boot(): void {
  let game: Game;
  try {
    game = new Game(canvas);
  } catch (error) {
    console.error('PUNKGUN boot failed', error);
    fatal('THE CLIENT COULD NOT START. CHECK WEBGL SUPPORT AND RELOAD.');
    return;
  }

  if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
    // Named debug surface: smoke tests read the running game only behind DEV or ?debug=1.
    const debugWindow = window as Window & { __game?: Game; __punkgunReady?: boolean };
    debugWindow.__game = game;
    debugWindow.__punkgunReady = true;
  }

  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      fatal('THE GPU CONTEXT WAS LOST. RELOAD TO RECOVER THE RUN.');
    },
    false,
  );

  window.addEventListener('error', (event) => {
    console.error('PUNKGUN runtime error', event.error ?? event.message);
    fatal('A RUNTIME ERROR STOPPED THE CLIENT. RELOAD TO RECOVER.');
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('PUNKGUN unhandled rejection', event.reason);
    fatal('A BACKGROUND TASK FAILED. RELOAD TO RECOVER.');
  });

  let last = performance.now();
  function loop(now: number): void {
    if (!running) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      game.frame(dt);
    } catch (error) {
      console.error('PUNKGUN frame failed', error);
      fatal('THE SIMULATION STOPPED. RELOAD TO RECOVER.');
      return;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();
registerServiceWorker();
