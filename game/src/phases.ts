// Monthly phase pipeline. Like CWS's SIMULATION_PHASES, each phase is a plain function over
// the shared Sim and runs in a fixed order; the step function only orchestrates.

import { MORTALITY } from './content/cultivation';
import { givenName, surnameOf } from './content/peoples';
import { REGIONS, SECTS, SECT_RANKS, SEA_ROUTES, WORLDS, type SectRankId } from './content/world';
import { ACTION_BY_ID, rankActions, startAction } from './actions';
import { duel, fightBeast } from './battle';
import { offerToPlayer } from './player';
import { REGION_BY_ID, SECT_BY_ID, Sim, legMonths } from './sim';
import type { Avatar } from './types';

const isYearStart = (sim: Sim) => sim.month % 12 === 0;

// ---- 1. decisions -------------------------------------------------------------------------

export function phaseDecide(sim: Sim): void {
  for (const a of sim.living()) {
    if (a.action || sim.age(a) < 12 || sim.isPlayer(a)) continue;
    for (const r of rankActions(sim, a).slice(0, 3)) {
      startAction(sim, a, r.def);
      if (a.action) break;
    }
  }
}

// ---- 2. execute ---------------------------------------------------------------------------

export function phaseExecute(sim: Sim): void {
  for (const a of sim.living()) {
    const st = a.action;
    if (!st) continue;
    const def = ACTION_BY_ID[st.id];
    if (!def) { a.action = null; continue; }
    if (st.path && st.path.length) {
      if (sim.month < (st.legUntil ?? 0)) continue;
      const next = st.path.shift()!;
      if (!crossLeg(sim, a, a.regionId, next)) { a.action = null; continue; }
      a.regionId = next;
      if (st.path.length) {
        st.legUntil = sim.month + legMonths(next, st.path[0]!);
        continue;
      }
      const dur = st.endMonth - st.startMonth;
      st.startMonth = sim.month;
      st.endMonth = sim.month + dur;
    }
    def.tick?.(sim, a);
    if (!a.alive) continue;
    if (sim.month >= st.endMonth) {
      a.action = null;
      def.finish(sim, a, sim.get(st.targetId));
    }
  }
}

/** The sea crossing is the only risky leg; Trúc Cơ and above fly over it. */
function crossLeg(sim: Sim, a: Avatar, from: string, to: string): boolean {
  const sea = SEA_ROUTES.some(([x, y]) => (from === x && to === y) || (from === y && to === x));
  if (!sea || a.realm >= 2) return true;
  if (a.linhThach >= 20) a.linhThach -= 20;
  const roll = sim.rng.next();
  if (roll < 0.02) {
    sim.kill(a, 'sea', 'Thuyền vỡ giữa biển Đông, không ai tìm thấy xác');
    return false;
  }
  if (roll < 0.15) {
    a.injuredUntil = Math.max(a.injuredUntil, sim.month + 12);
    if (sim.isPlayer(a) || a.realm >= 1) {
      sim.log('travel', `Bão đánh vỡ thuyền. ${a.name} ôm mảnh ván dạt về bờ cũ, suýt chết.`, [a.id], { regionId: from });
    }
    return false;
  }
  return true;
}

// ---- 3. encounters ------------------------------------------------------------------------

function atWar(sim: Sim, x: string | null, y: string | null): boolean {
  if (!x || !y || x === y) return false;
  return sim.s.sects[x]?.wars[y] !== undefined;
}

function hostile(sim: Sim, a: Avatar, b: Avatar): boolean {
  if (atWar(sim, a.sectId, b.sectId)) return true;
  if (a.realm < 1 || b.realm < 1) return false;
  // Nhân tộc and yêu tộc: old blood between them, unless both are kindly.
  if ((a.race ?? 'human') !== (b.race ?? 'human') && a.persona.virtue + b.persona.virtue < 0.4) return true;
  const ea = a.sectId !== null && SECT_BY_ID[a.sectId]!.alignment === 'evil';
  const eb = b.sectId !== null && SECT_BY_ID[b.sectId]!.alignment === 'evil';
  return ea !== eb && (ea ? a : b).persona.virtue < 0;
}

