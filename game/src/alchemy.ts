// Đan đạo: túi đồ có phẩm chất, thu hái linh dược, luyện đan, dùng đan và đan độc.
// Đan tự luyện nằm trong `items` dưới khóa "id:phẩm" (0 hạ … 3 cực); khóa không có phẩm là trung phẩm,
// đúng như vật phẩm mà event của Luân Hồi Vạn Kiếp vẫn trao.

import { REALMS, type Element } from './content/cultivation';
import {
  ALCHEMY, GENERATES, HERBS, HERB_BY_ID, OVERCOMES, PILL_BY_ID, QUALITY_MULT, QUALITY_NAMES, RECIPES, RECIPE_BY_PILL,
  STARTER_RECIPES, type RecipeDef,
} from './content/alchemy';
import { WORLDS } from './content/world';
import { LHVK } from './content/lhvk';
import { REGION_BY_ID, Sim, findPath } from './sim';
import type { Avatar } from './types';

// ---- bag ------------------------------------------------------------------------------------

export function itemKey(id: string, quality: number): string {
  return quality === 1 ? id : `${id}:${quality}`;
}

export function parseKey(key: string): { id: string; quality: number } {
  const i = key.indexOf(':');
  return i < 0 ? { id: key, quality: 1 } : { id: key.slice(0, i), quality: Number(key.slice(i + 1)) };
}

export function countItem(a: Avatar, id: string): number {
  let n = 0;
  for (const k in a.items) {
    const c = a.items[k]!;
    if (c > 0 && (k === id || (k.length > id.length && k[id.length] === ':' && k.startsWith(id)))) n += c;
  }
  return n;
}

export function addItem(a: Avatar, id: string, quality = 1, n = 1): void {
  const k = itemKey(id, quality);
  a.items[k] = (a.items[k] ?? 0) + n;
}

/** Best quality held of an item, or null. */
export function bestQuality(a: Avatar, id: string): number | null {
  let best: number | null = null;
  for (const [k, c] of Object.entries(a.items)) {
    if (c <= 0) continue;
    const p = parseKey(k);
    if (p.id === id && (best === null || p.quality > best)) best = p.quality;
  }
  return best;
}

/** Takes one of an item (the best, or the worst) and returns its quality, or null if none. */
export function takeItem(a: Avatar, id: string, prefer: 'best' | 'worst' = 'best'): number | null {
  let pick: number | null = null;
  for (const [k, c] of Object.entries(a.items)) {
    if (c <= 0) continue;
    const p = parseKey(k);
    if (p.id !== id) continue;
    if (pick === null || (prefer === 'best' ? p.quality > pick : p.quality < pick)) pick = p.quality;
  }
  if (pick === null) return null;
  const k = itemKey(id, pick);
  a.items[k]! -= 1;
  if (a.items[k] === 0) delete a.items[k];
  return pick;
}

export function itemName(key: string): string {
  const { id, quality } = parseKey(key);
  const name = PILL_BY_ID[id]?.name ?? HERB_BY_ID[id]?.name ?? LHVK.items[id]?.name ?? id;
  return PILL_BY_ID[id] ? `${name} ${QUALITY_NAMES[quality] ?? ''}`.trim() : name;
}

function hasAny(a: Avatar): boolean {
  for (const _ in a.items) return true;
  return false;
}

// ---- toxicity -------------------------------------------------------------------------------

/** Potency left after đan độc: a body full of it takes little from another pill. */
export function toxFactor(a: Avatar): number {
  return Math.max(0.3, 1 - (a.toxicity ?? 0) / 150);
}

function poison(a: Avatar, pillId: string): void {
  a.toxicity = Math.min(150, (a.toxicity ?? 0) + (PILL_BY_ID[pillId]?.toxicity ?? 0));
}

// ---- breakthrough pills ---------------------------------------------------------------------

