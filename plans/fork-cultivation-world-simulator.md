# Plan: game mới từ Luân Hồi Vạn Kiếp + Cultivation World Simulator

Ngày: 2026-10-18. Dựa trên `thoang126/luan-hoi-van-kiep` (commit `067e127`) và
`4thfever/cultivation-world-simulator` (gọi tắt **CWS**, commit `471fe74`, bản v4.2.1).

## 0. Tóm tắt

- **Ý tưởng:** ghép hai thứ mỗi bên đang thiếu.
  - CWS có một **thế giới sống**: bản đồ, tông môn, vương triều, hàng trăm tu sĩ tự hành động. Nhưng người chơi chỉ đứng xem từ góc Thiên Đạo.
  - Luân Hồi Vạn Kiếp (LHVK) có **một linh hồn đi qua nhiều kiếp**. Nhưng thế giới thì mỏng.
  - Game mới: người chơi là một linh hồn đầu thai liên tục vào **cùng một thế giới đang tiến hóa**. Kiếp sau gặp lại bia mộ, đồ đệ và kẻ thù của kiếp trước.
- **Rào cản số 1 là giấy phép.** CWS dùng **CC BY-NC-SA 4.0**: cấm dùng thương mại, bản phái sinh phải giữ đúng giấy phép này, và phải ghi công.
  - Fork CWS đồng nghĩa với bỏ toàn bộ phần kiếm tiền trong GDD của LHVK (Telegram Stars, Linh Ngọc, Thẻ Thiên Đạo).
  - Cần chốt điểm này trước khi viết dòng code nào (mục 2).
- **Khuyến nghị:**
  - Nếu chấp nhận phi thương mại: fork CWS (phương án A, mục 5–7).
  - Nếu vẫn muốn bán: giữ engine LHVK và chỉ học ý tưởng thiết kế từ CWS, không chép code hay dữ liệu (phương án B, mục 8).

## 1. Hai dự án đặt cạnh nhau

| | Luân Hồi Vạn Kiếp | Cultivation World Simulator |
|---|---|---|
| Người chơi là ai | Một nhân vật, sống một kiếp rồi chết | Thiên Đạo đứng xem cả thế giới; có chế độ nhập vai một nhân vật |
| Thế giới | 2 thế giới đang bật, ít địa danh, không có bản đồ | Bản đồ tile theo region (3 preset: `classic`, `island_seas`, `mountain_frontier`), tông môn, thành, vương triều, bí cảnh |
| Ai điều khiển NPC | Engine luật + bảng event YAML | Mỗi tu sĩ là một agent LLM, có luật bao quanh; có chế độ chỉ chạy luật (`test_mode`) |
| Tính tái lập | Deterministic theo seed, replay từng byte | Không deterministic khi dùng LLM |
| Cảnh giới | 19 bậc (Phàm nhân → Thánh Nhân) | 4 bậc (Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh), có alias theo đạo thống |
| Nội dung | 278 event, 22 công pháp, 41 võ kỹ, 22 pháp bảo, 43 danh hiệu | CSV: tông môn, công pháp, đan dược, binh khí, trận pháp, kỳ ngộ, bí mật thế giới, sự kiện ngẫu nhiên… |
| Stack | TypeScript, pnpm monorepo, Vitest; Telegram Mini App dự kiến | Python 3.10 + FastAPI, Vue 3 + PixiJS, pytest; bản desktop phát hành trên Epic |
| Quy mô code | ~4–5 nghìn dòng engine | ~51 nghìn dòng Python, ~40 nghìn dòng TS/Vue |
| Tiếng Việt | Có sẵn (ngôn ngữ chính) | Có locale `vi-VN` (nguồn chính là `zh-CN`) |
| Trạng thái | Engine xong; Mini App và server chưa có | Đã phát hành, đang phát triển tích cực |
| Giấy phép | Của bạn | CC BY-NC-SA 4.0 (code), nhạc CC BY, âm thanh CC0 |

