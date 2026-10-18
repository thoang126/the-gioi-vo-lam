// Gia tộc, thế gia: dynasties that outlive their members. Children inherit the clan, the head
// passes to the strongest heir, clans feud and marry their children to each other, and a Tông sư
// cultivator with children may found a new one.

import { REALMS } from './content/cultivation';
import { CLANS, CLAN, CLAN_KIND_NAMES, CLAN_RELATIONS, givenName, surnameOf, type ClanKind } from './content/peoples';
import { WORLDS } from './content/world';
import { duel } from './battle';
import { offerToPlayer } from './player';
import { REGION_BY_ID, Sim } from './sim';
import type { Avatar, ClanState } from './types';

export function clanOf(sim: Sim, a: Avatar): ClanState | undefined {
  return a.clanId ? sim.s.clans?.[a.clanId] : undefined;
}

export function clanWorld(c: ClanState) {
  return REGION_BY_ID[c.seat]!.world;
}

export function clanMembers(sim: Sim, id: string): Avatar[] {
  return sim.living().filter((a) => a.clanId === id);
}

export function headTitle(c: ClanState): string {
  return c.kind === 'royal' ? 'Hoàng đế Đại Hạ' : c.kind === 'yeu' ? `Tộc trưởng ${c.name}` : `Gia chủ ${c.name}`;
}

const AGE_BY_REALM: Record<number, [number, number]> = { 0: [16, 60], 1: [16, 70], 2: [25, 80], 3: [35, 90] };

/** Founding clans with their first members (world creation, or old saves without clans). */
export function seedClans(sim: Sim): void {
  const s = sim.s;
  s.clans = {};
  for (const def of CLANS) {
    s.clans[def.id] = {
      id: def.id, name: def.name, surname: def.surname, kind: def.kind, seat: def.seat, headId: null, prestige: 0,
      relations: {}, foundedMonth: -1200 * 12, extinctMonth: null, technique: null,
    };
  }
  for (const [a, b, v] of CLAN_RELATIONS) {
    s.clans[a]!.relations[b] = v;
    s.clans[b]!.relations[a] = v;
  }
  for (const def of CLANS) {
    const c = s.clans[def.id]!;
    const cultivating = def.kind === 'cultivation' || def.kind === 'yeu';
    for (let i = 0; i < def.size; i++) {
      // The first member is the head: older and, in cultivating clans, stronger.
      const realm = !cultivating ? (i === 0 && def.kind === 'martial' && sim.rng.chance(0.3) ? 1 : 0)
        : i === 0 ? sim.rng.int(2, 3) : sim.rng.chance(0.4) ? sim.rng.int(1, 2) : 0;
      const [lo, hi] = i === 0 ? [Math.max(35, AGE_BY_REALM[realm]![0]), AGE_BY_REALM[realm]![1]] : realm ? AGE_BY_REALM[realm]! : [0, 60];
      const age = sim.rng.int(lo, hi);
      const a = sim.createAvatar({
        regionId: def.seat, birthMonth: -age * 12 - sim.rng.int(0, 11), clanId: def.id,
        race: def.kind === 'yeu' ? 'yeu' : 'human',
        rootedChance: cultivating || realm > 0 ? 1 : 0,
      });
      if (realm > 0) {
        if (!c.technique && a.technique) c.technique = { ...a.technique };
        a.technique ??= c.technique ? { ...c.technique } : sim.pickTechnique(1, a.elements);
        a.realm = realm;
        a.stage = sim.rng.int(0, REALMS[realm]!.stages.length - 1);
        a.linhThach = sim.rng.int(20, 200) * realm;
      }
      if (i === 0) {
        c.headId = a.id;
        a.titles.push(headTitle(c));
        a.renown += 20;
      }
    }
    if (!c.technique && cultivating) {
      const m = clanMembers(sim, def.id).find((x) => x.technique);
      if (m?.technique) c.technique = { ...m.technique };
    }
  }
}

function pickHeir(sim: Sim, c: ClanState, members: Avatar[]): Avatar | undefined {
  const adults = members.filter((m) => sim.age(m) >= 16);
  const pool = adults.length ? adults : members;
  return pool.slice().sort((x, y) => sim.power(y) + sim.age(y) * 0.5 - (sim.power(x) + sim.age(x) * 0.5))[0];
}

export function setHead(sim: Sim, c: ClanState, a: Avatar): void {
  const old = sim.get(c.headId);
  if (old) old.titles = old.titles.filter((t) => t !== headTitle(c));
  c.headId = a.id;
  if (!a.titles.includes(headTitle(c))) a.titles.push(headTitle(c));
  a.renown += 10;
  if (sim.isPlayer(a)) {
    const n = sim.s.soul.counters;
    n.clanHead = (n.clanHead ?? 0) + 1;
    sim.storyFlag(a, 'clan_head');
  }
}

