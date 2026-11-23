import type { Contract } from '../game/missions';
import { FACTIONS, handlerLine } from '../game/lore';
import { getLocale } from '../core/i18n';

export interface ContractsParts {
  contractBlock: string;
  brief: string;
  equipped: string;
  selected: Contract | null;
  rerollCost: number;
}

export interface DeployParts {
  contractBlock: string;
  selected: Contract | null;
  regularClears: number;
  brief: string;
  approaches: string;
  challenges: string;
  equipped: string;
  summary: string;
}

/** Contract board body. Selection state stays in the Safehouse controller. */
export function renderContracts(parts: ContractsParts): string {
  const selected = parts.selected;
  return `
    <div class="station-grid">
      <section class="station-col">
        <div class="kicker">// AVAILABLE CONTRACTS</div>
        <h2>CONTRACT NET</h2>
        ${parts.contractBlock}
        <button class="sh-augments station-reroll" data-act="reroll">REFRESH BOARD · $${parts.rerollCost}</button>
      </section>
      <section class="station-col">
        <div class="kicker">// BRIEF</div>
        <div class="station-brief">${parts.brief}</div>
        <h2>LOADOUT</h2>
        <div class="sh-equipped station-loadout">${parts.equipped}</div>
        <button class="sh-deploy station-launch" data-act="open-deploy" ${selected && !selected.locked ? '' : 'disabled'}>
          ${selected ? (selected.locked ? `LOCKED · ${selected.title}` : `PROCEED TO DEPLOY · ${selected.title}`) : 'SELECT A CONTRACT'}
        </button>
      </section>
    </div>`;
}

/** Insertion and challenge picker. */
export function renderDeploy(parts: DeployParts): string {
  const selected = parts.selected;
  return `
    <div class="station-grid">
      <section class="station-col">
        <div class="kicker">// MISSION BOARD</div>
        <h2>SELECT CONTRACT</h2>
        ${parts.contractBlock}
      </section>
      <section class="station-col">
        <div class="deploy-hero">
          <div class="kicker">// ACTIVE CONTRACT</div>
          <div class="deploy-title">${selected ? selected.title : 'NO CONTRACT'}</div>
          <div class="deploy-faction" style="${selected ? `color:${FACTIONS[selected.faction].color}` : ''}">${selected ? FACTIONS[selected.faction].name : ''}</div>
          <div class="station-brief">${parts.brief}</div>
          <div class="handler-line">MOTH: ${selected ? handlerLine(selected.faction, selected.title.length, getLocale()) : '...'}</div>
        </div>
        <h2>INSERTION</h2>
        <div class="approach-list">${parts.approaches}</div>
        <h2>CHALLENGE</h2>
        <div class="challenge-list">${parts.challenges}</div>
        <h2>LOADOUT</h2>
        <div class="sh-equipped station-loadout">${parts.equipped}</div>
        <div class="station-summary">${parts.summary}</div>
        <button class="sh-deploy station-launch" data-act="launch" ${selected && !selected.locked ? '' : 'disabled'}>
          ${selected?.locked ? 'LOCKED — COMPLETE 3 REGULAR CONTRACTS' : 'LAUNCH CONTRACT'}
        </button>
        <p class="sh-note">${
          selected?.locked
            ? `BOSS ACCESS LOCKED — ${parts.regularClears}/${selected.requiredClears ?? 3} regular clears required.`
            : 'The packed kit is consumed on launch. Die in the sector and the carried weapon and loot are lost.'
        }</p>
      </section>
    </div>`;
}
