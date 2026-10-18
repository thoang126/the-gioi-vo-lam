# Thế giới võ lâm — Luân Hồi Vạn Kiếp

Bản đồ và phân tích thế giới của game [Luân Hồi Vạn Kiếp](https://github.com/thoang126/luan-hoi-van-kiep),
dựng từ `docs/GDD.md` và dữ liệu `packages/content/data/**/*.yaml` (commit `067e127`).

Mở `index.html` trong trình duyệt. Trang gồm:

- **Bản đồ tam giới** (bấm vào địa danh để xem sự kiện): Phàm giới – Đại Hạ, Tu chân giới – Thanh Vân châu,
  Tiên giới – Thiên Đình, cùng ba thế giới có trong dữ liệu nhưng chưa mở (Yêu vực, Ma vực, Hải ngoại tán tu đảo).
- **Hệ 19 cảnh giới**: thọ nguyên, tỉ lệ đột phá gốc, số đạo thiên kiếp, hệ số chiến đấu, tỉ lệ đạt tới theo sim.
- **Vòng quay giáng sinh**: tỉ lệ thế giới, xuất thân, linh căn.
- **Ngũ hành khắc chế** và trạng thái theo hệ trong battle Hồn ấn.
- **Thế lực** và **phân tích**: điểm mạnh, chỗ thế giới còn mỏng, trạng thái dự án, đề xuất mở rộng.

Tên, xác suất và sự kiện lấy nguyên từ dữ liệu game. Vị trí trên bản đồ là phỏng dựng: game chỉ nói rõ
Thanh Vân châu nằm bên kia biển Đông so với Đại Hạ, và Tiên giới chỉ tới được bằng phi thăng.

## Vạn Kiếp Thiên Hạ (`game/`)

Game mới dựng từ Luân Hồi Vạn Kiếp theo kiến trúc mô phỏng thế giới của cultivation-world-simulator:
thế giới tự vận hành, người chơi là một linh hồn luân hồi trong đó. Xem `game/README.md`.
Kế hoạch gốc: `plans/fork-cultivation-world-simulator.md`.

## Vạn Kiếp Giang Hồ (`vo-lam/`)

Bản võ hiệp tách từ `game/`: cảnh giới Hậu thiên … Thiên nhân hợp nhất và phá toái hư không, võ công có môn loại, 13 môn phái truyền võ công theo
cấp bậc, sư phụ dạy đồ đệ, võ quán, bí kíp. Nội dung Luân Hồi Vạn Kiếp được đổi sang chữ võ hiệp bằng
`vo-lam/tools/wuxia-content.ts`. Xem `vo-lam/README.md`.
