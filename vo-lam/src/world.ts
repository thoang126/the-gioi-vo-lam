import { REALMS, SPIRIT_ROOTS, BASIC_ELEMENTS, type Element } from './content/cultivation';
import { REGIONS, SECTS, SECT_RELATIONS, type SectRankId } from './content/world';
import { phaseClans, seedClans } from './clans';
import { phaseDynasty, seedDynasty } from './dynasty';
import { phaseDecide, phaseEncounters, phaseExecute, phaseHousekeeping, phaseLifecycle, phaseSects, phaseWorld } from './phases';
import { checkPlayerDeath, playerPhase, resolvePending } from './player';
import { Sim } from './sim';
import { teachSectArts } from './martial';
import { newStory } from './story';
import type { Avatar, WorldState } from './types';

export interface CreateOptions {
  /** Years the world runs on its own before the player's first birth. */
  warmupYears?: number;
  autoplay?: boolean;
}

/** Shown calendar: the world is old long before the player arrives. */
export const YEAR_OFFSET = 3000;

export function createWorld(seed: number, opts: CreateOptions = {}): WorldState {
  const s: WorldState = {
    version: 1,
    seed,
    rng: seed >>> 0,
    month: 0,
    nextId: 1,
    nextEventId: 1,
    avatars: {},
    graves: [],
    sects: {},
    events: [],
    secretRealmOpenUntil: 0,
    soul: {
      lives: [], currentAvatarId: null, points: 0,
      memories: { manhBa: 0, luck: 0, technique: 0 },
      pastLinks: {}, metThisLife: [], pending: null, autoplay: opts.autoplay ?? false, rebirthAt: null, habit: null, story: newStory(),
      codex: {}, achievements: [], counters: { reunions: 0, ownGraves: 0, sectLeader: 0, crossedSea: 0 },
    },
    stats: { births: 0, deaths: 0, ascensions: 0, maxRealmEver: 0 },
  };
  const sim = new Sim(s);
  for (const def of SECTS) {
    s.sects[def.id] = { id: def.id, leaderId: null, lastRecruitYear: -def.recruitEveryYears + 1, relations: {}, wars: {}, prestige: 0 };
  }
  for (const [a, b, v] of SECT_RELATIONS) {
    s.sects[a]!.relations[b] = v;
    s.sects[b]!.relations[a] = v;
  }
  seedSects(sim);
  seedClans(sim);
  seedDynasty(sim);
  seedSettlements(sim);
  seedImmortals(sim);
  s.rng = sim.rng.state;
  s.stats.births = 0;
  s.soul.rebirthAt = (opts.warmupYears ?? 40) * 12;
  while (s.soul.currentAvatarId === null) step(s);
  return s;
}

const AGE_BY_REALM: Record<number, [number, number]> = { 1: [14, 60], 2: [25, 75], 3: [35, 90], 4: [45, 100] };

function rootAtLeast(sim: Sim, tier: number): { rootId: string; elements: Element[] } {
  const root = sim.rng.weighted(SPIRIT_ROOTS.filter((r) => r.tier >= tier && r.pool === 'basic'), (r) => r.weight);
  const els = [...BASIC_ELEMENTS];
  const out: Element[] = [];
  const n = sim.rng.int(root.count[0], root.count[1]);
  while (out.length < n) out.push(els.splice(Math.floor(sim.rng.next() * els.length), 1)[0]!);
  return { rootId: root.id, elements: out };
}

function makeVeteran(sim: Sim, regionId: string, realm: number, minTier: number): Avatar {
  const [lo, hi] = AGE_BY_REALM[realm]!;
  const age = sim.rng.int(lo, hi);
  const root = rootAtLeast(sim, Math.max(minTier, realm >= 2 ? 2 : 1));
  const a = sim.createAvatar({ regionId, birthMonth: -age * 12 - sim.rng.int(0, 11), originId: 'commoner', ...root });
  const r = REALMS[realm]!;
  a.realm = realm;
  a.stage = sim.rng.int(0, r.stages.length - 1);
  a.tuVi = sim.rng.range(0, r.stageCost * 0.9);
  a.linhThach = sim.rng.int(20, 200) * realm * realm;
  return a;
}

function seedSects(sim: Sim): void {
  for (const def of SECTS) {
    const members: Avatar[] = [];
    for (const [rank, count] of Object.entries(def.roster).sort((x, y) => Number(y[0]) - Number(x[0]))) {
      for (let i = 0; i < count; i++) {
        const a = makeVeteran(sim, def.regionId, Number(rank), def.minRootTier);
        a.sectId = def.id;
        a.technique = sim.pickTechnique(Math.min(4, def.techniqueGrade + (a.realm >= 3 ? 1 : 0)), a.elements);
        const rk: SectRankId = a.realm >= 3 ? 'truong_lao' : a.realm === 2 ? 'noi_mon' : 'ngoai_mon';
        a.sectRank = rk;
        a.contribution = sim.rng.int(0, 300);
        if (def.alignment === 'evil') a.persona.virtue = -Math.abs(a.persona.virtue) - 0.2;
        else a.persona.virtue = Math.min(1, a.persona.virtue + 0.2);
        members.push(a);
      }
    }
    const leader = members[0]!;
    leader.sectRank = 'chuong_mon';
    sim.s.sects[def.id]!.leaderId = leader.id;
    for (const m of members.filter((x) => x.realm >= 2)) {
      const n = sim.rng.int(0, m.realm - 1);
      for (let k = 0; k < n; k++) {
        const d = members.find((x) => x.realm < m.realm && !sim.relationOf(x, 'master') && x.id !== m.id);
        if (!d) break;
        sim.relate(m, d, 'disciple', 'master', sim.rng.int(30, 80));
        if (d.sectRank === 'ngoai_mon') d.sectRank = 'chan_truyen';
      }
    }
    for (const m of members) teachSectArts(sim, m);
  }
}

