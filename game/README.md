# Vạn Kiếp Thiên Hạ

Game mới dựa trên [Luân Hồi Vạn Kiếp](https://github.com/thoang126/luan-hoi-van-kiep): thế giới tu tiên
tự vận hành liên tục, còn người chơi chỉ là **một linh hồn**, tức một node trong thế giới đó. Chết rồi, linh hồn
đầu thai lại vào chính thế giới ấy, và có thể gặp lại đồ đệ, đạo lữ, kẻ thù của kiếp trước, hoặc đi ngang
bia mộ của chính mình.

## Chạy

```bash
npm install
npm test            # 19 test: tái lập theo seed và lựa chọn, lưu/tải, dân số, tông môn, luân hồi, event
npm run import:lhvk # nhập lại event từ repo luan-hoi-van-kiep (mặc định ../../luan-hoi-van-kiep)
npm run sim -- --years 300 --seed 7 --news   # mô phỏng không giao diện để cân bằng
npm run analyze -- --worlds 30 --years 400   # chỉ số trải nghiệm người chơi (nhịp, lựa chọn, cái chết, tiến trình)
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

## Event của Luân Hồi Vạn Kiếp

242 event (toàn bộ, trừ 36 event Tiên giới) được nhập nguyên văn vào `src/content/lhvk.json` và chạy bằng bộ
diễn dịch `src/story.ts`, giữ đúng luật của game gốc:

- **Nhịp:** mỗi năm của nhân vật người chơi bốc 0–2 event theo bảng nhịp (thơ ấu, phàm nhân, từng cảnh giới), trọng số
  chỉnh theo Khí vận, đạo đồ, xuất thân, linh căn, thể chất; tối đa 8 ngã rẽ mỗi đời, cách nhau ít nhất 3 năm.
- **Bước ngoặt:** Lập chí, Lập nghiệp, Chọn đạo, Thành gia, An cư, Vãn niên… luôn xảy ra một lần khi tới tuổi, và gán
  **đạo đồ** (20 con đường) cộng hệ số tu luyện, tử suất, trọng số event; đạo đồ cũng làm AI ưu tiên hành động hợp
  đường (thương nhân hay đi buôn, kiếm tu hay tới Kiếm mộ).
- **Điều kiện, hiệu ứng, phép thử:** đủ 40 loại điều kiện, 36 loại hiệu ứng, 3 loại phép thử của DSL gốc.
- **NPC là người thật:** khi event cần sư phụ, đạo lữ, kình địch, đồ đệ hay bạn, engine tìm người phù hợp đang ở cùng nơi,
  không có thì sinh ra một người mới. Người đó sống tiếp đời riêng trong thế giới, và có thể gặp lại ở kiếp sau.
  `npc_end` giết hoặc đưa họ đi thật; phép thử `battle` với kình địch là một trận đấu với người thật đó.
- **Gắn với thế giới:** `set env` và cờ `in_sect` cho người chơi vào Thanh Vân tông hoặc Lạc Hà phái thật; hiệu ứng
  `world` đưa người chơi sang Thanh Vân châu; Trúc Cơ đan, Kết Kim đan… dùng khi đột phá; pháp bảo cộng sức mạnh.
- **Người quen nhờ cậy:** 6 event `acquaintance` chọn `{who}` trong số người thật có quan hệ với người chơi.
- **Chưa nhập:** danh sách tin tức người quen trong `people.yaml` và thiên phú (`traits.yaml`); thế giới mới đã có
  cơ chế gặp gỡ và tin giang hồ riêng.

## Mục tiêu của linh hồn

- **Danh hiệu cuối đời:** 41 danh hiệu của Luân Hồi Vạn Kiếp, tối đa 3 mỗi kiếp, cộng vào Đạo Quả và hiện trên bia mộ.
- **Kiếp Sách:** 112 mục trong 8 nhóm (linh căn, thể chất, xuất thân, nơi sinh, đạo đồ, cảnh giới, danh hiệu, cách chết).
- **Danh hiệu linh hồn:** 19 thành tựu (`src/content/soul.ts`), mỗi cái cộng Luân Hồi Điểm; tab Kiếp Sách hiện 3 mục tiêu gần nhất.
- **Vạn Cổ Bia:** 20 kiếp có Đạo Quả cao nhất trên máy, giữ qua mọi thế giới.
- **Ký ức Lục đạo thị giác:** thấy tỉ lệ thành công trước khi chọn.
- **Phi thăng:** có thể khép lại linh hồn và bắt đầu linh hồn mới.

## Tiên duyên

70% số người sinh ra không có linh căn (GDD Luân Hồi Vạn Kiếp 3.3). Thế giới vẫn giữ tỉ lệ đó cho mọi NPC,
nhưng linh hồn người chơi có tiên duyên (`TIEN_DUYEN` trong `src/content/cultivation.ts`): kiếp đầu 60% có linh căn,
mỗi kiếp phàm nhân liên tiếp thêm 15%, tối đa 75%, về lại 30% khi đã có linh căn. Chỉ bước "có linh căn hay không"
được nâng; tỉ lệ giữa các loại linh căn giữ nguyên. Đo trên 172 kiếp: có linh căn 43,6% (trước 28,6%), tới Luyện Khí
32,6% (trước 21,4%).

Toàn bộ engine deterministic: cùng seed và cùng chuỗi lựa chọn cho ra đúng một thế giới, đến từng byte.

## Lộ trình

Xem `docs/roadmap.md`: định nghĩa bản 1.0, bảng chỉ số đo được, sáu giai đoạn.

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
| `src/story.ts` | Bộ diễn dịch event Luân Hồi Vạn Kiếp: điều kiện, hiệu ứng, phép thử, NPC thật, đạo đồ |
| `src/content/lhvk.json` | Event, đạo đồ, vật phẩm, pháp bảo, võ kỹ, câu mở đầu nhập từ Luân Hồi Vạn Kiếp |
| `tools/import-lhvk.ts` | Script nhập dữ liệu từ repo Luân Hồi Vạn Kiếp |
| `src/world.ts` | Tạo thế giới, `step`, `advance`, `choose` |
| `web/` | Giao diện một trang (bản đồ, tin giang hồ, tông môn, hồ sơ, biên niên) |
| `tools/sim.ts` | Mô phỏng hàng loạt để cân bằng |