export function phaseClans(sim: Sim): void {
  if (sim.month % 12 !== 0 || !sim.s.clans) return;
  const living = sim.living();
  const clans = Object.values(sim.s.clans).filter((c) => c.extinctMonth === null);
  const byClan: Record<string, Avatar[]> = {};
  for (const a of living) if (a.clanId) (byClan[a.clanId] ??= []).push(a);

  for (const c of clans) {
    const members = byClan[c.id] ?? [];
    if (!members.length) {
      c.extinctMonth = sim.month;
      c.headId = null;
      sim.log('world', `${c.name} tuyệt tự. Từ đường ở ${REGION_BY_ID[c.seat]!.name} không còn ai thắp hương.`, [], { regionId: c.seat, major: true });
      continue;
    }
    // Succession.
    const head = sim.get(c.headId);
    if (!head || !head.alive || head.clanId !== c.id) {
      const heir = pickHeir(sim, c, members)!;
      setHead(sim, c, heir);
      sim.log('world', c.kind === 'royal'
        ? `${heir.name} lên ngôi hoàng đế Đại Hạ.`
        : `${heir.name} (${sim.realmLabel(heir)}) lên làm ${c.kind === 'yeu' ? 'tộc trưởng' : 'gia chủ'} ${c.name}.`, [heir.id], { regionId: c.seat, major: c.kind === 'royal' || members.length >= 4 });
      const me = members.find((m) => sim.isPlayer(m));
      if (me && me !== heir && sim.age(me) >= 16 && sim.power(me) >= sim.power(heir) * 0.6) {
        offerToPlayer(sim, {
          kind: 'offer',
          prompt: c.kind === 'royal'
            ? `Tiên đế băng hà. Triều thần ủng hộ ${heir.name} nối ngôi. Ngươi cũng mang huyết thống ${c.surname} thị: tranh ngôi nghĩa là đổ máu.`
            : `Ghế ${c.kind === 'yeu' ? 'tộc trưởng' : 'gia chủ'} ${c.name} bỏ trống. Tộc lão chọn ${heir.name} (${sim.realmLabel(heir)}). Theo tộc quy, ai không phục phải thắng người được chọn một trận trước từ đường.`,
          options: [
            { id: 'accept', label: c.kind === 'royal' ? `Tranh ngôi với ${heir.name}` : `Tranh chức với ${heir.name}`, hint: 'Thua có thể trọng thương, hiếm khi mất mạng' },
            { id: 'decline', label: `Ủng hộ ${heir.name}` },
          ],
          data: { offer: 'clan_head', clan: c.id, rival: heir.id },
        });
      }
    }
    // Clan life: arranged matches, merchant stipends, the clan technique for children with a spirit root.
    for (const m of members) {
      if (!m.alive) continue;
      if (members.length < CLAN.matchBelow && sim.age(m) >= 18 && sim.age(m) <= (m.realm ? sim.lifespan(m) * 0.4 : 35)
        && !sim.relationOf(m, 'partner') && sim.rng.chance(CLAN.matchChance)) arrangeMatch(sim, c, m);
      if (c.kind === 'merchant' && sim.age(m) >= 16) m.linhThach += CLAN.merchantStipend;
      if (c.technique && !m.technique && sim.rootTier(m) > 0 && sim.age(m) >= 10) {
        m.technique = { ...c.technique };
        if (sim.isPlayer(m)) sim.log('fortune', `${m.name} được truyền gia truyền nội công ${c.technique.name} của ${c.name}.`, [m.id], { regionId: m.regionId });
      }
    }
    if (members.length <= 2) adopt(sim, c, members);
    c.prestige = Math.round(members.reduce((sum, m) => sum + sim.power(m) + m.renown, 0));
  }

  // Stances, feuds and marriages between clans of the same world.
  for (let i = 0; i < clans.length; i++) {
    for (let j = i + 1; j < clans.length; j++) {
      const x = clans[i]!;
      const y = clans[j]!;
      if (x.extinctMonth !== null || y.extinctMonth !== null || clanWorld(x) !== clanWorld(y)) continue;
      const stance = Math.max(-100, Math.min(100, (x.relations[y.id] ?? 0) + sim.rng.range(-4, 4)));
      x.relations[y.id] = y.relations[x.id] = stance;
      if (stance < CLAN.feudBelow && sim.rng.chance(0.35)) feud(sim, x, y, byClan);
      else if (stance > CLAN.allyAbove && sim.rng.chance(0.2)) marriage(sim, x, y, byClan);
    }
  }

  foundClans(sim, living);
}

