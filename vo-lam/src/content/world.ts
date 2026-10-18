// Địa lý và môn phái của Vạn Kiếp Giang Hồ, bản võ hiệp của Vạn Kiếp Thiên Hạ. Id các cõi, địa danh và môn phái
// giữ như bản tu tiên để event của Luân Hồi Vạn Kiếp vẫn trỏ đúng; tên, mô tả và môn phái mới là của bản này.

export type WorldId = 'mortal' | 'cultivation' | 'overseas' | 'demonic' | 'demon_beast' | 'immortal';

export interface WorldDef {
  name: string;
  /** Birth weight. Thiên ngoại is reached only by phá toái hư không. */
  weight: number;
  baseCultivation: number;
  fortuneWeightMult?: number;
  calamityWeightMult?: number;
  deviationChanceMult?: number;
  lifespanMult?: number;
  /** Region a character arrives in when an event moves them to this world. */
  entry: string;
  /** Sect that "joining a sect" in story events means here, if any. */
  homeSect: string | null;
  /** Market for buying pills and trading. */
  market: string;
}

export const WORLDS: Record<WorldId, WorldDef> = {
  mortal: { name: 'Trung Nguyên – Đại Hạ vương triều', weight: 70, baseCultivation: 10, entry: 'ben_cang', homeSect: 'lac_ha', market: 'kinh_thanh' },
  cultivation: { name: 'Thanh Vân châu – đất kiếm phái bên kia biển', weight: 18, baseCultivation: 14, entry: 'phuong_thi', homeSect: 'thanh_van', market: 'phuong_thi' },
  demon_beast: { name: 'Nam Cương – đất cổ độc', weight: 6, baseCultivation: 11, entry: 'yeu_thi', homeSect: 'van_yeu', market: 'yeu_thi' },
  demonic: { name: 'Tây Vực – đất Thiên Ma giáo', weight: 5, baseCultivation: 15, deviationChanceMult: 1.5, entry: 'huyet_uyen', homeSect: 'van_ma', market: 'huyet_uyen' },
  overseas: { name: 'Hải ngoại – quần đảo du hiệp', weight: 1, baseCultivation: 12, fortuneWeightMult: 1.5, calamityWeightMult: 1.5, entry: 'dao_tan_tu', homeSect: null, market: 'dao_tan_tu' },
  immortal: { name: 'Thiên ngoại – cõi của người phá toái hư không', weight: 0, baseCultivation: 30, entry: 'nam_thien_mon', homeSect: null, market: 'dao_tri' },
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
  /** Châu quận of Đại Hạ the place belongs to. */
  province?: string;
  desc: string;
}

/** Châu quận of Đại Hạ, wuxia style: a vast realm of prefectures, passes, inns and martial schools. */
export const PROVINCES: Record<string, { name: string; desc: string }> = {
  kinh_ky: { name: 'Kinh kỳ', desc: 'Đất thiên tử, quanh kinh thành trăm dặm.' },
  yen_bac: { name: 'Yên Bắc châu', desc: 'Đất lạnh, ngựa tốt, đao khách và quân trấn biên.' },
  lung_tay: { name: 'Lũng Tây châu', desc: 'Gió cát, khách điếm giữa sa mạc, ma giáo ẩn trong đồi.' },
  dong_hai: { name: 'Đông Hải châu', desc: 'Bến thuyền ra biển Đông và những ngọn núi có cao nhân thế ngoại.' },
  giang_nam: { name: 'Giang Nam châu', desc: 'Sông nước, phố hoa, kiếm khách phong lưu và thủy tặc.' },
  linh_nam: { name: 'Lĩnh Nam châu', desc: 'Rừng thiêng nước độc, thầy thuốc và kẻ dùng độc.' },
};

/**
 * Where each world sits on the map: regions and land shapes are authored in their own frame and
 * placed with x·k + dx, y·k + dy. Đại Hạ is drawn 1.6× larger: the mortal realm is the vast one.
 */
export const WORLD_LAYOUT: Record<WorldId, { k: number; dx: number; dy: number }> = {
  mortal: { k: 1.6, dx: 0, dy: 0 },
  cultivation: { k: 1, dx: 230, dy: 0 },
  overseas: { k: 1, dx: 330, dy: 100 },
  demonic: { k: 1, dx: 0, dy: 300 },
  demon_beast: { k: 1, dx: 230, dy: 200 },
  immortal: { k: 1, dx: 0, dy: 0 },
};

