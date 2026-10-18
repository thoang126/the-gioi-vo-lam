import { describe, expect, it } from 'vitest';
import { advance, codexProgress, createWorld, LHVK, migrateWorld, SOUL_TITLES } from '../src/index';
import type { WorldState } from '../src/types';

describe('goals of the soul', () => {
  const s = createWorld(41, { autoplay: true, warmupYears: 20 });
  advance(s, 600 * 12);

  it('fills Kiếp Sách from every life', () => {
    expect(s.soul.lives.length).toBeGreaterThan(3);
    expect(s.soul.codex.roots?.length).toBeGreaterThan(0);
    expect(s.soul.codex.deaths?.length).toBeGreaterThan(0);
    expect(s.soul.codex.birthplaces?.length).toBeGreaterThan(1);
    const p = codexProgress(s.soul);
    expect(p.have).toBeGreaterThan(5);
    expect(p.have).toBeLessThanOrEqual(p.total);
  });

  it('awards life titles by their conditions', () => {
    const known = new Set(LHVK.titles.map((t) => t.name));
    for (const l of s.soul.lives) {
      expect(l.titles.length).toBeLessThanOrEqual(LHVK.scoring.maxTitles);
      if (l.diedMonth - l.bornMonth < 12 * 12) expect(l.titles).toContain('Hoa chưa kịp nở');
    }
    const any = s.soul.lives.flatMap((l) => l.titles).filter((t) => known.has(t));
    expect(any.length).toBeGreaterThan(0);
  });

  it('awards soul titles once their goal is met, with points', () => {
    expect(s.soul.achievements.length).toBeGreaterThan(0);
    if (s.soul.lives.length >= 10) expect(s.soul.achievements).toContain('ten_lives');
    for (const id of s.soul.achievements) {
      const t = SOUL_TITLES.find((x) => x.id === id)!;
      const [cur, target] = t.progress(s.soul);
      expect(cur).toBeGreaterThanOrEqual(target);
    }
    expect(new Set(s.soul.achievements).size).toBe(s.soul.achievements.length);
  });

  it('upgrades a save written before Kiếp Sách', () => {
    const old = JSON.parse(JSON.stringify(s)) as WorldState;
    const soul = old.soul as unknown as Record<string, unknown>;
    delete soul.codex; delete soul.achievements; delete soul.counters;
    const up = migrateWorld(old);
    expect(up.soul.codex.roots?.length).toBeGreaterThan(0);
    expect(up.soul.counters.reunions).toBe(0);
    advance(up, 24);
  });
});