/** The best named pill for breaking into `realmId`, with its bonus after quality and đan độc. */
export function breakthroughPill(a: Avatar, realmId: string | undefined): { id: string; quality: number; bonus: number } | null {
  if (!realmId) return null;
  let best: { id: string; quality: number; bonus: number } | null = null;
  for (const [k, c] of Object.entries(a.items)) {
    if (c <= 0) continue;
    const { id, quality } = parseKey(k);
    const base = LHVK.items[id]?.breakthroughFor === realmId ? LHVK.items[id]!.breakthroughBonus
      : PILL_BY_ID[id]?.effect.kind === 'breakthrough' && (PILL_BY_ID[id]!.effect as { realm: string }).realm === realmId
        ? (PILL_BY_ID[id]!.effect as { bonus: number }).bonus : 0;
    if (!base) continue;
    const bonus = Math.min(ALCHEMY.pillBonusCap, base * (QUALITY_MULT[quality] ?? 1) * toxFactor(a));
    if (!best || bonus > best.bonus) best = { id, quality, bonus };
  }
  return best;
}

/** Swallows the pill `breakthroughPill` chose. */
export function useBreakthroughPill(a: Avatar, id: string, quality: number): void {
  const k = itemKey(id, quality);
  if ((a.items[k] ?? 0) <= 0) return;
  a.items[k]! -= 1;
  if (a.items[k] === 0) delete a.items[k];
  poison(a, id);
}

// ---- using pills ----------------------------------------------------------------------------

const CULTIVATING = new Set(['tu_luyen', 'be_quan', 'linh_mach', 'chuan_bi']);

/** Pills an avatar takes on its own when starting an action: heal, detox, lifespan, cultivation. */
export function autoUsePills(sim: Sim, a: Avatar, actionId: string): void {
  if (!hasAny(a)) return;
  const say = (text: string) => { if (sim.isPlayer(a)) sim.log('soul', text, [a.id], { regionId: a.regionId }); };
  if (a.injuredUntil > sim.month && countItem(a, 'tuc_cot_dan')) {
    takeItem(a, 'tuc_cot_dan', 'worst');
    poison(a, 'tuc_cot_dan');
    a.injuredUntil = sim.month;
    say(`${a.name} uống Tục Cốt đan, thương thế lành hẳn.`);
  }
  if ((a.toxicity ?? 0) > 60 && countItem(a, 'thanh_tam_dan')) {
    const q = takeItem(a, 'thanh_tam_dan', 'worst')!;
    a.toxicity = Math.max(0, (a.toxicity ?? 0) - 40 * (QUALITY_MULT[q] ?? 1));
    say(`${a.name} uống Thanh Tâm đan, đẩy đan độc ra khỏi kinh mạch.`);
  }
  if (sim.lifespan(a) - sim.age(a) <= 12) {
    for (const id of ['truong_xuan_dan', 'dien_tho_dan']) {
      if ((a.oncePills ?? []).includes(id) || !countItem(a, id)) continue;
      const q = takeItem(a, id, 'best')!;
      const fx = PILL_BY_ID[id]!.effect as { years: number };
      const years = Math.round(fx.years * (QUALITY_MULT[q] ?? 1) * toxFactor(a));
      poison(a, id);
      (a.oncePills ??= []).push(id);
      a.lifespanBonus += years;
      say(`${a.name} uống ${itemName(itemKey(id, q))}, thọ nguyên thêm ${years} năm.`);
      break;
    }
  }
  if (CULTIVATING.has(actionId) && (a.toxicity ?? 0) < ALCHEMY.toxicityLimit && sim.canCultivate(a)) {
    // The pill made for this realm first; one for a higher realm is wasted on lower ones.
    const pick = Object.entries(a.items).filter(([, c]) => c > 0).map(([k]) => ({ k, ...parseKey(k) }))
      .filter(({ id }) => { const fx = PILL_BY_ID[id]?.effect; return fx?.kind === 'cultivate' && fx.maxRealm >= a.realm; })
      .sort((x, y) => (PILL_BY_ID[x.id]!.effect as { maxRealm: number }).maxRealm - (PILL_BY_ID[y.id]!.effect as { maxRealm: number }).maxRealm || y.quality - x.quality)[0];
    if (pick) {
      const k = pick.k;
      a.items[k]! -= 1;
      if (a.items[k] === 0) delete a.items[k];
      const fx = PILL_BY_ID[pick.id]!.effect as { months: number };
      sim.addTuVi(a, sim.cultivationPerMonth(a) * fx.months * (QUALITY_MULT[pick.quality] ?? 1) * toxFactor(a));
      poison(a, pick.id);
      say(`${a.name} uống ${itemName(k)} rồi ngồi xuống vận công.`);
    }
  }
}

