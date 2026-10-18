// Dựng nội dung võ hiệp cho bản fork từ nội dung tu tiên của game gốc:
//   npm run wuxia:content [-- ../game/src/content/lhvk.json]
// Đổi tên võ công, nội công, binh khí, đan dược theo id (id giữ nguyên để event vẫn trỏ đúng),
// đổi thuật ngữ trong mọi chuỗi bằng `wuxify`, rồi bỏ những event vẫn còn mang chất tu tiên.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stillCultivation, wuxify } from './wuxia-text';

const src = resolve(process.argv[2] ?? '../game/src/content/lhvk.json');
const out = resolve('src/content/lhvk.json');

/** Võ công thay cho pháp thuật cùng id: cùng hệ, phẩm, hiệu ứng; chỉ tên và lời tả đổi. */
export const SKILL_RENAMES: Record<string, [string, string]> = {
  linh_quang_chi: ['Điểm Huyệt Chỉ', 'Một ngón tay điểm thẳng vào huyệt đạo.'],
  hoi_khi_quyet: ['Vận Khí Điều Tức', 'Hít sâu, đưa chân khí đi một vòng, vết thương dịu lại.'],
  ho_than_cuong_khi: ['Hộ Thể Cương Khí', 'Chân khí bao quanh thân như một lớp giáp vô hình.'],
  van_doc_chi: ['Độc Sa Chỉ', 'Ngón tay tẩm độc sa, chạm vào là độc nhập thể.'],
  kim_phong_chi: ['Kim Cương Chỉ', 'Ngón tay cứng như thép, đâm thủng da thịt.'],
  canh_kim_kiem_khi: ['Liệt Phong Kiếm Pháp', 'Kiếm thế nhanh như gió, đường nào cũng tìm chỗ hở.'],
  kim_cang_ho_the: ['Thiết Bố Sam', 'Da thịt rắn như vải sắt, đao chém không vào.'],
  kim_quang_tram: ['Khai Sơn Đao Pháp', 'Một đao bổ xuống như muốn xẻ đôi ngọn núi.'],
  van_kiem_quy_tong: ['Vạn Kiếm Quy Nhất', 'Trăm đường kiếm thu về một điểm, một kiếm định thắng thua.'],
  phi_diep_thuat: ['Phi Hoa Trích Diệp', 'Hái lá ném ra, lá cây sắc như phi tiêu.'],
  man_dang_trien: ['Triền Ti Thủ', 'Hai tay quấn lấy cổ tay địch như dây leo.'],
  thanh_moc_hoi_xuan: ['Xuân Phong Hóa Vũ Công', 'Chân khí ấm như gió xuân, nối gân liền xương.'],
  van_moc_lam_kinh: ['Thiên La Địa Võng Chưởng', 'Chưởng ảnh giăng kín bốn phía, không đường thoát.'],
  than_thu_thien_lam: ['Cổ Thụ Bàn Căn Quyền', 'Thân đứng như cây cổ thụ, một quyền dồn sức trăm năm.'],
  lien_ba_chuong: ['Liên Hoàn Chưởng', 'Chưởng nối chưởng, dồn dập như sóng.'],
  thuy_tien: ['Thủy Xà Kiếm', 'Kiếm đi uốn lượn như rắn nước, len qua kẽ giáp.'],
  huyen_thuy_thuan: ['Nhu Thủy Thủ', 'Lấy nhu chế cương, hóa giải lực đánh tới.'],
  thuy_long_quyen: ['Giao Long Xuất Hải', 'Mũi thương vọt lên như rồng rời mặt biển.'],
  thuong_hai_dien_dao: ['Thương Hải Cuồng Đào', 'Chưởng lực cuồn cuộn như sóng dữ, nhấn chìm đối thủ.'],
  hoa_xa_tien: ['Liên Châu Tiễn', 'Ba mũi tên nối đuôi nhau, đầu tên tẩm dầu cháy.'],
  hoa_cau_thuat: ['Xích Dương Chưởng', 'Chưởng lực nóng rực như than hồng.'],
  liet_hoa_chuong: ['Liệt Hỏa Chưởng', 'Bàn tay đỏ rực như sắt nung.'],
  hoa_long_phun_tuc: ['Hỏa Long Đao', 'Đao quang đỏ rực, đi tới đâu nóng rát tới đó.'],
  phan_thien_liet_diem: ['Phần Thiên Chưởng', 'Dồn hết dương cương nội lực vào một chưởng.'],
  luu_sa_tien: ['Phi Hoàng Thạch', 'Viên đá ném ra rít gió, trúng đâu vỡ đó.'],
  tho_thuan: ['Bàn Thạch Thức', 'Hạ trung bình tấn, vững như bàn thạch.'],
  thach_giap_thuat: ['Kim Chung Tráo', 'Khí công phủ khắp thân như chuông đồng úp xuống.'],
  son_nhac_ap_dinh: ['Thái Sơn Áp Đỉnh', 'Một côn bổ xuống nặng như núi đè.'],
  dai_dia_liet: ['Địa Chấn Quyền', 'Một quyền đánh xuống, cả mặt sân nứt toác.'],
  loi_quang_chi: ['Kinh Lôi Chỉ', 'Ngón tay điểm ra nhanh như chớp, đối thủ tê dại.'],
  chuong_tam_loi: ['Chưởng Tâm Lôi', 'Nội lực nổ ra giữa lòng bàn tay, chấn động kinh mạch.'],
  loi_dinh_van_quan: ['Lôi Đình Côn Pháp', 'Côn giáng xuống liên hồi như sấm.'],
  cuu_tieu_than_loi: ['Cửu Tiêu Lôi Âm Chưởng', 'Chưởng phát ra tiếng sấm, chấn tan cương khí hộ thể.'],
  bang_chuy_thuat: ['Hàn Băng Tiêu', 'Phi tiêu tẩm hàn khí, trúng đâu tê cóng đó.'],
  bang_phach_chuong: ['Hàn Băng Miên Chưởng', 'Chưởng nhẹ như bông, hàn khí phong bế huyệt đạo.'],
  han_bang_kinh: ['Băng Tâm Quyết', 'Tâm lặng như băng, chiêu nào đánh tới cũng hóa giải.'],
  bang_phong_thien_ly: ['Thiên Lý Băng Phong', 'Hàn khí ngưng kết, đối thủ đông cứng tại chỗ.'],
  phong_nhan: ['Truy Phong Đao', 'Đao đi nhanh như gió, không thấy lưỡi.'],
  tat_phong_bo: ['Đạp Tuyết Vô Ngân', 'Khinh công lướt trên tuyết không để dấu chân.'],
  phong_quyen_tan_van: ['Toàn Phong Thối', 'Cước pháp xoay như lốc, quét tan mọi thứ quanh mình.'],
  thien_phong_tram: ['Cuồng Phong Đao Pháp', 'Đao nhanh tới mức tiếng gió rít tới sau khi đã trúng.'],
};

