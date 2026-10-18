import { describe, expect, it } from 'vitest';
import { advance, createWorld, Sim } from '../src/index';
import { fallChance, phaseDynasty, reigning } from '../src/dynasty';
import { clanMembers } from '../src/clans';

function world(seed: number) {
  const s = createWorld(seed, { autoplay: true, warmupYears: 20 });
  return { s, sim: new Sim(s) };
}

describe('triều đại Đại Hạ', () => {
  it('starts with the Hạ dynasty already on the throne', () => {
    const { s } = world(41);
    const d = s.dynasties![0]!;
    expect(d.surname).toBe('Hạ');
    expect(d.since).toBeLessThan(0);
    expect(s.clans![d.clanId]!.kind).toBe('royal');
  });

  it('grows more likely to fall as it ages', () => {
    const { s, sim } = world(42);
    const d = reigning(sim)!;
    const royal = s.clans![d.clanId];
    const at = (years: number) => fallChance(sim, { ...d, since: sim.month - years * 12 }, royal);
    expect(at(50)).toBeLessThan(at(200));
    expect(at(200)).toBeLessThan(at(400));
    expect(at(50)).toBeLessThan(0.002);
  });

  it('hands the throne to a new house when the old one dies out', () => {
    const { s, sim } = world(43);
    const old = reigning(sim)!;
    for (const m of clanMembers(sim, old.clanId)) sim.kill(m, 'illness', 'test');
    sim.s.month += 6 - (sim.s.month % 12) + (sim.s.month % 12 > 6 ? 12 : 0);
    phaseDynasty(sim);
    const next = reigning(sim)!;
    expect(next).not.toBe(old);
    expect(old.until).toBe(sim.month);
    expect(old.end).toBe('extinct');
    const royal = s.clans![next.clanId]!;
    expect(royal.kind).toBe('royal');
    expect(royal.seat).toBe('kinh_thanh');
    const emperor = sim.get(royal.headId)!;
    expect(emperor.alive).toBe(true);
    expect(emperor.titles).toContain('Hoàng đế Đại Hạ');
  });

  it('keeps one reigning dynasty and a consistent history over centuries', () => {
    const { s } = world(44);
    advance(s, 600 * 12);
    const ds = s.dynasties!;
    expect(ds.filter((d) => d.until === null).length).toBe(1);
    for (let i = 1; i < ds.length; i++) expect(ds[i]!.since).toBe(ds[i - 1]!.until);
    for (const d of ds.slice(0, -1)) {
      expect(d.end).not.toBeNull();
      const c = s.clans![d.clanId]!;
      expect(c.kind === 'royal' && c.extinctMonth === null && c.id !== ds[ds.length - 1]!.clanId).toBe(false);
    }
  });
});