export function phaseEncounters(sim: Sim): void {
  sim.reindex();
  for (const region of REGIONS) {
    const here = (sim.byRegion[region.id] ?? []).filter((a) => !a.action?.path?.length && sim.age(a) >= 16);
    if (here.length < 2) continue;
    for (const a of here) {
      if (!a.alive || !sim.rng.chance(0.015)) continue;
      const b = sim.rng.pick(here);
      if (b.id === a.id || !b.alive) continue;
      meet(sim, a, b);
    }
  }
}

function meet(sim: Sim, a: Avatar, b: Avatar): void {
  const rel = a.relations[b.id];
  if (hostile(sim, a, b) && (!rel || rel.kind === 'enemy' || rel.kind === 'rival')) {
    if (sim.rng.chance(0.5)) {
      const res = duel(sim, a, b, 0.2);
      const why = atWar(sim, a.sectId, b.sectId) ? 'Hai phái đang giao chiến'
        : (a.race ?? 'human') !== (b.race ?? 'human') ? 'Nhân yêu thù truyền kiếp' : 'Chính tà bất lưỡng lập';
      if (res.killed) sim.kill(res.loser, 'battle', `${why}, bị ${res.winner.name} hạ sát`, res.winner);
      else sim.log('battle', `${why}: ${a.name} và ${b.name} chạm trán. ${res.winner.name} thắng, ${res.loser.name} trọng thương bỏ chạy.`, [a.id, b.id], { regionId: a.regionId });
    }
    return;
  }
  if (rel) {
    rel.bond = Math.min(100, rel.bond + 2);
    const back = b.relations[a.id];
    if (back) back.bond = Math.min(100, back.bond + 2);
    return;
  }
  const sameTier = Math.abs(a.realm - b.realm) <= 1;
  const free = (x: Avatar) => !sim.relationOf(x, 'partner');
  const adultAge = (x: Avatar) => sim.age(x) >= 18 && sim.age(x) / sim.lifespan(x) < 0.6;
  if (a.gender !== b.gender && free(a) && free(b) && adultAge(a) && adultAge(b) && sameTier
    && sim.rng.chance(0.25 + (a.stats.miLuc + b.stats.miLuc - 100) / 400)) {
    if (sim.isPlayer(a) || sim.isPlayer(b)) {
      const player = sim.isPlayer(a) ? a : b;
      const other = player === a ? b : a;
      offerToPlayer(sim, {
        kind: 'offer',
        prompt: `${other.name} (${sim.realmLabel(other)}, ${sim.age(other)} tuổi) ngỏ ý muốn cùng ngươi kết làm ${player.realm >= 1 ? 'đạo lữ' : 'phu thê'}.`,
        options: [{ id: 'accept', label: 'Nhận lời' }, { id: 'decline', label: 'Từ chối' }],
        data: { offer: 'partner', other: other.id },
      });
      return;
    }
    sim.relate(a, b, 'partner', 'partner', 60);
    const word = a.realm >= 1 && b.realm >= 1 ? 'kết làm đạo lữ' : 'thành thân';
    sim.log('relation', `${a.name} và ${b.name} ${word}.`, [a.id, b.id], { regionId: a.regionId, major: a.realm >= 3 && b.realm >= 3 });
    return;
  }
  if (a.realm >= 1 && a.realm === b.realm && a.persona.ambition + b.persona.ambition > 1.3
    && !sim.relationOf(a, 'rival') && !sim.relationOf(b, 'rival')) {
    sim.relate(a, b, 'rival', 'rival', -30);
    sim.log('relation', `${a.name} và ${b.name} cùng cảnh giới, không ai phục ai. Từ nay thành kình địch.`, [a.id, b.id], { regionId: a.regionId });
    return;
  }
  const friends = (x: Avatar) => Object.values(x.relations).filter((r) => r.kind === 'friend').length;
  if (friends(a) < 3 && friends(b) < 3 && Math.abs(a.persona.virtue - b.persona.virtue) < 0.8) {
    sim.relate(a, b, 'friend', 'friend', 30);
    if (sim.isPlayer(a) || sim.isPlayer(b) || a.realm >= 2) {
      sim.log('relation', `${a.name} và ${b.name} tâm đầu ý hợp, kết làm bằng hữu.`, [a.id, b.id], { regionId: a.regionId });
    }
  }
}

