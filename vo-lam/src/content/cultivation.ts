// Cảnh giới, tư chất, xuất thân, thể chất, nội công của Vạn Kiếp Giang Hồ. Cấu trúc và nhiều con số lấy từ
// luan-hoi-van-kiep packages/content/data; tên và thang thời gian là của võ hiệp.

export interface Realm {
  id: string;
  name: string;
  rank: number;
  lifespan: number;
  stages: string[];
  /** Công lực per stage step, and the amount needed at the last stage to attempt the next realm. */
  stageCost: number;
  cultivationMult: number;
  battleMult: number;
  /** `bolts`: quan ải to pass after breaking through; võ học has them only for phá toái hư không. */
  breakthrough: { base: number; retryYears: number; bolts: number; survive: number } | null;
}

const KY = ['sơ kỳ', 'trung kỳ', 'hậu kỳ', 'viên mãn'];
const TRONG = ['nhất trọng', 'nhị trọng', 'tam trọng', 'tứ trọng', 'ngũ trọng', 'lục trọng', 'thất trọng', 'bát trọng', 'cửu trọng'];

// The common web-novel ladder of võ đạo: Hậu thiên → Tiên thiên → Tông sư → Đại tông sư → Thiên nhân hợp nhất,
// then phá toái hư không. Giang hồ ranks (tam lưu … tuyệt đỉnh, bán thánh) are titles on top of it (martial.ts).
// Ids are the tu tiên game's first six realms, rank for rank, so imported events that name a realm keep its rung.
// Stage costs: a sect disciple of middling talent spends about 40 years in Hậu thiên and 25 in Tiên thiên; Tông sư
// and above take the better part of a gifted life, so Đại tông sư are few and phá toái hư không a legend.
export const REALMS: Realm[] = [
  { id: 'pham_nhan', name: 'Người thường', rank: 0, lifespan: 70, stages: [''], stageCost: 40, cultivationMult: 1, battleMult: 0.5, breakthrough: null },
  { id: 'luyen_khi', name: 'Hậu thiên', rank: 1, lifespan: 85, stages: TRONG, stageCost: 60, cultivationMult: 1, battleMult: 1, breakthrough: { base: 0.4, retryYears: 3, bolts: 0, survive: 1 } },
  { id: 'truc_co', name: 'Tiên thiên', rank: 2, lifespan: 100, stages: KY, stageCost: 140, cultivationMult: 1.5, battleMult: 3, breakthrough: { base: 0.19, retryYears: 4, bolts: 0, survive: 1 } },
  { id: 'kim_dan', name: 'Tông sư', rank: 3, lifespan: 120, stages: TRONG, stageCost: 350, cultivationMult: 3.5, battleMult: 9, breakthrough: { base: 0.12, retryYears: 5, bolts: 0, survive: 1 } },
  { id: 'nguyen_anh', name: 'Đại tông sư', rank: 4, lifespan: 150, stages: KY, stageCost: 3000, cultivationMult: 7, battleMult: 27, breakthrough: { base: 0.08, retryYears: 6, bolts: 0, survive: 1 } },
  { id: 'hoa_than', name: 'Thiên nhân hợp nhất', rank: 5, lifespan: 200, stages: KY, stageCost: 9000, cultivationMult: 14, battleMult: 81, breakthrough: { base: 0.03, retryYears: 15, bolts: 6, survive: 0.88 } },
];

export const BREAKTHROUGH = {
  insightDivisor: 200,
  willDivisor: 400,
  clamp: [0.01, 0.95] as const,
  pillBonus: 0.2,
  tuViLoss: [0.1, 0.3] as const,
  injuryChance: 0.2,
  deviationAtWill1: 0.08,
  deviationAtWill100: 0.03,
  deviationDeathBelowWill: 40,
  tribulation: { canCotDivisor: 400, willDivisor: 800, clamp: [0.5, 0.995] as const },
};

export const MORTALITY = {
  childhood: [
    { ages: [0, 2], annual: 0.01 },
    { ages: [3, 5], annual: 0.005 },
    { ages: [6, 12], annual: 0.0015 },
  ],
  // Mortal curve gentler than LHVK (a 0.0003, b 8): with that, mortals died around 45; here the median adult reaches ~60.
  natural: { mortal: { a: 0.0002, b: 7 }, cultivator: { a: 0.00002, b: 10 } },
  /** Children are sheltered in beast tides and epidemics: their risk is multiplied by this. */
  childDisasterMult: 0.4,
  oldAgeRatio: 0.85,
};

export const GRADES = [
  { id: 'none', name: 'Không', mult: 0 },
  { id: 'hoang', name: 'Phổ thông', mult: 1.0 },
  { id: 'huyen', name: 'Thượng thừa', mult: 1.3 },
  { id: 'dia', name: 'Tuyệt học', mult: 1.7 },
  { id: 'thien', name: 'Thần công', mult: 2.2 },
];

