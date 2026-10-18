import type { Element, TacticId } from './content';
import type { RealmPos, Stats } from './content';

/** GDD 8.1: immutable snapshot of a character, used for every battle. */
export interface SoulSeal {
  v: 1;
  contentVersion: string;
  name: string;
  gender: 'male' | 'female';
  worldId: string;
  spiritRootId: string;
  realm: RealmPos;
  elements: Element[];
  /** Element of basic attacks and of the fighter when defending (null = none). */
  primaryElement: Element | null;
  stats: Stats;
  techniqueId: string | null;
  /** Up to 4. */
  skills: string[];
  artifacts: { weapon?: string; armor?: string; treasure?: string };
  titles: string[];
  daoQua: number;
  /** Set for bots (GDD 8.7). */
  bot?: boolean;
}

export interface CombatStats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  /** Kháng tâm ma = Tâm tính. */
  will: number;
}

export interface BattleSide {
  seal: SoulSeal;
  tactic: TacticId;
}

export type Side = 'a' | 'b';

export interface TurnLog {
  round: number;
  actor: Side;
  action:
    | 'attack'
    | 'skill'
    | 'defend'
    | 'treasure'
    | 'skip'
    | 'status_tick'
    | 'blood_burn'
    | 'extra_hit';
  skillId?: string;
  /** Status that caused a skip or a tick, or that a buff applied. */
  statusId?: string;
  damage?: number;
  heal?: number;
  shield?: number;
  crit?: boolean;
  /** Element multiplier applied (1, advantage or disadvantage). */
  mult?: number;
  /** Statuses that landed on the target with this action. */
  inflicted?: string[];
  /** Status the actor put on itself. */
  buff?: string;
  lifesteal?: number;
  reflected?: number;
  /** Bảo mệnh triggered for the actor's target (or the actor, on reflect). */
  lastStand?: Side;
  ultimate?: boolean;
  /** HP after the action, [a, b]. */
  hp: [number, number];
  mp: [number, number];
}

export interface BattleResult {
  /** null = draw (equal HP % after max rounds). */
  winner: Side | null;
  rounds: number;
  /** 'ko' = someone fell; 'timeout' = decided by remaining HP %. */
  end: 'ko' | 'timeout';
  start: { a: CombatStats; b: CombatStats; first: Side };
  log: TurnLog[];
}
