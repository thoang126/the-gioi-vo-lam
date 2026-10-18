// The player is one soul in the running world. The AI skips its avatar; at decision
// boundaries the world pauses on a PendingChoice (CWS "roleplay mode", here the default).
// On death the soul waits some years in the cycle of rebirth, then is born again elsewhere.

import { REALMS, ROOTED_CHANCE, TECHNIQUES, TIEN_DUYEN } from './content/cultivation';
import { REGIONS, WORLDS, type WorldId } from './content/world';
import { attemptBreakthrough, breakthroughChance, canPrepare, pillFor, rankActions, startAction, ACTION_BY_ID, PREPARE } from './actions';
import { duel } from './battle';
import { sealOf } from './battle-engine';
import { REGION_BY_ID, SECT_BY_ID, Sim, relationWord } from './sim';
import type { Avatar, PendingChoice } from './types';
import { joinSect } from './phases';
import { autoChoose, lifeTitles, newStory, pathNames, resolveStoryChoice, storyYear } from './story';
import { LHVK } from './content/lhvk';
import { SOUL_TITLES } from './content/soul';
import { CLAN_KIND_NAMES, CLANS, TRAIT_BY_ID } from './content/peoples';
import { clanOf, foundClan, setHead } from './clans';
import { chooseBrew, missingHerbs } from './alchemy';
import { HERB_BY_ID, PILL_BY_ID } from './content/alchemy';

export const MEMORIES = {
  manhBa: { name: 'Mạnh Bà quên uống', desc: '+1 mọi chỉ số gốc mỗi cấp', cost: (lvl: number) => 30 * (lvl + 1), max: 10 },
  luck: { name: 'Luân hồi khí vận', desc: '+2 Khí vận mỗi cấp', cost: (lvl: number) => 40 * (lvl + 1), max: 5 },
  technique: { name: 'Tàn niệm nội công', desc: '5%/cấp sinh ra đã nhớ nội công kiếp trước', cost: (lvl: number) => 150 * (lvl + 1), max: 3 },
  sight: { name: 'Lục đạo thị giác', desc: 'Thấy tỉ lệ thành công trước khi chọn', cost: () => 200, max: 1 },
  seals: { name: 'Ấn khố', desc: '+1 ô giữ Hồn ấn mỗi cấp (gốc 5)', cost: (lvl: number) => 60 * (lvl + 1), max: 5 },
} as const;
type MemoryKey = keyof typeof MEMORIES;