export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho' | 'loi' | 'bang' | 'phong';
export const ELEMENT_NAMES: Record<Element, string> = {
  kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', loi: 'Lôi', bang: 'Băng', phong: 'Phong',
};
export const BASIC_ELEMENTS: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
export const MUTANT_ELEMENTS: Element[] = ['loi', 'bang', 'phong'];

export interface Technique { name: string; grade: number; element: Element | null }
export const TECHNIQUES: Technique[] = [
  { name: 'Thổ Nạp Pháp', grade: 1, element: null },
  { name: 'Thanh Mộc Công', grade: 1, element: 'moc' },
  { name: 'Liệt Dương Công', grade: 1, element: 'hoa' },
  { name: 'Hậu Thổ Công', grade: 1, element: 'tho' },
  { name: 'Huyền Thủy Tâm Pháp', grade: 2, element: 'thuy' },
  { name: 'Canh Kim Kiếm Quyết', grade: 2, element: 'kim' },
  { name: 'Huyền Băng Chân Khí', grade: 2, element: 'bang' },
  { name: 'Trường Xuân Công', grade: 2, element: 'moc' },
  { name: 'Xích Viêm Chân Kinh', grade: 2, element: 'hoa' },
  { name: 'Trấn Nhạc Công', grade: 2, element: 'tho' },
  { name: 'Kim Cương Bất Động Công', grade: 2, element: 'tho' },
  { name: 'Ngũ Lôi Tâm Pháp', grade: 2, element: 'loi' },
  { name: 'Thanh Phong Tâm Pháp', grade: 2, element: 'phong' },
  { name: 'Thái Hư Kiếm Điển', grade: 3, element: 'kim' },
  { name: 'Cửu Tiêu Lôi Âm Công', grade: 3, element: 'loi' },
  { name: 'Thanh Đế Trường Sinh Công', grade: 3, element: 'moc' },
  { name: 'Bích Hải Triều Sinh Công', grade: 3, element: 'thuy' },
  { name: 'Chu Tước Phần Thiên Công', grade: 3, element: 'hoa' },
  { name: 'Long Mạch Thần Công', grade: 3, element: 'tho' },
  { name: 'Huyền Minh Thần Công', grade: 3, element: 'bang' },
  { name: 'Cửu Thiên Cương Phong Công', grade: 3, element: 'phong' },
  { name: 'Vô Tướng Thần Công', grade: 4, element: null },
  { name: 'Thái Bạch Kiếm Kinh', grade: 4, element: 'kim' },
];

export interface SpiritRoot {
  id: string;
  name: string;
  tier: number;
  weight: number;
  mult: number;
  pool: 'none' | 'basic' | 'mutant';
  count: [number, number];
}

// Tư chất võ học. Ids are the tu tiên game's spirit roots; the elements are the nature of one's nội lực.
export const SPIRIT_ROOTS: SpiritRoot[] = [
  { id: 'none', name: 'Không hợp luyện võ', tier: 0, weight: 70, mult: 0, pool: 'none', count: [0, 0] },
  { id: 'tap_linh_can', name: 'Tư chất tầm thường', tier: 1, weight: 18, mult: 0.5, pool: 'basic', count: [4, 5] },
  { id: 'tam_linh_can', name: 'Tư chất khá', tier: 2, weight: 8, mult: 1, pool: 'basic', count: [3, 3] },
  { id: 'song_linh_can', name: 'Tư chất hơn người', tier: 3, weight: 3, mult: 1.6, pool: 'basic', count: [2, 2] },
  { id: 'don_linh_can', name: 'Thiên tư trác tuyệt', tier: 4, weight: 0.9, mult: 2.5, pool: 'basic', count: [1, 1] },
  { id: 'bien_di_linh_can', name: 'Kỳ cốt dị bẩm', tier: 5, weight: 0.09, mult: 3, pool: 'mutant', count: [1, 1] },
  { id: 'thien_linh_can', name: 'Võ học kỳ tài', tier: 6, weight: 0.01, mult: 4, pool: 'basic', count: [1, 1] },
];
/** Share of people with any gift for võ học (the tu tiên game has 30% with a spirit root). */
export const ROOTED_CHANCE = 0.55;
/** Võ duyên of the player's soul: the first life and lives without the gift raise the odds of having it. */
export const TIEN_DUYEN = { firstLifeBonus: 0.2, perMortalLife: 0.1, maxChance: 0.85 };

export interface Origin {
  id: string;
  name: string;
  weight: number;
  regionKinds: string[];
  rootedMult?: number;
  luck?: number;
  canCot?: number;
  charm?: number;
  linhThach?: number;
  clanTechnique?: boolean;
  childMortalityMult: number;
}

