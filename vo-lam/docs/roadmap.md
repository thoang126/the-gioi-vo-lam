# Lộ trình Vạn Kiếp Giang Hồ

Bản võ hiệp tách ra từ Vạn Kiếp Thiên Hạ ngày 2026-10-18, sau giai đoạn đan đạo. Lộ trình của bản tu tiên (định nghĩa
bản 1.0, các giai đoạn trình bày và phát hành) nằm ở `../game/docs/roadmap.md` và vẫn áp dụng cho bản này.

## Đã làm khi tách bản

- Cảnh giới võ học theo thang Hậu thiên → Tiên thiên → Tông sư → Đại tông sư → Thiên nhân hợp nhất → phá toái hư không;
  tam lưu … tuyệt đỉnh, bán thánh là danh xưng giang hồ. Tư chất thay linh căn, nội công thay công pháp; không thiên kiếp.
- 59 võ công có môn loại và phẩm; 13 môn phái (3 mới: Thiên Trụ tự, Thái Huyền quán, Hành Khất bang), mỗi phái có
  nội công và bộ võ công riêng truyền theo cấp bậc.
- Học võ công từ môn phái, sư phụ (người mới vào phái được phân sư phụ), võ quán, bí kíp.
- Nội dung Luân Hồi Vạn Kiếp đổi sang chữ võ hiệp bằng `tools/wuxia-content.ts`; giữ 212/242 event.
- Nam Cương và Cổ tộc (hư cấu) thay Yêu vực và yêu tộc; Tây Vực thay Ma vực; Thiên ngoại thay Tiên giới.

## Chỉ số

`npm run analyze -- --worlds 20 --years 400`, sau khi đổi sang thang Hậu thiên … Thiên nhân hợp nhất:

| Chỉ số | Chọn ngẫu nhiên | Chủ động luyện công |
|---|---|---|
| Tới Hậu thiên | 43% | 51% |
| Tới Tiên thiên (nhất lưu) | 13% | 12% |
| Tới Tông sư (tuyệt đỉnh) | 4,5% | 2,9% |
| Tới Đại tông sư | 0% | 0% |
| Lựa chọn mỗi kiếp (p50) | 20 | 22 |
| Kiếp 3–10 phút | 50% | 57% |
| Gặp lại tiền kiếp | 40% | 27% |

Mẫu khoảng 100 kiếp mỗi cột: chênh vài điểm giữa hai cột là nhiễu.

Bốn thế giới 300 năm (seed 7, 11, 23, 31): 22–31 Tiên thiên, 10–19 Tông sư, 4–10 Đại tông sư, 0–1 Thiên nhân hợp nhất
còn sống; 0–1 lần phá toái hư không mỗi thế giới. Chưởng môn đại phái phần lớn là Tông sư hoặc Đại tông sư. Mô phỏng 300
năm mất khoảng 6–7 giây (bản tu tiên khoảng 5 giây): 55% dân số luyện võ so với 30% có linh căn.

## Tiếp theo

1. **Thành độ võ công:** sơ học, tiểu thành, đại thành, hóa cảnh; luyện chiêu nào nhiều thì chiêu đó mạnh lên.
2. **Ngã rẽ võ học cho người chơi:** chọn võ công khi được truyền, đổi chiêu mang vào trận trong tab Luận Kiếm.
3. **Event võ hiệp riêng:** áp tiêu, đá quán, báo thù diệt môn, kết nghĩa kim lan, tranh bí kíp; thay 30 event đã bỏ.
4. **Binh khí theo môn loại:** kiếm khách cầm kiếm mới phát huy kiếm pháp.
5. **Tốc độ:** gom `living()` và chỉ mục theo vùng để bớt quét toàn dân số mỗi phase (xem phần hiệu năng của bản tu tiên).
