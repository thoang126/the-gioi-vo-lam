# Lộ trình hoàn thiện Vạn Kiếp Thiên Hạ

Ngày 2026-10-18. Mọi con số đo bằng `npm run analyze -- --worlds 30 --years 400`: người chơi chọn ngẫu nhiên ở mọi ngã rẽ,
sát với người chơi thật hơn chế độ tự quyết.

## "Hoàn thiện" nghĩa là gì

Bản 1.0 là một game web một người chơi, chơi được trọn vẹn và đáng chơi lại:

1. **Mỗi kiếp là một câu chuyện ngắn:** 3–10 phút, có vài quyết định thật sự đổi hướng đời.
2. **Linh hồn có mục tiêu dài hạn:** sưu tầm, danh hiệu, kết thúc đặc biệt (phi thăng), lý do để đầu thai thêm lần nữa.
3. **Thế giới đáng quan sát:** tông môn thịnh suy, người cũ sống tiếp, tiền kiếp để lại dấu vết.
4. **Trình bày đủ đẹp để khoe:** bia mộ chia sẻ được, hiệu ứng cho khoảnh khắc lớn, chạy tốt trên điện thoại.
5. **Không mất dữ liệu:** nhiều ô lưu, xuất và nhập file lưu, chạy offline.

## Chỉ số theo dõi

| Chỉ số | Trước giai đoạn 1 | Sau giai đoạn 1 | Mục tiêu 1.0 |
|---|---|---|---|
| Kiếp nằm trong 3–10 phút | 43% | 46% | ≥ 60% |
| Lựa chọn mỗi kiếp | 27,9 | 19,8 | 8–15 |
| Lựa chọn chỉ là "làm gì tiếp" | 63% | 50% | ≤ 35% |
| Khoảng cách giữa hai lựa chọn (p50) | 1,1 năm | 1,9 năm | ≥ 3 năm |
| Chết trước 12 tuổi | 7,5% | 10,5% | ≤ 8% |
| Chết già | 1,9% | 21,1% | 15–30% |
| Chết do chiến tranh | 17,0% | 9,2% | ≤ 10% |
| Kiếp gặp lại tiền kiếp | 49% | 59% | ≥ 50% |
| Câu lặp nguyên văn trong kiếp | 0,7% | 0,3% | < 5% |
| Tới Luyện Khí / Trúc Cơ / Kim Đan | 41 / 16 / 4,7% | 34 / 7,2 / 0,7% | 35 / 10 / 2% |
| Tới Nguyên Anh (mọi kiếp của một linh hồn) | 0 | 0 | có đường đi, dù hiếm |

Giai đoạn 1 có một cái giá: tỉ lệ lên Trúc Cơ và Kim Đan giảm, vì nhân vật không còn được hỏi liên tục để chọn việc tối ưu.
Giai đoạn 3 xử lý phần này bằng ngã rẽ đột phá đúng nghĩa và sự nghiệp trong tông môn.

## Giai đoạn

### 1. Nhịp và lựa chọn (đã xong)

- Lựa chọn hành động thành "nếp sống": chỉ hỏi lại khi hoàn cảnh đổi (cảnh giới, tông môn, chức vị, thế giới, có công pháp,
  đủ tu vi đột phá, bị thương) hoặc sau 5 năm.
- Cân bằng cái chết của người chơi:
  - Tòng quân: 10% → 5%.
  - Trưng binh: 20% → 8%.
  - Dịch bệnh: 10% → 5%.
  - Sơn tặc: gặp 12% → 6%, bị giết khi gặp 25% → 10%.
  - Chạm trán chính tà: 30% → 20%.
- Tử suất người phàm giãn ra, tuổi thọ trung vị khoảng 60; trẻ em chịu 40% rủi ro trong thú triều và dịch bệnh.
- Công cụ `npm run analyze` để đo mọi thay đổi sau này.

### 2. Mục tiêu của linh hồn (đã xong)

