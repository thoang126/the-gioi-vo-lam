import {
  advance, choose, createWorld, setAutoplay, Sim, YEAR_OFFSET, ACTION_BY_ID, MEMORIES,
  REGIONS, ROUTES, SEA_ROUTES, SECTS, SECT_RANKS, REALMS, WORLDS, ELEMENT_NAMES,
  REGION_BY_ID, SECT_BY_ID, ROOT_BY_ID, ORIGIN_BY_ID, PHYSIQUE_BY_ID, relationWord, EVENT_BY_ID, LHVK, pathNames, rebirthRootChance,
  CODEX, SOUL_TITLES, codexProgress, SECT_ARTS, skillById, skillLabel, jianghuTitle, pillFor, itemName, parseKey, HERB_BY_ID, PILL_BY_ID, migrateWorld, PROVINCES, WORLD_LAYOUT, CLAN, CLAN_KIND_NAMES, TRAIT_BY_ID, DYNASTY_END_NAMES, runBattle, sealOf, tacticOf, TACTIC_NAMES, TACTIC_IDS,
} from '../src/index';
import type { Avatar, EventKind, LifeRecord, WorldEvent, WorldState } from '../src/types';
import type { FightRecord, SoulSeal, TacticId } from '../src/index';
import type { WorldId } from '../src/content/world';

const SAVE_KEY = 'van-kiep-giang-ho/save';
const PREFS_KEY = 'van-kiep-giang-ho/prefs';
const TICK_MS = 250;
const AUTOSAVE_MS = 15000;

type Tab = 'news' | 'sects' | 'clans' | 'people' | 'here' | 'profile' | 'lives' | 'codex' | 'arena';
type MapView = 'all' | WorldId;
type NewsFilter = 'all' | 'war' | 'sect' | 'life' | 'fortune';

const SPEEDS = [
  { label: 'Chậm', months: 1, hint: '1 tháng mỗi nhịp' },
  { label: 'Vừa', months: 3, hint: '3 tháng mỗi nhịp' },
  { label: 'Nhanh', months: 12, hint: '1 năm mỗi nhịp' },
  { label: 'Rất nhanh', months: 60, hint: '5 năm mỗi nhịp' },
];

const prefs = loadPrefs();
const ui = {
  running: true,
  speed: prefs.speed ?? 1,
  tab: 'news' as Tab,
  region: null as string | null,
  avatar: null as number | null,
  mapView: null as MapView | null,
  news: 'all' as NewsFilter,
  confirmNew: 0,
  replay: null as { rec: Omit<FightRecord, 'month'>; shown: number } | null,
  savedAt: 0,
};
let s: WorldState = loadOrCreate();

// ---- persistence ----------------------------------------------------------------------------

function loadPrefs(): { speed?: number; introHidden?: boolean } {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}'); } catch { return {}; }
}
function savePrefs(): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

function loadOrCreate(): WorldState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorldState;
      // Saves from before the story events lack the per-life story state; start a fresh world for those.
      if (parsed.version === 1 && parsed.soul?.story) return migrateWorld(parsed);
    }
  } catch { /* storage unavailable */ }
  return createWorld(Math.floor(Math.random() * 2 ** 31));
}

function save(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    ui.savedAt = Date.now();
  } catch { /* storage unavailable */ }
}

// ---- helpers --------------------------------------------------------------------------------

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const yearOf = (m: number) => YEAR_OFFSET + Math.floor(m / 12);
const narrow = () => window.matchMedia('(max-width: 700px)').matches;

const KIND_GROUP: Record<EventKind, NewsFilter | 'other'> = {
  war: 'war', battle: 'war', sect: 'sect', birth: 'life', death: 'life', relation: 'life',
  breakthrough: 'fortune', realm: 'fortune', fortune: 'fortune', world: 'war', travel: 'other',
  past_life: 'other', soul: 'other', story: 'other',
};

function personLink(a: Avatar | undefined, sim: Sim): string {
  if (!a) return '—';
  return `<button class="linkish" data-avatar="${a.id}">${esc(a.name)}</button> <span class="muted small">${esc(sim.realmLabel(a))}</span>`;
}

/** One feed line. `ageOf` turns the year column into the character's age (personal chronicles). */
function feed(events: WorldEvent[], ageOf?: (e: WorldEvent) => number, rewrite?: (e: WorldEvent) => string): string {
  if (!events.length) return '<p class="muted small">Chưa có gì.</p>';
  return `<ul class="feed">${events.map((e) => {
    const when = ageOf ? `<span class="yr" title="Năm ${yearOf(e.month)}">${ageOf(e)} tuổi</span>` : `<span class="yr">${yearOf(e.month)}</span>`;
    return `<li class="k-${e.kind} g-${KIND_GROUP[e.kind]}">${when}<span class="txt">${esc(rewrite ? rewrite(e) : e.text)}</span></li>`;
  }).join('')}</ul>`;
}

// ---- section rendering ----------------------------------------------------------------------
// The page is a fixed skeleton; each section re-renders only when its HTML actually changed, so
// open dropdowns, focus, hover and scroll survive the 4 ticks a second.

const cache: Record<string, string> = {};
function patch(id: string, html: string): void {
  if (cache[id] === html) return;
  cache[id] = html;
  document.getElementById(id)!.innerHTML = html;
}

function skeleton(): void {
  document.getElementById('app')!.innerHTML = `
    <header class="bar">
      <div class="brand"><h1>Vạn Kiếp Giang Hồ</h1><span class="date" id="date"></span></div>
      <div class="timebar" role="group" aria-label="Thời gian trôi" id="timebar"></div>
      <div class="controls">
        <label class="toggle" title="Nhân vật tự quyết mọi ngã rẽ theo tâm tính"><input type="checkbox" id="autoplay"> Tự quyết</label>
        <button class="btn" data-act="save">Lưu</button>
        <button class="btn" data-act="new" id="btn-new">Thế giới mới</button>
      </div>
      <p class="status small" id="status" aria-live="polite"></p>
    </header>
    <div id="intro"></div>
    <div class="main">
      <div class="col">
        <div class="map-head"><span class="eyebrow">Thiên hạ</span><div class="seg small" role="group" aria-label="Phạm vi bản đồ" id="mapview"></div></div>
        <div class="map-wrap" id="map"></div>
        <div>
          <div class="tabs" role="tablist" aria-label="Thông tin thế giới" id="tabs"></div>
          <div class="tabpanel" role="tabpanel" id="tabpanel" tabindex="0"></div>
        </div>
      </div>
      <div class="col player-col">
        <div id="choice" aria-live="assertive"></div>
        <div id="player"></div>
        <div class="card"><div class="eyebrow">Biên niên kiếp này</div><div class="tabpanel" id="chron" tabindex="0"></div></div>
      </div>
    </div>`;
}

function render(): void {
  updateBia();
  const sim = new Sim(s);
  sim.reindex();
  const waiting = s.soul.pending !== null;
  const reign = s.dynasties?.[s.dynasties.length - 1];
  patch('date', `Năm ${yearOf(s.month)} · tháng ${(s.month % 12) + 1}${reign ? `<span class="era" title="Triều đại đang trị vì Đại Hạ"> · ${esc(reign.surname)} triều năm ${Math.floor((s.month - reign.since) / 12) + 1}</span>` : ''}`);
  patch('timebar', timebar(waiting));
  const auto = document.getElementById('autoplay') as HTMLInputElement;
  if (auto.checked !== s.soul.autoplay) auto.checked = s.soul.autoplay;
  document.getElementById('btn-new')!.textContent = ui.confirmNew > Date.now() ? 'Bấm lần nữa để xóa thế giới này' : 'Thế giới mới';
  document.getElementById('btn-new')!.classList.toggle('danger', ui.confirmNew > Date.now());
  patch('status', status(sim, waiting));
  patch('intro', prefs.introHidden ? '' : intro());
  patch('mapview', mapViewButtons(sim));
  patch('map', mapSvg(sim));
  patch('tabs', tabs());
  patch('tabpanel', tabContent(sim));
  patch('choice', choiceCard(sim));
  patch('player', playerCard(sim));
  patch('chron', chronicle(sim));
  document.title = waiting ? `● ${titleFor()} · Vạn Kiếp Giang Hồ` : 'Vạn Kiếp Giang Hồ';
}

