// Võ công và võ học môn phái. 41 võ công đầu giữ id của pháp thuật trong Luân Hồi Vạn Kiếp (đổi tên ở
// tools/wuxia-content.ts) nên event trao võ công vẫn trỏ đúng; những võ công dưới đây là của riêng bản võ hiệp.

import type { Skill, TechniqueRec } from '../battle-engine/content';

export type SkillKind = 'quyen' | 'chuong' | 'chi' | 'trao' | 'kiem' | 'dao' | 'con' | 'thuong' | 'am_khi' | 'khinh_cong' | 'noi_gia';

export const KIND_NAMES: Record<SkillKind, string> = {
  quyen: 'quyền cước', chuong: 'chưởng pháp', chi: 'chỉ pháp', trao: 'trảo pháp', kiem: 'kiếm pháp', dao: 'đao pháp',
  con: 'côn pháp', thuong: 'thương pháp', am_khi: 'ám khí', khinh_cong: 'khinh công', noi_gia: 'nội gia',
};

/** How each grade reads for a võ công. */
export const SKILL_GRADE_NAMES: Record<string, string> = { hoang: 'phổ thông', huyen: 'thượng thừa', dia: 'tuyệt học', thien: 'thần công' };

const dmg = (id: string, name: string, element: Skill['element'], grade: string, power: number, mpCost: number, cooldown: number, description: string, inflict?: Skill['inflict']): Skill =>
  ({ id, name, description, element, grade, effect: 'damage', power, mpCost, cooldown, ...(inflict ? { inflict } : {}) });
const ult = (id: string, name: string, element: Skill['element'], power: number, description: string, inflict?: Skill['inflict']): Skill =>
  ({ ...dmg(id, name, element, 'thien', power, 40, 0, description, inflict), ultimate: true });

export const NEW_SKILLS: Skill[] = [
  dmg('truong_quyen', 'Trường Quyền', null, 'hoang', 1, 4, 0, 'Bộ quyền nhập môn của mọi võ quán: đấm thẳng, đá thấp, không hoa mỹ.'),
  dmg('ngu_ho_dao', 'Ngũ Hổ Đao', 'kim', 'hoang', 1.15, 6, 0, 'Năm thế đao dũng mãnh như hổ, tiêu sư nào cũng biết vài thế.', { status: 'bleed', chance: 0.2 }),
  dmg('la_han_quyen', 'La Hán Quyền', 'tho', 'hoang', 1.2, 6, 0, 'Quyền pháp của tăng nhân Thiên Trụ tự, đứng tấn như núi, ra quyền như chuông.'),
  dmg('thai_huyen_kiem', 'Thái Huyền Kiếm Pháp', 'thuy', 'hoang', 1.2, 6, 0, 'Kiếm đi vòng tròn, lấy nhu dẫn cương, đối thủ đánh càng mạnh càng hụt.', { status: 'chill', chance: 0.25 }),
  dmg('khat_cai_con', 'Khất Cái Côn Pháp', 'moc', 'hoang', 1.15, 6, 0, 'Gậy tre của bang chúng ăn mày: quấn chân, gõ gối, đánh vào chỗ không ai ngờ.', { status: 'bind', chance: 0.3 }),
  dmg('thanh_van_kiem', 'Thanh Vân Kiếm Pháp', 'kim', 'hoang', 1.2, 6, 0, 'Kiếm pháp nhập môn của Thanh Vân kiếm phái, nhanh và thẳng như mây lướt.', { status: 'bleed', chance: 0.3 }),
  dmg('lac_ha_chuong', 'Lạc Hà Chưởng', 'hoa', 'hoang', 1.15, 6, 0, 'Chưởng ảnh đỏ như ráng chiều, trúng vào nóng rát như bỏng.', { status: 'burn', chance: 0.3 }),
  dmg('bich_thuy_kiem', 'Bích Thủy Kiếm Pháp', 'thuy', 'hoang', 1.2, 6, 0, 'Kiếm pháp mềm như nước hồ, gợn sóng mà không vỡ.', { status: 'chill', chance: 0.3 }),
  dmg('kim_dao_thap_tam_thuc', 'Kim Đao Thập Tam Thức', 'kim', 'hoang', 1.25, 7, 0, 'Mười ba thế đao của Kim Đao môn, thế nào cũng nhắm vào cổ.', { status: 'bleed', chance: 0.2 }),
  dmg('hac_sat_phi_tieu', 'Hắc Sát Phi Tiêu', null, 'hoang', 1.15, 6, 0, 'Phi tiêu đen bay không tiếng, phóng ra từ trong tay áo.', { status: 'bleed', chance: 0.3 }),
  dmg('huyet_sat_dao', 'Huyết Sát Đao', 'kim', 'huyen', 1.7, 14, 1, 'Đao pháp của Huyết Sát môn, chém càng nhiều sát khí càng nặng.', { status: 'bleed', chance: 0.5 }),
  dmg('lang_khong_kiem', 'Lăng Không Kiếm Pháp', 'phong', 'huyen', 1.6, 13, 1, 'Người bay lên, kiếm từ trên trời đâm xuống, đối thủ chỉ kịp ngẩng đầu.'),
  dmg('thien_ma_trao', 'Thiên Ma Trảo', null, 'huyen', 1.6, 14, 1, 'Năm ngón tay cong như móc sắt, xé thịt lột da.', { status: 'bleed', chance: 0.5 }),
  dmg('huyet_co_trao', 'Huyết Cổ Trảo', 'moc', 'huyen', 1.3, 12, 1, 'Móng tay tẩm máu cổ trùng, xước nhẹ là độc vào tới tim.', { status: 'poison', chance: 0.8 }),
  dmg('van_doc_tan_hoa', 'Vạn Độc Tán Hoa', 'moc', 'dia', 1.6, 20, 2, 'Rải một vốc bột hoa, trăm thứ độc cùng phát tác.', { status: 'poison', chance: 0.9 }),
  ult('man_thien_hoa_vu', 'Mãn Thiên Hoa Vũ', null, 3.8, 'Trăm mũi ám khí cùng bay ra như mưa hoa, không chỗ nào né.', { status: 'bleed', chance: 1 }),
  ult('kim_dao_doan_hon', 'Kim Đao Đoạn Hồn', 'kim', 4, 'Một đao duy nhất của chưởng môn Kim Đao môn, rút ra là có người chết.', { status: 'bleed', chance: 1 }),
  ult('van_co_phe_tam', 'Vạn Cổ Phệ Tâm', 'moc', 3.6, 'Giáo chủ Huyết Cổ giáo thả cổ mẹ, vạn con cổ con cùng gặm tim đối thủ.', { status: 'poison', chance: 1 }),
];

