import type { Artifact, BattleConfig, Content, Skill, TacticId } from './content';
import { createRng, type Rng } from './rng';
import { chance, clamp, uniform } from './rng-helpers';
import { combatStats, elementMult } from './stats';
import type { BattleResult, BattleSide, CombatStats, Side, SoulSeal, TurnLog } from './types';

interface StatusInst {
  turns: number;
  stacks: number;
  /** Damage per stack per turn (dot statuses). */
  dmg: number;
}

interface Gear {
  lifesteal: number;
  reflect: number;
  firstStrike: boolean;
  lastStand: boolean;
  critBonus: number;
  statusResist: number;
}

export interface Fighter {
  side: Side;
  seal: SoulSeal;
  tactic: TacticId;
  base: CombatStats;
  /**
   * The realm's battle factor. Thủ scales with it, so the defence constant must too, or from
   * Nguyên Anh up every hit shrinks to nothing and no fight ever ends (it did: 0% KO).
   */
  defK: number;
  hp: number;
  mp: number;
  shield: number;
  defending: boolean;
  defendedLast: boolean;
  statuses: Record<string, StatusInst>;
  cooldowns: Record<string, number>;
  treasureLeft: number;
  treasurePower: number | null;
  ultimateUsed: boolean;
  lastStandLeft: boolean;
  gear: Gear;
  skills: Skill[];
}

type Action =
  { kind: 'attack' } | { kind: 'skill'; skill: Skill } | { kind: 'defend' } | { kind: 'treasure' };

function gearOf(content: Content, seal: SoulSeal): Gear {
  const g: Gear = {
    lifesteal: 0,
    reflect: 0,
    firstStrike: false,
    lastStand: false,
    critBonus: 0,
    statusResist: 0,
  };
  for (const id of Object.values(seal.artifacts)) {
    const a: Artifact | undefined = id ? content.artifacts.find((x) => x.id === id) : undefined;
    const b = a?.battle;
    if (!b) continue;
    g.lifesteal += b.lifesteal ?? 0;
    g.reflect += b.reflect ?? 0;
    g.firstStrike ||= b.firstStrike ?? false;
    g.lastStand ||= b.lastStand ?? false;
    g.critBonus += b.critBonus ?? 0;
    g.statusResist += b.statusResist ?? 0;
  }
  return g;
}

function makeFighter(content: Content, side: Side, s: BattleSide): Fighter {
  const base = combatStats(content, s.seal);
  const treasureId = s.seal.artifacts.treasure;
  const treasure = treasureId ? content.artifacts.find((a) => a.id === treasureId) : undefined;
  const gear = gearOf(content, s.seal);
  return {
    side,
    seal: s.seal,
    tactic: s.tactic,
    base,
    defK: content.realms.find((r) => r.id === s.seal.realm.id)?.battleMult ?? 1,
    hp: base.hp,
    mp: base.mp,
    shield: 0,
    defending: false,
    defendedLast: false,
    statuses: {},
    cooldowns: {},
    treasureLeft: treasure ? content.battle.treasure.usesPerBattle : 0,
    treasurePower: treasure ? (content.battle.treasure.gradePower[treasure.grade] ?? null) : null,
    ultimateUsed: false,
    lastStandLeft: gear.lastStand,
    gear,
    skills: s.seal.skills
      .map((id) => content.skills.find((k) => k.id === id))
      .filter((k): k is Skill => k !== undefined),
  };
}

const hpRatio = (f: Fighter) => f.hp / f.base.hp;
const skillElement = (f: Fighter, k: Skill) => k.element ?? f.seal.primaryElement;

/** Product of a stat's status multipliers (e.g. chill −20% ⇒ ×0.8). */
function statMult(cfg: BattleConfig, f: Fighter, key: 'atk' | 'def' | 'spd'): number {
  let m = 1;
  for (const id of Object.keys(f.statuses)) m *= 1 + (cfg.statuses[id]?.[key] ?? 0);
  return Math.max(0.1, m);
}
const effSpd = (cfg: BattleConfig, f: Fighter) => f.base.spd * statMult(cfg, f, 'spd');

