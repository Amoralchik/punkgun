import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { DialogueController } from '../ui/dialogue-controller';
import type { Contract } from './missions';
import type { Profile } from './profile';
import { RunLauncher } from './run-launcher';

const base = {
  id: 'c1',
  title: 'NIGHT SHIFT',
  objective: 'purge',
  faction: 'market',
  tagline: 'Test.',
  modifiers: [],
  seed: 1,
} as unknown as Contract;

function setup(contract: Contract) {
  const dialogue = { start: vi.fn() } as unknown as DialogueController;
  const commit = vi.fn();
  const profile = {
    data: { story: {}, role: null, lifepath: null },
  } as unknown as Profile;
  const launcher = new RunLauncher({
    contracts: () => [contract],
    currentContract: () => null,
    dialogue,
    audio: { unlock: vi.fn() } as unknown as AudioEngine,
    profile,
    locale: () => 'en',
    onCommit: commit,
  });
  return { launcher, dialogue, commit };
}

describe('run launcher', () => {
  it('commits a plain contract immediately', () => {
    const { launcher, commit } = setup(base);
    launcher.start('c1');
    expect(commit).toHaveBeenCalledWith(base, 'standard', 'standard', []);
  });

  it('defers a dialogue contract until deploy and passes boons', () => {
    const boss = { ...base, objective: 'boss', bossId: 'grin', faction: 'teeth' } as Contract;
    const { launcher, dialogue, commit } = setup(boss);
    launcher.start('c1', 'ghost', 'glass');
    expect(dialogue.start).toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    launcher.deploy(['pay']);
    expect(commit).toHaveBeenCalledWith(boss, 'ghost', 'glass', ['pay']);
  });

  it('cancels a deferred launch and ignores locked contracts', () => {
    const boss = { ...base, objective: 'boss', bossId: 'grin', faction: 'teeth' } as Contract;
    const { launcher, commit } = setup(boss);
    launcher.start('c1');
    launcher.cancel();
    launcher.deploy(['pay']);
    expect(commit).not.toHaveBeenCalled();
    const locked = setup({ ...base, locked: true } as Contract);
    locked.launcher.start('c1');
    expect(locked.commit).not.toHaveBeenCalled();
  });
});