export type { MemoryKey };

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
  } else if (d.offer === 'sect_exam') {
    if (optionId !== 'accept') return;
    const peers = sim.living().filter((o) => o.sectId === a.sectId && o.id !== a.id && Math.abs(o.realm - a.realm) <= 0 && Math.abs(o.stage - a.stage) <= 2 && o.injuredUntil <= sim.month);
    const opp = peers.length ? sim.rng.pick(peers) : undefined;
    const sectName = SECT_BY_ID[a.sectId!]?.name ?? '';
    if (!opp) { a.sectRank = 'noi_mon'; sim.log('sect', `Không ai dám lên đài với ${a.name}. ${sectName} nhận ${a.name} vào nội môn.`, [a.id], { regionId: a.regionId }); return; }
    const res = duel(sim, a, opp, 0);
    if (res.winner === a) {
      a.sectRank = 'noi_mon';
      a.contribution += 100;
      sim.log('sect', `${a.name} thắng ${opp.name} trên đài khảo hạch, được vào nội môn ${sectName}.`, [a.id, opp.id], { regionId: a.regionId });
    } else {
      sim.log('sect', `${a.name} thua ${opp.name} trên đài khảo hạch. Phải đợi kỳ sau.`, [a.id, opp.id], { regionId: a.regionId });
    }
  } else if (d.offer === 'succession') {
    const sect = SECT_BY_ID[String(d.sect)]!;
    const rival = sim.get(Number(d.rival));
    const st = sim.s.sects[sect.id]!;
    if (optionId !== 'accept' || !rival || !rival.alive || a.sectId !== sect.id) {
      if (rival) sim.relate(a, rival, 'friend', 'friend', 40);
      sim.log('sect', `${a.name} đứng về phía ${rival?.name ?? 'tân chưởng môn'}.`, [a.id], { regionId: a.regionId });
      return;
    }
    const res = duel(sim, a, rival, 0.05);
    if (res.winner === a) {
      rival.sectRank = 'truong_lao';
      a.sectRank = 'chuong_mon';
      st.leaderId = a.id;
      sim.log('sect', `${a.name} thắng ${rival.name} trong trận tranh chức, lên làm chưởng môn ${sect.name}.`, [a.id, rival.id], { regionId: a.regionId, major: true });
    } else {
      if (res.killed) sim.kill(a, 'battle', `Chết trong trận tranh chức chưởng môn với ${rival.name}`, rival);
      else sim.relate(a, rival, 'rival', 'rival', -40);
      sim.log('sect', `${a.name} tranh chức chưởng môn ${sect.name} nhưng thua ${rival.name}.`, [a.id, rival.id], { regionId: a.regionId });
    }
  } else if (d.offer === 'clan_head') {
    const clan = sim.s.clans?.[String(d.clan)];
    const rival = sim.get(Number(d.rival));
    if (!clan || optionId !== 'accept' || !rival || !rival.alive || a.clanId !== clan.id) {
      if (rival) sim.relate(a, rival, 'friend', 'friend', 40);
      sim.log('relation', `${a.name} cúi đầu trước ${rival?.name ?? 'người kế vị'} ở từ đường ${clan?.name ?? ''}.`, [a.id], { regionId: a.regionId });
      return;
    }
    const res = duel(sim, a, rival, 0.05);
    if (res.winner === a) {
      setHead(sim, clan, a);
      sim.log('world', clan.kind === 'royal'
        ? `${a.name} đánh bại ${rival.name}, lên ngôi hoàng đế Đại Hạ.`
        : `${a.name} thắng ${rival.name} trước từ đường, lên làm ${clan.kind === 'yeu' ? 'tộc trưởng' : 'gia chủ'} ${clan.name}.`, [a.id, rival.id], { regionId: a.regionId, major: true });
    } else {
      if (res.killed) sim.kill(a, 'battle', `Chết trong trận tranh ${clan.kind === 'royal' ? 'ngôi' : 'chức gia chủ'} với ${rival.name}`, rival);
      else sim.relate(a, rival, 'rival', 'rival', -40);
      sim.log('relation', `${a.name} tranh chức với ${rival.name} nhưng thua.`, [a.id, rival.id], { regionId: a.regionId });
    }
  } else if (d.offer === 'clan_marriage') {
    const o = sim.get(Number(d.other));
    const x = sim.s.clans?.[String(d.a)];
    const y = sim.s.clans?.[String(d.b)];
    if (!o || !o.alive || !x || !y) return;
    if (optionId === 'accept') {
      sim.relate(a, o, 'partner', 'partner', 50);
      sim.s.soul.story.flags.married = true;
      if (a.realm >= 1 && o.realm >= 1) sim.s.soul.story.flags.dao_partner = true;
      x.relations[y.id] = y.relations[x.id] = Math.min(100, (x.relations[y.id] ?? 0) + 15);
      sim.log('relation', `${x.name} và ${y.name} kết thông gia: ${a.name} thành thân với ${o.name}.`, [a.id, o.id], { regionId: a.regionId });
    } else {
      x.relations[y.id] = y.relations[x.id] = (x.relations[y.id] ?? 0) - 15;
      const head = sim.get(clanOf(sim, a)?.headId);
      if (head && head.id !== a.id) { const r = a.relations[head.id]; if (r) r.bond -= 20; }
      sim.log('relation', `${a.name} cự tuyệt hôn sự gia tộc sắp đặt. Hai nhà mất mặt.`, [a.id, o.id], { regionId: a.regionId });
    }
  } else if (d.offer === 'dynasty_exile') {
    const founder = sim.get(Number(d.founder));
    if (optionId === 'accept') {
      const to = sim.rng.pick(['dao_tan_tu', 'phuong_thi', 'huyet_uyen']);
      a.regionId = to;
      a.action = null;
      a.linhThach = Math.floor(a.linhThach * 0.2);
      a.renown = Math.floor(a.renown / 2);
      sim.log('travel', `${a.name} cải trang thành dân chạy loạn, trốn tới ${REGION_BY_ID[to]!.name}. Từ nay không ai gọi là điện hạ nữa.`, [a.id], { regionId: to });
    } else if (founder && sim.rng.chance(a.realm >= 1 ? 0.35 : 0.7)) {
      sim.kill(a, 'war', `Tử thủ cổng cung khi hoàng tộc sụp đổ`, founder);
    } else {
      a.injuredUntil = Math.max(a.injuredUntil, sim.month + 24);
      a.renown += 40;
      if (!a.titles.includes('Trung thần tiền triều')) a.titles.push('Trung thần tiền triều');
      sim.log('battle', `${a.name} giữ cổng cung tới người cuối cùng, trọng thương ngã xuống mà không chết. Tân triều nể khí tiết, tha cho.`, [a.id], { regionId: a.regionId });
    }
  } else if (d.offer === 'dynasty_join') {
    const founder = sim.get(Number(d.founder));
    if (optionId !== 'accept' || !founder) return;
    if (sim.rng.chance(a.realm >= 1 ? 0.05 : 0.15)) {
      sim.kill(a, 'war', `Tử trận khi theo ${founder.name} dựng tân triều`, undefined);
      return;
    }
    a.renown += 60;
    a.linhThach += 200;
    if (!a.titles.includes('Khai quốc công thần')) a.titles.push('Khai quốc công thần');
    sim.relate(a, founder, 'friend', 'friend', 60);
    sim.log('world', `${a.name} theo ${founder.name} từ những ngày đầu, được phong Khai quốc công thần.`, [a.id, founder.id], { regionId: a.regionId });
  } else if (d.offer === 'found_clan') {
    if (optionId !== 'accept' || a.clanId) return;
    const kids = Object.entries(a.relations).filter(([, r]) => r.kind === 'child').map(([id]) => sim.get(Number(id))).filter((k): k is Avatar => !!k?.alive);
    foundClan(sim, a, kids);
  } else if (d.offer === 'partner') {
    const o = sim.get(Number(d.other));
    if (!o || !o.alive) return;
    if (optionId === 'accept') {
      sim.relate(a, o, 'partner', 'partner', 70);
      // Same flags the story's own "Thành gia" turning point sets, so family events follow.
      sim.s.soul.story.flags.married = true;
      if (a.realm >= 1 && o.realm >= 1) sim.s.soul.story.flags.dao_partner = true;
      sim.log('relation', `${a.name} và ${o.name} ${a.realm >= 1 ? 'kết làm hiệp lữ' : 'thành thân'}.`, [a.id, o.id], { regionId: a.regionId });
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
    if (a.sectRank === 'chuong_mon' && !soul.story.flags.sect_leader_counted) {
      soul.story.flags.sect_leader_counted = true;
      soul.counters.sectLeader += 1;
    }
    if (a.sectId && (a.sectRank === 'tap_dich' || a.sectRank === 'ngoai_mon') && a.realm >= 1 && a.stage >= 4 && sim.rng.chance(0.35)) {
      offerToPlayer(sim, {
        kind: 'offer',
        prompt: `${SECT_BY_ID[a.sectId]!.name} mở kỳ khảo hạch nội môn. Ai thắng một trận trên đài sẽ được vào nội môn, luyện công ở nơi chân khí đậm hơn.`,
        options: [{ id: 'accept', label: 'Lên đài khảo hạch', hint: 'Đấu với một đồng môn cùng cảnh giới' }, { id: 'decline', label: 'Đợi kỳ sau' }],
        data: { offer: 'sect_exam' },
      });
      if (soul.pending) return true;
    }
    const p = storyYear(sim, a);
    if (p) {
      if (soul.autoplay) resolveStoryChoice(sim, a, p, autoChoose(sim, a, p));
      else { soul.pending = p; return true; }
    }
    if (!a.alive) return false;
  }

  if (a.action || sim.age(a) < 12) return false;
  if (sim.readyToBreak(a) && a.breakthroughCooldownUntil <= sim.month && (soul.btSnoozeUntil ?? 0) <= sim.month) {
    const p = breakthroughChoice(sim, a);
    if (soul.autoplay) { resolveBreakthrough(sim, a, autoBreakthrough(sim, a, p)); return false; }
    soul.pending = p;
    return true;
  }
  // Breaking through has its own crossroad; the everyday list leaves it out.
  const ranked = rankActions(sim, a).filter((r) => r.def.id !== 'dot_pha' && r.def.id !== 'chuan_bi');
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
  if (id === 'dot_pha') parts.push(pillFor(a) ? 'có đan hỗ trợ' : 'không có đan');
  if (id === 'luyen_dan') { const r = chooseBrew(sim, a); if (r) parts.push(`luyện ${PILL_BY_ID[r.pill]!.name}`); }
  if (id === 'hai_duoc' || id === 'mua_duoc') { const m = missingHerbs(sim, a); if (m.length) parts.push(`cần ${m.map(([h, n]) => `${n} ${HERB_BY_ID[h]!.name}`).join(', ')}`); }
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
  if (p.kind === 'breakthrough') { resolveBreakthrough(sim, a, optionId); return; }
  if (p.kind === 'alchemy') {
    const st = a.action;
    if (st?.id !== 'luyen_dan' || !st.recipe) return;
    st.heat = optionId === 'heat_up' ? 1 : optionId === 'heat_down' ? -1 : 0;
    (sim.s.soul.heat ??= {})[st.recipe] = st.heat;
    return;
  }
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

function breakthroughChoice(sim: Sim, a: Avatar): PendingChoice {
  const next = REALMS[a.realm + 1];
  const sight = (sim.s.soul.memories.sight ?? 0) > 0;
  const odds = (withPill: boolean) => (sight ? ` · Lục đạo thị giác: ${Math.round(breakthroughChance(sim, a, withPill) * 100)}%` : '');
  const pill = pillFor(a);
  const bt = REALMS[a.realm]!.breakthrough!;
  const options = [{ id: 'bt_now', label: 'Đột phá ngay', hint: `Không dùng đan${odds(false)}` }];
  if (pill) options.push({ id: 'bt_pill', label: `Uống ${pill.name} rồi đột phá`, hint: `+${Math.round(pill.bonus * 100)}% cơ hội${odds(true)}` });
  if (canPrepare(sim, a)) options.push({ id: 'bt_prepare', label: `Bế quan chuẩn bị thêm ${PREPARE.years} năm`, hint: `+${PREPARE.bonus * 100}% mỗi lần, đã chuẩn bị ${a.prepare ?? 0}/${PREPARE.maxSteps}; tốn thọ nguyên` });
  options.push({ id: 'bt_wait', label: 'Chưa vội, làm việc khác', hint: 'Hỏi lại sau 5 năm' });
  return {
    kind: 'breakthrough',
    prompt: `${a.name} đã tới ${sim.realmLabel(a)}, công lực đủ để đột phá ${next?.name ?? 'phá toái hư không'}. Thất bại sẽ mất công lực, có thể trọng thương hoặc tẩu hỏa nhập ma${bt.bolts ? `; thành công còn phải vượt ${bt.bolts} đạo quan ải của hư không` : ''}. Thọ nguyên còn ${sim.lifespan(a) - sim.age(a)} năm.`,
    options,
  };
}

/** LHVK auto-choice for breakthroughs: a pill is nearly always taken; else cautious prepare, bold go. */
function autoBreakthrough(sim: Sim, a: Avatar, p: PendingChoice): string {
  if (p.options.some((o) => o.id === 'bt_pill')) return 'bt_pill';
  const cautious = 1 + 0.01 * (a.stats.tamTinh - 50) + (a.persona.caution - 0.5);
  if (p.options.some((o) => o.id === 'bt_prepare') && cautious > 1) return 'bt_prepare';
  return 'bt_now';
}

function resolveBreakthrough(sim: Sim, a: Avatar, optionId: string): void {
  if (optionId === 'bt_wait') { sim.s.soul.btSnoozeUntil = sim.month + 60; return; }
  if (optionId === 'bt_prepare') { const def = ACTION_BY_ID.chuan_bi!; if (def.available(sim, a)) startAction(sim, a, def); return; }
  sim.log('soul', `${a.name} ngồi xuống giữa mật thất, bắt đầu đột phá.`, [a.id], { regionId: a.regionId });
  attemptBreakthrough(sim, a, optionId === 'bt_pill');
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
    soul.counters.reunions += 1;
    sim.log('past_life', text, [a.id, o.id], { regionId: a.regionId });
  }
  for (const g of sim.s.graves) {
    if (g.soulLife === null || g.regionId !== a.regionId || g.soulLife === a.soulLife) continue;
    const key = -(g.avatarId + 1);
    if (soul.metThisLife.includes(key)) continue;
    soul.metThisLife.push(key);
    soul.counters.ownGraves += 1;
    sim.log('past_life', `${a.name} đi ngang một ngôi mộ cũ: "${g.name}, ${REALMS[g.realm]!.name}". Lồng ngực bỗng nhói lên. Đó là mộ của chính ngươi ở kiếp thứ ${g.soulLife + 1}.`, [a.id], { regionId: a.regionId });
    if (sim.canCultivate(a)) sim.addTuVi(a, sim.cultivationPerMonth(a) * 24);
  }
}