export const REGIONS: Region[] = [
  { id: 'kinh_thanh', name: 'Kinh thành Đại Hạ', world: 'mortal', kind: 'city', x: 230, y: 190, population: 46, qi: 0.8, province: 'kinh_ky', desc: 'Kinh đô trăm vạn dân: chín cửa thành, hoàng cung giữa lòng, phố chợ đông tây, tiêu cục, tửu lâu, nha môn. Mọi ngả đường của Đại Hạ đều dẫn về đây.' },
  { id: 'thien_tru', name: 'Thiên Trụ sơn', world: 'mortal', kind: 'mountain', x: 120, y: 105, population: 5, qi: 0.9, province: 'yen_bac', desc: 'Nơi mở võ lâm đại hội, hào kiệt bốn phương tề tựu.' },
  { id: 'lac_ha', name: 'Lạc Hà phái', world: 'mortal', kind: 'sect', x: 330, y: 100, population: 10, qi: 1, sectId: 'lac_ha', province: 'dong_hai', desc: 'Môn phái chưởng pháp bên bờ Đông Hải, đệ tử hiền hòa mà ra tay nóng như lửa.' },
  { id: 'bien_ai', name: 'Biên ải', world: 'mortal', kind: 'frontier', x: 70, y: 300, population: 12, qi: 0.8, province: 'lung_tay', desc: 'Chiến loạn liên miên, trai tráng bị trưng binh.' },
  { id: 'lang_que', name: 'Làng quê', world: 'mortal', kind: 'village', x: 330, y: 345, population: 28, qi: 0.8, province: 'giang_nam', desc: 'Ruộng đồng, mùa màng, lời đồn về cao nhân thế ngoại.' },
  { id: 'sa_mac', name: 'Sa mạc', world: 'mortal', kind: 'desert', x: 150, y: 450, population: 3, qi: 0.7, province: 'lung_tay', desc: 'Đường buôn xuyên sa mạc, sơn tặc rình rập.' },
  { id: 'ben_cang', name: 'Bến cảng', world: 'mortal', kind: 'port', x: 432, y: 262, population: 12, qi: 0.8, province: 'dong_hai', desc: 'Nơi thuyền rời bến vượt biển Đông sang Thanh Vân châu, đất của các đại kiếm phái.' },

  { id: 'yen_bac', name: 'Yên Bắc phủ', world: 'mortal', kind: 'city', x: 300, y: 45, population: 18, qi: 0.8, province: 'yen_bac', desc: 'Phủ thành phương bắc, chợ ngựa lớn nhất Đại Hạ, đao khách đi lại như mắc cửi.' },
  { id: 'kim_dao', name: 'Kim Đao môn', world: 'mortal', kind: 'sect', x: 360, y: 62, population: 8, qi: 0.95, sectId: 'kim_dao', province: 'yen_bac', desc: 'Môn phái đao pháp lừng danh Yên Bắc, đệ tử đa phần là con nhà tướng.' },
  { id: 'lung_tay', name: 'Lũng Tây thành', world: 'mortal', kind: 'city', x: 52, y: 228, population: 14, qi: 0.8, province: 'lung_tay', desc: 'Thành đất vàng cuối con đường tơ lụa, thương đội và mã tặc cùng uống một giếng nước.' },
  { id: 'long_mon', name: 'Long Môn khách điếm', world: 'mortal', kind: 'market', x: 95, y: 482, population: 6, qi: 0.75, province: 'lung_tay', desc: 'Quán trọ duy nhất giữa sa mạc. Bà chủ cười rất tươi, đừng hỏi thịt trong bánh bao là thịt gì.' },
  { id: 'trung_nguyen', name: 'Trung Nguyên trấn', world: 'mortal', kind: 'village', x: 188, y: 287, population: 12, qi: 0.8, province: 'kinh_ky', desc: 'Trấn lớn ngã tư đường quan, võ quán mọc san sát, ngày nào cũng có người đến đá quán.' },
  { id: 'van_mong', name: 'Vân Mộng sơn', world: 'mortal', kind: 'mountain', x: 255, y: 305, population: 3, qi: 0.95, province: 'kinh_ky', desc: 'Núi mây quanh năm, ẩn sĩ và cao thủ thoái ẩn dựng am trên đỉnh.' },
  { id: 'lam_an', name: 'Lâm An phủ', world: 'mortal', kind: 'city', x: 398, y: 385, population: 20, qi: 0.8, province: 'giang_nam', desc: 'Phủ thành giàu nhất Giang Nam: tây hồ, lầu son, thi hội và những cuộc tỉ võ kén rể.' },
  { id: 'bich_thuy', name: 'Bích Thủy kiếm phái', world: 'mortal', kind: 'sect', x: 292, y: 428, population: 8, qi: 0.95, sectId: 'bich_thuy', province: 'giang_nam', desc: 'Kiếm phái trên đảo giữa hồ, kiếm pháp mềm như nước, chưởng môn đời nào cũng là nữ.' },
  { id: 'thuy_trai', name: 'Thủy trại Bạch Lãng', world: 'mortal', kind: 'beast', x: 305, y: 482, population: 0, qi: 0.8, danger: 1, province: 'giang_nam', desc: 'Sào huyệt thủy tặc giữa đầm lau, triều đình đánh ba lần chưa dẹp được.' },
  { id: 'van_doc', name: 'Vạn Độc lĩnh', world: 'mortal', kind: 'beast', x: 232, y: 455, population: 0, qi: 0.85, danger: 1, province: 'linh_nam', desc: 'Rừng chướng khí, rắn rết trăm loài, Bách Thảo cốc tới đây hái thuốc giải.' },

  { id: 'phuong_thi', name: 'Phường thị', world: 'cultivation', kind: 'market', x: 685, y: 255, population: 20, qi: 1, desc: 'Chợ của võ nhân: binh khí, thuốc men, tin giang hồ và đấu giá.' },
  { id: 'chan_nui', name: 'Thôn chân núi', world: 'cultivation', kind: 'village', x: 625, y: 150, population: 18, qi: 1, desc: 'Xóm người thường dưới chân Thanh Vân sơn, nhà nào cũng có con theo học kiếm.' },
  { id: 'thanh_van', name: 'Thanh Vân kiếm phái', world: 'cultivation', kind: 'sect', x: 760, y: 160, population: 26, qi: 1, sectId: 'thanh_van', desc: 'Đại kiếm phái chính đạo của Thanh Vân châu, kiếm pháp nhanh mà ngay thẳng.' },
  { id: 'linh_mach', name: 'Thác Bạch Long', world: 'cultivation', kind: 'cave', x: 890, y: 120, population: 0, qi: 1.6, desc: 'Thác nước đổ ầm ầm ngày đêm, chỗ luyện công tốt nhất Thanh Vân châu.' },
  { id: 'kiem_mo', name: 'Kiếm mộ', world: 'cultivation', kind: 'ruin', x: 935, y: 215, population: 0, qi: 1.1, desc: 'Nơi các kiếm khách đời trước chôn kiếm khi gác kiếm về hưu.' },
  { id: 'bi_canh', name: 'Cổ mộ', world: 'cultivation', kind: 'secret', x: 845, y: 270, population: 0, qi: 1.3, desc: 'Cổ mộ của một vị minh chủ võ lâm trăm năm trước. Cửa đá chỉ mở theo con nước; bí kíp và cơ quan cùng chờ.' },
  { id: 'huyet_sat', name: 'Huyết Sát môn', world: 'cultivation', kind: 'sect', x: 840, y: 440, population: 16, qi: 1, sectId: 'huyet_sat', desc: 'Tà phái đao pháp, kẻ thù truyền kiếp của chính đạo Thanh Vân châu.' },
  { id: 'hac_phong', name: 'Hắc Phong lĩnh', world: 'cultivation', kind: 'beast', x: 690, y: 75, population: 0, qi: 1, danger: 1, desc: 'Rừng thú hoang cấp thấp, đệ tử mới vào núi săn bắt rèn gan.' },
  { id: 'me_vu', name: 'Mê Vụ lâm', world: 'cultivation', kind: 'beast', x: 650, y: 400, population: 0, qi: 1, danger: 1, desc: 'Rừng sương mù, dễ lạc khó ra.' },
  { id: 'lac_hon', name: 'Lạc Hồn cốc', world: 'cultivation', kind: 'beast', x: 955, y: 360, population: 0, qi: 1, danger: 2, desc: 'Hẻm núi hồn bay phách lạc, mãnh thú dữ dằn hơn hẳn nơi khác.' },
  { id: 'van_yeu', name: 'Vạn Thú sơn mạch', world: 'cultivation', kind: 'beast', x: 955, y: 55, population: 0, qi: 1.1, danger: 3, desc: 'Rừng núi trùng điệp, mãnh thú lớn như trâu, nguồn gốc các đợt nạn thú dữ.' },
  { id: 'bach_thao', name: 'Bách Thảo cốc', world: 'mortal', kind: 'sect', x: 205, y: 365, population: 6, qi: 1.1, sectId: 'bach_thao', province: 'linh_nam', desc: 'Thung lũng thuốc của các y sư, vừa cứu người vừa dùng độc; ai ốm nặng cũng tìm tới.' },
  { id: 'hac_sat', name: 'Hắc Sát giáo', world: 'mortal', kind: 'sect', x: 70, y: 420, population: 6, qi: 0.9, sectId: 'hac_sat', province: 'lung_tay', desc: 'Giáo phái ma đạo ẩn trong đồi cát phía tây, dân biên ải nhắc tới là rùng mình.' },
  { id: 'kiem_cac', name: 'Kiếm Các', world: 'cultivation', kind: 'sect', x: 965, y: 265, population: 8, qi: 1.2, sectId: 'kiem_cac', desc: 'Lầu kiếm dựng cạnh Kiếm mộ, chỉ nhận người có kiếm tâm.' },

  { id: 'thien_tru_tu', name: 'Thiên Trụ tự', world: 'mortal', kind: 'sect', x: 160, y: 140, population: 10, qi: 1, sectId: 'thien_tru_tu', province: 'yen_bac', desc: 'Cổ tự lưng chừng Thiên Trụ sơn, tăng nhân luyện quyền côn từ canh tư, tiếng chuông vọng tới Bắc Quan.' },
  { id: 'thai_huyen', name: 'Thái Huyền quán', world: 'mortal', kind: 'sect', x: 258, y: 348, population: 8, qi: 1, sectId: 'thai_huyen', province: 'kinh_ky', desc: 'Đạo quán trong mây Vân Mộng sơn, kiếm pháp lấy nhu thắng cương, nội công thâm hậu nhất Trung Nguyên.' },
  { id: 'tong_da', name: 'Tổng đà Hành Khất bang', world: 'mortal', kind: 'sect', x: 185, y: 240, population: 10, qi: 0.9, sectId: 'hanh_khat', province: 'kinh_ky', desc: 'Miếu hoang ngoài cửa tây kinh thành, nơi bang chúng ăn mày khắp thiên hạ về họp mỗi năm một lần.' },

  { id: 'giang_nam', name: 'Giang Nam thủy trấn', world: 'mortal', kind: 'city', x: 385, y: 445, population: 16, qi: 0.8, province: 'giang_nam', desc: 'Phố sông của thương nhân, thuyền hoa và tơ lụa. Mỗi lần đổi triều, tiền ở đây chảy về phe thắng trước tiên.' },
  { id: 'bac_quan', name: 'Bắc Quan', world: 'mortal', kind: 'frontier', x: 225, y: 55, population: 8, qi: 0.8, province: 'yen_bac', desc: 'Cửa ải phương bắc. Tướng trấn thủ Bắc Quan nắm nửa binh quyền Đại Hạ.' },
  { id: 'thai_ho', name: 'Thái Hồ', world: 'mortal', kind: 'village', x: 130, y: 205, population: 10, qi: 0.85, province: 'lung_tay', desc: 'Làng chài bên hồ lớn, nơi quan lại về hưu dựng nhà vườn và hậu duệ tiền triều sống ẩn danh.' },
  { id: 'hoang_lang', name: 'Hoàng lăng', world: 'mortal', kind: 'ruin', x: 300, y: 250, population: 0, qi: 0.9, province: 'kinh_ky', desc: 'Lăng mộ của các triều đại đã qua. Triều nào cũng xây, triều sau nào cũng có kẻ đào.' },
  { id: 'hac_moc', name: 'Hắc Mộc lâm', world: 'mortal', kind: 'beast', x: 405, y: 170, population: 0, qi: 0.9, danger: 1, province: 'dong_hai', desc: 'Rừng già phía đông, hổ báo và vài con mãnh thú lạc từ bên kia biển.' },
  { id: 'van_tien_thanh', name: 'Vạn Kiếm thành', world: 'cultivation', kind: 'city', x: 790, y: 345, population: 18, qi: 1.1, desc: 'Thành của võ nhân, không môn phái nào làm chủ. Cấm động thủ trong thành, ra khỏi cổng thì tùy.' },
  { id: 'loan_thach', name: 'Loạn Thạch hạp', world: 'cultivation', kind: 'beast', x: 735, y: 490, population: 0, qi: 1.1, danger: 2, desc: 'Hẻm núi đá vụn, mãnh thú nằm im như tảng đá chờ người đi qua.' },
  { id: 'dao_tan_tu', name: 'Du Hiệp đảo', world: 'overseas', kind: 'market', x: 505, y: 440, population: 14, qi: 1, desc: 'Đảo chợ của du hiệp, không môn phái nào quản, giao dịch bằng lượng bạc và nắm đấm.' },
  { id: 'ngu_thon', name: 'Ngư thôn', world: 'overseas', kind: 'village', x: 470, y: 530, population: 10, qi: 0.9, desc: 'Làng chài trên bãi đá, đàn ông ra khơi, đàn bà đan lưới nhìn trời.' },
  { id: 'phu_du', name: 'Phù Du đảo', world: 'overseas', kind: 'cave', x: 560, y: 520, population: 0, qi: 1.5, desc: 'Hòn đảo trôi, chân khí dồn về như thủy triều.' },
  { id: 'hai_nhan', name: 'Hải Nhãn', world: 'overseas', kind: 'beast', x: 520, y: 620, population: 0, qi: 1.1, danger: 2, desc: 'Xoáy nước khổng lồ, hải thú từ đáy sâu ngoi lên.' },

  { id: 'bong_lai', name: 'Bồng Lai đảo', world: 'overseas', kind: 'cave', x: 600, y: 455, population: 0, qi: 1.8, desc: 'Hòn đảo ẩn trong sương. Thuyền tìm được lối vào thì chân khí đậm hơn cả thác Bạch Long.' },
  { id: 'u_minh', name: 'U Minh hà', world: 'demonic', kind: 'beast', x: 100, y: 612, population: 0, qi: 1.2, danger: 3, desc: 'Sông đen chảy qua hẻm núi, xác người trôi theo dòng.' },
  { id: 'huyet_uyen', name: 'Huyết Uyên thành', world: 'demonic', kind: 'city', x: 170, y: 650, population: 16, qi: 1, desc: 'Thành của ma giáo, cổng treo đầu kẻ phản bội, chợ bán cả mạng người.' },
  { id: 'am_phong', name: 'Âm Phong trấn', world: 'demonic', kind: 'village', x: 320, y: 700, population: 12, qi: 0.9, desc: 'Trấn nhỏ quanh năm gió lạnh, người thường sống nhờ ma giáo che chở.' },
  { id: 'van_ma', name: 'Thiên Ma giáo', world: 'demonic', kind: 'sect', x: 80, y: 735, population: 14, qi: 1.2, sectId: 'van_ma', desc: 'Đại giáo tà đạo của Tây Vực, mạnh được yếu thua là giáo quy duy nhất.' },
  { id: 'bach_cot', name: 'Bạch Cốt lâm', world: 'demonic', kind: 'beast', x: 390, y: 620, population: 0, qi: 1.1, danger: 2, desc: 'Rừng xương trắng, sói hoang lang thang.' },

  { id: 'yeu_thi', name: 'Cổ trại', world: 'demon_beast', kind: 'market', x: 760, y: 610, population: 10, qi: 1, desc: 'Chợ phiên của người Cổ tộc: thuốc lá, cổ trùng, bạc trắng.' },
  { id: 'hoa_hinh', name: 'Bách Cổ thôn', world: 'demon_beast', kind: 'village', x: 680, y: 690, population: 16, qi: 1, desc: 'Bản làng trên sườn núi, nhà nào cũng nuôi một hũ cổ.' },
  { id: 'van_yeu_dinh', name: 'Huyết Cổ giáo', world: 'demon_beast', kind: 'sect', x: 880, y: 720, population: 14, qi: 1.2, sectId: 'van_yeu', desc: 'Tổng đàn Huyết Cổ giáo dưới gốc cổ thụ nghìn năm. Vào mà không có giải dược thì đừng mong ra.' },
  { id: 'thai_co', name: 'Thái Cổ lâm', world: 'demon_beast', kind: 'beast', x: 950, y: 620, population: 0, qi: 1.2, danger: 3, desc: 'Rừng nguyên sơ, mãnh thú và rắn độc chưa từng thấy người.' },

  { id: 'nguyet_ho', name: 'Nguyệt Hồ', world: 'demon_beast', kind: 'cave', x: 800, y: 680, population: 0, qi: 1.4, desc: 'Hồ soi trăng, người Cổ tộc tới tế thần mỗi đêm rằm.' },
  { id: 'nam_thien_mon', name: 'Nam Thiên Môn', world: 'immortal', kind: 'port', x: 500, y: 960, population: 0, qi: 1, desc: 'Cửa vào Thiên ngoại. Người phá toái hư không tới đây trước tiên.' },
  { id: 'lang_tieu', name: 'Lăng Tiêu điện', world: 'immortal', kind: 'city', x: 500, y: 860, population: 6, qi: 1.2, desc: 'Nơi những người đã phá toái hư không tụ lại luận võ.' },
  { id: 'dao_tri', name: 'Dao Trì', world: 'immortal', kind: 'market', x: 700, y: 900, population: 0, qi: 1.3, desc: 'Nơi mở Bàn đào hội ba nghìn năm một lần.' },
  { id: 'luan_hoi_tri', name: 'Luân Hồi trì', world: 'immortal', kind: 'cave', x: 290, y: 900, population: 0, qi: 1.5, desc: 'Mặt nước soi lại mọi kiếp đã sống.' },
  { id: 'hon_don_hai', name: 'Hỗn Độn Hải', world: 'immortal', kind: 'beast', x: 880, y: 960, population: 0, qi: 1.2, danger: 4, desc: 'Biển hỗn độn, Hồng Mông Ma Thần ngủ dưới đáy.' },
];

