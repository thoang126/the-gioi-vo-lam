// Triều đại Đại Hạ: the royal house reigns until it falls — to a usurping clan, a peasant uprising,
// an invasion from the west, a cultivator who wants a puppet, a quiet abdication, or simply for
// want of heirs. The fallen house lives on as "tiền triều" and may one day take the throne back.

import { DYNASTY, DYNASTY_END_NAMES, givenName, surnameOf } from './content/peoples';
import { clanMembers, foundClan, headTitle, setHead } from './clans';
import { offerToPlayer } from './player';
import { REGION_BY_ID, Sim } from './sim';
import type { Avatar, ClanState, Dynasty, DynastyEnd } from './types';

const CAPITAL = 'kinh_thanh';
const royalName = (surname: string) => `${surname} thị hoàng tộc`;
const deposedName = (surname: string) => `${surname} thị tiền triều`;

export function reigning(sim: Sim): Dynasty | undefined {
  const d = sim.s.dynasties;
  return d?.[d.length - 1];
}

export function dynastyName(d: Dynasty): string {
  return `${d.surname} triều`;
}

/** The founding dynasty: the clan of kind royal, already some generations old. */
export function seedDynasty(sim: Sim): void {
  const royal = Object.values(sim.s.clans ?? {}).find((c) => c.kind === 'royal' && c.extinctMonth === null);
  if (!royal) { sim.s.dynasties = []; return; }
  const age = sim.rng.int(DYNASTY.startAge[0], DYNASTY.startAge[1]);
  sim.s.dynasties = [{ clanId: royal.id, surname: royal.surname, founder: `${royal.surname} Thái Tổ`, since: sim.month - age * 12, until: null, end: null }];
}

/** Yearly P(the reigning dynasty falls), from its age and how weak it is. */
export function fallChance(sim: Sim, d: Dynasty, royal: ClanState | undefined): number {
  const t = Math.max(1, (sim.month - d.since) / 12);
  const { scaleYears: l, shape: k } = DYNASTY;
  let h = (k / l) * (t / l) ** (k - 1);
  if (!royal) return 1;
  const members = clanMembers(sim, royal.id);
  const emperor = sim.get(royal.headId);
  if (emperor && sim.age(emperor) < 16) h *= DYNASTY.childEmperor;
  if (members.length < DYNASTY.fewHeirsBelow) h *= DYNASTY.fewHeirs;
  if (Object.values(sim.s.clans!).some((c) => c.id !== royal.id && c.extinctMonth === null && REGION_BY_ID[c.seat]!.world === 'mortal'
    && c.prestige > royal.prestige * DYNASTY.strongerClanRatio)) h *= DYNASTY.strongerClan;
  return Math.min(1, h);
}

export function phaseDynasty(sim: Sim): void {
  if (sim.month % 12 !== 6 || !sim.s.clans) return;
  if (!sim.s.dynasties) seedDynasty(sim);
  const d = reigning(sim);
  if (!d) return;
  const royal = sim.s.clans[d.clanId];
  const alive = royal && royal.extinctMonth === null && clanMembers(sim, royal.id).length > 0;
  if (alive && !sim.rng.chance(fallChance(sim, d, royal))) return;
  fall(sim, d, alive ? royal : undefined);
}

function mortalClans(sim: Sim, except: string): ClanState[] {
  return Object.values(sim.s.clans!).filter((c) => c.id !== except && c.extinctMonth === null && c.kind !== 'yeu'
    && REGION_BY_ID[c.seat]!.world === 'mortal' && clanMembers(sim, c.id).length > 0);
}

function pickEnd(sim: Sim, royal: ClanState | undefined): DynastyEnd {
  if (!royal) return 'extinct';
  const rivals = mortalClans(sim, royal.id);
  const w = { ...DYNASTY.endWeights } as Record<string, number>;
  const strongest = rivals.sort((x, y) => y.prestige - x.prestige)[0];
  if (!strongest) w.usurp = 0;
  else if (strongest.prestige > royal.prestige) w.usurp! *= 2;
  if (!sim.living().some((a) => REGION_BY_ID[a.regionId]!.world === 'mortal' && a.realm >= 2)) w.cultivator = 0;
  if (!rivals.some((c) => (c.relations[royal.id] ?? 0) > 20)) w.abdication = 0;
  const ends = Object.keys(w) as DynastyEnd[];
  return sim.rng.weighted(ends, (e) => w[e] ?? 0);
}

/** A new emperor from outside every clan: a rebel, a general, a cultivator's puppet. */
function newcomer(sim: Sim, from: string[], pick: (a: Avatar) => number): Avatar {
  const pool = sim.living().filter((a) => from.includes(a.regionId) && !a.clanId && !sim.isPlayer(a) && sim.age(a) >= 20 && sim.age(a) <= 60 && (a.race ?? 'human') === 'human');
  const best = pool.sort((x, y) => pick(y) - pick(x))[0];
  if (best) return best;
  const age = sim.rng.int(25, 45);
  return sim.createAvatar({ regionId: sim.rng.pick(from), birthMonth: sim.month - age * 12, gender: 'male', originId: 'commoner', race: 'human', noClan: true });
}