function usable(cfg: BattleConfig, f: Fighter): Skill[] {
  return f.skills.filter(
    (k) =>
      f.mp >= k.mpCost &&
      (f.cooldowns[k.id] ?? 0) === 0 &&
      (!k.ultimate || (!f.ultimateUsed && hpRatio(f) < cfg.ultimateBelowHp)),
  );
}

/** How much a status is worth landing, for the AI (skip > dot > stat debuff). */
function statusValue(cfg: BattleConfig, id: string | undefined, t: Fighter): number {
  if (!id || t.statuses[id]) return 0;
  const st = cfg.statuses[id];
  if (!st) return 0;
  if (st.skipChance) return 0.4 + st.skipChance;
  if (st.dotOfAtk) return 0.5;
  return 0.3;
}

/** Expected offensive value of an action, without randomness. */
function offenseScore(cfg: BattleConfig, f: Fighter, t: Fighter, a: Action): number {
  const def = t.seal.primaryElement;
  switch (a.kind) {
    case 'attack':
      return cfg.basicAttackPower * elementMult(cfg, f.seal.primaryElement, def);
    case 'treasure':
      return f.treasurePower ?? 0;
    case 'defend':
      return 0;
    case 'skill': {
      const k = a.skill;
      if (k.effect === 'damage') {
        const st = k.inflict ? statusValue(cfg, k.inflict.status, t) * k.inflict.chance : 0;
        return k.power * elementMult(cfg, skillElement(f, k), def) + st;
      }
      if (k.effect === 'buff') return f.statuses[k.self?.status ?? ''] ? 0 : 0.6;
      return 0;
    }
  }
}

function best(cfg: BattleConfig, f: Fighter, t: Fighter, options: Action[]): Action {
  let out = options[0] ?? ({ kind: 'attack' } as Action);
  let score = -Infinity;
  for (const o of options) {
    const s = offenseScore(cfg, f, t, o);
    if (s > score) {
      score = s;
      out = o;
    }
  }
  return out;
}

function offenseOptions(cfg: BattleConfig, f: Fighter): Action[] {
  const o: Action[] = [{ kind: 'attack' }];
  for (const k of usable(cfg, f))
    if (k.effect === 'damage' || k.effect === 'buff') o.push({ kind: 'skill', skill: k });
  if (f.treasureLeft > 0) o.push({ kind: 'treasure' });
  return o;
}

/** GDD 8.5 tactics, aware of statuses and tuyệt kỹ. Deterministic. */
export function chooseAction(cfg: BattleConfig, f: Fighter, t: Fighter): Action {
  const avail = usable(cfg, f);
  const ult = avail.find((k) => k.ultimate);
  switch (f.tactic) {
    case 'cuong_manh':
    case 'lieu_mang':
      if (ult) return { kind: 'skill', skill: ult };
      return best(cfg, f, t, offenseOptions(cfg, f));
    case 'on_trong': {
      if (hpRatio(f) < cfg.tactics.on_trong.defendBelowHp && !f.defendedLast) {
        const guard =
          avail.find((k) => k.effect === 'heal') ??
          avail.find((k) => k.effect === 'shield') ??
          avail.find(
            (k) =>
              k.effect === 'buff' &&
              k.self &&
              cfg.statuses[k.self.status]?.def &&
              !f.statuses[k.self.status],
          );
        return guard ? { kind: 'skill', skill: guard } : { kind: 'defend' };
      }
      if (ult) return { kind: 'skill', skill: ult };
      const buff = avail.find((k) => k.effect === 'buff' && k.self && !f.statuses[k.self.status]);
      if (buff) return { kind: 'skill', skill: buff };
      // Save MP for the strongest damaging skill.
      const strongest = f.skills
        .filter((k) => k.effect === 'damage' && !k.ultimate)
        .sort((x, y) => y.power - x.power)[0];
      if (strongest && avail.includes(strongest)) return { kind: 'skill', skill: strongest };
      if (f.treasureLeft > 0 && hpRatio(t) < 0.5) return { kind: 'treasure' };
      const reserve = strongest?.mpCost ?? 0;
      const spare = avail.filter(
        (k) =>
          k !== strongest && k.effect === 'damage' && !k.ultimate && f.mp - k.mpCost >= reserve,
      );
      return spare.length
        ? best(
            cfg,
            f,
            t,
            spare.map((k) => ({ kind: 'skill', skill: k })),
          )
        : { kind: 'attack' };
    }
    case 'quy_quyet': {
      if (ult) return { kind: 'skill', skill: ult };
      // Disable first (skip statuses), then damage over time, then counter-element hits.
      const byStatus = (pred: (id: string) => boolean) =>
        avail
          .filter(
            (k) =>
              k.effect === 'damage' &&
              k.inflict &&
              pred(k.inflict.status) &&
              !t.statuses[k.inflict.status],
          )
          .sort((x, y) => (y.inflict?.chance ?? 0) - (x.inflict?.chance ?? 0))[0];
      const disable = byStatus((id) => (cfg.statuses[id]?.skipChance ?? 0) > 0);
      if (disable) return { kind: 'skill', skill: disable };
      const dot = byStatus((id) => (cfg.statuses[id]?.dotOfAtk ?? 0) > 0);
      if (dot) return { kind: 'skill', skill: dot };
      const counter = avail
        .filter(
          (k) =>
            k.effect === 'damage' &&
            elementMult(cfg, skillElement(f, k), t.seal.primaryElement) > 1,
        )
        .sort((x, y) => y.power - x.power)[0];
      if (counter) return { kind: 'skill', skill: counter };
      return best(cfg, f, t, offenseOptions(cfg, f));
    }
  }
}

