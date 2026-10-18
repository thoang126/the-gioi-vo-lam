// The player is one soul in the running world. The AI skips its avatar; at decision
// boundaries the world pauses on a PendingChoice (CWS "roleplay mode", here the default).
// On death the soul waits some years in the cycle of rebirth, then is born again elsewhere.

import { REALMS, ROOTED_CHANCE, TECHNIQUES, TIEN_DUYEN } from './content/cultivation';
import { REGIONS, WORLDS, type WorldId } from './content/world';
import { rankActions, startAction, ACTION_BY_ID } from './actions';
import { REGION_BY_ID, SECT_BY_ID, Sim, relationWord } from './sim';
import type { Avatar, PendingChoice } from './types';
import { joinSect } from './phases';
import { autoChoose, newStory, pathNames, resolveStoryChoice, storyYear } from './story';

export const MEMORIES = {
  manhBa: { name: 'Mạnh Bà quên uống', desc: '+1 mọi chỉ số gốc mỗi cấp', cost: (lvl: number) => 30 * (lvl + 1), max: 10 },
  luck: { name: 'Luân hồi khí vận', desc: '+2 Khí vận mỗi cấp', cost: (lvl: number) => 40 * (lvl + 1), max: 5 },
  technique: { name: 'Tàn niệm công pháp', desc: '5%/cấp sinh ra đã nhớ công pháp kiếp trước', cost: (lvl: number) => 150 * (lvl + 1), max: 3 },
} as const;
type MemoryKey = keyof typeof MEMORIES;

export function playerAvatar(sim: Sim): Avatar | undefined {
  return sim.get(sim.s.soul.currentAvatarId);
}

export function offerToPlayer(sim: Sim, choice: PendingChoice): void {
  const soul = sim.s.soul;
  if (soul.pending) return;
  if (soul.autoplay) {
    resolveOffer(sim, choice, autoAnswer(sim, choice));
    return;
  }
  soul.pending = choice;
}

function autoAnswer(sim: Sim, choice: PendingChoice): string {
  const a = playerAvatar(sim);
  if (!a) return 'decline';
  if (choice.data?.offer === 'join_sect') {
    const evil = SECT_BY_ID[String(choice.data.sect)]?.alignment === 'evil';
    return evil ? (a.persona.virtue < -0.2 ? 'accept' : 'decline') : 'accept';
  }
  return a.persona.caution > 0.8 ? 'decline' : 'accept';
}

function resolveOffer(sim: Sim, choice: PendingChoice, optionId: string): void {
  const a = playerAvatar(sim);
  if (!a || !a.alive) return;
  const d = choice.data ?? {};
  if (d.offer === 'join_sect') {
    const sect = SECT_BY_ID[String(d.sect)]!;
    if (optionId === 'accept') {
      joinSect(sim, a, sect.id);
      sim.log('sect', `${a.name} bái nhập ${sect.name}, làm ${a.sectRank === 'tap_dich' ? 'tạp dịch đệ tử' : 'đệ tử ngoại môn'}. Được truyền ${a.technique?.name}.`, [a.id], { regionId: a.regionId });
    } else {
      sim.log('soul', `${a.name} không theo ${sect.name}.`, [a.id], { regionId: a.regionId });
    }
  } else if (d.offer === 'partner') {
    const o = sim.get(Number(d.other));
    if (!o || !o.alive) return;
    if (optionId === 'accept') {
      sim.relate(a, o, 'partner', 'partner', 70);
      // Same flags the story's own "Thành gia" turning point sets, so family events follow.
      sim.s.soul.story.flags.married = true;
      if (a.realm >= 1 && o.realm >= 1) sim.s.soul.story.flags.dao_partner = true;
      sim.log('relation', `${a.name} và ${o.name} ${a.realm >= 1 ? 'kết làm đạo lữ' : 'thành thân'}.`, [a.id, o.id], { regionId: a.regionId });
    } else {
      sim.log('relation', `${a.name} từ chối ${o.name}. Người kia lặng lẽ rời đi.`, [a.id, o.id], { regionId: a.regionId });
    }
  }
}

// ---- monthly hook --------------------------------------------------------------------------

