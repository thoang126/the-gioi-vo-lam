// Long-term goals of the soul: Kiếp Sách categories (GDD LHVK §9 "Bộ sưu tập Kiếp Sách") and
// soul titles that pay Luân Hồi Điểm. Life titles themselves come from LHVK titles.yaml.

import { ORIGINS, PHYSIQUES, REALMS, SPIRIT_ROOTS } from './cultivation';
import { LHVK } from './lhvk';
import { REGIONS, WORLDS, type WorldId } from './world';
import { CLANS, TRAITS } from './peoples';
import { PILLS } from './alchemy';
import { BATTLE_CONTENT } from '../battle-engine/content';
import type { DeathCause, Soul } from '../types';

export const DEATH_NAMES: Record<DeathCause, string> = {
  old_age: 'Thọ tận', illness: 'Bệnh', child: 'Chết yểu', battle: 'Tử trận', beast: 'Mãnh thú', qi_deviation: 'Tẩu hỏa nhập ma',
  tribulation: 'Phá quan thất bại', sea: 'Đắm thuyền', war: 'Chiến loạn', doom: 'Thể chất phát tác', ascension: 'Phá toái hư không',
  assassinated: 'Bị ám sát', wound: 'Thương thế tái phát',
};

export interface CodexCategory { id: string; name: string; entries: { id: string; name: string }[] }

export const CODEX: CodexCategory[] = [
  { id: 'roots', name: 'Tư chất', entries: SPIRIT_ROOTS.map((r) => ({ id: r.id, name: r.name })) },
  { id: 'physiques', name: 'Thể chất', entries: PHYSIQUES.map((p) => ({ id: p.id, name: p.name })) },
  { id: 'origins', name: 'Xuất thân', entries: ORIGINS.map((o) => ({ id: o.id, name: o.name })) },
  { id: 'birthplaces', name: 'Nơi sinh', entries: REGIONS.filter((r) => r.population > 0 && r.kind !== 'sect').map((r) => ({ id: r.id, name: r.name })) },
  { id: 'paths', name: 'Đạo đồ', entries: LHVK.paths.map((p) => ({ id: p.id, name: p.name })) },
  { id: 'realms', name: 'Cảnh giới', entries: REALMS.map((r) => ({ id: r.id, name: r.name })) },
  { id: 'titles', name: 'Danh hiệu', entries: LHVK.titles.map((t) => ({ id: t.id, name: t.name })) },
  { id: 'traits', name: 'Thiên phú, khuyết tật', entries: TRAITS.map((t) => ({ id: t.id, name: t.name })) },
  { id: 'clans', name: 'Thế gia', entries: CLANS.map((c) => ({ id: c.id, name: c.name })) },
  { id: 'pills', name: 'Đan dược tự luyện', entries: PILLS.map((p) => ({ id: p.id, name: p.name })) },
  { id: 'skills', name: 'Võ công', entries: BATTLE_CONTENT.skills.map((k) => ({ id: k.id, name: k.name })) },
  { id: 'deaths', name: 'Cách chết', entries: (Object.keys(DEATH_NAMES) as DeathCause[]).map((d) => ({ id: d, name: DEATH_NAMES[d] })) },
];

export function codexProgress(soul: Soul): { have: number; total: number } {
  let have = 0;
  let total = 0;
  for (const c of CODEX) {
    total += c.entries.length;
    const got = new Set(soul.codex[c.id] ?? []);
    have += c.entries.filter((e) => got.has(e.id)).length;
  }
  return { have, total };
}

export interface SoulTitle {
  id: string;
  name: string;
  desc: string;
  points: number;
  /** [current, target]; earned when current ≥ target. */
  progress: (soul: Soul) => [number, number];
}

const maxRealm = (soul: Soul) => Math.max(0, ...soul.lives.map((l) => l.realm));
const count = (soul: Soul, f: (l: Soul['lives'][number]) => boolean) => soul.lives.filter(f).length;
const has = (soul: Soul, cat: string, id: string) => (soul.codex[cat] ?? []).includes(id) ? 1 : 0;