// ---- 4. sects -----------------------------------------------------------------------------

function rankIndex(r: SectRankId | null): number {
  return r ? SECT_RANKS.findIndex((x) => x.id === r) : -1;
}

export function joinSect(sim: Sim, a: Avatar, sectId: string): void {
  const def = SECT_BY_ID[sectId]!;
  a.sectId = sectId;
  a.sectRank = sim.rootTier(a) < def.minRootTier ? 'tap_dich' : a.realm >= 2 ? 'noi_mon' : 'ngoai_mon';
  if (!a.technique || a.technique.grade < def.techniqueGrade) a.technique = sim.pickTechnique(def.techniqueGrade, a.elements);
  a.regionId = def.regionId;
  a.action = null;
}

export function phaseSects(sim: Sim): void {
  if (!isYearStart(sim)) return;
  const year = sim.year;
  const living = sim.living();
  for (const def of SECTS) {
    const st = sim.s.sects[def.id]!;
    const members = living.filter((a) => a.sectId === def.id);

    // Recruitment: a sect fills toward 130% of its founding roster.
    if (year - st.lastRecruitYear >= def.recruitEveryYears) {
      st.lastRecruitYear = year;
      const world = REGION_BY_ID[def.regionId]!.world;
      const evil = def.alignment === 'evil';
      const target = Math.round(Object.values(def.roster).reduce((x, y) => x + y, 0) * 1.3);
      const room = Math.max(0, target - members.length);
      // A weakened ma môn stops asking and starts taking children.
      const abduct = evil && members.length < target * 0.6;
      const cands = living.filter((a) => !a.sectId && REGION_BY_ID[a.regionId]!.world === world && sim.rootTier(a) > 0
        && (evil ? sim.age(a) >= 8 && sim.age(a) <= 50 && (a.persona.virtue < 0.35 || (abduct && sim.age(a) <= 16)) : sim.age(a) >= 8 && sim.age(a) <= 18)
        && (sim.rootTier(a) >= def.minRootTier || def.servants)
        // Vạn Yêu đình takes only yêu tộc; human sects only humans, though ma môn ask no questions.
        && (def.alignment === 'yeu' ? a.race === 'yeu' : a.race !== 'yeu' || evil));
      let taken = 0;
      for (const c of cands) {
        if (taken >= Math.min(10, room)) break;
        if (sim.isPlayer(c)) {
          // Righteous sects reach the player through the story events (Thanh Vân tông mở sơn môn…).
          if (!evil) continue;
          const servant = sim.rootTier(c) < def.minRootTier;
          offerToPlayer(sim, {
            kind: 'offer',
            prompt: evil
              ? `Một kẻ áo đen tìm tới: "${def.name} cần người có gan. Theo ta, ngươi sẽ có sức mạnh mà chính đạo không bao giờ cho."`
              : `${def.name} mở sơn môn tuyển đệ tử. ${servant ? 'Linh căn của ngươi chỉ đủ làm tạp dịch đệ tử.' : 'Trưởng lão gật đầu khi thấy đá thử linh căn sáng lên.'}`,
            options: [
              { id: 'accept', label: evil ? `Gia nhập ${def.name}` : `Lên núi bái nhập ${def.name}` },
              { id: 'decline', label: evil ? 'Từ chối' : 'Ở lại' },
            ],
            data: { offer: 'join_sect', sect: def.id },
          });
          continue;
        }
        if (!sim.rng.chance(evil ? 0.6 : 0.85)) continue;
        joinSect(sim, c, def.id);
        if (evil) c.persona.virtue = Math.max(-1, c.persona.virtue - 0.4);
        taken += 1;
      }
      if (taken > 0) {
        sim.log('sect', abduct
          ? `${taken} đứa trẻ có linh căn ở ${WORLDS[world].name} mất tích trong một đêm. Người ta tìm thấy dấu chân dẫn về phía ${def.name}.`
          : evil
          ? `${def.name} lén thu nạp ${taken} kẻ mới. Có người nói thấy họ đi về phía ${REGION_BY_ID[def.regionId]!.name} lúc nửa đêm.`
          : `${def.name} mở sơn môn tuyển đệ tử. Trước cổng xếp hàng dài, cuối cùng ${taken} người được nhận.`,
        [], { regionId: def.regionId, major: true });
      }
    }

    // Promotions.
    for (const m of members) {
      let target: SectRankId | null = m.sectRank;
      if (m.realm >= 3 && m.sectRank !== 'chuong_mon') target = 'truong_lao';
      else if (m.realm >= 2 && rankIndex(m.sectRank) < rankIndex('noi_mon')) target = 'noi_mon';
      else if (m.sectRank === 'tap_dich' && m.realm >= 1 && m.contribution >= 100) target = 'ngoai_mon';
      else if (m.sectRank === 'ngoai_mon' && m.contribution >= 400) target = 'noi_mon';
      if (target !== m.sectRank) {
        m.sectRank = target;
        const name = SECT_RANKS.find((r) => r.id === target)!.name;
        if (sim.isPlayer(m) || target === 'truong_lao') sim.log('sect', `${m.name} được thăng làm ${name} của ${def.name}.`, [m.id], { regionId: def.regionId, major: target === 'truong_lao' });
      }
    }

    // Leadership.
    const leader = sim.get(st.leaderId);
    if (!leader || !leader.alive || leader.sectId !== def.id) {
      const next = members.filter((m) => m.alive).sort((x, y) => sim.power(y) - sim.power(x))[0];
      if (next) {
        if (leader && leader.sectId === def.id && leader.sectRank === 'chuong_mon') leader.sectRank = 'truong_lao';
        st.leaderId = next.id;
        next.sectRank = 'chuong_mon';
        sim.log('sect', `${next.name} (${sim.realmLabel(next)}) lên làm chưởng môn ${def.name}.`, [next.id], { regionId: def.regionId, major: true });
        const me = members.find((m) => sim.isPlayer(m));
        if (me && me !== next && me.realm >= 2 && me.realm >= next.realm - 1) {
          offerToPlayer(sim, {
            kind: 'offer',
            prompt: `Chưởng môn ${def.name} vừa khuất. Các trưởng lão đề cử ${next.name} (${sim.realmLabel(next)}). Theo môn quy, ai muốn tranh chức phải thắng người được đề cử một trận.`,
            options: [{ id: 'accept', label: 'Ứng cử, giao đấu với ' + next.name, hint: 'Thua có thể trọng thương, hiếm khi mất mạng' }, { id: 'decline', label: `Ủng hộ ${next.name}` }],
            data: { offer: 'succession', sect: def.id, rival: next.id },
          });
        }
      } else st.leaderId = null;
    }
    st.prestige = Math.round(members.reduce((sum, m) => sum + sim.power(m), 0));
  }

  // Stances and wars.
  for (let i = 0; i < SECTS.length; i++) {
    for (let j = i + 1; j < SECTS.length; j++) {
      const x = SECTS[i]!;
      const y = SECTS[j]!;
      const sx = sim.s.sects[x.id]!;
      const sy = sim.s.sects[y.id]!;
      const opposed = x.alignment !== y.alignment;
      const drift = opposed ? sim.rng.range(-8, 3) : sim.rng.range(-3, 4);
      const stance = Math.max(-100, Math.min(100, (sx.relations[y.id] ?? 0) + drift));
      sx.relations[y.id] = stance;
      sy.relations[x.id] = stance;
      const sameWorld = REGION_BY_ID[x.regionId]!.world === REGION_BY_ID[y.regionId]!.world;
      const war = sx.wars[y.id];
      const strong = (id: string) => living.filter((a) => a.sectId === id && a.realm >= 1).length >= 6;
      if (!war && sameWorld && stance < -70 && strong(x.id) && strong(y.id) && sim.rng.chance(0.3)) {
        sx.wars[y.id] = { since: year };
        sy.wars[x.id] = { since: year };
        sim.log('war', `${x.name} và ${y.name} chính thức khai chiến. Đệ tử hai phái gặp nhau là động thủ.`, [], { regionId: x.regionId, major: true });
      } else if (war && ((year - war.since >= 3 && sim.rng.chance(0.25)) || !strong(x.id) || !strong(y.id))) {
        delete sx.wars[y.id];
        delete sy.wars[x.id];
        sx.relations[y.id] = sy.relations[x.id] = -40;
        sim.log('war', `${x.name} và ${y.name} đình chiến sau ${year - war.since} năm. Thù chưa tan, chỉ là cả hai đều đã kiệt sức.`, [], { regionId: x.regionId, major: true });
      } else if (war && sim.rng.chance(0.6)) {
        raid(sim, x.id, y.id);
      }
    }
  }
}