Những thứ CWS đã có mà LHVK cần:
- **Chế độ nhập vai** (`docs/specs/avatar-roleplay-mode.md`): nắm một nhân vật, chỉ dừng ở điểm quyết định. Gần đúng với "ngã rẽ" của LHVK.
- **Bia mộ trên bản đồ** (`src/classes/poi/grave.py`): tu sĩ chết để lại bia mộ, bấm vào xem được. Đúng chất bia mộ của LHVK.
- **Tông môn có chính tà, quan hệ ngoại giao, chiến tranh** (`sect.csv`, `sect_relations.py`, `war.py`). Giải quyết chuyện cả thế giới chỉ có Huyết Sát môn là phe tà.
- **Bản đồ region** (`docs/specs/region-first-map-system.md`, `tools/map_creator`): vẽ được Đại Hạ, biển Đông, Thanh Vân châu thật sự.
- **Chế độ chạy bằng luật** (`docs/specs/rule-based-test-mode.md`): chơi được không cần API key, và là nền để làm phần lõi có thể tái lập.

## 2. Giấy phép: phải chốt trước

CC BY-NC-SA 4.0 nghĩa là:

1. **NC, phi thương mại:** không được bán game, bán vật phẩm, bán gói tháng, hay chạy quảng cáo kiếm tiền từ bản phái sinh.
2. **SA, chia sẻ tương tự:** game mới cũng phải phát hành theo CC BY-NC-SA 4.0. Nội dung LHVK đưa vào bản fork cũng bị phân phối theo giấy phép đó trong bản fork. Repo LHVK gốc vẫn là của bạn và giữ nguyên giấy phép bạn chọn.
3. **BY, ghi công:** ghi tên tác giả CWS (4thfever và contributors), link repo, nói rõ đã sửa gì.
4. **Tài sản riêng:** nhạc của Kevin MacLeod và Peritune (CC BY) và âm thanh Kenney (CC0) có giấy phép riêng, phải giữ phần ghi công trong `ASSETS_CREDITS.md`.

Hệ quả cho GDD của LHVK:
- Mục 10 (Telegram Stars, Linh Ngọc, Thẻ Thiên Đạo) phải bỏ.
- Muốn thương mại thì phải xin giấy phép riêng từ tác giả CWS, hoặc chọn phương án B.

Đây là cách đọc giấy phép thông thường, không phải tư vấn pháp lý. Nếu có ý định kiếm tiền sau này, nên hỏi tác giả CWS ngay từ đầu.

## 3. Khái niệm game mới

**Tên tạm:** Luân Hồi Vạn Kiếp: Thiên Hạ.

**Một câu:** ngươi là một linh hồn trong một thế giới tu tiên đang tự vận hành. Mỗi lần chết, ngươi đầu thai vào một đứa trẻ vừa sinh ra ở đâu đó trên bản đồ, và thế giới vẫn nhớ những gì ngươi đã làm.

**Vòng lặp chính:**

1. **Giáng sinh:** vòng quay số phận của LHVK (thế giới, xuất thân, linh căn, thể chất), chọn trong số trẻ sơ sinh có thật của thế giới CWS.
2. **Đời trôi:** thế giới CWS chạy theo tháng. Nhân vật của người chơi do AI tự điều khiển, chỉ dừng ở **ngã rẽ** (single choice của CWS, bước ngoặt và ngã rẽ của LHVK).
3. **Tử vong:** nguyên nhân chết theo luật LHVK, có báo trước. Để lại bia mộ trên bản đồ (POI grave) và một Hồn ấn.
4. **Luân hồi:** thời gian thế giới tiếp tục trôi. Linh hồn nhận Luân Hồi Điểm, mở ký ức tiền kiếp, rồi đầu thai.
5. **Gặp lại tiền kiếp:** đồ đệ kiếp trước giờ là trưởng lão, kình địch kiếp trước đã thành Nguyên Anh, bia mộ của chính mình nằm ở Thanh Vân tông, pháp bảo cũ đang được bán ở phường thị.

