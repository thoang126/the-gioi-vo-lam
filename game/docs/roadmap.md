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

### 3. Chiều sâu tu tiên (2–3 tuần)

- **Ngã rẽ đột phá đúng GDD 4.3:** đột phá ngay, bế quan chuẩn bị thêm (+5% mỗi 10 năm), hoặc dùng đan; hiện rõ rủi ro.
- **Sự nghiệp tông môn:** khảo hạch nội môn, tranh ghế trưởng lão, ứng cử chưởng môn, phản tông.
- **Battle Hồn ấn:** chuyển engine battle của Luân Hồi Vạn Kiếp (ngũ hành, trạng thái, chiến thuật). Dùng cho kình địch,
  sinh tử chiến và đấu với Hồn ấn các kiếp trước; có phát lại từng lượt.
- **Thêm event cho tu sĩ:** Trúc Cơ trở lên hiện ít event riêng.
- Đạt khi: Trúc Cơ ≥ 10%, Kim Đan ≥ 2%, có kiếp tới Nguyên Anh trong 1.000 kiếp.

### 4. Mở rộng thế giới (3 tuần)

- **Hải ngoại tán tu đảo:** 1% số kiếp, nối với arc vượt biển Đông.
- **Yêu vực và Ma vực:** sinh làm yêu tộc hoặc ma tu, theo hệ số đã có trong dữ liệu.
- **Tiên giới:** 9 cảnh giới và 36 event còn lại của Luân Hồi Vạn Kiếp.
- Tin tức người quen (`people.yaml`) và thiên phú (`traits.yaml`).
- Thêm tông môn để mỗi đạo đồ có chỗ dựa (kiếm tu, đan sư, ma tu ở Phàm giới).

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
