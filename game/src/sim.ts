import {
  GRADES, MORTALITY, NAMES, ORIGINS, PHYSIQUES, PHYSIQUE_CHANCE, REALMS, ROOTED_CHANCE,
  SPIRIT_ROOTS, TECHNIQUES, BASIC_ELEMENTS, MUTANT_ELEMENTS, type Element, type Technique,
} from './content/cultivation';
import { REGIONS, ROUTES, SECTS, SECT_RANKS, WORLDS, type Region, type SectDef } from './content/world';
import { LHVK, PATH_BY_ID, type Modifiers } from './content/lhvk';
import {
  CLAN, CLAN_ORIGIN, TRAITS, TRAIT_BY_ID, TRAIT_COUNT, YEU_BIRTH_CHANCE, YEU_LIFESPAN_MULT, YEU_SURNAMES, type Race,
} from './content/peoples';
import { Rng } from './rng';
import type {
  Avatar, DeathCause, EventKind, Gender, Grave, RelationKind, WorldEvent, WorldState,
} from './types';

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const SECT_BY_ID: Record<string, SectDef> = Object.fromEntries(SECTS.map((s) => [s.id, s]));
export const ROOT_BY_ID = Object.fromEntries(SPIRIT_ROOTS.map((r) => [r.id, r]));
export const ORIGIN_BY_ID = Object.fromEntries(ORIGINS.map((o) => [o.id, o]));
export const PHYSIQUE_BY_ID = Object.fromEntries(PHYSIQUES.map((p) => [p.id, p]));

const ADJ: Record<string, { to: string; months: number }[]> = {};
for (const [a, b, m] of ROUTES) {
  (ADJ[a] ??= []).push({ to: b, months: m });
  (ADJ[b] ??= []).push({ to: a, months: m });
}

const PATHS = new Map<string, { path: string[]; months: number } | null>();

/** Cheapest path (Dijkstra on months), excluding the start. Roads never change, so answers are kept. */
export function findPath(from: string, to: string): { path: string[]; months: number } | null {
  const key = `${from}>${to}`;
  if (!PATHS.has(key)) PATHS.set(key, dijkstra(from, to));
  const p = PATHS.get(key)!;
  // Callers walk the path by shifting it; hand out a copy.
  return p && { path: [...p.path], months: p.months };
}

function dijkstra(from: string, to: string): { path: string[]; months: number } | null {
  if (from === to) return { path: [], months: 0 };
  const dist: Record<string, number> = { [from]: 0 };
  const prev: Record<string, string> = {};
  const open = new Set([from]);
  while (open.size) {
    let cur = '';
    let best = Infinity;
    for (const n of open) if ((dist[n] ?? Infinity) < best) { best = dist[n]!; cur = n; }
    open.delete(cur);
    if (cur === to) break;
    for (const e of ADJ[cur] ?? []) {
      const d = best + e.months;
      if (d < (dist[e.to] ?? Infinity)) { dist[e.to] = d; prev[e.to] = cur; open.add(e.to); }
    }
  }
  if (dist[to] === undefined) return null;
  const path: string[] = [];
  for (let n = to; n !== from; n = prev[n]!) path.unshift(n);
  return { path, months: dist[to]! };
}

export function legMonths(a: string, b: string): number {
  return ADJ[a]?.find((e) => e.to === b)?.months ?? 1;
}

export const MONTHS_PER_YEAR = 12;
const NO_MODS: Modifiers = Object.freeze({});

export class Sim {
  rng: Rng;
  /** Living avatars per region, rebuilt each step. */
  byRegion: Record<string, Avatar[]> = {};

  constructor(public s: WorldState) {
    this.rng = new Rng(s.rng);
  }

  get month(): number { return this.s.month; }
  get year(): number { return Math.floor(this.s.month / MONTHS_PER_YEAR); }

  living(): Avatar[] {
    return Object.values(this.s.avatars).filter((a) => a.alive).sort((a, b) => a.id - b.id);
  }

  reindex(): void {
    this.byRegion = {};
    for (const a of this.living()) (this.byRegion[a.regionId] ??= []).push(a);
  }