- **Kiếp Sách:** album các linh căn, thể chất, đạo đồ, danh hiệu, cách chết đã gặp (GDD Luân Hồi Vạn Kiếp mục 9).
- **Danh hiệu linh hồn:** "Mười kiếp phàm nhân", "Đồ đệ ba đời", "Tự tay dựng mộ mình"…, thưởng Luân Hồi Điểm.
- **Vạn Cổ Bia:** bảng xếp hạng Đạo Quả của các kiếp trong máy.
- **Thêm ký ức tiền kiếp:** "Lục đạo thị giác" (thấy tỉ lệ thành công), "Ấn khố".
- **Kết thúc lớn:** phi thăng khép lại một linh hồn bằng màn tổng kết; có thể bắt đầu linh hồn mới trong cùng thế giới.
- Đạt khi: người chơi luôn thấy mục tiêu kế tiếp, trong tab Kiếp Sách.
- Đã làm:
  - 41 danh hiệu cuối đời của Luân Hồi Vạn Kiếp (`titles.yaml`), tối đa 3 mỗi kiếp, hiện trên bia mộ. Các cơ chế thế giới
    (vượt biển, võ lâm đại hội, khoa cử, tòng quân, thu đồ đệ, giết kình địch) bật đúng cờ để danh hiệu nhận ra.
  - Kiếp Sách 112 mục trong 8 nhóm; 19 danh hiệu linh hồn cộng Luân Hồi Điểm; 3 mục tiêu gần xong nhất luôn hiện ở đầu tab.
  - Vạn Cổ Bia: 20 kiếp có Đạo Quả cao nhất trên máy, giữ qua mọi thế giới.
  - Ký ức "Lục đạo thị giác" (200 điểm): hiện tỉ lệ thành công của lựa chọn có phép thử.
  - Phi thăng mở lựa chọn khép lại linh hồn và bắt đầu linh hồn mới trong cùng thế giới.
  - `migrateWorld` nâng cấp bản lưu cũ, dựng lại Kiếp Sách từ hồ sơ các kiếp.
- Chưa làm: ký ức "Ấn khố" (cần Hồn ấn ở giai đoạn 3).

### 3. Chiều sâu tu tiên (đã xong)

- **Ngã rẽ đột phá đúng GDD 4.3:** đột phá ngay, bế quan chuẩn bị thêm (+5% mỗi 10 năm), hoặc dùng đan; hiện rõ rủi ro.
- **Sự nghiệp tông môn:** khảo hạch nội môn, tranh ghế trưởng lão, ứng cử chưởng môn, phản tông.
- **Battle Hồn ấn:** chuyển engine battle của Luân Hồi Vạn Kiếp (ngũ hành, trạng thái, chiến thuật). Dùng cho kình địch,
  sinh tử chiến và đấu với Hồn ấn các kiếp trước; có phát lại từng lượt.
- **Thêm event cho tu sĩ:** Trúc Cơ trở lên hiện ít event riêng.
- Đạt khi: Trúc Cơ ≥ 10%, Kim Đan ≥ 2%, có kiếp tới Nguyên Anh trong 1.000 kiếp.
- Đã làm:
  - **Ngã rẽ đột phá:** đột phá ngay, uống đan (Trúc Cơ đan… hoặc đan thường), bế quan chuẩn bị 10 năm (+5%, tối đa 4 lần,
    chỉ khi cơ hội còn dưới 70% và không vượt thọ nguyên), hoặc chưa vội (hỏi lại sau 5 năm). Lục đạo thị giác hiện tỉ lệ.
    NPC cũng biết bế quan chuẩn bị.
  - **Sự nghiệp tông môn:** khảo hạch nội môn (thắng một trận trên đài), tranh chức chưởng môn khi chưởng môn mất,
    đổi điểm cống hiến lấy đan ở Tàng Bảo các.
  - **Battle Hồn ấn:** engine battle của Luân Hồi Vạn Kiếp (`simulate.ts`, `stats.ts`, `narration.ts`) chép nguyên, chỉ đổi
    import, qua một lớp nối `battle-engine/content.ts`. Mọi trận có tên tuổi trong thế giới (kình địch, chạm trán chính tà,
    chiến tranh tông môn, khảo hạch, tranh chức, phép thử `battle` của event) giờ đánh bằng engine thật; NPC chọn chiến thuật
    theo tâm tính.
  - **Tab Luận Kiếm:** chọn chiến thuật, xem lại 12 trận gần nhất từng hiệp, Hồn ấn của mỗi kiếp (Ấn khố giữ 5–10) đấu
    với cao thủ cùng cảnh giới hoặc với Hồn ấn khác.
  - Chiến tranh tông môn bớt đẫm máu (tỉ lệ chết 35% → 20%, người ra trận chọn trong 8 người mạnh nhất).