export const NEW_TECHNIQUES: TechniqueRec[] = [
  { id: 'kim_cuong_bat_dong', name: 'Kim Cương Bất Động Công', element: 'tho', grade: 'huyen', skills: ['la_han_quyen', 'thach_giap_thuat'] },
];

/** Môn loại of every võ công. */
export const SKILL_KINDS: Record<string, SkillKind> = {
  linh_quang_chi: 'chi', hoi_khi_quyet: 'noi_gia', ho_than_cuong_khi: 'noi_gia', van_doc_chi: 'chi', kim_phong_chi: 'chi',
  canh_kim_kiem_khi: 'kiem', kim_cang_ho_the: 'noi_gia', kim_quang_tram: 'dao', van_kiem_quy_tong: 'kiem', phi_diep_thuat: 'am_khi',
  man_dang_trien: 'quyen', thanh_moc_hoi_xuan: 'noi_gia', van_moc_lam_kinh: 'chuong', than_thu_thien_lam: 'quyen', lien_ba_chuong: 'chuong',
  thuy_tien: 'kiem', huyen_thuy_thuan: 'quyen', thuy_long_quyen: 'thuong', thuong_hai_dien_dao: 'chuong', hoa_xa_tien: 'am_khi',
  hoa_cau_thuat: 'chuong', liet_hoa_chuong: 'chuong', hoa_long_phun_tuc: 'dao', phan_thien_liet_diem: 'chuong', luu_sa_tien: 'am_khi',
  tho_thuan: 'quyen', thach_giap_thuat: 'noi_gia', son_nhac_ap_dinh: 'con', dai_dia_liet: 'quyen', loi_quang_chi: 'chi',
  chuong_tam_loi: 'chuong', loi_dinh_van_quan: 'con', cuu_tieu_than_loi: 'chuong', bang_chuy_thuat: 'am_khi', bang_phach_chuong: 'chuong',
  han_bang_kinh: 'noi_gia', bang_phong_thien_ly: 'chuong', phong_nhan: 'dao', tat_phong_bo: 'khinh_cong', phong_quyen_tan_van: 'quyen',
  thien_phong_tram: 'dao',
  truong_quyen: 'quyen', ngu_ho_dao: 'dao', la_han_quyen: 'quyen', thai_huyen_kiem: 'kiem', khat_cai_con: 'con', thanh_van_kiem: 'kiem',
  lac_ha_chuong: 'chuong', bich_thuy_kiem: 'kiem', kim_dao_thap_tam_thuc: 'dao', hac_sat_phi_tieu: 'am_khi', huyet_sat_dao: 'dao',
  lang_khong_kiem: 'kiem', thien_ma_trao: 'trao', huyet_co_trao: 'trao', van_doc_tan_hoa: 'am_khi', man_thien_hoa_vu: 'am_khi',
  kim_dao_doan_hon: 'dao', van_co_phe_tam: 'trao',
};

