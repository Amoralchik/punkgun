import type { FactionId } from './lore';
import type { NamedWeaponId } from './weapons';

export interface FactionOffer {
  id: string;
  faction: FactionId;
  named: NamedWeaponId;
  requiredRep: number;
  discount: number;
  desc: string;
}

export const FACTION_OFFERS: FactionOffer[] = [
  {
    id: 'helix-kensei',
    faction: 'helix',
    named: 'kensei',
    requiredRep: 5,
    discount: 0.1,
    desc: 'Executive security issue. The stock is clean, the serial is filed off.',
  },
  {
    id: 'teeth-hangman',
    faction: 'teeth',
    named: 'hangman',
    requiredRep: 5,
    discount: 0.12,
    desc: 'A Teeth trophy gun with a porcelain grip and a short memory.',
  },
  {
    id: 'orbit-widowmaker',
    faction: 'orbit',
    named: 'widowmaker',
    requiredRep: 5,
    discount: 0.12,
    desc: 'Container-grade shotgun. Low Orbit moves them by the crate.',
  },
  {
    id: 'sublevel-sunlance',
    faction: 'sublevel',
    named: 'sunlance',
    requiredRep: 9,
    discount: 0.08,
    desc: 'A prototype that should not exist. The vendor does not ask why you want it.',
  },
  {
    id: 'market-vesper',
    faction: 'market',
    named: 'vesper',
    requiredRep: 5,
    discount: 0.1,
    desc: 'Night Market special. Suppressed, balanced, and completely unregistered.',
  },
];

export const FACTION_OFFER_MAP: Record<string, FactionOffer> = Object.fromEntries(
  FACTION_OFFERS.map((offer) => [offer.id, offer]),
);