/** Runs before the world phases. Returns true when the world must wait for the player. */
export function playerPhase(sim: Sim): boolean {
  const soul = sim.s.soul;
  if (soul.pending) return true;
  if (soul.currentAvatarId === null) {
    if (soul.rebirthAt !== null && sim.month >= soul.rebirthAt) reborn(sim);
    return false;
  }
  const a = playerAvatar(sim);
  if (!a || !a.alive) return false;

  reunions(sim, a);
  if ((sim.month - a.birthMonth) % 12 === 0) {
    const p = storyYear(sim, a);
    if (p) {
      if (soul.autoplay) resolveStoryChoice(sim, a, p, autoChoose(sim, a, p));
      else { soul.pending = p; return true; }
    }
    if (!a.alive) return false;
  }

  if (a.action || sim.age(a) < 12) return false;
  const ranked = rankActions(sim, a);
  const habit = soul.habit;
  if (habit && habit.sig === situation(sim, a) && sim.month - habit.askedAt < ASK_EVERY_YEARS * 12) {
    const def = habit.id ? ACTION_BY_ID[habit.id] : undefined;
    const next = def && def.available(sim, a) ? def : ranked[0]?.def;
    if (next) { startAction(sim, a, next); return false; }
  }
  soul.habit = null;
  if (soul.autoplay) {
    if (ranked[0]) startAction(sim, a, ranked[0].def);
    return false;
  }
  if (!ranked.length) return false;
  soul.pending = {
    kind: 'action',
    prompt: `${a.name}, ${sim.age(a)} tuổi, ${sim.realmLabel(a)}, đang ở ${REGION_BY_ID[a.regionId]!.name}. Tiếp theo làm gì?`,
    options: [
      ...ranked.slice(0, 4).map((r) => ({ id: r.def.id, label: r.def.label, hint: hintFor(sim, a, r.def.id) })),
      { id: 'auto', label: 'Thuận theo tâm tính', hint: 'Để nhân vật tự quyết cho tới ngã rẽ sau' },
    ],
  };
  return true;
}

function hintFor(sim: Sim, a: Avatar, id: string): string | undefined {
  const def = ACTION_BY_ID[id]!;
  const target = def.target?.(sim, a);
  const dest = target?.regionId ?? def.region?.(sim, a) ?? null;
  const parts: string[] = [];
  if (target) parts.push(`${relationWord(a.relations[target.id]?.kind)} ${target.name}`);
  if (dest && dest !== a.regionId) parts.push(`tới ${REGION_BY_ID[dest]!.name}`);
  if (id === 'dot_pha') parts.push(a.pills > 0 ? 'có đan hỗ trợ' : 'không có đan');
  return parts.join(', ') || undefined;
}

export function resolvePending(sim: Sim, optionId: string): void {
  const soul = sim.s.soul;
  const p = soul.pending;
  if (!p) return;
  soul.pending = null;
  if (p.kind === 'offer') { resolveOffer(sim, p, optionId); return; }
  if (p.kind === 'rebirth') { resolveRebirth(sim, optionId); return; }
  const a = playerAvatar(sim);
  if (!a || !a.alive) return;
  if (p.kind === 'event') { resolveStoryChoice(sim, a, p, optionId); return; }
  const sig = situation(sim, a);
  if (optionId === 'auto') {
    const best = rankActions(sim, a)[0];
    if (best) startAction(sim, a, best.def);
    soul.habit = { id: null, askedAt: sim.month, sig };
    return;
  }
  const def = ACTION_BY_ID[optionId];
  if (def && def.available(sim, a)) {
    startAction(sim, a, def);
    soul.habit = { id: def.id, askedAt: sim.month, sig };
  }
}

/** Without a change of situation, the player is asked "what next" at most this often. */
export const ASK_EVERY_YEARS = 5;

/**
 * What makes a new "what next" question worth asking: realm, sect and rank, world, having a
 * technique, being ready to break through, being injured.
 */
function situation(sim: Sim, a: Avatar): string {
  return [a.realm, a.sectId ?? '-', a.sectRank ?? '-', REGION_BY_ID[a.regionId]!.world, a.technique ? 1 : 0,
    sim.readyToBreak(a) && a.breakthroughCooldownUntil <= sim.month ? 1 : 0, a.injuredUntil > sim.month ? 1 : 0].join('|');
}

// ---- past lives ----------------------------------------------------------------------------