function raid(sim: Sim, x: string, y: string): void {
  const [att, def] = sim.rng.chance(0.5) ? [x, y] : [y, x];
  const fighters = (id: string) => sim.living().filter((a) => a.sectId === id && a.realm >= 1 && a.injuredUntil <= sim.month)
    .sort((p, q) => sim.power(q) - sim.power(p)).slice(0, 8);
  const A = fighters(att);
  const D = fighters(def);
  const n = Math.min(3, A.length, D.length);
  const dead: string[] = [];
  for (let k = 0; k < n; k++) {
    const a = sim.rng.pick(A);
    const d = sim.rng.pick(D);
    if (!a.alive || !d.alive) continue;
    const res = duel(sim, a, d, 0.2);
    if (res.killed) {
      dead.push(res.loser.name);
      sim.kill(res.loser, 'war', `Tử trận khi ${SECT_BY_ID[att]!.name} đánh ${SECT_BY_ID[def]!.name}`, res.winner);
    }
  }
  sim.log('war', `${SECT_BY_ID[att]!.name} đánh lên ${SECT_BY_ID[def]!.name}. Đại trận hộ sơn rung chuyển suốt bảy ngày.${dead.length ? ` Tử trận: ${dead.join(', ')}.` : ' Hai bên đều có người bị thương.'}`,
    [], { regionId: SECT_BY_ID[def]!.regionId, major: true });
}

