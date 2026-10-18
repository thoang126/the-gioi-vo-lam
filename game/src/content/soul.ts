// Long-term goals of the soul: Kiếp Sách categories (GDD LHVK §9 "Bộ sưu tập Kiếp Sách") and
// soul titles that pay Luân Hồi Điểm. Life titles themselves come from LHVK titles.yaml.

import { ORIGINS, PHYSIQUES, REALMS, SPIRIT_ROOTS } from './cultivation';
import { LHVK } from './lhvk';
import { REGIONS } from './world';
import type { DeathCause, Soul } from '../types';

export const DEATH_NAMES: Record<DeathCause, string> = {
  old_age: 'Thọ tận', illness: 'Bệnh', child: 'Chết yểu', battle: 'Tử trận', beast: 'Yêu thú', qi_deviation: 'Tẩu hỏa nhập ma',
  tribulation: 'Độ kiếp thất bại', sea: 'Đắm thuyền', war: 'Chiến loạn', doom: 'Thể chất phát tác', ascension: 'Phi thăng',
  assassinated: 'Bị ám sát', wound: 'Thương thế tái phát',
};

export interface CodexCategory { id: string; name: string; entries: { id: string; name: string }[] }

export const CODEX: CodexCategory[] = [
  { id: 'roots', name: 'Linh căn', entries: SPIRIT_ROOTS.map((r) => ({ id: r.id, name: r.name })) },
  { id: 'physiques', name: 'Thể chất', entries: PHYSIQUES.map((p) => ({ id: p.id, name: p.name })) },
  { id: 'origins', name: 'Xuất thân', entries: ORIGINS.map((o) => ({ id: o.id, name: o.name })) },
  { id: 'birthplaces', name: 'Nơi sinh', entries: REGIONS.filter((r) => r.population > 0 && r.kind !== 'sect').map((r) => ({ id: r.id, name: r.name })) },
  { id: 'paths', name: 'Đạo đồ', entries: LHVK.paths.map((p) => ({ id: p.id, name: p.name })) },
  { id: 'realms', name: 'Cảnh giới', entries: REALMS.map((r) => ({ id: r.id, name: r.name })) },
  { id: 'titles', name: 'Danh hiệu', entries: LHVK.titles.map((t) => ({ id: t.id, name: t.name })) },
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
  { id: 'qi', name: 'Dẫn khí nhập thể', desc: 'Lần đầu tới Luyện Khí', points: 20, progress: (s) => [Math.min(1, maxRealm(s)), 1] },
  { id: 'foundation', name: 'Trúc Cơ thành', desc: 'Lần đầu tới Trúc Cơ', points: 50, progress: (s) => [Math.min(2, maxRealm(s)), 2] },
  { id: 'core', name: 'Kết thành Kim Đan', desc: 'Lần đầu tới Kim Đan', points: 150, progress: (s) => [Math.min(3, maxRealm(s)), 3] },
  { id: 'soul', name: 'Nguyên Anh lão quái', desc: 'Lần đầu tới Nguyên Anh', points: 400, progress: (s) => [Math.min(4, maxRealm(s)), 4] },
  { id: 'ten_mortals', name: 'Mười kiếp phàm nhân', desc: 'Mười kiếp không tu tiên', points: 30, progress: (s) => [count(s, (l) => l.realm === 0), 10] },
  { id: 'peaceful', name: 'Thọ chung chính tẩm', desc: 'Ba lần chết già', points: 30, progress: (s) => [count(s, (l) => l.cause === 'old_age'), 3] },
  { id: 'short', name: 'Hoa chưa kịp nở', desc: 'Ba kiếp chết trước mười hai tuổi', points: 15, progress: (s) => [count(s, (l) => l.diedMonth - l.bornMonth < 144), 3] },
  { id: 'reunion', name: 'Cố nhân trùng phùng', desc: 'Gặp lại năm người của tiền kiếp', points: 40, progress: (s) => [s.counters.reunions, 5] },
  { id: 'own_grave', name: 'Viếng mộ chính mình', desc: 'Đi ngang mộ của một kiếp trước', points: 20, progress: (s) => [s.counters.ownGraves, 1] },
  { id: 'two_worlds', name: 'Hai giới luân hồi', desc: 'Sinh ra ở cả Đại Hạ lẫn Thanh Vân châu', points: 20,
    progress: (s) => [Number(s.lives.some((l) => REGIONS.find((r) => r.id === l.bornRegion)?.world === 'mortal')) + Number(s.lives.some((l) => REGIONS.find((r) => r.id === l.bornRegion)?.world === 'cultivation')), 2] },
  { id: 'sea', name: 'Vượt biển tìm tiên', desc: 'Vượt biển Đông tới Thanh Vân châu', points: 30, progress: (s) => [s.counters.crossedSea, 1] },
  { id: 'leader', name: 'Một phái chi chủ', desc: 'Làm chưởng môn một tông môn', points: 150, progress: (s) => [s.counters.sectLeader, 1] },
  { id: 'careers', name: 'Bách nghệ tinh thông', desc: 'Đi năm con đường mưu sinh khác nhau', points: 40,
    progress: (s) => [(s.codex.paths ?? []).filter((p) => LHVK.paths.find((x) => x.id === p)?.slot === 'career').length, 5] },
  { id: 'famed', name: 'Danh chấn thiên hạ', desc: 'Mười danh hiệu khác nhau qua các kiếp', points: 60, progress: (s) => [(s.codex.titles ?? []).length, 10] },
  { id: 'heaven_root', name: 'Thiên đạo sủng nhi', desc: 'Sinh ra mang Thiên linh căn', points: 100, progress: (s) => [has(s, 'roots', 'thien_linh_can'), 1] },
  { id: 'dao_qua', name: 'Nghìn điểm Đạo Quả', desc: 'Một kiếp đạt 1.000 Đạo Quả', points: 80, progress: (s) => [Math.min(1000, Math.max(0, ...s.lives.map((l) => l.daoQua))), 1000] },
  { id: 'codex_half', name: 'Kiếp Sách nửa cuốn', desc: 'Mở một nửa Kiếp Sách', points: 100,
    progress: (s) => { const p = codexProgress(s); return [p.have, Math.ceil(p.total / 2)]; } },
  { id: 'ascend', name: 'Phi thăng', desc: 'Vượt thiên kiếp cuối của Đại Thừa', points: 1000, progress: (s) => [count(s, (l) => l.cause === 'ascension'), 1] },
];
