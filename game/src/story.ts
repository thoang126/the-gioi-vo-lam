// Interpreter for the Luân Hồi Vạn Kiếp event DSL, running inside the living world.
// The original engine kept story NPCs as names on a life record; here every master, partner,
// rival, disciple and friend an event needs is a real avatar of the world (found nearby or
// newly born into it), who keeps living their own life afterwards.

import {
  ACQUAINTANCE_EVENTS, EVENT_BY_ID, GRADE_ORDER, LHVK, MILESTONES, PATH_BY_ID, RANDOM_EVENTS, asList,
  type Check, type Choice, type Conditions, type Effects, type NpcRole, type Outcome, type StatKey, type StoryEvent, type Text,
} from './content/lhvk';
import { BASIC_ELEMENTS, GRADES, MUTANT_ELEMENTS, REALMS, SPIRIT_ROOTS, TECHNIQUES, type Element } from './content/cultivation';
import { REGIONS, SECTS } from './content/world';
import { duel } from './battle';
import { REGION_BY_ID, Sim, relationWord } from './sim';
import type { Avatar, DeathCause, PendingChoice, Stats, StoryState } from './types';
import { joinSect } from './phases';

export function newStory(): StoryState {
  return { flags: {}, seen: {}, seenAt: {}, cooldowns: {}, crossroads: 0, lastCrossroadAge: -99, paths: {}, pathHistory: [], lastYear: -1 };
}

const STAT: Record<StatKey, keyof Stats> = { can_cot: 'canCot', ngo_tinh: 'ngoTinh', khi_van: 'khiVan', tam_tinh: 'tamTinh', mi_luc: 'miLuc' };
const ROLES: NpcRole[] = ['master', 'partner', 'rival', 'disciple', 'friend'];

/** Who fills each role (and `who`) for one event occurrence, so text and effects agree. */
type Cast = Partial<Record<NpcRole | 'who', number>>;

interface Ctx { sim: Sim; a: Avatar; st: StoryState; cast: Cast }

// ---- derived state --------------------------------------------------------------------------

function realmOrd(realm: number, stage: number): number {
  return realm * 100 + stage + 1;
}

function refOrd(ref: string, bound: 'min' | 'max'): number {
  const m = /^(.*?)(?:_(\d+))?$/.exec(ref)!;
  const r = REALMS.find((x) => x.id === m[1]);
  if (!r) return bound === 'min' ? Infinity : -Infinity;
  const stage = m[2] ? Number(m[2]) : bound === 'min' ? 1 : r.stages.length;
  return r.rank * 100 + stage;
}

function rootTierOf(id: string): number {
  return SPIRIT_ROOTS.find((r) => r.id === id)?.tier ?? 0;
}

function env(sim: Sim, a: Avatar): string {
  if (a.sectId) {
    if (a.sectRank === 'truong_lao' || a.sectRank === 'chuong_mon') return 'cave';
    return a.sectRank === 'noi_mon' || a.sectRank === 'chan_truyen' ? 'inner_sect' : 'outer_sect';
  }
  if (a.regionId === 'linh_mach') return 'cave';
  if (a.originId === 'cultivator_clan' && sim.age(a) < 18) return 'clan';
  return 'tan_tu';
}

/** Flags the original engine set at birth or from mechanics; here they follow the world state. */
function derivedFlag(sim: Sim, a: Avatar, f: string): boolean {
  switch (f) {
    case 'in_sect': return a.sectId !== null;
    case 'has_master': return sim.relationOf(a, 'master') !== undefined;
    case 'orphan': return a.originId === 'beggar';
    case 'martial_family': return a.originId === 'martial_clan';
    case 'clan_born': return a.originId === 'cultivator_clan';
    case 'royal_blood': return a.originId === 'royal';
    case 'heaven_root': return a.rootId === 'thien_linh_can';
    case 'sword_bone': return a.physiqueId === 'thien_sinh_kiem_cot';
    case 'past_life_memory': return a.physiqueId === 'luan_hoi_chi_the';
    case 'crippled': return a.crippled;
    default: return false;
  }
}

const hasFlag = (x: Ctx, f: string) => x.st.flags[f] === true || derivedFlag(x.sim, x.a, f);

function roleAvatar(x: Ctx, role: NpcRole): Avatar | undefined {
  const id = x.cast[role];
  if (id !== undefined) {
    const o = x.sim.get(id);
    if (o?.alive) return o;
  }
  return x.sim.relationOf(x.a, role);
}

function hasPath(x: Ctx, ids: string[]): boolean {
  return Object.values(x.st.paths).some((p) => p && ids.includes(p.id));
}

// ---- conditions -----------------------------------------------------------------------------