/** Nội công thay cho công pháp cùng id. */
export const TECHNIQUE_RENAMES: Record<string, string> = {
  dan_khi_quyet: 'Thổ Nạp Pháp',
  thanh_moc_quyet: 'Thanh Mộc Công',
  liet_hoa_kinh: 'Liệt Dương Công',
  hau_tho_cong: 'Hậu Thổ Công',
  huyen_thuy_chan_kinh: 'Huyền Thủy Tâm Pháp',
  canh_kim_kiem_quyet: 'Canh Kim Kiếm Quyết',
  thanh_van_kiem_dien: 'Thái Hư Kiếm Điển',
  cuu_tieu_loi_quyet: 'Cửu Tiêu Lôi Âm Công',
  huyen_bang_quyet: 'Huyền Băng Chân Khí',
  thai_thuong_vong_tinh_kinh: 'Vô Tướng Thần Công',
  thai_bach_kim_chuong: 'Thái Bạch Kiếm Kinh',
  at_moc_sinh_linh_quyet: 'Trường Xuân Công',
  thanh_de_truong_sinh_kinh: 'Thanh Đế Trường Sinh Công',
  bich_hai_trieu_sinh_quyet: 'Bích Hải Triều Sinh Công',
  xich_viem_chan_kinh: 'Xích Viêm Chân Kinh',
  chu_tuoc_phan_thien_quyet: 'Chu Tước Phần Thiên Công',
  tran_nhac_quyet: 'Trấn Nhạc Công',
  dai_dia_long_mach_kinh: 'Long Mạch Thần Công',
  ngu_loi_chinh_phap: 'Ngũ Lôi Tâm Pháp',
  huyen_minh_han_bang_kinh: 'Huyền Minh Thần Công',
  thanh_phong_ngu_khi_quyet: 'Thanh Phong Tâm Pháp',
  cuu_thien_cuong_phong_kinh: 'Cửu Thiên Cương Phong Công',
};