/** Applies damage to `t`, honouring shield and bảo mệnh. Returns HP actually lost. */
/** Share of a hit that gets through Thủ; the defence constant scales with the defender's realm. */
function mitigation(cfg: BattleConfig, t: Fighter, def: number): number {
  const c = cfg.defenseConstant * t.defK;
  return c / (c + def);
}

function takeDamage(t: Fighter, amount: number, entry?: TurnLog): number {
  let dmg = amount;
  if (t.shield > 0) {
    const absorbed = Math.min(t.shield, dmg);
    t.shield -= absorbed;
    dmg -= absorbed;
  }
  if (dmg >= t.hp && t.lastStandLeft) {
    t.lastStandLeft = false;
    dmg = t.hp - 1;
    if (entry) entry.lastStand = t.side;
  }
  t.hp = Math.max(0, t.hp - dmg);
  return dmg;
}

function inflict(cfg: BattleConfig, rng: Rng, f: Fighter, t: Fighter, k: Skill, entry: TurnLog) {
  if (!k.inflict || t.hp <= 0) return;
  const st = cfg.statuses[k.inflict.status];
  if (!st) return;
  const r = cfg.statusResist;
  const p = clamp(
    k.inflict.chance * (1 - t.gear.statusResist) - (t.base.will - 50) * r.perWill,
    r.clamp[0],
    r.clamp[1],
  );
  if (!chance(rng, p)) return;
  const cur = t.statuses[k.inflict.status];
  // Damage over time goes through the target's Thủ like a hit, and does not scale with skill power.
  const defFactor = mitigation(cfg, t, t.base.def * statMult(cfg, t, 'def'));
  const dmg = st.dotOfAtk
    ? Math.max(1, Math.round(f.base.atk * statMult(cfg, f, 'atk') * st.dotOfAtk * defFactor))
    : 0;
  t.statuses[k.inflict.status] = {
    turns: st.turns,
    stacks: Math.min(st.maxStacks, (cur?.stacks ?? 0) + 1),
    dmg: Math.max(dmg, cur?.dmg ?? 0),
  };
  (entry.inflicted ??= []).push(k.inflict.status);
}