export function matches(x: Ctx, c: Conditions | undefined): boolean {
  if (!c) return true;
  const { sim, a, st } = x;
  const age = sim.age(a);
  const world = REGION_BY_ID[a.regionId]!.world;
  if (c.world && !c.world.includes(world)) return false;
  if (c.origin && !c.origin.includes(a.originId)) return false;
  if (c.gender && a.gender !== c.gender) return false;
  if (c.age && (age < c.age[0] || age > c.age[1])) return false;
  if (c.realm && !c.realm.includes(REALMS[a.realm]!.id)) return false;
  if (c.realm_min && realmOrd(a.realm, a.stage) < refOrd(c.realm_min, 'min')) return false;
  if (c.realm_max && realmOrd(a.realm, a.stage) > refOrd(c.realm_max, 'max')) return false;
  if (c.cultivator !== undefined && (a.realm > 0) !== c.cultivator) return false;
  if (c.spirit_root && !c.spirit_root.includes(a.rootId)) return false;
  if (c.spirit_root_min && sim.rootTier(a) < rootTierOf(c.spirit_root_min)) return false;
  if (c.spirit_root_max && sim.rootTier(a) > rootTierOf(c.spirit_root_max)) return false;
  if (c.has_flag && !c.has_flag.every((f) => hasFlag(x, f))) return false;
  if (c.has_flag_not && c.has_flag_not.some((f) => hasFlag(x, f))) return false;
  if (c.any_flag && !c.any_flag.some((f) => hasFlag(x, f))) return false;
  if (c.trait) return false;
  if (c.physique && !(a.physiqueId && c.physique.includes(a.physiqueId))) return false;
  if (c.stat_min && !Object.entries(c.stat_min).every(([k, v]) => a.stats[STAT[k as StatKey]] >= v!)) return false;
  if (c.stat_max && !Object.entries(c.stat_max).every(([k, v]) => a.stats[STAT[k as StatKey]] <= v!)) return false;
  if (c.env && !c.env.includes(env(sim, a))) return false;
  if (c.env_not && c.env_not.includes(env(sim, a))) return false;
  if (c.has_technique !== undefined && (a.technique !== null) !== c.has_technique) return false;
  if (c.technique_grade_max && a.technique && a.technique.grade > (GRADE_ORDER[c.technique_grade_max] ?? 0)) return false;
  if (c.linh_thach_min !== undefined && a.linhThach < c.linh_thach_min) return false;
  if (c.has_item && !c.has_item.every((i) => (a.items[i] ?? 0) > 0)) return false;
  if (c.has_item_not && c.has_item_not.some((i) => (a.items[i] ?? 0) > 0)) return false;
  if (c.seen && !c.seen.every((id) => (st.seen[id] ?? 0) > 0)) return false;
  if (c.seen_not && c.seen_not.some((id) => (st.seen[id] ?? 0) > 0)) return false;
  if (c.seen_ago && !Object.entries(c.seen_ago).every(([id, y]) => st.seenAt[id] !== undefined && age - st.seenAt[id]! >= y)) return false;
  if (c.npc && !c.npc.every((r) => roleAvatar(x, r))) return false;
  if (c.npc_not && c.npc_not.some((r) => roleAvatar(x, r))) return false;
  if (c.npc_mortal && !c.npc_mortal.every((r) => roleAvatar(x, r)?.realm === 0)) return false;
  if (c.npc_cultivator && !c.npc_cultivator.every((r) => (roleAvatar(x, r)?.realm ?? 0) > 0)) return false;
  if (c.npc_bond_min && !Object.entries(c.npc_bond_min).every(([r, v]) => {
    const o = roleAvatar(x, r as NpcRole);
    return o !== undefined && (a.relations[o.id]?.bond ?? 0) >= v!;
  })) return false;
  if (c.path && !hasPath(x, c.path)) return false;
  if (c.path_not && hasPath(x, c.path_not)) return false;
  if (c.path_years && !Object.entries(c.path_years).every(([id, y]) => Object.values(st.paths).some((p) => p?.id === id && age - p.since >= y))) return false;
  if (c.who_cultivator !== undefined) {
    const who = sim.get(x.cast.who);
    if (!who || (who.realm > 0) !== c.who_cultivator) return false;
  }
  return true;
}

// ---- text -----------------------------------------------------------------------------------

function speciesFor(realm: number): string[] {
  return LHVK.narration.beastSpecies[REALMS[realm]!.id] ?? LHVK.narration.beastSpecies.luyen_khi ?? ['Yêu Thú'];
}

function render(x: Ctx, text: Text | undefined, vars: Record<string, string>): string {
  if (!text) return '';
  const line = typeof text === 'string' ? text : x.sim.rng.pick(text);
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (k in vars) return vars[k]!;
    if ((ROLES as string[]).includes(k)) return roleAvatar(x, k as NpcRole)?.name ?? 'người ấy';
    if (k === 'who') return x.sim.get(x.cast.who)?.name ?? 'người ấy';
    if (k === 'who_relation') {
      const w = x.sim.get(x.cast.who);
      return w ? relationWord(x.a.relations[w.id]?.kind) : 'người quen';
    }
    if (k === 'age') return String(x.sim.age(x.a));
    return '';
  });
  const opener = line.includes('{opener}') ? fill(x.sim.rng.pick(LHVK.narration.openers)) : '';
  return fill(line.replace('{opener}', opener)).replace(/\s+/g, ' ').trim();
}