for (const r of REGIONS) {
  const L = WORLD_LAYOUT[r.world];
  r.x = Math.round(r.x * L.k + L.dx);
  r.y = Math.round(r.y * L.k + L.dy);
}

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
  ['kinh_thanh', 'bach_thao', 1], ['lang_que', 'bach_thao', 1], ['bien_ai', 'hac_sat', 1], ['sa_mac', 'hac_sat', 1],
  ['kiem_mo', 'kiem_cac', 1], ['bi_canh', 'kiem_cac', 1],
  ['ben_cang', 'dao_tan_tu', 2], ['phuong_thi', 'dao_tan_tu', 2],
  ['dao_tan_tu', 'ngu_thon', 1], ['dao_tan_tu', 'phu_du', 1], ['ngu_thon', 'hai_nhan', 1], ['phu_du', 'hai_nhan', 1],
  ['sa_mac', 'huyet_uyen', 3], ['huyet_uyen', 'am_phong', 1], ['huyet_uyen', 'van_ma', 1], ['am_phong', 'bach_cot', 1], ['van_ma', 'bach_cot', 2],
  ['lac_hon', 'yeu_thi', 2], ['huyet_sat', 'yeu_thi', 2], ['yeu_thi', 'hoa_hinh', 1], ['yeu_thi', 'van_yeu_dinh', 1], ['hoa_hinh', 'thai_co', 1], ['van_yeu_dinh', 'thai_co', 1],
  ['kinh_thanh', 'bac_quan', 2], ['thien_tru', 'bac_quan', 1], ['kinh_thanh', 'thai_ho', 1], ['thai_ho', 'bien_ai', 1],
  ['kinh_thanh', 'hoang_lang', 1], ['hoang_lang', 'lang_que', 1], ['lac_ha', 'hac_moc', 1], ['ben_cang', 'hac_moc', 1],
  ['lang_que', 'giang_nam', 1], ['giang_nam', 'ben_cang', 2], ['giang_nam', 'sa_mac', 2],
  ['phuong_thi', 'van_tien_thanh', 1], ['bi_canh', 'van_tien_thanh', 1], ['van_tien_thanh', 'huyet_sat', 1], ['me_vu', 'loan_thach', 1], ['loan_thach', 'huyet_sat', 1],
  ['dao_tan_tu', 'bong_lai', 2], ['huyet_uyen', 'u_minh', 1], ['van_ma', 'u_minh', 1], ['yeu_thi', 'nguyet_ho', 1], ['hoa_hinh', 'nguyet_ho', 1],
  ['yen_bac', 'bac_quan', 1], ['yen_bac', 'kim_dao', 1], ['yen_bac', 'lac_ha', 1], ['kim_dao', 'lac_ha', 1],
  ['lung_tay', 'thai_ho', 1], ['lung_tay', 'bien_ai', 1], ['long_mon', 'sa_mac', 1], ['long_mon', 'hac_sat', 1],
  ['trung_nguyen', 'kinh_thanh', 1], ['trung_nguyen', 'thai_ho', 1], ['trung_nguyen', 'bach_thao', 1],
  ['van_mong', 'hoang_lang', 1], ['van_mong', 'lang_que', 1], ['van_mong', 'trung_nguyen', 1],
  ['lam_an', 'giang_nam', 1], ['lam_an', 'lang_que', 1], ['lam_an', 'ben_cang', 2],
  ['bich_thuy', 'giang_nam', 1], ['bich_thuy', 'lang_que', 1], ['thuy_trai', 'giang_nam', 1], ['thuy_trai', 'bich_thuy', 1],
  ['van_doc', 'bach_thao', 1], ['van_doc', 'sa_mac', 1], ['van_doc', 'giang_nam', 2],
  ['thien_tru_tu', 'thien_tru', 1], ['thien_tru_tu', 'kinh_thanh', 1], ['thai_huyen', 'van_mong', 1], ['thai_huyen', 'lang_que', 1],
  ['tong_da', 'kinh_thanh', 1], ['tong_da', 'trung_nguyen', 1],
  ['nam_thien_mon', 'lang_tieu', 1], ['nam_thien_mon', 'dao_tri', 1], ['nam_thien_mon', 'luan_hoi_tri', 1], ['dao_tri', 'hon_don_hai', 1], ['lang_tieu', 'luan_hoi_tri', 1],
];
/** Sea crossings: risky for anyone below Tuyệt đỉnh. The first is the classic biển Đông crossing. */
export const SEA_ROUTES: [string, string][] = [['ben_cang', 'phuong_thi'], ['ben_cang', 'dao_tan_tu'], ['phuong_thi', 'dao_tan_tu'], ['dao_tan_tu', 'bong_lai']];
export const SEA_ROUTE: [string, string] = SEA_ROUTES[0]!;

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
  { id: 'thanh_van', name: 'Thanh Vân kiếm phái', regionId: 'thanh_van', alignment: 'righteous', minRootTier: 2, servants: true, recruitEveryYears: 5, techniqueGrade: 2, roster: { 4: 1, 3: 3, 2: 8, 1: 22 } },
  { id: 'lac_ha', name: 'Lạc Hà phái', regionId: 'lac_ha', alignment: 'righteous', minRootTier: 1, servants: false, recruitEveryYears: 6, techniqueGrade: 1, roster: { 3: 1, 2: 2, 1: 8 } },
  { id: 'huyet_sat', name: 'Huyết Sát môn', regionId: 'huyet_sat', alignment: 'evil', minRootTier: 1, servants: false, recruitEveryYears: 4, techniqueGrade: 2, roster: { 4: 1, 3: 2, 2: 6, 1: 14 } },
  { id: 'kiem_cac', name: 'Kiếm Các', regionId: 'kiem_cac', alignment: 'righteous', minRootTier: 2, servants: false, recruitEveryYears: 7, techniqueGrade: 2, roster: { 3: 1, 2: 2, 1: 6 } },
  { id: 'bach_thao', name: 'Bách Thảo cốc', regionId: 'bach_thao', alignment: 'righteous', minRootTier: 1, servants: true, recruitEveryYears: 6, techniqueGrade: 1, roster: { 2: 1, 1: 5 } },
  { id: 'hac_sat', name: 'Hắc Sát giáo', regionId: 'hac_sat', alignment: 'evil', minRootTier: 1, servants: false, recruitEveryYears: 5, techniqueGrade: 1, roster: { 2: 1, 1: 5 } },
  { id: 'kim_dao', name: 'Kim Đao môn', regionId: 'kim_dao', alignment: 'righteous', minRootTier: 1, servants: true, recruitEveryYears: 5, techniqueGrade: 1, roster: { 2: 1, 1: 5 } },
  { id: 'bich_thuy', name: 'Bích Thủy kiếm phái', regionId: 'bich_thuy', alignment: 'righteous', minRootTier: 1, servants: false, recruitEveryYears: 6, techniqueGrade: 1, roster: { 2: 1, 1: 5 } },
  { id: 'thien_tru_tu', name: 'Thiên Trụ tự', regionId: 'thien_tru_tu', alignment: 'righteous', minRootTier: 1, servants: true, recruitEveryYears: 5, techniqueGrade: 2, roster: { 3: 1, 2: 3, 1: 8 } },
  { id: 'thai_huyen', name: 'Thái Huyền quán', regionId: 'thai_huyen', alignment: 'righteous', minRootTier: 2, servants: false, recruitEveryYears: 6, techniqueGrade: 2, roster: { 3: 1, 2: 2, 1: 6 } },
  { id: 'hanh_khat', name: 'Hành Khất bang', regionId: 'tong_da', alignment: 'righteous', minRootTier: 1, servants: true, recruitEveryYears: 4, techniqueGrade: 1, roster: { 3: 1, 2: 2, 1: 8 } },
  { id: 'van_ma', name: 'Thiên Ma giáo', regionId: 'van_ma', alignment: 'evil', minRootTier: 1, servants: false, recruitEveryYears: 4, techniqueGrade: 2, roster: { 4: 1, 3: 2, 2: 4, 1: 10 } },
  { id: 'van_yeu', name: 'Huyết Cổ giáo', regionId: 'van_yeu_dinh', alignment: 'evil', minRootTier: 1, servants: false, recruitEveryYears: 5, techniqueGrade: 2, roster: { 3: 2, 2: 4, 1: 10 } },
];

