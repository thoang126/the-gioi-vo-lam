// Who the people of the world are beyond their stats: traits (LHVK birth/traits.yaml), the Cổ tộc,
// and the great clans (gia tộc, thế gia).
import { LHVK, type Modifiers, type StatKey } from './lhvk';
import { NAMES } from './cultivation';
import type { WorldId } from './world';

export interface TraitDef {
  id: string; name: string; kind: 'talent' | 'flaw'; description: string; weight: number;
  statMods?: Partial<Record<StatKey, number>>; startFlags?: string[]; excludes?: string[];
  modifiers?: Modifiers & { childMortalityMult?: number; revealOdds?: boolean };
}

export const TRAITS = (LHVK as unknown as { traits: TraitDef[] }).traits;
/** P(0 traits), P(1), P(2). */
export const TRAIT_COUNT = (LHVK as unknown as { traitCount: number[] }).traitCount;
export const TRAIT_BY_ID: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

// ---- Cổ tộc --------------------------------------------------------------------------------

export type Race = 'human' | 'yeu';
/** Share of births in Nam Cương that are Cổ tộc. */
export const YEU_BIRTH_CHANCE = 0.9;
/** Cổ tộc live as long as anyone else (the tu tiên game's yêu tộc lived 1.5× longer). */
export const YEU_LIFESPAN_MULT = 1;
export const YEU_SURNAMES = ['Ô Cổ', 'Ba Sơn', 'Hắc Thủy', 'Xích Mộc', 'Lăng Vân', 'Thạch Bàn', 'Nham Lạc', 'Tang Cát', 'Mông Đa', 'Già Lam'];

// ---- gia tộc, thế gia -------------------------------------------------------------------------

export type ClanKind = 'royal' | 'martial' | 'cultivation' | 'merchant' | 'yeu';

export interface ClanDef {
  id: string;
  name: string;
  surname: string;
  kind: ClanKind;
  world: WorldId;
  seat: string;
  /** Members at world creation. */
  size: number;
  desc: string;
}

export const CLAN_KIND_NAMES: Record<ClanKind, string> = {
  royal: 'Hoàng tộc', martial: 'Võ lâm thế gia', cultivation: 'Luyện võ thế gia', merchant: 'Thương gia', yeu: 'Cổ tộc',
};

/** Origin a child of each kind of clan is born with. */
export const CLAN_ORIGIN: Record<ClanKind, string> = {
  royal: 'royal', martial: 'martial_clan', cultivation: 'cultivator_clan', merchant: 'merchant', yeu: 'commoner',
};

export const CLANS: ClanDef[] = [
  { id: 'ha', name: 'Hạ thị hoàng tộc', surname: 'Hạ', kind: 'royal', world: 'mortal', seat: 'kinh_thanh', size: 8, desc: 'Dòng họ trị vì Đại Hạ ba trăm năm, ngai vàng chưa bao giờ yên.' },
  { id: 'mo_dung', name: 'Mộ Dung thế gia', surname: 'Mộ Dung', kind: 'martial', world: 'mortal', seat: 'bien_ai', size: 7, desc: 'Đao pháp gia truyền, đời nào cũng có người chết nơi biên ải.' },
  { id: 'thuong_quan', name: 'Thượng Quan thế gia', surname: 'Thượng Quan', kind: 'martial', world: 'mortal', seat: 'lang_que', size: 6, desc: 'Kiếm pháp nhẹ như mây, ân oán với Mộ Dung gia đã bốn đời.' },
  { id: 'dong_phuong', name: 'Đông Phương thương hội', surname: 'Đông Phương', kind: 'merchant', world: 'mortal', seat: 'ben_cang', size: 6, desc: 'Nắm nửa số thuyền buôn qua biển Đông.' },
  { id: 'lam', name: 'Lâm gia', surname: 'Lâm', kind: 'cultivation', world: 'cultivation', seat: 'chan_nui', size: 7, desc: 'Luyện võ thế gia lâu đời dưới chân Thanh Vân sơn, con cháu nhiều người vào Thanh Vân kiếm phái.' },
  { id: 'diep', name: 'Diệp gia', surname: 'Diệp', kind: 'cultivation', world: 'cultivation', seat: 'phuong_thi', size: 6, desc: 'Giữ một long mạch nhỏ và nhiều bí mật về đan đạo.' },
  { id: 'tieu', name: 'Tiêu gia thương hội', surname: 'Tiêu', kind: 'merchant', world: 'cultivation', seat: 'phuong_thi', size: 5, desc: 'Chủ trì đấu giá ở Phường thị, giàu tới mức môn phái cũng phải nể.' },
  { id: 'han', name: 'Hàn gia hải ngoại', surname: 'Hàn', kind: 'cultivation', world: 'overseas', seat: 'dao_tan_tu', size: 5, desc: 'Tổ tiên trốn nạn ra đảo, nay là thế lực lớn nhất Hải ngoại.' },
  { id: 'mac', name: 'Mạc gia', surname: 'Mạc', kind: 'cultivation', world: 'demonic', seat: 'huyet_uyen', size: 6, desc: 'Ma đạo thế gia, luyện huyết công, con cháu giết nhau tranh quyền nối dõi.' },
  { id: 'thanh_khau', name: 'Hắc Thủy bộ', surname: 'Hắc Thủy', kind: 'yeu', world: 'demon_beast', seat: 'hoa_hinh', size: 6, desc: 'Bộ tộc lâu đời nhất Nam Cương, nuôi cổ bằng nước suối đen, người ngoài uống nhầm là mất mạng.' },
  { id: 'kim_bang', name: 'Xích Mộc bộ', surname: 'Xích Mộc', kind: 'yeu', world: 'demon_beast', seat: 'yeu_thi', size: 5, desc: 'Bộ tộc thợ săn trên núi đỏ, bắn tên tẩm độc trăm phát trăm trúng.' },
];

