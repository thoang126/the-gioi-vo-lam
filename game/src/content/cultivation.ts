// Numbers come from luan-hoi-van-kiep packages/content/data (realms, spirit-roots, origins,
// worlds, cultivation, breakthrough, mortality). Hạ giới only: Đại Thừa vượt kiếp là phi thăng.

export interface Realm {
  id: string;
  name: string;
  rank: number;
  lifespan: number;
  stages: string[];
  /** Tu vi per stage step, and the amount needed at the last stage to attempt the next realm. */
  stageCost: number;
  cultivationMult: number;
  battleMult: number;
  breakthrough: { base: number; retryYears: number; bolts: number; survive: number } | null;
}

const SUB = ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Viên mãn'];

export const REALMS: Realm[] = [
  { id: 'pham_nhan', name: 'Phàm nhân', rank: 0, lifespan: 70, stages: [''], stageCost: 40, cultivationMult: 1, battleMult: 0.5, breakthrough: null },
  { id: 'luyen_khi', name: 'Luyện Khí', rank: 1, lifespan: 120, stages: ['tầng 1', 'tầng 2', 'tầng 3', 'tầng 4', 'tầng 5', 'tầng 6', 'tầng 7', 'tầng 8', 'tầng 9'], stageCost: 100, cultivationMult: 0.9, battleMult: 1, breakthrough: { base: 0.62, retryYears: 5, bolts: 1, survive: 0.97 } },
  { id: 'truc_co', name: 'Trúc Cơ', rank: 2, lifespan: 250, stages: SUB, stageCost: 2000, cultivationMult: 1.5, battleMult: 3, breakthrough: { base: 0.33, retryYears: 10, bolts: 3, survive: 0.96 } },
  { id: 'kim_dan', name: 'Kim Đan', rank: 3, lifespan: 500, stages: SUB, stageCost: 15000, cultivationMult: 3.5, battleMult: 9, breakthrough: { base: 0.19, retryYears: 20, bolts: 6, survive: 0.95 } },
  { id: 'nguyen_anh', name: 'Nguyên Anh', rank: 4, lifespan: 1000, stages: SUB, stageCost: 100000, cultivationMult: 7, battleMult: 27, breakthrough: { base: 0.12, retryYears: 40, bolts: 9, survive: 0.95 } },
  { id: 'hoa_than', name: 'Hóa Thần', rank: 5, lifespan: 2000, stages: SUB, stageCost: 600000, cultivationMult: 14, battleMult: 81, breakthrough: { base: 0.08, retryYears: 80, bolts: 9, survive: 0.95 } },
  { id: 'dung_hu', name: 'Dung Hư', rank: 6, lifespan: 4000, stages: SUB, stageCost: 600000, cultivationMult: 28, battleMult: 243, breakthrough: { base: 0.08, retryYears: 160, bolts: 12, survive: 0.95 } },
  { id: 'hop_the', name: 'Hợp Thể', rank: 7, lifespan: 8000, stages: SUB, stageCost: 1200000, cultivationMult: 56, battleMult: 729, breakthrough: { base: 0.08, retryYears: 320, bolts: 15, survive: 0.95 } },
  { id: 'do_kiep', name: 'Độ Kiếp', rank: 8, lifespan: 16000, stages: SUB, stageCost: 2400000, cultivationMult: 112, battleMult: 2187, breakthrough: { base: 0.08, retryYears: 640, bolts: 18, survive: 0.96 } },
  { id: 'dai_thua', name: 'Đại Thừa', rank: 9, lifespan: 32000, stages: SUB, stageCost: 4800000, cultivationMult: 224, battleMult: 6561, breakthrough: { base: 0.25, retryYears: 1000, bolts: 27, survive: 0.97 } },
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
  natural: { mortal: { a: 0.0003, b: 8 }, cultivator: { a: 0.00002, b: 10 } },
  oldAgeRatio: 0.85,
};

export const GRADES = [
  { id: 'none', name: 'Không', mult: 0 },
  { id: 'hoang', name: 'Hoàng phẩm', mult: 1.0 },
  { id: 'huyen', name: 'Huyền phẩm', mult: 1.3 },
  { id: 'dia', name: 'Địa phẩm', mult: 1.7 },
  { id: 'thien', name: 'Thiên phẩm', mult: 2.2 },
];

export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho' | 'loi' | 'bang' | 'phong';
export const ELEMENT_NAMES: Record<Element, string> = {
  kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', loi: 'Lôi', bang: 'Băng', phong: 'Phong',
};
export const BASIC_ELEMENTS: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
export const MUTANT_ELEMENTS: Element[] = ['loi', 'bang', 'phong'];

