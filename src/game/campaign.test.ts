import { describe, expect, it } from 'vitest';
import {
  AUTHORED_CONTRACTS,
  buildBoard,
  chapterProgress,
  currentChapter,
} from './campaign';
import { Profile } from './profile';

describe('campaign structure', () => {
  it('ships twelve authored contracts across three chapters', () => {
    expect(AUTHORED_CONTRACTS).toHaveLength(12);
    for (const chapter of [1, 2, 3] as const) {
      expect(AUTHORED_CONTRACTS.filter((c) => c.chapter === chapter)).toHaveLength(4);
    }
    for (const def of AUTHORED_CONTRACTS) {
      expect(def.requiredLoot).toBeGreaterThanOrEqual(0);
      expect(def.reward).toBeGreaterThan(100);
    }
  });

  it('gates each chapter on the previous boss and clear count', () => {
    const profile = new Profile(3, null);
    expect(currentChapter(profile)).toBe(1);
    let board = buildBoard(profile, 99);
    const gate = board.at(-1);
    expect(gate?.bossId).toBe('psycho');
    expect(gate?.locked).toBe(true);
    expect(gate?.requiredClears).toBe(3);

    profile.data.regularClears = 3;
    board = buildBoard(profile, 99);
    expect(board.at(-1)?.locked).toBe(false);

    profile.data.bossesCleared.psycho = true;
    expect(currentChapter(profile)).toBe(2);
    expect(chapterProgress(profile).def?.gateBoss).toBe('grin');
    board = buildBoard(profile, 99);
    expect(board.at(-1)?.bossId).toBe('grin');
    expect(board.slice(0, 2).every((c) => c.authored)).toBe(true);

    profile.data.bossesCleared.grin = true;
    expect(currentChapter(profile)).toBe(3);
    profile.data.bossesCleared.crane = true;
    expect(currentChapter(profile)).toBe('final');
    board = buildBoard(profile, 99);
    expect(board[0].chapter).toBe('final');
    expect(board[0].bossId).toBe('board');

    profile.data.finalCleared = true;
    const afterFinal = buildBoard(profile, 99);
    expect(afterFinal.some((c) => c.bossId === 'seraph')).toBe(true);
    expect(afterFinal.some((c) => c.bossId === 'archivist')).toBe(true);
  });

  it('removes completed authored beats from the board', () => {
    const profile = new Profile(3, null);
    const first = buildBoard(profile, 7)[0];
    profile.data.completedContracts.push(first.id);
    const next = buildBoard(profile, 7);
    expect(next.some((c) => c.id === first.id)).toBe(false);
    expect(next.length).toBeGreaterThanOrEqual(4);
  });
});