/** After the world phases: if the player's avatar died this month, close the life. */
export function checkPlayerDeath(sim: Sim): void {
  const soul = sim.s.soul;
  const a = playerAvatar(sim);
  // An ascended avatar lives on in Thiên ngoại, but the soul's life with it is over.
  if (!a || (a.alive && a.deathCause !== 'ascension')) return;
  const index = soul.lives.length;
  // Life titles (GDD 6.3) first, then the world's own honours (võ lâm minh chủ, quan lại…) if room is left.
  const titleIds = lifeTitles(sim, a);
  const named = titleIds.map((id) => LHVK.titles.find((t) => t.id === id)!.name);
  for (const t of a.titles) if (named.length < LHVK.scoring.maxTitles && !named.includes(t)) named.push(t);
  a.titles = named;
  const dq = sim.daoQua(a) + (a.deathCause === 'ascension' ? LHVK.scoring.ascensionBonus : 0);
  remember(sim, 'paths', soul.story.pathHistory.map((h) => h.id));
  remember(sim, 'realms', REALMS.filter((r) => r.rank <= a.realm).map((r) => r.id));
  remember(sim, 'titles', titleIds);
  remember(sim, 'deaths', [a.deathCause ?? 'illness']);
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
  if (a.race === 'yeu') soul.counters.yeuLives = (soul.counters.yeuLives ?? 0) + 1;
  if (a.alive) { a.deathCause = null; a.deathText = null; a.deathMonth = null; }
  soul.currentAvatarId = null;
  soul.metThisLife = [];
  soul.pending = null;
  soul.habit = null;
  sim.log('soul', `Kiếp thứ ${index + 1} khép lại: ${a.name}, ${sim.realmLabel(a)}, hưởng ${sim.age(a)} tuổi. ${a.deathText}. Đạo Quả ${dq}, nhận ${gained} Luân Hồi Điểm.`, [a.id], { regionId: a.regionId, major: a.realm >= 3 });
  checkSoulTitles(sim, a.id);
  // The life's official Hồn ấn (GDD 8.1); Ấn khố decides how many are kept.
  const seals = (soul.seals ??= []);
  seals.push({ life: index, seal: sealOf(sim, a) });
  while (seals.length > 5 + (soul.memories.seals ?? 0)) seals.shift();
  if (soul.autoplay) { scheduleRebirth(sim); return; }
  soul.pending = rebirthChoice(sim);
}