function occurrenceVars(x: Ctx): Record<string, string> {
  const beast = `${x.sim.rng.pick(LHVK.narration.beastPrefixes)} ${x.sim.rng.pick(speciesFor(x.a.realm))}`;
  return { beast, beast_land: x.sim.rng.pick(LHVK.narration.beastLands) };
}

// ---- NPCs as real avatars -----------------------------------------------------------------

const LADDER: [number, number][] = REALMS.flatMap((r) => r.stages.map((_, i) => [r.rank, i] as [number, number]));

function shiftRealm(realm: number, stage: number, by: number): [number, number] {
  const i = LADDER.findIndex(([r, s]) => r === realm && s === stage);
  return LADDER[Math.max(1, Math.min(LADDER.length - 1, (i < 0 ? 0 : i) + by))]!;
}

function setRealm(sim: Sim, o: Avatar, realm: number, stage: number): void {
  if (realm > 0) {
    if (sim.rootTier(o) === 0) {
      o.rootId = 'tam_linh_can';
      o.elements = [...BASIC_ELEMENTS].slice(0, 3) as Element[];
    }
    if (!o.technique) o.technique = sim.pickTechnique(Math.min(4, 1 + Math.floor(realm / 2)), o.elements);
  }
  o.realm = realm;
  o.stage = stage;
  o.tuVi = 0;
}

function wantGender(a: Avatar, want: 'same' | 'opposite' | 'any' | undefined, role: NpcRole, sim: Sim) {
  const w = want ?? (role === 'partner' ? 'opposite' : 'any');
  if (w === 'same') return a.gender;
  if (w === 'opposite') return a.gender === 'male' ? 'female' : 'male';
  return sim.rng.chance(0.5) ? 'male' : 'female';
}

function meetNpc(x: Ctx, opts: NonNullable<Effects['npc']>): boolean {
  const { sim, a } = x;
  const role = opts.role;
  if (roleAvatar(x, role)) return false;
  const age = sim.age(a);
  const gender = wantGender(a, opts.gender, role, sim);
  const mortal = opts.mortal !== undefined;
  const fits = (o: Avatar): boolean => {
    if (o.id === a.id || !o.alive || a.relations[o.id] || o.soulLife !== null) return false;
    if (opts.gender && opts.gender !== 'any' && o.gender !== gender) return false;
    if (role === 'partner' && (o.gender !== gender || sim.relationOf(o, 'partner'))) return false;
    if (mortal && o.realm > 0) return false;
    const oa = sim.age(o);
    switch (role) {
      case 'master': return oa >= 30 && (a.realm === 0 ? o.realm >= 1 || oa >= 45 : o.realm > a.realm);
      case 'partner': return oa >= 16 && Math.abs(oa - age) <= 12 && Math.abs(o.realm - a.realm) <= 1;
      case 'rival': return a.realm > 0 && o.realm === a.realm && Math.abs(oa - age) <= 30;
      case 'disciple': return oa >= 6 && oa < age && sim.rootTier(o) > 0 && o.realm < Math.max(1, a.realm) && !sim.relationOf(o, 'master');
      case 'friend': return Math.abs(oa - age) <= 12 && (a.realm === 0 ? o.realm <= 1 : o.realm >= 1);
    }
  };
  let o = (sim.byRegion[a.regionId] ?? []).find(fits);
  if (!o) {
    const ageFor: Record<NpcRole, [number, number]> = {
      master: [Math.max(40, age + 20), Math.max(60, age + 60)],
      partner: [Math.max(16, age - 4), Math.max(18, age + 4)],
      rival: [Math.max(12, age - 4), age + 6],
      disciple: [Math.max(6, Math.min(age - 8, 10)), Math.max(8, Math.min(age - 4, 16))],
      friend: [Math.max(6, age - 4), age + 4],
    };
    const [lo, hi] = ageFor[role];
    const oa = sim.rng.int(Math.min(lo, hi), Math.max(lo, hi));
    o = sim.createAvatar({ regionId: a.regionId, birthMonth: sim.month - oa * 12 - sim.rng.int(0, 11), gender, originId: 'commoner' });
    sim.s.stats.births -= 1;
    if (role === 'master' && !mortal) setRealm(sim, o, Math.min(9, Math.max(1, a.realm + sim.rng.int(1, 2))), sim.rng.int(0, 3));
    if (role === 'disciple' && sim.rootTier(o) === 0) { o.rootId = 'tam_linh_can'; o.elements = ['moc', 'thuy', 'tho']; }
    if ((role === 'friend' || role === 'partner') && a.realm > 0 && !mortal) setRealm(sim, o, a.realm, Math.max(0, a.stage - 1));
    if (mortal) o.persona.ambition *= 0.5;
  }
  if (role === 'rival') {
    const [r, s] = shiftRealm(a.realm, a.stage, opts.offset ?? 1);
    setRealm(sim, o, r, s);
  }
  const bond = opts.bond ?? (role === 'rival' ? -30 : role === 'partner' ? 60 : 30);
  const back: Record<NpcRole, 'master' | 'disciple' | 'partner' | 'rival' | 'friend'> = { master: 'disciple', disciple: 'master', partner: 'partner', rival: 'rival', friend: 'friend' };
  sim.relate(a, o, role, back[role], bond);
  if (role === 'master' && o.sectId && !a.sectId && o.realm > 0 && sim.rootTier(a) > 0) joinSect(sim, a, o.sectId);
  x.cast[role] = o.id;
  return true;
}