// ---- 5. world events ----------------------------------------------------------------------

export function phaseWorld(sim: Sim): void {
  if (!isYearStart(sim)) return;
  const year = sim.year;
  const living = sim.living();

  if (year % 12 === 7) {
    sim.s.secretRealmOpenUntil = sim.month + 6;
    sim.log('world', 'Bí cảnh mở cửa. Cấm chế mờ dần, linh quang bốc lên tận mây. Sáu tháng nữa cửa sẽ đóng.', [], { regionId: 'bi_canh', major: true });
  }

  if (sim.rng.chance(0.07)) {
    const target = sim.rng.pick(['chan_nui', 'phuong_thi', 'thanh_van']);
    const src = sim.rng.pick(['Vạn Yêu sơn mạch', 'Lạc Hồn cốc', 'Hắc Phong lĩnh']);
    const dead: Avatar[] = [];
    for (const a of living.filter((x) => x.regionId === target)) {
      if (a.realm === 0) {
        if (sim.rng.chance(0.15 * (sim.age(a) < 12 ? MORTALITY.childDisasterMult : 1))) { dead.push(a); sim.kill(a, 'beast', `Chết trong đợt thú triều từ ${src}`); }
      } else if (!fightBeast(sim, a, 2) && sim.rng.chance(0.25)) {
        dead.push(a);
        sim.kill(a, 'beast', `Tử chiến trấn giữ ${REGION_BY_ID[target]!.name} trong đợt thú triều`);
      } else a.renown += 3;
    }
    sim.log('world', `Thú triều từ ${src} tràn tới ${REGION_BY_ID[target]!.name}. ${dead.length ? `${dead.length} người bỏ mạng.` : 'Tu sĩ chặn đứng được.'}`, dead.map((d) => d.id), { regionId: target, major: true });
  }

  if (year % 4 === 0) {
    const fighters = living.filter((a) => REGION_BY_ID[a.regionId]!.world === 'mortal' && a.realm === 0 && sim.age(a) >= 16 && sim.age(a) <= 60);
    if (fighters.length >= 4) {
      const champ = fighters.map((a) => ({ a, s: a.stats.canCot + a.renown / 2 + sim.rng.range(0, 30) })).sort((p, q) => q.s - p.s)[0]!.a;
      champ.renown += 30;
      if (!champ.titles.includes('Võ lâm minh chủ')) champ.titles.push('Võ lâm minh chủ');
      sim.storyFlag(champ, 'martial_champion');
      sim.log('world', `Võ lâm đại hội ở Thiên Trụ sơn. ${champ.name} đánh bại quần hùng, được tôn làm võ lâm minh chủ.`, [champ.id], { regionId: 'thien_tru', major: true });
    }
  }

  if (sim.rng.chance(0.06)) {
    const dead: Avatar[] = [];
    for (const a of living.filter((x) => (x.regionId === 'bien_ai' || x.regionId === 'lang_que') && x.realm === 0 && x.gender === 'male' && sim.age(x) >= 16 && sim.age(x) <= 50)) {
      if (sim.rng.chance(0.08)) { dead.push(a); sim.kill(a, 'war', 'Bị trưng binh, tử trận nơi biên ải'); }
    }
    sim.log('world', `Chiến loạn ở biên ải Đại Hạ. Lệnh trưng binh về tới từng làng.${dead.length ? ` ${dead.length} người không trở về.` : ''}`, dead.map((d) => d.id), { regionId: 'bien_ai', major: true });
  }

  if (sim.rng.chance(0.03)) {
    const place = sim.rng.pick(['lang_que', 'kinh_thanh', 'chan_nui']);
    const dead: Avatar[] = [];
    for (const a of living.filter((x) => x.regionId === place && x.realm === 0)) {
      if (sim.rng.chance(0.05 * (sim.age(a) < 12 ? MORTALITY.childDisasterMult : 1))) { dead.push(a); sim.kill(a, 'illness', 'Mất trong trận dịch'); }
    }
    sim.log('world', `Dịch bệnh ở ${REGION_BY_ID[place]!.name}.${dead.length ? ` ${dead.length} người qua đời.` : ''}`, dead.map((d) => d.id), { regionId: place, major: true });
  }
}