// ---- recipes --------------------------------------------------------------------------------

const PILL_GRADE = (pill: string) => PILL_BY_ID[pill]?.grade ?? 1;

export function canBrewGrade(a: Avatar, pill: string): boolean {
  return (a.alchemy?.level ?? 0) >= ALCHEMY.levelFor(PILL_GRADE(pill));
}

export function hasIngredients(a: Avatar, r: RecipeDef): boolean {
  return r.ingredients.every(([h, n]) => countItem(a, h) >= n);
}

/** Pills the avatar would brew, most wanted first (needed now, then to keep, then to sell). */
export function wantedRecipes(sim: Sim, a: Avatar): RecipeDef[] {
  const known = (a.alchemy?.recipes ?? []).map((p) => RECIPE_BY_PILL[p]!).filter((r) => r && canBrewGrade(a, r.pill));
  const nextRealm = REALMS[a.realm + 1]?.id;
  const score = (r: RecipeDef): number => {
    const fx = PILL_BY_ID[r.pill]!.effect;
    const have = countItem(a, r.pill);
    if (fx.kind === 'breakthrough') return fx.realm === nextRealm && !have ? 100 : 10;
    if (fx.kind === 'lifespan') return !(a.oncePills ?? []).includes(r.pill) && !have && sim.age(a) / sim.lifespan(a) > 0.5 ? 80 : 5;
    if (fx.kind === 'cultivate') return fx.maxRealm >= a.realm && have < 2 ? 40 + fx.maxRealm : 8;
    if (fx.kind === 'heal') return have ? 6 : 30;
    return have ? 4 : 20;
  };
  return known.sort((x, y) => score(y) - score(x) || PILL_BY_ID[y.pill]!.price - PILL_BY_ID[x.pill]!.price);
}

/** What to brew now: the most wanted recipe whose ingredients are in the bag. */
export function chooseBrew(sim: Sim, a: Avatar): RecipeDef | null {
  return wantedRecipes(sim, a).find((r) => hasIngredients(a, r)) ?? null;
}

/** Herbs still missing for the most wanted recipe. */
export function missingHerbs(sim: Sim, a: Avatar): [string, number][] {
  const r = wantedRecipes(sim, a)[0];
  if (!r) return [];
  return r.ingredients.map(([h, n]) => [h, n - countItem(a, h)] as [string, number]).filter(([, n]) => n > 0);
}

/** Tương sinh pairs in a recipe help, tương khắc pairs hurt. */
export function harmony(r: RecipeDef): number {
  const els = [...new Set(r.ingredients.map(([h]) => HERB_BY_ID[h]!.element).filter((e): e is Element => e !== null))];
  let h = 0;
  for (const x of els) for (const y of els) {
    if (GENERATES[x] === y) h += 1;
    if (OVERCOMES[x] === y) h -= 1;
  }
  return h;
}

export function learnAlchemy(sim: Sim, a: Avatar): void {
  a.alchemy = { level: 1, xp: 0, recipes: [...STARTER_RECIPES] };
  sim.storyFlag(a, 'alchemist');
}

function learnRecipe(sim: Sim, a: Avatar): string | null {
  const al = a.alchemy!;
  const evil = a.persona.virtue < 0;
  const pool = RECIPES.filter((r) => !al.recipes.includes(r.pill) && ALCHEMY.levelFor(PILL_GRADE(r.pill)) <= al.level
    && (r.pill !== 'huyet_luyen_dan' || evil));
  if (!pool.length) return null;
  const r = sim.rng.pick(pool);
  al.recipes.push(r.pill);
  return r.pill;
}

