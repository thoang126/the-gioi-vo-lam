// Story events for the worlds Luân Hồi Vạn Kiếp has no events of its own for (Hải ngoại, Ma vực,
// Yêu vực) and for clan life. Same format and DSL as the imported LHVK events.
import type { StoryEvent } from './lhvk';

const E = (e: Omit<StoryEvent, 'file'>): StoryEvent => ({ ...e, file: 'events-extra.ts' });

export const EXTRA_EVENTS: StoryEvent[] = [
  // ---- Hải ngoại -------------------------------------------------------------------------
  E({
    id: 'x_sea_pearl', title: 'Ngọc trai đêm rằm', kind: 'fortune', rarity: 'common', weight: 10, cooldown_years: 15,
    conditions: { world: ['overseas'], age: [10, 999] },
    text: '{opener} thủy triều rút sâu bất thường. Dưới rạn san hô, một con trai khổng lồ hé miệng, ánh ngọc xanh lấp lánh.',
    choices: [
      { id: 'dive', label: 'Lặn xuống lấy ngọc', tags: ['bold'], check: { stat: 'can_cot', difficulty: 50 },
        success: { linh_thach: 120, stat: { khi_van: 2 }, text: 'Ngươi nín thở cạy được viên ngọc trước khi vỏ trai khép lại. Bán ở Tán Tu đảo được giá hời.' },
        fail: { injury: true, text: 'Vỏ trai sập xuống kẹp chân. Ngươi giãy được lên bờ, máu loang cả một vùng nước.' } },
      { id: 'leave', label: 'Đứng nhìn rồi đi', tags: ['cautious'], effects: { stat: { tam_tinh: 1 }, text: 'Ngươi nhớ lời người già: thứ gì biển cho không, biển sẽ đòi lại.' } },
    ],
  }),
  E({
    id: 'x_sea_storm', title: 'Bão biển', kind: 'calamity', rarity: 'common', weight: 10, cooldown_years: 10,
    conditions: { world: ['overseas'], age: [12, 999] },
    text: '{opener} mây đen kéo tới từ phía Hải Nhãn. Sóng cao hơn nóc nhà, gió thổi bạt cả mái tranh.',
    check: { stat: 'can_cot', difficulty: 45 },
    success: { stat: { can_cot: 1 }, text: 'Ngươi bám chặt cột nhà suốt một đêm. Sáng ra cả làng còn nguyên, chỉ mất mấy chiếc thuyền.' },
    fail: { injury: true, linh_thach: -30, text: 'Sóng cuốn trôi nửa gia sản. Ngươi bị đá ngầm cứa nát lưng, nằm liệt mấy tháng.' },
  }),
  E({
    id: 'x_sea_hermit', title: 'Tán tu trên đảo hoang', kind: 'crossroad', rarity: 'uncommon', weight: 6, once_per_life: true,
    conditions: { world: ['overseas'], age: [14, 120], has_flag_not: ['sea_hermit'] },
    text: '{opener} trên một đảo hoang, ngươi gặp lão tán tu râu tóc bạc trắng câu cá bằng sợi chỉ không lưỡi. Lão nói đã đợi ngươi ba năm.',
    choices: [
      { id: 'learn', label: 'Ở lại học đạo', tags: ['bold'], effects: { add_flag: 'sea_hermit', technique_from: { grade_min: 'hoang', grade_max: 'huyen' }, tu_vi_years: 5, text: 'Lão dạy ngươi nghe nhịp thủy triều mà vận khí. Ba năm sau lão biến mất, chỉ để lại một cuốn công pháp.' } },
      { id: 'doubt', label: 'Nghi ngờ, bỏ đi', tags: ['cautious'], effects: { add_flag: 'sea_hermit', stat: { tam_tinh: 1 }, text: 'Ngươi chèo thuyền đi. Ngoảnh lại, hòn đảo đã chìm vào sương.' } },
    ],
  }),
  E({
    id: 'x_sea_floating_isle', title: 'Phù Du đảo trôi qua', kind: 'fortune', rarity: 'rare', weight: 3, once_per_life: true,
    conditions: { world: ['overseas'], cultivator: true },
    text: '{opener} Phù Du đảo trôi qua gần chỗ ngươi ở. Linh khí dồn tới như sóng thủy triều.',
    effects: { tu_vi_years: 10, stat: { ngo_tinh: 2 }, text: 'Ngươi nhảy lên đảo ngồi thiền bảy ngày bảy đêm. Lúc đảo trôi đi, kinh mạch đã thông thêm mấy chỗ.' },
  }),
  E({
    id: 'x_sea_pirates', title: 'Hải tặc', kind: 'calamity', rarity: 'common', weight: 8, cooldown_years: 15,
    conditions: { world: ['overseas'], age: [14, 999] },
    text: '{opener} cánh buồm đen xuất hiện ở chân trời. Hải tặc cập bến, đòi mỗi nhà nộp một nửa gia sản.',
    choices: [
      { id: 'fight', label: 'Cầm đao chống lại', tags: ['bold', 'righteous'], check: { battle: { opponent: 'bot', tactic: 'cuong_manh', offset: [-2, 1] } },
        success: { stat: { tam_tinh: 2 }, linh_thach: 60, add_flag: 'pirate_slayer', text: 'Ngươi chém gãy cột buồm, hải tặc tháo chạy. Dân đảo góp tiền tạ ơn.' },
        fail: { injury: true, linh_thach: -50, text: 'Ngươi bị đánh ngã. Chúng lấy sạch rồi đi, để lại ngươi giữa bãi cát.' } },
      { id: 'pay', label: 'Nộp tiền cho yên', tags: ['cautious'], effects: { linh_thach: -40, text: 'Ngươi nộp tiền. Chúng cười hô hố rồi kéo sang nhà khác.' } },
    ],
  }),

  // ---- Ma vực ----------------------------------------------------------------------------
  E({
    id: 'x_demon_blood_market', title: 'Chợ huyết', kind: 'crossroad', rarity: 'common', weight: 8, cooldown_years: 20,
    conditions: { world: ['demonic'], age: [14, 999] },
    text: '{opener} ở chợ Huyết Uyên thành có kẻ rao bán một bình máu yêu thú còn ấm. Uống vào tăng tu vi, nhưng nghe nói nhiều kẻ phát cuồng.',
    choices: [
      { id: 'drink', label: 'Mua và uống', tags: ['bold', 'selfish'], check: { stat: 'tam_tinh', difficulty: 50 },
        success: { tu_vi_years: 8, linh_thach: -40, text: 'Dòng máu nóng chảy khắp kinh mạch. Ngươi nghiến răng chịu đựng, tỉnh dậy thấy tu vi tăng vọt.' },
        fail: { linh_thach: -40, stat: { tam_tinh: -4 }, injury: true, text: 'Máu yêu xông lên não. Ngươi gầm như thú suốt ba ngày, tỉnh lại thấy hai tay đầy vết cào.' } },
      { id: 'pass', label: 'Bỏ qua', tags: ['cautious'], effects: { text: 'Ngươi rảo bước qua quầy hàng. Sau lưng có tiếng cười khàn khàn.' } },
    ],
  }),
  E({
    id: 'x_demon_heart_whisper', title: 'Tiếng thì thầm của ma khí', kind: 'calamity', rarity: 'common', weight: 10, cooldown_years: 15,
    conditions: { world: ['demonic'], cultivator: true },
    text: '{opener} ma khí ở Ma vực dày đặc. Đêm nào nhập định ngươi cũng nghe tiếng ai gọi từ dưới đất.',
    check: { stat: 'tam_tinh', difficulty: 55 },
    success: { stat: { tam_tinh: 3 }, text: 'Ngươi coi tiếng gọi như gió thổi qua tai. Đạo tâm vững thêm một tầng.' },
    fail: { tu_vi_stage: -0.5, stat: { tam_tinh: -3 }, text: 'Ngươi lỡ đáp lời. Ma khí tràn vào đan điền, tu vi tụt một quãng.' },
  }),
  E({
    id: 'x_demon_duel_pit', title: 'Đấu trường sinh tử', kind: 'crossroad', rarity: 'uncommon', weight: 6, cooldown_years: 25,
    conditions: { world: ['demonic'], age: [16, 999], cultivator: true },
    text: '{opener} Huyết Uyên thành mở đấu trường. Kẻ thắng mười trận được Vạn Ma tông thu nhận, kẻ thua thường không còn xác.',
    choices: [
      { id: 'enter', label: 'Bước xuống đấu trường', tags: ['bold'], check: { battle: { opponent: 'bot', tactic: 'lieu_mang', offset: [-1, 1] } },
        success: { linh_thach: 150, stat: { can_cot: 2 }, add_flag: 'pit_champion', text: 'Ngươi đứng giữa đấu trường, máu không phải của mình chảy thành vũng. Khán đài gào tên ngươi.' },
        fail: { injury: true, stat: { tam_tinh: -2 }, text: 'Ngươi bị ném ra khỏi đấu trường, gãy ba cái xương sườn. Ít ra còn sống.' } },
      { id: 'watch', label: 'Chỉ đứng xem', tags: ['cautious'], effects: { stat: { ngo_tinh: 1 }, text: 'Ngươi xem hết mười trận, nhớ được vài chiêu hiểm.' } },
    ],
  }),
  E({
    id: 'x_demon_redeem', title: 'Người phàm bị bắt làm dược nhân', kind: 'crossroad', rarity: 'uncommon', weight: 5, once_per_life: true,
    conditions: { world: ['demonic'], age: [16, 999] },
    text: '{opener} ngươi thấy một toán ma tu áp giải mấy chục người phàm về luyện dược nhân. Một đứa bé nhìn ngươi cầu cứu.',
    choices: [
      { id: 'save', label: 'Ra tay cứu người', tags: ['righteous', 'bold'], check: { battle: { opponent: 'bot', tactic: 'quy_quyet', offset: [-1, 1] } },
        success: { stat: { tam_tinh: 4, khi_van: 2 }, add_flag: 'saved_captives', text: 'Ngươi giết tên cầm đầu, cởi trói cho mọi người. Họ quỳ lạy rồi chạy về phía Âm Phong trấn.' },
        fail: { injury: true, text: 'Ngươi bị đánh trọng thương, phải bỏ chạy. Tiếng khóc đứa bé đeo theo ngươi nhiều năm.' } },
      { id: 'look_away', label: 'Quay đi', tags: ['cautious', 'selfish'], effects: { stat: { tam_tinh: -3 }, text: 'Ngươi quay đi. Ở Ma vực, kẻ thương người thường chết trước.' } },
    ],
  }),
  E({
    id: 'x_demon_bone_relic', title: 'Di cốt trong Bạch Cốt lâm', kind: 'fortune', rarity: 'rare', weight: 3, once_per_life: true,
    conditions: { world: ['demonic'], cultivator: true },
    text: '{opener} giữa Bạch Cốt lâm có một bộ xương ngồi xếp bằng, tay còn nắm chặt một món binh khí.',
    check: { stat: 'khi_van', difficulty: 50 },
    success: { artifact: 'huyet_anh_kiem', text: 'Ngươi vái ba vái. Bàn tay xương buông ra, Huyết Ảnh kiếm rơi vào tay ngươi.' },
    fail: { injury: true, text: 'Bộ xương bỗng đứng dậy. Ngươi chạy thục mạng, lưng hằn ba vết cào.' },
  }),

  // ---- Yêu vực ---------------------------------------------------------------------------
  E({
    id: 'x_yeu_moon', title: 'Bái nguyệt', kind: 'fortune', rarity: 'common', weight: 10, cooldown_years: 12,
    conditions: { world: ['demon_beast'], age: [10, 999] },
    text: '{opener} đêm trăng tròn, yêu tộc khắp Yêu vực leo lên đỉnh núi hấp thu nguyệt hoa.',
    effects: { tu_vi_years: 3, stat: { mi_luc: 1 }, text: 'Ánh trăng lạnh tràn vào người, ngươi thấy thân thể nhẹ đi một chút.' },
  }),
  E({
    id: 'x_yeu_human_hunter', title: 'Thợ săn yêu', kind: 'calamity', rarity: 'common', weight: 8, cooldown_years: 15,
    conditions: { world: ['demon_beast'], age: [12, 999] },
    text: '{opener} một toán tu sĩ nhân tộc vượt biên giới vào Yêu vực săn yêu đan.',
    choices: [
      { id: 'fight', label: 'Chống lại', tags: ['bold'], check: { battle: { opponent: 'bot', tactic: 'cuong_manh', offset: [-1, 1] } },
        success: { stat: { can_cot: 2 }, add_flag: 'hunter_slayer', text: 'Ngươi xé nát lưới trói yêu, bọn chúng bỏ lại cả cung tên mà chạy.' },
        fail: { injury: true, text: 'Một mũi tên bạc xuyên vai. Ngươi trốn vào Thái Cổ lâm liếm vết thương.' } },
      { id: 'hide', label: 'Trốn vào rừng sâu', tags: ['cautious'], effects: { stat: { tam_tinh: 1 }, text: 'Ngươi nằm im dưới gốc cây cổ thụ suốt ba ngày cho tới khi tiếng chân xa dần.' } },
    ],
  }),
  E({
    id: 'x_yeu_court', title: 'Vạn Yêu đình triệu kiến', kind: 'crossroad', rarity: 'uncommon', weight: 5, once_per_life: true,
    conditions: { world: ['demon_beast'], cultivator: true, age: [16, 999] },
    text: '{opener} sứ giả Vạn Yêu đình mang thiệp triệu ngươi tới dự yến dưới gốc cổ thụ nghìn năm.',
    choices: [
      { id: 'go', label: 'Tới dự yến', tags: ['bold'], check: { stat: 'mi_luc', difficulty: 50 },
        success: { linh_thach: 100, stat: { khi_van: 2 }, add_flag: 'yeu_court_favor', text: 'Yêu vương nâng chén với ngươi. Từ nay ở Yêu vực ai cũng nể mặt ngươi ba phần.' },
        fail: { stat: { tam_tinh: -2 }, text: 'Ngươi lỡ lời trước mặt yêu vương. Cả buổi yến không ai dám ngồi gần ngươi.' } },
      { id: 'refuse', label: 'Cáo bệnh không tới', tags: ['cautious'], effects: { text: 'Sứ giả nhíu mày rồi đi. Chuyện này có lẽ chưa xong.' } },
    ],
  }),
  E({
    id: 'x_yeu_ancient_beast', title: 'Hung thú Thái Cổ', kind: 'calamity', rarity: 'rare', weight: 3, cooldown_years: 50,
    conditions: { world: ['demon_beast'], cultivator: true },
    text: '{opener} một con {beast} từ Thái Cổ lâm thức giấc, quét qua cả vùng.',
    check: { battle: { opponent: 'bot', tactic: 'cuong_manh', offset: [1, 3] } },
    success: { tu_vi_years: 8, linh_thach: 200, text: 'Ngươi hạ được hung thú, moi yêu đan to bằng nắm tay.' },
    fail: { injury: true, text: 'Ngươi bị hất văng vào vách núi. Lúc tỉnh lại, hung thú đã đi xa.' },
  }),
  E({
    id: 'x_yeu_shed_skin', title: 'Thoát xác', kind: 'daily', rarity: 'common', weight: 8, cooldown_years: 30,
    conditions: { world: ['demon_beast'], cultivator: true },
    text: '{opener} lớp da cũ bong ra từng mảng, ngươi đau đớn suốt bảy ngày.',
    check: { stat: 'can_cot', difficulty: 45 },
    success: { lifespan: 5, stat: { can_cot: 2 }, text: 'Lớp da mới cứng như giáp. Thọ nguyên dài thêm một ít.' },
    fail: { stat: { can_cot: -1 }, text: 'Lần thoát xác này không trọn, để lại mấy vệt sẹo.' },
  }),

  // ---- Thế gia ---------------------------------------------------------------------------
  E({
    id: 'x_clan_ancestral_hall', title: 'Tế tổ', kind: 'daily', rarity: 'common', weight: 8, cooldown_years: 10,
    conditions: { has_flag: ['in_clan'], age: [8, 999] },
    text: '{opener} cả tộc tụ về từ đường tế tổ. Gia chủ đọc tên từng đời tổ tiên.',
    effects: { stat: { tam_tinh: 1 }, text: 'Đứng giữa khói hương, ngươi thấy mình là một mắt xích trong sợi dây rất dài.' },
  }),
  E({
    id: 'x_clan_heir_rivalry', title: 'Tranh đích', kind: 'crossroad', rarity: 'uncommon', weight: 5, once_per_life: true,
    conditions: { has_flag: ['in_clan'], age: [16, 60] },
    text: '{opener} trong tộc chia hai phe, kẻ muốn đưa ngươi lên làm người nối dõi, kẻ ủng hộ một người anh em họ.',
    choices: [
      { id: 'compete', label: 'Tranh tới cùng', tags: ['bold', 'selfish'], check: { stat: 'mi_luc', difficulty: 50 },
        success: { stat: { tam_tinh: -1 }, linh_thach: 100, add_flag: 'clan_heir', text: 'Ngươi kéo được các trưởng lão về phe mình. Người anh em họ cười gượng chúc mừng.' },
        fail: { stat: { tam_tinh: -2 }, text: 'Ngươi thua. Từ đó trong tộc có người nhìn ngươi bằng nửa con mắt.' } },
      { id: 'yield', label: 'Nhường lại', tags: ['cautious', 'righteous'], effects: { stat: { tam_tinh: 3 }, text: 'Ngươi nhường. Đêm đó người anh em họ tới tìm, rót cho ngươi một chén rượu.' } },
    ],
  }),
  E({
    id: 'x_clan_treasury', title: 'Bảo khố gia tộc', kind: 'fortune', rarity: 'uncommon', weight: 4, once_per_life: true,
    conditions: { has_flag: ['in_clan'], age: [14, 999] },
    text: '{opener} gia chủ mở bảo khố, ban thưởng cho con cháu có công.',
    check: { stat: 'khi_van', difficulty: 45 },
    success: { item: 'hoi_xuan_dan', linh_thach: 80, text: 'Ngươi được chọn trong số ít người, nhận một viên Hồi Xuân đan và một túi linh thạch.' },
    fail: { linh_thach: 10, text: 'Đến lượt ngươi chỉ còn mấy khối linh thạch vụn.' },
  }),
];
