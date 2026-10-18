// Action system in the spirit of CWS: an idle avatar picks one action, which may first walk
// to a region and then runs for several months. CWS asks an LLM to choose; here a utility
// score built from persona, needs and world state chooses, so the world stays deterministic.

import { BEASTS, BEAST_PREFIXES, BREAKTHROUGH, REALMS, TECHNIQUES } from './content/cultivation';
import { REGIONS, SECT_PERKS, WORLDS } from './content/world';
import { duel, fightBeast } from './battle';
import { REGION_BY_ID, SECT_BY_ID, Sim, findPath, relationWord } from './sim';
import type { ActionState, Avatar, PendingChoice } from './types';
import { LHVK } from './content/lhvk';
import { pathActionBoost } from './story';
import { ALCHEMY, HERB_BY_ID, PILL_BY_ID, QUALITY_NAMES, RECIPE_BY_PILL } from './content/alchemy';
import {
  addItem, alchemySchool, autoUsePills, brew, brewOdds, brewText, breakthroughPill, buyFromMarket, chooseBrew, findRecipe, gatherHerbs,
  gatherRegion, herbsCost, itemKey, itemName, learnAlchemy, marketPill, missingHerbs, npcHeat, secretHerbs, sellSurplus,
  surplusPills, useBreakthroughPill,
} from './alchemy';
import { learnSkill, secretManual, skillById, teachSectArts, wandererSkill } from './martial';

export interface ActionDef {
  id: string;
  label: string;
  /** Verb phrase for chronicles: "{name} {doing}". */
  doing: string;
  months: (sim: Sim, a: Avatar) => number;
  available: (sim: Sim, a: Avatar) => boolean;
  score: (sim: Sim, a: Avatar) => number;
  region?: (sim: Sim, a: Avatar) => string | null;
  target?: (sim: Sim, a: Avatar) => Avatar | undefined;
  /** Runs once the action is set, before any travel (luyện đan puts the herbs in the furnace here). */
  begin?: (sim: Sim, a: Avatar, st: ActionState) => void;
  tick?: (sim: Sim, a: Avatar, st: ActionState) => void;
  finish: (sim: Sim, a: Avatar, target?: Avatar, st?: ActionState) => void;
}

const isCultivator = (sim: Sim, a: Avatar) => sim.canCultivate(a);
const inWorld = (a: Avatar) => REGION_BY_ID[a.regionId]!.world;
const pillCost = (realm: number, a?: Avatar) => Math.round(50 * 6 ** Math.max(0, realm - 1) * (a?.sectId ? SECT_PERKS[a.sectId]?.pillDiscount ?? 1 : 1));
const contributionCost = (a: Avatar) => 150 * (a.realm + 1);

function lifePressure(sim: Sim, a: Avatar): number {
  return Math.max(0, sim.age(a) / sim.lifespan(a) - 0.5) * 2;
}

function beastName(sim: Sim, tier: number): string {
  return `${sim.rng.pick(BEAST_PREFIXES)} ${sim.rng.pick(BEASTS[tier] ?? BEASTS[1]!)}`;
}

function weakerTarget(sim: Sim, a: Avatar): Avatar | undefined {
  const mine = sim.power(a);
  return (sim.byRegion[a.regionId] ?? []).find((o) => o.id !== a.id && sim.age(o) >= 14
    && (o.sectId === null || o.sectId !== a.sectId) && sim.power(o) < mine * 0.7 && (o.linhThach > 30 || o.pills > 0 || Object.keys(o.items).length > 0));
}

function discipleCandidate(sim: Sim, a: Avatar): Avatar | undefined {
  return (sim.byRegion[a.regionId] ?? []).find((o) => o.id !== a.id && sim.rootTier(o) > 0
    && sim.age(o) >= 8 && sim.age(o) <= 25 && o.realm < a.realm && !sim.relationOf(o, 'master')
    && !o.relations[a.id]);
}

function countRelation(sim: Sim, a: Avatar, kind: string): number {
  return Object.entries(a.relations).filter(([id, r]) => r.kind === kind && sim.s.avatars[Number(id)]?.alive).length;
}

/**
 * The pill this avatar would take for its next realm: a named one (Tiểu Hoàn đan…, best quality after
 * đan độc) or a generic one, whichever helps more.
 */
export function pillFor(a: Avatar): { id: string | null; quality: number; name: string; bonus: number } | null {
  const named = breakthroughPill(a, REALMS[a.realm + 1]?.id);
  if (named && (a.pills === 0 || named.bonus >= BREAKTHROUGH.pillBonus)) {
    return { id: named.id, quality: named.quality, name: itemName(itemKey(named.id, named.quality)), bonus: named.bonus };
  }
  if (a.pills > 0) return { id: null, quality: 1, name: 'đan đột phá', bonus: BREAKTHROUGH.pillBonus };
  return null;
}

/** GDD LHVK 4.3, before the tribulation. */
export function breakthroughChance(sim: Sim, a: Avatar, withPill: boolean): number {
  const bt = REALMS[a.realm]!.breakthrough;
  if (!bt) return 0;
  const pill = withPill ? pillFor(a) : null;
  const p = bt.base + (a.stats.ngoTinh - 50) / BREAKTHROUGH.insightDivisor + (a.stats.tamTinh - 50) / BREAKTHROUGH.willDivisor
    + (pill?.bonus ?? 0) + PREPARE.bonus * (a.prepare ?? 0) + (sim.mods(a).breakthroughBonus ?? 0);
  return Math.min(BREAKTHROUGH.clamp[1], Math.max(BREAKTHROUGH.clamp[0], p));
}

/** "Chuẩn bị thêm" (GDD 4.3): ten years of retreat, +5% each, at most four times. */
export const PREPARE = { years: 3, bonus: 0.05, maxSteps: 4 };

export function canPrepare(sim: Sim, a: Avatar): boolean {
  // Pointless once the odds are already good; ten years of lifespan are not free.
  return sim.readyToBreak(a) && (a.prepare ?? 0) < PREPARE.maxSteps && sim.age(a) + PREPARE.years < sim.lifespan(a)
    && breakthroughChance(sim, a, true) < 0.7;
}

/**
 * Võ thánh phá toái hư không: the avatar breaks through the void, leaves the world for good and
 * lives on in Thiên ngoại. For the player the life still ends there (a soul cannot follow it up).
 */