function titleFor(): string {
  const p = s.soul.pending;
  if (!p) return '';
  const ev = p.kind === 'event' ? EVENT_BY_ID[String(p.data?.event)] : undefined;
  if (p.kind === 'breakthrough') return 'Đột phá';
  if (p.kind === 'alchemy') return 'Lò đan';
  return p.kind === 'rebirth' ? 'Cầu Nại Hà' : p.kind === 'offer' ? 'Cơ duyên' : ev?.kind === 'milestone' ? 'Bước ngoặt' : ev?.kind === 'acquaintance' ? 'Người quen nhờ cậy' : 'Ngã rẽ';
}

function timebar(waiting: boolean): string {
  const paused = !ui.running || waiting;
  return `<button class="seg-btn ${paused ? 'on' : ''}" data-speed="-1" aria-pressed="${paused}" title="Phím cách">Dừng</button>${SPEEDS.map((sp, i) =>
    `<button class="seg-btn ${!paused && ui.speed === i ? 'on' : ''}" data-speed="${i}" aria-pressed="${!paused && ui.speed === i}" title="${sp.hint}" ${waiting ? 'disabled' : ''}>${sp.label}</button>`).join('')}`;
}

function status(sim: Sim, waiting: boolean): string {
  const saved = ui.savedAt ? `Đã lưu lúc ${new Date(ui.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Tự lưu mỗi 15 giây';
  const state = waiting ? `<b class="seal">Thế giới đang chờ ngươi: ${esc(titleFor())}</b>` : ui.running ? 'Thời gian đang trôi' : 'Đã dừng';
  return `${state} · ${sim.living().length} người đang sống · ${s.graves.length} bia mộ · ${saved}`;
}

function intro(): string {
  return `<div class="intro"><p>Giang hồ tự vận hành: môn phái tuyển đệ tử, truyền võ công, khai chiến; võ nhân luyện công, đột phá, chết và để lại bia mộ. Ngươi chỉ là một linh hồn trong đó. Khi đời nhân vật tới một <b>ngã rẽ</b>, thế giới dừng lại chờ ngươi chọn. Chết rồi, ngươi đầu thai lại vào chính thế giới ấy, và có thể gặp lại người của kiếp trước.</p>
    <p class="small muted">Phím tắt: <kbd>1</kbd>–<kbd>9</kbd> chọn, <kbd>Space</kbd> dừng hoặc chạy tiếp.</p>
    <button class="btn small" data-act="hide-intro">Đã hiểu, ẩn đi</button></div>`;
}

function tabs(): string {
  const list: [Tab, string][] = [['news', 'Tin giang hồ'], ['sects', 'Môn phái'], ['clans', 'Thế gia'], ['people', 'Cao thủ'], ['here', ui.region ? REGION_BY_ID[ui.region]!.name : 'Địa danh']];
  if (ui.avatar) list.push(['profile', 'Hồ sơ']);
  list.push(['arena', 'Luận Kiếm'], ['codex', 'Kiếp Sách'], ['lives', 'Tiền kiếp']);
  return list.map(([id, label]) => `<button class="tab" role="tab" id="tab-${id}" aria-controls="tabpanel" aria-selected="${ui.tab === id}" tabindex="${ui.tab === id ? 0 : -1}" data-tab="${id}">${esc(label)}</button>`).join('');
}

// ---- map ------------------------------------------------------------------------------------

const LAND_DAI_HA = 'M20 30 C110 12 250 18 360 42 C420 56 452 110 446 180 C440 240 470 300 430 360 C392 420 330 470 250 500 C170 528 80 520 30 480 C10 420 14 340 22 260 C28 180 12 100 20 30 Z';
const LAND_THANH_VAN = 'M610 48 C700 20 840 16 960 38 C984 110 978 200 986 280 C990 360 970 440 930 500 C850 532 740 528 660 500 C610 460 596 390 604 320 C612 250 586 180 596 120 C600 90 600 70 610 48 Z';
const LAND_MA_VUC = 'M40 590 C130 570 260 575 360 590 C420 600 440 640 420 690 C400 740 330 770 230 772 C140 774 60 768 36 740 C24 690 26 630 40 590 Z';
const LAND_YEU_VUC = 'M640 590 C730 572 860 570 975 588 C992 640 990 700 970 752 C880 772 760 774 660 760 C630 720 626 640 640 590 Z';
const LAND_ISLANDS = ['M478 418 C500 404 530 408 538 430 C542 452 520 464 498 460 C478 456 468 436 478 418 Z',
  'M452 515 C466 500 492 504 494 524 C494 544 470 552 456 542 C446 534 446 524 452 515 Z',
  'M540 504 C560 494 584 504 584 524 C582 542 560 548 546 538 C534 528 532 512 540 504 Z',
  'M584 444 C596 434 616 440 618 456 C618 470 600 476 588 468 C580 462 578 452 584 444 Z'];
const LAND_TIEN_GIOI = 'M80 830 C260 812 740 812 940 830 C975 880 975 950 940 985 C740 996 260 996 80 985 C40 950 40 880 80 830 Z';
function reignLabel(): string {
  const d = s.dynasties?.[s.dynasties.length - 1];
  return d ? `${d.surname} triều năm ${Math.floor((s.month - d.since) / 12) + 1}` : 'Đại Hạ';
}

/** View box of a map view: the whole lower world, or one world framed around its places. */
function viewBox(view: MapView): [number, number, number, number] {
  if (view === 'all') return [0, 0, 1240, 1090];
  if (view === 'immortal') return [40, 800, 940, 200];
  const rs = REGIONS.filter((r) => r.world === view);
  const x0 = Math.min(...rs.map((r) => r.x)) - 50;
  const y0 = Math.min(...rs.map((r) => r.y)) - 50;
  const x1 = Math.max(...rs.map((r) => r.x)) + 110;
  const y1 = Math.max(...rs.map((r) => r.y)) + 50;
  return [x0, y0, x1 - x0, y1 - y0];
}

/** A world's land and name, drawn in its own frame and placed by WORLD_LAYOUT. */
function landGroup(world: WorldId, inner: string): string {
  const L = WORLD_LAYOUT[world];
  return `<g transform="translate(${L.dx} ${L.dy}) scale(${L.k})">${inner}</g>`;
}

function currentMapView(sim: Sim): MapView {
  if (ui.mapView) return ui.mapView;
  if (!narrow()) return 'all';
  const p = sim.get(s.soul.currentAvatarId);
  return p ? REGION_BY_ID[p.regionId]!.world : 'all';
}

function mapViewButtons(sim: Sim): string {
  const v = currentMapView(sim);
  const opt = (id: MapView, label: string) => `<button class="seg-btn ${v === id ? 'on' : ''}" data-mapview="${id}" aria-pressed="${v === id}">${label}</button>`;
  const views: [MapView, string][] = [['all', 'Toàn cảnh'], ['mortal', 'Đại Hạ'], ['cultivation', 'Thanh Vân'], ['overseas', 'Hải ngoại'], ['demonic', 'Tây Vực'], ['demon_beast', 'Nam Cương']];
  if (v === 'immortal' || sim.living().some((a) => REGION_BY_ID[a.regionId]!.world === 'immortal')) views.push(['immortal', 'Thiên ngoại']);
  return views.map(([id, label]) => opt(id, label)).join('');
}

function mapSvg(sim: Sim): string {
  const view = currentMapView(sim);
  const vb = viewBox(view);
  const player = sim.get(s.soul.currentAvatarId);
  const routes = ROUTES.map(([a, b]) => {
    const A = REGION_BY_ID[a]!;
    const B = REGION_BY_ID[b]!;
    if ((A.world === 'immortal') !== (view === 'immortal')) return '';
    const sea = SEA_ROUTES.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
    return `<line class="route${sea ? ' sea' : ''}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  }).join('');
  const wars: string[] = [];
  for (const st of Object.values(s.sects)) {
    for (const other of Object.keys(st.wars)) {
      if (other < st.id) continue;
      const A = REGION_BY_ID[SECT_BY_ID[st.id]!.regionId]!;
      const B = REGION_BY_ID[SECT_BY_ID[other]!.regionId]!;
      wars.push(`<path class="war-line" d="M${A.x} ${A.y} Q${(A.x + B.x) / 2 + 60} ${(A.y + B.y) / 2} ${B.x} ${B.y}"><title>${esc(SECT_BY_ID[st.id]!.name)} và ${esc(SECT_BY_ID[other]!.name)} đang giao chiến</title></path>`);
    }
  }
  const graves: Record<string, number> = {};
  for (const g of s.graves) graves[g.regionId] = (graves[g.regionId] ?? 0) + 1;
  const regions = REGIONS.filter((r) => (r.world === 'immortal') === (view === 'immortal')).map((r) => {
    const n = (sim.byRegion[r.id] ?? []).length;
    const rad = 4 + Math.min(10, Math.sqrt(n) * 1.4);
    const wild = r.kind === 'beast' || r.kind === 'ruin' || r.kind === 'cave' || r.kind === 'secret';
    const evil = r.sectId && SECT_BY_ID[r.sectId]!.alignment === 'evil';
    const cls = ['region', wild ? 'wild' : '', r.sectId ? 'sect' : '', evil ? 'evil' : '', ui.region === r.id ? 'sel' : ''].join(' ');
    const anchorEnd = r.x > vb[0] + vb[2] - 130;
    const tx = anchorEnd ? r.x - rad - 4 : r.x + rad + 4;
    const sub = [n ? `${n} người` : '', graves[r.id] ? `${graves[r.id]} mộ` : ''].filter(Boolean).join(' · ');
    const secret = r.kind === 'secret' && s.secretRealmOpenUntil > s.month ? `<circle class="secret-ring" cx="${r.x}" cy="${r.y}" r="${rad + 7}"><title>Cổ mộ đang mở</title></circle>` : '';
    const me = player && player.regionId === r.id
      ? `<circle class="player-ring${s.soul.pending ? ' waiting' : ''}" cx="${r.x}" cy="${r.y}" r="${rad + 5}"/><text class="player-tag" x="${r.x}" y="${r.y - rad - 9}" text-anchor="middle">ngươi</text>` : '';
    return `<g class="${cls}" data-region="${r.id}" tabindex="0" role="button" aria-label="${esc(r.name)}, ${n} người">
      ${secret}${r.id === 'kinh_thanh' ? `<rect class="capital" x="${r.x - rad - 6}" y="${r.y - rad - 6}" width="${2 * rad + 12}" height="${2 * rad + 12}"><title>Kinh đô, ${esc(reignLabel())}</title></rect>` : ''}<circle class="dot" cx="${r.x}" cy="${r.y}" r="${rad}"/>${me}
      <text x="${tx}" y="${r.y + 4}" text-anchor="${anchorEnd ? 'end' : 'start'}">${esc(r.name)}</text>
      ${sub ? `<text class="count" x="${tx}" y="${r.y + 17}" text-anchor="${anchorEnd ? 'end' : 'start'}">${sub}</text>` : ''}
    </g>`;
  }).join('');
  // Châu quận of Đại Hạ, named at the middle of their places.
  const provinces = Object.entries(PROVINCES).map(([id, p]) => {
    const rs = REGIONS.filter((r) => r.province === id);
    const cx = rs.reduce((t, r) => t + r.x, 0) / rs.length;
    const cy = rs.reduce((t, r) => t + r.y, 0) / rs.length;
    return `<text class="province-label" x="${cx.toFixed(0)}" y="${(cy + 30).toFixed(0)}" text-anchor="middle">${esc(p.name.toUpperCase())}</text>`;
  }).join('');
  const lands = view === 'immortal'
    ? `<path class="land heaven" d="${LAND_TIEN_GIOI}"/><text class="region-label-big" x="500" y="930" text-anchor="middle" font-size="34">THIÊN NGOẠI</text>`
    : `${landGroup('mortal', `<path class="land" d="${LAND_DAI_HA}"/><text class="region-label-big" x="400" y="510" text-anchor="middle" font-size="30">ĐẠI HẠ</text>`)}
    ${landGroup('cultivation', `<path class="land" d="${LAND_THANH_VAN}"/><text class="region-label-big" x="790" y="300" text-anchor="middle" font-size="30">THANH VÂN CHÂU</text>`)}
    ${landGroup('demonic', `<path class="land evil" d="${LAND_MA_VUC}"/><text class="region-label-big" x="230" y="760" text-anchor="middle" font-size="24">TÂY VỰC</text>`)}
    ${landGroup('demon_beast', `<path class="land wildland" d="${LAND_YEU_VUC}"/><text class="region-label-big" x="800" y="760" text-anchor="middle" font-size="24">NAM CƯƠNG</text>`)}
    ${landGroup('overseas', `${LAND_ISLANDS.map((d) => `<path class="land" d="${d}"/>`).join('')}<text class="sea-label" x="520" y="490" text-anchor="middle">HẢI NGOẠI</text>`)}
    <text class="sea-label" x="800" y="330" text-anchor="middle">BIỂN ĐÔNG</text>${provinces}`;
  return `<svg viewBox="${vb.join(' ')}" class="view-${view}" role="img" aria-label="Bản đồ thiên hạ">
    ${lands}
    ${routes}${wars.join('')}${regions}
  </svg>`;
}

