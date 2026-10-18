// Typed view over the story content imported from Luân Hồi Vạn Kiếp (tools/import-lhvk.ts).
import raw from './lhvk.json';

export type Text = string | string[];
export type StatKey = 'can_cot' | 'ngo_tinh' | 'khi_van' | 'tam_tinh' | 'mi_luc';
export type NpcRole = 'master' | 'partner' | 'rival' | 'disciple' | 'friend';
export type PathSlot = 'career' | 'dao' | 'family' | 'residence' | 'legacy';

export interface Conditions {
  world?: string[]; origin?: string[]; gender?: 'male' | 'female'; age?: [number, number];
  realm?: string[]; realm_min?: string; realm_max?: string; cultivator?: boolean;
  spirit_root?: string[]; spirit_root_min?: string; spirit_root_max?: string;
  has_flag?: string[]; has_flag_not?: string[]; any_flag?: string[];
  trait?: string[]; trait_not?: string[]; physique?: string[];
  stat_min?: Partial<Record<StatKey, number>>; stat_max?: Partial<Record<StatKey, number>>;
  env?: string[]; env_not?: string[]; has_technique?: boolean; technique_grade_max?: string;
  linh_thach_min?: number; has_item?: string[]; has_item_not?: string[];
  seen?: string[]; seen_not?: string[]; seen_ago?: Record<string, number>;
  npc?: NpcRole[]; npc_not?: NpcRole[]; who_cultivator?: boolean;
  npc_mortal?: NpcRole[]; npc_cultivator?: NpcRole[]; npc_bond_min?: Partial<Record<NpcRole, number>>;
  path?: string[]; path_not?: string[]; path_years?: Record<string, number>;
}

export interface Effects {
  stat?: Partial<Record<StatKey, number>>;
  add_flag?: string | string[]; remove_flag?: string | string[];
  set?: { env: string };
  tu_vi?: number; tu_vi_stage?: number; tu_vi_years?: number;
  linh_thach?: number; item?: string | string[]; consume_item?: string | string[];
  technique?: string; technique_from?: { grade_min?: string; grade_max?: string };
  artifact?: string; skill?: string; skill_from?: { grade_min?: string; grade_max?: string };
  world?: string; spirit_root?: string; lifespan?: number;
  injury?: boolean; heal?: boolean; cripple?: boolean; death?: string;
  npc?: { role: NpcRole; gender?: 'same' | 'opposite' | 'any'; bond?: number; offset?: number; mortal?: [number, number] };
  npc_bond?: Partial<Record<NpcRole, number>>;
  npc_offset?: Partial<Record<NpcRole, number>>;
  npc_end?: { role: NpcRole; fate: 'died' | 'slain' | 'left' | 'reconciled' };
  npc_convert?: { from: NpcRole; to: NpcRole };
  npc_cultivate?: NpcRole;
  who_bond?: number; who_end?: 'dead' | 'gone' | 'missing'; who_mark?: string; who_unmark?: string; who_realm?: number;
  path?: string; path_end?: PathSlot | PathSlot[];
}

export interface Outcome extends Effects { text?: Text }

export type Check =
  | { stat: StatKey | 'linh_can_tier' | 'realm_rank'; min: number | string }
  | { stat: StatKey | 'linh_can_tier' | 'realm_rank'; difficulty: number }
  | { chance: number }
  | { battle: { opponent: NpcRole | 'bot'; tactic: string; offset?: [number, number] } };

export interface Choice {
  id?: string; label: string; tags?: string[]; conditions?: Conditions;
  check?: Check; success?: Outcome; fail?: Outcome; effects?: Outcome;
}

export interface StoryEvent {
  id: string; title: string; file: string;
  kind: 'daily' | 'crossroad' | 'fortune' | 'calamity' | 'chain' | 'mythic' | 'milestone' | 'acquaintance';
  rarity: string; weight: number; cooldown_years?: number; once_per_life?: boolean; fated?: boolean;
  tags?: string[]; conditions?: Conditions; text: Text;
  check?: Check; success?: Outcome; fail?: Outcome; effects?: Outcome; choices?: Choice[];
}

export interface Modifiers {
  cultivationMult?: number; breakthroughBonus?: number; fortuneWeightMult?: number; calamityWeightMult?: number;
  eventTagWeightMult?: Record<string, number>; lifespanBonus?: number; naturalMortalityMult?: number;
  deviationChanceMult?: number; choiceTagMult?: Record<string, number>;
}

export interface PathDef { id: string; name: string; slot: PathSlot; description: string; bio: string; modifiers?: Modifiers }

interface Lhvk {
  eventConfig: {
    pacing: { childhood: { maxAge: number; counts: number[] }; mortal: number[]; cultivator: Record<string, number[]>; quietWeight: number };
    crossroad: { maxPerLife: number; minGapYears: number };
    luck: { fortuneSlope: number; calamitySlope: number; min: number; max: number };
  };
  events: StoryEvent[];
  paths: PathDef[];
  techniques: Record<string, string>;
  skills: Record<string, { name: string; element: string | null; grade: string }>;
  artifacts: Record<string, { name: string; atk: number; def: number; slot: string }>;
  items: Record<string, { name: string; kind: string; breakthroughFor: string | null; breakthroughBonus: number }>;
  autochoice: { tags: Record<string, { base: number; slope: number }>; minScore: number };
  narration: { openers: string[]; beastPrefixes: string[]; beastSpecies: Record<string, string[]>; beastLands: string[] };
  birthMods: { origins: Record<string, Modifiers>; roots: Record<string, Modifiers>; physiques: Record<string, Modifiers> };
  deathCauses: Record<string, { name: string; told: unknown }>;
}

export const LHVK = raw as unknown as Lhvk;
export const PATH_BY_ID: Record<string, PathDef> = Object.fromEntries(LHVK.paths.map((p) => [p.id, p]));
export const EVENT_BY_ID: Record<string, StoryEvent> = Object.fromEntries(LHVK.events.map((e) => [e.id, e]));
export const MILESTONES = LHVK.events.filter((e) => e.kind === 'milestone');
export const RANDOM_EVENTS = LHVK.events.filter((e) => e.kind !== 'milestone' && e.kind !== 'acquaintance');
export const ACQUAINTANCE_EVENTS = LHVK.events.filter((e) => e.kind === 'acquaintance');
export const GRADE_ORDER: Record<string, number> = { pham: 0, hoang: 1, huyen: 2, dia: 3, thien: 4 };
export const asList = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