export function ascend(sim: Sim, a: Avatar): void {
  const from = REGION_BY_ID[a.regionId]!;
  sim.storyFlag(a, 'ascended');
  sim.s.stats.ascensions += 1;
  a.action = null;
  a.regionId = WORLDS.immortal.entry;
  a.sectRank = a.sectId ? null : a.sectRank;
  a.sectId = null;
  if (!a.titles.includes('Cao nhân thế ngoại')) a.titles.push('Cao nhân thế ngoại');
  a.renown += 500;
  if (sim.isPlayer(a)) {
    // checkPlayerDeath closes the life while the avatar itself stays alive in Thiên ngoại.
    a.deathCause = 'ascension';
    a.deathText = 'Phá toái hư không, rời khỏi nhân gian';
    a.deathMonth = sim.month;
  }
  sim.log('death', `${a.name} đứng trên đỉnh núi tung một quyền vào khoảng không. Hư không vỡ ra như mặt gương, người bước vào rồi biến mất. Cả ${WORLDS[from.world].name} bàn tán suốt mấy chục năm.`, [a.id], { regionId: from.id, major: true });
}

export function attemptBreakthrough(sim: Sim, a: Avatar, usePill = true): void {
  const r = REALMS[a.realm]!;
  const bt = r.breakthrough!;
  const pill = usePill ? pillFor(a) : null;
  let p = breakthroughChance(sim, a, usePill);
  if (pill) { if (pill.id) useBreakthroughPill(a, pill.id, pill.quality); else a.pills -= 1; }
  const usedPill = pill !== null;
  a.prepare = 0;
  const mods = sim.mods(a);
  if (usedPill && sim.isPlayer(a)) sim.s.soul.story.flags.used_pill = true;
  const next = REALMS[a.realm + 1];
  const pillText = pill?.id ? ` Uống ${pill.name}.` : usedPill ? ' Uống một viên đan.' : '';
  if (sim.rng.chance(p)) {
    const tb = BREAKTHROUGH.tribulation;
    const perBolt = Math.min(tb.clamp[1], Math.max(tb.clamp[0], bt.survive + (a.stats.canCot - 50) / tb.canCotDivisor + (a.stats.tamTinh - 50) / tb.willDivisor));
    if (!sim.rng.chance(perBolt ** bt.bolts)) {
      sim.kill(a, 'tribulation', next ? `Đột phá ${next.name} thì kinh mạch đứt đoạn` : 'Phá toái hư không thất bại, hư không khép lại nghiền nát thân thể');
      return;
    }
    if (!next) {
      ascend(sim, a);
      return;
    }
    a.realm += 1;
    a.stage = 0;
    a.tuVi = 0;
    a.renown += 10 * a.realm * a.realm;
    sim.s.stats.maxRealmEver = Math.max(sim.s.stats.maxRealmEver, a.realm);
    sim.log('breakthrough', `${a.name} đả thông kinh mạch, đột phá ${next.name}.${pillText}`, [a.id], {
      regionId: a.regionId, major: a.realm >= 3,
    });
    return;
  }
  a.breakthroughCooldownUntil = sim.month + bt.retryYears * 12;
  if (sim.isPlayer(a)) sim.s.soul.story.flags.failed_breakthrough = true;
  a.tuVi *= 1 - sim.rng.range(BREAKTHROUGH.tuViLoss[0], BREAKTHROUGH.tuViLoss[1]);
  const dev = BREAKTHROUGH.deviationAtWill1 + (BREAKTHROUGH.deviationAtWill100 - BREAKTHROUGH.deviationAtWill1) * (a.stats.tamTinh - 1) / 99;
  const devChance = (a.physiqueId === 'linh_lung_tam' ? dev * 0.3 : dev) * (mods.deviationChanceMult ?? 1)
    * (WORLDS[inWorld(a)].deviationChanceMult ?? 1);
  if (sim.rng.chance(devChance)) {
    if (a.stats.tamTinh < BREAKTHROUGH.deviationDeathBelowWill) {
      sim.kill(a, 'qi_deviation', `Đột phá ${next?.name ?? ''} thất bại, tẩu hỏa nhập ma`);
      return;
    }
    a.crippled = true;
    a.stats.canCot = Math.max(1, a.stats.canCot - 15);
    sim.log('breakthrough', `${a.name} đột phá ${next?.name} thất bại, tẩu hỏa nhập ma, kinh mạch tổn hại.${pillText}`, [a.id], { regionId: a.regionId });
    return;
  }
  if (sim.rng.chance(BREAKTHROUGH.injuryChance)) a.injuredUntil = Math.max(a.injuredUntil, sim.month + 60);
  if (a.realm >= 2 || sim.isPlayer(a)) {
    sim.log('breakthrough', `${a.name} đột phá ${next?.name} thất bại, phải tĩnh dưỡng ${bt.retryYears} năm.${pillText}`, [a.id], { regionId: a.regionId });
  }
}

/** What a võ quán asks for half a year of lessons. */
const VO_QUAN_FEE = 15;

/** Pills sold to whoever needs them at the market (breakthrough pills go through "mua đan"). */
const SHOP_KINDS = ['cultivate', 'lifespan', 'heal', 'detox'];

