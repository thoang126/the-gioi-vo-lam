import { describe, expect, it } from 'vitest';
import { advance, choose, createWorld, step, Sim, REGIONS } from '../src/index';
import type { WorldState } from '../src/types';

function playInteractive(seed: number, months: number, pick: (ids: string[], i: number) => string): { s: WorldState; picks: string[] } {
  const s = createWorld(seed, { warmupYears: 20 });
  const picks: string[] = [];
  let i = 0;
  while (s.month < months) {
    advance(s, months - s.month);
    const p = s.soul.pending;
    if (!p) continue;
    const id = pick(p.options.map((o) => o.id), i++);
    picks.push(id);
    choose(s, id);
  }
  return { s, picks };
}

describe('world simulation', () => {
  it('is deterministic for the same seed', () => {
    const a = createWorld(42, { autoplay: true, warmupYears: 20 });
    const b = createWorld(42, { autoplay: true, warmupYears: 20 });
    advance(a, 100 * 12);
    advance(b, 100 * 12);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('diverges for different seeds', () => {
    const a = createWorld(1, { autoplay: true, warmupYears: 10 });
    const b = createWorld(2, { autoplay: true, warmupYears: 10 });
    expect(JSON.stringify(a.avatars)).not.toBe(JSON.stringify(b.avatars));
  });

  it('replays an interactive game from seed and choices', () => {
    const first = playInteractive(7, 80 * 12, (ids, i) => ids[i % ids.length]!);
    const second = playInteractive(7, 80 * 12, (_ids, i) => first.picks[i]!);
    expect(first.picks.length).toBeGreaterThan(5);
    expect(second.picks).toEqual(first.picks);
    expect(JSON.stringify(second.s)).toBe(JSON.stringify(first.s));
  });

  it('continues identically after a save and load', () => {
    const a = createWorld(9, { autoplay: true, warmupYears: 20 });
    advance(a, 50 * 12);
    const b: WorldState = JSON.parse(JSON.stringify(a));
    advance(a, 50 * 12);
    advance(b, 50 * 12);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('keeps the population within bounds over centuries', () => {
    const s = createWorld(3, { autoplay: true, warmupYears: 20 });
    for (let y = 0; y < 500; y += 50) {
      advance(s, 50 * 12);
      const n = new Sim(s).living().length;
      expect(n).toBeGreaterThan(100);
      // Settlements are topped up toward their population; sects, wanderers and families add more.
      expect(n).toBeLessThan(REGIONS.reduce((t, r) => t + r.population, 0) * 1.6);
    }
  });

  it('keeps every sect alive with a leader', () => {
    const s = createWorld(5, { autoplay: true, warmupYears: 20 });
    advance(s, 300 * 12);
    const sim = new Sim(s);
    for (const st of Object.values(s.sects)) {
      expect(sim.get(st.leaderId)?.alive).toBe(true);
    }
  });
});

describe('the player soul', () => {
  it('waits for the player instead of advancing', () => {
    const s = createWorld(11, { warmupYears: 20 });
    advance(s, 40 * 12);
    expect(s.soul.pending).not.toBeNull();
    const month = s.month;
    const r = step(s);
    expect(r.advanced).toBe(false);
    expect(s.month).toBe(month);
    choose(s, s.soul.pending!.options[0]!.id);
    expect(step(s).advanced || s.soul.pending !== null).toBe(true);
  });

  it('reincarnates into the same running world', () => {
    const s = createWorld(13, { autoplay: true, warmupYears: 20 });
    advance(s, 400 * 12);
    expect(s.soul.lives.length).toBeGreaterThanOrEqual(2);
    const sim = new Sim(s);
    if (s.soul.currentAvatarId !== null) {
      const a = sim.get(s.soul.currentAvatarId)!;
      expect(a.alive).toBe(true);
      expect(a.soulLife).toBe(s.soul.lives.length);
    } else {
      expect(s.soul.rebirthAt).not.toBeNull();
    }
    for (const life of s.soul.lives) expect(life.daoQua).toBeGreaterThanOrEqual(0);
  });

  it('remembers people bound to past lives', () => {
    const s = createWorld(17, { autoplay: true, warmupYears: 20 });
    advance(s, 400 * 12);
    const linked = Object.keys(s.soul.pastLinks).length;
    const graves = s.graves.filter((g) => g.soulLife !== null).length;
    expect(linked + graves).toBeGreaterThan(0);
  });
});


describe('võ duyên', () => {
  it('raises the root chance in the first life and after mortal lives, capped', async () => {
    const { rebirthRootChance } = await import('../src/index');
    const mortal = { rootId: 'none' };
    const rooted = { rootId: 'tam_linh_can' };
    expect(rebirthRootChance([])).toBeCloseTo(0.75);
    expect(rebirthRootChance([rooted])).toBeCloseTo(0.55);
    expect(rebirthRootChance([rooted, mortal])).toBeCloseTo(0.65);
    expect(rebirthRootChance([mortal, mortal, mortal, mortal])).toBeCloseTo(0.85);
    expect(rebirthRootChance([mortal, rooted])).toBeCloseTo(0.55);
  });
});