// ---- tab panels -----------------------------------------------------------------------------

function tabContent(sim: Sim): string {
  switch (ui.tab) {
    case 'news': {
      const filters: [NewsFilter, string][] = [['all', 'Tất cả'], ['war', 'Thế sự, chiến sự'], ['sect', 'Môn phái'], ['life', 'Sinh tử'], ['fortune', 'Đột phá, kỳ ngộ']];
      const list = s.events.filter((e) => e.major && (ui.news === 'all' || KIND_GROUP[e.kind] === ui.news)).slice(-60).reverse();
      return `<div class="chips filters" role="group" aria-label="Lọc tin">${filters.map(([id, label]) => `<button class="chip-btn ${ui.news === id ? 'on' : ''}" aria-pressed="${ui.news === id}" data-news="${id}">${label}</button>`).join('')}</div>${feed(list)}`;
    }
    case 'sects': return sectsTable(sim);
    case 'clans': return clansTable(sim);
    case 'people': return peopleTable(sim, sim.living().sort((a, b) => sim.power(b) - sim.power(a)).slice(0, 25));
    case 'here': {
      if (!ui.region) return '<p class="muted small">Chạm vào một địa danh trên bản đồ để xem ai đang ở đó và những ngôi mộ còn lại.</p>';
      const r = REGION_BY_ID[ui.region]!;
      const people = (sim.byRegion[r.id] ?? []).slice().sort((a, b) => sim.power(b) - sim.power(a));
      const graves = s.graves.filter((g) => g.regionId === r.id).slice(-12).reverse();
      return `<p class="small"><b>${esc(r.name)}</b> · ${r.province ? `${esc(PROVINCES[r.province]!.name)}, ` : ''}${esc(WORLDS[r.world].name)}. ${esc(r.desc)}</p>
        ${peopleTable(sim, people.slice(0, 30))}
        ${graves.length ? `<p class="eyebrow" style="margin-top:12px">Bia mộ</p><ul class="feed">${graves.map((g) => `<li class="${g.soulLife !== null ? 'k-past_life' : ''}"><span class="yr">${yearOf(g.month)}</span><span class="txt">${esc(g.name)}, ${esc(REALMS[g.realm]!.name)}. ${esc(g.epitaph)}.${g.soulLife !== null ? ` (Kiếp thứ ${g.soulLife + 1} của ngươi)` : ''}</span></li>`).join('')}</ul>` : ''}`;
    }
    case 'profile': return profile(sim, sim.get(ui.avatar));
    case 'lives': return livesView();
    case 'codex': return codexView();
    case 'arena': return arenaView(sim);
  }
}

