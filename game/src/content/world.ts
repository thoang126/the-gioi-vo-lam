// Geography and factions of the Luân Hồi Vạn Kiếp world. Names come from the game's events;
// "Thôn chân núi" is the one generic place added so Thanh Vân châu has a village to be born in.

export type WorldId = 'mortal' | 'cultivation';

export const WORLDS: Record<WorldId, { name: string; weight: number; baseCultivation: number }> = {
  mortal: { name: 'Phàm giới – Đại Hạ vương triều', weight: 55, baseCultivation: 8 },
  cultivation: { name: 'Tu chân giới – Thanh Vân châu', weight: 30, baseCultivation: 20 },
};

export type RegionKind =
  | 'city' | 'village' | 'frontier' | 'port' | 'mountain' | 'desert'
  | 'market' | 'sect' | 'cave' | 'ruin' | 'secret' | 'beast';

export interface Region {
  id: string;
  name: string;
  world: WorldId;
  kind: RegionKind;
  x: number;
  y: number;
  /** Population the birth phase keeps topping up toward (named people, not every peasant). */
  population: number;
  /** Environment multiplier for cultivating here outside a sect. */
  qi: number;
  /** Beast tier (1–4) for hunting and beast tides. */
  danger?: number;
  sectId?: string;
  desc: string;
}

export const REGIONS: Region[] = [
  { id: 'kinh_thanh', name: 'Kinh thành Đại Hạ', world: 'mortal', kind: 'city', x: 230, y: 190, population: 34, qi: 0.8, desc: 'Trung tâm vương triều: hoàng tộc, quan lại, thương hội.' },
  { id: 'thien_tru', name: 'Thiên Trụ sơn', world: 'mortal', kind: 'mountain', x: 120, y: 105, population: 5, qi: 0.9, desc: 'Nơi mở võ lâm đại hội, hào kiệt bốn phương tề tựu.' },
  { id: 'lac_ha', name: 'Lạc Hà phái', world: 'mortal', kind: 'sect', x: 330, y: 100, population: 10, qi: 1, sectId: 'lac_ha', desc: 'Tông môn nhỏ duy nhất của Đại Hạ.' },
  { id: 'bien_ai', name: 'Biên ải', world: 'mortal', kind: 'frontier', x: 70, y: 300, population: 12, qi: 0.8, desc: 'Chiến loạn liên miên, trai tráng bị trưng binh.' },
  { id: 'lang_que', name: 'Làng quê', world: 'mortal', kind: 'village', x: 330, y: 345, population: 34, qi: 0.8, desc: 'Ruộng đồng, mùa màng, lời đồn về tiên nhân.' },
  { id: 'sa_mac', name: 'Sa mạc', world: 'mortal', kind: 'desert', x: 150, y: 450, population: 3, qi: 0.7, desc: 'Đường buôn xuyên sa mạc, sơn tặc rình rập.' },
  { id: 'ben_cang', name: 'Bến cảng', world: 'mortal', kind: 'port', x: 432, y: 262, population: 12, qi: 0.8, desc: 'Nơi khởi hành vượt biển Đông tìm tiên.' },

  { id: 'phuong_thi', name: 'Phường thị', world: 'cultivation', kind: 'market', x: 685, y: 255, population: 20, qi: 1, desc: 'Chợ của tu sĩ: đan dược, đổ thạch, đấu giá.' },
  { id: 'chan_nui', name: 'Thôn chân núi', world: 'cultivation', kind: 'village', x: 625, y: 150, population: 18, qi: 1, desc: 'Xóm người phàm dưới chân Thanh Vân sơn.' },
  { id: 'thanh_van', name: 'Thanh Vân tông', world: 'cultivation', kind: 'sect', x: 760, y: 160, population: 26, qi: 1, sectId: 'thanh_van', desc: 'Đại tông môn chính đạo của Thanh Vân châu.' },
  { id: 'linh_mach', name: 'Thác linh mạch', world: 'cultivation', kind: 'cave', x: 890, y: 120, population: 0, qi: 1.6, desc: 'Linh mạch dưới thác nước, động phủ quý nhất hạ giới.' },
  { id: 'kiem_mo', name: 'Kiếm mộ', world: 'cultivation', kind: 'ruin', x: 935, y: 215, population: 0, qi: 1.1, desc: 'Nơi chôn kiếm của tiền bối.' },
  { id: 'bi_canh', name: 'Bí cảnh', world: 'cultivation', kind: 'secret', x: 845, y: 270, population: 0, qi: 1.3, desc: 'Mở cửa theo chu kỳ, cơ duyên và tử vong cùng chờ.' },
  { id: 'huyet_sat', name: 'Huyết Sát môn', world: 'cultivation', kind: 'sect', x: 840, y: 440, population: 16, qi: 1, sectId: 'huyet_sat', desc: 'Ma môn, kẻ thù truyền kiếp của chính đạo.' },
  { id: 'hac_phong', name: 'Hắc Phong lĩnh', world: 'cultivation', kind: 'beast', x: 690, y: 75, population: 0, qi: 1, danger: 1, desc: 'Yêu thú cấp thấp, nơi đệ tử mới săn bắt.' },
  { id: 'me_vu', name: 'Mê Vụ lâm', world: 'cultivation', kind: 'beast', x: 650, y: 400, population: 0, qi: 1, danger: 1, desc: 'Rừng sương mù, dễ lạc khó ra.' },
  { id: 'lac_hon', name: 'Lạc Hồn cốc', world: 'cultivation', kind: 'beast', x: 955, y: 360, population: 0, qi: 1, danger: 2, desc: 'Hồn bay phách lạc, yêu thú Trúc Cơ trở lên.' },
  { id: 'van_yeu', name: 'Vạn Yêu sơn mạch', world: 'cultivation', kind: 'beast', x: 955, y: 55, population: 0, qi: 1.1, danger: 3, desc: 'Sào huyệt yêu vương, nguồn gốc các đợt thú triều.' },
];

