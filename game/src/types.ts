import type { Element } from './content/cultivation';
import type { SectRankId, WorldId } from './content/world';

export type Gender = 'male' | 'female';
export type RelationKind = 'master' | 'disciple' | 'partner' | 'rival' | 'friend' | 'enemy' | 'parent' | 'child';

export interface Relation {
  kind: RelationKind;
  bond: number;
  sinceMonth: number;
}

export interface Stats {
  canCot: number;
  ngoTinh: number;
  khiVan: number;
  tamTinh: number;
  miLuc: number;
}

/** Personality drives the utility AI the way CWS's persona drives its LLM prompt. */
export interface Persona {
  /** −1 ruthless … 1 chivalrous. */
  virtue: number;
  ambition: number;
  caution: number;
}

export interface ActionState {
  id: string;
  startMonth: number;
  endMonth: number;
  regionId?: string;
  targetId?: number;
  /** Travel legs still to walk before the action proper starts. */
  path?: string[];
  /** Month the current travel leg ends. */
  legUntil?: number;
}

export type DeathCause =
  | 'old_age' | 'illness' | 'child' | 'battle' | 'beast' | 'qi_deviation'
  | 'tribulation' | 'sea' | 'war' | 'doom' | 'ascension';

export interface Avatar {
  id: number;
  name: string;
  gender: Gender;
  birthMonth: number;
  regionId: string;
  bornWorld: WorldId;
  bornRegion: string;
  originId: string;
  rootId: string;
  elements: Element[];
  physiqueId: string | null;
  stats: Stats;
  persona: Persona;
  realm: number;
  stage: number;
  tuVi: number;
  technique: { name: string; grade: number; element: Element | null } | null;
  sectId: string | null;
  sectRank: SectRankId | null;
  contribution: number;
  linhThach: number;
  pills: number;
  renown: number;
  injuredUntil: number;
  breakthroughCooldownUntil: number;
  crippled: boolean;
  kills: number;
  fortunes: number;
  alive: boolean;
  deathMonth: number | null;
  deathCause: DeathCause | null;
  deathText: string | null;
  action: ActionState | null;
  lastActionId: string | null;
  relations: Record<number, Relation>;
  /** Set on the avatar the player's soul currently inhabits, and kept on past incarnations. */
  soulLife: number | null;
  titles: string[];
}

export type EventKind =
  | 'birth' | 'death' | 'breakthrough' | 'realm' | 'sect' | 'battle' | 'relation'
  | 'fortune' | 'war' | 'world' | 'travel' | 'past_life' | 'soul';

export interface WorldEvent {
  id: number;
  month: number;
  kind: EventKind;
  text: string;
  avatarIds: number[];
  regionId?: string;
  /** Shown in the world news feed, not only in personal chronicles. */
  major: boolean;
}

export interface Grave {
  avatarId: number;
  name: string;
  regionId: string;
  month: number;
  realm: number;
  stage: number;
  epitaph: string;
  soulLife: number | null;
}

export interface SectState {
  id: string;
  leaderId: number | null;
  lastRecruitYear: number;
  /** Other sect id → stance −100…100. */
  relations: Record<string, number>;
  wars: Record<string, { since: number }>;
  prestige: number;
}

export interface ChoiceOption {
  id: string;
  label: string;
  hint?: string;
}

export interface PendingChoice {
  kind: 'action' | 'offer' | 'rebirth';
  prompt: string;
  options: ChoiceOption[];
  /** Opaque data the resolver needs (offer type, the other avatar…). */
  data?: Record<string, string | number>;
}

export interface LifeRecord {
  index: number;
  avatarId: number;
  name: string;
  bornMonth: number;
  diedMonth: number;
  bornRegion: string;
  diedRegion: string;
  realm: number;
  stage: number;
  rootId: string;
  sectId: string | null;
  cause: DeathCause;
  causeText: string;
  daoQua: number;
  titles: string[];
  technique: string | null;
}

export interface Soul {
  lives: LifeRecord[];
  currentAvatarId: number | null;
  points: number;
  /** Levels of past-life memories (GDD LHVK §9). */
  memories: { manhBa: number; luck: number; technique: number };
  /** Avatars bound to a past incarnation: id → what they were to it. */
  pastLinks: Record<number, { life: number; kind: RelationKind | 'self_grave' }>;
  /** Past-life reunions already shown in the current life. */
  metThisLife: number[];
  pending: PendingChoice | null;
  autoplay: boolean;
  /** The player's chosen action keeps repeating this many more times before asking again. */
  habit: { id: string; left: number } | null;
  /** While the soul waits in the cycle of rebirth: the month it is born again. */
  rebirthAt: number | null;
}

export interface WorldState {
  version: 1;
  seed: number;
  rng: number;
  month: number;
  nextId: number;
  nextEventId: number;
  avatars: Record<number, Avatar>;
  /** Dead avatars are pruned from `avatars` after a while; graves keep the memory. */
  graves: Grave[];
  sects: Record<string, SectState>;
  events: WorldEvent[];
  /** Region id → month the secret realm closes, when open. */
  secretRealmOpenUntil: number;
  soul: Soul;
  stats: { births: number; deaths: number; ascensions: number; maxRealmEver: number };
}