/** Starting stances between clans (−100…100); unlisted pairs start at 0. */
export const CLAN_RELATIONS: [string, string, number][] = [
  ['mo_dung', 'thuong_quan', -70], ['lam', 'diep', -30], ['ha', 'dong_phuong', 40], ['lam', 'tieu', 30],
  ['thanh_khau', 'kim_bang', -40], ['ha', 'mo_dung', 30],
];

/**
 * Dynasties of Đại Hạ. Yearly fall hazard follows a Weibull curve (rises with age): with these numbers
 * an untroubled dynasty lasts about 350 years, a typical one a little over 300, rarely under 100. Weak reigns fall sooner.
 */
export const DYNASTY = {
  scaleYears: 430,
  shape: 2.6,
  /** Hazard multipliers. */
  childEmperor: 1.3,
  /** Royal house with fewer living members than this. */
  fewHeirsBelow: 3,
  fewHeirs: 1.3,
  /** Another clan of Đại Hạ this many times as strong as the royal house. */
  strongerClanRatio: 2.5,
  strongerClan: 1.3,
  /** A house raised from nothing comes with this many kin (spouse, children, brothers). */
  founderKin: 4,
  /** Age of the reigning dynasty at world creation. */
  startAge: [40, 240] as [number, number],
  /** Weights of how a dynasty falls, before the world's state adjusts them. */
  endWeights: { usurp: 3, rebellion: 2.5, invasion: 1.5, cultivator: 1, abdication: 0.6 },
  /** Share of the old royal house killed after the fall, by cause. */
  purge: { usurp: 0.5, rebellion: 0.4, invasion: 0.5, cultivator: 0.3, abdication: 0, extinct: 0, restoration: 0.5 },
};

export const DYNASTY_END_NAMES: Record<string, string> = {
  usurp: 'Quyền thần soán ngôi', rebellion: 'Khởi nghĩa nông dân', invasion: 'Ngoại xâm', cultivator: 'Võ nhân nhúng tay',
  abdication: 'Thiện nhượng', extinct: 'Tuyệt tự', restoration: 'Phục quốc',
};

export const CLAN = {
  /** Most clans that may exist at once (new ones are founded by Tông sư cultivators). */
  max: 16,
  /** Realm needed to found a clan. */
  foundRealm: 3,
  /** Yearly lượng bạc a merchant clan gives each adult member. */
  merchantStipend: 15,
  /** Yearly P(the clan arranges a match for an unmarried adult member). */
  matchChance: 0.2,
  /** Clans this large stop arranging matches. */
  matchBelow: 12,
  /** P(a newcomer born at a clan's seat belongs to a branch of it). */
  branchBirth: 0.12,
  /** Stance below which two clans feud. */
  feudBelow: -60,
  /** Stance above which two clans arrange marriages. */
  allyAbove: 40,
};

/** All surnames, longest first, so "Mộ Dung Phong" splits as Mộ Dung + Phong. */
export const ALL_SURNAMES = [...new Set([...NAMES.surnames, ...YEU_SURNAMES, ...CLANS.map((c) => c.surname)])].sort((a, b) => b.length - a.length);

export function surnameOf(name: string): string {
  return ALL_SURNAMES.find((s) => name.startsWith(s + ' ')) ?? name.split(' ')[0]!;
}

export function givenName(name: string): string {
  return name.slice(surnameOf(name).length).trim();
}
