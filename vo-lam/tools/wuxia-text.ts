// Từ tu tiên sang võ hiệp: bảng thuật ngữ dùng chung cho nội dung nhập từ Luân Hồi Vạn Kiếp
// (tools/wuxia-content.ts) và cho chữ hiển thị trong code của bản fork.
// Thứ tự quan trọng: cụm dài đứng trước cụm ngắn chứa nó.

/** [tu tiên, võ hiệp]. Cụm viết thường cũng áp cho dạng viết hoa chữ đầu. */
export const PHRASES: [string, string][] = [
  // Đan đột phá giữ id của Luân Hồi Vạn Kiếp, đổi tên theo cảnh giới võ học.
  ['Trúc Cơ đan', 'Tiểu Hoàn đan'],
  ['Kết Kim đan', 'Đại Hoàn đan'],
  ['Hóa Anh đan', 'Tuyết Liên đan'],
  ['Thiên Đạo đan', 'Bồ Đề đan'],
  // Cảnh giới, bậc theo bậc (id giữ nguyên trong code); bốn bậc trên cùng của tu tiên không có trong võ đạo.
  ['Luyện Khí', 'Hậu thiên'],
  ['Trúc Cơ', 'Tiên thiên'],
  ['Kim Đan', 'Tông sư'],
  ['Nguyên Anh', 'Đại tông sư'],
  ['Hóa Thần', 'Thiên nhân hợp nhất'],
  ['Dung Hư', 'Thiên nhân hợp nhất'],
  ['Hợp Thể', 'Thiên nhân hợp nhất'],
  ['Độ Kiếp', 'Thiên nhân hợp nhất'],
  ['Đại Thừa', 'Thiên nhân hợp nhất'],
  // Cõi, nơi chốn, môn phái.
  ['Tu chân giới', 'Thanh Vân châu'],
  ['Phàm giới', 'Trung Nguyên'],
  ['Tiên giới', 'Thiên ngoại'],
  ['Thiên Đình', 'Thiên ngoại'],
  ['Yêu vực', 'Nam Cương'],
  ['Ma vực', 'Tây Vực'],
  ['Thanh Vân tông', 'Thanh Vân kiếm phái'],
  ['Vạn Ma tông', 'Thiên Ma giáo'],
  ['Vạn Yêu đình', 'Huyết Cổ giáo'],
  ['Vạn Tiên thành', 'Vạn Kiếm thành'],
  ['Thác linh mạch', 'Thác Bạch Long'],
  ['thác linh mạch', 'thác Bạch Long'],
  ['linh mạch', 'long mạch'],
  ['bí cảnh', 'cổ mộ'],
  ['động phủ', 'mật thất'],
  // Người.
  ['tu tiên giả', 'người luyện võ'],
  ['tiên nhân', 'cao nhân thế ngoại'],
  ['kiếm tiên', 'kiếm thánh'],
  ['tán tu', 'du hiệp'],
  ['tu sĩ', 'võ nhân'],
  ['yêu tộc', 'Cổ tộc'],
  ['đạo hữu', 'huynh đài'],
  ['đạo lữ', 'hiệp lữ'],
  ['phàm nhân', 'người thường'],
  ['người phàm', 'người thường'],
  ['rời tông', 'rời môn phái'],
  ['tông chủ', 'chưởng môn'],
  ['tông môn', 'môn phái'],
  // Tu luyện.
  ['phi thăng', 'phá toái hư không'],
  ['độ kiếp', 'phá quan'],
  ['đạo tâm', 'tâm cảnh'],
  ['hộ sơn đại trận', 'cơ quan hộ sơn'],
  ['thiên kiếp', 'quan ải'],
  ['tu tiên', 'luyện võ'],
  ['tu chân', 'võ học'],
  ['tiên duyên', 'võ duyên'],
  ['tiên đạo', 'võ đạo'],
  ['linh căn', 'tư chất'],
  ['linh thạch', 'lượng bạc'],
  ['linh khí', 'chân khí'],
  ['linh lực', 'nội lực'],
  ['pháp lực', 'nội lực'],
  ['thần thức', 'tâm nhãn'],
  ['tu vi', 'công lực'],
  ['tu luyện', 'luyện công'],
  ['công pháp', 'nội công'],
  ['pháp bảo', 'binh khí'],
  ['pháp thuật', 'võ công'],
  ['ngự kiếm phi hành', 'thi triển khinh công'],
  ['ngự kiếm', 'thi triển khinh công'],
  ['phi kiếm', 'phi đao'],
  ['Võ kỹ', 'Võ công'],
  ['yêu thú', 'mãnh thú'],
  ['linh thú', 'mãnh thú'],
  ['yêu đan', 'da thú'],
  ['thú triều', 'nạn thú dữ'],
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ALL: [string, string][] = PHRASES.flatMap(([a, b]) => (a.charAt(0) === a.charAt(0).toLowerCase() && a.charAt(0) !== a.charAt(0).toUpperCase()
  ? [[a, b], [capitalize(a), capitalize(b)]] as [string, string][]
  : [[a, b]] as [string, string][]));

export function wuxify(text: string): string {
  let out = text;
  for (const [a, b] of ALL) if (out.includes(a)) out = out.split(a).join(b);
  return out;
}

/** Words that still mark a text as tu tiên after `wuxify`: events that keep any of them are left out. */
export const FORBIDDEN = [
  'tiên', 'Tiên', 'yêu', 'Yêu', 'nguyên thần', 'Nguyên thần', 'đan dược', 'luyện đan', 'Luyện đan', 'phù chú', 'trận pháp',
  'linh ', 'Linh ', 'pháp khí', 'kim đan', 'nguyên anh', 'trúc cơ', 'luyện khí',
];
/** Allowed words that contain a forbidden one. */
export const ALLOWED = ['tiên sinh', 'Tiên sinh', 'trước tiên', 'tiên phong', 'Tiên thiên', 'tiên thiên', 'tiên tri', 'linh cảm', 'Linh cảm', 'linh hồn', 'Linh hồn', 'linh cữu', 'linh vị', 'linh đình', 'linh tinh', 'linh dược', 'Linh dược', 'linh chi', 'Linh chi', 'đầu tiên', 'Đầu tiên', 'tổ tiên', 'Tổ tiên', 'tiên tổ', 'tiên đế', 'Tiên đế', 'tiên vương', 'tiên sư', 'yêu thương', 'yêu cầu', 'yêu quý', 'yêu dấu', 'yêu mến', 'Yêu cầu', 'Yêu thương', 'người yêu', 'thương yêu', 'yêu nhau', 'đáng yêu', 'tình yêu', 'yêu kiều', 'yêu sách', 'yêu chiều', 'yêu ai', 'yêu nàng', 'yêu chàng'];

export function stillCultivation(text: string): string | null {
  let t = text;
  for (const a of ALLOWED) t = t.split(a).join('');
  return FORBIDDEN.find((w) => t.includes(w)) ?? null;
}