function hit(
  cfg: BattleConfig,
  rng: Rng,
  f: Fighter,
  t: Fighter,
  power: number,
  mult: number,
  entry: TurnLog,
) {
  const desperate = f.tactic === 'lieu_mang' && hpRatio(f) < cfg.tactics.lieu_mang.belowHp;
  const atk =
    f.base.atk * statMult(cfg, f, 'atk') * (desperate ? 1 + cfg.tactics.lieu_mang.atkBonus : 1);
  const def = t.base.def * statMult(cfg, t, 'def');
  const crit = chance(rng, Math.min(1, f.base.crit + f.gear.critBonus));
  let dmg =
    atk *
    power *
    mult *
    mitigation(cfg, t, def) *
    uniform(rng, cfg.variance[0], cfg.variance[1]) *
    (crit ? cfg.critMult : 1);
  if (t.defending) dmg *= cfg.defendDamageMult;
  if (t.tactic === 'on_trong') dmg *= cfg.tactics.on_trong.damageTakenMult;
  const lost = takeDamage(t, Math.max(1, Math.round(dmg)), entry);
  entry.damage = (entry.damage ?? 0) + lost;
  entry.crit = entry.crit || crit;
  if (f.gear.lifesteal > 0 && lost > 0) {
    const heal = Math.min(f.base.hp - f.hp, Math.round(lost * f.gear.lifesteal));
    f.hp += heal;
    if (heal > 0) entry.lifesteal = (entry.lifesteal ?? 0) + heal;
  }
  if (t.gear.reflect > 0 && lost > 0 && f.hp > 0) {
    const back = Math.max(1, Math.round(lost * t.gear.reflect));
    entry.reflected = (entry.reflected ?? 0) + takeDamage(f, back, entry);
  }
}

/**
 * GDD 8.3 + Phụ lục B: auto battle between two Hồn ấn. Same (seed, seals, tactics, content)
 * ⇒ same log. The client only replays `log`; the server recomputes from the seed to verify.
 */
