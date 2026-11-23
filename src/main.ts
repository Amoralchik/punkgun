import './style.css';
import { bootGame } from './game/boot';
import { SystemToast } from './ui/system-toast';

const toast = new SystemToast();

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

bootGame(document.getElementById('game') as HTMLCanvasElement);
registerServiceWorker();
