// Player-experience metrics: `npm run analyze -- --worlds 20 --years 400`.
// Plays every crossroad with a random pick (closer to a real player than autoplay) and
// reports pacing, choices, story variety, progression and the meta loop.
import { advance, choose, createWorld, EVENT_BY_ID, REALMS, Sim } from '../src/index';
import { Rng } from '../src/rng';

const args = process.argv.slice(2);
const num = (flag: string, dflt: number) => {
  const i = args.indexOf(flag);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const worlds = num('--worlds', 20);
/**
 * random: picks anything; focused: a player who wants to cultivate (trains, prepares, takes pills);
 * alchemist: the same player, who also learns đan đạo and brews, gathers and trades pills.
 */
const policy = args.includes('--alchemist') ? 'alchemist' : args.includes('--focused') ? 'focused' : 'random';
const FOCUS = ['bt_pill', 'bt_prepare', 'bt_now', 'tu_luyen', 'be_quan', 'linh_mach', 'doi_dan', 'mua_dan', 'tim_tien_duyen', 'vuot_bien', 'accept'];
const ALCHEMIST = ['bt_pill', 'bt_prepare', 'bt_now', 'heat_keep', 'hoc_dan', 'luyen_dan', 'mua_linh_dan', 'mua_dan', 'hai_duoc', 'mua_duoc', 'ban_dan', 'tu_luyen', 'be_quan', 'linh_mach', 'doi_dan', 'tim_tien_duyen', 'vuot_bien', 'accept'];
const PREFER: Record<string, string[]> = { focused: FOCUS, alchemist: ALCHEMIST };
const years = num('--years', 400);
/** Default UI speed "Vừa": 3 months per 250 ms tick, i.e. one year per second. */
const SECONDS_PER_YEAR = 1;

interface LifeStat {
  years: number; realm: number; cause: string; causeText?: string; choices: Record<string, number>; gaps: number[];
  story: number; distinctStory: number; reunions: number; diedBefore12: boolean;
}
const lives: LifeStat[] = [];
const pct = (n: number, d: number) => `${((100 * n) / Math.max(1, d)).toFixed(1)}%`;
const quantile = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

for (let w = 0; w < worlds; w++) {
  const s = createWorld(1000 + w, { warmupYears: 20 });
  const pick = new Rng(77 + w);
  let cur: LifeStat = { years: 0, realm: 0, cause: '', choices: {}, gaps: [], story: 0, distinctStory: 0, reunions: 0, diedBefore12: false };
  let lastChoiceMonth = s.month;
  let livesSeen = 0;
  const end = s.month + years * 12;
  while (s.month < end) {
    advance(s, end - s.month);
    const p = s.soul.pending;
    if (!p) continue;
    const ev = p.kind === 'event' ? EVENT_BY_ID[String(p.data?.event)] : undefined;
    const kind = p.kind === 'event' ? (ev?.kind === 'milestone' ? 'milestone' : ev?.kind === 'acquaintance' ? 'acquaintance' : 'event') : p.kind;
    if (kind !== 'rebirth') {
      cur.choices[kind] = (cur.choices[kind] ?? 0) + 1;
      cur.gaps.push((s.month - lastChoiceMonth) / 12);
      lastChoiceMonth = s.month;
    }
    const ids = p.options.map((o) => o.id);
    const focused = PREFER[policy]?.find((f) => ids.includes(f));
    choose(s, focused ?? pick.pick(p.options).id);
    if (s.soul.lives.length > livesSeen) {
      const l = s.soul.lives[livesSeen]!;
      livesSeen += 1;
      const evs = s.events.filter((e) => e.avatarIds.includes(l.avatarId));
      const storyTexts = evs.filter((e) => e.kind === 'story').map((e) => e.text);
      cur.years = Math.floor((l.diedMonth - l.bornMonth) / 12);
      cur.realm = l.realm;
      cur.cause = l.cause;
      cur.causeText = l.causeText.replace(/[A-ZÀ-Ỹ][\wÀ-ỹ]*( [A-ZÀ-Ỹ][\wÀ-ỹ]*)+/g, '…');
      cur.story = storyTexts.length;
      cur.distinctStory = new Set(storyTexts.map((t) => t.slice(0, 50))).size;
      cur.reunions = evs.filter((e) => e.kind === 'past_life').length;
      cur.diedBefore12 = cur.years < 12;
      lives.push(cur);
      cur = { years: 0, realm: 0, cause: '', choices: {}, gaps: [], story: 0, distinctStory: 0, reunions: 0, diedBefore12: false };
      lastChoiceMonth = s.month;
    }
  }
  void Sim;
}

const n = lives.length;
const totalChoices = (l: LifeStat) => Object.values(l.choices).reduce((a, b) => a + b, 0);
const choiceKinds: Record<string, number> = {};
for (const l of lives) for (const [k, v] of Object.entries(l.choices)) choiceKinds[k] = (choiceKinds[k] ?? 0) + v;
const gaps = lives.flatMap((l) => l.gaps.slice(1));
const minutes = lives.map((l) => (l.years * SECONDS_PER_YEAR) / 60 + totalChoices(l) * 6 / 60);
const causes: Record<string, number> = {};
for (const l of lives) causes[l.cause] = (causes[l.cause] ?? 0) + 1;

console.log(`${worlds} thế giới × ${years} năm, ${n} kiếp đã khép lại (người chơi ${policy === 'alchemist' ? 'theo đan đạo' : policy === 'focused' ? 'chủ động tu luyện' : 'chọn ngẫu nhiên'}).\n`);
console.log('Nhịp');
console.log(`  Tuổi thọ kiếp: p50 ${quantile(lives.map((l) => l.years), 0.5)}, p90 ${quantile(lives.map((l) => l.years), 0.9)} năm`);
console.log(`  Thời lượng thật ở tốc độ Vừa (6 giây mỗi lựa chọn): p50 ${quantile(minutes, 0.5).toFixed(1)}, p90 ${quantile(minutes, 0.9).toFixed(1)} phút; trong khoảng 3–10 phút: ${pct(minutes.filter((m) => m >= 3 && m <= 10).length, n)}`);
console.log(`  Chết trước 12 tuổi (không kịp có lựa chọn nào): ${pct(lives.filter((l) => l.diedBefore12).length, n)}`);
console.log(`  Khoảng cách giữa hai lựa chọn: p50 ${quantile(gaps, 0.5).toFixed(1)}, p90 ${quantile(gaps, 0.9).toFixed(1)} năm`);
console.log('\nLựa chọn');
console.log(`  Mỗi kiếp: trung bình ${(lives.reduce((a, l) => a + totalChoices(l), 0) / n).toFixed(1)}, p50 ${quantile(lives.map(totalChoices), 0.5)}`);
console.log(`  Theo loại: ${Object.entries(choiceKinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, Object.values(choiceKinds).reduce((a, b) => a + b, 0))}`).join(', ')}`);
console.log('\nCâu chuyện');
console.log(`  Dòng event mỗi kiếp: trung bình ${(lives.reduce((a, l) => a + l.story, 0) / n).toFixed(1)}; lặp nguyên văn trong kiếp: ${pct(lives.reduce((a, l) => a + l.story - l.distinctStory, 0), lives.reduce((a, l) => a + l.story, 0))}`);
console.log(`  Kiếp có gặp lại tiền kiếp: ${pct(lives.filter((l) => l.reunions > 0).length, n)}`);
console.log('\nTiến trình');
for (let r = 1; r <= 4; r++) console.log(`  Đạt ${REALMS[r]!.name} trở lên: ${pct(lives.filter((l) => l.realm >= r).length, n)}`);
console.log(`  Nguyên nhân chết: ${Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, n)}`).join(', ')}`);
const texts: Record<string, number> = {};
for (const l of lives) if (l.causeText) texts[l.causeText] = (texts[l.causeText] ?? 0) + 1;
console.log(`  Kết cục hay gặp: ${Object.entries(texts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `"${k.slice(0, 60)}" ${v}`).join('; ')}`);
