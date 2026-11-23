import './style.css';
import { bootGame } from './game/boot';
import { SystemToast } from './ui/system-toast';

const toast = new SystemToast();

function registerInstallPrompt(): void {
  let install: (Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }) | null =
    null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    install = event as Event & {
      prompt?: () => Promise<void>;
      userChoice?: Promise<{ outcome: string }>;
    };
    toast.show('INSTALL CLIENT — OFFLINE READY', 'INSTALL', () => {
      void (async () => {
        await install?.prompt?.();
        await install?.userChoice;
        install = null;
        toast.hide();
      })();
    });
  });
  window.addEventListener('appinstalled', () => {
    install = null;
    toast.hide();
  });
}

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
registerInstallPrompt();
registerServiceWorker();