function seedSettlements(sim: Sim): void {
  for (const r of REGIONS) {
    if (r.kind === 'sect' || r.population <= 0 || r.world === 'immortal') continue;
    const n = Math.round(r.population * 0.9);
    for (let i = 0; i < n; i++) {
      const age = sim.rng.int(0, 65);
      const a = sim.createAvatar({ regionId: r.id, birthMonth: -age * 12 - sim.rng.int(0, 11) });
      // Outside Đại Hạ, many with a spirit root already walk the way as du hiệp.
      if (r.world !== 'mortal' && sim.rootTier(a) > 0 && age >= 16 && sim.rng.chance(0.6)) {
        a.technique = sim.pickTechnique(sim.rng.chance(0.2) ? 2 : 1, a.elements);
        a.realm = sim.rng.chance(0.12) ? 2 : 1;
        a.stage = sim.rng.int(0, REALMS[a.realm]!.stages.length - 1);
        a.linhThach = sim.rng.int(10, 120) * a.realm;
      }
    }
  }
}

/** A handful of those who ascended long ago, so Thiên ngoại is not empty. */
function seedImmortals(sim: Sim): void {
  const r = REALMS[REALMS.length - 1]!;
  for (let i = 0; i < 5; i++) {
    const age = sim.rng.int(60, 150);
    const root = rootAtLeast(sim, 3);
    const a = sim.createAvatar({ regionId: sim.rng.pick(['lang_tieu', 'dao_tri', 'luan_hoi_tri']), birthMonth: -age * 12, originId: 'commoner', race: 'human', ...root });
    a.realm = r.rank;
    a.stage = sim.rng.int(0, r.stages.length - 1);
    a.technique = sim.pickTechnique(4, a.elements);
    a.titles.push('Cao nhân thế ngoại');
    a.renown = 1000;
    a.clanId = null;
  }
}

/** Fills fields added after a save was written, so older saves keep working. */
export function migrateWorld(s: WorldState): WorldState {
  const soul = s.soul;
  soul.codex ??= {};
  soul.achievements ??= [];
  soul.counters ??= { reunions: 0, ownGraves: 0, sectLeader: 0, crossedSea: 0 };
  soul.memories.sight ??= 0;
  for (const l of soul.lives) l.paths ??= [];
  for (const a of Object.values(s.avatars)) {
    a.alchemy ??= null;
    a.toxicity ??= 0;
    a.oncePills ??= null;
  }
  if (!s.clans) {
    const sim = new Sim(s);
    seedClans(sim);
    s.rng = sim.rng.state;
  }
  // Saves from before Kiếp Sách: rebuild what the life records still tell.
  if (!Object.keys(soul.codex).length && soul.lives.length) {
    const add = (cat: string, id: string) => { const l = (soul.codex[cat] ??= []); if (!l.includes(id)) l.push(id); };
    for (const l of soul.lives) {
      add('roots', l.rootId);
      add('birthplaces', l.bornRegion);
      add('deaths', l.cause);
      for (const r of REALMS) if (r.rank <= l.realm) add('realms', r.id);
    }
  }
  return s;
}

export interface StepResult {
  advanced: boolean;
  waiting: boolean;
}

/** Advance the world by one month, unless it is waiting on the player. */
export function step(s: WorldState): StepResult {
  const sim = new Sim(s);
  sim.reindex();
  if (playerPhase(sim)) {
    s.rng = sim.rng.state;
    return { advanced: false, waiting: true };
  }
  phaseDecide(sim);
  phaseExecute(sim);
  phaseEncounters(sim);
  phaseSects(sim);
  phaseClans(sim);
  phaseDynasty(sim);
  phaseWorld(sim);
  phaseLifecycle(sim);
  checkPlayerDeath(sim);
  phaseHousekeeping(sim);
  s.month += 1;
  s.rng = sim.rng.state;
  return { advanced: true, waiting: s.soul.pending !== null };
}

/** Run up to `months`, stopping early when the player has a choice to make. */
export function advance(s: WorldState, months: number): number {
  let n = 0;
  while (n < months) {
    const r = step(s);
    if (r.advanced) n += 1;
    if (r.waiting) break;
  }
  return n;
}

export function choose(s: WorldState, optionId: string): void {
  const sim = new Sim(s);
  sim.reindex();
  resolvePending(sim, optionId);
  s.rng = sim.rng.state;
}

export function setAutoplay(s: WorldState, on: boolean): void {
  s.soul.autoplay = on;
}
