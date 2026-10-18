# Vạn Kiếp Giang Hồ

Bản võ hiệp của [Vạn Kiếp Thiên Hạ](../game/README.md): cùng một engine, nhưng thế giới là giang hồ chứ không phải
tu tiên. Giang hồ tự vận hành: môn phái tuyển đệ tử, truyền võ công, khai chiến; triều đình đổi chủ; thế gia kế vị.
Người chơi chỉ là **một linh hồn** luân hồi trong đó: chết rồi đầu thai lại vào chính giang hồ ấy, gặp lại đồ đệ,
hiệp lữ, kẻ thù của kiếp trước, hoặc đi ngang bia mộ của chính mình.

## Chạy

```bash
npm install          # hoặc dùng chung node_modules của ../game
npm test             # 53 test: như bản tu tiên, thêm võ công, môn phái và chữ võ hiệp
npm run sim -- --years 300 --seed 7 --news
npm run analyze -- --worlds 30 --years 400
npm run build        # ra dist/index.html
npm run wuxia:content -- ../game/src/content/lhvk.json   # dựng lại nội dung võ hiệp từ nội dung tu tiên
```

Bản lưu dùng khóa riêng (`van-kiep-giang-ho/…`), không đụng tới bản lưu của Vạn Kiếp Thiên Hạ.

## Khác bản tu tiên ở đâu

### Cảnh giới võ học

| Cảnh giới | Tầng | Thọ nguyên | Ghi chú |
|---|---|---|---|
| Người thường | | 70 | Có tư chất và nội công thì đang luyện tới Tam lưu |
| Tam lưu | nhất trọng … cửu trọng | 80 | |
| Nhị lưu | sơ nhập, tiểu thành, đại thành, viên mãn | 90 | |
| Nhất lưu | như trên | 100 | Cao thủ, được lập gia tộc |
| Tuyệt đỉnh | như trên | 110 | Đạp sóng vượt biển, không sợ đắm thuyền |
| Tiên thiên, Tông sư, Đại tông sư, Bán thánh | như trên | 130–220 | Truyền thuyết |
| Võ thánh | như trên | 300 | Đột phá cuối là **phá toái hư không**, rời nhân gian |

Không có thiên kiếp: đột phá là đả thông kinh mạch, thất bại thì mất công lực, trọng thương hoặc tẩu hỏa nhập ma.
Id cảnh giới trong code vẫn là của bản tu tiên (`luyen_khi`, `truc_co`…), để event nhập từ Luân Hồi Vạn Kiếp trỏ đúng.

### Tư chất thay linh căn

Khoảng 55% người sinh ra có tư chất luyện võ (bản tu tiên: 30% có linh căn), chia sáu bậc từ *Tư chất tầm thường*
tới *Võ học kỳ tài*. Ngũ hành vẫn còn, là tính chất nội lực, và vẫn khắc chế nhau trong trận đấu.

### Võ công

59 võ công, mỗi chiêu có **môn loại** (quyền cước, chưởng, chỉ, trảo, kiếm, đao, côn, thương, ám khí, khinh công,
nội gia) và **phẩm** (phổ thông, thượng thừa, tuyệt học, thần công). 41 chiêu giữ id của pháp thuật cũ nên event
vẫn trao đúng; 18 chiêu là võ công riêng của các môn phái (`src/content/wuxia.ts`). Bốn chiêu mạnh nhất, tuyệt kỹ
trước, vào trận đấu của engine Luân Hồi Vạn Kiếp.

Học võ công từ:
- **Môn phái**, theo cấp bậc: ngoại môn 1 chiêu, nội môn 2, chân truyền 3, trưởng lão 4, chưởng môn đủ cả tuyệt kỹ.
  Vào môn phái còn được truyền nội công tâm pháp của phái.
- **Sư phụ:** người mới vào phái được một trưởng bối nhận làm đồ đệ; mỗi năm sư phụ ở gần có thể dạy thêm một chiêu.
- **Võ quán** ở Trung Nguyên trấn (15 lượng bạc nửa năm): võ công phổ thông, đôi khi cả nội công nhập môn.
- **Bí kíp:** rơi xuống vực gặp mật thất, vách cổ mộ, và các event.

Kiếp Sách có nhóm "Võ công"; danh hiệu linh hồn mới: *Thập bát ban võ nghệ*, *Tuyệt kỹ trong tay*.

### Môn phái

| Môn phái | Nơi | Võ học |
|---|---|---|
| Thiên Trụ tự (mới) | Thiên Trụ sơn, Yên Bắc | Quyền côn Phật môn, Kim Cương Bất Động Công |
| Thái Huyền quán (mới) | Vân Mộng sơn | Kiếm pháp Đạo gia, lấy nhu thắng cương |
| Hành Khất bang (mới) | Ngoài cửa tây kinh thành | Côn pháp, chưởng pháp của bang chúng ăn mày |
| Lạc Hà phái | Đông Hải | Chưởng pháp dương cương |
| Kim Đao môn | Yên Bắc | Đao pháp, thiết bố sam |
| Bích Thủy kiếm phái | Giang Nam | Kiếm pháp mềm như nước |
| Bách Thảo cốc | Lĩnh Nam | Y thuật, điểm huyệt, dùng độc, luyện đan |
| Hắc Sát giáo (tà) | Lũng Tây | Ám khí |
| Thanh Vân kiếm phái | Thanh Vân châu | Kiếm pháp chính tông |
| Kiếm Các | Thanh Vân châu | Kiếm pháp trên không, khinh công |
| Huyết Sát môn (tà) | Thanh Vân châu | Đao pháp tà phái |
| Thiên Ma giáo (tà) | Tây Vực | Trảo pháp, chưởng sấm |
| Huyết Cổ giáo (tà) | Nam Cương | Cổ độc |

Tên môn phái, võ công, nội công đều là tên tự đặt, không lấy từ Võ Lâm Truyền Kỳ hay tiểu thuyết có bản quyền.

### Giang hồ

Trung Nguyên (Đại Hạ, 6 châu quận), Thanh Vân châu bên kia biển Đông, Hải ngoại, Tây Vực, Nam Cương và Thiên ngoại
(chỉ tới được bằng phá toái hư không). Nam Cương là đất của **Cổ tộc**, một bộ tộc hư cấu nuôi cổ trùng; bản tu tiên
gọi chỗ này là Yêu vực.

### Nội dung nhập từ Luân Hồi Vạn Kiếp

`tools/wuxia-content.ts` đọc nội dung tu tiên và:
- đổi tên võ công, nội công, binh khí, đan dược, trạng thái trận đấu theo id;
- đổi thuật ngữ trong mọi chuỗi theo bảng `tools/wuxia-text.ts` (linh thạch → lượng bạc, tu vi → công lực,
  tông môn → môn phái, Trúc Cơ → Nhị lưu, phi thăng → phá toái hư không…);
- bỏ những event vẫn còn mang chất tu tiên: giữ 212/242;
- thu nhỏ quà thọ nguyên cỡ tu tiên (300–2.400 năm) về cỡ võ hiệp; thay thần thú bằng mãnh thú.

Bảng thuật ngữ cũng đã áp một lần cho chữ hiển thị trong code của bản này.

## Còn lại

Xem `docs/roadmap.md`.