  get(id: number | undefined | null): Avatar | undefined {
    return id == null ? undefined : this.s.avatars[id];
  }

  isPlayer(a: Avatar): boolean {
    return this.s.soul.currentAvatarId === a.id;
  }

  /** World mechanics that match a story flag (crossed the sea, won the võ lâm đại hội…) set it for the player. */
  storyFlag(a: Avatar, flag: string): void {
    if (this.isPlayer(a)) this.s.soul.story.flags[flag] = true;
  }

  // ---- derived values -------------------------------------------------------------------

  age(a: Avatar): number {
    const end = a.alive ? this.s.month : (a.deathMonth ?? this.s.month);
    return Math.floor((end - a.birthMonth) / MONTHS_PER_YEAR);
  }

  lifespan(a: Avatar): number {
    let traitBonus = 0;
    for (const t of a.traits ?? []) traitBonus += TRAIT_BY_ID[t]?.modifiers?.lifespanBonus ?? 0;
    const base = REALMS[a.realm]!.lifespan * (a.race === 'yeu' ? YEU_LIFESPAN_MULT : 1);
    return Math.round(base) + (a.physiqueId === 'hoang_co_thanh_the' ? 30 : 0) + a.lifespanBonus
      + (this.mods(a).lifespanBonus ?? 0) + (this.isPlayer(a) ? 0 : traitBonus);
  }

  /**
   * Passive modifiers of the player: life paths (đạo đồ) plus the event-weight parts of origin,
   * spirit root and physique. NPCs walk no paths and draw no story events, so they get none.
   */
  mods(a: Avatar): Modifiers {
    if (!this.isPlayer(a)) return NO_MODS;
    const parts: Modifiers[] = [];
    for (const p of Object.values(this.s.soul.story.paths)) if (p) parts.push(PATH_BY_ID[p.id]?.modifiers ?? {});
    for (const t of a.traits ?? []) parts.push(TRAIT_BY_ID[t]?.modifiers ?? {});
    for (const m of [LHVK.birthMods.origins[a.originId], LHVK.birthMods.roots[a.rootId], a.physiqueId ? LHVK.birthMods.physiques[a.physiqueId] : undefined]) {
      if (m) parts.push({ eventTagWeightMult: m.eventTagWeightMult, fortuneWeightMult: m.fortuneWeightMult, calamityWeightMult: m.calamityWeightMult });
    }
    const out: Modifiers = { eventTagWeightMult: {}, choiceTagMult: {} };
    for (const m of parts) {
      for (const k of ['cultivationMult', 'fortuneWeightMult', 'calamityWeightMult', 'naturalMortalityMult', 'deviationChanceMult'] as const) {
        if (m[k] !== undefined) out[k] = (out[k] ?? 1) * m[k]!;
      }
      for (const k of ['breakthroughBonus', 'lifespanBonus'] as const) if (m[k] !== undefined) out[k] = (out[k] ?? 0) + m[k]!;
      for (const [t, v] of Object.entries(m.eventTagWeightMult ?? {})) out.eventTagWeightMult![t] = (out.eventTagWeightMult![t] ?? 1) * v;
      for (const [t, v] of Object.entries(m.choiceTagMult ?? {})) out.choiceTagMult![t] = (out.choiceTagMult![t] ?? 1) * v;
    }
    return out;
  }

  rootTier(a: Avatar): number {
    return ROOT_BY_ID[a.rootId]?.tier ?? 0;
  }

  canCultivate(a: Avatar): boolean {
    return this.rootTier(a) > 0 && a.technique !== null;
  }

  realmLabel(a: Avatar): string {
    const r = REALMS[a.realm]!;
    if (r.rank === 0) return this.rootTier(a) > 0 && a.technique ? 'Phàm nhân (đang dẫn khí)' : 'Phàm nhân';
    return `${r.name} ${r.stages[a.stage] ?? ''}`.trim();
  }

  envMult(a: Avatar): number {
    const region = REGION_BY_ID[a.regionId]!;
    if (a.sectId && a.sectRank && region.sectId === a.sectId) {
      return SECT_RANKS.find((r) => r.id === a.sectRank)!.env;
    }
    return 0.8 * region.qi;
  }

