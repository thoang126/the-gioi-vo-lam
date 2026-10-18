import { describe, expect, it } from 'vitest';
import { advance, choose, createWorld, LHVK, migrateWorld, REALMS, REGION_BY_ID, Sim } from '../src/index';
import { ACTION_BY_ID, breakthroughChance, pillFor, startAction } from '../src/actions';
import {
  addItem, autoUsePills, brew, countItem, itemName, learnAlchemy, sellSurplus, takeItem,
} from '../src/alchemy';
import { ALCHEMY, HERBS, HERB_BY_ID, PILLS, PILL_BY_ID, RECIPES, RECIPE_BY_PILL, STARTER_RECIPES } from '../src/content/alchemy';
import type { Avatar, WorldState } from '../src/types';

/** The player's avatar turned into a grown Hậu thiên cultivator who knows the craft. */
function alchemistPlayer(seed: number): { s: WorldState; sim: Sim; a: Avatar } {
  const s = createWorld(seed, { warmupYears: 20 });
  const sim = new Sim(s);
  const a = sim.get(s.soul.currentAvatarId)!;
  const rooted = sim.living().find((o) => sim.rootTier(o) > 0)!;
  Object.assign(a, { rootId: rooted.rootId, elements: [...rooted.elements], realm: 1, stage: 2, birthMonth: s.month - 30 * 12, action: null, linhThach: 500 });
  a.technique = sim.pickTechnique(1, a.elements);
  learnAlchemy(sim, a);
  s.soul.pending = null;
  return { s, sim, a };
}

describe('đan đạo content', () => {
  it('only names herbs, pills and regions that exist', () => {
    for (const h of HERBS) {
      expect(h.regions.length).toBeGreaterThan(0);
      for (const r of h.regions) expect(REGION_BY_ID[r], `${h.id} grows in ${r}`).toBeDefined();
    }
    for (const r of RECIPES) {
      expect(PILL_BY_ID[r.pill]).toBeDefined();
      for (const [h, n] of r.ingredients) { expect(HERB_BY_ID[h], `${r.pill} needs ${h}`).toBeDefined(); expect(n).toBeGreaterThan(0); }
    }
    for (const p of PILLS) {
      expect(RECIPE_BY_PILL[p.id], `recipe for ${p.id}`).toBeDefined();
      if (p.effect.kind === 'breakthrough') expect(REALMS.some((r) => r.id === (p.effect as { realm: string }).realm)).toBe(true);
    }
    for (const id of STARTER_RECIPES) expect(PILL_BY_ID[id]!.grade).toBe(1);
  });

  it('keeps every herb a recipe needs within reach of someone who can brew it', () => {
    for (const r of RECIPES) {
      for (const [h] of r.ingredients) expect(HERB_BY_ID[h]!.grade).toBeLessThanOrEqual(PILL_BY_ID[r.pill]!.grade + 1);
    }
  });
});

describe('bag with qualities', () => {
  it('counts story items (trung phẩm) and brewed ones together, and takes the best first', () => {
    const { a } = alchemistPlayer(3);
    a.items = { truc_co_dan: 1 };
    addItem(a, 'truc_co_dan', 3);
    addItem(a, 'truc_co_dan', 0, 2);
    expect(countItem(a, 'truc_co_dan')).toBe(4);
    expect(takeItem(a, 'truc_co_dan')).toBe(3);
    expect(takeItem(a, 'truc_co_dan', 'worst')).toBe(0);
    expect(countItem(a, 'truc_co_dan')).toBe(2);
    expect(itemName('truc_co_dan')).toBe('Tiểu Hoàn đan trung phẩm');
    expect(itemName('truc_co_dan:3')).toBe('Tiểu Hoàn đan cực phẩm');
  });
});

describe('breakthrough pills', () => {
  it('help more by quality, never past the cap, and less with đan độc', () => {
    const { sim, a } = alchemistPlayer(4);
    a.items = {};
    const bare = breakthroughChance(sim, a, false);
    addItem(a, 'truc_co_dan', 0);
    const low = pillFor(a)!.bonus;
    a.items = {};
    addItem(a, 'truc_co_dan', 3);
    const top = pillFor(a)!.bonus;
    expect(top).toBeGreaterThan(low);
    expect(top).toBeLessThanOrEqual(ALCHEMY.pillBonusCap);
    expect(breakthroughChance(sim, a, true)).toBeGreaterThan(bare);
    a.toxicity = 120;
    expect(pillFor(a)!.bonus).toBeLessThan(top);
  });
});

