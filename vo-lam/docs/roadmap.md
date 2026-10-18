# Lộ trình Vạn Kiếp Giang Hồ

Bản võ hiệp tách ra từ Vạn Kiếp Thiên Hạ ngày 2026-10-18, sau giai đoạn đan đạo. Lộ trình của bản tu tiên (định nghĩa
bản 1.0, các giai đoạn trình bày và phát hành) nằm ở `../game/docs/roadmap.md` và vẫn áp dụng cho bản này.

## Đã làm khi tách bản

- Cảnh giới võ học (Người thường, Tam lưu … Võ thánh), tư chất thay linh căn, nội công thay công pháp; không thiên kiếp,
  phá toái hư không thay phi thăng.
- 59 võ công có môn loại và phẩm; 13 môn phái (3 mới: Thiên Trụ tự, Thái Huyền quán, Hành Khất bang), mỗi phái có
  nội công và bộ võ công riêng truyền theo cấp bậc.
- Học võ công từ môn phái, sư phụ (người mới vào phái được phân sư phụ), võ quán, bí kíp.
- Nội dung Luân Hồi Vạn Kiếp đổi sang chữ võ hiệp bằng `tools/wuxia-content.ts`; giữ 212/242 event.
- Nam Cương và Cổ tộc (hư cấu) thay Yêu vực và yêu tộc; Tây Vực thay Ma vực; Thiên ngoại thay Tiên giới.

## Chỉ số

`npm run analyze -- --worlds 20 --years 400`, ngày tách bản:

| Chỉ số | Chọn ngẫu nhiên | Chủ động luyện công |
|---|---|---|
| Tới Tam lưu | 55% | 51% |
| Tới Nhị lưu | 30% | 23% |
| Tới Nhất lưu | 8,9% | 10% |
| Tới Tuyệt đỉnh | 3,0% | 1,9% |
| Lựa chọn mỗi kiếp (p50) | 21 | 21 |
| Kiếp 3–10 phút | 54% | 51% |
| Gặp lại tiền kiếp | 42% | 32% |

Mẫu khoảng 100 kiếp mỗi cột: chênh vài điểm giữa hai cột là nhiễu.

Một thế giới 300 năm (seed 7) còn sống 673 người: 212 Tam lưu, 65 Nhị lưu, 22 Nhất lưu, 5 Tuyệt đỉnh, 4 Tiên thiên;
một người lên Võ thánh và phá toái hư không. Mô phỏng chậm hơn bản tu tiên khoảng 2 lần (10 so với 5 giây cho 300 năm),
vì 55% dân số luyện võ so với 30% có linh căn: nhiều người tu luyện, ra quyết định và đánh nhau hơn.

## Tiếp theo

1. **Thành độ võ công:** sơ học, tiểu thành, đại thành, hóa cảnh; luyện chiêu nào nhiều thì chiêu đó mạnh lên.
2. **Ngã rẽ võ học cho người chơi:** chọn võ công khi được truyền, đổi chiêu mang vào trận trong tab Luận Kiếm.
3. **Event võ hiệp riêng:** áp tiêu, đá quán, báo thù diệt môn, kết nghĩa kim lan, tranh bí kíp; thay 30 event đã bỏ.
4. **Binh khí theo môn loại:** kiếm khách cầm kiếm mới phát huy kiếm pháp.
5. **Tốc độ:** gom `living()` và chỉ mục theo vùng để bớt quét toàn dân số mỗi phase (xem phần hiệu năng của bản tu tiên).