/** Binh khí, giáp, bảo vật thay cho pháp bảo cùng id. */
const ARTIFACT_RENAMES: Record<string, [string, string]> = {
  thiet_kiem: ['Thiết kiếm', 'Kiếm sắt thường, thợ rèn nào cũng làm được.'],
  moc_truong: ['Côn gỗ táo', 'Côn gỗ táo đen, nặng tay mà dẻo.'],
  thanh_phong_kiem: ['Thanh Phong kiếm', 'Kiếm nhẹ như gió, thợ giỏi rèn ba năm mới xong.'],
  xich_diem_dao: ['Xích Diễm đao', 'Lưỡi đao đỏ như than hồng.'],
  huyet_anh_kiem: ['Huyết Ảnh kiếm', 'Kiếm nhuốm máu trăm người, sát khí làm chủ nhân hăng máu.'],
  tan_kiem_thuong_co: ['Tàn kiếm cổ', 'Thanh kiếm gãy của một kiếm khách trăm năm trước, kiếm ý vẫn còn.'],
  loi_van_thuong: ['Lôi Vân thương', 'Mũi thương tới trước, tiếng gió tới sau.'],
  van_co_kiem: ['Vạn Cổ thần kiếm', 'Kiếm của vị kiếm thánh đã phá toái hư không.'],
  bo_y: ['Bố y tẩm dược', 'Áo vải ngâm thuốc, chống được chút độc.'],
  thanh_ty_bao: ['Thanh Ty bào', 'Áo dệt từ tơ tằm núi, nhẹ mà dai.'],
  huyen_quy_giap: ['Huyền Quy giáp', 'Giáp làm từ mai rùa trăm năm.'],
  kinh_cuc_giap: ['Nhuyễn giáp gai', 'Giáp mềm có gai nhọn, ai đánh vào cũng rách tay.'],
  bat_tu_y: ['Kim Ty giáp', 'Giáp đan bằng tơ vàng, giữ mạng chủ nhân một lần.'],
  tinh_ha_bao: ['Thiên Tàm bảo y', 'Áo dệt từ tơ tằm trên núi tuyết, đao kiếm khó xuyên.'],
  ho_menh_phu: ['Hộ tâm kính', 'Tấm gương đồng đeo trước ngực, đỡ một đòn chí mạng.'],
  van_ly_phu: ['Khói mù đạn', 'Ném xuống là khói mù mịt, chạy được ngàn dặm.'],
  tu_kim_hoa_ho_lo: ['Hồ lô rượu thuốc', 'Rượu ngâm trăm vị thuốc, một ngụm là tỉnh người.'],
  dong_tam_toa: ['Đồng Tâm tỏa', 'Khóa đồng sư phụ để lại, nhìn vào là tâm tĩnh.'],
  co_ngoc_boi: ['Cổ ngọc bội', 'Ngọc bội gia truyền, đeo vào thấy như có tổ tiên phù hộ.'],
  phong_hoa_luan: ['Phong Hỏa luân', 'Đôi vòng thép răng cưa, ném ra rồi tự quay về.'],
  cuu_long_an: ['Cửu Long lệnh', 'Lệnh bài khắc chín con rồng, thấy lệnh như thấy minh chủ.'],
  tien_chau: ['Dạ Minh châu', 'Viên ngọc sáng trong đêm, vô giá.'],
};

const STATUS_RENAMES: Record<string, string> = {
  bleed: 'Xuất huyết', bind: 'Bị khóa tay', chill: 'Hàn khí nhập thể', burn: 'Hỏa độc', stone_skin: 'Kim chung hộ thể',
  paralyze: 'Tê dại', freeze: 'Bị điểm huyệt', gale: 'Thân pháp như gió', poison: 'Trúng độc', stun: 'Choáng váng',
};

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function deep(v: Json, f: (s: string) => string): Json {
  if (typeof v === 'string') return f(v);
  if (Array.isArray(v)) return v.map((x) => deep(x, f));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x, f)]));
  return v;
}

