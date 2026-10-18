import type { Sim } from './sim';
import type { Avatar } from './types';

export interface DuelResult {
  winner: Avatar;
  loser: Avatar;
  killed: boolean;
}

/**
 * Win chance follows power^2: one big realm (×3 power) is ~90%, matching GDD LHVK 8.2
 * ("chênh một đại cảnh giới gần như chắc thắng"). `deathChance` is the loser's risk.
 */
export function duel(sim: Sim, a: Avatar, b: Avatar, deathChance: number): DuelResult {
  const pa = sim.power(a) ** 2 * (1 + (a.stats.khiVan - 50) / 400);
  const pb = sim.power(b) ** 2 * (1 + (b.stats.khiVan - 50) / 400);
  const aWins = sim.rng.next() < pa / (pa + pb);
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
