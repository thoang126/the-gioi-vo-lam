import { describe, expect, it } from 'vitest';
import { advance, createWorld, LHVK, REALMS, SECTS, Sim, TECHNIQUES, sealOf } from '../src/index';
import { ACTION_BY_ID, startAction } from '../src/actions';
import { BATTLE_CONTENT } from '../src/battle-engine/content';
import { knows, learnSkill, skillById, skillLabel } from '../src/martial';
import { SECT_ARTS, SKILL_KINDS, SKILLS_BY_RANK, WANDERER_SKILLS } from '../src/content/wuxia';
import { stillCultivation } from '../tools/wuxia-text';

describe('võ công content', () => {
  it('gives every sect its nội công and võ công, all of which exist', () => {
    expect(new Set(SECTS.map((s) => s.id)).size).toBe(SECTS.length);
    for (const def of SECTS) {
      const arts = SECT_ARTS[def.id];
      expect(arts, def.id).toBeDefined();
      expect(TECHNIQUES.some((t) => t.name === arts!.technique), arts!.technique).toBe(true);
      expect(BATTLE_CONTENT.techniques.some((t) => t.name === arts!.technique), arts!.technique).toBe(true);
      for (const id of arts!.skills) expect(skillById(id), `${def.id}: ${id}`).toBeDefined();
      // Only the last võ công of a sect may be its tuyệt kỹ.
      expect(arts!.skills.slice(0, -1).some((id) => skillById(id)!.ultimate)).toBe(false);
    }
    for (const id of WANDERER_SKILLS) expect(skillById(id)).toBeDefined();
  });

  it('names every võ công once and gives it a môn loại', () => {
    const names = BATTLE_CONTENT.skills.map((k) => k.name);
    expect(new Set(names).size).toBe(names.length);
    for (const k of BATTLE_CONTENT.skills) expect(SKILL_KINDS[k.id], k.id).toBeDefined();
    expect(skillLabel('Liệt Phong Kiếm Pháp')).toBe('Liệt Phong Kiếm Pháp (kiếm pháp, thượng thừa)');
  });

  it('reads as võ hiệp: realm names and the imported events carry no tu tiên words', () => {
    expect(REALMS.map((r) => r.name).slice(0, 5)).toEqual(['Người thường', 'Tam lưu', 'Nhị lưu', 'Nhất lưu', 'Tuyệt đỉnh']);
    for (const e of LHVK.events) expect(stillCultivation(JSON.stringify(e)), e.id).toBeNull();
    // Event võ công and nội công still resolve to things a fight can use.
    for (const s of Object.values(LHVK.skills)) expect(BATTLE_CONTENT.skills.some((k) => k.name === s.name), s.name).toBe(true);
  });
});

describe('võ công in the world', () => {
  const s = createWorld(21, { autoplay: true, warmupYears: 5 });
  const sim = new Sim(s);

  it('hands each sect member the arts of their rank', () => {
    for (const a of sim.living().filter((x) => x.sectId && x.sectRank && sim.rootTier(x) > 0)) {
      const arts = SECT_ARTS[a.sectId!]!;
      const n = Math.min(arts.skills.length, SKILLS_BY_RANK[a.sectRank!]!);
      for (const id of arts.skills.slice(0, n)) expect(knows(a, id), `${a.name} ${a.sectRank} ${id}`).toBe(true);
    }
    const leader = sim.get(s.sects.kim_dao!.leaderId)!;
    expect(knows(leader, 'kim_dao_doan_hon')).toBe(true);
  });

  it('takes a tuyệt kỹ into battle before lesser võ công', () => {
    const leader = sim.get(s.sects.kim_dao!.leaderId)!;
    expect(sealOf(sim, leader).skills[0]).toBe('kim_dao_doan_hon');
  });

  it('teaches a paying pupil at the võ quán', () => {
    const w = createWorld(22, { warmupYears: 20 });
    const ws = new Sim(w);
    const a = ws.get(w.soul.currentAvatarId)!;
    Object.assign(a, { birthMonth: w.month - 20 * 12, sectId: null, sectRank: null, skills: [], linhThach: 100, action: null });
    w.soul.pending = null;
    startAction(ws, a, ACTION_BY_ID.hoc_vo!);
    for (let i = 0; i < 24 && a.action?.id === 'hoc_vo'; i++) {
      advance(w, 1);
      if (w.soul.pending) w.soul.pending = null;
    }
    expect(a.skills.length).toBe(1);
    expect(WANDERER_SKILLS.some((id) => knows(a, id))).toBe(true);
    expect(a.linhThach).toBe(85);
  });

  it('lets masters pass their võ công to disciples over the years', () => {
    const w = createWorld(23, { autoplay: true, warmupYears: 5 });
    advance(w, 60 * 12);
    const ws = new Sim(w);
    // Disciples who know more of their master's võ công than their sect rank alone grants.
    const taught = ws.living().filter((a) => {
      const m = ws.relationOf(a, 'master');
      if (!m || !a.sectId || !a.sectRank) return false;
      const granted = new Set(SECT_ARTS[a.sectId]!.skills.slice(0, SKILLS_BY_RANK[a.sectRank]!).map((id) => skillById(id)!.name));
      return a.skills.some((n) => m.skills.includes(n) && !granted.has(n));
    });
    expect(taught.length).toBeGreaterThan(0);
  });

  it('records the player\'s võ công in Kiếp Sách', () => {
    const w = createWorld(24, { warmupYears: 20 });
    const ws = new Sim(w);
    const a = ws.get(w.soul.currentAvatarId)!;
    expect(learnSkill(ws, a, 'truong_quyen', 'học')).toBe(true);
    expect(learnSkill(ws, a, 'truong_quyen', 'học')).toBe(false);
    expect(w.soul.codex.skills).toContain('truong_quyen');
  });
});
