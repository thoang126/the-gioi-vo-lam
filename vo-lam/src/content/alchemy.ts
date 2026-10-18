// Đan đạo: linh dược mọc theo vùng, đan dược, đan phương. Đan đột phá Tiên thiên, Tông sư, Đại tông sư
// dùng chung id với vật phẩm của Luân Hồi Vạn Kiếp, nên event nào cần "Tiểu Hoàn đan" cũng nhận đan tự luyện.

import type { Element } from './cultivation';

export interface HerbDef {
  id: string;
  name: string;
  element: Element | null;
  /** 1 Hậu thiên … 4 Đại tông sư: who can gather it, and roughly what it is worth. */
  grade: number;
  regions: string[];
}

export const HERBS: HerbDef[] = [
  { id: 'ngung_huyet_thao', name: 'Ngưng Huyết thảo', element: 'moc', grade: 1, regions: ['bach_thao', 'van_mong', 'hac_moc', 'chan_nui', 'hoa_hinh'] },
  { id: 'thanh_linh_diep', name: 'Thanh Linh diệp', element: 'moc', grade: 1, regions: ['thien_tru', 'lang_que', 'chan_nui', 'bach_thao', 'ngu_thon', 'hoa_hinh'] },
  { id: 'hoa_duong_qua', name: 'Hỏa Dương quả', element: 'hoa', grade: 1, regions: ['sa_mac', 'lung_tay', 'loan_thach', 'am_phong', 'yeu_thi'] },
  { id: 'bang_tam_lien', name: 'Băng Tâm liên', element: 'thuy', grade: 1, regions: ['thai_ho', 'giang_nam', 'nguyet_ho', 'ngu_thon', 'me_vu'] },
  { id: 'thach_nhu', name: 'Thạch nhũ', element: 'tho', grade: 1, regions: ['thien_tru', 'hoang_lang', 'linh_mach', 'phu_du', 'am_phong', 'hoa_hinh'] },
  { id: 'thiet_tuyen_thao', name: 'Thiết Tuyến thảo', element: 'kim', grade: 1, regions: ['bac_quan', 'kim_dao', 'kiem_mo', 'dao_tan_tu', 'bach_cot'] },
  { id: 'tu_van_chi', name: 'Tử Vân chi', element: 'moc', grade: 2, regions: ['van_mong', 'me_vu', 'bach_thao', 'phu_du', 'thai_co'] },
  { id: 'xich_viem_hoa', name: 'Xích Viêm hoa', element: 'hoa', grade: 2, regions: ['loan_thach', 'hac_phong', 'van_doc', 'u_minh'] },
  { id: 'han_ngoc_sam', name: 'Hàn Ngọc sâm', element: 'thuy', grade: 2, regions: ['bong_lai', 'hai_nhan', 'thuy_trai', 'nguyet_ho'] },
  { id: 'dia_long_can', name: 'Địa Long căn', element: 'tho', grade: 2, regions: ['linh_mach', 'van_yeu', 'hoang_lang', 'thai_co', 'bach_cot'] },
  { id: 'doc_tam_thao', name: 'Độc Tâm thảo', element: null, grade: 2, regions: ['van_doc', 'bach_cot', 'lac_hon', 'u_minh'] },
  { id: 'kim_tinh_sa', name: 'Kim Tinh sa', element: 'kim', grade: 3, regions: ['kiem_mo', 'loan_thach', 'hai_nhan', 'bach_cot'] },
  { id: 'hoa_linh_chi', name: 'Hỏa Linh chi', element: 'hoa', grade: 3, regions: ['lac_hon', 'hac_phong', 'u_minh', 'thai_co'] },
  { id: 'thien_nien_linh_chi', name: 'Thiên Niên linh chi', element: 'moc', grade: 3, regions: ['bi_canh', 'bong_lai', 'thai_co', 'van_yeu'] },
  { id: 'huyet_tinh', name: 'Huyết tinh', element: null, grade: 3, regions: ['huyet_uyen', 'bach_cot', 'u_minh', 'huyet_sat'] },
  { id: 'cuu_khieu_lien', name: 'Cửu Khiếu linh liên', element: 'thuy', grade: 4, regions: ['bi_canh', 'nguyet_ho', 'bong_lai'] },
  { id: 'long_tien_thao', name: 'Long Tiên thảo', element: 'tho', grade: 4, regions: ['thai_co', 'hai_nhan', 'van_yeu'] },
];