/** A deposed house is watched and weakened: it needs to be far stronger to take the throne back. */
function claim(c: ClanState): number {
  return c.name.endsWith('tiền triều') ? c.prestige * 0.4 : c.prestige;
}

function fall(sim: Sim, d: Dynasty, royal: ClanState | undefined): void {
  let end = pickEnd(sim, royal);
  const oldName = dynastyName(d);
  const years = Math.round((sim.month - d.since) / 12);
  const lastEmperor = royal ? sim.get(royal.headId) : undefined;

  // Who takes the throne.
  let heir: ClanState | undefined;
  let founder: Avatar;
  let story: string;
  const rivals = royal ? mortalClans(sim, royal.id) : mortalClans(sim, '');
  if (end === 'usurp' || end === 'extinct' || end === 'abdication') {
    heir = end === 'abdication'
      ? rivals.sort((x, y) => (y.relations[royal!.id] ?? 0) - (x.relations[royal!.id] ?? 0))[0]
      : rivals.sort((x, y) => claim(y) - claim(x))[0];
  }
  if (heir && heir.name.endsWith('tiền triều')) end = 'restoration';
  if (heir) {
    founder = sim.get(heir.headId) ?? clanMembers(sim, heir.id)[0]!;
  } else if (end === 'invasion') {
    founder = newcomer(sim, ['bien_ai', 'bac_quan', 'hac_sat', 'sa_mac'], (a) => a.stats.canCot + a.renown + (a.persona.virtue < 0 ? 20 : 0));
  } else if (end === 'cultivator') {
    founder = newcomer(sim, ['kinh_thanh', 'lac_ha', 'thai_ho'], (a) => a.renown + a.stats.miLuc);
  } else {
    end = end === 'usurp' || end === 'abdication' ? 'rebellion' : end;
    founder = newcomer(sim, ['lang_que', 'giang_nam', 'thai_ho', 'bien_ai'], (a) => a.renown + a.stats.miLuc + a.stats.canCot / 2);
  }
  switch (end) {
    case 'usurp': story = `${founder.name}, gia chủ ${heir!.name}, nắm binh quyền trong tay, ép ${lastEmperor?.name ?? 'vua'} thoái vị rồi tự xưng đế.`; break;
    case 'restoration': story = `Dư đảng ${heir!.name} chiêu binh mãi mã đã lâu, nay đánh vào kinh thành. ${founder.name} giành lại ngai vàng của tổ tiên.`; break;
    case 'abdication': story = `${lastEmperor?.name ?? 'Vua'} tự biết vận nước đã hết, nhường ngôi cho ${founder.name} của ${heir!.name}.`; break;
    case 'extinct': story = heir
      ? `Hoàng tộc ${d.surname} thị không còn ai nối dõi. Triều thần tôn ${founder.name} của ${heir.name} lên ngôi.`
      : `Hoàng tộc ${d.surname} thị không còn ai nối dõi. Sau mấy năm loạn lạc, ${founder.name} được triều thần tôn lên ngôi.`; break;
    case 'invasion': story = `Quân từ phía tây tràn qua ${REGION_BY_ID[founder.regionId]!.name}, kinh thành thất thủ. Thủ lĩnh ${founder.name} lên ngôi.`; break;
    case 'cultivator': story = `Một võ nhân đứng sau rèm, thả mưa sấm xuống hoàng cung. ${lastEmperor?.name ?? 'Vua'} chết không rõ nguyên do, ${founder.name} được dựng lên làm vua bù nhìn.`; break;
    default: story = `Mất mùa liền ba năm, ${founder.name} dựng cờ khởi nghĩa ở ${REGION_BY_ID[founder.regionId]!.name}. Nghĩa quân đánh tới kinh thành, ${lastEmperor?.name ?? 'vua'} bị bắt khi thành vỡ.`;
  }

  // The fallen house.
  const killed: string[] = [];
  if (royal) {
    if (lastEmperor) lastEmperor.titles = lastEmperor.titles.filter((t) => t !== headTitle(royal));
    const purge = DYNASTY.purge[end] ?? 0;
    for (const m of clanMembers(sim, royal.id)) {
      if (sim.isPlayer(m)) { offerExile(sim, m, royal, founder); continue; }
      if (sim.rng.chance(m === lastEmperor ? Math.min(1, purge * 1.6) : purge)) {
        killed.push(m.name);
        sim.kill(m, 'war', `Bị giết khi ${oldName} sụp đổ`, founder);
      } else if (m.regionId === CAPITAL) {
        m.regionId = sim.rng.pick(['thai_ho', 'giang_nam', 'bien_ai', 'lang_que']);
        m.action = null;
      }
    }
    royal.kind = 'martial';
    royal.name = deposedName(royal.surname);
  }

  // The new house.
  if (heir) {
    heir.kind = 'royal';
    heir.name = royalName(heir.surname);
    heir.seat = CAPITAL;
    setHead(sim, heir, founder);
  } else {
    const kids = Object.entries(founder.relations).filter(([, r]) => r.kind === 'child').map(([id]) => sim.get(Number(id))).filter((k): k is Avatar => !!k?.alive);
    heir = foundClan(sim, founder, kids, { kind: 'royal', seat: CAPITAL, name: royalName(surnameOf(founder.name)), silent: true });
    // The founder's line takes his surname with the throne (a rebel's children often had none worth keeping).
    for (const k of kids) if (!k.name.startsWith(heir.surname + ' ')) k.name = `${heir.surname} ${givenName(k.name)}`;
    raiseKin(sim, founder, heir, DYNASTY.founderKin - kids.length);
  }
  for (const m of clanMembers(sim, heir.id)) if (sim.age(m) >= 16 && m.regionId !== CAPITAL && sim.rng.chance(0.7)) { m.regionId = CAPITAL; m.action = null; }
  founder.renown += 100;
  if (royal) {
    royal.relations[heir.id] = heir.relations[royal.id] = end === 'abdication' ? 0 : -90;
  }

  d.until = sim.month;
  d.end = end;
  const next: Dynasty = { clanId: heir.id, surname: heir.surname, founder: founder.name, since: sim.month, until: null, end: null };
  sim.s.dynasties!.push(next);
  sim.log('world', `${DYNASTY_END_NAMES[end]}: ${oldName} sụp đổ sau ${years} năm. ${story}${killed.length ? ` ${killed.length} người hoàng tộc cũ bị giết.` : ''} ${dynastyName(next)} bắt đầu.`,
    [founder.id], { regionId: CAPITAL, major: true });
  joinTheCause(sim, end, founder, heir);
}