function endNpc(x: Ctx, role: NpcRole, fate: 'died' | 'slain' | 'left' | 'reconciled'): void {
  const { sim, a } = x;
  const o = roleAvatar(x, role);
  if (!o) return;
  if (fate === 'died') sim.kill(o, 'illness', `Qua đời (trong câu chuyện của ${a.name})`);
  else if (fate === 'slain') sim.kill(o, 'battle', `Chết dưới tay ${a.name}`, a);
  else if (fate === 'left') {
    delete a.relations[o.id];
    delete o.relations[a.id];
    const far = REGIONS.filter((r) => r.world === REGION_BY_ID[o.regionId]!.world && r.id !== a.regionId && r.kind !== 'beast');
    if (far.length) o.regionId = sim.rng.pick(far).id;
    o.action = null;
  } else {
    const rel = a.relations[o.id];
    if (rel) rel.kind = 'friend';
    const back = o.relations[a.id];
    if (back) back.kind = 'friend';
  }
}

// ---- effects --------------------------------------------------------------------------------

function learnTechnique(sim: Sim, a: Avatar, name: string | undefined): boolean {
  const t = TECHNIQUES.find((x) => x.name === name);
  if (!t || sim.rootTier(a) === 0) return false;
  const score = (tt: { grade: number; element: Element | null }) => GRADES[tt.grade]!.mult * (tt.element && !a.elements.includes(tt.element) ? 0.8 : 1);
  if (a.technique && score(t) <= score(a.technique)) return false;
  a.technique = t;
  return true;
}

function deathCause(id: string): DeathCause {
  const map: Record<string, DeathCause> = { old_age: 'old_age', illness: 'illness', wound: 'wound', battle: 'battle', assassinated: 'assassinated', qi_deviation: 'qi_deviation', tribulation: 'tribulation' };
  return map[id] ?? 'illness';
}