export type PillEffect =
  | { kind: 'breakthrough'; realm: string; bonus: number }
  /** Months of the user's own cultivation, poured in at once. */
  | { kind: 'cultivate'; maxRealm: number; months: number }
  | { kind: 'heal' }
  /** Years of lifespan; each kind works once per life. */
  | { kind: 'lifespan'; years: number }
  | { kind: 'detox'; amount: number };

export interface PillDef {
  id: string;
  name: string;
  grade: number;
  effect: PillEffect;
  /** Đan độc a pill leaves in the body. */
  toxicity: number;
  /** Lượng bạc for a trung phẩm pill at the market; breakthrough pills cost what the generic one does. */
  price: number;
  desc: string;
}

export const PILLS: PillDef[] = [
  { id: 'tu_khi_dan', name: 'Tụ Khí đan', grade: 1, effect: { kind: 'cultivate', maxRealm: 1, months: 12 }, toxicity: 8, price: 20, desc: 'Gom chân khí vào đan điền, bằng một năm luyện công của võ nhân Hậu thiên.' },
  { id: 'tuc_cot_dan', name: 'Tục Cốt đan', grade: 1, effect: { kind: 'heal' }, toxicity: 4, price: 20, desc: 'Nối gân liền xương, thương thế lành ngay.' },
  { id: 'thanh_tam_dan', name: 'Thanh Tâm đan', grade: 1, effect: { kind: 'detox', amount: 40 }, toxicity: 0, price: 25, desc: 'Gột đan độc tích trong kinh mạch.' },
  { id: 'truc_co_dan', name: 'Tiểu Hoàn đan', grade: 2, effect: { kind: 'breakthrough', realm: 'truc_co', bonus: 0.2 }, toxicity: 10, price: 50, desc: 'Đan đột phá Tiên thiên.' },
  { id: 'boi_nguyen_dan', name: 'Bồi Nguyên đan', grade: 2, effect: { kind: 'cultivate', maxRealm: 2, months: 18 }, toxicity: 10, price: 120, desc: 'Bồi bổ nguyên khí cho võ nhân Tiên thiên.' },
  { id: 'dien_tho_dan', name: 'Diên Thọ đan', grade: 2, effect: { kind: 'lifespan', years: 10 }, toxicity: 12, price: 300, desc: 'Thêm mười năm thọ nguyên. Mỗi kiếp chỉ có tác dụng một lần.' },
  { id: 'huyet_luyen_dan', name: 'Huyết Luyện đan', grade: 2, effect: { kind: 'cultivate', maxRealm: 3, months: 30 }, toxicity: 28, price: 150, desc: 'Ma đan luyện từ huyết tinh: công lực tăng vọt, đan độc rất nặng.' },
  { id: 'ket_kim_dan', name: 'Đại Hoàn đan', grade: 3, effect: { kind: 'breakthrough', realm: 'kim_dan', bonus: 0.18 }, toxicity: 12, price: 300, desc: 'Đan đột phá Tông sư.' },
  { id: 'ngung_nguyen_dan', name: 'Ngưng Nguyên đan', grade: 3, effect: { kind: 'cultivate', maxRealm: 3, months: 18 }, toxicity: 10, price: 500, desc: 'Ngưng tụ chân nguyên cho võ nhân Tông sư.' },
  { id: 'truong_xuan_dan', name: 'Trường Xuân đan', grade: 3, effect: { kind: 'lifespan', years: 15 }, toxicity: 14, price: 2500, desc: 'Thêm mười lăm năm thọ nguyên. Mỗi kiếp chỉ có tác dụng một lần.' },
  { id: 'hoa_anh_dan', name: 'Tuyết Liên đan', grade: 4, effect: { kind: 'breakthrough', realm: 'nguyen_anh', bonus: 0.15 }, toxicity: 14, price: 1800, desc: 'Đan đột phá Đại tông sư.' },
];

