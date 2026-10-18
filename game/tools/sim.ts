// Headless run for balancing: `npm run sim -- --years 300 --seed 7 [--news]`.
import { advance, createWorld, REALMS, SECTS, Sim, YEAR_OFFSET, REGION_BY_ID } from '../src/index';

const args = process.argv.slice(2);
const num = (flag: string, dflt: number) => {
  const i = args.indexOf(flag);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const years = num('--years', 200);
const seed = num('--seed', 1);
const showNews = args.includes('--news');

const t0 = Date.now();
const s = createWorld(seed, { autoplay: true });
const deathsBefore = s.stats.deaths;
advance(s, years * 12);
const ms = Date.now() - t0;
const sim = new Sim(s);
const living = sim.living();

console.log(`Seed ${seed}: ${years} năm sau khi linh hồn giáng thế (năm ${YEAR_OFFSET + sim.year}), chạy ${ms} ms.`);
console.log(`Đang sống: ${living.length} người. Sinh ${s.stats.births}, mất ${s.stats.deaths - deathsBefore} (kể từ khi giáng thế), phi thăng ${s.stats.ascensions}. Cảnh giới cao nhất từng có: ${REALMS[s.stats.maxRealmEver]!.name}.`);

const byRealm = new Map<number, number>();
for (const a of living) byRealm.set(a.realm, (byRealm.get(a.realm) ?? 0) + 1);
console.log('\nCảnh giới (người đang sống):');
for (const [r, n] of [...byRealm].sort((x, y) => x[0] - y[0])) console.log(`  ${REALMS[r]!.name.padEnd(12)} ${n}`);

const byWorld = { mortal: 0, cultivation: 0 } as Record<string, number>;
for (const a of living) byWorld[REGION_BY_ID[a.regionId]!.world] = (byWorld[REGION_BY_ID[a.regionId]!.world] ?? 0) + 1;
console.log(`\nPhàm giới ${byWorld.mortal}, Tu chân giới ${byWorld.cultivation}.`);

console.log('\nTông môn:');
for (const def of SECTS) {
  const st = s.sects[def.id]!;
  const members = living.filter((a) => a.sectId === def.id);
  const leader = sim.get(st.leaderId);
  const wars = Object.keys(st.wars).join(', ') || 'không';
  console.log(`  ${def.name.padEnd(15)} ${String(members.length).padStart(3)} người, chưởng môn ${leader ? `${leader.name} (${sim.realmLabel(leader)})` : '—'}, uy thế ${st.prestige}, đang chiến: ${wars}`);
}

const causes = new Map<string, number>();
for (const a of Object.values(s.avatars)) if (!a.alive && a.deathCause) causes.set(a.deathCause, (causes.get(a.deathCause) ?? 0) + 1);
console.log('\nNguyên nhân chết (người còn lưu hồ sơ):');
for (const [c, n] of [...causes].sort((x, y) => y[1] - x[1])) console.log(`  ${c.padEnd(14)} ${n}`);

console.log(`\nLinh hồn: ${s.soul.lives.length} kiếp đã qua, ${s.soul.points} Luân Hồi Điểm.`);
for (const l of s.soul.lives) {
  console.log(`  Kiếp ${l.index + 1}: ${l.name}, ${REALMS[l.realm]!.name}, ${Math.floor((l.diedMonth - l.bornMonth) / 12)} tuổi, ${l.causeText}. Đạo Quả ${l.daoQua}.`);
}
const reunions = s.events.filter((e) => e.kind === 'past_life').length;
console.log(`  Lần gặp lại tiền kiếp: ${reunions}. Bia mộ trên bản đồ: ${s.graves.length}.`);

if (showNews) {
  console.log('\nTin giang hồ gần nhất:');
  for (const e of s.events.filter((x) => x.major).slice(-25)) console.log(`  [${YEAR_OFFSET + Math.floor(e.month / 12)}] ${e.text}`);
  console.log('\nBiên niên kiếp hiện tại:');
  const cur = s.soul.currentAvatarId;
  for (const e of s.events.filter((x) => cur !== null && x.avatarIds.includes(cur)).slice(-25)) console.log(`  [${YEAR_OFFSET + Math.floor(e.month / 12)}] ${e.text}`);
}
