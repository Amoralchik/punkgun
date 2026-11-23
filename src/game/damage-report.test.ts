import { describe, expect, it } from 'vitest';
import {
  ENEMY_LABELS,
  compassDirection,
  describeDeath,
  rangeBand,
  type DamageSource,
} from './damage-report';

function source(overrides: Partial<DamageSource> = {}): DamageSource {
  return {
    label: 'HEAVY GUNNER',
    attack: 'LMG',
    cause: 'gunfire',
    x: 400,
    y: 0,
    kind: 'heavy',
    ...overrides,
  };
}

describe('death report', () => {
  it('maps world bearings to readable compass directions', () => {
    expect(compassDirection(0, 1)).toBe('NORTH');
    expect(compassDirection(1, 1)).toBe('NORTH-EAST');
    expect(compassDirection(1, 0)).toBe('EAST');
    expect(compassDirection(1, -1)).toBe('SOUTH-EAST');
    expect(compassDirection(0, -1)).toBe('SOUTH');
    expect(compassDirection(-1, 0)).toBe('WEST');
    expect(compassDirection(0, 0)).toBe('UNKNOWN');
  });

  it('classifies engagement range', () => {
    expect(rangeBand(80)).toBe('POINT BLANK');
    expect(rangeBand(200)).toBe('CLOSE RANGE');
    expect(rangeBand(500)).toBe('MID RANGE');
    expect(rangeBand(900)).toBe('LONG RANGE');
  });

  it('identifies the killer, attack, bearing and range', () => {
    const report = describeDeath(source(), { x: 0, y: 0 });
    expect(report.label).toBe('HEAVY GUNNER');
    expect(report.detail).toContain('LMG');
    expect(report.detail).toContain('FROM THE EAST');
    expect(report.detail).toContain('MID RANGE');
    expect(report.hint).toContain('HEAVY FIRE');
  });

  it('explains hazards and avoidable dash mistakes', () => {
    const barrel = describeDeath(
      source({
        label: 'EXPLOSIVE BARREL',
        attack: 'CHAIN BLAST',
        cause: 'explosion',
        kind: undefined,
      }),
      { x: 0, y: 0 },
      { dashReady: true },
    );
    expect(barrel.detail).toContain('DASH READY');
    expect(barrel.hint).toContain('BARRELS CHAIN-REACT');

    const laser = describeDeath(
      source({ label: 'LASER GRID', attack: 'PULSE BEAM', cause: 'laser', kind: undefined }),
      { x: 0, y: 0 },
    );
    expect(laser.hint).toContain('DARK PHASE');

    const timer = describeDeath(
      source({
        label: 'CONTRACT TIMER',
        attack: 'RUSH LIMIT',
        cause: 'timer',
        x: null,
        y: null,
        kind: undefined,
      }),
      null,
      { dashReady: true },
    );
    expect(timer.detail).toBe('RUSH LIMIT');
    expect(timer.hint).toContain('90 SECONDS');
    expect(timer.hint).not.toContain('DASH WAS READY');
  });

  it('handles point blank and unknown causes', () => {
    const pointBlank = describeDeath(source({ x: 10, y: 0 }), { x: 0, y: 0 });
    expect(pointBlank.detail).toContain('AT POINT BLANK');
    const unknown = describeDeath(null, null);
    expect(unknown.label).toBe('UNKNOWN');
    expect(unknown.detail).toBe('CAUSE UNRECORDED');
    expect(unknown.hint).toContain('ONE HIT');
  });

  it('gives every archetype a label', () => {
    for (const label of Object.values(ENEMY_LABELS)) expect(label.length).toBeGreaterThan(0);
  });
});
