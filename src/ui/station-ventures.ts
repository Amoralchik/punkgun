import type { Profile } from '../game/profile';
import {
  VENTURES,
  VENTURE_MAP,
  ventureCost,
  ventureIncome,
  venturePayMult,
} from '../game/ventures';

/** Ventures station body; actions stay in the Safehouse controller. */
export function renderVentures(profile: Profile): string {
  const ranks = profile.data.ventures;
  const income = ventureIncome(ranks);
  const pay = Math.round((venturePayMult(ranks) - 1) * 100);
  const pending = profile.pendingVentureEvent();
  const eventCard = pending
    ? `<div class="venture-event" style="--venture:${VENTURE_MAP[pending.venture].color}">
        <div class="kicker">// STREET EVENT</div>
        <h2>${pending.title}</h2>
        <p>${pending.text}</p>
        <div class="venture-event-actions">
          ${pending.choices
            .map(
              (choice) =>
                `<button data-act="venture-event" data-id="${choice.id}">${choice.label}</button>`,
            )
            .join('')}
        </div>
      </div>`
    : '';
  const cards = VENTURES.map((venture) => {
    const rank = ranks[venture.id] ?? 0;
    const maxed = rank >= venture.maxLevel;
    const cost = maxed ? 0 : ventureCost(venture, rank);
    return `<div class="venture-card${maxed ? ' maxed' : ''}" style="--venture:${venture.color}">
      <div class="venture-top">
        <span>${venture.name}</span>
        <b>${rank}/${venture.maxLevel}</b>
      </div>
      <small>${venture.tagline}</small>
      <p>${venture.desc}</p>
      <div class="venture-effect">${venture.effect}</div>
      <button data-act="venture" data-id="${venture.id}" ${maxed ? 'disabled' : ''}>${
        maxed ? 'MAX LEVEL' : `INVEST $${cost}`
      }</button>
    </div>`;
  }).join('');
  return `
    <div class="station-grid">
      <section class="station-col">
        <div class="kicker">// STREET BUSINESS</div>
        <h2>FRONTS &amp; INCOME</h2>
        <div class="venture-grid">${cards}</div>
      </section>
      <section class="station-col">
        ${eventCard}
        <div class="kicker">// LEDGER</div>
        <h2>MONTHLY TAKE</h2>
        <div class="op-progress">
          <span>PASSIVE PER CLEAR <b>$${income}</b></span>
          <span>CONTRACT BONUS <b>+${pay}%</b></span>
        </div>
        <p class="sh-note">Businesses pay after every clean extraction. Upgrades compound through three ranks.</p>
        <p class="sh-note">Bars move faction standing. Clinics cut prices. Chop shops feed the fabricator.</p>
        <button class="sh-augments" data-act="open-exchange">OPEN THE EXCHANGE</button>
      </section>
    </div>`;
}