// ---- 6. lifecycle -------------------------------------------------------------------------

export function phaseLifecycle(sim: Sim): void {
  for (const a of sim.living()) {
    const age = sim.age(a);
    const ls = sim.lifespan(a);
    if (a.physiqueId === 'cuu_am_tuyet_mach' && age >= 20 && a.realm < 2) {
      sim.kill(a, 'doom', 'Cửu Âm tuyệt mạch phát tác, hàn khí công tâm');
      continue;
    }
    if (age >= ls) {
      sim.kill(a, 'old_age', a.realm === 0 ? 'Qua đời vì tuổi già' : 'Thọ tận tọa hóa');
      continue;
    }
    let annual = sim.childMortality(a);
    if (age > 12) {
      const nat = a.realm === 0 ? MORTALITY.natural.mortal : MORTALITY.natural.cultivator;
      annual = nat.a * Math.exp(nat.b * age / ls) * (sim.mods(a).naturalMortalityMult ?? 1);
    }
    if (sim.rng.chance(annual / 12)) {
      if (age <= 12) sim.kill(a, 'child', 'Chết yểu');
      else if (age / ls >= MORTALITY.oldAgeRatio) sim.kill(a, 'old_age', a.realm === 0 ? 'Qua đời vì tuổi già' : 'Thọ tận tọa hóa');
      else sim.kill(a, 'illness', a.realm === 0 ? 'Lâm bệnh qua đời' : a.injuredUntil > sim.month ? 'Thương thế tái phát' : 'Đạo thể suy tàn');
    }
  }
  if (!isYearStart(sim)) return;
  births(sim);
}

