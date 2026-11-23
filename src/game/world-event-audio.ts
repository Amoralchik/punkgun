import type { AudioEngine } from '../core/audio';
import type { WorldEvent } from './world-types';

/** Audio-only world events; returns true when the event is fully handled. */
export function playWorldEventAudio(event: WorldEvent, audio: AudioEngine): boolean {
  switch (event.type) {
    case 'pistol':
      audio.shot(false);
      return true;
    case 'shotgun':
      audio.shot(true);
      return true;
    case 'shot-smg':
      audio.smgShot();
      return true;
    case 'shot-rifle':
      audio.rifleShot();
      return true;
    case 'shot-ak':
      audio.akShot();
      return true;
    case 'shot-lmg':
      audio.lmgShot();
      return true;
    case 'shot-revolver':
      audio.revolverShot();
      return true;
    case 'shot-carbine':
      audio.carbineShot();
      return true;
    case 'shot-needler':
      audio.needlerShot();
      return true;
    case 'shot-dmr':
      audio.dmrShot();
      return true;
    case 'shot-plasma':
      audio.plasmaShot();
      return true;
    case 'shot-railgun':
      audio.railgunShot();
      return true;
    case 'armorHitEnemy':
      audio.shieldHit();
      return true;
    case 'armorBreakEnemy':
      audio.bossHit();
      return true;
    case 'enemyShot':
    case 'enemyShotgun':
      audio.enemyShot();
      return true;
    case 'swing':
      audio.swing();
      return true;
    case 'punch':
    case 'enemyPunch':
      audio.punch();
      return true;
    case 'biomonitor':
      audio.biomonitor();
      return true;
    case 'suppressedShot':
      audio.suppressedShot(false);
      return true;
    case 'suppressedShotgun':
      audio.suppressedShot(true);
      return true;
    case 'loot':
      audio.loot();
      return true;
    case 'loudBreach':
      audio.siren();
      return true;
    case 'doorSlam':
      audio.doorSlam();
      return true;
    case 'doorOpen':
      audio.doorOpen();
      return true;
    case 'pickup':
      audio.pickup();
      return true;
    case 'throw':
      audio.throwSfx();
      return true;
    case 'empty':
      audio.empty();
      return true;
    case 'bossWeakHit':
      audio.bossHit();
      audio.explosion();
      return true;
    case 'stim':
      audio.stim();
      return true;
    case 'smoke':
      audio.smoke();
      return true;
    case 'fragThrow':
      audio.fragThrow();
      return true;
    case 'explosion':
      audio.explosion();
      return true;
    case 'sniperShot':
      audio.sniperShot();
      return true;
    case 'sandevistan':
      audio.sandevistan();
      return true;
    case 'camo':
      audio.camo();
      return true;
    case 'emp':
    case 'deck':
      audio.emp();
      return true;
    case 'berserk':
      audio.berserk();
      return true;
    case 'overclock':
      audio.overclock();
      return true;
    case 'camoBreak':
      audio.camoBreak();
      return true;
    case 'dash':
      audio.dash();
      return true;
    case 'glassBreak':
      audio.glassBreak();
      return true;
    case 'houndLeap':
      audio.houndLeap();
      return true;
    case 'siren':
      audio.siren();
      return true;
    case 'shieldHit':
      audio.shieldHit();
      return true;
    case 'bossHit':
      audio.bossHit();
      return true;
    case 'bossShock':
      audio.explosion();
      return true;
    case 'bossCharge':
      audio.alert();
      return true;
    case 'reloadStart':
      audio.reloadStart();
      return true;
    case 'reloadEnd':
      audio.reloadEnd();
      return true;
    case 'reloadCancel':
      audio.reloadCancel();
      return true;
    case 'alert':
    case 'bodyFound':
    case 'cameraAlert':
      audio.alert();
      return true;
    case 'cameraBroken':
    case 'turretBroken':
    case 'laserBroken':
      audio.shieldHit();
      return true;
    case 'turretShot':
      audio.enemyShot();
      return true;
    case 'laserHit':
      audio.shieldHit();
      return true;
    case 'operatorDeploy':
      audio.alert();
      return true;
    default:
      return false;
  }
}