- Đo sau giai đoạn (40 thế giới × 400 năm, chọn ngẫu nhiên): Luyện Khí 33%, Trúc Cơ 12%, Kim Đan 2,0%. Chưa có kiếp
  Nguyên Anh; cần mẫu lớn hơn để biết tỉ lệ thật.

### 4. Mở rộng thế giới (phần lớn đã xong)

Đã làm:
- **Sáu cõi trên bản đồ:** Đại Hạ, Thanh Vân châu, Hải ngoại (3 đảo, đường biển), Ma vực (Huyết Uyên thành, Vạn Ma tông,
  Bạch Cốt lâm), Yêu vực (Yêu thị, Hóa Hình thôn, Vạn Yêu đình, Thái Cổ lâm), Tiên giới (bản đồ riêng). Hệ số của
  `worlds.yaml` được dùng thật: Hải ngoại kỳ ngộ và tai họa ×1,5, Ma vực tẩu hỏa ×1,5.
- **Yêu tộc:** 90% người sinh ở Yêu vực là yêu tộc, họ riêng (Bạch Hồ, Thanh Xà, Kim Bằng…), thọ nguyên ×1,5.
  Nhân tộc và yêu tộc có tu vi gặp nhau dễ động thủ; Vạn Yêu đình chỉ nhận yêu tộc, tông môn nhân tộc không nhận yêu
  (trừ ma môn).
- **Thiên phú, khuyết tật:** 24 mục của `traits.yaml` (0/1/2 mục theo 40/40/20%), có chỉ số, modifier, cờ khởi đầu;
  "Thiên cơ thuật" cho thấy tỉ lệ như Lục đạo thị giác.
- **Gia tộc, thế gia** (`src/clans.ts`): 11 thế gia khởi đầu (Hạ thị hoàng tộc, Mộ Dung, Thượng Quan, Đông Phương,
  Lâm, Diệp, Tiêu, Hàn, Mạc, Thanh Khâu Hồ tộc, Kim Bằng tộc). Con theo họ và gia tộc của cha (hoặc mẹ), gia truyền công
  pháp, kế vị gia chủ (người chơi có thể tranh chức, tranh ngôi), huyết thù đánh nhau, thông gia, gia tộc cưới vợ gả
  chồng cho con cháu, nhận con nuôi khi thưa người, tuyệt tự. Tu sĩ Kim Đan có con cháu có thể khai tông lập tộc
  (tối đa 16 gia tộc cùng lúc). Tab "Thế gia", 4 danh hiệu linh hồn mới, Kiếp Sách thêm "Thiên phú" và "Thế gia".
- **Tông môn mới:** Kiếm Các, Bách Thảo cốc, Hắc Sát giáo, Vạn Ma tông, Vạn Yêu đình, có ưu đãi hành động riêng.
- **Event:** 18 event mới cho Hải ngoại, Ma vực, Yêu vực và đời sống thế gia; 8 event của Luân Hồi Vạn Kiếp vốn chỉ
  hợp Đại Hạ/Thanh Vân bị giới hạn lại.
- **Tiên giới (bước đầu):** người phi thăng không biến mất mà sống tiếp ở Tiên giới; thế giới có sẵn vài tiên nhân.