function reunions(sim: Sim, a: Avatar): void {
  const soul = sim.s.soul;
  for (const o of sim.byRegion[a.regionId] ?? []) {
    const link = soul.pastLinks[o.id];
    if (!link || o.id === a.id || soul.metThisLife.includes(o.id) || link.kind === 'self_grave') continue;
    soul.metThisLife.push(o.id);
    const life = soul.lives[link.life];
    const was = relationWord(link.kind as never);
    const friendly = link.kind !== 'rival' && link.kind !== 'enemy';
    let text = `${a.name} gặp ${o.name} (${sim.realmLabel(o)}). Kiếp trước, khi ngươi còn là ${life?.name}, người này là ${was} của ngươi.`;
    if (friendly) {
      text += sim.rng.pick([` ${o.name} nhìn ngươi rất lâu, như nhớ ra điều gì, rồi khẽ cười.`, ` ${o.name} sững lại: "Ánh mắt này… ta từng thấy ở đâu rồi."`]);
      if (!a.relations[o.id]) sim.relate(a, o, 'friend', 'friend', 50);
      if (o.realm > a.realm && (link.kind === 'disciple' || link.kind === 'child')) {
        if (!a.technique && sim.rootTier(a) > 0) a.technique = sim.pickTechnique(Math.min(3, o.technique?.grade ?? 1), a.elements);
        a.pills += 1;
        text += ` Không hiểu vì sao, ${o.name} tặng ngươi một viên đan${a.technique ? ` và chỉ điểm ${a.technique.name}` : ''}.`;
      }
    } else {
      text += ` Sát khí trong mắt ${o.name} bùng lên, dù chính kẻ đó cũng không hiểu vì sao.`;
      if (!a.relations[o.id]) sim.relate(a, o, 'rival', 'rival', -40);
    }
    sim.log('past_life', text, [a.id, o.id], { regionId: a.regionId });
  }
  for (const g of sim.s.graves) {
    if (g.soulLife === null || g.regionId !== a.regionId || g.soulLife === a.soulLife) continue;
    const key = -(g.avatarId + 1);
    if (soul.metThisLife.includes(key)) continue;
    soul.metThisLife.push(key);
    sim.log('past_life', `${a.name} đi ngang một ngôi mộ cũ: "${g.name}, ${REALMS[g.realm]!.name}". Lồng ngực bỗng nhói lên. Đó là mộ của chính ngươi ở kiếp thứ ${g.soulLife + 1}.`, [a.id], { regionId: a.regionId });
    if (sim.canCultivate(a)) sim.addTuVi(a, sim.cultivationPerMonth(a) * 24);
  }
}

/** After the world phases: if the player's avatar died this month, close the life. */
export function checkPlayerDeath(sim: Sim): void {
  const soul = sim.s.soul;
  const a = playerAvatar(sim);
  if (!a || a.alive) return;
  const index = soul.lives.length;
  const dq = sim.daoQua(a) + (a.deathCause === 'ascension' ? 5000 : 0);
  soul.lives.push({
    index, avatarId: a.id, name: a.name, bornMonth: a.birthMonth, diedMonth: a.deathMonth ?? sim.month,
    bornRegion: a.bornRegion, diedRegion: a.regionId, realm: a.realm, stage: a.stage, rootId: a.rootId,
    sectId: a.sectId, cause: a.deathCause ?? 'illness', causeText: a.deathText ?? '', daoQua: dq, titles: [...a.titles],
    technique: a.technique?.name ?? null,
    paths: pathNames(sim),
  });
  for (const [id, r] of Object.entries(a.relations)) {
    const o = sim.s.avatars[Number(id)];
    if (o && o.alive) soul.pastLinks[o.id] = { life: index, kind: r.kind };
  }
  const gained = Math.floor(dq / 100) + 10;
  soul.points += gained;
  soul.currentAvatarId = null;
  soul.metThisLife = [];
  soul.pending = null;
  soul.habit = null;
  sim.log('soul', `Kiếp thứ ${index + 1} khép lại: ${a.name}, ${sim.realmLabel(a)}, hưởng ${sim.age(a)} tuổi. ${a.deathText}. Đạo Quả ${dq}, nhận ${gained} Luân Hồi Điểm.`, [a.id], { regionId: a.regionId, major: a.realm >= 3 });
  if (soul.autoplay) { scheduleRebirth(sim); return; }
  soul.pending = rebirthChoice(sim);
}