/** Adds entries to the soul's Kiếp Sách. */
function remember(sim: Sim, category: string, ids: string[]): void {
  const list = (sim.s.soul.codex[category] ??= []);
  for (const id of ids) if (!list.includes(id)) list.push(id);
}

/** Awards soul titles whose goal is now met, logging each with its Luân Hồi Điểm. */
export function checkSoulTitles(sim: Sim, avatarId: number): string[] {
  const soul = sim.s.soul;
  const earned: string[] = [];
  for (const t of SOUL_TITLES) {
    if (soul.achievements.includes(t.id)) continue;
    const [cur, target] = t.progress(soul);
    if (cur < target) continue;
    soul.achievements.push(t.id);
    soul.points += t.points;
    earned.push(t.id);
    sim.log('soul', `Danh hiệu linh hồn: ${t.name} (${t.desc}). Nhận ${t.points} Luân Hồi Điểm.`, [avatarId]);
  }
  return earned;
}

function rebirthChoice(sim: Sim): PendingChoice {
  const soul = sim.s.soul;
  const options = [{ id: 'reborn', label: 'Uống canh Mạnh Bà, đầu thai', hint: 'Thế giới sẽ trôi thêm vài năm tới vài chục năm' }];
  const lastLife = soul.lives[soul.lives.length - 1];
  if (lastLife?.cause === 'ascension') {
    options.unshift({ id: 'new_soul', label: 'Khép lại linh hồn này, bắt đầu một linh hồn mới', hint: 'Đã phá toái hư không: các kiếp cũ vào Vạn Cổ Bia, thế giới vẫn giữ nguyên' });
  }
  for (const key of Object.keys(MEMORIES) as MemoryKey[]) {
    const m = MEMORIES[key];
    const lvl = soul.memories[key] ?? 0;
    if (lvl >= m.max) continue;
    const cost = m.cost(lvl);
    if (soul.points >= cost) options.push({ id: `mem_${key}`, label: `Mở ký ức: ${m.name} cấp ${lvl + 1} (${cost} điểm)`, hint: m.desc });
  }
  const last = soul.lives[soul.lives.length - 1];
  return {
    kind: 'rebirth',
    prompt: `Hồn ngươi rời khỏi xác ${last?.name}. Bên cầu Nại Hà, ngươi còn ${soul.points} Luân Hồi Điểm. Võ duyên kiếp tới: ${Math.round(rebirthRootChance(soul.lives) * 100)}% sinh ra có tư chất.`,
    options,
  };
}

