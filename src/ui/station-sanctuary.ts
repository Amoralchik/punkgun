import type { Profile } from '../game/profile';
import { ROOM_UPGRADES, roomCost } from '../game/rooms';
import { t } from '../core/i18n';

function roomDiorama(profile: Profile): string {
  const ranks = profile.data.room;
  const tier = Object.values(ranks).reduce((sum, rank) => sum + rank, 0);
  const on = (id: keyof typeof ranks) => `on-${Math.min(3, ranks[id])}`;
  return `<div class="room-diorama tier-${tier}">
    <div class="room-window ${on('window')}">
      <div class="room-skyline"></div>
      <div class="room-rain"></div>
      <div class="room-traffic"></div>
    </div>
    <div class="room-floor"></div>
    <div class="room-desk"></div>
    <div class="room-med ${on('medbay')}"></div>
    <div class="room-armory ${on('armory')}"></div>
    <div class="room-rack ${on('server')}"></div>
    <div class="room-range ${on('range')}"></div>
    <div class="room-vault ${on('vault')}"></div>
    <div class="room-neon"></div>
  </div>`;
}

export function renderSanctuary(profile: Profile): string {
  const ranks = profile.data.room;
  const cards = ROOM_UPGRADES.map((upgrade) => {
    const rank = ranks[upgrade.id] ?? 0;
    const maxed = rank >= upgrade.maxRank;
    const cost = maxed ? 0 : roomCost(upgrade, rank);
    const dots = Array.from({ length: upgrade.maxRank }, (_, index) =>
      `<i class="${index < rank ? 'filled' : ''}" style="--room:${upgrade.color}"></i>`,
    ).join('');
    return `<div class="room-card${maxed ? ' maxed' : ''}" style="--room:${upgrade.color}">
      <div class="room-card-head">
        <span>${upgrade.name}</span>
        <b>${rank}/${upgrade.maxRank}</b>
      </div>
      <small>${upgrade.kicker}</small>
      <p>${upgrade.desc}</p>
      <div class="room-effect">${upgrade.effect}</div>
      <div class="room-dots">${dots}</div>
      <button data-act="room" data-id="${upgrade.id}" ${maxed ? 'disabled' : ''}>${
        maxed ? 'MAX LEVEL' : `UPGRADE · $${cost}`
      }</button>
    </div>`;
  }).join('');
  return `<div class="station-grid sanctuary-grid">
    <section class="station-col sanctuary-room-col">
      <div class="kicker">// THE ROOM</div>
      <h2>YOUR CORNER OF THE CITY</h2>
      ${roomDiorama(profile)}
      <p class="sh-note">${t('station.note.sanctuary')}</p>
    </section>
    <section class="station-col">
      <div class="kicker">// FIXTURES</div>
      <h2>SAFEHOUSE UPGRADES</h2>
      <div class="room-grid">${cards}</div>
    </section>
  </div>`;
}