/** A thinning clan takes in a child of the town as its own (con nuôi), surname and all. */
function adopt(sim: Sim, c: ClanState, members: Avatar[]): void {
  const race = c.kind === 'yeu' ? 'yeu' : 'human';
  const kids = (sim.byRegion[c.seat] ?? []).filter((a) => a.alive && !a.clanId && !sim.isPlayer(a) && sim.age(a) >= 3 && sim.age(a) <= 16 && (a.race ?? 'human') === race);
  if (!kids.length || !sim.rng.chance(0.5)) return;
  const k = sim.rng.pick(kids);
  k.clanId = c.id;
  k.name = `${c.surname} ${givenName(k.name)}`;
  const parent = members[0];
  if (parent) sim.relate(k, parent, 'parent', 'child', 60);
  sim.log('relation', `${c.name} người thưa thớt, nhận ${k.name} làm con nuôi để giữ hương hỏa.`, [k.id], { regionId: c.seat, major: c.kind === 'royal' });
}

/** The clan finds a member a spouse from outside: a new face in the same town. */
function arrangeMatch(sim: Sim, c: ClanState, m: Avatar): void {
  const age = Math.max(16, sim.age(m) + sim.rng.int(-6, 4));
  const o = sim.createAvatar({
    regionId: m.regionId, birthMonth: sim.month - age * 12 - sim.rng.int(0, 11),
    gender: m.gender === 'male' ? 'female' : 'male', originId: m.originId === 'royal' ? 'merchant' : m.originId, race: m.race ?? 'human',
    rootedChance: m.realm > 0 ? 1 : 0,
  });
  o.clanId = null;
  if (m.realm > 0) {
    o.technique ??= sim.pickTechnique(1, o.elements);
    o.realm = Math.max(1, m.realm - sim.rng.int(0, 1));
    o.stage = sim.rng.int(0, REALMS[o.realm]!.stages.length - 1);
  }
  if (sim.isPlayer(m)) {
    offerToPlayer(sim, {
      kind: 'offer',
      prompt: `Trưởng bối ${c.name} đã chọn cho ngươi một mối: ${o.name} (${sim.realmLabel(o)}, ${sim.age(o)} tuổi), con nhà tử tế ở ${REGION_BY_ID[o.regionId]!.name}.`,
      options: [{ id: 'accept', label: 'Nghe theo trưởng bối' }, { id: 'decline', label: 'Tự quyết hôn sự của mình' }],
      data: { offer: 'partner', other: o.id },
    });
    return;
  }
  sim.relate(m, o, 'partner', 'partner', 55);
  if (m.realm >= 2 || m.id === c.headId) sim.log('relation', `${c.name} cưới cho ${m.name} một ${o.gender === 'female' ? 'người vợ' : 'người chồng'}: ${o.name}.`, [m.id, o.id], { regionId: m.regionId });
}

function feud(sim: Sim, x: ClanState, y: ClanState, byClan: Record<string, Avatar[]>): void {
  const fighters = (c: ClanState) => (byClan[c.id] ?? []).filter((m) => m.alive && sim.age(m) >= 16 && m.injuredUntil <= sim.month);
  const A = fighters(x);
  const B = fighters(y);
  if (!A.length || !B.length) return;
  const a = sim.rng.pick(A);
  const b = sim.rng.pick(B);
  const res = duel(sim, a, b, 0.12);
  x.relations[y.id] = y.relations[x.id] = Math.max(-100, (x.relations[y.id] ?? 0) - 5);
  const winClan = res.winner === a ? x : y;
  if (res.killed) {
    sim.kill(res.loser, 'battle', `Chết trong mối thù giữa ${x.name} và ${y.name}, dưới tay ${res.winner.name}`, res.winner);
    sim.log('war', `Thù cũ giữa ${x.name} và ${y.name} lại bùng lên. ${res.winner.name} giết ${res.loser.name}. ${winClan.name} mở tiệc, bên kia treo khăn tang.`, [a.id, b.id], { regionId: a.regionId, major: true });
  } else {
    sim.log('battle', `Người ${x.name} và ${y.name} chạm mặt ở ${REGION_BY_ID[a.regionId]!.name}. ${res.winner.name} đánh ${res.loser.name} trọng thương.`, [a.id, b.id], { regionId: a.regionId });
  }
}

