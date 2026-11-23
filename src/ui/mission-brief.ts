import { seedLabel } from '../core/math';
import { SETPIECES, setpieceFor } from '../game/setpieces';
import type { Locale } from '../core/i18n';
import { APPROACH_MAP, type ApproachId } from '../game/attributes';
import { BOONS, type RunBoon } from '../game/boons';
import { CHALLENGE_MAP } from '../game/challenges';
import { FACTIONS, handlerLine } from '../game/lore';
import { MODIFIER_MAP } from '../game/modifiers';
import { objectiveText, type Contract } from '../game/missions';

/** Mission briefing card shown before the world starts. */
export class MissionBrief {
  private readonly root = document.getElementById('overlay-brief')!;
  private readonly kicker = document.getElementById('brief-kicker')!;
  private readonly title = document.getElementById('brief-title')!;
  private readonly faction = document.getElementById('brief-faction')!;
  private readonly objective = document.getElementById('brief-objective')!;
  private readonly handler = document.getElementById('brief-handler')!;

  show(
    contract: Contract,
    approachId: ApproachId,
    boons: RunBoon[],
    ngPlus: number,
    locale: Locale,
  ): string {
    const faction = FACTIONS[contract.faction];
    const approach = APPROACH_MAP[approachId];
    const sp = setpieceFor(contract);
    const spName = sp ? (locale === 'es' ? SETPIECES[sp].nameEs : SETPIECES[sp].name) : '';
    const mods = [spName, ...contract.modifiers.map((id) => MODIFIER_MAP[id].name)]
      .filter(Boolean)
      .join(' · ');
    const boonLine = boons.map((id) => BOONS[id].label).join(' · ');
    const seed = seedLabel(contract.seed);
    const challenge =
      contract.challenge && contract.challenge !== 'standard'
        ? CHALLENGE_MAP[contract.challenge].name
        : '';
    this.kicker.textContent = `// ${contract.risk} RISK · ${contract.layoutName} · ${approach.name}${
      ngPlus > 0 ? ` · NG+${ngPlus}` : ''
    }${challenge ? ` · ${challenge}` : ''}${mods ? ` · ${mods}` : ''}${
      boonLine ? ` · ${boonLine}` : ''
    } · SEED ${seed}`;
    this.root.dataset.seed = seed;
    this.title.textContent = contract.title;
    this.faction.textContent = faction.name;
    this.faction.style.color = faction.color;
    this.objective.textContent = sp ? `${objectiveText(contract)} · ${spName}` : objectiveText(contract);
    const line = handlerLine(contract.faction, contract.title.length, locale);
    this.handler.textContent = `MOTH: ${line}`;
    this.root.classList.remove('hidden');
    return line;
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