function births(sim: Sim): void {
  sim.reindex();
  // Couples.
  for (const a of sim.living()) {
    if (a.gender !== 'female') continue;
    const p = sim.relationOf(a, 'partner');
    if (!p || p.regionId !== a.regionId) continue;
    // Crowded places have fewer children (settlements only; wilds and sects are not capped).
    const home = REGION_BY_ID[a.regionId]!;
    if (home.population > 0 && (sim.byRegion[home.id] ?? []).length > home.population * 1.5) continue;
    const age = sim.age(a);
    const fertile = a.realm === 0 ? age >= 18 && age <= 42 : age / sim.lifespan(a) < 0.5;
    if (!fertile || !sim.rng.chance(a.realm === 0 ? 0.12 : 0.03)) continue;
    const rooted = sim.rootTier(a) > 0 || sim.rootTier(p) > 0;
    // The child carries the father's clan (or the mother's, if only she has one) and his surname.
    const clanId = p.clanId ?? a.clanId ?? undefined;
    const race = a.race === 'yeu' || p.race === 'yeu' ? 'yeu' : 'human';
    const child = sim.createAvatar({ regionId: a.regionId, clanId, noClan: !clanId, race, originId: !clanId && (a.originId === 'royal' || p.originId === 'royal') ? 'royal' : undefined });
    if (rooted && child.rootId === 'none' && sim.rng.chance(0.25)) Object.assign(child, sim.rollRoot(3));
    if (!clanId) child.name = `${surnameOf(p.name)} ${givenName(child.name)}`;
    sim.relate(child, a, 'parent', 'child', 70);
    child.relations[p.id] = { kind: 'parent', bond: 70, sinceMonth: sim.month };
    p.relations[child.id] = { kind: 'child', bond: 70, sinceMonth: sim.month };
    if (sim.isPlayer(a) || sim.isPlayer(p) || a.realm >= 2) {
      sim.log('birth', `${a.name} và ${p.name} sinh được một ${child.gender === 'male' ? 'con trai' : 'con gái'}, đặt tên ${child.name}.`, [a.id, p.id, child.id], { regionId: a.regionId });
    }
  }
  // Newcomers keep each settlement near its population.
  for (const r of REGIONS) {
    if (r.population <= 0 || r.kind === 'sect' || r.world === 'immortal') continue;
    const here = (sim.byRegion[r.id] ?? []).length;
    const deficit = r.population - here;
    if (deficit <= 0) continue;
    const n = Math.floor(deficit * 0.2 + sim.rng.next());
    for (let i = 0; i < n; i++) sim.createAvatar({ regionId: r.id });
  }
}

// ---- 7. housekeeping ----------------------------------------------------------------------

const KEEP_EVENTS = 2500;

export function phaseHousekeeping(sim: Sim): void {
  if (!isYearStart(sim)) return;
  const s = sim.s;
  for (const a of Object.values(s.avatars)) {
    if (a.alive || a.soulLife !== null || s.soul.pastLinks[a.id]) continue;
    if (sim.month - (a.deathMonth ?? 0) > 60 * 12) delete s.avatars[a.id];
  }
  const soulIds = new Set(Object.values(s.avatars).filter((a) => a.soulLife !== null).map((a) => a.id));
  if (s.events.length > KEEP_EVENTS) {
    const personal = s.events.filter((e) => e.avatarIds.some((id) => soulIds.has(id)));
    const rest = s.events.filter((e) => !e.avatarIds.some((id) => soulIds.has(id)));
    s.events = [...personal.slice(-3000), ...rest.slice(-KEEP_EVENTS)].sort((x, y) => x.id - y.id);
  }
}