export interface RecipeDef {
  pill: string;
  ingredients: [herb: string, count: number][];
  months: number;
}

export const RECIPES: RecipeDef[] = [
  { pill: 'tu_khi_dan', ingredients: [['thanh_linh_diep', 2], ['thach_nhu', 1]], months: 2 },
  { pill: 'tuc_cot_dan', ingredients: [['ngung_huyet_thao', 2], ['thach_nhu', 1]], months: 2 },
  { pill: 'thanh_tam_dan', ingredients: [['bang_tam_lien', 2], ['thanh_linh_diep', 1]], months: 2 },
  { pill: 'truc_co_dan', ingredients: [['ngung_huyet_thao', 2], ['hoa_duong_qua', 1], ['thach_nhu', 1]], months: 3 },
  { pill: 'boi_nguyen_dan', ingredients: [['tu_van_chi', 1], ['dia_long_can', 1], ['thiet_tuyen_thao', 1]], months: 3 },
  { pill: 'dien_tho_dan', ingredients: [['tu_van_chi', 2], ['han_ngoc_sam', 1]], months: 4 },
  { pill: 'huyet_luyen_dan', ingredients: [['doc_tam_thao', 2], ['xich_viem_hoa', 1]], months: 3 },
  { pill: 'ket_kim_dan', ingredients: [['thien_nien_linh_chi', 1], ['hoa_linh_chi', 1], ['dia_long_can', 1]], months: 4 },
  { pill: 'ngung_nguyen_dan', ingredients: [['kim_tinh_sa', 1], ['han_ngoc_sam', 1], ['dia_long_can', 1]], months: 4 },
  { pill: 'truong_xuan_dan', ingredients: [['thien_nien_linh_chi', 2], ['huyet_tinh', 1], ['han_ngoc_sam', 1]], months: 6 },
  { pill: 'hoa_anh_dan', ingredients: [['cuu_khieu_lien', 1], ['long_tien_thao', 1], ['thien_nien_linh_chi', 1]], months: 6 },
];

/** Recipes everyone learns with the craft. */
export const STARTER_RECIPES = ['tu_khi_dan', 'tuc_cot_dan'];

export const QUALITY_NAMES = ['hạ phẩm', 'trung phẩm', 'thượng phẩm', 'cực phẩm'];
/** Potency and price by quality. */
export const QUALITY_MULT = [0.6, 1, 1.3, 1.6];

export const ALCHEMY = {
  maxLevel: 9,
  /** A pill of grade g needs alchemist level 2g−1. */
  levelFor: (grade: number) => grade * 2 - 1,
  xpFor: (level: number) => level * 3,
  /** Total breakthrough bonus a pill can give, whatever its quality. */
  pillBonusCap: 0.3,
  /** Đan độc fades by this much each month. */
  toxicityDecay: 0.5,
  /** Above this, cultivation pills are left alone. */
  toxicityLimit: 50,
  learnCost: 60,
  /** Where a furnace burns better: đan phòng of Bách Thảo cốc, địa hỏa in the gorges. */
  sites: { bach_thao: 0.12, loan_thach: 0.1, hac_phong: 0.08, van_tien_thanh: 0.05, huyet_uyen: 0.05 } as Record<string, number>,
  herbPrice: (grade: number) => 6 * 4 ** (grade - 1),
};

/** Ngũ hành tương sinh: key sinh value. */
export const GENERATES: Partial<Record<Element, Element>> = { moc: 'hoa', hoa: 'tho', tho: 'kim', kim: 'thuy', thuy: 'moc' };
/** Ngũ hành tương khắc: key khắc value. */
export const OVERCOMES: Partial<Record<Element, Element>> = { moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim', kim: 'moc' };

export const HERB_BY_ID: Record<string, HerbDef> = Object.fromEntries(HERBS.map((h) => [h.id, h]));
export const PILL_BY_ID: Record<string, PillDef> = Object.fromEntries(PILLS.map((p) => [p.id, p]));
export const RECIPE_BY_PILL: Record<string, RecipeDef> = Object.fromEntries(RECIPES.map((r) => [r.pill, r]));
