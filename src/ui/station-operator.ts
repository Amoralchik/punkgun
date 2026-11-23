import { fmtTime } from '../core/math';
import { getLocale, t } from '../core/i18n';
import { Profile } from '../game/profile';
import { ATTRIBUTE_DEFS, APPROACHES, approachRequirement, approachUnlocked } from '../game/attributes';
import { CYBERWARE_DEFS, PERK_DEFS } from '../game/progression';
import { FACTIONS } from '../game/lore';
import { nextRepRank, repDiscount, repPayBonus, repSellBonus } from '../game/reputation';
import { chapterProgress } from '../game/campaign';
import { BOSSES, BOSS_ORDER } from '../game/bosses';
import { ENDINGS } from '../game/endings';
import { ROLES } from '../game/roles';
import { ATTACHMENT_MAP } from '../game/attachments';
import { CHALLENGE_MAP } from '../game/challenges';

/** Operator sheet body; actions remain in the Safehouse controller. */
export function renderOperator(profile: Profile): string {
  const data = profile.data;
  const es = getLocale() === 'es';
  const mods = profile.runMods();
  const attrs = data.attributes;
  const attrRows = ATTRIBUTE_DEFS.map(
    (def) => `<div class="op-attr" style="--attr:${def.color}">
      <span>${def.name}</span><b>${attrs[def.id]}</b><small>${es ? def.shortEs : def.short}</small>
    </div>`,
  ).join('');
  const approachRows = APPROACHES.map((a) => {
    const ok = approachUnlocked(a, attrs);
    return `<div class="op-approach${ok ? '' : ' locked'}" style="--approach:${a.color}">
      <span>${a.name}</span><b>${ok ? 'READY' : approachRequirement(a)}</b>
    </div>`;
  }).join('');
  const repRows = (Object.keys(FACTIONS) as (keyof typeof FACTIONS)[])
    .map((id) => {
      const faction = FACTIONS[id];
      const rep = profile.rep(id);
      const rank = profile.repRank(id);
      const next = nextRepRank(rep);
      const discount = Math.round(repDiscount(rep) * 100);
      const pay = Math.round(repPayBonus(rep) * 100);
      return `<div class="op-rep" style="--faction:${faction.color}">
        <div class="op-rep-name">${faction.name}<b>${rank.name}</b></div>
        <div class="op-rep-meta">${rep} REP · PAY +${pay}%${
          id === 'market'
            ? ` · MARKET -${discount}%`
            : id === 'helix'
              ? ` · CYBER -${discount}%`
              : id === 'teeth'
                ? ` · SELL +${Math.round(repSellBonus(rep) * 100)}%`
                : id === 'sublevel'
                  ? ` · CLINIC -${discount}%`
                  : ''
        }</div>
        <div class="op-rep-bar"><i style="width:${next ? Math.min(100, (rep / next.rank.min) * 100) : 100}%"></i></div>
        <small>${next ? `${next.remaining} TO ${next.rank.name}` : 'MAX STANDING'}</small>
      </div>`;
    })
    .join('');
  const installed = [
    ...CYBERWARE_DEFS.filter((d) => data.cyberware[d.id] > 0).map(
      (d) => `${d.name} ${data.cyberware[d.id]}/${d.maxRank}`,
    ),
    ...PERK_DEFS.filter((d) => data.perks[d.id] > 0).map(
      (d) => `${d.name} ${data.perks[d.id]}/${d.maxRank}`,
    ),
  ];
  const progress = chapterProgress(profile);
  const chapterName = progress.def?.name ?? 'FINALE';
  const gateName = progress.def ? BOSSES[progress.def.gateBoss].name : 'THE BOARD';
  const bossLine = BOSS_ORDER.map(
    (id) => `${BOSSES[id].name.split(' ')[0]} ${data.bossesCleared[id] ? '✓' : '×'}`,
  ).join(' · ');
  const ending = data.ending ? ENDINGS[data.ending] : null;
  const roleRows = ROLES.map((role) => {
    const active = data.role === role.id;
    return `<button class="op-role${active ? ' selected' : ''}" style="--role:${role.color}"
      data-act="role" data-id="${role.id}">
      <span class="op-role-code">${role.code}</span>
      <b>${role.name}</b>
      <small>${es ? role.blurbEs : role.blurb}</small>
      <span class="op-role-state">${active ? 'ACTIVE' : 'SELECT'}</span>
    </button>`;
  }).join('');
  const rankValue: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };
  const historyRows = [...data.runHistory]
    .sort((a, b) => (rankValue[b.rank] ?? 0) - (rankValue[a.rank] ?? 0) || a.time - b.time)
    .slice(0, 6)
    .map(
      (run, index) => `<div class="op-run">
        <span><b>${String(index + 1).padStart(2, '0')}</b> ${run.title}</span>
        <small>${run.success ? `${run.rank} · ${fmtTime(run.time)} · $${run.payout}` : `DEAD · ${fmtTime(run.time)}`}${
          run.daily ? ' · DAILY' : ''
        }${run.challenge !== 'standard' ? ` · ${CHALLENGE_MAP[run.challenge].name}` : ''}</small>
      </div>`,
    )
    .join('');
  const slots = Profile.listSlots();
  const slotRows = slots
    .map(
      (slot) => `<button class="op-slot${slot.slot === profile.slot ? ' selected' : ''}"
        data-act="switch-slot" data-id="${slot.slot}">
        <b>SLOT ${slot.slot}${slot.slot === profile.slot ? ' · ACTIVE' : ''}</b>
        <span>${slot.exists ? `LVL ${slot.level ?? '?'} · $${slot.money ?? 0} · ${slot.savedAt ? new Date(slot.savedAt).toLocaleDateString() : 'UNKNOWN'}` : 'EMPTY'}</span>
      </button>`,
    )
    .join('');
  const presetRows = data.presets
    .map((preset, index) => {
      const label = preset
        ? `${preset.name}${preset.attachment ? ` · ${ATTACHMENT_MAP[preset.attachment].name}` : ''}`
        : 'EMPTY';
      return `<div class="op-preset${preset ? '' : ' empty'}">
        <span><b>0${index + 1}</b> ${label}</span>
        <span class="op-preset-actions">
          <button data-act="preset-load" data-index="${index}" ${preset ? '' : 'disabled'}>EQUIP</button>
          <button data-act="preset-save" data-index="${index}">SAVE</button>
          ${preset ? `<button data-act="preset-clear" data-index="${index}">CLEAR</button>` : ''}
        </span>
      </div>`;
    })
    .join('');
  return `
        <div class="station-grid operator-grid">
          <section class="station-col">
            <div class="kicker">// BUILD</div>
            <h2>ATTRIBUTES</h2>
            <div class="op-attrs">${attrRows}</div>
            <p class="sh-note">${t('station.note.operatorAttr', { count: data.attributePoints })}</p>
            <h2>DERIVED</h2>
            <div class="op-stats">
              <span>ARMOR <b>${mods.armor}</b></span>
              <span>SPEED <b>${Math.round(mods.speed * 100)}%</b></span>
              <span>GUN CD <b>${Math.round(mods.gunCooldown * 100)}%</b></span>
              <span>SPREAD <b>${Math.round(mods.spread * 100)}%</b></span>
              <span>DETECTION <b>${Math.round(mods.vision * 100)}%</b></span>
              <span>MELEE <b>${Math.round(mods.meleeReach * 100)}%</b></span>
            </div>
            <h2>INSERTION</h2>
            <div class="op-approaches">${approachRows}</div>
          </section>
          <section class="station-col">
            <div class="kicker">// STANDING</div>
            <h2>FACTIONS</h2>
            <div class="op-reps">${repRows}</div>
            <h2>OPERATOR ROLE</h2>
            <div class="op-roles">${roleRows}</div>
            <h2>PROGRESS</h2>
            <div class="op-progress">
              <span>CHAPTER <b>${chapterName}</b></span>
              <span>GATE <b>${progress.bossDefeated ? 'CLEARED' : `${gateName} · ${data.regularClears}/${progress.requiredClears}`}</b></span>
              <span>BOSSES <b>${bossLine}</b></span>
              <span>FINALE <b>${data.finalCleared ? 'CLEARED' : data.bossesCleared.crane ? 'UNLOCKED' : 'LOCKED'}</b></span>
              <span>ENDING <b>${ending ? ending.title : 'UNCHOSEN'}</b></span>
              <span>RUNS <b>${data.runs}</b></span>
              <span>CLEARS <b>${data.clears}</b></span>
              <span>BEST <b>${data.bestTime === null ? '—' : fmtTime(data.bestTime)}</b></span>
            </div>
            <h2>RUN HISTORY</h2>
            <div class="op-history">${
              historyRows || `<span class="sh-note">${t('station.note.operatorHistory')}</span>`
            }</div>
            <h2>INSTALLED</h2>
            <div class="op-installed">${
              installed.length
                ? installed.map((x) => `<span>${x}</span>`).join('')
                : '<span>NO AUGMENTS INSTALLED</span>'
            }</div>
            <h2>LOADOUT PRESETS</h2>
            <div class="op-presets">${presetRows}</div>
            <p class="sh-note">${t('station.note.operatorPresets')}</p>
            <h2>SAVE SLOTS</h2>
            <div class="op-slots">${slotRows}</div>
            <h2>SAVE DATA</h2>
            <div class="op-save">
              <button type="button" data-act="export-save">EXPORT SAVE</button>
              <button type="button" data-act="import-save">IMPORT SAVE</button>
            </div>
            <p class="sh-note">${t('station.note.operatorSave')}</p>
          </section>
        </div>`;
}

