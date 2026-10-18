import { must, type BattleConfig, type Content, type Formula } from './content';

import type { CombatStats, SoulSeal } from './types';

function evalFormula(f: Formula, seal: SoulSeal): number {
  const s = seal.stats;
  return (
    f.base +
    (f.can_cot ?? 0) * s.can_cot +
    (f.ngo_tinh ?? 0) * s.ngo_tinh +
    (f.khi_van ?? 0) * s.khi_van +
    (f.tam_tinh ?? 0) * s.tam_tinh +
    (f.mi_luc ?? 0) * s.mi_luc +
    (f.stage ?? 0) * seal.realm.stage
  );
}

/**
 * GDD 8.2. hp/mp/atk/def scale with the realm factor × (1 + stageBonus × (stage − 1)).
 * Weapon/treasure add to Công, armor/treasure add to Thủ (flat, after scaling).
 */
export function combatStats(content: Content, seal: SoulSeal): CombatStats {
  const cfg: BattleConfig = content.battle;
  const realm = must(
    content.realms.find((r) => r.id === seal.realm.id),
    `realm ${seal.realm.id}`,
  );
  const k = realm.battleMult * (1 + cfg.stageBonus * (seal.realm.stage - 1));
  const gear = (id: string | undefined) =>
    id ? content.artifacts.find((a) => a.id === id) : undefined;
  const weapon = gear(seal.artifacts.weapon);
  const armor = gear(seal.artifacts.armor);
  const treasure = gear(seal.artifacts.treasure);
  return {
    hp: Math.round(evalFormula(cfg.stats.hp, seal) * k),
    mp: Math.round(evalFormula(cfg.stats.mp, seal) * k),
    atk: evalFormula(cfg.stats.atk, seal) * k + (weapon?.atk ?? 0) + (treasure?.atk ?? 0),
    def: evalFormula(cfg.stats.def, seal) * k + (armor?.def ?? 0) + (treasure?.def ?? 0),
    spd: evalFormula(cfg.stats.spd, seal),
    crit: Math.min(1, Math.max(0, evalFormula(cfg.stats.crit, seal))),
    will: seal.stats.tam_tinh,
  };
}

/** Attacker element vs defender element (GDD 8.4). */
export function elementMult(
  cfg: BattleConfig,
  attacker: string | null,
  defender: string | null,
): number {
  if (!attacker || !defender) return 1;
  const counters = cfg.elements.counters as Record<string, string[] | undefined>;
  if (counters[attacker]?.includes(defender)) return cfg.elements.advantageMult;
  if (counters[defender]?.includes(attacker)) return cfg.elements.disadvantageMult;
  return 1;
}