function sectsTable(sim: Sim): string {
  const rows = SECTS.map((def) => {
    const st = s.sects[def.id]!;
    const members = sim.living().filter((a) => a.sectId === def.id);
    const top = REALMS[Math.max(0, ...members.map((m) => m.realm))]!.name;
    // Thirteen sects: only the ties worth knowing (at war, or warm or cold enough to matter).
    const stance = Object.entries(st.relations).filter(([o, v]) => st.wars[o] || Math.abs(v) >= 40)
      .map(([o, v]) => `${SECT_BY_ID[o]!.name}: ${st.wars[o] ? '<b class="seal">đang chiến</b>' : stanceWord(v)}`).join('<br>') || '<span class="muted">không thân không thù</span>';
    const arts = SECT_ARTS[def.id];
    const artsLine = arts ? `<br><span class="small">${esc(arts.style)}: ${esc(arts.technique)}; ${esc(arts.skills.map((id) => skillById(id)?.name ?? id).join(', '))}</span>` : '';
    return `<tr><td><b>${esc(def.name)}</b><br><span class="small muted">${def.alignment === 'evil' ? 'Tà phái' : 'Chính phái'} · ${esc(REGION_BY_ID[def.regionId]!.name)}</span>${artsLine}</td>
      <td class="num">${members.length}</td><td>${personLink(sim.get(st.leaderId), sim)}</td><td>${top}</td><td class="num">${st.prestige.toLocaleString('vi-VN')}</td><td class="small">${stance}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Môn phái</th><th>Người</th><th>Chưởng môn</th><th>Cao nhất</th><th>Uy thế</th><th>Quan hệ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function clansTable(sim: Sim): string {
  const clans = Object.values(s.clans ?? {});
  const living = sim.living();
  const alive = clans.filter((c) => c.extinctMonth === null).sort((x, y) => y.prestige - x.prestige);
  const gone = clans.filter((c) => c.extinctMonth !== null).sort((x, y) => (y.extinctMonth ?? 0) - (x.extinctMonth ?? 0));
  const rows = alive.map((c) => {
    const members = living.filter((a) => a.clanId === c.id);
    const top = REALMS[Math.max(0, ...members.map((m) => m.realm))]!.name;
    const stance = Object.entries(c.relations).filter(([o, v]) => s.clans![o]?.extinctMonth === null && Math.abs(v) >= 40)
      .map(([o, v]) => `${esc(s.clans![o]!.name)}: ${v <= CLAN.feudBelow ? '<b class="seal">huyết thù</b>' : stanceWord(v)}`).join('<br>');
    return `<tr><td><b>${esc(c.name)}</b><br><span class="small muted">${CLAN_KIND_NAMES[c.kind]} · ${esc(REGION_BY_ID[c.seat]!.name)}${c.foundedMonth > 0 ? ` · lập năm ${yearOf(c.foundedMonth)}` : ''}</span></td>
      <td class="num">${members.length}</td><td>${personLink(sim.get(c.headId), sim)}</td><td>${top}</td><td class="num">${c.prestige.toLocaleString('vi-VN')}</td><td class="small">${stance || '—'}</td></tr>`;
  }).join('');
  const dyn = s.dynasties ?? [];
  const history = dyn.length ? `<p class="eyebrow" style="margin:14px 0 6px">Sử Đại Hạ</p><ol class="feed dynasties">${dyn.slice().reverse().map((d) => {
    const until = d.until ?? s.month;
    const yrs = Math.round((until - d.since) / 12);
    return `<li><span class="yr">${d.since < 0 ? '…' : yearOf(d.since)}</span><span class="txt"><b>${esc(d.surname)} triều</b>, ${d.until === null ? `đang trị vì, đã ${yrs} năm` : `${yrs} năm, mất vì ${esc(DYNASTY_END_NAMES[d.end ?? ''] ?? '').toLowerCase()} (năm ${yearOf(until)})`}. Khai quốc: ${esc(d.founder)}.</span></li>`;
  }).join('')}</ol>` : '';
  return `${history}<div class="table-wrap"><table><thead><tr><th>Thế gia</th><th>Người</th><th>Gia chủ</th><th>Cao nhất</th><th>Uy thế</th><th>Ân oán</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${gone.length ? `<p class="small muted" style="margin-top:10px">Đã tuyệt tự: ${gone.slice(0, 12).map((c) => `${esc(c.name)} (năm ${yearOf(c.extinctMonth!)})`).join(', ')}.</p>` : ''}`;
}

function stanceWord(v: number): string {
  if (v <= -60) return 'thù sâu';
  if (v <= -20) return 'bất hòa';
  if (v < 20) return 'xa cách';
  if (v < 60) return 'hòa hảo';
  return 'đồng minh';
}

function peopleTable(sim: Sim, list: Avatar[]): string {
  if (!list.length) return '<p class="muted small">Không có ai ở đây.</p>';
  return `<div class="table-wrap"><table><thead><tr><th>Tên</th><th>Tuổi</th><th>Môn phái</th><th>Đang</th></tr></thead><tbody>${list.map((a) => `
    <tr${sim.isPlayer(a) ? ' class="me"' : ''}><td>${personLink(a, sim)}${sim.isPlayer(a) ? ' <b class="seal">(ngươi)</b>' : ''}</td><td class="num">${sim.age(a)}</td>
    <td class="small">${a.sectId ? `${esc(SECT_BY_ID[a.sectId]!.name)}${a.sectRank ? `, ${SECT_RANKS.find((r) => r.id === a.sectRank)!.name}` : ''}` : '—'}</td>
    <td class="small muted">${a.action ? esc(ACTION_BY_ID[a.action.id]?.doing ?? '') : sim.age(a) < 12 ? 'lớn lên' : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

function profile(sim: Sim, a: Avatar | undefined): string {
  if (!a) return '<p class="muted small">Người này đã bị lãng quên.</p>';
  const link = s.soul.pastLinks[a.id];
  const me = sim.get(s.soul.currentAvatarId);
  const rel = me && me.id !== a.id ? me.relations[a.id] : undefined;
  return `<div class="profile">${avatarBlock(sim, a, false)}
    ${rel ? `<p class="small">Với ngươi: <b>${relationWord(rel.kind)}</b>, tình cảm ${rel.bond}.</p>` : ''}
    ${link ? `<p class="small seal">Kiếp thứ ${link.life + 1}, người này là ${relationWord(link.kind as never)} của ngươi.</p>` : ''}
    <div class="eyebrow">Đời người này</div>${feed(s.events.filter((e) => e.avatarIds.includes(a.id)).slice(-30).reverse(), (e) => Math.floor((e.month - a.birthMonth) / 12))}</div>`;
}

// ---- the player's side ----------------------------------------------------------------------

const STAT_HINTS: Record<string, string> = {
  'Căn cốt': 'Khí huyết, sức chịu quan ải, sống sót khi bị thương',
  'Ngộ tính': 'Tốc độ luyện công và tỉ lệ đột phá',
  'Khí vận': 'Kỳ ngộ nhiều hơn, tai họa ít hơn',
  'Tâm tính': 'Kháng tâm ma; quyết định khi để nhân vật tự chọn',
  'Mị lực': 'Hiệp lữ, kết giao, thu đồ đệ',
};

/** What the character should be aiming for right now, in one line. */
function goal(sim: Sim, a: Avatar): string | null {
  const age = sim.age(a);
  const ls = sim.lifespan(a);
  if (age / ls > 0.85) return `Thọ nguyên sắp cạn: còn khoảng ${ls - age} năm.`;
  if (sim.readyToBreak(a)) {
    const next = REALMS[a.realm + 1];
    return a.breakthroughCooldownUntil > s.month
      ? `Đủ công lực lên ${next?.name}, nhưng phải tĩnh dưỡng thêm ${Math.ceil((a.breakthroughCooldownUntil - s.month) / 12)} năm.`
      : `Đủ công lực để đột phá ${next?.name ?? 'phá toái hư không'}${pillFor(a) ? ' (có đan hỗ trợ)' : '. Mua hoặc luyện đan trước sẽ chắc hơn'}.`;
  }
  if (age < 12) return 'Còn nhỏ: đời trôi theo gia đình, ngã rẽ đầu tiên tới khi 12 tuổi.';
  if (sim.rootTier(a) === 0) return 'Không tư chất: sống trọn đời người thường, hoặc chờ một kỳ ngộ hiếm.';
  if (!a.technique) return 'Có tư chất nhưng chưa có nội công: đi tìm võ duyên hoặc chờ môn phái mở sơn môn.';
  if (a.injuredUntil > s.month) return 'Đang mang thương: luyện công chậm lại, nên dưỡng thương.';
  return null;
}

function avatarBlock(sim: Sim, a: Avatar, isPlayer: boolean): string {
  const r = REALMS[a.realm]!;
  const root = ROOT_BY_ID[a.rootId]!;
  const age = sim.age(a);
  const ls = sim.lifespan(a);
  const progress = Math.min(1, a.tuVi / r.stageCost);
  const rels = Object.entries(a.relations).map(([id, rel]) => ({ o: sim.get(Number(id)), rel })).filter((x) => x.o)
    .sort((x, y) => Number(y.o!.alive) - Number(x.o!.alive)).slice(0, 10);
  const stat = (v: number, label: string) => `<div title="${STAT_HINTS[label]}"><b>${v}</b><span>${label}</span></div>`;
  const act = a.action;
  let doing = '';
  if (act) {
    const def = ACTION_BY_ID[act.id];
    const travelling = !!act.path?.length;
    const total = Math.max(1, act.endMonth - act.startMonth);
    const done = travelling ? 0 : Math.min(total, s.month - act.startMonth);
    doing = `<div class="meter act"><span>${esc(def?.label ?? '')}${travelling ? `: đang trên đường tới ${esc(REGION_BY_ID[act.regionId ?? a.regionId]!.name)}` : `: còn ${Math.max(0, act.endMonth - s.month)} tháng`}</span><div class="track"><span style="width:${((done / total) * 100).toFixed(0)}%"></span></div></div>`;
  }
  const g = isPlayer && a.alive ? goal(sim, a) : null;
  const rank = jianghuTitle(a);
  return `<div class="who"><h2>${esc(a.name)}</h2><span class="realm">${esc(sim.realmLabel(a))}${rank ? `<br><span class="small muted">giang hồ xếp hàng ${rank}</span>` : ''}</span></div>
    <div class="small muted">${a.gender === 'male' ? 'Nam' : 'Nữ'}, ${age} tuổi · ${a.alive ? esc(REGION_BY_ID[a.regionId]!.name) : `mất năm ${yearOf(a.deathMonth ?? 0)}: ${esc(a.deathText ?? '')}`}</div>
    ${g ? `<p class="goal">${esc(g)}</p>` : ''}
    ${doing}
    ${a.alive && r.rank > 0 ? `<div class="meter"><span>Công lực ${Math.floor(a.tuVi).toLocaleString('vi-VN')} / ${r.stageCost.toLocaleString('vi-VN')}</span><div class="track"><span style="width:${(progress * 100).toFixed(1)}%"></span></div></div>` : ''}
    ${a.alive ? `<div class="meter life${age / ls > 0.85 ? ' low' : ''}"><span>Thọ nguyên ${age} / ${ls} năm</span><div class="track"><span style="width:${Math.min(100, (age / ls) * 100).toFixed(1)}%"></span></div></div>` : ''}
    <div class="stats">${stat(a.stats.canCot, 'Căn cốt')}${stat(a.stats.ngoTinh, 'Ngộ tính')}${stat(a.stats.khiVan, 'Khí vận')}${stat(a.stats.tamTinh, 'Tâm tính')}${stat(a.stats.miLuc, 'Mị lực')}</div>
    <dl class="kv">
      <dt>Xuất thân</dt><dd>${a.race === 'yeu' ? 'Cổ tộc, ' : ''}${esc(ORIGIN_BY_ID[a.originId]?.name ?? '')}, sinh ở ${esc(REGION_BY_ID[a.bornRegion]!.name)}</dd>
      ${a.clanId && s.clans?.[a.clanId] ? `<dt>Gia tộc</dt><dd>${esc(s.clans[a.clanId]!.name)}${s.clans[a.clanId]!.headId === a.id ? ' (gia chủ)' : ''}</dd>` : ''}
      ${a.traits?.length ? `<dt>Thiên phú</dt><dd>${a.traits.map((t) => { const d = TRAIT_BY_ID[t]; return d ? `<span class="${d.kind === 'flaw' ? 'muted' : ''}" title="${esc(d.description)}">${esc(d.name)}</span>` : ''; }).join(', ')}</dd>` : ''}
      <dt>Tư chất</dt><dd>${esc(root.name)}${a.elements.length ? ` (${a.elements.map((e) => ELEMENT_NAMES[e]).join(', ')})` : ''}</dd>
      ${a.physiqueId ? `<dt>Thể chất</dt><dd>${esc(PHYSIQUE_BY_ID[a.physiqueId]!.name)}</dd>` : ''}
      <dt>Nội công</dt><dd>${a.technique ? esc(a.technique.name) : 'Chưa có'}</dd>
      <dt>Môn phái</dt><dd>${a.sectId ? `${esc(SECT_BY_ID[a.sectId]!.name)}, ${SECT_RANKS.find((x) => x.id === a.sectRank)?.name ?? ''}` : 'Không'}</dd>
      ${isPlayer && pathNames(sim).length ? `<dt>Đạo đồ</dt><dd>${esc(pathNames(sim).join(', '))}</dd>` : ''}
      <dt>Tài sản</dt><dd>${a.linhThach.toLocaleString('vi-VN')} lượng bạc${a.pills ? ` · ${a.pills} viên đan đột phá` : ''}${bagList(a, (id) => !HERB_BY_ID[id])}</dd>
      ${bagList(a, (id) => !!HERB_BY_ID[id]) ? `<dt>Linh dược</dt><dd>${bagList(a, (id) => !!HERB_BY_ID[id]).slice(3)}</dd>` : ''}
      ${a.alchemy ? `<dt>Đan đạo</dt><dd>Đan sư ${a.alchemy.level} phẩm · đan phương: ${esc(a.alchemy.recipes.map((p) => PILL_BY_ID[p]?.name ?? p).join(', '))}${a.toxicity && a.toxicity >= 1 ? ` · đan độc ${Math.round(a.toxicity)}` : ''}</dd>` : a.toxicity && a.toxicity >= 1 ? `<dt>Đan độc</dt><dd>${Math.round(a.toxicity)}</dd>` : ''}
      ${a.artifacts.length ? `<dt>Binh khí</dt><dd>${esc(a.artifacts.map((id) => LHVK.artifacts[id]?.name ?? id).join(', '))}</dd>` : ''}
      ${a.skills.length ? `<dt>Võ công</dt><dd>${a.skills.map((n) => esc(skillLabel(n))).join('<br>')}</dd>` : ''}
      <dt>Danh vọng</dt><dd>${a.renown}${a.kills ? ` · đã hạ ${a.kills} người` : ''}</dd>
    </dl>
    ${a.titles.length ? `<div class="chips">${a.titles.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${rels.length ? `<details class="rels-box"${isPlayer ? ' open' : ''}><summary class="eyebrow">Quan hệ (${rels.length})</summary><ul class="rels">${rels.map(({ o, rel }) => `<li class="${o!.alive ? '' : 'dead'}">${relationWord(rel.kind)}: ${personLink(o, sim)}</li>`).join('')}</ul></details>` : ''}`;
}

/** Items in the bag, " · name ×n" each; pills show their quality. */
function bagList(a: Avatar, keep: (id: string) => boolean): string {
  return Object.entries(a.items).filter(([k, n]) => n > 0 && keep(parseKey(k).id))
    .sort(([x], [y]) => itemName(x).localeCompare(itemName(y), 'vi'))
    .map(([k, n]) => ` · <span title="${esc(PILL_BY_ID[parseKey(k).id]?.desc ?? '')}">${esc(itemName(k))}</span>${n > 1 ? ` ×${n}` : ''}`).join('');
}

function playerCard(sim: Sim): string {
  const a = sim.get(s.soul.currentAvatarId);
  if (!a) {
    if (s.soul.pending?.kind === 'rebirth') return '';
    const years = s.soul.rebirthAt !== null ? Math.max(0, Math.ceil((s.soul.rebirthAt - s.month) / 12)) : null;
    return `<div class="card"><div class="eyebrow">Kiếp thứ ${s.soul.lives.length + 1}</div><h2>Đang luân hồi</h2>
      <p class="muted">${years !== null ? `Hồn ngươi trôi trong luân hồi. Khoảng ${years} năm nữa sẽ đầu thai.` : 'Hồn ngươi đứng bên cầu Nại Hà.'} Thế giới vẫn tiếp tục; xem tin giang hồ để biết những người cũ ra sao.</p></div>`;
  }
  return `<div class="card"><div class="eyebrow">Kiếp thứ ${(a.soulLife ?? 0) + 1} · ${s.soul.points} Luân Hồi Điểm</div>${avatarBlock(sim, a, true)}</div>`;
}

function tombstone(sim: Sim, l: LifeRecord): string {
  const a = sim.get(l.avatarId);
  const people = a ? Object.entries(a.relations)
    .filter(([, r]) => ['partner', 'master', 'disciple', 'rival', 'child'].includes(r.kind))
    .map(([id, r]) => ({ o: sim.get(Number(id)), r })).filter((x) => x.o).slice(0, 5) : [];
  return `<div class="stele">
    <div class="stele-name">${esc(l.name)}</div>
    <div class="stele-years">${yearOf(l.bornMonth)} – ${yearOf(l.diedMonth)} · hưởng ${Math.floor((l.diedMonth - l.bornMonth) / 12)} tuổi</div>
    <div class="stele-realm">${esc(REALMS[l.realm]!.name)}</div>
    <p class="stele-cause">${esc(l.causeText)}</p>
    ${l.titles.length ? `<div class="chips center">${l.titles.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${l.paths.length ? `<p class="small muted">Một đời ${esc(l.paths.join(', ').toLowerCase())}.</p>` : ''}
    ${people.length ? `<p class="small">${people.map(({ o, r }) => `${relationWord(r.kind)} ${esc(o!.name)}${o!.alive ? '' : ' (đã mất)'}`).join(' · ')}</p>` : ''}
    <div class="stele-score"><span>Đạo Quả</span><b>${l.daoQua.toLocaleString('vi-VN')}</b></div>
  </div>`;
}

function choiceCard(sim: Sim): string {
  const p = s.soul.pending;
  if (!p) return '';
  const last = s.soul.lives[s.soul.lives.length - 1];
  const options = `<div class="options">${p.options.map((o, i) => `<button class="opt" data-choose="${o.id}"><kbd>${i + 1}</kbd><span class="opt-text"><span>${esc(o.label)}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span></button>`).join('')}</div>`;
  if (p.kind === 'rebirth' && last) {
    return `<div class="card choice rebirth"><div class="eyebrow">Kiếp thứ ${last.index + 1} khép lại</div>${tombstone(sim, last)}
      <p class="prompt">${esc(p.prompt)}</p>${options}</div>`;
  }
  return `<div class="card choice"><div class="eyebrow">${esc(titleFor())}</div><p class="prompt">${esc(p.prompt)}</p>${options}
    ${p.kind === 'action' ? '<p class="small muted" style="margin:0">Việc ngươi chọn thành nếp sống. Ngươi sẽ được hỏi lại khi hoàn cảnh đổi (cảnh giới, môn phái, thương thế…) hoặc sau 5 năm.</p>' : ''}</div>`;
}

function chronicle(sim: Sim): string {
  const id = s.soul.currentAvatarId ?? s.soul.lives[s.soul.lives.length - 1]?.avatarId;
  const a = sim.get(id);
  if (!a) return '<p class="muted small">Chưa có.</p>';
  // The player's own lines read in the second person, like the story events.
  const name = a.name;
  // Birth and life-summary lines name the character on purpose ("Đứa trẻ tên …"), so they stay as written.
  const rewrite = (e: WorldEvent) => {
    const t = e.text;
    if (e.kind === 'soul' && t.startsWith('Kiếp thứ')) return t;
    return t.startsWith(name) ? `Ngươi${t.slice(name.length)}`.split(name).join('ngươi') : t.split(name).join('ngươi');
  };
  return feed(s.events.filter((e) => e.avatarIds.includes(a.id)).slice(-80).reverse(), (e) => Math.max(0, Math.floor((e.month - a.birthMonth) / 12)), rewrite);
}

// ---- Luận Kiếm: tactic, replays, Hồn ấn duels ----------------------------------------------------

const TACTIC_HINTS: Record<TacticId, string> = {
  cuong_manh: 'Luôn ra chiêu mạnh nhất',
  on_trong: 'Dưới 40% khí huyết thì thủ hoặc hồi, giữ nội lực cho chiêu lớn',
  quy_quyet: 'Khống chế trước, rồi hạ độc, rồi đánh vào hệ bị khắc',
  lieu_mang: 'Dưới 20% khí huyết: +50% công, mỗi lượt mất 5% khí huyết',
};

function replayView(): string {
  const r = ui.replay;
  if (!r) return '';
  const rec = r.rec;
  const cur = rec.turns[Math.max(0, r.shown - 1)];
  const hp = cur ? cur.hp : rec.maxHp;
  const done = r.shown >= rec.turns.length;
  const bar = (i: 0 | 1) => `<div class="fighter${done && rec.winner === i ? ' won' : ''}"><b>${esc(rec.names[i])}</b><span class="small muted">${esc(rec.realms[i])} · ${TACTIC_NAMES[rec.tactics[i]]}</span>
    <div class="meter life"><div class="track"><span style="width:${Math.max(0, (hp[i] / rec.maxHp[i]) * 100).toFixed(1)}%"></span></div><span>${Math.max(0, hp[i]).toLocaleString('vi-VN')} / ${rec.maxHp[i].toLocaleString('vi-VN')}</span></div></div>`;
  return `<div class="card replay"><div class="eyebrow">Phát lại trận đấu · ${rec.rounds} hiệp</div>
    <div class="fighters">${bar(0)}<span class="vs">đấu</span>${bar(1)}</div>
    <ol class="turns">${rec.turns.slice(0, r.shown).slice(-8).map((t) => `<li class="tone-${t.tone}">${esc(t.text)}</li>`).join('')}</ol>
    ${done ? `<p class="prompt">${esc(rec.ending)}</p>` : ''}
    <div class="controls"><button class="btn" data-act="replay-end">${done ? 'Xem lại từ đầu' : 'Xem hết'}</button><button class="btn" data-act="replay-close">Đóng</button></div></div>`;
}

function arenaView(_sim: Sim): string {
  const soul = s.soul;
  const tactic = soul.tactic ?? 'on_trong';
  const fights = (soul.fights ?? []).slice().reverse();
  const seals = (soul.seals ?? []).slice().reverse();
  const realmOf = (seal: SoulSeal) => REALMS.find((r) => r.id === seal.realm.id)!;
  return `${replayView()}
    <div class="eyebrow">Chiến thuật của ngươi</div>
    <div class="seg small" role="group" aria-label="Chiến thuật">${TACTIC_IDS.map((t) => `<button class="seg-btn ${t === tactic ? 'on' : ''}" aria-pressed="${t === tactic}" data-tactic="${t}" title="${TACTIC_HINTS[t]}">${TACTIC_NAMES[t]}</button>`).join('')}</div>
    <p class="small muted">${esc(TACTIC_HINTS[tactic])}. Dùng cho mọi trận của nhân vật: kình địch, khảo hạch, tranh chức, chạm trán.</p>
    <div class="eyebrow" style="margin-top:12px">Trận gần đây</div>
    ${fights.length ? `<ul class="feed">${fights.map((f, i) => `<li class="g-war"><span class="yr">${yearOf(f.month)}</span><span class="txt">${esc(f.names[0])} đấu ${esc(f.names[1])}: ${f.winner === null ? 'hòa' : `${esc(f.names[f.winner])} thắng`} sau ${f.rounds} hiệp. <button class="linkish" data-replay="${fights.length - 1 - i}">Xem lại</button></span></li>`).join('')}</ul>` : '<p class="small muted">Nhân vật của ngươi chưa đánh trận nào.</p>'}
    <div class="eyebrow" style="margin-top:12px">Hồn ấn các kiếp trước</div>
    ${seals.length ? `<div class="table-wrap"><table><thead><tr><th>Hồn ấn</th><th>Cảnh giới</th><th>Đạo Quả</th><th>Giao đấu</th></tr></thead><tbody>${seals.map((x) => {
      const r = realmOf(x.seal);
      return `<tr><td>${esc(x.seal.name)}<br><span class="small muted">kiếp ${x.life + 1}</span></td><td>${esc(r.name)} ${esc(r.stages[x.seal.realm.stage - 1] ?? '')}</td><td class="num">${x.seal.daoQua.toLocaleString('vi-VN')}</td>
        <td><button class="btn small" data-duel="npc:${x.life}">Cao thủ cùng cảnh giới</button>${seals.length > 1 ? ` <button class="btn small" data-duel="seal:${x.life}">Hồn ấn khác</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="small muted">Trận Hồn ấn chỉ là luận kiếm, không ảnh hưởng thế giới. Ấn khố giữ ${5 + (soul.memories.seals ?? 0)} Hồn ấn.</p>` : '<p class="small muted">Mỗi kiếp khép lại để lại một Hồn ấn. Chưa có kiếp nào.</p>'}`;
}

/** A practice duel between a past life's Hồn ấn and someone of the world (or another Hồn ấn). */
function startDuel(spec: string): void {
  const [kind, lifeStr] = spec.split(':');
  const seals = s.soul.seals ?? [];
  const mine = seals.find((x) => x.life === Number(lifeStr));
  if (!mine) return;
  const sim = new Sim(s);
  let opp: SoulSeal | undefined;
  let oppTactic: TacticId = 'cuong_manh';
  if (kind === 'seal') {
    const others = seals.filter((x) => x.life !== mine.life);
    opp = others[Math.floor(Math.random() * others.length)]?.seal;
    oppTactic = TACTIC_IDS[Math.floor(Math.random() * 4)]!;
  } else {
    const rank = REALMS.findIndex((r) => r.id === mine.seal.realm.id);
    const pool = sim.living().filter((a) => a.realm === rank && !sim.isPlayer(a)).sort((a, b) => sim.power(b) - sim.power(a));
    const pick = pool[0] ?? sim.living().filter((a) => !sim.isPlayer(a)).sort((a, b) => Math.abs(a.realm - rank) - Math.abs(b.realm - rank))[0];
    if (pick) { opp = sealOf(sim, pick); oppTactic = tacticOf(pick); }
  }
  if (!opp) return;
  const { record } = runBattle(`luan-kiem:${Date.now()}`, mine.seal, s.soul.tactic ?? 'on_trong', opp, oppTactic);
  ui.replay = { rec: record, shown: 0 };
}

// ---- Vạn Cổ Bia: best lives on this device, across every world and soul ------------------------

const BIA_KEY = 'van-kiep-giang-ho/van-co-bia';
interface BiaEntry { key: string; name: string; realm: number; daoQua: number; years: number; cause: string; titles: string[]; year: number }

function loadBia(): BiaEntry[] {
  try { return JSON.parse(localStorage.getItem(BIA_KEY) ?? '[]'); } catch { return []; }
}

/** Adds the lives this soul closed since the last look; keeps the 20 highest Đạo Quả. */
function updateBia(): void {
  const bia = loadBia();
  const keys = new Set(bia.map((b) => b.key));
  let changed = false;
  for (const l of s.soul.lives) {
    const key = `${s.seed}:${l.avatarId}`;
    if (keys.has(key)) continue;
    bia.push({ key, name: l.name, realm: l.realm, daoQua: l.daoQua, years: Math.floor((l.diedMonth - l.bornMonth) / 12), cause: l.causeText, titles: l.titles, year: yearOf(l.diedMonth) });
    changed = true;
  }
  if (!changed) return;
  bia.sort((x, y) => y.daoQua - x.daoQua);
  try { localStorage.setItem(BIA_KEY, JSON.stringify(bia.slice(0, 20))); } catch { /* storage unavailable */ }
}

function codexView(): string {
  const soul = s.soul;
  const p = codexProgress(soul);
  const goals = SOUL_TITLES.filter((t) => !soul.achievements.includes(t.id))
    .map((t) => ({ t, pr: t.progress(soul) })).sort((x, y) => y.pr[0] / y.pr[1] - x.pr[0] / x.pr[1]).slice(0, 3);
  const bar = (cur: number, target: number) => `<div class="meter act"><div class="track"><span style="width:${Math.min(100, (cur / target) * 100).toFixed(0)}%"></span></div></div>`;
  const titles = SOUL_TITLES.map((t) => {
    const done = soul.achievements.includes(t.id);
    const [cur, target] = t.progress(soul);
    return `<li class="${done ? 'done' : ''}"><b>${esc(t.name)}</b> <span class="muted small">${esc(t.desc)} · ${t.points} điểm${done ? '' : ` · ${Math.min(cur, target).toLocaleString('vi-VN')}/${target.toLocaleString('vi-VN')}`}</span></li>`;
  }).join('');
  const cats = CODEX.map((c) => {
    const got = new Set(soul.codex[c.id] ?? []);
    const n = c.entries.filter((e) => got.has(e.id)).length;
    return `<div class="codex-cat"><div class="codex-head"><b>${esc(c.name)}</b><span class="small muted">${n}/${c.entries.length}</span></div>
      <div class="codex-grid">${c.entries.map((e) => got.has(e.id) ? `<span class="codex-item on">${esc(e.name)}</span>` : '<span class="codex-item">???</span>').join('')}</div></div>`;
  }).join('');
  return `<p class="small">Kiếp Sách ghi lại mọi thứ linh hồn này đã từng là: <b>${p.have}/${p.total}</b> mục (${Math.round((p.have / p.total) * 100)}%).</p>
    ${goals.length ? `<div class="goals"><div class="eyebrow">Mục tiêu kế tiếp</div>${goals.map(({ t, pr }) => `<div class="goal-row"><span><b>${esc(t.name)}</b> <span class="small muted">${esc(t.desc)} · +${t.points} điểm</span></span>${bar(pr[0], pr[1])}</div>`).join('')}</div>` : ''}
    <details class="rels-box"><summary class="eyebrow">Danh hiệu linh hồn (${soul.achievements.length}/${SOUL_TITLES.length})</summary><ul class="soul-titles">${titles}</ul></details>
    ${cats}`;
}

function livesView(): string {
  const soul = s.soul;
  const mem = (Object.keys(MEMORIES) as (keyof typeof MEMORIES)[]).map((k) => `<li>${esc(MEMORIES[k].name)}: cấp ${soul.memories[k] ?? 0}/${MEMORIES[k].max} <span class="muted small">(${esc(MEMORIES[k].desc)})</span></li>`).join('');
  const lives = soul.lives.slice().reverse().map((l) => `<tr><td class="num">${l.index + 1}</td><td><button class="linkish" data-avatar="${l.avatarId}">${esc(l.name)}</button><br><span class="small muted">${yearOf(l.bornMonth)}–${yearOf(l.diedMonth)}, ${esc(REGION_BY_ID[l.bornRegion]!.name)}</span></td>
    <td>${esc(REALMS[l.realm]!.name)}${l.paths?.length ? `<br><span class="small muted">${esc(l.paths.join(', '))}</span>` : ''}${l.titles.length ? `<br><span class="small" style="color:var(--gold)">${esc(l.titles.join(', '))}</span>` : ''}</td><td class="small">${esc(l.causeText)}</td><td class="num">${l.daoQua.toLocaleString('vi-VN')}</td></tr>`).join('');
  return `<p class="small">${soul.points} Luân Hồi Điểm. Mở ký ức tiền kiếp ở cầu Nại Hà sau mỗi lần chết.</p>
    <p class="small">Võ duyên kiếp tới: <b>${Math.round(rebirthRootChance(soul.lives) * 100)}%</b> sinh ra có tư chất. Gốc là 30%; kiếp đầu được 60%, mỗi kiếp người thường liên tiếp thêm 15%, tối đa 75%.</p><ul class="rels">${mem}</ul>
    ${lives ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Kiếp</th><th>Tên</th><th>Cảnh giới</th><th>Kết cục</th><th>Đạo Quả</th></tr></thead><tbody>${lives}</tbody></table></div>` : '<p class="muted small" style="margin-top:12px">Đây là kiếp đầu tiên.</p>'}
    ${biaView()}`;
}

function biaView(): string {
  const bia = loadBia().slice(0, 10);
  if (!bia.length) return '';
  return `<div class="eyebrow" style="margin-top:16px">Vạn Cổ Bia · những kiếp rực rỡ nhất trên máy này</div>
    <div class="table-wrap"><table><thead><tr><th>#</th><th>Tên</th><th>Cảnh giới</th><th>Kết cục</th><th>Đạo Quả</th></tr></thead><tbody>${bia.map((b, i) => `<tr><td class="num">${i + 1}</td><td>${esc(b.name)}<br><span class="small muted">mất năm ${b.year}, ${b.years} tuổi${b.titles.length ? ` · ${esc(b.titles.join(', '))}` : ''}</span></td><td>${esc(REALMS[b.realm]!.name)}</td><td class="small">${esc(b.cause)}</td><td class="num">${b.daoQua.toLocaleString('vi-VN')}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---- interaction ----------------------------------------------------------------------------

function pick(optionId: string): void {
  choose(s, optionId);
  ui.running = true;
  save();
  render();
}

document.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act],[data-tab],[data-region],[data-avatar],[data-choose],[data-speed],[data-mapview],[data-news],[data-tactic],[data-replay],[data-duel]');
  if (!el) return;
  const d = el.dataset;
  if (d.choose) { pick(d.choose); return; }
  if (d.speed !== undefined) {
    const v = Number(d.speed);
    if (v < 0) ui.running = false;
    else { ui.speed = v; ui.running = true; prefs.speed = v; savePrefs(); }
  } else if (d.tab) ui.tab = d.tab as Tab;
  else if (d.region) { ui.region = d.region; ui.tab = 'here'; }
  else if (d.avatar) { ui.avatar = Number(d.avatar); ui.tab = 'profile'; }
  else if (d.mapview) ui.mapView = d.mapview as MapView;
  else if (d.news) ui.news = d.news as NewsFilter;
  else if (d.tactic) { s.soul.tactic = d.tactic as TacticId; save(); }
  else if (d.replay) { const f = (s.soul.fights ?? [])[Number(d.replay)]; if (f) ui.replay = { rec: f, shown: 0 }; }
  else if (d.duel) startDuel(d.duel);
  else if (d.act === 'replay-close') ui.replay = null;
  else if (d.act === 'replay-end' && ui.replay) ui.replay.shown = ui.replay.shown >= ui.replay.rec.turns.length ? 0 : ui.replay.rec.turns.length;
  else if (d.act === 'save') save();
  else if (d.act === 'hide-intro') { prefs.introHidden = true; savePrefs(); }
  else if (d.act === 'new') {
    if (ui.confirmNew > Date.now()) {
      s = createWorld(Math.floor(Math.random() * 2 ** 31), { autoplay: s.soul.autoplay });
      ui.region = null; ui.avatar = null; ui.tab = 'news'; ui.confirmNew = 0;
      save();
    } else ui.confirmNew = Date.now() + 4000;
  }
  render();
  if (d.tab) document.getElementById(`tab-${d.tab}`)?.focus();
});

document.addEventListener('keydown', (ev) => {
  const el = ev.target as HTMLElement;
  const typing = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';
  if ((ev.key === 'Enter' || ev.key === ' ') && el.dataset?.region) { ev.preventDefault(); el.click(); return; }
  if (el.getAttribute('role') === 'tab' && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
    const all = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    const i = all.indexOf(el);
    all[(i + (ev.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length]!.click();
    ev.preventDefault();
    return;
  }
  if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const p = s.soul.pending;
  if (p && /^[1-9]$/.test(ev.key)) {
    const o = p.options[Number(ev.key) - 1];
    if (o) { ev.preventDefault(); pick(o.id); }
    return;
  }
  if (ev.key === ' ' && el.tagName !== 'BUTTON' && !p) {
    ev.preventDefault();
    ui.running = !ui.running;
    render();
  }
});

document.addEventListener('change', (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === 'autoplay') { setAutoplay(s, el.checked); ui.running = true; render(); }
});

window.addEventListener('resize', () => render());

let lastSave = Date.now();
setInterval(() => {
  if (ui.replay && ui.replay.shown < ui.replay.rec.turns.length) ui.replay.shown += 1;
  if (ui.running && s.soul.pending === null) advance(s, SPEEDS[ui.speed]!.months);
  if (Date.now() - lastSave > AUTOSAVE_MS) { save(); lastSave = Date.now(); }
  render();
}, TICK_MS);

window.addEventListener('pagehide', save);
skeleton();
render();
