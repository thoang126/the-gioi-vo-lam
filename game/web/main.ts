import {
  advance, choose, createWorld, setAutoplay, Sim, YEAR_OFFSET, ACTION_BY_ID, MEMORIES,
  REGIONS, ROUTES, SEA_ROUTE, SECTS, SECT_RANKS, REALMS, WORLDS, ELEMENT_NAMES,
  REGION_BY_ID, SECT_BY_ID, ROOT_BY_ID, ORIGIN_BY_ID, PHYSIQUE_BY_ID, relationWord,
} from '../src/index';
import type { Avatar, WorldEvent, WorldState } from '../src/types';

const SAVE_KEY = 'van-kiep-thien-ha/save';
const TICK_MS = 250;

type Tab = 'news' | 'sects' | 'people' | 'here' | 'profile' | 'lives';
const ui = {
  running: true,
  speed: 3,
  tab: 'news' as Tab,
  region: null as string | null,
  avatar: null as number | null,
  dirty: true,
};
let s: WorldState = loadOrCreate();

function loadOrCreate(): WorldState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorldState;
      if (parsed.version === 1) return parsed;
    }
  } catch { /* storage unavailable */ }
  return createWorld(Math.floor(Math.random() * 2 ** 31));
}

function save(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const yearOf = (m: number) => YEAR_OFFSET + Math.floor(m / 12);
const SPEEDS = [
  { label: '1 tháng / nhịp', months: 1 },
  { label: '3 tháng / nhịp', months: 3 },
  { label: '1 năm / nhịp', months: 12 },
  { label: '5 năm / nhịp', months: 60 },
];

// ---- rendering ------------------------------------------------------------------------------

function render(): void {
  const sim = new Sim(s);
  sim.reindex();
  const app = document.getElementById('app')!;
  const scrollers = [...app.querySelectorAll<HTMLElement>('[data-scroll]')].map((el) => [el.dataset.scroll!, el.scrollTop] as const);
  app.innerHTML = `
    ${header(sim)}
    <p class="intro">Thế giới Luân Hồi Vạn Kiếp tự vận hành: tông môn tuyển đệ tử, khai chiến, tu sĩ đột phá, chết và để lại bia mộ. Ngươi chỉ là một linh hồn trong đó. Chết rồi, ngươi đầu thai lại vào chính thế giới ấy, và có thể gặp lại những người của kiếp trước.</p>
    <div class="main">
      <div class="col">
        <div class="map-wrap">${mapSvg(sim)}</div>
        <div>
          <div class="tabs" role="tablist">${tabButton('news', 'Tin giang hồ')}${tabButton('sects', 'Tông môn')}${tabButton('people', 'Cao thủ')}${tabButton('here', ui.region ? REGION_BY_ID[ui.region]!.name : 'Địa danh')}${ui.avatar ? tabButton('profile', 'Hồ sơ') : ''}${tabButton('lives', 'Tiền kiếp')}</div>
          <div class="tabpanel" data-scroll="tab">${tabContent(sim)}</div>
        </div>
      </div>
      <div class="col player-col">
        ${choiceCard(sim)}
        ${playerCard(sim)}
        <div class="card"><div class="eyebrow">Biên niên kiếp này</div><div class="tabpanel" data-scroll="chron">${chronicle(sim)}</div></div>
      </div>
    </div>`;
  for (const [key, top] of scrollers) {
    const el = app.querySelector<HTMLElement>(`[data-scroll="${key}"]`);
    if (el) el.scrollTop = top;
  }
  ui.dirty = false;
}

function header(sim: Sim): string {
  const waiting = s.soul.pending !== null;
  return `<header class="bar">
    <div class="brand"><h1>Vạn Kiếp Thiên Hạ</h1><span class="date">Năm ${yearOf(s.month)} · tháng ${(s.month % 12) + 1}</span></div>
    <div class="controls">
      <button class="btn primary" data-act="toggle" ${waiting ? 'disabled' : ''}>${waiting ? 'Chờ ngươi quyết' : ui.running ? 'Tạm dừng' : 'Cho thời gian trôi'}</button>
      <select class="btn" id="speed" aria-label="Tốc độ">${SPEEDS.map((sp, i) => `<option value="${i}" ${i === ui.speed ? 'selected' : ''}>${sp.label}</option>`).join('')}</select>
      <label class="toggle"><input type="checkbox" id="autoplay" ${s.soul.autoplay ? 'checked' : ''}> Tự quyết</label>
      <button class="btn" data-act="save">Lưu</button>
      <button class="btn" data-act="new">Thế giới mới</button>
    </div>
    <span class="small muted">${sim.living().length} người đang sống · ${s.graves.length} bia mộ</span>
  </header>`;
}

function tabButton(id: Tab, label: string): string {
  return `<button class="tab" role="tab" aria-selected="${ui.tab === id}" data-tab="${id}">${esc(label)}</button>`;
}

const LAND_DAI_HA = 'M20 30 C110 12 250 18 360 42 C420 56 452 110 446 180 C440 240 470 300 430 360 C392 420 330 470 250 500 C170 528 80 520 30 480 C10 420 14 340 22 260 C28 180 12 100 20 30 Z';
const LAND_THANH_VAN = 'M610 48 C700 20 840 16 960 38 C984 110 978 200 986 280 C990 360 970 440 930 500 C850 532 740 528 660 500 C610 460 596 390 604 320 C612 250 586 180 596 120 C600 90 600 70 610 48 Z';

function mapSvg(sim: Sim): string {
  const player = sim.get(s.soul.currentAvatarId);
  const routes = ROUTES.map(([a, b]) => {
    const A = REGION_BY_ID[a]!;
    const B = REGION_BY_ID[b]!;
    const sea = (a === SEA_ROUTE[0] && b === SEA_ROUTE[1]) || (a === SEA_ROUTE[1] && b === SEA_ROUTE[0]);
    return `<line class="route${sea ? ' sea' : ''}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  }).join('');
  const wars: string[] = [];
  for (const st of Object.values(s.sects)) {
    for (const other of Object.keys(st.wars)) {
      if (other < st.id) continue;
      const A = REGION_BY_ID[SECT_BY_ID[st.id]!.regionId]!;
      const B = REGION_BY_ID[SECT_BY_ID[other]!.regionId]!;
      wars.push(`<path class="war-line" d="M${A.x} ${A.y} Q${(A.x + B.x) / 2 + 60} ${(A.y + B.y) / 2} ${B.x} ${B.y}"/>`);
    }
  }
  const graves: Record<string, number> = {};
  for (const g of s.graves) graves[g.regionId] = (graves[g.regionId] ?? 0) + 1;
  const regions = REGIONS.map((r) => {
    const n = (sim.byRegion[r.id] ?? []).length;
    const rad = 4 + Math.min(10, Math.sqrt(n) * 1.4);
    const cls = ['region', r.kind === 'beast' || r.kind === 'ruin' || r.kind === 'cave' || r.kind === 'secret' ? 'wild' : '', r.sectId ? 'sect' : '', r.sectId && SECT_BY_ID[r.sectId]!.alignment === 'evil' ? 'evil' : '', ui.region === r.id ? 'sel' : ''].join(' ');
    const anchorEnd = r.x > 900;
    const tx = anchorEnd ? r.x - rad - 4 : r.x + rad + 4;
    const sub = [n ? `${n} người` : '', graves[r.id] ? `${graves[r.id]} mộ` : ''].filter(Boolean).join(' · ');
    const secret = r.kind === 'secret' && s.secretRealmOpenUntil > s.month ? `<circle class="secret-ring" cx="${r.x}" cy="${r.y}" r="${rad + 7}"/>` : '';
    const me = player && player.regionId === r.id
      ? `<circle class="player-ring" cx="${r.x}" cy="${r.y}" r="${rad + 5}"/><text class="player-tag" x="${r.x}" y="${r.y - rad - 9}" text-anchor="middle">ngươi</text>` : '';
    return `<g class="${cls}" data-region="${r.id}" tabindex="0" role="button" aria-label="${esc(r.name)}">
      ${secret}<circle class="dot" cx="${r.x}" cy="${r.y}" r="${rad}"/>${me}
      <text x="${tx}" y="${r.y + 4}" text-anchor="${anchorEnd ? 'end' : 'start'}">${esc(r.name)}</text>
      ${sub ? `<text class="count" x="${tx}" y="${r.y + 17}" text-anchor="${anchorEnd ? 'end' : 'start'}">${sub}</text>` : ''}
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 1000 540" role="img" aria-label="Bản đồ Đại Hạ và Thanh Vân châu">
    <path class="land" d="${LAND_DAI_HA}"/><path class="land" d="${LAND_THANH_VAN}"/>
    <text class="region-label-big" x="230" y="280" text-anchor="middle" font-size="40">ĐẠI HẠ</text>
    <text class="region-label-big" x="790" y="330" text-anchor="middle" font-size="30">THANH VÂN CHÂU</text>
    <text x="520" y="250" text-anchor="middle" font-size="11" letter-spacing="2" fill="var(--ink-2)" font-family="var(--font-body)">BIỂN ĐÔNG</text>
    ${routes}${wars.join('')}${regions}
  </svg>`;
}

function personLink(a: Avatar | undefined, sim: Sim): string {
  if (!a) return '—';
  return `<button class="linkish" data-avatar="${a.id}">${esc(a.name)}</button> <span class="muted small">${esc(sim.realmLabel(a))}</span>`;
}

function feed(events: WorldEvent[]): string {
  if (!events.length) return '<p class="muted small">Chưa có gì.</p>';
  return `<ul class="feed">${events.map((e) => `<li class="${e.kind}"><span class="yr">${yearOf(e.month)}</span><span class="txt">${esc(e.text)}</span></li>`).join('')}</ul>`;
}

function tabContent(sim: Sim): string {
  switch (ui.tab) {
    case 'news': return feed(s.events.filter((e) => e.major).slice(-60).reverse());
    case 'sects': return sectsTable(sim);
    case 'people': return peopleTable(sim, sim.living().sort((a, b) => sim.power(b) - sim.power(a)).slice(0, 25));
    case 'here': {
      if (!ui.region) return '<p class="muted small">Chạm vào một địa danh trên bản đồ.</p>';
      const r = REGION_BY_ID[ui.region]!;
      const people = (sim.byRegion[r.id] ?? []).slice().sort((a, b) => sim.power(b) - sim.power(a));
      const graves = s.graves.filter((g) => g.regionId === r.id).slice(-12).reverse();
      return `<p class="small"><b>${esc(r.name)}</b> · ${esc(WORLDS[r.world].name)}. ${esc(r.desc)}</p>
        ${peopleTable(sim, people.slice(0, 30))}
        ${graves.length ? `<p class="eyebrow" style="margin-top:12px">Bia mộ</p><ul class="feed">${graves.map((g) => `<li class="${g.soulLife !== null ? 'past_life' : ''}"><span class="yr">${yearOf(g.month)}</span><span class="txt">${esc(g.name)}, ${esc(REALMS[g.realm]!.name)}. ${esc(g.epitaph)}.${g.soulLife !== null ? ` (Kiếp thứ ${g.soulLife + 1} của ngươi)` : ''}</span></li>`).join('')}</ul>` : ''}`;
    }
    case 'profile': return profile(sim, sim.get(ui.avatar));
    case 'lives': return livesView();
  }
}

function sectsTable(sim: Sim): string {
  const rows = SECTS.map((def) => {
    const st = s.sects[def.id]!;
    const members = sim.living().filter((a) => a.sectId === def.id);
    const top = REALMS[Math.max(0, ...members.map((m) => m.realm))]!.name;
    const stance = Object.entries(st.relations).map(([o, v]) => `${SECT_BY_ID[o]!.name}: ${st.wars[o] ? '<b style="color:var(--seal)">đang chiến</b>' : Math.round(v)}`).join('<br>');
    return `<tr><td><b>${esc(def.name)}</b><br><span class="small muted">${def.alignment === 'evil' ? 'Ma đạo' : 'Chính đạo'} · ${esc(REGION_BY_ID[def.regionId]!.name)}</span></td>
      <td class="num">${members.length}</td><td>${personLink(sim.get(st.leaderId), sim)}</td><td>${top}</td><td class="num">${st.prestige}</td><td class="small">${stance}</td></tr>`;
  }).join('');
  return `<div style="overflow-x:auto"><table><thead><tr><th>Tông môn</th><th>Người</th><th>Chưởng môn</th><th>Cao nhất</th><th>Uy thế</th><th>Quan hệ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function peopleTable(sim: Sim, list: Avatar[]): string {
  if (!list.length) return '<p class="muted small">Không có ai ở đây.</p>';
  return `<div style="overflow-x:auto"><table><thead><tr><th>Tên</th><th>Tuổi</th><th>Tông môn</th><th>Đang</th></tr></thead><tbody>${list.map((a) => `
    <tr><td>${personLink(a, sim)}${sim.isPlayer(a) ? ' <b style="color:var(--seal)">(ngươi)</b>' : ''}</td><td class="num">${sim.age(a)}</td>
    <td class="small">${a.sectId ? `${esc(SECT_BY_ID[a.sectId]!.name)}${a.sectRank ? `, ${SECT_RANKS.find((r) => r.id === a.sectRank)!.name}` : ''}` : '—'}</td>
    <td class="small muted">${a.action ? esc(ACTION_BY_ID[a.action.id]?.doing ?? '') : sim.age(a) < 12 ? 'lớn lên' : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

function profile(sim: Sim, a: Avatar | undefined): string {
  if (!a) return '<p class="muted small">Người này đã bị lãng quên.</p>';
  const link = s.soul.pastLinks[a.id];
  return `<div class="card">${avatarBlock(sim, a)}
    ${link ? `<p class="small" style="color:var(--seal)">Kiếp thứ ${link.life + 1}, người này là ${relationWord(link.kind as never)} của ngươi.</p>` : ''}
    <div class="eyebrow">Đời người này</div>${feed(s.events.filter((e) => e.avatarIds.includes(a.id)).slice(-30).reverse())}</div>`;
}

function avatarBlock(sim: Sim, a: Avatar): string {
  const r = REALMS[a.realm]!;
  const root = ROOT_BY_ID[a.rootId]!;
  const age = sim.age(a);
  const ls = sim.lifespan(a);
  const progress = r.rank === 0 ? Math.min(1, a.tuVi / r.stageCost) : Math.min(1, a.tuVi / r.stageCost);
  const rels = Object.entries(a.relations).map(([id, rel]) => ({ o: sim.get(Number(id)), rel })).filter((x) => x.o)
    .sort((x, y) => Number(y.o!.alive) - Number(x.o!.alive)).slice(0, 10);
  const stat = (v: number, label: string) => `<div><b>${v}</b><span>${label}</span></div>`;
  const doing = a.action ? `${ACTION_BY_ID[a.action.id]?.doing ?? ''}${a.action.path?.length ? `, đang trên đường tới ${REGION_BY_ID[a.action.regionId ?? a.regionId]!.name}` : `, còn ${Math.max(0, a.action.endMonth - s.month)} tháng`}` : a.alive ? (age < 12 ? 'đang lớn' : 'đang nghĩ') : '';
  return `<div class="who"><h2>${esc(a.name)}</h2><span class="realm">${esc(sim.realmLabel(a))}</span></div>
    <div class="small muted">${a.gender === 'male' ? 'Nam' : 'Nữ'}, ${age} tuổi · ${a.alive ? esc(REGION_BY_ID[a.regionId]!.name) : `mất năm ${yearOf(a.deathMonth ?? 0)}: ${esc(a.deathText ?? '')}`}${doing ? ` · ${esc(doing)}` : ''}</div>
    ${a.alive && r.rank > 0 ? `<div class="meter"><span>Tu vi ${Math.floor(a.tuVi)} / ${r.stageCost}${sim.readyToBreak(a) ? ' · đủ để đột phá' : ''}</span><div class="track"><span style="width:${(progress * 100).toFixed(1)}%"></span></div></div>` : ''}
    ${a.alive ? `<div class="meter life"><span>Thọ nguyên ${age} / ${ls} năm</span><div class="track"><span style="width:${Math.min(100, (age / ls) * 100).toFixed(1)}%"></span></div></div>` : ''}
    <div class="stats">${stat(a.stats.canCot, 'Căn cốt')}${stat(a.stats.ngoTinh, 'Ngộ tính')}${stat(a.stats.khiVan, 'Khí vận')}${stat(a.stats.tamTinh, 'Tâm tính')}${stat(a.stats.miLuc, 'Mị lực')}</div>
    <dl class="kv">
      <dt>Xuất thân</dt><dd>${esc(ORIGIN_BY_ID[a.originId]?.name ?? '')}, sinh ở ${esc(REGION_BY_ID[a.bornRegion]!.name)}</dd>
      <dt>Linh căn</dt><dd>${esc(root.name)}${a.elements.length ? ` (${a.elements.map((e) => ELEMENT_NAMES[e]).join(', ')})` : ''}</dd>
      ${a.physiqueId ? `<dt>Thể chất</dt><dd>${esc(PHYSIQUE_BY_ID[a.physiqueId]!.name)}</dd>` : ''}
      <dt>Công pháp</dt><dd>${a.technique ? esc(a.technique.name) : 'Chưa có'}</dd>
      <dt>Tông môn</dt><dd>${a.sectId ? `${esc(SECT_BY_ID[a.sectId]!.name)}, ${SECT_RANKS.find((x) => x.id === a.sectRank)?.name ?? ''}` : 'Không'}</dd>
      <dt>Tài sản</dt><dd>${a.linhThach} linh thạch · ${a.pills} viên đan</dd>
      <dt>Danh vọng</dt><dd>${a.renown}${a.kills ? ` · đã hạ ${a.kills} người` : ''}</dd>
    </dl>
    ${a.titles.length ? `<div class="chips">${a.titles.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${rels.length ? `<div class="eyebrow">Quan hệ</div><ul class="rels">${rels.map(({ o, rel }) => `<li class="${o!.alive ? '' : 'dead'}">${relationWord(rel.kind)}: ${personLink(o, sim)}</li>`).join('')}</ul>` : ''}`;
}

function playerCard(sim: Sim): string {
  const a = sim.get(s.soul.currentAvatarId);
  if (!a) {
    const years = s.soul.rebirthAt !== null ? Math.max(0, Math.ceil((s.soul.rebirthAt - s.month) / 12)) : null;
    return `<div class="card"><div class="eyebrow">Kiếp thứ ${s.soul.lives.length + 1}</div><h2>Đang luân hồi</h2>
      <p class="muted">${years !== null ? `Hồn ngươi trôi trong luân hồi. Khoảng ${years} năm nữa sẽ đầu thai.` : 'Hồn ngươi đứng bên cầu Nại Hà.'} Thế giới vẫn tiếp tục.</p></div>`;
  }
  return `<div class="card"><div class="eyebrow">Kiếp thứ ${(a.soulLife ?? 0) + 1} · ${s.soul.points} Luân Hồi Điểm</div>${avatarBlock(sim, a)}</div>`;
}

function choiceCard(sim: Sim): string {
  const p = s.soul.pending;
  if (!p) return '';
  void sim;
  const title = p.kind === 'rebirth' ? 'Cầu Nại Hà' : p.kind === 'offer' ? 'Cơ duyên' : 'Ngã rẽ';
  return `<div class="card choice"><div class="eyebrow">${title}</div><p class="prompt">${esc(p.prompt)}</p>
    <div class="options">${p.options.map((o) => `<button class="opt" data-choose="${o.id}"><span>${esc(o.label)}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`).join('')}</div>
    ${p.kind === 'action' ? '<p class="small muted" style="margin:0">Việc ngươi chọn sẽ được làm 3 lần liền rồi mới hỏi lại. Bật "Tự quyết" để nhân vật tự sống theo tâm tính.</p>' : ''}</div>`;
}

function chronicle(sim: Sim): string {
  const id = s.soul.currentAvatarId ?? s.soul.lives[s.soul.lives.length - 1]?.avatarId;
  if (id == null) return '<p class="muted small">Chưa có.</p>';
  void sim;
  return feed(s.events.filter((e) => e.avatarIds.includes(id)).slice(-80).reverse());
}

function livesView(): string {
  const soul = s.soul;
  const mem = (Object.keys(MEMORIES) as (keyof typeof MEMORIES)[]).map((k) => `<li>${esc(MEMORIES[k].name)}: cấp ${soul.memories[k]}/${MEMORIES[k].max} <span class="muted small">(${esc(MEMORIES[k].desc)})</span></li>`).join('');
  const lives = soul.lives.slice().reverse().map((l) => `<tr><td class="num">${l.index + 1}</td><td><button class="linkish" data-avatar="${l.avatarId}">${esc(l.name)}</button><br><span class="small muted">${yearOf(l.bornMonth)}–${yearOf(l.diedMonth)}, ${esc(REGION_BY_ID[l.bornRegion]!.name)}</span></td>
    <td>${esc(REALMS[l.realm]!.name)}</td><td class="small">${esc(l.causeText)}</td><td class="num">${l.daoQua}</td></tr>`).join('');
  return `<p class="small">${soul.points} Luân Hồi Điểm. Mở ký ức tiền kiếp ở cầu Nại Hà sau mỗi lần chết.</p><ul class="rels">${mem}</ul>
    ${lives ? `<div style="overflow-x:auto;margin-top:12px"><table><thead><tr><th>Kiếp</th><th>Tên</th><th>Cảnh giới</th><th>Kết cục</th><th>Đạo Quả</th></tr></thead><tbody>${lives}</tbody></table></div>` : '<p class="muted small" style="margin-top:12px">Đây là kiếp đầu tiên.</p>'}`;
}

// ---- interaction ----------------------------------------------------------------------------

document.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  const el = t.closest<HTMLElement>('[data-act],[data-tab],[data-region],[data-avatar],[data-choose]');
  if (!el) return;
  if (el.dataset.choose) {
    choose(s, el.dataset.choose);
    ui.running = true;
    save();
  } else if (el.dataset.tab) {
    ui.tab = el.dataset.tab as Tab;
  } else if (el.dataset.region) {
    ui.region = el.dataset.region;
    ui.tab = 'here';
  } else if (el.dataset.avatar) {
    ui.avatar = Number(el.dataset.avatar);
    ui.tab = 'profile';
  } else if (el.dataset.act === 'toggle') {
    ui.running = !ui.running;
  } else if (el.dataset.act === 'save') {
    save();
  } else if (el.dataset.act === 'new') {
    s = createWorld(Math.floor(Math.random() * 2 ** 31), { autoplay: s.soul.autoplay });
    ui.region = null; ui.avatar = null; ui.tab = 'news';
    save();
  }
  ui.dirty = true;
  render();
});

document.addEventListener('keydown', (ev) => {
  const el = ev.target as HTMLElement;
  if ((ev.key === 'Enter' || ev.key === ' ') && el.dataset?.region) {
    ev.preventDefault();
    el.click();
  }
});

document.addEventListener('change', (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === 'speed') ui.speed = Number(el.value);
  if (el.id === 'autoplay') { setAutoplay(s, el.checked); ui.running = true; }
  ui.dirty = true;
  render();
});

let lastSave = Date.now();
setInterval(() => {
  if (ui.running && s.soul.pending === null) {
    advance(s, SPEEDS[ui.speed]!.months);
    ui.dirty = true;
  }
  if (Date.now() - lastSave > 15000) { save(); lastSave = Date.now(); }
  if (ui.dirty) render();
}, TICK_MS);

window.addEventListener('pagehide', save);
render();