export interface SectArts {
  /** Nội công the sect hands down (a TECHNIQUES name). */
  technique: string;
  /** Võ công in the order they are taught: ngoại môn learns the first, chân truyền three, the chưởng môn all. */
  skills: string[];
  /** What the sect is known for, for the sect tab. */
  style: string;
}

export const SECT_ARTS: Record<string, SectArts> = {
  thien_tru_tu: { technique: 'Kim Cương Bất Động Công', skills: ['la_han_quyen', 'tho_thuan', 'thach_giap_thuat', 'son_nhac_ap_dinh', 'dai_dia_liet'], style: 'Quyền côn Phật môn, cương mãnh mà vững' },
  thai_huyen: { technique: 'Huyền Thủy Tâm Pháp', skills: ['thai_huyen_kiem', 'huyen_thuy_thuan', 'hoi_khi_quyet', 'thuy_tien', 'thuong_hai_dien_dao'], style: 'Kiếm pháp Đạo gia, lấy nhu thắng cương' },
  hanh_khat: { technique: 'Thanh Mộc Công', skills: ['khat_cai_con', 'lien_ba_chuong', 'man_dang_trien', 'van_moc_lam_kinh', 'than_thu_thien_lam'], style: 'Côn pháp và chưởng pháp của bang chúng ăn mày' },
  thanh_van: { technique: 'Canh Kim Kiếm Quyết', skills: ['thanh_van_kiem', 'canh_kim_kiem_khi', 'ho_than_cuong_khi', 'kim_quang_tram', 'van_kiem_quy_tong'], style: 'Kiếm pháp chính tông, nhanh và thẳng' },
  lac_ha: { technique: 'Liệt Dương Công', skills: ['lac_ha_chuong', 'hoa_cau_thuat', 'liet_hoa_chuong', 'hoa_long_phun_tuc', 'phan_thien_liet_diem'], style: 'Chưởng pháp dương cương, nóng như lửa' },
  huyet_sat: { technique: 'Xích Viêm Chân Kinh', skills: ['huyet_sat_dao', 'kim_quang_tram', 'phong_nhan', 'thien_phong_tram'], style: 'Đao pháp tà phái, càng chém càng hăng máu' },
  kiem_cac: { technique: 'Thanh Phong Tâm Pháp', skills: ['lang_khong_kiem', 'tat_phong_bo', 'canh_kim_kiem_khi', 'van_kiem_quy_tong'], style: 'Kiếm pháp trên không, khinh công số một' },
  bach_thao: { technique: 'Trường Xuân Công', skills: ['linh_quang_chi', 'thanh_moc_hoi_xuan', 'van_doc_chi', 'van_doc_tan_hoa'], style: 'Y thuật, điểm huyệt và dùng độc' },
  hac_sat: { technique: 'Thổ Nạp Pháp', skills: ['hac_sat_phi_tieu', 'bang_chuy_thuat', 'phi_diep_thuat', 'luu_sa_tien', 'man_thien_hoa_vu'], style: 'Ám khí, phóng ra không tiếng' },
  kim_dao: { technique: 'Hậu Thổ Công', skills: ['kim_dao_thap_tam_thuc', 'kim_cang_ho_the', 'kim_quang_tram', 'kim_dao_doan_hon'], style: 'Đao pháp nhà tướng, thiết bố sam hộ thân' },
  bich_thuy: { technique: 'Huyền Thủy Tâm Pháp', skills: ['bich_thuy_kiem', 'lien_ba_chuong', 'thuy_tien', 'thuy_long_quyen', 'thuong_hai_dien_dao'], style: 'Kiếm pháp mềm như nước của các nữ kiếm khách' },
  van_ma: { technique: 'Ngũ Lôi Tâm Pháp', skills: ['thien_ma_trao', 'loi_quang_chi', 'chuong_tam_loi', 'loi_dinh_van_quan', 'cuu_tieu_than_loi'], style: 'Ma công Tây Vực: trảo pháp và chưởng sấm' },
  van_yeu: { technique: 'Trường Xuân Công', skills: ['huyet_co_trao', 'van_doc_chi', 'man_dang_trien', 'van_doc_tan_hoa', 'van_co_phe_tam'], style: 'Cổ độc Nam Cương, trảo pháp tẩm máu cổ trùng' },
};

/** Taught at võ quán, tiêu cục and by wandering masters to anyone who pays. */
export const WANDERER_SKILLS = ['truong_quyen', 'ngu_ho_dao', 'lien_ba_chuong', 'phong_nhan', 'luu_sa_tien', 'kim_phong_chi', 'phong_quyen_tan_van'];

/** Võ công a sect member knows by rank. */
export const SKILLS_BY_RANK: Record<string, number> = { tap_dich: 1, ngoai_mon: 1, noi_mon: 2, chan_truyen: 3, truong_lao: 4, chuong_mon: 5 };