Bước 5 là thứ cả hai game gốc đều không có. Đây là lý do đáng để ghép.

**Giữ từ LHVK:** bảng xác suất giáng sinh, linh căn và thể chất, công thức tu vi/đột phá/thiên kiếp, giọng văn và event, NPC có vai (sư phụ, đạo lữ, kình địch, đồ đệ), Đạo Quả, danh hiệu, bia mộ, Hồn ấn, ký ức tiền kiếp.

**Giữ từ CWS:** bản đồ, tông môn, vương triều, kinh tế, NPC agent, sự kiện thế giới, bia mộ trên bản đồ, chế độ nhập vai, lưu và tải game, giao diện PixiJS.

**Bỏ hoặc hoãn:** Telegram Mini App, battle PvP xếp hạng, mọi tính năng trả phí.

## 4. Quyết định cần chốt (chủ dự án)

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | Chấp nhận phi thương mại để fork CWS? | Có nếu đây là dự án đam mê. Không thì sang phương án B |
| Q2 | Nền tảng | Web và desktop một người chơi, như CWS. Telegram để sau, vì CWS là server một thế giới cho một người, đổi sang nhiều người chơi là viết lại phần lớn backend |
| Q3 | LLM đóng vai gì | Luật là lõi, LLM chỉ thêm màu (lời kể, suy nghĩ NPC, đối thoại). Phải chơi trọn vẹn được ở chế độ không LLM |
| Q4 | Tính tái lập theo seed | Chỉ giữ cho các phần cần công bằng: roll giáng sinh, đột phá, battle Hồn ấn. Thế giới chung thì chấp nhận không tái lập |
| Q5 | Ngôn ngữ nguồn | Đổi nguồn sang `vi-VN`, giữ `zh-CN` và `en-US` từ CWS |
| Q6 | Theo kịp bản gốc | Giữ remote `upstream` trỏ về CWS và merge định kỳ trong 2–3 tháng đầu; sau đó tách hẳn khi đã sửa sâu |

## 5. Phương án A: fork CWS

### 5.1 Ghép dữ liệu LHVK vào CWS

| LHVK (`packages/content/data`) | Đích trong CWS | Ghi chú |
|---|---|---|
| `birth/worlds.yaml` (Đại Hạ, Thanh Vân châu, Yêu vực, Ma vực, Hải ngoại) | Một bản đồ mới `static/game_configs/maps/van_kiep/map.json` gồm nhiều vùng lớn | Đại Hạ và Thanh Vân châu cách nhau biển Đông; Hải ngoại dùng ý tưởng của preset `island_seas` |
| Địa danh (Thiên Trụ sơn, Lạc Hà phái, kinh thành, biên ải, phường thị, Kiếm mộ, 10 vùng yêu thú) | `city_region.csv`, `sect_region.csv`, `cultivate_region.csv`, `normal_region.csv`, `hidden_domain.csv` | Bản đồ phỏng dựng trong `index.html` của repo này dùng được làm phác thảo |
| Thanh Vân tông, Lạc Hà phái, Huyết Sát môn | `sect.csv` (có sẵn cột `alignment` chính/trung lập/tà) | Thêm 3–5 tông môn để mỗi đạo đồ có chỗ dựa: kiếm tu, đan sư, ma tu phàm giới |
| Vương triều Đại Hạ | `dynasty.csv` | |
| `cultivation/realms.yaml` (19 bậc) | `Realm` enum trong `src/systems/cultivation.py` (mới có 4 bậc) và `cultivation_alias.csv` | Việc lớn nhất của phần dữ liệu (mục 5.3) |
| `birth/spirit-roots.yaml`, `physiques.yaml`, `traits.yaml`, `origins.yaml` | `root.csv`, `persona.csv`, `goldfinger.csv`, `src/classes/birth.py` | CWS có linh căn theo ngũ hành; cần thêm bậc tạp/tam/song/đơn/biến dị/thiên và tỉ lệ của LHVK |
| `cultivation/techniques.yaml`, `gear/skills.yaml`, `gear/artifacts.yaml`, `gear/items.yaml` | `technique.csv`, `weapon.csv`, `auxiliary.csv`, `elixir.csv` | |
| 278 event YAML | `random_minor_event.csv`, `sect_random_event.csv`, story event, single choice | Viết script chuyển đổi một lần; event có lựa chọn đi vào single choice framework |
| NPC vai truyện, người quen, tin tức giang hồ | `src/classes/relation`, `close_relation_event_service.py` | NPC giờ là agent thật trên bản đồ, không còn là tên sinh ra cho có |
| Bia mộ, tiểu sử, Đạo Quả, danh hiệu | `poi/grave.py`, `deceased_record.py`, `ranking.py`, `nickname.py` | |
| Battle Hồn ấn, ngũ hành khắc chế, trạng thái | `src/systems/battle.py` | Port công thức từ `packages/engine/src/battle` |
| Tiên giới | Tạm bỏ | Gần như không ai tới; làm lại khi thế giới hạ giới đã ổn |

