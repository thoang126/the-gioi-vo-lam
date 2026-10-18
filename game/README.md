# Vạn Kiếp Thiên Hạ

Game mới dựa trên [Luân Hồi Vạn Kiếp](https://github.com/thoang126/luan-hoi-van-kiep): thế giới tu tiên
tự vận hành liên tục, còn người chơi chỉ là **một linh hồn**, tức một node trong thế giới đó. Chết rồi, linh hồn
đầu thai lại vào chính thế giới ấy, và có thể gặp lại đồ đệ, đạo lữ, kẻ thù của kiếp trước, hoặc đi ngang
bia mộ của chính mình.

## Chạy

```bash
npm install
npm test            # 9 test: tái lập theo seed, tái lập theo lựa chọn, lưu/tải, dân số, tông môn, luân hồi
npm run sim -- --years 300 --seed 7 --news   # mô phỏng không giao diện để cân bằng
npm run build       # ra dist/index.html, mở thẳng bằng trình duyệt
```

## Thế giới vận hành thế nào

Mỗi bước là một tháng, chạy các phase theo thứ tự cố định (`src/phases.ts`):

1. **Quyết định:** mọi người đang rảnh (từ 12 tuổi) chọn một hành động bằng điểm tiện ích từ tâm tính
   (chính tà, tham vọng, cẩn trọng), nhu cầu (thọ nguyên, linh thạch, thương thế) và tình hình thế giới.
2. **Thực thi:** hành động có thể phải đi đường trước (vượt biển Đông mất 3 tháng và có thể đắm thuyền),
   rồi kéo dài nhiều tháng. Tu luyện cộng tu vi từng tháng theo công thức của Luân Hồi Vạn Kiếp.
3. **Gặp gỡ:** người cùng một nơi kết bạn, thành đạo lữ, thành kình địch, hoặc đánh nhau nếu chính tà đối địch
   hay hai phái đang chiến.
4. **Tông môn (hằng năm):** tuyển đệ tử, thăng chức, chọn chưởng môn mới, quan hệ trôi dần, khai chiến và đánh nhau.
5. **Thế giới (hằng năm):** bí cảnh mở theo chu kỳ, thú triều, võ lâm đại hội, chiến loạn biên ải, dịch bệnh.
6. **Sinh tử:** chết yểu, bệnh, thọ tận; các cặp vợ chồng sinh con; dân số mỗi nơi được bù dần.
7. **Linh hồn người chơi:** AI bỏ qua nhân vật của người chơi. Khi nhân vật rảnh, thế giới dừng ở một **ngã rẽ**.
   Lời mời vào tông môn hay lời ngỏ kết đạo lữ cũng dừng thế giới để hỏi.

Toàn bộ engine deterministic: cùng seed và cùng chuỗi lựa chọn cho ra đúng một thế giới, đến từng byte.

## Nguồn gốc và giấy phép

- **Dữ liệu:** cảnh giới, linh căn, xuất thân, thể chất, công pháp, công thức tu vi, đột phá, thiên kiếp, tử suất,
  bảng tên và địa danh lấy từ `luan-hoi-van-kiep/packages/content/data`.
- **Kiến trúc:** vòng lặp tháng theo phase, hành động kéo dài nhiều tháng, AI chỉ quyết cho người đang rảnh,
  nhân vật người chơi dừng ở điểm quyết định. Phần này học từ ý tưởng của
  [cultivation-world-simulator](https://github.com/4thfever/cultivation-world-simulator). Code viết mới hoàn toàn
  bằng TypeScript; không chép code, dữ liệu, văn bản hay hình ảnh nào từ repo đó (repo đó dùng CC BY-NC-SA 4.0).
- **AI:** CWS dùng LLM cho NPC; ở đây NPC dùng điểm tiện ích theo luật để thế giới tái lập được theo seed và chạy
  không cần API key.

## Cấu trúc

| File | Nội dung |
|---|---|
| `src/content/cultivation.ts` | Cảnh giới, linh căn, xuất thân, thể chất, công pháp, tên |
| `src/content/world.ts` | Địa danh, đường đi, tông môn, quan hệ ban đầu, chức vị |
| `src/sim.ts` | Trạng thái dùng chung, công thức tu vi và sức mạnh, sinh, chết |
| `src/actions.ts` | 23 hành động và AI chấm điểm |
| `src/phases.ts` | Các phase mỗi tháng |
| `src/player.ts` | Linh hồn: ngã rẽ, lời mời, gặp lại tiền kiếp, luân hồi, ký ức tiền kiếp |
| `src/world.ts` | Tạo thế giới, `step`, `advance`, `choose` |
| `web/` | Giao diện một trang (bản đồ, tin giang hồ, tông môn, hồ sơ, biên niên) |
| `tools/sim.ts` | Mô phỏng hàng loạt để cân bằng |
