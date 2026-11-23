import type { Profile } from '../game/profile';
import { FACTION_OFFERS } from '../game/faction-stock';
import { FACTIONS } from '../game/lore';
import { NAMED_MAP, WEAPONS } from '../game/weapons';
import { t } from '../core/i18n';

export interface MarketParts {
  shop: string;
  stash: string;
  contraband: string;
  intel: string;
}

/** Market station body; purchases and sales stay in the Safehouse controller. */
export function renderMarket(profile: Profile, parts: MarketParts): string {
  const policy = profile.data.insurance;
  const premium = profile.insurancePremium();
  const insurance = policy
    ? `<div class="insurance-card active">
        <span>POLICY ACTIVE</span>
        <b>${WEAPONS[policy.weapon].name} · PREMIUM $${policy.premium}</b>
        <button data-act="cancel-insurance">CANCEL POLICY</button>
      </div>`
    : `<div class="insurance-card">
        <span>INSURE EQUIPPED WEAPON</span>
        <b>${premium > 0 ? `PREMIUM $${premium}` : 'EQUIP A WEAPON FIRST'}</b>
        <button data-act="buy-insurance" ${premium > 0 ? '' : 'disabled'}>BUY POLICY</button>
      </div>`;
  const factionStock = FACTION_OFFERS.map((offer) => {
    const rep = profile.rep(offer.faction);
    const unlocked = rep >= offer.requiredRep;
    const price = Math.max(
      1,
      Math.round(profile.namedPrice(offer.named) * (1 - offer.discount)),
    );
    return `<div class="sh-item${unlocked ? '' : ' locked'}">
      <div class="info">
        <span class="wname" style="color:${FACTIONS[offer.faction].color}">${NAMED_MAP[offer.named].name}</span>
        <span class="wmeta">${FACTIONS[offer.faction].name} · ${offer.requiredRep} REP · <b>$${price}</b></span>
        <span class="wmeta">${offer.desc}</span>
      </div>
      <div class="sh-actions">
        <button data-act="faction-offer" data-id="${offer.id}" ${unlocked ? '' : 'disabled'}>${
          unlocked ? 'BUY' : 'LOCKED'
        }</button>
      </div>
    </div>`;
  }).join('');
  return `
    <div class="station-grid">
      <section class="station-col">
        <div class="kicker">// BLACK MARKET</div>
        <h2>WEAPONS</h2>
        <div class="sh-list">${parts.shop}</div>
        <h2>SELL STORAGE</h2>
        <div class="sh-list">${parts.stash}</div>
      </section>
      <section class="station-col">
        <h2>CONTRABAND</h2>
        <div class="sh-list">${parts.contraband}</div>
        <button class="sh-augments station-reroll" data-act="refresh-market">ROTATE STOCK · $${profile.marketRefreshCost()}</button>
        <h2>INSURANCE</h2>
        ${insurance}
        <h2>FACTION BROKER</h2>
        <div class="sh-list">${factionStock}</div>
        <button class="sh-augments" data-act="open-exchange">OPEN THE EXCHANGE</button>
        <p class="sh-note">${parts.intel}</p>
        <p class="sh-note">${t('station.note.market')}</p>
      </section>
    </div>`;
}