### 5.2 Hệ luân hồi (code mới, lõi của game)

Thêm một module, ví dụ `src/systems/reincarnation/`:

- **Linh hồn (`Soul`):** tồn tại độc lập với nhân vật, lưu cùng save.
  - Lưu: danh sách kiếp (id nhân vật, nơi sinh, cảnh giới cuối, nguyên nhân chết, Đạo Quả), Luân Hồi Điểm, ký ức tiền kiếp đã mở.
  - Theo luật save của CWS: chỉ lưu kiểu JSON cơ bản và tham chiếu bằng ID.
- **Đầu thai:**
  - Khi nhân vật của người chơi chết, tua thế giới thêm N năm.
  - Roll thế giới, xuất thân, linh căn bằng PRNG có seed của linh hồn, theo bảng LHVK.
  - Chọn hoặc tạo một trẻ sơ sinh khớp kết quả ở vùng tương ứng, rồi chuyển chế độ nhập vai sang đứa trẻ đó.
- **Dấu vết tiền kiếp:**
  - Các NPC từng có quan hệ với kiếp trước được đánh dấu `past_life_link`.
  - Event mới kích hoạt khi kiếp sau ở gần: thăm bia mộ của chính mình, gặp lại đồ đệ, kẻ thù nhận ra ánh mắt quen.
- **Ký ức tiền kiếp:** đúng bảng ở GDD LHVK mục 9 (Mạnh Bà quên uống, Luân hồi khí vận, Tàn niệm công pháp…), có trần.
- **Kiếp Sách:** album các linh căn, thể chất, danh hiệu, cách chết đã gặp.

### 5.3 Mở rộng cảnh giới

CWS mới có 4 cảnh giới, LHVK có 19.

- **Đợt đầu:** thêm Phàm nhân (CWS có `mortal.py`) và Hóa Thần, đủ 6 bậc như MVP của LHVK.
- **Sau đó:** Dung Hư, Hợp Thể, Độ Kiếp, Đại Thừa, rồi tới 9 bậc Tiên giới.
- **Việc phải làm:**
  - Tìm mọi chỗ code giả định đúng 4 bậc: thọ nguyên, upkeep theo cảnh giới trong `static/config.yml`, xếp hạng, hình đại diện theo cảnh giới trong `tools/img_gen`.
  - Thêm test cho từng chỗ.
  - Thêm alias tiếng Việt vào `cultivation_alias.csv`.

### 5.4 Giao diện