/** [a, b, months]. The sea crossing is the only link between the two worlds. */
export const ROUTES: [string, string, number][] = [
  ['kinh_thanh', 'lang_que', 1], ['kinh_thanh', 'thien_tru', 1], ['kinh_thanh', 'lac_ha', 1],
  ['kinh_thanh', 'ben_cang', 1], ['kinh_thanh', 'bien_ai', 2], ['bien_ai', 'sa_mac', 2],
  ['sa_mac', 'lang_que', 2], ['lang_que', 'ben_cang', 1], ['lac_ha', 'thien_tru', 1], ['lac_ha', 'ben_cang', 2],
  ['ben_cang', 'phuong_thi', 3],
  ['phuong_thi', 'thanh_van', 1], ['phuong_thi', 'chan_nui', 1], ['chan_nui', 'thanh_van', 1],
  ['thanh_van', 'hac_phong', 1], ['thanh_van', 'linh_mach', 1], ['linh_mach', 'van_yeu', 1],
  ['linh_mach', 'kiem_mo', 1], ['kiem_mo', 'bi_canh', 1], ['phuong_thi', 'bi_canh', 1],
  ['bi_canh', 'lac_hon', 1], ['phuong_thi', 'me_vu', 1], ['me_vu', 'huyet_sat', 1],
  ['huyet_sat', 'lac_hon', 1], ['chan_nui', 'hac_phong', 1], ['kiem_mo', 'lac_hon', 1],
];
export const SEA_ROUTE: [string, string] = ['ben_cang', 'phuong_thi'];

export type Alignment = 'righteous' | 'evil';

export interface SectDef {
  id: string;
  name: string;
  regionId: string;
  alignment: Alignment;
  /** Minimum spirit-root tier for the outer court; tier 1 joins as a servant if `servants`. */
  minRootTier: number;
  servants: boolean;
  recruitEveryYears: number;
  techniqueGrade: number;
  /** Starting roster size by realm rank, used when the world is created. */
  roster: Record<number, number>;
}

export const SECTS: SectDef[] = [
  { id: 'thanh_van', name: 'Thanh Vân tông', regionId: 'thanh_van', alignment: 'righteous', minRootTier: 2, servants: true, recruitEveryYears: 5, techniqueGrade: 2, roster: { 4: 1, 3: 3, 2: 8, 1: 22 } },
  { id: 'lac_ha', name: 'Lạc Hà phái', regionId: 'lac_ha', alignment: 'righteous', minRootTier: 1, servants: false, recruitEveryYears: 6, techniqueGrade: 1, roster: { 3: 1, 2: 2, 1: 8 } },
  { id: 'huyet_sat', name: 'Huyết Sát môn', regionId: 'huyet_sat', alignment: 'evil', minRootTier: 1, servants: false, recruitEveryYears: 4, techniqueGrade: 2, roster: { 4: 1, 3: 2, 2: 6, 1: 14 } },
];

/** Starting stance between sects, −100 (blood feud) … 100 (allies). */
export const SECT_RELATIONS: [string, string, number][] = [
  ['thanh_van', 'huyet_sat', -55],
  ['lac_ha', 'huyet_sat', -25],
  ['thanh_van', 'lac_ha', 20],
];

export const SECT_RANKS = [
  { id: 'tap_dich', name: 'Tạp dịch', env: 0.9 },
  { id: 'ngoai_mon', name: 'Ngoại môn', env: 1.0 },
  { id: 'noi_mon', name: 'Nội môn', env: 1.3 },
  { id: 'chan_truyen', name: 'Chân truyền', env: 1.3 },
  { id: 'truong_lao', name: 'Trưởng lão', env: 1.6 },
  { id: 'chuong_mon', name: 'Chưởng môn', env: 1.6 },
] as const;
export type SectRankId = (typeof SECT_RANKS)[number]['id'];
