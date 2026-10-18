# Rà soát giao diện (Oct 18, 2026)

Rà bằng ảnh chụp ở máy tính (1440px) và điện thoại (390px, nền tối), chơi qua ngã rẽ, bước ngoặt và một lần chết.

| # | Vấn đề | Mức | Đã sửa |
|---|---|---|---|
| 1 | Cả trang vẽ lại 4 lần/giây: dropdown tốc độ tự đóng, focus bàn phím mất, hover nháy | Lỗi | Trang là khung cố định; mỗi phần chỉ vẽ lại khi nội dung đổi |
| 2 | "Thế giới mới" xóa thế giới đang chơi ngay, không hỏi | Lỗi | Bấm hai lần trong 4 giây, nút đổi sang màu cảnh báo |
| 3 | Ngã rẽ dễ bị bỏ lỡ, chỉ nút header đổi chữ | Cao | Dòng trạng thái báo "Thế giới đang chờ ngươi", vòng tròn trên bản đồ nhấp nháy, tiêu đề tab có dấu ●, phím 1–9 để chọn |
| 4 | Tốc độ là dropdown với chữ "tháng / nhịp" khó hiểu | Trung bình | Nút bấm liền: Dừng · Chậm · Vừa · Nhanh · Rất nhanh, phím cách để dừng |
| 5 | Điện thoại: bản đồ phải cuộn ngang, Thanh Vân châu bị cắt | Cao | Chọn phạm vi Toàn cảnh / Đại Hạ / Thanh Vân châu; trên màn hẹp tự mở vùng có nhân vật |
| 6 | Cái chết (khoảnh khắc chính theo GDD) chỉ là một thẻ chữ | Cao | Bia mộ: tên, năm sinh mất, cảnh giới, kết cục, danh hiệu, đạo đồ, người thân, Đạo Quả |
| 7 | Biên niên ghi năm lịch; ngôi kể lẫn tên riêng với "ngươi" | Trung bình | Ghi tuổi (năm lịch ở tooltip); dòng về nhân vật đổi sang "ngươi" |
| 8 | Tin giang hồ không lọc được, mọi tin trông như nhau | Trung bình | Lọc theo nhóm, chấm màu theo loại (son: chiến sự, vàng: đột phá/kỳ ngộ, hình thoi: tiền kiếp) |
| 9 | Thẻ nhân vật không nói nên làm gì | Trung bình | Dòng mục tiêu: chưa linh căn, chưa công pháp, đủ tu vi đột phá, đang thương, thọ nguyên sắp cạn; thanh tiến độ việc đang làm |
| 10 | Giới thiệu chiếm chỗ ở mọi lần mở | Thấp | Nút "Đã hiểu, ẩn đi", nhớ trong trình duyệt |
| 11 | Chữ xám năm tháng tương phản thấp; tab không dùng được phím mũi tên | Thấp | Tăng tương phản `--ink-3`; tab có `aria-controls`, mũi tên trái/phải |
| 12 | "Lưu" không phản hồi | Thấp | Dòng trạng thái ghi giờ lưu gần nhất |

Còn để sau: phát lại một trận đấu, hiệu ứng khi đột phá, chia sẻ bia mộ thành ảnh, giao diện Telegram Mini App.