- **Phong cách:** đổi theme sang thủy mặc như ADR-0008 của LHVK: giấy dó, mực, một dấu triện son.
- **Giữ cấu trúc của CWS:** cấu trúc `scene + overlay`, icon Lucide, bản đồ PixiJS.
- **Màn hình mới:**
  - Vòng quay giáng sinh
  - Biên niên sử kiếp hiện tại
  - Bia mộ để chia sẻ
  - Luân Hồi Điện (ký ức tiền kiếp, Kiếp Sách)
  - Dòng thời gian các kiếp của linh hồn

## 6. Lộ trình

Thời lượng là ước tính cho một người làm gần toàn thời gian cùng AI. Mỗi giai đoạn phải đạt tiêu chí mới sang giai đoạn sau.

| Giai đoạn | Việc chính | Đạt khi | Ước tính |
|---|---|---|---|
| **P0. Chốt và fork** | Trả lời Q1–Q6. Fork CWS sang repo mới, thêm `LICENSE` (CC BY-NC-SA 4.0), `NOTICE` ghi công, remote `upstream`. Chạy được ở chế độ test (không LLM) và chế độ LLM. Đọc `AGENTS.md`, spec bản đồ, spec nhập vai | `pytest` và `npm run test` xanh trên bản fork; mở được một thế giới ở `vi-VN` | 1 tuần |
| **P1. Thế giới Vạn Kiếp** | Vẽ bản đồ `van_kiep` bằng `tools/map_creator`: Đại Hạ, biển Đông, Thanh Vân châu, vùng yêu thú. Thêm tông môn, thành, vương triều, lore từ LHVK | Thế giới chạy 100 năm ở chế độ test không lỗi; Thanh Vân tông, Lạc Hà phái, Huyết Sát môn hoạt động và có xung đột | 2–3 tuần |
| **P2. Hệ tu luyện LHVK** | 6 cảnh giới (mục 5.3), linh căn 7 bậc, thể chất, thiên phú, công thức tu vi và đột phá, thiên kiếp, thọ nguyên | Phân bố cảnh giới khi chạy nhiều thế giới ở chế độ test gần với số trong GDD LHVK (Luyện Khí ≈ 23%, Trúc Cơ ≈ 6%, Kim Đan ≈ 1%) | 2–3 tuần |
| **P3. Luân hồi** | Module `reincarnation` (mục 5.2): linh hồn, đầu thai, nhập vai mặc định, bia mộ của người chơi, Luân Hồi Điểm, 3 ký ức tiền kiếp đầu tiên | Chơi liền 3 kiếp trong một save; kiếp thứ 2 tìm được bia mộ kiếp 1 trên bản đồ; save và load giữa kiếp không mất dữ liệu | 3 tuần |
| **P4. Nội dung LHVK** | Script chuyển 278 event YAML sang định dạng CWS; bước ngoặt (Lập chí, Chọn đạo, Thành gia…) qua single choice; 15–20 event "gặp lại tiền kiếp" | Mỗi kiếp có trung bình 4–8 ngã rẽ (mục tiêu GDD LHVK); có test cho script chuyển đổi | 3 tuần |
| **P5. Hồn ấn và battle** | Port battle LHVK (ngũ hành, trạng thái, chiến thuật) vào `battle.py`; lưu Hồn ấn sau mỗi kiếp; đấu với Hồn ấn các kiếp trước và với NPC mạnh | Sim 50 nghìn trận: tỉ lệ thắng các chiến thuật trong khoảng 45–55% như LHVK | 2 tuần |
| **P6. Giao diện và cân bằng** | Theme thủy mặc, các màn hình ở mục 5.4, dịch `vi-VN` đầy đủ, công cụ chạy hàng loạt không giao diện để cân bằng | Một người chưa từng chơi hoàn thành được kiếp đầu không cần hướng dẫn | 3 tuần |
| **P7. Phát hành phi thương mại** | Bản web (Docker) và desktop, trang GitHub Release hoặc itch.io miễn phí, ghi công đầy đủ | Bản build chạy được trên Windows và Docker | 1 tuần |

