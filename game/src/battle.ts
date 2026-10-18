import { fightAvatars } from './battle-engine';
import type { Sim } from './sim';
import type { Avatar } from './types';

export interface DuelResult {
  winner: Avatar;
  loser: Avatar;
  killed: boolean;
}

/**
 * A fight between two people of the world, fought out with the battle engine (GDD 8): one big
 * realm apart is nearly always decided, elements and tactics matter between equals.
 * `deathChance` is the loser's risk of dying; otherwise the loser is injured.
 */
export function duel(sim: Sim, a: Avatar, b: Avatar, deathChance: number): DuelResult {
  const r = fightAvatars(sim, a, b);
  const aWins = r.draw ? sim.rng.chance(0.5) : r.aWins;
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;
  const killed = sim.rng.chance(deathChance);
  if (!killed) loser.injuredUntil = Math.max(loser.injuredUntil, sim.month + sim.rng.int(6, 36));
  winner.renown += Math.max(1, Math.round(5 * (loser.realm + 1)));
  return { winner, loser, killed };
}

/** Fight against a beast of tier 1–4. Returns true when the avatar wins. */
export function fightBeast(sim: Sim, a: Avatar, tier: number): boolean {
  const beastPower = [0, 1, 3, 9, 27][tier]! * 60;
  const pa = sim.power(a) ** 2;
  const pb = beastPower ** 2;
  return sim.rng.next() < pa / (pa + pb);
}
