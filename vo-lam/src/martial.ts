// Võ công: ai biết chiêu gì, học từ đâu. Môn phái truyền theo cấp bậc, sư phụ dạy đồ đệ,
// võ quán dạy người trả tiền, bí kíp nhặt được trên đường. Võ công nằm trong `a.skills` (theo tên),
// và bốn chiêu mạnh nhất vào trận đấu (battle-engine/index.ts).

import { BATTLE_CONTENT, type Skill } from './battle-engine/content';
import { TECHNIQUES } from './content/cultivation';
import { KIND_NAMES, SECT_ARTS, SKILL_GRADE_NAMES, SKILL_KINDS, SKILLS_BY_RANK, WANDERER_SKILLS } from './content/wuxia';
import { SECT_BY_ID, type Sim } from './sim';
import type { Avatar } from './types';

const SKILL_BY_ID = new Map(BATTLE_CONTENT.skills.map((k) => [k.id, k]));
const SKILL_BY_NAME = new Map(BATTLE_CONTENT.skills.map((k) => [k.name, k]));
const GRADE_RANK: Record<string, number> = { hoang: 1, huyen: 2, dia: 3, thien: 4 };

export function skillById(id: string): Skill | undefined {
  return SKILL_BY_ID.get(id);
}

/** "Liệt Phong Kiếm Pháp (kiếm pháp, thượng thừa)". */
export function skillLabel(name: string): string {
  const k = SKILL_BY_NAME.get(name);
  if (!k) return name;
  const kind = SKILL_KINDS[k.id];
  return `${name} (${[kind ? KIND_NAMES[kind] : null, SKILL_GRADE_NAMES[k.grade]].filter(Boolean).join(', ')})`;
}

export function knows(a: Avatar, id: string): boolean {
  const k = SKILL_BY_ID.get(id);
  return !!k && a.skills.includes(k.name);
}

/** Adds a võ công; returns whether it was new. The player's ones go into Kiếp Sách. */
export function learnSkill(sim: Sim, a: Avatar, id: string, how?: string): boolean {
  const k = SKILL_BY_ID.get(id);
  if (!k || a.skills.includes(k.name)) return false;
  a.skills.push(k.name);
  if (sim.isPlayer(a)) {
    const l = (sim.s.soul.codex.skills ??= []);
    if (!l.includes(id)) l.push(id);
    if (how) sim.log('fortune', `${a.name} ${how}: ${skillLabel(k.name)}.`, [a.id], { regionId: a.regionId, major: k.ultimate === true });
  }
  return true;
}

/** Nội công and võ công the sect owes a member at their rank, handed down if missing. */
export function teachSectArts(sim: Sim, a: Avatar): void {
  const arts = a.sectId ? SECT_ARTS[a.sectId] : undefined;
  if (!arts || !a.sectRank) return;
  const sect = SECT_BY_ID[a.sectId!]!.name;
  const tech = TECHNIQUES.find((t) => t.name === arts.technique);
  if (tech && sim.rootTier(a) > 0 && (!a.technique || a.technique.grade <= tech.grade) && a.technique?.name !== tech.name) {
    a.technique = tech;
    if (sim.isPlayer(a)) sim.log('sect', `${sect} truyền nội công tâm pháp cho ${a.name}: ${tech.name}.`, [a.id], { regionId: a.regionId });
  }
  if (sim.rootTier(a) === 0) return;
  const n = Math.min(arts.skills.length, SKILLS_BY_RANK[a.sectRank] ?? 1);
  for (const id of arts.skills.slice(0, n)) learnSkill(sim, a, id, `được ${sect} truyền võ công`);
}

/** A newcomer to a sect is taken on by an elder of it who still has room for a disciple. */
export function assignMaster(sim: Sim, a: Avatar): void {
  if (!a.sectId || sim.relationOf(a, 'master')) return;
  const region = SECT_BY_ID[a.sectId]!.regionId;
  const disciples = (o: Avatar) => Object.entries(o.relations).filter(([id, r]) => r.kind === 'disciple' && sim.s.avatars[Number(id)]?.alive).length;
  const elders = (sim.byRegion[region] ?? []).filter((o) => o.alive && o.id !== a.id && o.sectId === a.sectId && o.realm >= 2
    && o.realm > a.realm && !o.relations[a.id] && disciples(o) < o.realm);
  if (!elders.length) return;
  const m = sim.rng.pick(elders);
  sim.relate(m, a, 'disciple', 'master', 50);
  if (sim.isPlayer(a)) sim.log('relation', `${a.name} dập đầu bái ${m.name} (${sim.realmLabel(m)}) làm sư phụ.`, [a.id, m.id], { regionId: region });
}

/** Yearly: a master teaches a disciple living nearby one of their own võ công. */
export function phaseTeaching(sim: Sim): void {
  for (const a of sim.living()) {
    if (!sim.canCultivate(a)) continue;
    const m = sim.relationOf(a, 'master');
    if (!m || m.regionId !== a.regionId || !sim.rng.chance(0.3)) continue;
    const ids = m.skills.map((name) => SKILL_BY_NAME.get(name)).filter((k): k is Skill => !!k && !a.skills.includes(k.name) && GRADE_RANK[k.grade]! <= a.realm + 1);
    if (!ids.length) continue;
    learnSkill(sim, a, sim.rng.pick(ids).id, `được sư phụ ${m.name} truyền dạy`);
  }
}

/** A võ quán lesson: a wanderer's võ công the avatar does not know yet. */
export function wandererSkill(sim: Sim, a: Avatar): string | null {
  const pool = WANDERER_SKILLS.filter((id) => !knows(a, id));
  return pool.length ? sim.rng.pick(pool) : null;
}

/** A bí kíp found on the road: any võ công up to one grade above the avatar's nội công. */
export function secretManual(sim: Sim, a: Avatar, minGrade = 1): string | null {
  const max = Math.min(4, (a.technique?.grade ?? 1) + 1);
  const pool = BATTLE_CONTENT.skills.filter((k) => !a.skills.includes(k.name) && (GRADE_RANK[k.grade] ?? 1) >= minGrade && (GRADE_RANK[k.grade] ?? 1) <= max
    && (k.element === null || a.elements.includes(k.element)));
  return pool.length ? sim.rng.pick(pool).id : null;
}