/** A đan phương found on the road or in a ruin. */
export function findRecipe(sim: Sim, a: Avatar): string | null {
  if (!a.alchemy) return null;
  const pool = RECIPES.filter((r) => !a.alchemy!.recipes.includes(r.pill) && (r.pill !== 'huyet_luyen_dan' || a.persona.virtue < 0));
  if (!pool.length) return null;
  const r = sim.rng.pick(pool);
  a.alchemy.recipes.push(r.pill);
  return r.pill;
}

// ---- brewing --------------------------------------------------------------------------------

export interface BrewResult {
  pill: string;
  /** −1 the furnace burst, 0…3 quality; null when only waste came out. */
  quality: number | null;
  burst: boolean;
  count: number;
}

/** Heat the alchemist settles on when the flame wavers: −1 lower, 0 hold, 1 raise. */
export function npcHeat(a: Avatar): number {
  if (a.persona.caution > 0.65) return -1;
  if (a.persona.ambition > 0.7 && a.persona.caution < 0.4) return 1;
  return 0;
}

export function brewOdds(sim: Sim, a: Avatar, r: RecipeDef, heat: number): { burst: number; skill: number } {
  const grade = PILL_GRADE(r.pill);
  const level = a.alchemy?.level ?? 1;
  const skill = 0.06 * level + (a.stats.ngoTinh - 50) / 200 + 0.05 * harmony(r) + (a.elements.includes('hoa') ? 0.1 : 0)
    + (ALCHEMY.sites[a.regionId] ?? 0) + 0.12 * heat - 0.12 * (grade - 1);
  const burst = Math.min(0.5, Math.max(0.02, 0.08 + 0.1 * heat + 0.04 * (grade - 1) - 0.01 * level - 0.03 * harmony(r)));
  return { burst, skill };
}

export function brew(sim: Sim, a: Avatar, r: RecipeDef, heat: number): BrewResult {
  const { burst, skill } = brewOdds(sim, a, r, heat);
  const al = a.alchemy!;
  al.xp += 1 + (PILL_GRADE(r.pill) * 2 - 1 >= al.level ? 1 : 0);
  if (al.xp >= ALCHEMY.xpFor(al.level) && al.level < ALCHEMY.maxLevel) {
    al.xp = 0;
    al.level += 1;
    const learned = [learnRecipe(sim, a), a.sectId === 'bach_thao' ? learnRecipe(sim, a) : null].filter(Boolean) as string[];
    if (sim.isPlayer(a) || al.level >= 5) {
      sim.log('fortune', `${a.name} lên đan sư ${al.level} phẩm${learned.length ? `, ngộ ra đan phương ${learned.map((p) => PILL_BY_ID[p]!.name).join(', ')}` : ''}.`, [a.id], { regionId: a.regionId, major: al.level >= 7 });
    }
  }
  if (sim.rng.chance(burst)) {
    sim.s.stats.bursts = (sim.s.stats.bursts ?? 0) + 1;
    a.injuredUntil = Math.max(a.injuredUntil, sim.month + sim.rng.int(3, 12) * PILL_GRADE(r.pill));
    return { pill: r.pill, quality: null, burst: true, count: 0 };
  }
  const roll = sim.rng.next() + skill;
  const quality = roll < 0.3 ? null : roll < 0.7 ? 0 : roll < 1.05 ? 1 : roll < 1.3 ? 2 : 3;
  if (quality === null) return { pill: r.pill, quality, burst: false, count: 0 };
  const count = 1 + (roll > 0.9 ? 1 : 0) + (al.level >= 5 ? 1 : 0);
  addItem(a, r.pill, quality, count);
  sim.s.stats.brewed = (sim.s.stats.brewed ?? 0) + 1;
  return { pill: r.pill, quality, burst: false, count };
}

export function brewText(a: Avatar, res: BrewResult): string {
  const name = PILL_BY_ID[res.pill]!.name;
  if (res.burst) return `Lò đan của ${a.name} nổ tung giữa lúc luyện ${name}. Dược liệu cháy thành tro, người bị thương.`;
  if (res.quality === null) return `${a.name} mở lò, chỉ thấy một nắm phế đan đen sì. Mẻ ${name} hỏng.`;
  const q = QUALITY_NAMES[res.quality]!;
  const extra = res.quality === 3 ? ' Trên thân đan hiện đan văn, hương thơm bay khắp núi.' : '';
  return `${a.name} luyện thành ${res.count} viên ${name} ${q}.${extra}`;
}