  /** GDD LHVK 4.2, per month. */
  cultivationPerMonth(a: Avatar, bonus = 1): number {
    if (!this.canCultivate(a)) return 0;
    const region = REGION_BY_ID[a.regionId]!;
    const root = ROOT_BY_ID[a.rootId]!;
    const tech = a.technique!;
    let mult = GRADES[tech.grade]!.mult;
    if (tech.element && !a.elements.includes(tech.element)) mult *= 0.8;
    let v = WORLDS[region.world].baseCultivation * root.mult * (1 + (a.stats.ngoTinh - 50) / 100)
      * mult * this.envMult(a) * REALMS[a.realm]!.cultivationMult * bonus;
    if (a.injuredUntil > this.s.month) v *= 0.7;
    if (a.crippled) v *= 0.5;
    if (a.physiqueId === 'hoang_co_thanh_the') v *= 0.7;
    if (a.physiqueId === 'cuu_am_tuyet_mach') v *= 1.5;
    if (a.sectId === 'huyet_sat') v *= 1.15;
    v *= this.mods(a).cultivationMult ?? 1;
    return Math.max(0, v) / MONTHS_PER_YEAR;
  }

  /** True when the avatar sits at the top stage with enough tu vi for the next big realm. */
  readyToBreak(a: Avatar): boolean {
    const r = REALMS[a.realm]!;
    if (REGION_BY_ID[a.regionId]!.world === 'immortal' && r.rank >= REALMS.length - 1) return false;
    return r.breakthrough !== null && a.stage === r.stages.length - 1 && a.tuVi >= r.stageCost;
  }

  power(a: Avatar): number {
    const r = REALMS[a.realm]!;
    const tech = a.technique ? GRADES[a.technique.grade]!.mult : 0.8;
    let p = r.battleMult * (1 + 0.08 * a.stage) * (20 + a.stats.canCot * 0.5 + a.stats.ngoTinh * 0.5) * tech;
    if (a.injuredUntil > this.s.month) p *= 0.7;
    if (a.crippled) p *= 0.5;
    let gear = 0;
    for (const id of a.artifacts) gear += (LHVK.artifacts[id]?.atk ?? 0) + (LHVK.artifacts[id]?.def ?? 0);
    return p * (1 + gear / 150);
  }

  daoQua(a: Avatar): number {
    const rank = REALMS[a.realm]!.rank;
    return 100 * rank * rank + this.age(a) + 50 * a.fortunes + 30 * a.titles.length + Math.round(a.renown / 10);
  }

  // ---- mutation helpers -----------------------------------------------------------------

  log(kind: EventKind, text: string, avatarIds: number[], opts: { regionId?: string; major?: boolean } = {}): WorldEvent {
    const ev: WorldEvent = {
      id: this.s.nextEventId++, month: this.s.month, kind, text, avatarIds,
      regionId: opts.regionId, major: opts.major ?? false,
    };
    this.s.events.push(ev);
    return ev;
  }

  addTuVi(a: Avatar, amount: number): void {
    if (amount <= 0 || !this.canCultivate(a)) return;
    a.tuVi += amount;
    const r = REALMS[a.realm]!;
    if (r.rank === 0) {
      if (a.tuVi >= r.stageCost) {
        a.realm = 1; a.stage = 0; a.tuVi = 0;
        this.log('realm', `${a.name} dẫn khí nhập thể, bước vào Luyện Khí tầng 1.`, [a.id], { regionId: a.regionId });
      }
      return;
    }
    while (a.stage < r.stages.length - 1 && a.tuVi >= r.stageCost) {
      a.tuVi -= r.stageCost;
      a.stage += 1;
      if (r.rank >= 2 || this.isPlayer(a)) {
        this.log('realm', `${a.name} lên ${r.name} ${r.stages[a.stage]}.`, [a.id], { regionId: a.regionId });
      }
    }
    if (a.stage === r.stages.length - 1) a.tuVi = Math.min(a.tuVi, r.stageCost);
  }