export const SOUL_TITLES: SoulTitle[] = [
  { id: 'ten_lives', name: 'Mười kiếp luân hồi', desc: 'Sống qua mười kiếp', points: 20, progress: (s) => [s.lives.length, 10] },
  { id: 'qi', name: 'Bước vào võ lâm', desc: 'Lần đầu tới Hậu thiên', points: 20, progress: (s) => [Math.min(1, maxRealm(s)), 1] },
  { id: 'foundation', name: 'Tiên thiên cao thủ', desc: 'Lần đầu tới Tiên thiên', points: 50, progress: (s) => [Math.min(2, maxRealm(s)), 2] },
  { id: 'core', name: 'Một đời tông sư', desc: 'Lần đầu tới Tông sư', points: 150, progress: (s) => [Math.min(3, maxRealm(s)), 3] },
  { id: 'soul', name: 'Đại tông sư', desc: 'Lần đầu tới Đại tông sư', points: 400, progress: (s) => [Math.min(4, maxRealm(s)), 4] },
  { id: 'ten_mortals', name: 'Mười kiếp người thường', desc: 'Mười kiếp không luyện võ', points: 30, progress: (s) => [count(s, (l) => l.realm === 0), 10] },
  { id: 'peaceful', name: 'Thọ chung chính tẩm', desc: 'Ba lần chết già', points: 30, progress: (s) => [count(s, (l) => l.cause === 'old_age'), 3] },
  { id: 'short', name: 'Hoa chưa kịp nở', desc: 'Ba kiếp chết trước mười hai tuổi', points: 15, progress: (s) => [count(s, (l) => l.diedMonth - l.bornMonth < 144), 3] },
  { id: 'reunion', name: 'Cố nhân trùng phùng', desc: 'Gặp lại năm người của tiền kiếp', points: 40, progress: (s) => [s.counters.reunions, 5] },
  { id: 'own_grave', name: 'Viếng mộ chính mình', desc: 'Đi ngang mộ của một kiếp trước', points: 20, progress: (s) => [s.counters.ownGraves, 1] },
  { id: 'two_worlds', name: 'Hai giới luân hồi', desc: 'Sinh ra ở cả Đại Hạ lẫn Thanh Vân châu', points: 20,
    progress: (s) => [Number(s.lives.some((l) => REGIONS.find((r) => r.id === l.bornRegion)?.world === 'mortal')) + Number(s.lives.some((l) => REGIONS.find((r) => r.id === l.bornRegion)?.world === 'cultivation')), 2] },
  { id: 'sea', name: 'Vượt biển tìm thầy', desc: 'Vượt biển Đông tới Thanh Vân châu', points: 30, progress: (s) => [s.counters.crossedSea, 1] },
  { id: 'leader', name: 'Một phái chi chủ', desc: 'Làm chưởng môn một môn phái', points: 150, progress: (s) => [s.counters.sectLeader, 1] },
  { id: 'careers', name: 'Bách nghệ tinh thông', desc: 'Đi năm con đường mưu sinh khác nhau', points: 40,
    progress: (s) => [(s.codex.paths ?? []).filter((p) => LHVK.paths.find((x) => x.id === p)?.slot === 'career').length, 5] },
  { id: 'famed', name: 'Danh chấn thiên hạ', desc: 'Mười danh hiệu khác nhau qua các kiếp', points: 60, progress: (s) => [(s.codex.titles ?? []).length, 10] },
  { id: 'heaven_root', name: 'Võ học kỳ tài', desc: 'Sinh ra mang tư chất Võ học kỳ tài', points: 100, progress: (s) => [has(s, 'roots', 'thien_linh_can'), 1] },
  { id: 'dao_qua', name: 'Nghìn điểm Đạo Quả', desc: 'Một kiếp đạt 1.000 Đạo Quả', points: 80, progress: (s) => [Math.min(1000, Math.max(0, ...s.lives.map((l) => l.daoQua))), 1000] },
  { id: 'codex_half', name: 'Kiếp Sách nửa cuốn', desc: 'Mở một nửa Kiếp Sách', points: 100,
    progress: (s) => { const p = codexProgress(s); return [p.have, Math.ceil(p.total / 2)]; } },
  { id: 'clan_head', name: 'Gia chủ', desc: 'Đứng đầu một gia tộc', points: 80, progress: (s) => [s.counters.clanHead ?? 0, 1] },
  { id: 'clan_founder', name: 'Khai tông lập tộc', desc: 'Lập ra một gia tộc mới', points: 150, progress: (s) => [s.counters.clanFounded ?? 0, 1] },
  { id: 'yeu_life', name: 'Người Cổ tộc', desc: 'Sống một kiếp làm Cổ tộc', points: 30, progress: (s) => [s.counters.yeuLives ?? 0, 1] },
  { id: 'five_worlds', name: 'Ngũ giới luân hồi', desc: 'Sinh ra ở cả năm vùng đất của giang hồ', points: 120,
    progress: (s) => [(Object.keys(WORLDS) as WorldId[]).filter((w) => w !== 'immortal' && s.lives.some((l) => REGIONS.find((r) => r.id === l.bornRegion)?.world === w)).length, 5] },
  { id: 'eighteen_arts', name: 'Thập bát ban võ nghệ', desc: 'Luyện thành mười tám võ công khác nhau qua các kiếp', points: 80, progress: (s) => [(s.codex.skills ?? []).length, 18] },
  { id: 'ultimate', name: 'Tuyệt kỹ trong tay', desc: 'Luyện thành một tuyệt kỹ', points: 120,
    progress: (s) => [Math.min(1, (s.codex.skills ?? []).filter((id) => BATTLE_CONTENT.skills.find((k) => k.id === id)?.ultimate).length), 1] },
  { id: 'ascend', name: 'Phá toái hư không', desc: 'Thiên nhân hợp nhất rồi phá toái hư không, rời khỏi nhân gian', points: 1000, progress: (s) => [count(s, (l) => l.cause === 'ascension'), 1] },
];