function rebirthChoice(sim: Sim): PendingChoice {
  const soul = sim.s.soul;
  const options = [{ id: 'reborn', label: 'Uống canh Mạnh Bà, đầu thai', hint: 'Thế giới sẽ trôi thêm vài năm tới vài chục năm' }];
  for (const key of Object.keys(MEMORIES) as MemoryKey[]) {
    const m = MEMORIES[key];
    const lvl = soul.memories[key];
    if (lvl >= m.max) continue;
    const cost = m.cost(lvl);
    if (soul.points >= cost) options.push({ id: `mem_${key}`, label: `Mở ký ức: ${m.name} cấp ${lvl + 1} (${cost} điểm)`, hint: m.desc });
  }
  const last = soul.lives[soul.lives.length - 1];
  return {
    kind: 'rebirth',
    prompt: `Hồn ngươi rời khỏi xác ${last?.name}. Bên cầu Nại Hà, ngươi còn ${soul.points} Luân Hồi Điểm. Tiên duyên kiếp tới: ${Math.round(rebirthRootChance(soul.lives) * 100)}% sinh ra có linh căn.`,
    options,
  };
}

function resolveRebirth(sim: Sim, optionId: string): void {
  const soul = sim.s.soul;
  if (optionId.startsWith('mem_')) {
    const key = optionId.slice(4) as MemoryKey;
    const m = MEMORIES[key];
    if (m && soul.points >= m.cost(soul.memories[key]) && soul.memories[key] < m.max) {
      soul.points -= m.cost(soul.memories[key]);
      soul.memories[key] += 1;
    }
    soul.pending = rebirthChoice(sim);
    return;
  }
  scheduleRebirth(sim);
}

function scheduleRebirth(sim: Sim): void {
  sim.s.soul.rebirthAt = sim.month + sim.rng.int(3, 30) * 12;
}

/** P(has a spirit root) for the soul's next birth: higher in the first life and after mortal lives in a row. */
export function rebirthRootChance(lives: { rootId: string }[]): number {
  let mortalStreak = 0;
  for (let i = lives.length - 1; i >= 0 && lives[i]!.rootId === 'none'; i--) mortalStreak += 1;
  const bonus = (lives.length === 0 ? TIEN_DUYEN.firstLifeBonus : 0) + mortalStreak * TIEN_DUYEN.perMortalLife;
  return Math.min(TIEN_DUYEN.maxChance, ROOTED_CHANCE + bonus);
}

export function reborn(sim: Sim): Avatar {
  const soul = sim.s.soul;
  const world = sim.rng.weighted(Object.keys(WORLDS) as WorldId[], (w) => WORLDS[w].weight);
  const region = sim.rng.weighted(REGIONS.filter((r) => r.world === world && r.population > 0 && r.kind !== 'sect'), (r) => r.population);
  const a = sim.createAvatar({ regionId: region.id, statBonus: soul.memories.manhBa, luckBonus: soul.memories.luck * 2, rootedChance: rebirthRootChance(soul.lives) });
  a.soulLife = soul.lives.length;
  soul.currentAvatarId = a.id;
  soul.rebirthAt = null;
  soul.metThisLife = [];
  soul.story = newStory();
  const last = soul.lives[soul.lives.length - 1];
  if (last?.technique && sim.rootTier(a) > 0 && sim.rng.chance(0.05 * soul.memories.technique)) {
    a.technique = TECHNIQUES.find((t) => t.name === last.technique) ?? a.technique;
    sim.log('soul', `${a.name} vừa biết nói đã lẩm nhẩm khẩu quyết ${a.technique?.name}. Người lớn tưởng trẻ con nói mớ.`, [a.id], { regionId: a.regionId });
  }
  const origin = { commoner: 'nhà nông', beggar: 'kẻ ăn mày', merchant: 'nhà buôn', martial_clan: 'võ lâm thế gia', cultivator_clan: 'tu tiên thế gia', sect_born: 'tông môn', royal: 'hoàng tộc' }[a.originId] ?? '';
  sim.log('soul', `Kiếp thứ ${soul.lives.length + 1}: một tiếng khóc chào đời trong ${origin} ở ${region.name} (${WORLDS[world].name}). Đứa trẻ tên ${a.name}.`, [a.id], { regionId: region.id, major: false });
  return a;
}