export const ORIGINS: Origin[] = [
  { id: 'commoner', name: 'Nông hộ', weight: 48, regionKinds: ['village', 'city', 'port', 'frontier'], childMortalityMult: 1 },
  { id: 'beggar', name: 'Ăn mày / cô nhi', weight: 12, regionKinds: ['city', 'port', 'market', 'frontier'], luck: 8, childMortalityMult: 1.8 },
  { id: 'merchant', name: 'Thương gia', weight: 15, regionKinds: ['city', 'port', 'market'], charm: 3, linhThach: 200, childMortalityMult: 0.8 },
  { id: 'martial_clan', name: 'Con nhà võ', weight: 12, regionKinds: ['city', 'frontier', 'mountain', 'village'], canCot: 8, childMortalityMult: 0.8 },
  { id: 'cultivator_clan', name: 'Danh môn thế gia', weight: 8, regionKinds: ['city', 'market', 'village'], rootedMult: 2, linhThach: 100, clanTechnique: true, childMortalityMult: 0.6 },
  { id: 'sect_born', name: 'Đệ tử môn phái', weight: 4, regionKinds: ['sect'], childMortalityMult: 0.6 },
  { id: 'royal', name: 'Hoàng tộc', weight: 1, regionKinds: ['city'], linhThach: 1000, childMortalityMult: 0.5 },
];

export interface Physique { id: string; name: string; weight: number; desc: string }
export const PHYSIQUE_CHANCE = 0.05;
export const PHYSIQUES: Physique[] = [
  { id: 'hoang_co_thanh_the', name: 'Thiên sinh thần lực', weight: 15, desc: 'Căn cốt +25, luyện nội công ×0,7, thọ +10' },
  { id: 'thien_sinh_kiem_cot', name: 'Thiên sinh kiếm cốt', weight: 20, desc: 'Kiếm pháp nhanh, hay gặp Kiếm mộ' },
  { id: 'luan_hoi_chi_the', name: 'Luân hồi chi thể', weight: 15, desc: 'Ngộ tính +8, Tâm tính +8, nhớ rõ tiền kiếp hơn' },
  { id: 'linh_lung_tam', name: 'Thất khiếu linh lung tâm', weight: 15, desc: 'Tâm tính +20, khó tẩu hỏa nhập ma' },
  { id: 'cuu_am_tuyet_mach', name: 'Cửu âm tuyệt mạch', weight: 15, desc: 'Ngộ tính +15, luyện công ×1,5, chết trước 20 tuổi nếu chưa tới Tiên thiên' },
  { id: 'doc_the', name: 'Bách độc bất xâm', weight: 20, desc: 'Trăm thứ độc không làm gì được' },
];

export const NAMES = {
  surnames: ['Lý', 'Trần', 'Tiêu', 'Lâm', 'Hàn', 'Diệp', 'Mộ Dung', 'Thượng Quan', 'Tô', 'Vương', 'Triệu', 'Chu', 'Lục', 'Tần', 'Mạc', 'Bạch', 'Liễu', 'Cố', 'Thẩm', 'Đông Phương', 'Hạ', 'Phương', 'Tạ', 'Mục', 'Ninh', 'Ôn', 'Kỷ', 'Nhạc'],
  male: ['Phong', 'Vân', 'Hạo', 'Thần', 'Khang', 'Trần', 'Huyền', 'Lăng', 'Dật', 'Nam', 'Kiếm', 'Tiêu', 'Hàn', 'Minh', 'Uyên', 'Trường', 'Dạ', 'Bách', 'Thanh', 'Hiên', 'Diệu', 'Khải', 'Lạc', 'Tùng'],
  female: ['Tuyết', 'Nguyệt', 'Linh', 'Yên', 'Vũ', 'Dao', 'Nhi', 'Ngọc', 'Lan', 'Hương', 'Thanh', 'Tịch', 'Uyển', 'Vi', 'Sương', 'Cầm', 'Như', 'Mộng', 'Liên', 'Ly'],
  doubleGivenChance: 0.4,
};

export const BEASTS: Record<number, string[]> = {
  1: ['Lang', 'Trư', 'Ưng', 'Hổ'],
  2: ['Báo', 'Hùng', 'Viên', 'Hạt'],
  3: ['Mãng', 'Tê', 'Báo', 'Điêu'],
  4: ['Hổ Vương', 'Hùng Vương', 'Mãng Vương'],
};
export const BEAST_PREFIXES = ['Hắc Phong', 'Thiết Bối', 'Huyết Nhãn', 'Kim Giáp', 'Độc Nha', 'Ngân Nguyệt', 'Hoàng Sa', 'Ám Ảnh', 'Liệt Phong', 'Bạch Mi', 'Độc Nhãn', 'Cụt Đuôi'];
