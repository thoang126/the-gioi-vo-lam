// Shim between the battle engine ported from luan-hoi-van-kiep (simulate.ts, stats.ts,
// narration.ts are copied with only their imports changed) and this game's content.

import raw from '../content/lhvk.json';
import { REALMS } from '../content/cultivation';
import { NEW_SKILLS, NEW_TECHNIQUES } from '../content/wuxia';

export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho' | 'loi' | 'bang' | 'phong';
export type TacticId = 'cuong_manh' | 'on_trong' | 'quy_quyet' | 'lieu_mang';
export const TACTIC_IDS: TacticId[] = ['cuong_manh', 'on_trong', 'quy_quyet', 'lieu_mang'];

export interface Stats { can_cot: number; ngo_tinh: number; khi_van: number; tam_tinh: number; mi_luc: number }
export interface RealmPos { id: string; stage: number }

export interface Formula { base: number; can_cot?: number; ngo_tinh?: number; khi_van?: number; tam_tinh?: number; mi_luc?: number; stage?: number }

export interface StatusDef {
  name: string; kind: 'buff' | 'debuff'; turns: number; maxStacks: number; dotOfAtk?: number;
  atk?: number; def?: number; spd?: number; skipChance?: number; extraHitChance?: number;
}

export interface BattleConfig {
  stats: { hp: Formula; mp: Formula; atk: Formula; def: Formula; spd: Formula; crit: Formula };
  stageBonus: number; critMult: number; variance: [number, number]; defenseConstant: number; maxRounds: number;
  mpRegenPct: number; basicAttackPower: number; defendDamageMult: number;
  elements: { advantageMult: number; disadvantageMult: number; counters: Record<string, string[]> };
  statuses: Record<string, StatusDef>;
  statusResist: { perWill: number; clamp: [number, number] };
  shield: { ofMaxHp: number }; heal: { ofMaxHp: number };
  ultimateBelowHp: number; extraHitPower: number;
  treasure: { usesPerBattle: number; gradePower: Record<string, number> };
  tactics: {
    cuong_manh: { name: string };
    on_trong: { name: string; defendBelowHp: number; damageTakenMult: number };
    quy_quyet: { name: string };
    lieu_mang: { name: string; belowHp: number; atkBonus: number; hpLossPerTurn: number };
  };
}

export interface Skill {
  id: string; name: string; description: string; element: Element | null; grade: string;
  effect: 'damage' | 'control' | 'poison' | 'shield' | 'heal' | 'buff'; power: number; mpCost: number; cooldown: number;
  ultimate?: boolean; inflict?: { status: string; chance: number }; self?: { status: string };
}

export interface Artifact {
  id: string; name: string; description: string; slot: 'weapon' | 'armor' | 'treasure'; grade: string;
  atk?: number; def?: number;
  battle?: { lifesteal?: number; reflect?: number; firstStrike?: boolean; lastStand?: boolean; critBonus?: number; statusResist?: number };
}

export interface TechniqueRec { id: string; name: string; element: Element | null; grade: string; skills: string[] }

export interface Content {
  battle: BattleConfig;
  skills: Skill[];
  artifacts: Artifact[];
  techniques: TechniqueRec[];
  realms: { id: string; battleMult: number; stages: string[] }[];
}

const data = raw as unknown as { battle: BattleConfig; battleSkills: Skill[]; battleArtifacts: Artifact[]; battleTechniques: TechniqueRec[] };

// The zod schema in luan-hoi-van-kiep defaults maxStacks to 1; the raw YAML omits it.
for (const st of Object.values(data.battle.statuses)) st.maxStacks ??= 1;

export const BATTLE_CONTENT: Content = {
  battle: data.battle,
  skills: [...data.battleSkills, ...NEW_SKILLS],
  artifacts: data.battleArtifacts,
  techniques: [...data.battleTechniques, ...NEW_TECHNIQUES],
  realms: REALMS.map((r) => ({ id: r.id, battleMult: r.battleMult, stages: r.stages })),
};

export function must<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`missing ${what}`);
  return v;
}
