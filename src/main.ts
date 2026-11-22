import './style.css';
import { Game } from './game/game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const fatalRoot = document.getElementById('fatal')!;
const fatalMessage = document.getElementById('fatal-message')!;
const fatalReload = document.getElementById('fatal-reload') as HTMLButtonElement;

let running = true;

function fatal(message: string): void {
  if (!running) return;
  running = false;
  fatalMessage.textContent = message;
  fatalRoot.classList.remove('hidden');
  fatalReload.focus();
}

fatalReload.addEventListener('click', () => window.location.reload());

function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
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

  if (import.meta.env.DEV) {
    (window as unknown as { __game: Game }).__game = game;
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
