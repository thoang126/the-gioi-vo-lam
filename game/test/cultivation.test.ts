import { describe, expect, it } from 'vitest';
import { advance, choose, createWorld, runBattle, sealOf, Sim } from '../src/index';
import { breakthroughChance } from '../src/actions';
import type { WorldState } from '../src/types';

const FOCUS = ['bt_prepare', 'bt_pill', 'bt_now', 'tu_luyen', 'be_quan', 'linh_mach', 'doi_dan', 'tim_tien_duyen', 'vuot_bien', 'accept'];

/** Plays like someone set on cultivating until `stop` holds or the years run out. */
function playFocused(seed: number, years: number, stop: (s: WorldState) => boolean): WorldState {
  const s = createWorld(seed, { warmupYears: 20 });
  const end = s.month + years * 12;
  while (s.month < end) {
    advance(s, end - s.month);
    if (stop(s)) return s;
    const p = s.soul.pending;
    if (!p) continue;
    const ids = p.options.map((o) => o.id);
    choose(s, FOCUS.find((f) => ids.includes(f)) ?? ids[0]!);
  }
  return s;
}

describe('battle engine in the world', () => {
  it('replays the same fight from the same seed', () => {
    const s = createWorld(5, { autoplay: true, warmupYears: 20 });
    const sim = new Sim(s);
    const [a, b] = sim.living().filter((x) => x.realm >= 1);
    const one = runBattle('test-seed', sealOf(sim, a!), 'cuong_manh', sealOf(sim, b!), 'on_trong');
    const two = runBattle('test-seed', sealOf(sim, a!), 'cuong_manh', sealOf(sim, b!), 'on_trong');
    expect(two.record).toEqual(one.record);
    expect(one.record.turns.length).toBeGreaterThan(0);
  });

  it('decides a fight across a big realm gap almost every time', () => {
    const s = createWorld(6, { autoplay: true, warmupYears: 20 });
    const sim = new Sim(s);
    const strong = sim.living().find((x) => x.realm >= 3)!;
    const weak = sim.living().find((x) => x.realm === 1)!;
    let wins = 0;
    for (let i = 0; i < 40; i++) if (runBattle(`gap-${i}`, sealOf(sim, strong), 'cuong_manh', sealOf(sim, weak), 'cuong_manh').record.winner === 0) wins += 1;
    expect(wins).toBeGreaterThanOrEqual(38);
  });
});

describe('breakthrough crossroad', () => {
  it('offers the GDD 4.3 choices and preparing raises the odds', () => {
    let found: WorldState | undefined;
    for (let seed = 900; seed < 960 && !found; seed++) {
      const s = playFocused(seed, 300, (w) => w.soul.pending?.kind === 'breakthrough' && w.soul.pending.options.some((o) => o.id === 'bt_prepare'));
      if (s.soul.pending?.kind === 'breakthrough') found = s;
    }
    expect(found).toBeDefined();
    const s = found!;
    const ids = s.soul.pending!.options.map((o) => o.id);
    expect(ids).toContain('bt_now');
    expect(ids).toContain('bt_wait');
    const sim = new Sim(s);
    const a = sim.get(s.soul.currentAvatarId)!;
    const before = breakthroughChance(sim, a, false);
    choose(s, 'bt_prepare');
    expect(a.action?.id).toBe('chuan_bi');
    advance(s, 12 * 10 + 1);
    const after = sim.get(s.soul.currentAvatarId);
    if (after?.alive && (after.prepare ?? 0) > 0) expect(breakthroughChance(new Sim(s), after, false)).toBeGreaterThan(before);
  });
});

describe('Hồn ấn', () => {
  it('keeps a seal from every closed life, within the Ấn khố limit', () => {
    const s = createWorld(44, { autoplay: true, warmupYears: 20 });
    advance(s, 500 * 12);
    const seals = s.soul.seals ?? [];
    expect(seals.length).toBe(Math.min(s.soul.lives.length, 5 + (s.soul.memories.seals ?? 0)));
    for (const x of seals) expect(x.seal.name).toBe(s.soul.lives[x.life]!.name);
  });
});