export interface Technique { name: string; grade: number; element: Element | null }
export const TECHNIQUES: Technique[] = [
  { name: 'Dẫn Khí Quyết', grade: 1, element: null },
  { name: 'Thanh Mộc Quyết', grade: 1, element: 'moc' },
  { name: 'Liệt Hỏa Kinh', grade: 1, element: 'hoa' },
  { name: 'Hậu Thổ Công', grade: 1, element: 'tho' },
  { name: 'Huyền Thủy Chân Kinh', grade: 2, element: 'thuy' },
  { name: 'Canh Kim Kiếm Quyết', grade: 2, element: 'kim' },
  { name: 'Huyền Băng Quyết', grade: 2, element: 'bang' },
  { name: 'Ất Mộc Sinh Linh Quyết', grade: 2, element: 'moc' },
  { name: 'Xích Viêm Chân Kinh', grade: 2, element: 'hoa' },
  { name: 'Trấn Nhạc Quyết', grade: 2, element: 'tho' },
  { name: 'Ngũ Lôi Chính Pháp', grade: 2, element: 'loi' },
  { name: 'Thanh Phong Ngự Khí Quyết', grade: 2, element: 'phong' },
  { name: 'Thái Hư Kiếm Điển', grade: 3, element: 'kim' },
  { name: 'Cửu Tiêu Lôi Quyết', grade: 3, element: 'loi' },
  { name: 'Thanh Đế Trường Sinh Kinh', grade: 3, element: 'moc' },
  { name: 'Bích Hải Triều Sinh Quyết', grade: 3, element: 'thuy' },
  { name: 'Chu Tước Phần Thiên Quyết', grade: 3, element: 'hoa' },
  { name: 'Đại Địa Long Mạch Kinh', grade: 3, element: 'tho' },
  { name: 'Huyền Minh Hàn Băng Kinh', grade: 3, element: 'bang' },
  { name: 'Cửu Thiên Cương Phong Kinh', grade: 3, element: 'phong' },
  { name: 'Thái Thượng Vong Tình Kinh', grade: 4, element: null },
  { name: 'Thái Bạch Kim Chương', grade: 4, element: 'kim' },
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

export const SPIRIT_ROOTS: SpiritRoot[] = [
  { id: 'none', name: 'Không linh căn', tier: 0, weight: 70, mult: 0, pool: 'none', count: [0, 0] },
  { id: 'tap_linh_can', name: 'Ngũ hành tạp linh căn', tier: 1, weight: 18, mult: 0.5, pool: 'basic', count: [4, 5] },
  { id: 'tam_linh_can', name: 'Tam linh căn', tier: 2, weight: 8, mult: 1, pool: 'basic', count: [3, 3] },
  { id: 'song_linh_can', name: 'Song linh căn', tier: 3, weight: 3, mult: 1.6, pool: 'basic', count: [2, 2] },
  { id: 'don_linh_can', name: 'Đơn linh căn', tier: 4, weight: 0.9, mult: 2.5, pool: 'basic', count: [1, 1] },
  { id: 'bien_di_linh_can', name: 'Biến dị linh căn', tier: 5, weight: 0.09, mult: 3, pool: 'mutant', count: [1, 1] },
  { id: 'thien_linh_can', name: 'Thiên linh căn', tier: 6, weight: 0.01, mult: 4, pool: 'basic', count: [1, 1] },
];
/** GDD phụ lục A.2: P(có linh căn) = 30% × hệ số xuất thân. */
export const ROOTED_CHANCE = 0.3;

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
  { id: 'martial_clan', name: 'Võ lâm thế gia', weight: 12, regionKinds: ['city', 'frontier', 'mountain', 'village'], canCot: 8, childMortalityMult: 0.8 },
  { id: 'cultivator_clan', name: 'Tu tiên thế gia', weight: 8, regionKinds: ['city', 'market', 'village'], rootedMult: 2, linhThach: 100, clanTechnique: true, childMortalityMult: 0.6 },
  { id: 'sect_born', name: 'Đệ tử tông môn', weight: 4, regionKinds: ['sect'], childMortalityMult: 0.6 },
  { id: 'royal', name: 'Hoàng tộc', weight: 1, regionKinds: ['city'], linhThach: 1000, childMortalityMult: 0.5 },
];

export interface Physique { id: string; name: string; weight: number; desc: string }
export const PHYSIQUE_CHANCE = 0.05;
export const PHYSIQUES: Physique[] = [
  { id: 'hoang_co_thanh_the', name: 'Hoang cổ thánh thể', weight: 15, desc: 'Căn cốt +25, tu luyện ×0,7, thọ +30' },
  { id: 'thien_sinh_kiem_cot', name: 'Thiên sinh kiếm cốt', weight: 20, desc: 'Kiếm đạo nhanh, hay gặp kiếm mộ' },
  { id: 'luan_hoi_chi_the', name: 'Luân hồi chi thể', weight: 15, desc: 'Ngộ tính +8, Tâm tính +8, nhớ rõ tiền kiếp hơn' },
  { id: 'linh_lung_tam', name: 'Thất khiếu linh lung tâm', weight: 15, desc: 'Tâm tính +20, khó tẩu hỏa' },
  { id: 'cuu_am_tuyet_mach', name: 'Cửu Âm tuyệt mạch', weight: 15, desc: 'Ngộ tính +15, tu luyện ×1,5, chết trước 20 tuổi nếu chưa Trúc Cơ' },
  { id: 'doc_the', name: 'Độc thể', weight: 20, desc: 'Vạn độc bất xâm' },
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
  3: ['Mãng', 'Tê', 'Giao', 'Điêu'],
  4: ['Giao Long', 'Đại Bằng', 'Bạch Hổ Vương'],
};
export const BEAST_PREFIXES = ['Hắc Phong', 'Xích Diễm', 'Băng Tinh', 'Thiết Bối', 'Huyết Nhãn', 'Tam Nhãn', 'Song Đầu', 'Kim Giáp', 'Bích Lân', 'Cuồng Lôi', 'Độc Nha', 'Ngân Nguyệt', 'Thanh Mộc', 'Hoàng Sa', 'Ám Ảnh', 'Liệt Phong'];
