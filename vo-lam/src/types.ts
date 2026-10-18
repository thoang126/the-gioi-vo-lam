import type { Element } from './content/cultivation';
import type { SectRankId, WorldId } from './content/world';
import type { FightRecord, SoulSeal, TacticId } from './battle-engine';
import type { ClanKind, Race } from './content/peoples';

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
  /** Luyện đan: the pill in the furnace and the heat chosen when the flame wavered. */
  recipe?: string;
  heat?: number;
}

export type DeathCause =
  | 'old_age' | 'illness' | 'child' | 'battle' | 'beast' | 'qi_deviation'
  | 'tribulation' | 'sea' | 'war' | 'doom' | 'ascension' | 'assassinated' | 'wound';

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
  /** Named items from the story content (Tiểu Hoàn đan, Hồi Xuân đan…). */
  items: Record<string, number>;
  artifacts: string[];
  skills: string[];
  lifespanBonus: number;
  /** Times the avatar spent ten years preparing the current breakthrough (GDD 4.3, +5% each). */
  prepare?: number;
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
  /** Missing on avatars from older saves: human. */
  race?: Race;
  traits?: string[];
  clanId?: string | null;
  /** Đan đạo, once learned: alchemist level 1–9 and known recipes (pill ids). */
  alchemy?: { level: number; xp: number; recipes: string[] } | null;
  /** Đan độc, 0–150: weakens every pill taken after. */
  toxicity?: number;
  /** Pills that work once per life (Diên Thọ đan…) already taken. */
  oncePills?: string[] | null;
}

export type EventKind =
  | 'birth' | 'death' | 'breakthrough' | 'realm' | 'sect' | 'battle' | 'relation'
  | 'fortune' | 'war' | 'world' | 'travel' | 'past_life' | 'soul' | 'story';

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

/** A clan (gia tộc, thế gia). Founding clans come from content; new ones are founded in play. */
export interface ClanState {
  id: string;
  name: string;
  surname: string;
  kind: ClanKind;
  seat: string;
  headId: number | null;
  prestige: number;
  /** Other clan id → stance −100…100. */
  relations: Record<string, number>;
  foundedMonth: number;
  extinctMonth: number | null;
  technique: { name: string; grade: number; element: Element | null } | null;
}

export type DynastyEnd = 'usurp' | 'rebellion' | 'invasion' | 'cultivator' | 'abdication' | 'extinct' | 'restoration';

/** One reign of a royal house over Đại Hạ. */
export interface Dynasty {
  clanId: string;
  surname: string;
  founder: string;
  since: number;
  until: number | null;
  /** How it ended (set on the dynasty that fell). */
  end: DynastyEnd | null;
}

export interface ChoiceOption {
  id: string;
  label: string;
  hint?: string;
}

export interface PendingChoice {
  kind: 'action' | 'offer' | 'rebirth' | 'event' | 'breakthrough' | 'alchemy';
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
  paths: string[];
}

/** Per-life story state, the Luân Hồi Vạn Kiếp event engine's bookkeeping for the player. */
export interface StoryState {
  flags: Record<string, true>;
  seen: Record<string, number>;
  /** Event id → age when it first happened. */
  seenAt: Record<string, number>;
  cooldowns: Record<string, number>;
  crossroads: number;
  lastCrossroadAge: number;
  paths: Partial<Record<string, { id: string; since: number }>>;
  pathHistory: { slot: string; id: string; from: number; to: number | null }[];
  /** Age of the last yearly story roll. */
  lastYear: number;
  /** Spirit root the character was born with (titles like "Phế vật nghịch thiên" look at it). */
  birthRoot?: string;
}

export interface Soul {
  lives: LifeRecord[];
  currentAvatarId: number | null;
  points: number;
  /** Levels of past-life memories (GDD LHVK §9). */
  memories: { manhBa: number; luck: number; technique: number; sight?: number; seals?: number };
  /** Avatars bound to a past incarnation: id → what they were to it. */
  pastLinks: Record<number, { life: number; kind: RelationKind | 'self_grave' }>;
  /** Past-life reunions already shown in the current life. */
  metThisLife: number[];
  pending: PendingChoice | null;
  autoplay: boolean;
  /**
   * The player's way of life: the chosen action keeps going (or, after "thuận theo tâm tính",
   * the AI picks) until the situation changes or ASK_EVERY_YEARS pass, then the player is asked again.
   */
  habit: { id: string | null; askedAt: number; sig: string } | null;
  story: StoryState;
  /** Kiếp Sách: everything this soul has been, by category. */
  codex: Record<string, string[]>;
  /** Soul titles earned (ids from content/soul.ts). */
  achievements: string[];
  counters: { reunions: number; ownGraves: number; sectLeader: number; crossedSea: number; clanHead?: number; clanFounded?: number; yeuLives?: number };
  /** No breakthrough crossroad before this month (the player chose "chưa vội"). */
  btSnoozeUntil?: number;
  /** Tactic the player's characters fight with (GDD 8.5). */
  tactic?: TacticId;
  /** Replays of the player's recent fights. */
  fights?: FightRecord[];
  /** Hồn ấn kept from past lives (GDD 8.1), newest last. */
  seals?: { life: number; seal: SoulSeal }[];
  /** Heat the player last chose for each pill (pill id → −1/0/1); the furnace only asks again for big pills. */
  heat?: Record<string, number>;
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
  /** Missing in saves from before clans. */
  clans?: Record<string, ClanState>;
  /** Dynasties of Đại Hạ, oldest first; the last one reigns. Missing in older saves. */
  dynasties?: Dynasty[];
  events: WorldEvent[];
  /** Region id → month the secret realm closes, when open. */
  secretRealmOpenUntil: number;
  soul: Soul;
  /** Pills sold at the markets and not yet bought (item key → count). Missing in older saves. */
  market?: Record<string, number>;
  stats: {
    births: number; deaths: number; ascensions: number; maxRealmEver: number;
    /** Đan đạo, missing in older saves: brews that gave pills, furnaces that burst, pills sold and bought at markets. */
    brewed?: number; bursts?: number; pillsSold?: number; pillsBought?: number;
  };
}