function applyEffects(x: Ctx, fx: Effects | undefined): void {
  if (!fx) return;
  const { sim, a, st } = x;
  const world = REGION_BY_ID[a.regionId]!.world;
  const worldSect = (w: string) => (w === 'cultivation' ? 'thanh_van' : 'lac_ha');

  if (fx.spirit_root && rootTierOf(fx.spirit_root) > sim.rootTier(a)) {
    const root = SPIRIT_ROOTS.find((r) => r.id === fx.spirit_root)!;
    const pool = root.pool === 'mutant' ? MUTANT_ELEMENTS : BASIC_ELEMENTS;
    a.rootId = root.id;
    a.elements = a.elements.length ? a.elements.slice(0, Math.max(1, root.count[1])) : pool.slice(0, root.count[1]);
  }
  if (fx.world && fx.world !== world && REGIONS.some((r) => r.world === fx.world)) {
    a.regionId = fx.world === 'cultivation' ? 'phuong_thi' : 'ben_cang';
    a.action = null;
  }
  if (fx.stat) for (const [k, v] of Object.entries(fx.stat)) {
    const key = STAT[k as StatKey];
    a.stats[key] = Math.max(1, Math.min(100, a.stats[key] + v!));
  }
  for (const f of asList(fx.add_flag)) {
    st.flags[f] = true;
    if (f === 'in_sect' && !a.sectId && sim.rootTier(a) > 0) joinSect(sim, a, worldSect(REGION_BY_ID[a.regionId]!.world));
  }
  for (const f of asList(fx.remove_flag)) {
    delete st.flags[f];
    if (f === 'in_sect' && a.sectId) { a.sectId = null; a.sectRank = null; }
  }
  if (fx.set?.env) {
    const e = fx.set.env;
    if ((e === 'outer_sect' || e === 'inner_sect') && sim.rootTier(a) > 0) {
      if (!a.sectId) joinSect(sim, a, worldSect(REGION_BY_ID[a.regionId]!.world));
      if (e === 'inner_sect' && (a.sectRank === 'tap_dich' || a.sectRank === 'ngoai_mon')) a.sectRank = 'noi_mon';
    } else if (e === 'tan_tu' && a.sectId) {
      a.sectId = null;
      a.sectRank = null;
    }
  }
  if (fx.linh_thach) a.linhThach = Math.max(0, a.linhThach + fx.linh_thach);
  for (const i of asList(fx.item)) a.items[i] = (a.items[i] ?? 0) + 1;
  for (const i of asList(fx.consume_item)) if ((a.items[i] ?? 0) > 0) a.items[i]! -= 1;
  if (fx.technique) learnTechnique(sim, a, LHVK.techniques[fx.technique]);
  if (fx.technique_from && sim.rootTier(a) > 0) {
    const lo = GRADE_ORDER[fx.technique_from.grade_min ?? 'hoang'] ?? 1;
    const hi = GRADE_ORDER[fx.technique_from.grade_max ?? 'thien'] ?? 4;
    const pool = TECHNIQUES.filter((t) => t.grade >= lo && t.grade <= hi);
    const t = sim.rng.weighted(pool, (tt) => (tt.element === null ? 2 : a.elements.includes(tt.element) ? 4 : 0.5));
    learnTechnique(sim, a, t.name);
  }
  if (fx.artifact && !a.artifacts.includes(fx.artifact)) a.artifacts.push(fx.artifact);
  const learnSkill = (id: string) => {
    const name = LHVK.skills[id]?.name;
    if (!name || a.skills.includes(name)) return;
    a.skills.push(name);
    if (a.skills.length > 4) a.skills.shift();
  };
  if (fx.skill) learnSkill(fx.skill);
  if (fx.skill_from && sim.rootTier(a) > 0) {
    const lo = GRADE_ORDER[fx.skill_from.grade_min ?? 'hoang'] ?? 1;
    const hi = GRADE_ORDER[fx.skill_from.grade_max ?? 'thien'] ?? 4;
    const pool = Object.entries(LHVK.skills).filter(([, k]) => {
      const g = GRADE_ORDER[k.grade] ?? 1;
      return g >= lo && g <= hi && (k.element === null || a.elements.includes(k.element as Element)) && !a.skills.includes(k.name);
    });
    if (pool.length) learnSkill(sim.rng.pick(pool)[0]);
  }
  if (fx.tu_vi || fx.tu_vi_stage || fx.tu_vi_years) {
    const r = REALMS[a.realm]!;
    const delta = (fx.tu_vi ?? 0) + (fx.tu_vi_stage ?? 0) * r.stageCost + (fx.tu_vi_years ?? 0) * sim.cultivationPerMonth(a) * 12;
    if (delta > 0) sim.addTuVi(a, delta);
    else a.tuVi = Math.max(0, a.tuVi + delta);
  }
  if (fx.lifespan) a.lifespanBonus += fx.lifespan;
  if (fx.heal) a.injuredUntil = 0;
  if (fx.injury) a.injuredUntil = Math.max(a.injuredUntil, sim.month + 60);
  if (fx.cripple) { a.crippled = true; a.stats.canCot = Math.max(1, a.stats.canCot - 15); }
  for (const slot of asList(fx.path_end)) endPath(x, slot);
  if (fx.path) startPath(x, fx.path);
  if (fx.npc) meetNpc(x, fx.npc);
  for (const [r, d] of Object.entries(fx.npc_bond ?? {})) {
    const o = roleAvatar(x, r as NpcRole);
    if (!o) continue;
    for (const rel of [a.relations[o.id], o.relations[a.id]]) if (rel) rel.bond = Math.max(-100, Math.min(100, rel.bond + d!));
  }
  for (const [r, d] of Object.entries(fx.npc_offset ?? {})) {
    const o = roleAvatar(x, r as NpcRole);
    if (o && o.realm > 0) { const [rr, ss] = shiftRealm(o.realm, o.stage, d!); setRealm(sim, o, rr, ss); }
  }
  if (fx.npc_cultivate) {
    const o = roleAvatar(x, fx.npc_cultivate);
    if (o && o.realm === 0) setRealm(sim, o, 1, 0);
  }
  if (fx.npc_convert) {
    const o = roleAvatar(x, fx.npc_convert.from);
    if (o && !roleAvatar(x, fx.npc_convert.to)) {
      const rel = a.relations[o.id];
      const back = o.relations[a.id];
      if (rel) { rel.kind = fx.npc_convert.to; rel.bond = Math.max(rel.bond, 40); }
      if (back) { back.kind = fx.npc_convert.to === 'master' ? 'disciple' : fx.npc_convert.to === 'disciple' ? 'master' : fx.npc_convert.to; back.bond = Math.max(back.bond, 40); }
      x.cast[fx.npc_convert.to] = o.id;
      delete x.cast[fx.npc_convert.from];
    }
  }
  if (fx.npc_end) endNpc(x, fx.npc_end.role, fx.npc_end.fate);
  const who = sim.get(x.cast.who);
  if (who && who.alive) {
    if (fx.who_bond) for (const rel of [a.relations[who.id], who.relations[a.id]]) if (rel) rel.bond = Math.max(-100, Math.min(100, rel.bond + fx.who_bond));
    if (fx.who_mark === 'demonic') who.persona.virtue = Math.min(who.persona.virtue, -0.6);
    if (fx.who_realm && who.realm > 0) { const [rr, ss] = shiftRealm(who.realm, who.stage, fx.who_realm); setRealm(sim, who, rr, ss); }
    if (fx.who_end === 'dead') sim.kill(who, 'illness', 'Mất sau một biến cố');
    else if (fx.who_end === 'gone' || fx.who_end === 'missing') {
      const far = REGIONS.filter((r) => r.id !== who.regionId && r.kind !== 'sect' && r.population > 0);
      who.regionId = sim.rng.pick(far).id;
      who.action = null;
    }
  }
}