  relate(a: Avatar, b: Avatar, kindAB: RelationKind, kindBA: RelationKind, bond: number): void {
    a.relations[b.id] = { kind: kindAB, bond, sinceMonth: this.s.month };
    b.relations[a.id] = { kind: kindBA, bond, sinceMonth: this.s.month };
  }

  relationOf(a: Avatar, kind: RelationKind): Avatar | undefined {
    for (const [id, r] of Object.entries(a.relations)) {
      if (r.kind === kind) {
        const o = this.s.avatars[Number(id)];
        if (o && o.alive) return o;
      }
    }
    return undefined;
  }

  kill(a: Avatar, cause: DeathCause, text: string, killer?: Avatar): void {
    if (!a.alive) return;
    a.alive = false;
    a.deathMonth = this.s.month;
    a.deathCause = cause;
    a.deathText = text;
    a.action = null;
    this.s.stats.deaths += 1;
    if (killer) killer.kills += 1;
    const notable = a.realm >= 2 || a.soulLife !== null || a.renown >= 50 || (a.sectRank === 'truong_lao' || a.sectRank === 'chuong_mon');
    this.log('death', `${a.name} (${this.realmLabel(a)}, ${this.age(a)} tuổi): ${text}.`, killer ? [a.id, killer.id] : [a.id], {
      regionId: a.regionId, major: a.realm >= 3 || a.sectRank === 'chuong_mon',
    });
    if (notable) {
      const g: Grave = {
        avatarId: a.id, name: a.name, regionId: a.regionId, month: this.s.month, realm: a.realm, stage: a.stage,
        epitaph: text, soulLife: a.soulLife,
      };
      this.s.graves.push(g);
    }
    for (const [id, r] of Object.entries(a.relations)) {
      const o = this.s.avatars[Number(id)];
      if (!o || !o.alive) continue;
      if (r.kind === 'partner' || r.kind === 'master' || r.kind === 'disciple' || r.kind === 'parent' || r.kind === 'child') {
        if (o.realm >= 1 || this.isPlayer(o)) {
          this.log('relation', `${o.name} nhận tin ${relationWord(o.relations[a.id]?.kind)} ${a.name} đã mất.`, [o.id, a.id], { regionId: o.regionId });
        }
      }
    }
  }

  // ---- birth --------------------------------------------------------------------------