function resolveRebirth(sim: Sim, optionId: string): void {
  const soul = sim.s.soul;
  if (optionId.startsWith('mem_')) {
    const key = optionId.slice(4) as MemoryKey;
    const m = MEMORIES[key];
    const lvl = soul.memories[key] ?? 0;
    if (m && soul.points >= m.cost(lvl) && lvl < m.max) {
      soul.points -= m.cost(lvl);
      soul.memories[key] = lvl + 1;
    }
    soul.pending = rebirthChoice(sim);
    return;
  }
  if (optionId === 'new_soul') {
    Object.assign(soul, {
      lives: [], points: 0, memories: { manhBa: 0, luck: 0, technique: 0, sight: 0 }, pastLinks: {}, metThisLife: [],
      codex: {}, achievements: [], counters: { reunions: 0, ownGraves: 0, sectLeader: 0, crossedSea: 0 },
    });
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
  soul.story.birthRoot = a.rootId;
  remember(sim, 'roots', [a.rootId]);
  remember(sim, 'origins', [a.originId]);
  remember(sim, 'birthplaces', [region.id]);
  if (a.physiqueId) remember(sim, 'physiques', [a.physiqueId]);
  remember(sim, 'traits', a.traits ?? []);
  if (a.clanId && CLANS.some((c) => c.id === a.clanId)) remember(sim, 'clans', [a.clanId]);
  for (const t of a.traits ?? []) for (const f of TRAIT_BY_ID[t]?.startFlags ?? []) soul.story.flags[f] = true;
  const last = soul.lives[soul.lives.length - 1];
  if (last?.technique && sim.rootTier(a) > 0 && sim.rng.chance(0.05 * soul.memories.technique)) {
    a.technique = TECHNIQUES.find((t) => t.name === last.technique) ?? a.technique;
    sim.log('soul', `${a.name} vừa biết nói đã lẩm nhẩm khẩu quyết ${a.technique?.name}. Người lớn tưởng trẻ con nói mớ.`, [a.id], { regionId: a.regionId });
  }
  const origin = { commoner: 'nhà nông', beggar: 'kẻ ăn mày', merchant: 'nhà buôn', martial_clan: 'võ lâm thế gia', cultivator_clan: 'luyện võ thế gia', sect_born: 'môn phái', royal: 'hoàng tộc' }[a.originId] ?? '';
  const clan = clanOf(sim, a);
  const house = clan ? `${CLAN_KIND_NAMES[clan.kind].toLowerCase()} ${clan.name}` : origin;
  const traits = (a.traits ?? []).map((t) => TRAIT_BY_ID[t]?.name).filter(Boolean);
  sim.log('soul', `Kiếp thứ ${soul.lives.length + 1}: ${a.race === 'yeu' ? 'một Cổ tộc nhỏ mở mắt' : 'một tiếng khóc chào đời'} trong ${house} ở ${region.name} (${WORLDS[world].name}). Đứa trẻ tên ${a.name}.${traits.length ? ` Trời sinh: ${traits.join(', ')}.` : ''}`, [a.id], { regionId: region.id, major: false });
  return a;
}