/** What a sect is known for: actions its members favour, and a discount on pills. */
export const SECT_PERKS: Record<string, { actionBoost?: Record<string, number>; pillDiscount?: number }> = {
  kiem_cac: { actionBoost: { ngo_kiem: 3, khieu_chien: 1.5 } },
  bach_thao: { actionBoost: { hanh_y: 3, doi_dan: 1.5, hoc_dan: 10, luyen_dan: 1.5, hai_duoc: 1.5 }, pillDiscount: 0.5 },
  hac_sat: { actionBoost: { cuop_doat: 1.8 } },
  van_ma: { actionBoost: { cuop_doat: 1.5, be_quan: 1.2 } },
  kim_dao: { actionBoost: { khieu_chien: 2, tong_quan: 1.5 } },
  bich_thuy: { actionBoost: { khieu_chien: 1.5, phieu_bat: 2 } },
  thien_tru_tu: { actionBoost: { be_quan: 1.4, hanh_y: 1.5 } },
  thai_huyen: { actionBoost: { be_quan: 1.6, chuan_bi: 1.5 } },
  hanh_khat: { actionBoost: { phieu_bat: 2, du_ngoan: 1.4, nhiem_vu: 1.3 } },
  van_yeu: { actionBoost: { hai_duoc: 2, cuop_doat: 1.3 } },
};

