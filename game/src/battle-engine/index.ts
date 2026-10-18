// Real battles (GDD 8) for the living world: Hồn ấn snapshots of avatars, NPC tactics from
// temperament, and narrated replays kept for the player's fights.

import { REALMS, GRADES } from '../content/cultivation';
import { REGION_BY_ID, type Sim } from '../sim';
import type { Avatar } from '../types';
import { BATTLE_CONTENT, TACTIC_IDS, type Element, type TacticId } from './content';
import { narrateBattle } from './narration';
import { simulateBattle } from './simulate';
import type { BattleResult, SoulSeal } from './types';

export type { SoulSeal, BattleResult } from './types';
export type { TacticId } from './content';
export { TACTIC_IDS } from './content';

export const TACTIC_NAMES: Record<TacticId, string> = {
  cuong_manh: 'Cương mãnh', on_trong: 'Ổn trọng', quy_quyet: 'Quỷ quyệt', lieu_mang: 'Liều mạng',
};

const ARTIFACT_RANK: Record<string, number> = { pham: 1, linh: 2, bao: 3, huyen: 4, tien: 5 };
const skillIdByName = new Map(BATTLE_CONTENT.skills.map((k) => [k.name, k.id]));
const techniqueByName = new Map(BATTLE_CONTENT.techniques.map((t) => [t.name, t]));

/** GDD 8.1: an immutable snapshot of the avatar as it is now. */
export function sealOf(sim: Sim, a: Avatar): SoulSeal {
  const tech = a.technique ? techniqueByName.get(a.technique.name) : undefined;
  const skills: string[] = [];
  for (const name of a.skills) { const id = skillIdByName.get(name); if (id && !skills.includes(id)) skills.push(id); }
  for (const id of tech?.skills ?? []) if (!skills.includes(id) && skills.length < 4) skills.push(id);
  const artifacts: SoulSeal['artifacts'] = {};
  for (const id of a.artifacts) {
    const art = BATTLE_CONTENT.artifacts.find((x) => x.id === id);
    if (!art) continue;
    const cur = artifacts[art.slot] ? BATTLE_CONTENT.artifacts.find((x) => x.id === artifacts[art.slot]) : undefined;
    if (!cur || (ARTIFACT_RANK[art.grade] ?? 0) > (ARTIFACT_RANK[cur.grade] ?? 0)) artifacts[art.slot] = art.id;
  }
  const realm = REALMS[a.realm]!;
  return {
    v: 1,
    contentVersion: 'van-kiep-thien-ha',
    name: a.name,
    gender: a.gender,
    worldId: REGION_BY_ID[a.regionId]?.world ?? a.bornWorld,
    spiritRootId: a.rootId,
    realm: { id: realm.id, stage: Math.min(realm.stages.length, a.stage + 1) },
    elements: [...a.elements] as Element[],
    primaryElement: (a.technique?.element ?? a.elements[0] ?? null) as Element | null,
    stats: { can_cot: a.stats.canCot, ngo_tinh: a.stats.ngoTinh, khi_van: a.stats.khiVan, tam_tinh: a.stats.tamTinh, mi_luc: a.stats.miLuc },
    techniqueId: tech?.id ?? null,
    skills: skills.slice(0, 4),
    artifacts,
    titles: [...a.titles],
    daoQua: sim.daoQua(a),
  };
}

/** NPCs fight the way they live: cautious ones hold back, ruthless ones play dirty. */
export function tacticOf(a: Avatar): TacticId {
  if (a.persona.virtue < -0.3) return 'quy_quyet';
  if (a.persona.caution > 0.65) return 'on_trong';
  if (a.persona.ambition > 0.7 && a.persona.caution < 0.3) return 'lieu_mang';
  return 'cuong_manh';
}

export interface FightRecord {
  month: number;
  names: [string, string];
  realms: [string, string];
  tactics: [TacticId, TacticId];
  winner: 0 | 1 | null;
  rounds: number;
  turns: { text: string; hp: [number, number]; tone: 'normal' | 'big' | 'status' }[];
  ending: string;
  maxHp: [number, number];
}