Tổng: khoảng 4–5 tháng. P3 là mốc quyết định. Nếu chơi 3 kiếp liền mà không thấy hay hơn hai game gốc thì dừng lại xem lại khái niệm trước khi đổ công vào P4–P6.

## 7. Rủi ro

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Giấy phép NC-SA | Không bao giờ kiếm tiền được từ bản fork | Chốt Q1; nếu có thể, hỏi tác giả CWS về giấy phép riêng trước P1 |
| Chi phí LLM | Mỗi tu sĩ là một agent; thế giới đông thì mỗi năm tốn nhiều lượt gọi | Lõi chạy bằng luật (Q3); giới hạn số NPC agent quanh người chơi, phần còn lại dùng `background_npc` |
| Codebase lớn, đổi nhanh | 90 nghìn dòng; upstream phát hành liên tục, merge khó dần | Sửa theo các đường mở rộng sẵn có (CSV, registry, phase), tránh sửa lõi; merge upstream hằng tuần trong P0–P2 |
| 4 → 19 cảnh giới | Nhiều chỗ code ngầm giả định 4 bậc | Làm 6 bậc trước (mục 5.3), test từng chỗ |
| Mất tính "số phận công bằng" | LLM không tái lập; trụ cột 1 của LHVK yếu đi | PRNG có seed cho roll giáng sinh, đột phá, battle (Q4); công khai bảng xác suất trong game |
| Ngôn ngữ nguồn là tiếng Trung | Luật i18n của CWS bắt `msgid` tiếng Anh, `zh-CN` là nguồn | Đổi nguồn sang `vi-VN` ở P0, hoặc giữ quy trình và coi `vi-VN` là bản dịch hoàn chỉnh |
| Phạm vi phình to | Hai game gộp lại rất dễ thành ba game | Giữ đúng P0–P7; Tiên giới, Telegram, PvP để sau |

## 8. Phương án B: giữ engine LHVK, học ý tưởng từ CWS

Dùng khi muốn giữ quyền kiếm tiền hoặc giữ Telegram. Không chép code, dữ liệu CSV, văn bản hay hình ảnh của CWS. Chỉ học cách thiết kế (ý tưởng không bị giấy phép ràng buộc), rồi viết lại từ đầu trong TypeScript:

1. **Bản đồ dạng dữ liệu:** thêm `locations.yaml` (vùng, thế giới, tag, toạ độ); event gọi được `{place}`.
2. **Thế giới chung giữa các kiếp:**
   - Mỗi người chơi có một "thế giới" lưu trên server, tiến thêm vài chục năm mỗi lần đầu thai.
   - Engine sinh tin tức về các tông môn và NPC đã gặp.
   - Bia mộ các kiếp trước nằm trên bản đồ.
3. **Tông môn có quan hệ:** chính/tà/trung lập, chiến tranh theo thời gian, ảnh hưởng tới event.
4. **Gặp lại tiền kiếp:** cùng ý tưởng mục 5.2, làm trong engine deterministic hiện có.
5. **LLM offline:** đúng như GDD LHVK mục 12.5, chỉ dùng để gợi ý nội dung, người duyệt rồi mới merge.

Phương án B chậm hơn vì không có sẵn bản đồ, giao diện và hệ tông môn, nhưng giữ được Telegram, kiếm tiền và trụ cột "mọi kiếp tái dựng được từ seed".

## 9. Việc làm ngay

1. Trả lời Q1 (thương mại hay không). Câu này quyết định A hay B.
2. Nếu chọn A:
   - Bấm **Fork** ở github.com/4thfever/cultivation-world-simulator, hoặc tạo repo trống, rồi thêm repo đó vào phiên Claude Code.
   - Mình sẽ làm P0: remote `upstream`, `NOTICE`, chạy test, bật `vi-VN`, viết `CLAUDE.md` cho dự án mới.
3. Nếu chọn B: mình viết đề xuất `locations.yaml` và thiết kế "thế giới chung giữa các kiếp" vào `docs/` của repo LHVK để duyệt trước.