describe('brewing', () => {
  it('turns herbs into pills, and more heat means better pills and more burst furnaces', () => {
    const { sim, a } = alchemistPlayer(5);
    const recipe = RECIPE_BY_PILL.tu_khi_dan!;
    const run = (heat: number) => {
      let quality = 0;
      let made = 0;
      let bursts = 0;
      for (let i = 0; i < 400; i++) {
        a.alchemy = { level: 3, xp: 0, recipes: ['tu_khi_dan'] };
        a.items = {};
        const res = brew(sim, a, recipe, heat);
        if (res.burst) bursts += 1;
        else if (res.quality !== null) { quality += res.quality; made += 1; }
      }
      return { avg: quality / made, bursts };
    };
    const hot = run(1);
    const cool = run(-1);
    expect(hot.avg).toBeGreaterThan(cool.avg);
    expect(hot.bursts).toBeGreaterThan(cool.bursts);
  });

  it('stops the world at the furnace for the player and brews with the heat chosen', () => {
    const { s, sim, a } = alchemistPlayer(6);
    // Life milestones (Chọn đạo…) could send the character off to a sect mid-brew; keep them out of the way.
    for (const e of LHVK.events) if (e.kind === 'milestone') s.soul.story.seen[e.id] = 1;
    for (const [h, n] of RECIPE_BY_PILL.tu_khi_dan!.ingredients) addItem(a, h, 1, n);
    startAction(sim, a, ACTION_BY_ID.luyen_dan!);
    expect(a.action?.recipe).toBe('tu_khi_dan');
    expect(countItem(a, 'thanh_linh_diep')).toBe(0);
    let asked = false;
    for (let i = 0; i < 40 && a.alive && !asked; i++) {
      advance(s, 1);
      const p = s.soul.pending;
      if (p?.kind === 'alchemy') { asked = true; choose(s, 'heat_down'); }
      else if (p) choose(s, p.options[0]!.id);
    }
    expect(asked).toBe(true);
    expect(a.action?.heat).toBe(-1);
    for (let i = 0; i < 12 && a.action?.id === 'luyen_dan'; i++) {
      advance(s, 1);
      if (s.soul.pending) choose(s, s.soul.pending.options[0]!.id);
    }
    expect(a.alchemy!.xp + a.alchemy!.level).toBeGreaterThan(1);

    // The same pill again: the furnace keeps the heat chosen last time instead of asking.
    Object.assign(a, { injuredUntil: 0, action: null });
    for (const [h, n] of RECIPE_BY_PILL.tu_khi_dan!.ingredients) addItem(a, h, 1, n);
    startAction(sim, a, ACTION_BY_ID.luyen_dan!);
    expect(a.action?.recipe).toBe('tu_khi_dan');
    expect(s.soul.heat?.tu_khi_dan).toBe(-1);
    for (let i = 0; i < 3 && a.action?.id === 'luyen_dan'; i++) {
      advance(s, 1);
      expect(s.soul.pending?.kind).not.toBe('alchemy');
      if (s.soul.pending) choose(s, s.soul.pending.options[0]!.id);
      if (a.action?.id === 'luyen_dan' && a.action.heat !== undefined) expect(a.action.heat).toBe(-1);
    }
  });
});

describe('using pills', () => {
  it('takes a lifespan pill once per life, when the years run short', () => {
    const { sim, a } = alchemistPlayer(8);
    a.birthMonth = sim.s.month - (sim.lifespan(a) - 5) * 12;
    addItem(a, 'dien_tho_dan', 1, 2);
    const before = sim.lifespan(a);
    autoUsePills(sim, a, 'tu_luyen');
    expect(sim.lifespan(a)).toBeGreaterThan(before);
    const once = sim.lifespan(a);
    a.birthMonth = sim.s.month - (sim.lifespan(a) - 5) * 12;
    autoUsePills(sim, a, 'tu_luyen');
    expect(sim.lifespan(a)).toBe(once);
    expect(countItem(a, 'dien_tho_dan')).toBe(1);
  });

  it('pours a cultivation pill into công lực and leaves đan độc behind', () => {
    const { sim, a } = alchemistPlayer(9);
    a.stage = 0;
    a.tuVi = 0;
    addItem(a, 'tu_khi_dan', 2);
    autoUsePills(sim, a, 'tu_luyen');
    expect(a.tuVi + a.stage).toBeGreaterThan(0);
    expect(a.toxicity).toBeGreaterThan(0);
  });

  it('sells what it does not need and leaves it on the market', () => {
    const { s, sim, a } = alchemistPlayer(10);
    a.realm = 2;
    addItem(a, 'truc_co_dan', 2, 3);
    const gold = a.linhThach;
    expect(sellSurplus(sim, a)).toBeGreaterThan(0);
    expect(a.linhThach).toBeGreaterThan(gold);
    expect(s.market?.['truc_co_dan:2']).toBe(3);
  });
});

describe('older saves', () => {
  it('get the đan đạo fields, and play on with the old bag', () => {
    const s = createWorld(13, { warmupYears: 20 });
    const old = JSON.parse(JSON.stringify(s)) as WorldState;
    for (const a of Object.values(old.avatars)) { delete a.alchemy; delete a.toxicity; delete a.oncePills; }
    delete old.market;
    const a = old.avatars[old.soul.currentAvatarId!]!;
    a.items = { truc_co_dan: 1 };
    const m = migrateWorld(old);
    expect(Object.values(m.avatars).every((x) => x.alchemy === null && x.toxicity === 0 && x.oncePills === null)).toBe(true);
    expect(countItem(m.avatars[a.id]!, 'truc_co_dan')).toBe(1);
    expect(() => advance(m, 24)).not.toThrow();
  });
});

describe('đan đạo in the running world', () => {
  it('has NPC alchemists who brew, sell and buy, deterministically', () => {
    const run = () => { const s = createWorld(12, { autoplay: true, warmupYears: 20 }); advance(s, 250 * 12); return s; };
    const one = run();
    expect(one.stats.brewed ?? 0).toBeGreaterThan(20);
    expect(new Sim(one).living().some((x) => x.alchemy)).toBe(true);
    const two = run();
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });
});