/** Kin who rise with a founder from nowhere: a wife if he has none, brothers, children. */
function raiseKin(sim: Sim, founder: Avatar, house: ClanState, n: number): void {
  if (n <= 0) return;
  if (!sim.relationOf(founder, 'partner')) {
    const age = Math.max(16, sim.age(founder) - sim.rng.int(0, 8));
    const w = sim.createAvatar({ regionId: CAPITAL, birthMonth: sim.month - age * 12, gender: founder.gender === 'male' ? 'female' : 'male', originId: 'commoner', race: 'human', noClan: true });
    sim.relate(founder, w, 'partner', 'partner', 60);
  }
  for (let i = 0; i < n; i++) {
    const child = i % 2 === 0 && sim.age(founder) >= 32;
    const age = child ? sim.rng.int(2, Math.min(20, sim.age(founder) - 16)) : Math.max(16, sim.age(founder) + sim.rng.int(-10, 10));
    const k = sim.createAvatar({ regionId: CAPITAL, birthMonth: sim.month - age * 12 - sim.rng.int(0, 11), clanId: house.id, race: 'human' });
    if (child) sim.relate(k, founder, 'parent', 'child', 70);
    else sim.relate(k, founder, 'friend', 'friend', 60);
  }
}

/** The player in the fallen house: flee or stand at the palace gate. */
function offerExile(sim: Sim, a: Avatar, royal: ClanState, founder: Avatar): void {
  offerToPlayer(sim, {
    kind: 'offer',
    prompt: `${royalName(royal.surname)} sụp đổ. Người của ${founder.name} lùng bắt con cháu hoàng tộc khắp kinh thành.`,
    options: [
      { id: 'accept', label: 'Cải trang trốn khỏi Đại Hạ', hint: 'Sống sót, nhưng mất hết' },
      { id: 'decline', label: 'Ở lại, cầm kiếm giữ cổng cung', hint: 'Rất dễ mất mạng' },
    ],
    data: { offer: 'dynasty_exile', founder: founder.id },
  });
}

/** Everyone else in Đại Hạ: an uprising or a usurpation needs people. */
function joinTheCause(sim: Sim, end: DynastyEnd, founder: Avatar, heir: ClanState): void {
  const p = sim.get(sim.s.soul.currentAvatarId);
  if (!p || !p.alive || p.clanId === heir.id || REGION_BY_ID[p.regionId]!.world !== 'mortal' || sim.age(p) < 16) return;
  if (end === 'abdication' || end === 'extinct') return;
  if (p.clanId && sim.s.clans![p.clanId]!.name.endsWith('tiền triều')) return;
  offerToPlayer(sim, {
    kind: 'offer',
    prompt: `Thiên hạ đổi chủ. ${founder.name} chiêu mộ người tài cho tân triều; ai theo từ những ngày đầu sẽ được phong công thần.`,
    options: [
      { id: 'accept', label: `Theo ${founder.name}`, hint: 'Có thể chết trận, có thể thành khai quốc công thần' },
      { id: 'decline', label: 'Đóng cửa sống qua thời loạn' },
    ],
    data: { offer: 'dynasty_join', founder: founder.id },
  });
}