export const ACTIONS: ActionDef[] = [
  {
    id: 'muu_sinh', label: 'Mưu sinh', doing: 'lo cơm áo',
    months: () => 12,
    available: (sim, a) => sim.age(a) >= 14 && !sim.canCultivate(a),
    score: () => 1,
    finish: (sim, a) => { a.linhThach += a.originId === 'merchant' ? sim.rng.int(10, 40) : sim.rng.int(2, 12); },
  },
  {
    id: 'luyen_vo', label: 'Luyện võ', doing: 'luyện quyền cước',
    months: () => 12,
    available: (sim, a) => sim.age(a) >= 12 && a.realm === 0,
    score: (_sim, a) => 0.5 + (a.originId === 'martial_clan' ? 0.7 : 0) + a.persona.ambition * 0.4,
    finish: (_sim, a) => { a.stats.canCot = Math.min(100, a.stats.canCot + 1); a.renown += 1; },
  },
  {
    id: 'khoa_cu', label: 'Lên kinh ứng thí khoa cử', doing: 'lên kinh ứng thí',
    months: () => 12,
    available: (sim, a) => a.realm === 0 && sim.age(a) >= 16 && sim.age(a) <= 40 && inWorld(a) === 'mortal' && !a.titles.includes('Quan lại'),
    score: (_sim, a) => 0.3 + a.stats.ngoTinh / 100 + (a.originId === 'merchant' || a.originId === 'royal' ? 0.3 : 0),
    region: () => 'kinh_thanh',
    finish: (sim, a) => {
      const p = 0.1 + (a.stats.ngoTinh - 50) / 150 + (a.originId === 'royal' ? 0.15 : 0);
      if (sim.rng.chance(p)) {
        a.titles.push('Quan lại');
        sim.storyFlag(a, 'scholar');
        a.renown += 20;
        a.linhThach += 50;
        sim.log('fortune', `${a.name} đỗ khoa cử, được bổ làm quan.`, [a.id], { regionId: a.regionId });
      } else if (sim.isPlayer(a)) sim.log('soul', `${a.name} trượt khoa cử, lủi thủi về quê.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'buon_ban', label: 'Theo thương đội đi buôn', doing: 'theo thương đội đi buôn',
    months: () => 6,
    available: (sim, a) => a.realm === 0 && sim.age(a) >= 18 && sim.age(a) <= 55,
    score: (_sim, a) => 0.3 + (a.originId === 'merchant' ? 0.9 : 0) + a.persona.ambition * 0.3 - a.persona.caution * 0.3,
    region: (_sim, a) => (inWorld(a) === 'mortal' ? 'sa_mac' : WORLDS[inWorld(a)].market),
    finish: (sim, a) => {
      if (sim.rng.chance(0.06)) {
        if (sim.rng.chance(0.1)) { sim.kill(a, 'battle', 'Bị sơn tặc chặn đường giết hại'); return; }
        a.linhThach = Math.floor(a.linhThach / 2);
        if (sim.isPlayer(a)) sim.log('battle', `Sơn tặc chặn đường. ${a.name} mất nửa gia sản mới giữ được mạng.`, [a.id], { regionId: a.regionId });
        return;
      }
      const gain = sim.rng.int(20, 80) * (a.originId === 'merchant' ? 2 : 1);
      a.linhThach += gain;
      if (gain >= 100 && !a.titles.includes('Thương nhân')) a.titles.push('Thương nhân');
      if (a.linhThach >= 2000) sim.storyFlag(a, 'guild_master');
    },
  },
  {
    id: 'tong_quan', label: 'Tòng quân ra biên ải', doing: 'tòng quân ra biên ải',
    months: () => 24,
    available: (sim, a) => a.realm === 0 && sim.age(a) >= 16 && sim.age(a) <= 40 && inWorld(a) === 'mortal',
    score: (_sim, a) => 0.2 + (a.originId === 'martial_clan' ? 0.6 : 0) + a.persona.ambition * 0.4 - a.persona.caution * 0.2,
    region: () => 'bien_ai',
    finish: (sim, a) => {
      sim.storyFlag(a, 'soldier');
      if (sim.rng.chance(0.05)) { sim.kill(a, 'war', 'Tử trận nơi biên ải'); return; }
      a.renown += 15;
      a.stats.canCot = Math.min(100, a.stats.canCot + 2);
      a.linhThach += 30;
      if (a.renown >= 80 && !a.titles.includes('Võ tướng')) {
        a.titles.push('Võ tướng');
        sim.storyFlag(a, 'general');
        sim.log('fortune', `${a.name} lập công ở biên ải, được phong võ tướng.`, [a.id], { regionId: a.regionId });
      }
    },
  },
  {
    id: 'hanh_y', label: 'Hành y cứu người', doing: 'hành y cứu người',
    months: () => 12,
    available: (sim, a) => a.realm === 0 && sim.age(a) >= 20 && a.stats.ngoTinh >= 50,
    score: (_sim, a) => 0.3 + a.persona.virtue * 0.6,
    finish: (sim, a) => {
      a.renown += 5;
      a.linhThach += 10;
      a.persona.virtue = Math.min(1, a.persona.virtue + 0.02);
      if (!a.titles.includes('Y sư') && sim.rng.chance(0.25)) {
        a.titles.push('Y sư');
        sim.storyFlag(a, 'saved_village');
        sim.log('fortune', `Tiếng lành đồn xa: ${a.name} được gọi là thần y.`, [a.id], { regionId: a.regionId });
      }
    },
  },
  {
    id: 'phieu_bat', label: 'Phiêu bạt giang hồ', doing: 'phiêu bạt giang hồ',
    months: () => 6,
    available: (sim, a) => a.realm === 0 && sim.age(a) >= 16 && !a.technique,
    score: (_sim, a) => 0.2 + (1 - a.persona.caution) * 0.4,
    region: (sim, a) => sim.rng.pick(REGIONS.filter((r) => r.world === inWorld(a) && r.kind !== 'beast' && r.kind !== 'sect' && r.id !== a.regionId)).id,
    finish: (sim, a) => {
      if (sim.rootTier(a) === 0 && sim.rng.chance(0.004 + (a.stats.khiVan - 50) / 10000)) {
        a.rootId = 'tap_linh_can';
        a.elements = ['kim', 'moc', 'thuy', 'hoa'];
        a.fortunes += 1;
        sim.log('fortune', `${a.name} gặp một lão ăn mày bị thương bên suối, cõng về nuôi nửa tháng. Lúc đi, lão ấn hai ngón tay vào lưng ngươi: xương cốt kêu răng rắc suốt đêm, sáng ra kinh mạch đã thông.`, [a.id], { regionId: a.regionId, major: true });
      }
    },
  },
  {
    id: 'tim_tien_duyen', label: 'Đi tìm võ duyên', doing: 'đi tìm võ duyên',
    months: () => 6,
    available: (sim, a) => sim.rootTier(a) > 0 && !a.technique && sim.age(a) >= 10 && sim.age(a) <= 45,
    score: (_sim, a) => 1.2 + a.persona.ambition,
    region: (sim, a) => inWorld(a) === 'mortal' ? sim.rng.pick(['thien_tru', 'lac_ha', 'kinh_thanh'])
      : inWorld(a) === 'cultivation' ? sim.rng.pick(['chan_nui', 'phuong_thi', 'thanh_van'])
      : sim.rng.pick(REGIONS.filter((r) => r.world === inWorld(a) && r.kind !== 'beast')).id,
    finish: (sim, a) => {
      const p = 0.12 + (a.stats.khiVan - 50) / 400;
      if (!sim.rng.chance(p)) return;
      a.technique = sim.pickTechnique(1, a.elements);
      const how = sim.rng.pick([
        'trú mưa dưới một tấm bia đá rêu phong, nhìn tới sáng thì khẩu quyết đã khắc trong lòng',
        'gặp một lão tiều phu chặt cây bằng một cái phẩy tay, được truyền cho khẩu quyết',
        'nhặt được một cuốn sách mỏng một đạo nhân bỏ quên',
      ]);
      sim.log('fortune', `${a.name} ${how}: ${a.technique.name}.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'vuot_bien', label: 'Vượt biển Đông tìm Thanh Vân châu', doing: 'vượt biển Đông',
    months: () => 1,
    available: (sim, a) => inWorld(a) === 'mortal' && sim.rootTier(a) > 0 && sim.age(a) >= 14 && sim.age(a) <= 50 && a.linhThach >= 20 && !a.sectId,
    score: (sim, a) => 0.3 + a.persona.ambition * 0.9 + (sim.canCultivate(a) ? 0.4 : 0) - a.persona.caution * 0.3,
    region: () => 'phuong_thi',
    finish: (sim, a) => {
      sim.storyFlag(a, 'crossed_sea');
      if (sim.isPlayer(a)) sim.s.soul.counters.crossedSea += 1;
      sim.log('travel', `${a.name} tới Thanh Vân châu. Núi non lơ lửng giữa trời, chân khí đậm gấp bội cố hương.`, [a.id], { regionId: a.regionId, major: false });
    },
  },
  {
    id: 'tu_luyen', label: 'Luyện công', doing: 'luyện công',
    months: () => 6,
    available: (sim, a) => isCultivator(sim, a) && !sim.readyToBreak(a),
    score: (sim, a) => 2 + a.persona.ambition + lifePressure(sim, a),
    region: (_sim, a) => (a.sectId ? SECT_BY_ID[a.sectId]!.regionId : null),
    tick: (sim, a) => sim.addTuVi(a, sim.cultivationPerMonth(a)),
    finish: () => {},
  },
  {
    id: 'be_quan', label: 'Bế quan', doing: 'bế quan',
    months: (sim, a) => (a.realm >= 3 ? 36 : a.realm >= 2 ? 24 : 12) + sim.rng.int(0, 6),
    available: (sim, a) => isCultivator(sim, a) && a.realm >= 1 && !sim.readyToBreak(a),
    score: (sim, a) => 0.8 + a.persona.caution * 1.4 + a.realm * 0.3 + lifePressure(sim, a),
    region: (_sim, a) => (a.sectId ? SECT_BY_ID[a.sectId]!.regionId : null),
    tick: (sim, a) => sim.addTuVi(a, sim.cultivationPerMonth(a, 1.2)),
    finish: (sim, a) => {
      if (a.realm >= 2 || sim.isPlayer(a)) sim.log('realm', `${a.name} xuất quan, công lực ${sim.realmLabel(a)}.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'dot_pha', label: 'Đột phá', doing: 'đột phá',
    months: () => 1,
    available: (sim, a) => sim.readyToBreak(a) && a.breakthroughCooldownUntil <= sim.month,
    score: (sim, a) => (pillFor(a) ? 6 : 3.5 - a.persona.caution) + 4 * lifePressure(sim, a),
    finish: (sim, a) => attemptBreakthrough(sim, a),
  },
  {
    id: 'chuan_bi', label: 'Bế quan chuẩn bị đột phá', doing: 'bế quan chuẩn bị đột phá',
    months: () => PREPARE.years * 12,
    available: (sim, a) => canPrepare(sim, a),
    score: (sim, a) => (pillFor(a) ? 0.5 : 1) + a.persona.caution * 2.2 - 3 * lifePressure(sim, a),
    region: (_sim, a) => (a.sectId ? SECT_BY_ID[a.sectId]!.regionId : null),
    tick: (sim, a) => sim.addTuVi(a, sim.cultivationPerMonth(a) * 0.5),
    finish: (sim, a) => {
      a.prepare = (a.prepare ?? 0) + 1;
      if (sim.isPlayer(a) || a.realm >= 2) sim.log('realm', `${a.name} xuất quan sau ${PREPARE.years} năm chuẩn bị, căn cơ vững thêm một phần (lần ${a.prepare}).`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'doi_dan', label: 'Đổi điểm cống hiến lấy đan', doing: 'đổi cống hiến lấy đan',
    months: () => 1,
    available: (sim, a) => a.sectId !== null && sim.canCultivate(a) && a.realm >= 1 && !pillFor(a)
      && a.stage >= REALMS[a.realm]!.stages.length - 2 && a.contribution >= contributionCost(a),
    score: (_sim, a) => 2.6 + a.persona.caution,
    region: (_sim, a) => SECT_BY_ID[a.sectId!]!.regionId,
    finish: (sim, a) => {
      a.contribution -= contributionCost(a);
      const next = REALMS[a.realm + 1]?.id;
      const item = Object.entries(LHVK.items).find(([, it]) => it.breakthroughFor === next)?.[0];
      if (item) a.items[item] = (a.items[item] ?? 0) + 1;
      else a.pills += 1;
      if (sim.isPlayer(a)) sim.log('sect', `${a.name} đổi điểm cống hiến lấy ${item ? LHVK.items[item]!.name : 'một viên đan'} ở Tàng Bảo các của môn phái.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'mua_dan', label: 'Tới phường thị mua đan đột phá', doing: 'đi mua đan',
    months: () => 1,
    available: (sim, a) => isCultivator(sim, a) && a.realm >= 1 && !pillFor(a)
      && a.stage >= REALMS[a.realm]!.stages.length - 2 && (a.linhThach >= pillCost(a.realm, a) || marketPill(sim, a) !== null),
    score: (_sim, a) => 2.5 + a.persona.caution * 2,
    region: (_sim, a) => WORLDS[inWorld(a)].market,
    finish: (sim, a) => {
      // Pills other alchemists brought to market come first; the best one the purse allows.
      const m = marketPill(sim, a);
      if (m) {
        buyFromMarket(sim, a, m.key, m.price);
        if (sim.isPlayer(a)) sim.log('fortune', `${a.name} bỏ ${m.price} lượng bạc mua một viên ${itemName(m.key)} ở phường thị.`, [a.id], { regionId: a.regionId });
        return;
      }
      if (a.linhThach < pillCost(a.realm, a)) return;
      a.linhThach -= pillCost(a.realm, a);
      a.pills += 1;
      if (sim.isPlayer(a)) sim.log('fortune', `${a.name} bỏ ${pillCost(a.realm, a)} lượng bạc mua một viên đan đột phá.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'san_yeu', label: 'Săn mãnh thú', doing: 'đi săn mãnh thú',
    months: () => 3,
    available: (sim, a) => isCultivator(sim, a) && a.realm >= 1 && REGIONS.some((r) => r.kind === 'beast' && r.world === inWorld(a)) && a.injuredUntil <= sim.month,
    score: (_sim, a) => 0.7 + a.persona.ambition * 0.6 - a.persona.caution * 0.5 + (a.linhThach < pillCost(a.realm) ? 0.8 : 0),
    region: (_sim, a) => {
      const inMine = REGIONS.filter((r) => r.kind === 'beast' && r.world === inWorld(a));
      const beasts = inMine.filter((r) => (r.danger ?? 1) <= Math.max(1, a.realm)).length ? inMine.filter((r) => (r.danger ?? 1) <= Math.max(1, a.realm)) : inMine;
      return beasts.sort((x, y) => (y.danger ?? 0) - (x.danger ?? 0))[0]!.id;
    },
    finish: (sim, a) => {
      const tier = REGION_BY_ID[a.regionId]?.danger ?? 1;
      const beast = beastName(sim, tier);
      if (fightBeast(sim, a, tier)) {
        const gain = Math.round(15 * 6 ** (tier - 1) * sim.rng.range(0.6, 1.6));
        a.linhThach += gain;
        a.renown += 2 * tier;
        if (sim.isPlayer(a) || a.realm >= 3) sim.log('battle', `${a.name} hạ một con ${beast}, bán da thú được ${gain} lượng bạc.`, [a.id], { regionId: a.regionId });
      } else if (sim.rng.chance(0.15)) {
        sim.kill(a, 'beast', `Bỏ mạng dưới móng vuốt một con ${beast}`);
      } else {
        a.injuredUntil = Math.max(a.injuredUntil, sim.month + sim.rng.int(6, 24));
        if (sim.isPlayer(a)) sim.log('battle', `${a.name} bị một con ${beast} đánh trọng thương, lết về được.`, [a.id], { regionId: a.regionId });
      }
    },
  },
  {
    id: 'nhiem_vu', label: 'Làm nhiệm vụ môn phái', doing: 'làm nhiệm vụ môn phái',
    months: () => 4,
    available: (sim, a) => a.sectId !== null && sim.age(a) >= 10,
    score: (_sim, a) => 1.1 + (a.sectRank === 'tap_dich' ? 0.8 : 0),
    region: (_sim, a) => SECT_BY_ID[a.sectId!]!.regionId,
    finish: (sim, a) => {
      a.contribution += sim.rng.int(5, 15) * (1 + a.realm);
      a.linhThach += sim.rng.int(5, 20) * (1 + a.realm);
    },
  },
  {
    id: 'du_ngoan', label: 'Du ngoạn tìm cơ duyên', doing: 'du ngoạn',
    months: () => 4,
    available: (sim, a) => isCultivator(sim, a) && a.realm >= 1,
    score: (_sim, a) => 0.5 + (1 - a.persona.caution) * 0.6,
    region: (sim, a) => sim.rng.pick(REGIONS.filter((r) => r.world === inWorld(a) && r.kind !== 'beast' && r.id !== a.regionId)).id,
    finish: (sim, a) => {
      const p = 0.05 + (a.stats.khiVan - 50) / 500;
      if (!sim.rng.chance(p)) return;
      a.fortunes += 1;
      const roll = sim.rng.next();
      if (roll < 0.4) {
        const gain = sim.cultivationPerMonth(a) * 12 * sim.rng.int(3, 8);
        sim.addTuVi(a, gain);
        sim.log('fortune', `${a.name} ngộ ra một tầng đạo lý dưới gốc cổ thụ ven đường, công lực tăng vọt.`, [a.id], { regionId: a.regionId });
      } else if (roll < 0.7) {
        const recipe = a.alchemy && sim.rng.chance(0.5) ? findRecipe(sim, a) : null;
        if (recipe) {
          sim.log('fortune', `${a.name} tìm thấy một tấm ngọc giản trong hang đá, ghi đan phương ${PILL_BY_ID[recipe]!.name}.`, [a.id], { regionId: a.regionId });
        } else {
          a.pills += 1;
          sim.log('fortune', `${a.name} nhặt được một bình đan cổ trong hang đá.`, [a.id], { regionId: a.regionId });
        }
      } else {
        // Half the time the cave holds a bí kíp võ công instead of a nội công.
        const manual = sim.rng.chance(0.5) ? secretManual(sim, a) : null;
        if (manual) {
          learnSkill(sim, a, manual, 'rơi xuống vực, gặp mật thất cổ, lĩnh ngộ bí kíp');
          if (!sim.isPlayer(a) && skillById(manual)?.ultimate) sim.log('fortune', `${a.name} lĩnh ngộ tuyệt kỹ thất truyền ${skillById(manual)!.name}.`, [a.id], { regionId: a.regionId, major: true });
        } else {
          const better = TECHNIQUES.filter((t) => t.grade === Math.min(4, (a.technique?.grade ?? 1) + 1) && (t.element === null || a.elements.includes(t.element)));
          if (better.length) {
            a.technique = sim.rng.pick(better);
            sim.log('fortune', `${a.name} rơi xuống vực, gặp mật thất cổ, lĩnh ngộ ${a.technique.name}.`, [a.id], { regionId: a.regionId, major: a.technique.grade >= 3 });
          }
        }
      }
    },
  },
  {
    id: 'bi_canh', label: 'Vào cổ mộ', doing: 'vào cổ mộ',
    months: () => 2,
    available: (sim, a) => isCultivator(sim, a) && a.realm >= 1 && inWorld(a) === 'cultivation' && sim.s.secretRealmOpenUntil > sim.month,
    score: (_sim, a) => 1.8 + a.persona.ambition - a.persona.caution * 0.8,
    region: () => 'bi_canh',
    finish: (sim, a) => {
      const roll = sim.rng.next();
      const danger = a.realm <= 1 ? 0.18 : a.realm === 2 ? 0.1 : 0.05;
      if (roll < danger) {
        sim.kill(a, 'battle', 'Mất xác trong cổ mộ, chỉ còn ngọc bài bản mệnh vỡ nát');
      } else if (roll < danger + 0.3) {
        a.fortunes += 1;
        a.pills += 1;
        sim.addTuVi(a, sim.cultivationPerMonth(a) * 12 * sim.rng.int(4, 10));
        a.linhThach += sim.rng.int(50, 300) * a.realm;
        const herbs = a.alchemy ? secretHerbs(sim, a) : [];
        const manual = sim.rng.chance(0.25) ? secretManual(sim, a, 2) : null;
        if (manual) learnSkill(sim, a, manual, 'tìm thấy bí kíp khắc trên vách cổ mộ');
        sim.log('fortune', `${a.name} đoạt được linh dược nghìn năm trong cổ mộ${herbs.length ? ` (${herbs.map((h) => HERB_BY_ID[h]!.name).join(', ')})` : ''}.`, [a.id], { regionId: a.regionId, major: a.realm >= 3 });
      }
    },
  },
  {
    id: 'ngo_kiem', label: 'Ngộ kiếm ở Kiếm mộ', doing: 'ngộ kiếm ở Kiếm mộ',
    months: () => 6,
    available: (sim, a) => isCultivator(sim, a) && a.realm >= 1 && inWorld(a) === 'cultivation'
      && (a.physiqueId === 'thien_sinh_kiem_cot' || a.technique?.element === 'kim'),
    score: (_sim, a) => (a.physiqueId === 'thien_sinh_kiem_cot' ? 2 : 0.5),
    region: () => 'kiem_mo',
    tick: (sim, a) => sim.addTuVi(a, sim.cultivationPerMonth(a)),
    finish: (sim, a) => {
      const p = a.physiqueId === 'thien_sinh_kiem_cot' ? 0.3 : 0.08;
      if ((a.technique?.grade ?? 0) < 3 && sim.rng.chance(p)) {
        a.technique = TECHNIQUES.find((t) => t.name === 'Thái Hư Kiếm Điển')!;
        a.fortunes += 1;
        sim.log('fortune', `Một thanh kiếm gãy trong Kiếm mộ rung lên khi ${a.name} đi qua. Kiếm ý tiền bối truyền lại Thái Hư Kiếm Điển.`, [a.id], { regionId: a.regionId, major: true });
      }
    },
  },
  {
    id: 'linh_mach', label: 'Luyện công ở thác Bạch Long', doing: 'luyện công ở thác Bạch Long',
    months: () => 12,
    available: (sim, a) => isCultivator(sim, a) && a.realm >= 2 && inWorld(a) === 'cultivation' && !sim.readyToBreak(a)
      && (a.sectRank === null || a.sectRank === 'tap_dich' || a.sectRank === 'ngoai_mon'),
    score: (sim, a) => 1.2 + lifePressure(sim, a),
    region: () => 'linh_mach',
    tick: (sim, a) => sim.addTuVi(a, sim.cultivationPerMonth(a)),
    finish: () => {},
  },
  {
    id: 'thu_do', label: 'Thu nhận đồ đệ', doing: 'thu đồ đệ',
    months: () => 1,
    available: (sim, a) => a.realm >= 2 && countRelation(sim, a, 'disciple') < a.realm - 1 && discipleCandidate(sim, a) !== undefined,
    // Võ hiệp: a master without disciples feels it; passing the arts on is half of a martial life.
    score: (sim, a) => 2.2 + a.persona.virtue * 0.3 - 0.4 * countRelation(sim, a, 'disciple'),
    target: (sim, a) => discipleCandidate(sim, a),
    finish: (sim, a, t) => {
      if (!t || !t.alive || t.regionId !== a.regionId) return;
      sim.relate(a, t, 'disciple', 'master', 60);
      sim.storyFlag(a, 'has_disciple');
      if (!t.technique) t.technique = sim.pickTechnique(Math.min(3, a.technique?.grade ?? 1), t.elements);
      if (a.sectId && !t.sectId) { t.sectId = a.sectId; t.sectRank = 'chan_truyen'; }
      else if (a.sectId && t.sectId === a.sectId && (t.sectRank === 'ngoai_mon' || t.sectRank === 'tap_dich')) t.sectRank = 'chan_truyen';
      teachSectArts(sim, t);
      sim.log('relation', `${a.name} (${sim.realmLabel(a)}) thu ${t.name} làm đồ đệ, truyền ${t.technique!.name}.`, [a.id, t.id], { regionId: a.regionId });
    },
  },
  {
    id: 'khieu_chien', label: 'Tìm kình địch phân thắng bại', doing: 'đi tìm kình địch',
    months: () => 1,
    available: (sim, a) => {
      const r = sim.relationOf(a, 'rival');
      return r !== undefined && REGION_BY_ID[r.regionId]!.world === inWorld(a) && a.injuredUntil <= sim.month;
    },
    score: (_sim, a) => 0.4 + a.persona.ambition * 0.9 - a.persona.caution * 0.4,
    region: (sim, a) => sim.relationOf(a, 'rival')?.regionId ?? null,
    target: (sim, a) => sim.relationOf(a, 'rival'),
    finish: (sim, a, t) => {
      if (!t || !t.alive || t.regionId !== a.regionId) return;
      const deadly = (a.relations[t.id]?.bond ?? 0) < -60;
      const res = duel(sim, a, t, deadly ? 0.5 : 0.06);
      const verb = deadly ? 'sinh tử chiến' : 'giao thủ';
      if (res.killed) {
        sim.kill(res.loser, 'battle', `Chết trong trận ${verb} với kình địch ${res.winner.name}`, res.winner);
        sim.storyFlag(res.winner, 'rival_slain');
      } else {
        sim.log('battle', `${a.name} và kình địch ${t.name} ${verb}. ${res.winner.name} thắng, ${res.loser.name} trọng thương.`, [a.id, t.id], { regionId: a.regionId, major: a.realm >= 3 });
        const rel = a.relations[t.id];
        if (rel) rel.bond -= 15;
        const back = t.relations[a.id];
        if (back) back.bond -= 15;
      }
    },
  },
  {
    id: 'cuop_doat', label: 'Giết người đoạt bảo', doing: 'rình giết người đoạt bảo',
    months: () => 1,
    available: (sim, a) => a.persona.virtue < -0.3 && a.realm >= 1 && a.injuredUntil <= sim.month && weakerTarget(sim, a) !== undefined,
    score: (_sim, a) => -a.persona.virtue * 1.6 + (a.sectId === 'huyet_sat' ? 0.6 : 0),
    target: (sim, a) => weakerTarget(sim, a),
    finish: (sim, a, t) => {
      if (!t || !t.alive || t.regionId !== a.regionId) return;
      const res = duel(sim, a, t, 0.35);
      if (res.winner === a) {
        a.linhThach += t.linhThach; a.pills += t.pills;
        for (const [k, n] of Object.entries(t.items)) a.items[k] = (a.items[k] ?? 0) + n;
        t.linhThach = 0; t.pills = 0; t.items = {};
        if (res.killed) sim.kill(t, 'battle', `Bị ${a.name} giết người đoạt bảo`, a);
        else {
          sim.relate(t, a, 'enemy', 'enemy', -80);
          sim.log('battle', `${a.name} chặn đường cướp sạch của ${t.name}. ${t.name} thoát chết, thề báo thù.`, [a.id, t.id], { regionId: a.regionId });
        }
      } else if (res.killed) {
        sim.kill(a, 'battle', `Định cướp của ${t.name} thì bị phản sát`, t);
      } else {
        sim.relate(t, a, 'enemy', 'enemy', -60);
        sim.log('battle', `${a.name} ra tay cướp đoạt ${t.name} nhưng thất thủ, ôm thương bỏ chạy.`, [a.id, t.id], { regionId: a.regionId });
      }
    },
  },
  {
    id: 'hoc_vo', label: 'Tới võ quán học quyền cước', doing: 'học võ ở võ quán',
    months: () => 6,
    available: (sim, a) => sim.age(a) >= 12 && sim.age(a) <= 45 && !a.sectId && a.skills.length < 3 && a.linhThach >= VO_QUAN_FEE
      && wandererSkill(sim, a) !== null,
    score: (_sim, a) => 0.6 + a.persona.ambition * 0.5 + (a.originId === 'martial_clan' ? 0.5 : 0) + (a.skills.length === 0 ? 0.4 : 0),
    region: (_sim, a) => (inWorld(a) === 'mortal' ? 'trung_nguyen' : WORLDS[inWorld(a)].market),
    finish: (sim, a) => {
      const id = wandererSkill(sim, a);
      if (!id || a.linhThach < VO_QUAN_FEE) return;
      a.linhThach -= VO_QUAN_FEE;
      learnSkill(sim, a, id, `nộp ${VO_QUAN_FEE} lượng bạc học võ ở ${REGION_BY_ID[a.regionId]!.name}, luyện thành`);
      // A võ quán master also shows a gifted pupil how to breathe: the way into nội công.
      if (!a.technique && sim.rootTier(a) > 0 && sim.rng.chance(0.35)) {
        a.technique = TECHNIQUES[0]!;
        if (sim.isPlayer(a)) sim.log('fortune', `Sư phụ võ quán thấy ${a.name} có tư chất, dạy thêm ${a.technique.name}.`, [a.id], { regionId: a.regionId });
      }
    },
  },
  {
    id: 'hoc_dan', label: 'Học luyện đan', doing: 'học luyện đan',
    months: () => 6,
    available: (sim, a) => !a.alchemy && sim.canCultivate(a) && a.realm >= 1 && sim.age(a) >= 14 && sim.age(a) / sim.lifespan(a) < 0.7
      && (a.sectId === 'bach_thao' || a.linhThach >= ALCHEMY.learnCost),
    score: (_sim, a) => 0.3 + Math.max(0, a.stats.ngoTinh - 40) / 80 + (a.elements.includes('hoa') ? 0.4 : 0) + a.persona.caution * 0.2,
    region: (_sim, a) => (a.sectId === 'bach_thao' ? 'bach_thao' : alchemySchool(a)),
    finish: (sim, a) => {
      if (a.alchemy) return;
      const free = a.sectId === 'bach_thao';
      if (!free) {
        if (a.linhThach < ALCHEMY.learnCost) return;
        a.linhThach -= ALCHEMY.learnCost;
      }
      learnAlchemy(sim, a);
      if (sim.isPlayer(a)) {
        sim.log('fortune', free
          ? `${a.name} được trưởng lão Bách Thảo cốc truyền đan đạo: biết nhận dược tính, giữ lửa, luyện Tụ Khí đan và Tục Cốt đan.`
          : `${a.name} bỏ ${ALCHEMY.learnCost} lượng bạc theo một lão đan sư học nghề nửa năm: biết nhận dược tính, giữ lửa, luyện Tụ Khí đan và Tục Cốt đan.`, [a.id], { regionId: a.regionId });
      }
    },
  },
  {
    id: 'hai_duoc', label: 'Đi hái linh dược', doing: 'đi hái linh dược',
    months: () => 3,
    available: (sim, a) => !!a.alchemy && a.realm >= 1 && a.injuredUntil <= sim.month && gatherRegion(sim, a) !== null,
    score: (sim, a) => 1.2 + a.persona.ambition * 0.3 + (sim.readyToBreak(a) || a.stage >= REALMS[a.realm]!.stages.length - 2 ? 0.8 : 0),
    region: (sim, a) => gatherRegion(sim, a),
    finish: (sim, a) => {
      const r = REGION_BY_ID[a.regionId]!;
      if (r.kind === 'beast' && sim.rng.chance(0.3)) {
        const tier = r.danger ?? 1;
        if (!fightBeast(sim, a, tier)) {
          if (sim.rng.chance(0.05)) { sim.kill(a, 'beast', `Đi hái thuốc ở ${r.name}, bị mãnh thú giữ dược ăn thịt`); return; }
          a.injuredUntil = Math.max(a.injuredUntil, sim.month + sim.rng.int(3, 12));
          if (sim.isPlayer(a)) sim.log('battle', `${a.name} vừa chạm tới gốc linh dược thì mãnh thú giữ dược lao ra. Bỏ chạy, mang thương về tay không.`, [a.id], { regionId: a.regionId });
          return;
        }
      }
      const got = gatherHerbs(sim, a);
      if (sim.isPlayer(a)) {
        sim.log('fortune', got.length
          ? `${a.name} hái được ${got.map(([h, n]) => `${n} ${HERB_BY_ID[h]!.name}`).join(', ')} ở ${r.name}.`
          : `${a.name} lùng sục ${r.name} ba tháng, linh dược đã bị người khác hái trước.`, [a.id], { regionId: a.regionId });
      }
    },
  },
  {
    id: 'mua_duoc', label: 'Mua dược liệu', doing: 'đi mua dược liệu',
    months: () => 1,
    available: (sim, a) => {
      if (!a.alchemy) return false;
      const missing = missingHerbs(sim, a);
      return missing.length > 0 && herbsCost(missing) <= a.linhThach * 0.6;
    },
    score: (_sim, a) => 1 + a.persona.caution * 0.6 + (a.originId === 'merchant' ? 0.4 : 0),
    region: (_sim, a) => WORLDS[inWorld(a)].market,
    finish: (sim, a) => {
      const missing = missingHerbs(sim, a);
      const cost = herbsCost(missing);
      if (!missing.length || cost > a.linhThach) return;
      a.linhThach -= cost;
      for (const [h, n] of missing) addItem(a, h, 1, n);
      if (sim.isPlayer(a)) sim.log('fortune', `${a.name} bỏ ${cost} lượng bạc mua ${missing.map(([h, n]) => `${n} ${HERB_BY_ID[h]!.name}`).join(', ')}.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'luyen_dan', label: 'Khai lò luyện đan', doing: 'khai lò luyện đan',
    months: (sim, a) => chooseBrew(sim, a)?.months ?? 2,
    available: (sim, a) => !!a.alchemy && a.injuredUntil <= sim.month && chooseBrew(sim, a) !== null,
    score: (_sim, a) => 2.2 + (a.alchemy?.level ?? 0) * 0.15,
    region: (_sim, a) => (a.sectId === 'bach_thao' && inWorld(a) === 'mortal' ? 'bach_thao' : null),
    begin: (sim, a, st) => {
      const r = chooseBrew(sim, a);
      if (!r) { a.action = null; return; }
      for (const [h, n] of r.ingredients) a.items[h]! -= n;
      for (const [h] of r.ingredients) if (a.items[h] === 0) delete a.items[h];
      st.recipe = r.pill;
    },
    tick: (sim, a, st) => {
      if (st.heat !== undefined || st.path?.length) return;
      st.heat = npcHeat(a);
      const soul = sim.s.soul;
      if (!sim.isPlayer(a) || soul.autoplay || !st.recipe) return;
      // A pill brewed before keeps the heat chosen then; Nhất lưu pills and above are asked every time.
      const last = soul.heat?.[st.recipe];
      if (last !== undefined && PILL_BY_ID[st.recipe]!.grade < 3) { st.heat = last; return; }
      if (!soul.pending) soul.pending = alchemyChoice(sim, a, st);
    },
    finish: (sim, a, _t, st) => {
      const r = st?.recipe ? RECIPE_BY_PILL[st.recipe] : undefined;
      if (!r || !a.alchemy) return;
      const res = brew(sim, a, r, st?.heat ?? 0);
      if (sim.isPlayer(a)) {
        if (res.quality !== null) { const l = (sim.s.soul.codex.pills ??= []); if (!l.includes(r.pill)) l.push(r.pill); }
        sim.log(res.burst ? 'battle' : 'fortune', brewText(a, res), [a.id], { regionId: a.regionId });
      } else if (res.quality === 3 && PILL_BY_ID[r.pill]!.grade >= 3) {
        sim.log('fortune', brewText(a, res), [a.id], { regionId: a.regionId, major: true });
      }
    },
  },
  {
    id: 'ban_dan', label: 'Mang đan ra phường thị bán', doing: 'mang đan ra phường thị bán',
    months: () => 1,
    available: (sim, a) => surplusPills(sim, a).reduce((s, x) => s + x.value, 0) >= 60,
    score: (sim, a) => 0.8 + Math.min(2.5, surplusPills(sim, a).reduce((s, x) => s + x.value, 0) / 80) + a.persona.ambition * 0.3 + (a.originId === 'merchant' ? 0.5 : 0),
    region: (_sim, a) => WORLDS[inWorld(a)].market,
    finish: (sim, a) => {
      const gain = sellSurplus(sim, a);
      if (sim.isPlayer(a) && gain > 0) sim.log('fortune', `${a.name} bán đan dư ở ${REGION_BY_ID[a.regionId]!.name}, thu ${gain} lượng bạc.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'mua_linh_dan', label: 'Tới phường thị mua đan dược', doing: 'đi mua đan dược',
    months: () => 1,
    available: (sim, a) => sim.canCultivate(a) && a.realm >= 1 && marketPill(sim, a, SHOP_KINDS, 0.7) !== null,
    score: (sim, a) => 1.4 + a.persona.caution * 0.5 + 3 * lifePressure(sim, a),
    region: (_sim, a) => WORLDS[inWorld(a)].market,
    finish: (sim, a) => {
      const m = marketPill(sim, a, SHOP_KINDS, 0.7);
      if (!m) return;
      buyFromMarket(sim, a, m.key, m.price);
      if (sim.isPlayer(a)) sim.log('fortune', `${a.name} bỏ ${m.price} lượng bạc mua một viên ${itemName(m.key)}.`, [a.id], { regionId: a.regionId });
    },
  },
  {
    id: 'duong_thuong', label: 'Dưỡng thương', doing: 'dưỡng thương',
    months: () => 3,
    available: (sim, a) => a.injuredUntil > sim.month,
    score: (_sim, a) => 1.5 + a.persona.caution * 2,
    finish: (sim, a) => { a.injuredUntil = Math.max(sim.month, a.injuredUntil - 9); },
  },
];

export const ACTION_BY_ID: Record<string, ActionDef> = Object.fromEntries(ACTIONS.map((x) => [x.id, x]));

/** Ranked options with deterministic noise; the AI takes the first, the player sees the top few. */
export function rankActions(sim: Sim, a: Avatar): { def: ActionDef; score: number }[] {
  const out: { def: ActionDef; score: number }[] = [];
  for (const def of ACTIONS) {
    if (!def.available(sim, a)) continue;
    const perk = a.sectId ? SECT_PERKS[a.sectId]?.actionBoost?.[def.id] ?? 1 : 1;
    out.push({ def, score: def.score(sim, a) * pathActionBoost(sim, a, def.id) * perk * sim.rng.range(0.8, 1.2) });
  }
  return out.sort((x, y) => y.score - x.score);
}

export function startAction(sim: Sim, a: Avatar, def: ActionDef): void {
  autoUsePills(sim, a, def.id);
  const target = def.target?.(sim, a);
  const dest = target ? target.regionId : def.region?.(sim, a) ?? null;
  const route = dest && dest !== a.regionId ? findPath(a.regionId, dest) : null;
  // No road between the worlds (Thiên ngoại): someone out of reach cannot be sought out.
  if (dest && dest !== a.regionId && !route && target) return;
  a.action = {
    id: def.id,
    startMonth: sim.month,
    endMonth: sim.month + def.months(sim, a),
    regionId: dest ?? a.regionId,
    targetId: target?.id,
    path: route?.path,
  };
  if (route && route.path.length) {
    a.action.legUntil = sim.month + legMonthsFor(a.regionId, route.path[0]!);
  }
  def.begin?.(sim, a, a.action);
  if (!a.action) return;
  const repeated = a.lastActionId === def.id;
  a.lastActionId = def.id;
  if (sim.isPlayer(a) && !repeated) {
    const where = dest && dest !== a.regionId ? ` ở ${REGION_BY_ID[dest]!.name}` : '';
    const who = target ? ` (${relationWord(a.relations[target.id]?.kind)} ${target.name})` : '';
    sim.log('soul', `${a.name} quyết định ${def.doing}${where}${who}.`, [a.id], { regionId: a.regionId });
  }
}

function legMonthsFor(from: string, to: string): number {
  return findPath(from, to)?.months ?? 1;
}

/** The flame wavers halfway through a brew: the player decides the heat. */
export function alchemyChoice(sim: Sim, a: Avatar, st: ActionState): PendingChoice {
  const r = RECIPE_BY_PILL[st.recipe!]!;
  const sight = (sim.s.soul.memories.sight ?? 0) > 0;
  const odds = (heat: number) => (sight ? ` · Lục đạo thị giác: nổ lò ${Math.round(brewOdds(sim, a, r, heat).burst * 100)}%` : '');
  return {
    kind: 'alchemy',
    prompt: `Lò ${PILL_BY_ID[r.pill]!.name} đang tới lúc ngưng đan. Đan khí trong lò cuộn trào, ngọn lửa bắt đầu chập chờn. ${a.name} là đan sư ${a.alchemy!.level} phẩm; đan thành có thể là ${QUALITY_NAMES.join(', ')}.`,
    options: [
      { id: 'heat_up', label: 'Thúc thêm hỏa', hint: `Đan phẩm cao hơn, dễ nổ lò hơn${odds(1)}` },
      { id: 'heat_keep', label: 'Giữ lửa như cũ', hint: `Theo đúng đan phương${odds(0)}` },
      { id: 'heat_down', label: 'Rút bớt củi', hint: `Chắc thành đan nhưng phẩm thấp${odds(-1)}` },
    ],
  };
}