function startPath(x: Ctx, id: string): void {
  const p = PATH_BY_ID[id];
  if (!p) return;
  const age = x.sim.age(x.a);
  if (x.st.paths[p.slot]?.id === id) return;
  endPath(x, p.slot);
  x.st.paths[p.slot] = { id, since: age };
  x.st.pathHistory.push({ slot: p.slot, id, from: age, to: null });
  const { sim, a } = x;
  const world = REGION_BY_ID[a.regionId]!.world;
  if (id === 'sect_path' && !a.sectId && sim.rootTier(a) > 0) joinSect(sim, a, world === 'cultivation' ? 'thanh_van' : 'lac_ha');
  if ((id === 'rogue_path' || id === 'demonic_path') && a.sectId && SECTS.find((s) => s.id === a.sectId)?.alignment === 'righteous') {
    sim.log('sect', `${a.name} rời ${SECTS.find((s) => s.id === a.sectId)!.name}.`, [a.id], { regionId: a.regionId });
    a.sectId = null;
    a.sectRank = null;
  }
}

function endPath(x: Ctx, slot: string): void {
  if (!x.st.paths[slot]) return;
  const span = [...x.st.pathHistory].reverse().find((h) => h.slot === slot && h.to === null);
  if (span) span.to = x.sim.age(x.a);
  delete x.st.paths[slot];
}

// ---- checks ---------------------------------------------------------------------------------

function statValue(x: Ctx, stat: string): number {
  if (stat === 'linh_can_tier') return x.sim.rootTier(x.a);
  if (stat === 'realm_rank') return x.a.realm;
  return x.a.stats[STAT[stat as StatKey]];
}

function passCheck(x: Ctx, check: Check): boolean {
  const { sim, a } = x;
  if ('chance' in check) return sim.rng.chance(check.chance);
  if ('battle' in check) {
    const spec = check.battle;
    const opp = spec.opponent === 'bot' ? undefined : roleAvatar(x, spec.opponent);
    if (opp) return duel(sim, a, opp, 0).winner === a;
    const lead = sim.rng.int(spec.offset?.[0] ?? 0, spec.offset?.[1] ?? 0) + sim.rng.int(-1, 1);
    const [r, s] = shiftRealm(Math.max(1, a.realm), a.stage, lead);
    const ghost: Avatar = { ...a, realm: r, stage: s, stats: { canCot: 50, ngoTinh: 50, khiVan: 50, tamTinh: 50, miLuc: 50 }, technique: TECHNIQUES[0]!, injuredUntil: 0, crippled: false, artifacts: [] };
    const tactic = spec.tactic === 'cuong_manh' || spec.tactic === 'lieu_mang' ? 1.1 : 1;
    const pa = (sim.power(a) * tactic) ** 2;
    const pb = sim.power(ghost) ** 2;
    const won = sim.rng.next() < pa / (pa + pb);
    if (!won) a.injuredUntil = Math.max(a.injuredUntil, sim.month + sim.rng.int(6, 24));
    return won;
  }
  const v = statValue(x, check.stat);
  if ('min' in check) return v >= (typeof check.min === 'number' ? check.min : rootTierOf(check.min));
  return sim.rng.chance(Math.min(0.95, Math.max(0.05, 0.5 + (v - check.difficulty) / 100)));
}

// ---- running events -------------------------------------------------------------------------

function markFired(x: Ctx, e: StoryEvent): void {
  const age = x.sim.age(x.a);
  x.st.seen[e.id] = (x.st.seen[e.id] ?? 0) + 1;
  if (x.st.seenAt[e.id] === undefined) x.st.seenAt[e.id] = age;
  if (e.cooldown_years) x.st.cooldowns[e.id] = age + e.cooldown_years;
  if (e.kind === 'fortune' || e.kind === 'mythic') x.a.fortunes += 1;
}