function strings(v: Json, acc: string[] = []): string[] {
  if (typeof v === 'string') acc.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, acc);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, acc);
  return acc;
}

if (process.argv[1]?.endsWith('wuxia-content.ts')) {
  const raw = JSON.parse(readFileSync(src, 'utf8')) as Record<string, any>;

  for (const s of raw.battleSkills) { const r = SKILL_RENAMES[s.id]; if (r) [s.name, s.description] = r; }
  for (const [id, s] of Object.entries(raw.skills as Record<string, { name: string }>)) { const r = SKILL_RENAMES[id]; if (r) s.name = r[0]; }
  for (const t of raw.battleTechniques) { const r = TECHNIQUE_RENAMES[t.id]; if (r) t.name = r; }
  for (const id of Object.keys(raw.techniques)) { const r = TECHNIQUE_RENAMES[id]; if (r) raw.techniques[id] = r; }
  for (const a of raw.battleArtifacts) { const r = ARTIFACT_RENAMES[a.id]; if (r) [a.name, a.description] = r; }
  for (const [id, a] of Object.entries(raw.artifacts as Record<string, { name: string }>)) { const r = ARTIFACT_RENAMES[id]; if (r) a.name = r[0]; }
  for (const [id, st] of Object.entries(raw.battle.statuses as Record<string, { name: string }>)) { const r = STATUS_RENAMES[id]; if (r) st.name = r; }

  // Thú dữ thay cho thần thú: giang hồ có hổ, mãng, gấu, không có rồng phượng.
  const kings = ['Hổ Vương', 'Hùng Vương', 'Mãng Vương', 'Điêu Vương', 'Bạch Hổ', 'Huyết Mãng'];
  raw.narration.beastPrefixes = ['Hắc Phong', 'Thiết Bối', 'Huyết Nhãn', 'Kim Giáp', 'Độc Nha', 'Ngân Nguyệt', 'Hoàng Sa', 'Ám Ảnh', 'Liệt Phong', 'Bạch Mi', 'Độc Nhãn', 'Cụt Đuôi'];
  raw.narration.beastSpecies = Object.fromEntries(Object.keys(raw.narration.beastSpecies).map((realm, i) => [realm,
    i === 0 ? ['Lang', 'Trư', 'Hồ', 'Ưng', 'Xà', 'Hùng'] : i === 1 ? ['Lang', 'Trư', 'Báo', 'Viên', 'Xà', 'Hùng', 'Ngạc']
      : i === 2 ? ['Mãng', 'Báo', 'Hổ', 'Điêu', 'Ngạc', 'Hùng'] : i === 3 ? ['Mãng', 'Tê', 'Sư', 'Điêu', 'Tượng', 'Hổ'] : kings]));

  const wux = deep(raw as Json, wuxify) as Record<string, any>;

  // Lifespan gifts sized for tu tiên realms (300…2400 years) shrink to a martial artist's scale.
  const shrink = (v: Json): void => {
    if (Array.isArray(v)) v.forEach(shrink);
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'lifespan' && typeof x === 'number' && x > 50) (v as Record<string, Json>)[k] = Math.round(x / 30);
        else shrink(x);
      }
    }
  };
  shrink(wux as Json);

  // Events (and their chains' later steps) that still read as tu tiên are dropped; the rest stay.
  const kept: unknown[] = [];
  const dropped: Record<string, number> = {};
  for (const e of wux.events) {
    const hit = strings(e).map(stillCultivation).find((x) => x);
    if (hit) dropped[hit] = (dropped[hit] ?? 0) + 1;
    else kept.push(e);
  }
  wux.events = kept;
  wux.source = `${raw.source} → tools/wuxia-content.ts`;
  writeFileSync(out, JSON.stringify(wux, null, 1) + '\n');
  console.log(`Giữ ${kept.length}/${raw.events.length} event. Bỏ vì: ${Object.entries(dropped).sort((a, b) => b[1] - a[1]).map(([w, n]) => `"${w}" ${n}`).join(', ')}`);
}