  rollTraits(): string[] {
    let r = this.rng.next();
    let n = 0;
    while (n < TRAIT_COUNT.length - 1 && r >= TRAIT_COUNT[n]!) { r -= TRAIT_COUNT[n]!; n += 1; }
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const pool = TRAITS.filter((t) => !out.includes(t.id) && !out.some((o) => TRAIT_BY_ID[o]!.excludes?.includes(t.id) || t.excludes?.includes(o)));
      if (!pool.length) break;
      out.push(this.rng.weighted(pool, (t) => t.weight).id);
    }
    return out;
  }

  makeName(gender: Gender, surname?: string): string {
    const sur = surname ?? this.rng.pick(NAMES.surnames);
    const pool = gender === 'male' ? NAMES.male : NAMES.female;
    const first = this.rng.pick(pool);
    if (this.rng.chance(NAMES.doubleGivenChance)) {
      const second = this.rng.pick(pool.filter((n) => n !== first));
      return `${sur} ${first} ${second}`;
    }
    return `${sur} ${first}`;
  }

  rollRoot(rootedMult: number, minChance = 0): { rootId: string; elements: Element[] } {
    if (!this.rng.chance(Math.max(minChance, ROOTED_CHANCE * rootedMult))) return { rootId: 'none', elements: [] };
    const root = this.rng.weighted(SPIRIT_ROOTS.filter((r) => r.tier > 0), (r) => r.weight);
    const pool = root.pool === 'mutant' ? MUTANT_ELEMENTS : BASIC_ELEMENTS;
    const count = this.rng.int(root.count[0], root.count[1]);
    const els = [...pool];
    const out: Element[] = [];
    while (out.length < count && els.length) out.push(els.splice(Math.floor(this.rng.next() * els.length), 1)[0]!);
    return { rootId: root.id, elements: out };
  }

  pickTechnique(maxGrade: number, elements: Element[]): Technique {
    const fits = TECHNIQUES.filter((t) => t.grade <= maxGrade && (t.element === null || elements.includes(t.element)));
    const pool = fits.length ? fits : TECHNIQUES.filter((t) => t.grade <= Math.max(1, maxGrade));
    return this.rng.weighted(pool, (t) => 1 + t.grade * 2);
  }

  createAvatar(opts: {
    regionId: string;
    birthMonth?: number;
    originId?: string;
    rootId?: string;
    elements?: Element[];
    gender?: Gender;
    statBonus?: number;
    luckBonus?: number;
    /** Floor for P(has a spirit root), used by the player's tiên duyên. */
    rootedChance?: number;
    race?: Race;
    /** Born into this clan: takes its surname, origin and clan technique. */
    clanId?: string;
    /** Children of known parents inherit a clan only from them. */
    noClan?: boolean;
  }): Avatar {
    const region = REGION_BY_ID[opts.regionId]!;
    const race: Race = opts.race ?? (region.world === 'demon_beast' && this.rng.chance(YEU_BIRTH_CHANCE) ? 'yeu' : 'human');
    let clan = opts.clanId ? this.s.clans?.[opts.clanId] : undefined;
    const origin = clan && !opts.originId
      ? ORIGIN_BY_ID[CLAN_ORIGIN[clan.kind]]!
      : opts.originId
      ? ORIGIN_BY_ID[opts.originId]!
      : this.rng.weighted(ORIGINS.filter((o) => o.regionKinds.includes(region.kind)).length
        ? ORIGINS.filter((o) => o.regionKinds.includes(region.kind))
        : ORIGINS.filter((o) => o.id === 'commoner'), (o) => o.weight);
    const gender: Gender = opts.gender ?? (this.rng.chance(0.5) ? 'male' : 'female');
    const root = opts.rootId ? { rootId: opts.rootId, elements: opts.elements ?? [] } : this.rollRoot(origin.rootedMult ?? 1, opts.rootedChance ?? 0);
    const stat = () => this.rng.normal(50, 15, 1, 100) + (opts.statBonus ?? 0);
    const stats = {
      canCot: Math.min(100, stat() + (origin.canCot ?? 0)),
      ngoTinh: Math.min(100, stat()),
      khiVan: Math.min(100, stat() + (origin.luck ?? 0) + (opts.luckBonus ?? 0)),
      tamTinh: Math.min(100, stat()),
      miLuc: Math.min(100, stat() + (origin.charm ?? 0)),
    };
    let physiqueId: string | null = null;
    if (this.rng.chance(PHYSIQUE_CHANCE)) physiqueId = this.rng.weighted(PHYSIQUES, (p) => p.weight).id;
    if (physiqueId === 'hoang_co_thanh_the') stats.canCot = Math.min(100, stats.canCot + 25);
    if (physiqueId === 'luan_hoi_chi_the') { stats.ngoTinh = Math.min(100, stats.ngoTinh + 8); stats.tamTinh = Math.min(100, stats.tamTinh + 8); }
    if (physiqueId === 'linh_lung_tam') stats.tamTinh = Math.min(100, stats.tamTinh + 20);
    if (physiqueId === 'cuu_am_tuyet_mach') stats.ngoTinh = Math.min(100, stats.ngoTinh + 15);

    const traits = this.rollTraits();
    const STAT_FIELD = { can_cot: 'canCot', ngo_tinh: 'ngoTinh', khi_van: 'khiVan', tam_tinh: 'tamTinh', mi_luc: 'miLuc' } as const;
    for (const t of traits) {
      for (const [k, v] of Object.entries(TRAIT_BY_ID[t]!.statMods ?? {})) {
        const f = STAT_FIELD[k as keyof typeof STAT_FIELD];
        stats[f] = Math.max(1, Math.min(100, stats[f] + v!));
      }
    }
    // Children of the old houses of a world are born into one of its clans.
    if (!clan && !opts.originId && !opts.noClan && this.s.clans) {
      const kinds = Object.entries(CLAN_ORIGIN).filter(([k, o]) => o === origin.id && (k !== 'yeu')).map(([k]) => k);
      const open = Object.values(this.s.clans).filter((c) => c.extinctMonth === null && REGION_BY_ID[c.seat]!.world === region.world
        && (race === 'yeu' ? c.kind === 'yeu' : kinds.includes(c.kind)));
      const atSeat = open.filter((c) => c.seat === region.id);
      // Branch families (chi thứ) at the seat keep a clan going even when the main line thins out.
      const branch = Object.values(this.s.clans).filter((c) => c.extinctMonth === null && c.seat === region.id && (c.kind === 'yeu') === (race === 'yeu'));
      if (atSeat.length && this.rng.chance(0.7)) clan = this.rng.pick(atSeat);
      else if (branch.length && this.rng.chance(CLAN.branchBirth)) clan = this.rng.pick(branch);
      else if (open.length && this.rng.chance(race === 'yeu' ? 0.15 : 0.3)) clan = this.rng.pick(open);
    }
    const virtueBase = (stats.tamTinh - 50) / 60 + this.rng.range(-0.6, 0.6);
    const a: Avatar = {
      id: this.s.nextId++,
      name: this.makeName(gender, clan?.surname ?? (race === 'yeu' ? this.rng.pick(YEU_SURNAMES) : undefined)),
      gender,
      birthMonth: opts.birthMonth ?? this.s.month,
      regionId: region.id,
      bornWorld: region.world,
      bornRegion: region.id,
      originId: origin.id,
      rootId: root.rootId,
      elements: root.elements,
      physiqueId,
      stats,
      persona: {
        virtue: Math.max(-1, Math.min(1, virtueBase)),
        ambition: this.rng.next(),
        caution: this.rng.next(),
      },
      realm: 0,
      stage: 0,
      tuVi: 0,
      technique: null,
      sectId: null,
      sectRank: null,
      contribution: 0,
      linhThach: origin.linhThach ?? this.rng.int(0, 20),
      pills: 0,
      items: {},
      artifacts: [],
      skills: [],
      lifespanBonus: 0,
      renown: origin.id === 'royal' ? 30 : 0,
      injuredUntil: 0,
      breakthroughCooldownUntil: 0,
      crippled: false,
      kills: 0,
      fortunes: 0,
      alive: true,
      deathMonth: null,
      deathCause: null,
      deathText: null,
      action: null,
      lastActionId: null,
      relations: {},
      soulLife: null,
      titles: [],
      race,
      traits,
      clanId: clan?.id ?? null,
      // Set (not left undefined) so every avatar has one V8 shape and the same key order after a save and load.
      alchemy: null,
      toxicity: 0,
      oncePills: null,
    };
    if (root.rootId !== 'none' && clan?.technique) a.technique = { ...clan.technique };
    else if (root.rootId !== 'none' && origin.clanTechnique) a.technique = this.pickTechnique(1, a.elements);
    this.s.avatars[a.id] = a;
    this.s.stats.births += 1;
    return a;
  }

  childMortality(a: Avatar): number {
    const age = this.age(a);
    const band = MORTALITY.childhood.find((b) => age >= b.ages[0]! && age <= b.ages[1]!);
    if (!band) return 0;
    const cc = Math.min(2.5, Math.max(0.4, 1 - (a.stats.canCot - 50) * 0.02));
    let traitMult = 1;
    for (const t of a.traits ?? []) traitMult *= TRAIT_BY_ID[t]?.modifiers?.childMortalityMult ?? 1;
    return band.annual * cc * (ORIGIN_BY_ID[a.originId]?.childMortalityMult ?? 1) * traitMult;
  }
}

export function relationWord(kind: RelationKind | undefined): string {
  switch (kind) {
    case 'master': return 'sư phụ';
    case 'disciple': return 'đồ đệ';
    case 'partner': return 'đạo lữ';
    case 'rival': return 'kình địch';
    case 'friend': return 'bạn';
    case 'enemy': return 'kẻ thù';
    case 'parent': return 'cha mẹ';
    case 'child': return 'con';
    default: return 'người quen';
  }
}