export function simulateBattle(
  content: Content,
  seed: number | string,
  a: BattleSide,
  b: BattleSide,
): BattleResult {
  const cfg = content.battle;
  const rng = createRng(`battle:${seed}`);
  const fa = makeFighter(content, 'a', a);
  const fb = makeFighter(content, 'b', b);
  const log: TurnLog[] = [];
  const snap = () => ({
    hp: [fa.hp, fb.hp] as [number, number],
    mp: [Math.round(fa.mp), Math.round(fb.mp)] as [number, number],
  });
  const dead = () => fa.hp <= 0 || fb.hp <= 0;

  // Round 1: first strike beats speed; otherwise speed, ties by coin.
  const coin = chance(rng, 0.5);
  let order: Fighter[];
  if (fa.gear.firstStrike !== fb.gear.firstStrike)
    order = fa.gear.firstStrike ? [fa, fb] : [fb, fa];
  else
    order =
      fa.base.spd > fb.base.spd || (fa.base.spd === fb.base.spd && coin) ? [fa, fb] : [fb, fa];
  const first = order[0]!.side;

  let round = 0;
  for (round = 1; round <= cfg.maxRounds && !dead(); round++) {
    if (round > 1) {
      // Later rounds re-sort by effective speed (bind/freeze/gale); ties keep the previous order.
      const [x, y] = order as [Fighter, Fighter];
      if (effSpd(cfg, y) > effSpd(cfg, x)) order = [y, x];
    }
    for (const f of order) {
      if (dead()) break;
      const t = f === fa ? fb : fa;
      f.defendedLast = f.defending;
      f.defending = false;
      for (const k of Object.keys(f.cooldowns))
        if ((f.cooldowns[k] ?? 0) > 0) f.cooldowns[k] = (f.cooldowns[k] ?? 0) - 1;
      f.mp = Math.min(f.base.mp, f.mp + f.base.mp * cfg.mpRegenPct);

      // Damage over time.
      for (const [id, inst] of Object.entries(f.statuses)) {
        if (!inst.dmg) continue;
        const e: TurnLog = { round, actor: f.side, action: 'status_tick', statusId: id, ...snap() };
        e.damage = takeDamage(f, inst.dmg * inst.stacks, e);
        Object.assign(e, snap());
        log.push(e);
        if (dead()) break;
      }
      if (dead()) break;
      // Burning blood never kills the one who burns it: it stops at 1 HP (only the foe can finish).
      if (f.tactic === 'lieu_mang' && hpRatio(f) < cfg.tactics.lieu_mang.belowHp && f.hp > 1) {
        const e: TurnLog = { round, actor: f.side, action: 'blood_burn', ...snap() };
        const burn = Math.max(1, Math.round(f.base.hp * cfg.tactics.lieu_mang.hpLossPerTurn));
        e.damage = takeDamage(f, Math.min(burn, f.hp - 1), e);
        Object.assign(e, snap());
        log.push(e);
        if (dead()) break;
      }
      // Skip check, then statuses tick down.
      let skipBy: string | null = null;
      for (const id of Object.keys(f.statuses)) {
        const p = cfg.statuses[id]?.skipChance ?? 0;
        if (p > 0 && chance(rng, p)) {
          skipBy = id;
          break;
        }
      }
      for (const [id, inst] of Object.entries(f.statuses)) {
        if (inst.turns <= 1) delete f.statuses[id];
        else inst.turns -= 1;
      }
      if (skipBy) {
        log.push({ round, actor: f.side, action: 'skip', statusId: skipBy, ...snap() });
        continue;
      }

      const act = chooseAction(cfg, f, t);
      const entry: TurnLog = {
        round,
        actor: f.side,
        action: act.kind === 'skill' ? 'skill' : act.kind,
        ...snap(),
      };
      if (act.kind === 'defend') {
        f.defending = true;
      } else if (act.kind === 'attack') {
        entry.mult = elementMult(cfg, f.seal.primaryElement, t.seal.primaryElement);
        hit(cfg, rng, f, t, cfg.basicAttackPower, entry.mult, entry);
      } else if (act.kind === 'treasure') {
        f.treasureLeft -= 1;
        hit(cfg, rng, f, t, f.treasurePower ?? 1, 1, entry);
      } else {
        const k = act.skill;
        f.mp -= k.mpCost;
        if (k.cooldown > 0) f.cooldowns[k.id] = k.cooldown + 1;
        if (k.ultimate) {
          f.ultimateUsed = true;
          entry.ultimate = true;
        }
        entry.skillId = k.id;
        if (k.effect === 'damage') {
          entry.mult = elementMult(cfg, skillElement(f, k), t.seal.primaryElement);
          hit(cfg, rng, f, t, k.power, entry.mult, entry);
          inflict(cfg, rng, f, t, k, entry);
        } else if (k.effect === 'shield') {
          const v = Math.round(f.base.hp * cfg.shield.ofMaxHp * k.power);
          f.shield += v;
          entry.shield = v;
        } else if (k.effect === 'heal') {
          const v = Math.min(f.base.hp - f.hp, Math.round(f.base.hp * cfg.heal.ofMaxHp * k.power));
          f.hp += v;
          entry.heal = v;
        } else if (k.self) {
          const st = cfg.statuses[k.self.status];
          if (st) f.statuses[k.self.status] = { turns: st.turns, stacks: 1, dmg: 0 };
          entry.buff = k.self.status;
        }
      }
      Object.assign(entry, snap());
      log.push(entry);
      // Tật phong: a bonus light hit after acting.
      if (!dead() && act.kind !== 'defend') {
        const extra = Object.keys(f.statuses).reduce(
          (m, id) => Math.max(m, cfg.statuses[id]?.extraHitChance ?? 0),
          0,
        );
        if (extra > 0 && chance(rng, extra)) {
          const e: TurnLog = { round, actor: f.side, action: 'extra_hit', ...snap() };
          e.mult = elementMult(cfg, f.seal.primaryElement, t.seal.primaryElement);
          hit(cfg, rng, f, t, cfg.extraHitPower, e.mult, e);
          Object.assign(e, snap());
          log.push(e);
        }
      }
    }
  }
  const rounds = Math.min(round - 1, cfg.maxRounds);

  let winner: Side | null;
  let end: BattleResult['end'] = 'ko';
  if (fa.hp <= 0 && fb.hp > 0) winner = 'b';
  else if (fb.hp <= 0 && fa.hp > 0) winner = 'a';
  else {
    end = fa.hp <= 0 && fb.hp <= 0 ? 'ko' : 'timeout';
    const ra = hpRatio(fa);
    const rb = hpRatio(fb);
    winner = ra > rb ? 'a' : rb > ra ? 'b' : null;
  }
  return { winner, rounds, end, start: { a: fa.base, b: fb.base, first }, log };
}