export function runBattle(seed: string, sa: SoulSeal, ta: TacticId, sb: SoulSeal, tb: TacticId): { result: BattleResult; record: Omit<FightRecord, 'month'> } {
  const result = simulateBattle(BATTLE_CONTENT, seed, { seal: sa, tactic: ta }, { seal: sb, tactic: tb });
  const story = narrateBattle(BATTLE_CONTENT, result, { a: sa.name, b: sb.name });
  const realmName = (s: SoulSeal) => {
    const r = REALMS.find((x) => x.id === s.realm.id)!;
    return `${r.name} ${r.stages[s.realm.stage - 1] ?? ''}`.trim();
  };
  return {
    result,
    record: {
      names: [sa.name, sb.name],
      realms: [realmName(sa), realmName(sb)],
      tactics: [ta, tb],
      winner: result.winner === 'a' ? 0 : result.winner === 'b' ? 1 : null,
      rounds: result.rounds,
      turns: story.turns.map((t) => ({ text: t.text, hp: t.hp, tone: t.tone })),
      ending: story.ending,
      maxHp: [result.start.a.hp, result.start.b.hp],
    },
  };
}

/** A fight between two avatars of the world. Keeps a replay when the player is in it. */
export function fightAvatars(sim: Sim, a: Avatar, b: Avatar): { aWins: boolean; draw: boolean } {
  const ta = sim.isPlayer(a) ? sim.s.soul.tactic ?? 'on_trong' : tacticOf(a);
  const tb = sim.isPlayer(b) ? sim.s.soul.tactic ?? 'on_trong' : tacticOf(b);
  const seed = `${sim.s.seed}:${sim.month}:${a.id}:${b.id}:${Math.floor(sim.rng.next() * 1e9)}`;
  const { result, record } = runBattle(seed, sealOf(sim, a), ta, sealOf(sim, b), tb);
  if (sim.isPlayer(a) || sim.isPlayer(b)) {
    const fights = (sim.s.soul.fights ??= []);
    fights.push({ month: sim.month, ...record });
    if (fights.length > 12) fights.shift();
  }
  return { aWins: result.winner === 'a', draw: result.winner === null };
}

/** A nameless opponent `lead` stages ahead of (or behind) the avatar, for story battle checks. */
export function botSealFor(sim: Sim, a: Avatar, realm: number, stage: number): SoulSeal {
  const s = sealOf(sim, a);
  const r = REALMS[realm]!;
  const grade = Math.min(4, 1 + Math.floor(realm / 2));
  const tech = BATTLE_CONTENT.techniques.find((t) => GRADES[grade] && t.grade === GRADES[grade]!.id && (t.element === null || a.elements.includes(t.element as never)))
    ?? BATTLE_CONTENT.techniques[0]!;
  return {
    ...s,
    name: sim.makeName(sim.rng.chance(0.5) ? 'male' : 'female'),
    realm: { id: r.id, stage: Math.min(r.stages.length, stage + 1) },
    stats: { can_cot: 50, ngo_tinh: 50, khi_van: 50, tam_tinh: 50, mi_luc: 50 },
    techniqueId: tech.id,
    primaryElement: (tech.element ?? s.primaryElement) as Element | null,
    skills: tech.skills.slice(0, 4),
    artifacts: {},
    titles: [],
    bot: true,
  };
}

export function fightBot(sim: Sim, a: Avatar, bot: SoulSeal, tactic?: TacticId): boolean {
  const seed = `${sim.s.seed}:${sim.month}:${a.id}:bot:${Math.floor(sim.rng.next() * 1e9)}`;
  const ta = tactic ?? (sim.isPlayer(a) ? sim.s.soul.tactic ?? 'on_trong' : tacticOf(a));
  const { result, record } = runBattle(seed, sealOf(sim, a), ta, bot, TACTIC_IDS[Math.floor(sim.rng.next() * 4)]!);
  if (sim.isPlayer(a)) {
    const fights = (sim.s.soul.fights ??= []);
    fights.push({ month: sim.month, ...record });
    if (fights.length > 12) fights.shift();
  }
  return result.winner === 'a';
}