// ---- gathering, market ----------------------------------------------------------------------

/** Nearest region of the same world where a missing herb grows (and the avatar may gather it). */
export function gatherRegion(sim: Sim, a: Avatar): string | null {
  const missing = missingHerbs(sim, a).map(([h]) => HERB_BY_ID[h]!).filter((h) => h.grade <= a.realm + 1);
  if (!missing.length) return null;
  const world = REGION_BY_ID[a.regionId]!.world;
  let best: { id: string; months: number } | null = null;
  for (const h of missing) {
    for (const rid of h.regions) {
      const r = REGION_BY_ID[rid];
      if (!r || r.world !== world) continue;
      if (rid === 'bi_canh' && sim.s.secretRealmOpenUntil <= sim.month) continue;
      const months = rid === a.regionId ? 0 : findPath(a.regionId, rid)?.months;
      if (months === undefined) continue;
      if (!best || months < best.months) best = { id: rid, months };
    }
  }
  return best?.id ?? null;
}

/** Herbs found in the region: what grows there and is within reach of the avatar's realm. */
export function gatherHerbs(sim: Sim, a: Avatar): [string, number][] {
  const want = new Set(missingHerbs(sim, a).map(([h]) => h));
  const out: [string, number][] = [];
  for (const h of HERBS) {
    if (!h.regions.includes(a.regionId) || h.grade > a.realm + 1) continue;
    const n = sim.rng.int(0, 2) + (want.has(h.id) ? 1 : 0) + (h.grade <= a.realm ? 1 : 0) - (h.grade >= 3 ? 1 : 0);
    if (n > 0) { addItem(a, h.id, 1, n); out.push([h.id, n]); }
  }
  return out;
}

export function herbsCost(missing: [string, number][]): number {
  return missing.reduce((s, [h, n]) => s + ALCHEMY.herbPrice(HERB_BY_ID[h]!.grade) * n, 0);
}

/** How many of a pill the avatar keeps for itself; the rest is for sale. */
export function keepCount(sim: Sim, a: Avatar, id: string): number {
  const fx = PILL_BY_ID[id]?.effect;
  if (!fx) return Infinity;
  if (fx.kind === 'breakthrough') return (REALMS.find((r) => r.id === fx.realm)?.rank ?? 0) > a.realm ? 1 : 0;
  if (fx.kind === 'cultivate') return fx.maxRealm >= a.realm ? 2 : 0;
  if (fx.kind === 'lifespan') return (a.oncePills ?? []).includes(id) ? 0 : 1;
  return 1;
}

/** Whether the avatar needs this pill right now (what it goes to the market for). */
export function needsPill(sim: Sim, a: Avatar, id: string): boolean {
  const fx = PILL_BY_ID[id]?.effect;
  if (!fx) return false;
  // Cheap tests first: this runs for every idle cultivator while the market has stock.
  const wanted = fx.kind === 'breakthrough' ? fx.realm === REALMS[a.realm + 1]?.id
    : fx.kind === 'cultivate' ? fx.maxRealm >= a.realm && fx.maxRealm <= a.realm + 1 && (a.toxicity ?? 0) < ALCHEMY.toxicityLimit && sim.canCultivate(a) && !sim.readyToBreak(a)
      : fx.kind === 'lifespan' ? !(a.oncePills ?? []).includes(id) && sim.lifespan(a) - sim.age(a) <= 30
        : fx.kind === 'heal' ? a.injuredUntil > sim.month + 6
          : (a.toxicity ?? 0) > 60;
  return wanted && countItem(a, id) === 0;
}

export function pillPrice(key: string): number {
  const { id, quality } = parseKey(key);
  return Math.round((PILL_BY_ID[id]?.price ?? 0) * (QUALITY_MULT[quality] ?? 1));
}