/** Starting stance between sects, −100 (blood feud) … 100 (allies). */
export const SECT_RELATIONS: [string, string, number][] = [
  ['thanh_van', 'huyet_sat', -55],
  ['lac_ha', 'huyet_sat', -25],
  ['thanh_van', 'lac_ha', 20],
  ['thanh_van', 'kiem_cac', 40],
  ['kiem_cac', 'huyet_sat', -45],
  ['lac_ha', 'bach_thao', 50],
  ['lac_ha', 'hac_sat', -50],
  ['bach_thao', 'hac_sat', -30],
  ['huyet_sat', 'van_ma', 30],
  ['huyet_sat', 'van_yeu', -40],
  ['thanh_van', 'van_yeu', -50],
  ['van_ma', 'van_yeu', -30],
  ['kim_dao', 'hac_sat', -45],
  ['kim_dao', 'bich_thuy', -15],
  ['bich_thuy', 'lac_ha', 30],
  ['bich_thuy', 'bach_thao', 25],
  ['thien_tru_tu', 'thai_huyen', 40],
  ['thien_tru_tu', 'hanh_khat', 30],
  ['thien_tru_tu', 'hac_sat', -50],
  ['thai_huyen', 'bich_thuy', 30],
  ['hanh_khat', 'hac_sat', -40],
  ['hanh_khat', 'kim_dao', 20],
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