function marriage(sim: Sim, x: ClanState, y: ClanState, byClan: Record<string, Avatar[]>): void {
  const single = (c: ClanState) => (byClan[c.id] ?? []).filter((m) => m.alive && sim.age(m) >= 16 && sim.age(m) <= 40 + 60 * m.realm && !sim.relationOf(m, 'partner'));
  const A = single(x);
  const B = single(y);
  for (const a of A) {
    const b = B.find((o) => o.gender !== a.gender && Math.abs(o.realm - a.realm) <= 1 && (o.race ?? 'human') === (a.race ?? 'human'));
    if (!b) continue;
    const player = sim.isPlayer(a) ? a : sim.isPlayer(b) ? b : undefined;
    if (player) {
      const other = player === a ? b : a;
      const theirs = player === a ? y : x;
      offerToPlayer(sim, {
        kind: 'offer',
        prompt: `Gia chủ muốn kết thông gia với ${theirs.name}. Bên ấy gả ${other.name} (${sim.realmLabel(other)}, ${sim.age(other)} tuổi) cho ngươi.`,
        options: [{ id: 'accept', label: 'Nghe theo gia tộc' }, { id: 'decline', label: 'Cự tuyệt', hint: 'Gia tộc sẽ phật ý' }],
        data: { offer: 'clan_marriage', other: other.id, a: x.id, b: y.id },
      });
      return;
    }
    sim.relate(a, b, 'partner', 'partner', 50);
    x.relations[y.id] = y.relations[x.id] = Math.min(100, (x.relations[y.id] ?? 0) + 10);
    sim.log('relation', `${x.name} và ${y.name} kết thông gia: ${a.name} thành thân với ${b.name}. Kiệu hoa đi suốt ba con phố.`, [a.id, b.id], { regionId: a.regionId, major: x.kind === 'royal' || y.kind === 'royal' });
    return;
  }
}

/** A Tông sư cultivator with living children, outside any clan, may found one. */
function foundClans(sim: Sim, living: Avatar[]): void {
  const open = Object.values(sim.s.clans!).filter((c) => c.extinctMonth === null).length;
  if (open >= CLAN.max) return;
  for (const a of living) {
    if (a.clanId || a.realm < CLAN.foundRealm) continue;
    const kids = Object.entries(a.relations).filter(([, r]) => r.kind === 'child').map(([id]) => sim.get(Number(id))).filter((k): k is Avatar => !!k?.alive);
    if (!kids.length) continue;
    if (sim.isPlayer(a)) {
      if (sim.s.soul.story.flags.clan_offer) continue;
      sim.s.soul.story.flags.clan_offer = true;
      offerToPlayer(sim, {
        kind: 'offer',
        prompt: `${a.name} đã là ${sim.realmLabel(a)}, con cháu đủ đầy. Có người khuyên ngươi khai tông lập tộc, dựng từ đường cho hậu thế.`,
        options: [{ id: 'accept', label: 'Lập gia tộc' }, { id: 'decline', label: 'Không cần' }],
        data: { offer: 'found_clan' },
      });
      continue;
    }
    if (!sim.rng.chance(0.03)) continue;
    foundClan(sim, a, kids);
    return;
  }
}

export function foundClan(sim: Sim, a: Avatar, kids: Avatar[], opts: { kind?: ClanKind; seat?: string; name?: string; silent?: boolean } = {}): ClanState {
  const clans = sim.s.clans!;
  const surname = surnameOf(a.name);
  const yeu = a.race === 'yeu';
  const kind: ClanKind = opts.kind ?? (yeu ? 'yeu' : a.realm >= 1 ? 'cultivation' : 'martial');
  const region = REGION_BY_ID[a.regionId]!;
  const seat = opts.seat ?? (region.population > 0 && region.kind !== 'sect' ? region.id
    : REGION_BY_ID[a.bornRegion]!.population > 0 && REGION_BY_ID[a.bornRegion]!.kind !== 'sect' ? a.bornRegion : WORLDS[region.world].entry);
  let n = 1;
  while (clans[`clan_${n}`]) n += 1;
  const taken = Object.values(clans).some((c) => c.extinctMonth === null && c.surname === surname);
  const name = opts.name ?? `${surname} ${yeu ? 'tộc' : 'gia'}${taken ? ` ở ${REGION_BY_ID[seat]!.name}` : ''}`;
  const c: ClanState = {
    id: `clan_${n}`, name, surname, kind, seat, headId: a.id, prestige: 0, relations: {},
    foundedMonth: sim.month, extinctMonth: null, technique: a.technique ? { ...a.technique } : null,
  };
  clans[c.id] = c;
  a.clanId = c.id;
  for (const k of kids) k.clanId = c.id;
  setHead(sim, c, a);
  if (sim.isPlayer(a)) {
    const cnt = sim.s.soul.counters;
    cnt.clanFounded = (cnt.clanFounded ?? 0) + 1;
  }
  if (!opts.silent) sim.log('world', `${a.name} (${sim.realmLabel(a)}) khai tông lập tộc ở ${REGION_BY_ID[seat]!.name}: ${name} ra đời, ${CLAN_KIND_NAMES[kind].toLowerCase()} mới của ${WORLDS[REGION_BY_ID[seat]!.world].name}.`, [a.id], { regionId: seat, major: true });
  return c;
}