/** Crafted pills beyond what the avatar keeps, best kept first. */
export function surplusPills(sim: Sim, a: Avatar): { key: string; n: number; value: number }[] {
  const out: { key: string; n: number; value: number }[] = [];
  if (!hasAny(a)) return out;
  const kept: Record<string, number> = {};
  const keys = Object.keys(a.items).filter((k) => PILL_BY_ID[parseKey(k).id]).sort((x, y) => parseKey(y).quality - parseKey(x).quality);
  for (const k of keys) {
    const { id } = parseKey(k);
    const keep = Math.max(0, keepCount(sim, a, id) - (kept[id] ?? 0));
    const n = Math.max(0, (a.items[k] ?? 0) - keep);
    kept[id] = (kept[id] ?? 0) + Math.min(a.items[k] ?? 0, keep);
    if (n > 0) out.push({ key: k, n, value: Math.round(pillPrice(k) * 0.8) * n });
  }
  return out;
}

/** Most of one pill the market holds; the dược phường buys up the rest. */
const MARKET_CAP = 12;

/** Sells the surplus at the market, where others can buy it. */
export function sellSurplus(sim: Sim, a: Avatar): number {
  let total = 0;
  const market = (sim.s.market ??= {});
  MARKET_INDEX.delete(sim);
  for (const { key, n, value } of surplusPills(sim, a)) {
    a.items[key]! -= n;
    if (a.items[key] === 0) delete a.items[key];
    total += value;
    sim.s.stats.pillsSold = (sim.s.stats.pillsSold ?? 0) + n;
    market[key] = Math.min(MARKET_CAP, (market[key] ?? 0) + n);
  }
  a.linhThach += total;
  return total;
}

interface MarketEntry { key: string; id: string; quality: number; price: number; kind: string }

/** Market stock parsed once per step (Sim), best quality first; buying or selling rebuilds it. */
const MARKET_INDEX = new WeakMap<Sim, MarketEntry[]>();

function marketIndex(sim: Sim): MarketEntry[] {
  let idx = MARKET_INDEX.get(sim);
  if (!idx) {
    idx = Object.entries(sim.s.market ?? {}).filter(([, n]) => n > 0).map(([key]) => {
      const { id, quality } = parseKey(key);
      return { key, id, quality, price: pillPrice(key), kind: PILL_BY_ID[id]?.effect.kind ?? '' };
    }).sort((x, y) => y.quality - x.quality || (x.key < y.key ? -1 : 1));
    MARKET_INDEX.set(sim, idx);
  }
  return idx;
}

/** The best pill on the market the avatar needs now and can pay for (`budget` of its linh thạch). */
export function marketPill(sim: Sim, a: Avatar, kinds: string[] = ['breakthrough'], budget = 1): { key: string; price: number } | null {
  for (const e of marketIndex(sim)) {
    if (!kinds.includes(e.kind) || e.price > a.linhThach * budget || !needsPill(sim, a, e.id)) continue;
    return { key: e.key, price: e.price };
  }
  return null;
}

export function buyFromMarket(sim: Sim, a: Avatar, key: string, price: number): void {
  const market = sim.s.market!;
  MARKET_INDEX.delete(sim);
  sim.s.stats.pillsBought = (sim.s.stats.pillsBought ?? 0) + 1;
  market[key]! -= 1;
  if (market[key] === 0) delete market[key];
  a.linhThach -= price;
  a.items[key] = (a.items[key] ?? 0) + 1;
}

/** Where to learn the craft: Bách Thảo cốc in Đại Hạ, the market elsewhere. */
export function alchemySchool(a: Avatar): string {
  const world = REGION_BY_ID[a.regionId]!.world;
  if (world === 'mortal') return 'bach_thao';
  if (world === 'cultivation') return 'van_tien_thanh';
  return WORLDS[world].market;
}

/** Rare herbs a secret realm gives. */
export function secretHerbs(sim: Sim, a: Avatar): string[] {
  const pool = HERBS.filter((h) => h.grade >= 3 && h.grade <= a.realm + 2 && h.regions.includes('bi_canh'));
  if (!pool.length) return [];
  const h = sim.rng.pick(pool);
  addItem(a, h.id, 1, 1);
  return [h.id];
}