/** Applies a check/outcome node, logs one chronicle line and returns it. */
function resolveNode(x: Ctx, e: StoryEvent, node: { check?: Check; success?: Outcome; fail?: Outcome; effects?: Outcome }, head: string): void {
  let fx = node.effects;
  if (node.check) fx = passCheck(x, node.check) ? node.success : node.fail;
  const vars = occurrenceVars(x);
  applyEffects(x, fx);
  const tail = render(x, fx?.text, vars);
  const ids = [x.a.id, ...Object.values(x.cast).filter((v): v is number => v !== undefined)];
  const major = e.kind === 'mythic' || (e.rarity === 'epic' && x.a.realm >= 2);
  x.sim.log('story', `${head}${tail ? ` ${tail}` : ''}`.trim(), [...new Set(ids)], { regionId: x.a.regionId, major });
  if (fx?.death) x.sim.kill(x.a, deathCause(fx.death), tail || LHVK.deathCauses[fx.death]?.name || 'Qua đời');
}

function visibleChoices(x: Ctx, e: StoryEvent): { choice: Choice; index: number }[] {
  return (e.choices ?? []).map((choice, index) => ({ choice, index })).filter(({ choice }) => matches(x, choice.conditions));
}

function effectiveWeight(x: Ctx, e: StoryEvent): number {
  const luck = LHVK.eventConfig.luck;
  const kv = x.a.stats.khiVan - 50;
  const m = x.sim.mods(x.a);
  let w = e.weight;
  if (e.kind === 'fortune' || e.kind === 'mythic') w *= Math.min(luck.max, Math.max(luck.min, 1 + kv * luck.fortuneSlope)) * (m.fortuneWeightMult ?? 1);
  else if (e.kind === 'calamity') w *= Math.min(luck.max, Math.max(luck.min, 1 - kv * luck.calamitySlope)) * (m.calamityWeightMult ?? 1);
  for (const t of e.tags ?? []) w *= m.eventTagWeightMult?.[t] ?? 1;
  return w;
}

function eventsThisYear(x: Ctx): number {
  const p = LHVK.eventConfig.pacing;
  const probs = x.sim.age(x.a) <= p.childhood.maxAge ? p.childhood.counts
    : x.a.realm === 0 ? p.mortal : (p.cultivator[REALMS[x.a.realm]!.id] ?? p.mortal);
  let r = x.sim.rng.next();
  for (let i = 0; i < probs.length; i++) { r -= probs[i]!; if (r < 0) return i; }
  return 0;
}

function castFor(x: Ctx): Cast {
  const cast: Cast = {};
  for (const r of ROLES) {
    const o = x.sim.relationOf(x.a, r);
    if (o) cast[r] = o.id;
  }
  return cast;
}

function offerEvent(x: Ctx, e: StoryEvent, options: { choice: Choice; index: number }[]): PendingChoice {
  const vars = occurrenceVars(x);
  const prompt = render(x, e.text, vars);
  const data: Record<string, string | number> = { event: e.id, prompt };
  for (const [k, v] of Object.entries(x.cast)) if (v !== undefined) data[`cast_${k}`] = v;
  return { kind: 'event', prompt: `${e.title}. ${prompt}`, options: options.map(({ choice, index }) => ({ id: `c${index}`, label: choice.label })), data };
}