- **Đại Hạ rộng lớn kiểu võ hiệp:** Đại Hạ vẽ to gấp 1,6 lần, chia 6 châu quận (Kinh kỳ, Yên Bắc, Lũng Tây, Đông Hải,
  Giang Nam, Lĩnh Nam). Kinh thành trăm vạn dân (vẽ vòng thành), phủ thành Yên Bắc, Lũng Tây, Lâm An; Long Môn khách
  điếm, Trung Nguyên trấn, Vân Mộng sơn, Hoàng lăng, Thủy trại Bạch Lãng, Vạn Độc lĩnh; môn phái Kim Đao môn và Bích
  Thủy kiếm phái. Thêm Vạn Tiên thành, Loạn Thạch hạp, Bồng Lai đảo, U Minh hà, Nguyệt Hồ. Tổng cộng 74 địa danh.
- **Triều đại** (`src/dynasty.ts`): nguy cơ sụp đổ tăng theo tuổi triều (Weibull), nặng hơn khi vua nhỏ tuổi, hoàng tộc
  thưa người hay có thế gia mạnh át. Lý do đổi chủ: quyền thần soán ngôi, khởi nghĩa nông dân, ngoại xâm, tu sĩ dựng
  vua bù nhìn, thiện nhượng, tuyệt tự, phục quốc. Hoàng tộc cũ thành "tiền triều" (bị thanh trừng một phần, mang huyết
  thù với tân triều, có thể phục quốc). Người chơi trong hoàng tộc cũ được chọn trốn hay tử thủ; người ngoài được mời
  theo tân triều làm khai quốc công thần. Đo 6 thế giới × 2.000 năm: triều đại trung bình 317 năm, trung vị 295,
  10% ngắn nhất dưới 172 năm.

Còn lại:
- Gặp lại tiền kiếp giảm từ 43% xuống 26% vì thế giới rộng và đông hơn (~590 người); cần cho linh hồn đầu thai gần
  nơi có người cũ hơn.
- Chơi tiếp ở Tiên giới: 9 cảnh giới tiên và 36 event Tiên giới của Luân Hồi Vạn Kiếp.
- Tin tức người quen (`people.yaml`).
- Đo sau giai đoạn (20 thế giới × 400 năm, chọn ngẫu nhiên): Luyện Khí 38,5%, Trúc Cơ 12,5%, Kim Đan 1,0%; dân số
  ổn định quanh 380 người, thế gia giữ 110–130 người.

### 5. Trình bày (2 tuần)

- **Bia mộ:** xuất ảnh để chia sẻ (canvas sang PNG), kèm "hiếm hơn X% kiếp khác".
- **Hiệu ứng:** mực loang khi đột phá, sấm khi độ kiếp, rung khi được roll hiếm.
- **Âm thanh:** đàn cổ cầm nền, chuông, sấm; có nút tắt.
- **Kiếp đầu hướng dẫn:** gợi ý từng phần giao diện ở ngã rẽ đầu tiên.
- **Giao diện bia mộ và biên niên theo ADR-0008:** nét cọ, triện son.

### 6. Phát hành (1–2 tuần)

- **Lưu game:** nhiều ô lưu, xuất và nhập file, cảnh báo khi trình duyệt chặn bộ nhớ.
- **PWA:** cài lên màn hình chính, chạy offline.
- **Kiểm thử:** thử trên điện thoại thật, đo hiệu năng khi thế giới đã chạy 2.000 năm.
- **Kênh phát hành:** itch.io hoặc GitHub Pages. Telegram Mini App theo GDD gốc là một dự án riêng sau 1.0, vì cần server
  làm trọng tài.

## Cách làm việc

- Mỗi thay đổi luật chơi đi kèm một lần chạy `npm run analyze`, và cập nhật bảng chỉ số ở trên.
- `npm test` phải xanh trước mỗi commit; test tái lập theo seed là bất biến.
- Sau mỗi giai đoạn: build, cập nhật bản chơi thử, ghi lại thay đổi luật chơi trong `README.md`.
