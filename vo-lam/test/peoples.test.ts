import { describe, expect, it } from 'vitest';
import { advance, createWorld, migrateWorld, Sim, REGION_BY_ID, REALMS, EVENT_BY_ID, TRAITS, TRAIT_BY_ID } from '../src/index';
import { ascend } from '../src/actions';
import { EXTRA_EVENTS } from '../src/content/events-extra';
import { YEU_LIFESPAN_MULT } from '../src/content/peoples';
import type { WorldState } from '../src/types';

describe('gia tộc, thế gia', () => {
  it('keeps clans consistent: members point to live clans, every live clan has a living head', () => {
    const s = createWorld(31, { autoplay: true, warmupYears: 20 });
    advance(s, 150 * 12 - (s.month % 12) + 1);
    const sim = new Sim(s);
    const clans = s.clans!;
    for (const a of sim.living()) if (a.clanId) expect(clans[a.clanId]?.extinctMonth).toBeNull();
    for (const c of Object.values(clans).filter((x) => x.extinctMonth === null)) {
      const head = sim.get(c.headId);
      expect(head?.alive).toBe(true);
      expect(head?.clanId).toBe(c.id);
    }
  });

  it('passes the clan and its surname to children, and keeps the population bounded', () => {
    const s = createWorld(32, { autoplay: true, warmupYears: 20 });
    advance(s, 200 * 12);
    const sim = new Sim(s);
    expect(sim.living().length).toBeLessThan(700);
    // Children born before a clan was founded keep their own surname (a founding mother's children carry the father's).
    const born = sim.living().filter((a) => a.clanId && a.birthMonth > Math.max(0, s.clans![a.clanId]!.foundedMonth));
    expect(born.length).toBeGreaterThan(10);
    for (const a of born) expect(a.name.startsWith(s.clans![a.clanId!]!.surname + ' ')).toBe(true);
  });

  it('gives old saves their founding clans', () => {
    const s = createWorld(33, { warmupYears: 5 });
    const old = JSON.parse(JSON.stringify(s)) as WorldState;
    delete old.clans;
    migrateWorld(old);
    expect(Object.keys(old.clans!).length).toBeGreaterThanOrEqual(11);
  });
});

describe('Cổ tộc and traits', () => {
  it('fills Nam Cương with long-lived Cổ tộc', () => {
    const s = createWorld(34, { autoplay: true, warmupYears: 20 });
    const sim = new Sim(s);
    const there = sim.living().filter((a) => REGION_BY_ID[a.bornRegion]!.world === 'demon_beast');
    const yeu = there.filter((a) => a.race === 'yeu');
    expect(yeu.length / there.length).toBeGreaterThan(0.75);
    const y = yeu.find((a) => a.realm === 0 && !a.traits?.length && !a.lifespanBonus && !a.physiqueId)!;
    expect(sim.lifespan(y)).toBe(Math.round(REALMS[0]!.lifespan * YEU_LIFESPAN_MULT));
  });

  it('never rolls two traits that exclude each other', () => {
    const s = createWorld(35, { autoplay: true, warmupYears: 60 });
    for (const a of Object.values(s.avatars)) {
      for (const t of a.traits ?? []) {
        expect(TRAIT_BY_ID[t]).toBeDefined();
        for (const o of a.traits ?? []) if (o !== t) expect(TRAIT_BY_ID[t]!.excludes ?? []).not.toContain(o);
      }
    }
    expect(TRAITS.length).toBe(24);
  });
});

describe('the wider world', () => {
  it('knows the extra world events and keeps home-only LHVK events at home', () => {
    for (const e of EXTRA_EVENTS) expect(EVENT_BY_ID[e.id]).toBe(e);
    expect(EVENT_BY_ID.t_sect_war!.conditions!.world).toEqual(['mortal', 'cultivation']);
  });

  it('sends the ascended to live on in Thiên ngoại', () => {
    const s = createWorld(36, { autoplay: true, warmupYears: 20 });
    const sim = new Sim(s);
    const a = sim.living().find((x) => x.realm >= 3 && !sim.isPlayer(x))!;
    ascend(sim, a);
    expect(a.alive).toBe(true);
    expect(REGION_BY_ID[a.regionId]!.world).toBe('immortal');
    expect(a.titles).toContain('Cao nhân thế ngoại');
    expect(sim.living().filter((x) => REGION_BY_ID[x.regionId]!.world === 'immortal').length).toBeGreaterThan(1);
  });
});