/** Runs once per year of the player's life. Returns a choice when one is needed. */
export function storyYear(sim: Sim, a: Avatar): PendingChoice | null {
  const st = sim.s.soul.story;
  const age = sim.age(a);
  if (st.lastYear === age) return null;
  st.lastYear = age;
  const x: Ctx = { sim, a, st, cast: {} };
  x.cast = castFor(x);

  // Turning points first: the first year their window opens (fated ones land at random in it).
  for (const e of MILESTONES) {
    if (!a.alive) return null;
    if (st.seen[e.id] || !matches(x, e.conditions)) continue;
    if (e.fated) {
      const last = e.conditions?.age?.[1] ?? age;
      if (sim.rng.next() * Math.max(1, last - age + 1) >= 1) continue;
      markFired(x, e);
      resolveNode(x, e, e, render(x, e.text, occurrenceVars(x)));
      continue;
    }
    const opts = visibleChoices(x, e);
    if (opts.length < 2) continue;
    markFired(x, e);
    st.lastCrossroadAge = age;
    return offerEvent(x, e, opts);
  }

  // A request from someone the player knows.
  const known = Object.entries(a.relations).map(([id]) => sim.get(Number(id))).filter((o): o is Avatar => !!o && o.alive && sim.age(o) >= 12);
  if (known.length && sim.rng.chance(0.06)) {
    const who = sim.rng.pick(known);
    const xw: Ctx = { ...x, cast: { ...x.cast, who: who.id } };
    const pool = ACQUAINTANCE_EVENTS.filter((e) => !((st.cooldowns[e.id] ?? -1) > age) && matches(xw, e.conditions));
    if (pool.length) {
      const e = sim.rng.weighted(pool, (ev) => ev.weight);
      const opts = visibleChoices(xw, e);
      if (opts.length >= 2) {
        markFired(xw, e);
        return offerEvent(xw, e, opts);
      }
    }
  }

  const n = eventsThisYear(x);
  const fired = new Set<string>();
  const cr = LHVK.eventConfig.crossroad;
  for (let i = 0; i < n && a.alive; i++) {
    const pool: (StoryEvent | null)[] = RANDOM_EVENTS.filter((e) => {
      if (fired.has(e.id) || (e.once_per_life && st.seen[e.id]) || (st.cooldowns[e.id] ?? -1) > age) return false;
      if (e.choices && (st.crossroads >= cr.maxPerLife || age - st.lastCrossroadAge < cr.minGapYears)) return false;
      return matches(x, e.conditions);
    });
    pool.push(null);
    const e = sim.rng.weighted(pool, (ev) => (ev ? effectiveWeight(x, ev) : LHVK.eventConfig.pacing.quietWeight));
    if (!e) continue;
    fired.add(e.id);
    if (e.choices) {
      const opts = visibleChoices(x, e);
      if (opts.length < 2) continue;
      markFired(x, e);
      st.crossroads += 1;
      st.lastCrossroadAge = age;
      return offerEvent(x, e, opts);
    }
    markFired(x, e);
    resolveNode(x, e, e, render(x, e.text, occurrenceVars(x)));
  }
  return null;
}

/** The player answered an event prompt. */
export function resolveStoryChoice(sim: Sim, a: Avatar, p: PendingChoice, optionId: string): void {
  const e = EVENT_BY_ID[String(p.data?.event)];
  if (!e?.choices) return;
  const choice = e.choices[Number(optionId.slice(1))];
  if (!choice) return;
  const cast: Cast = {};
  for (const [k, v] of Object.entries(p.data ?? {})) if (k.startsWith('cast_')) cast[k.slice(5) as NpcRole | 'who'] = Number(v);
  const x: Ctx = { sim, a, st: sim.s.soul.story, cast };
  resolveNode(x, e, choice, `${p.data?.prompt ?? ''} (${choice.label})`);
}

/** Auto-choice by temperament (GDD LHVK 5.4): score = base + slope × (Tâm tính − 50) per tag. */
export function autoChoose(sim: Sim, a: Avatar, p: PendingChoice): string {
  const e = EVENT_BY_ID[String(p.data?.event)];
  const cfg = LHVK.autochoice;
  const mods = sim.mods(a);
  let best = p.options[0]!.id;
  let bestScore = -Infinity;
  for (const o of p.options) {
    const ch = e?.choices?.[Number(o.id.slice(1))];
    const tags = ch?.tags ?? [];
    let score = tags.length ? 0 : 1;
    for (const t of tags) {
      const tc = cfg.tags[t];
      score += Math.max(cfg.minScore, (tc ? tc.base + tc.slope * (a.stats.tamTinh - 50) : 1)) * (mods.choiceTagMult?.[t] ?? 1);
    }
    if (tags.length) score /= tags.length;
    if (score > bestScore) { bestScore = score; best = o.id; }
  }
  return best;
}

/** Utility boost for actions that fit the player's current life paths. */
const PATH_ACTIONS: Record<string, Record<string, number>> = {
  farmer: { muu_sinh: 1.6 }, merchant: { buon_ban: 2.5 }, official: { khoa_cu: 1.5 }, soldier_path: { tong_quan: 2.5 },
  healer: { hanh_y: 2.5 }, smith: { muu_sinh: 1.5 }, sect_path: { nhiem_vu: 1.6 }, rogue_path: { du_ngoan: 2, san_yeu: 1.3 },
  demonic_path: { cuop_doat: 2 }, alchemist_path: { mua_dan: 1.6 }, sword_path: { ngo_kiem: 2.5, khieu_chien: 1.4 },
  wanderer: { phieu_bat: 2, du_ngoan: 1.6 }, longevity_legacy: { linh_mach: 1.5, bi_canh: 1.4 },
};

export function pathActionBoost(sim: Sim, a: Avatar, actionId: string): number {
  if (!sim.isPlayer(a)) return 1;
  let m = 1;
  for (const p of Object.values(sim.s.soul.story.paths)) if (p) m *= PATH_ACTIONS[p.id]?.[actionId] ?? 1;
  return m;
}

export function pathNames(sim: Sim): string[] {
  return Object.values(sim.s.soul.story.paths).filter((p): p is { id: string; since: number } => !!p).map((p) => PATH_BY_ID[p.id]?.name ?? p.id);
}

