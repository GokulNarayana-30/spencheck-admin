/* Spencheck Admin — single-page console over Supabase.
 *
 * Signs in with Supabase Auth (email + password). Every read and write goes
 * through admin_* database functions that check the account is in
 * public.admins, so this file holds only the public URL + publishable key.
 * All text from the database is escaped with esc() before it reaches HTML.
 */
'use strict';

const SUPABASE_URL = 'https://jmnuzfrtpinwaeylxrbp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iRO4WGQea5m0Hh2qE4bcOg_zr-eeWct'; // public by design
// The default cross-tab lock (navigator.locks) can stall getSession() forever
// in some browsers, leaving a blank page. This console is single-tab, so
// run auth operations directly instead.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { lock: async (_name, _timeout, fn) => fn() },
});

// ── Helpers ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const toLocalInput = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
function ago(d) {
  if (!d) return '';
  const s = (Date.now() - Date.parse(d)) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const TONES = ['brand', 'cyan', 'green', 'amber', 'pink', 'violet'];
const toneFor = (id) => TONES[[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % TONES.length];

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  messages: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  promo: '<path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/>',
  flag: '<path d="M4 21V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  verified: '<path d="M12 2l2.4 2.1 3.2-.4.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.4L12 22l-2.4-2.1-3.2.4-.9-3.1-2.8-1.6 1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.4z"/><path d="m8.5 12 2.5 2.5 4.5-5" stroke="white"/>',
  update: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  feedback: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

function toast(msg, kind = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon(kind === 'ok' ? 'check' : 'alert')}<span>${esc(msg)}</span>`;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'ok' ? 3000 : 6000);
}

async function rpc(name, params) {
  const { data, error } = await sb.rpc(name, params);
  if (error) { toast(error.message, 'err'); throw error; }
  return data;
}

// ── Username suggestions ───────────────────────────────────────────────────
// Turns a plain input into a typeahead over admin_search_users. Selecting a
// row fills "@username". `opts.needsDevice` greys out users who have no
// phone registered (they can't receive a push).
function attachUserSuggest(input, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'suggest-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  const list = document.createElement('div');
  list.className = 'suggest';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrap.appendChild(list);
  let rows = [];
  let active = -1;
  let timer = null;
  let seq = 0;

  function render(empty) {
    list.hidden = false;
    if (!rows.length) {
      list.innerHTML = `<div class="suggest-empty">${empty ? 'No user matches that.' : 'Type a username or name…'}</div>`;
      return;
    }
    list.innerHTML = rows.map((r, i) => {
      const noDevice = opts.needsDevice && !r.devices;
      return `<div class="suggest-item ${i === active ? 'on' : ''}" role="option" data-i="${i}" ${noDevice ? 'style="opacity:.55"' : ''}>
        <div class="avatar tone-${toneFor(r.id)}">${esc(initials(r.display_name))}</div>
        <div style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.display_name)}</div><div class="small muted">@${esc(r.username)}</div></div>
        <span class="meta">${r.devices ? `${icon('bell')}${num(r.devices)}` : (opts.needsDevice ? 'no phone registered' : '')}</span></div>`;
    }).join('');
  }
  async function search() {
    const mine = ++seq;
    const { data, error } = await sb.rpc('admin_search_users', { q: input.value });
    if (mine !== seq || error) return;
    rows = data || [];
    active = rows.length ? 0 : -1;
    if (document.activeElement === input) render(input.value.replace(/^@/, '').trim() !== '');
  }
  function pick(i) {
    const r = rows[i];
    if (!r) return;
    input.value = '@' + r.username;
    list.hidden = true;
    input.dispatchEvent(new Event('change'));
  }
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 180); });
  input.addEventListener('focus', () => { if (!rows.length) search(); else render(false); });
  input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 150));
  input.addEventListener('keydown', (e) => {
    if (list.hidden || !rows.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % rows.length; render(true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + rows.length) % rows.length; render(true); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { e.stopPropagation(); list.hidden = true; }
  });
  list.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.suggest-item');
    if (item) { e.preventDefault(); pick(Number(item.dataset.i)); }
  });
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal({ title, body, foot = '', wide = false, overflow = false }) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body" ${overflow ? 'style="overflow:visible"' : ''}>${body}</div>
    ${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) closeModal(); });
  $('modalRoot').appendChild(back);
  return back.querySelector('.modal');
}
function closeModal() { $('modalRoot').innerHTML = ''; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function confirmDialog(title, text, okLabel = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    const m = openModal({
      title,
      body: `<p class="muted">${esc(text)}</p>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cfOk">${esc(okLabel)}</button>`,
    });
    let done = false;
    m.querySelector('#cfOk').onclick = () => { done = true; closeModal(); resolve(true); };
    const obs = new MutationObserver(() => { if (!document.body.contains(m)) { obs.disconnect(); if (!done) resolve(false); } });
    obs.observe($('modalRoot'), { childList: true });
  });
}

// ── Theme ──────────────────────────────────────────────────────────────────
function paintThemeBtn() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  $('themeBtn').innerHTML = icon(dark ? 'sun' : 'moon');
}
$('themeBtn').onclick = () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('spencheck-admin-theme', next); } catch (e) { /* ignore */ }
  paintThemeBtn();
  if (state.page === 'dashboard') renderDashboard();
};

// ── Auth ───────────────────────────────────────────────────────────────────
$('togglePassword').onclick = () => {
  const i = $('signInPassword');
  i.type = i.type === 'password' ? 'text' : 'password';
  $('togglePassword').textContent = i.type === 'password' ? 'Show' : 'Hide';
};
$('signInForm').onsubmit = async (e) => {
  e.preventDefault();
  $('authError').textContent = '';
  $('signInBtn').disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: $('signInEmail').value.trim(), password: $('signInPassword').value });
  $('signInBtn').disabled = false;
  if (error) { $('authError').textContent = error.message; return; }
  boot();
};
const signOut = async () => { await sb.auth.signOut(); location.reload(); };
$('signOutBtn').onclick = signOut;
$('signOutBtnNav').onclick = signOut;

async function boot() {
  // Never leave the page blank: if the stored session can't be read in 4s,
  // show the sign-in form.
  const { data } = await Promise.race([
    sb.auth.getSession(),
    new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 4000)),
  ]);
  if (!data.session) { $('authScreen').hidden = false; $('app').hidden = true; return; }
  try {
    state.stats = await rpc('admin_stats');
  } catch (e) {
    await sb.auth.signOut();
    $('authScreen').hidden = false;
    $('authError').textContent = 'This account is not an admin.';
    return;
  }
  const email = data.session.user.email || '';
  $('meName').textContent = email;
  $('meAvatar').textContent = (email[0] || 'A').toUpperCase();
  $('authScreen').hidden = true;
  $('app').hidden = false;
  go(location.hash.slice(1) || 'dashboard');
  setInterval(pollBadges, 30000);
}

// ── Navigation ─────────────────────────────────────────────────────────────
const PAGES = {
  dashboard: { label: 'Dashboard', icon: 'dashboard', sub: 'How the social side of Spencheck is doing', render: () => renderDashboard() },
  messages: { label: 'Messages', icon: 'messages', sub: 'Chat with users as the verified Spencheck account', render: () => renderMessages() },
  notifications: { label: 'Notifications', icon: 'bell', sub: 'Push a notification to every phone, or to one user', render: () => renderNotifications() },
  promotions: { label: 'Banners & popups', icon: 'promo', sub: 'Changes reach phones on their next app start — no update needed', render: () => renderPromotions() },
  feedback: { label: 'Feedback', icon: 'feedback', sub: 'Bug reports, ideas and questions from Help & feedback', render: () => renderFeedback() },
  reports: { label: 'Reports', icon: 'flag', sub: 'Users and messages reported from the app', render: () => renderReports() },
  config: { label: 'App config', icon: 'settings', sub: 'Force update and chat settings', render: () => renderConfig() },
};
const state = { page: 'dashboard', stats: {}, charts: [], openConv: null };

function renderNav() {
  const s = state.stats || {};
  const badges = { messages: s.unread_official, reports: s.open_reports, feedback: s.new_feedback };
  $('nav').innerHTML = `<div class="nav-label">Overview</div>` +
    ['dashboard'].map(navItem).join('') +
    `<div class="nav-label">Engage</div>` + ['messages', 'notifications', 'promotions'].map(navItem).join('') +
    `<div class="nav-label">Manage</div>` + ['feedback', 'reports', 'config'].map(navItem).join('');
  function navItem(k) {
    const p = PAGES[k];
    const n = badges[k];
    return `<a data-page="${k}" class="${state.page === k ? 'on' : ''}" href="#${k}">${icon(p.icon)}<span>${esc(p.label)}</span>${n ? `<span class="count badge plain">${num(n)}</span>` : ''}</a>`;
  }
}
$('nav').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-page]');
  if (!a) return;
  e.preventDefault();
  go(a.dataset.page);
});
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (PAGES[p] && p !== state.page) go(p); });

function go(page) {
  if (!PAGES[page]) page = 'dashboard';
  state.page = page;
  if (location.hash.slice(1) !== page) history.replaceState(null, '', `#${page}`);
  $('pageTitle').textContent = PAGES[page].label;
  $('pageSubtitle').textContent = PAGES[page].sub;
  closeNav();
  renderNav();
  state.charts.forEach((c) => c.destroy());
  state.charts = [];
  clearInterval(state.msgTimer);
  state.msgTimer = null;
  PAGES[page].render();
}

$('menuBtn').innerHTML = icon('menu');
$('refreshBtn').innerHTML = icon('refresh');
$('menuBtn').onclick = () => { $('sidebar').classList.add('open'); $('scrim').classList.add('open'); };
$('scrim').onclick = closeNav;
function closeNav() { $('sidebar').classList.remove('open'); $('scrim').classList.remove('open'); }
$('refreshBtn').onclick = async () => { state.stats = await rpc('admin_stats'); go(state.page); toast('Refreshed'); };

async function pollBadges() {
  if ($('app').hidden) return;
  try {
    state.stats = await sb.rpc('admin_stats').then((r) => r.data || state.stats);
    renderNav();

  } catch (e) { /* offline — try again next tick */ }
}

// ── Dashboard ──────────────────────────────────────────────────────────────
async function renderDashboard() {
  const v = $('view');
  v.innerHTML = `<div class="grid kpis">${Array.from({ length: 8 }, () => '<div class="card kpi"><div class="skeleton" style="width:100%;height:64px"></div></div>').join('')}</div>`;
  const [s, series, ai] = await Promise.all([rpc('admin_stats'), rpc('admin_timeseries', { days: 30 }), rpc('admin_ai_usage')]);
  state.stats = s;
  renderNav();
  const kpi = (label, value, ic, tone, sub = '') =>
    `<div class="card kpi"><div class="kpi-icon tone-${tone}">${icon(ic)}</div><div><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${num(value)}</div>${sub ? `<div class="kpi-sub">${esc(sub)}</div>` : ''}</div></div>`;
  const signups30 = series.reduce((n, d) => n + d.signups, 0);
  const attention = [];
  if (s.unread_official) attention.push(['messages', 'inbox', 'brand', `${num(s.unread_official)} unread ${s.unread_official === 1 ? 'reply' : 'replies'} to Spencheck`, 'Answer them in Messages']);
  if (s.new_feedback) attention.push(['feedback', 'feedback', 'cyan', `${num(s.new_feedback)} new feedback`, 'Read and reply']);
  if (s.open_reports) attention.push(['reports', 'flag', 'red', `${num(s.open_reports)} open ${s.open_reports === 1 ? 'report' : 'reports'}`, 'Review and resolve']);
  if (!s.live_promotions) attention.push(['promotions', 'promo', 'amber', 'No live banner or popup', 'Create one to announce something']);

  v.innerHTML = `
    <div class="grid kpis">
      ${kpi('Users with a username', s.profiles, 'users', 'brand', `${num(signups30)} joined in 30 days`)}
      ${kpi('New this week', s.profiles_7d, 'userPlus', 'green')}
      ${kpi('Friendships', s.friendships, 'link', 'violet')}
      ${kpi('Messages this week', s.messages_7d, 'messages', 'cyan')}
      ${kpi('Unread replies', s.unread_official, 'inbox', 'pink', 'Sent to the Spencheck account')}
      ${kpi('Open reports', s.open_reports, 'flag', s.open_reports ? 'red' : 'slate')}
      ${kpi('Live banners & popups', s.live_promotions, 'promo', 'amber')}
      ${kpi('Phones with push', s.devices, 'phone', 'slate', 'Registered for chat notifications')}
      ${kpi('Built-in AI messages today', ai.today, 'spark', 'violet', `${num(ai.users_today)} users · ${num(ai.week)} this week`)}
      ${kpi('New feedback', s.new_feedback, 'feedback', s.new_feedback ? 'cyan' : 'slate')}
    </div>
    <div class="grid two" style="margin-top:16px">
      <div class="card">
        <div class="card-head"><div><h2>Growth</h2><p>New users and daily active chatters · last 30 days</p></div></div>
        <div class="chart-box"><canvas id="growthChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Needs attention</h2><p>${attention.length ? 'Things waiting on you' : 'All clear'}</p></div></div>
        <div class="attention">${attention.map(([page, ic, tone, t, sub]) =>
          `<a data-go="${page}"><div class="kpi-icon tone-${tone}">${icon(ic)}</div><div style="flex:1"><div style="font-weight:600">${esc(t)}</div><div class="small muted">${esc(sub)}</div></div>${icon('chevron')}</a>`).join('')
          || `<div class="empty">${icon('check')}<div>Nothing waiting. Nice.</div></div>`}</div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-head"><div><h2>Activity</h2><p>Chat messages and friend requests per day</p></div></div>
      <div class="chart-box"><canvas id="activityChart"></canvas></div>
    </div>`;
  v.querySelectorAll('[data-go]').forEach((a) => a.onclick = () => go(a.dataset.go));
  drawCharts(series);
}

function drawCharts(series) {
  if (!window.Chart) return;
  const css = getComputedStyle(document.documentElement);
  const c = (n) => css.getPropertyValue(n).trim();
  const labels = series.map((d) => new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  const base = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { color: c('--text-2'), usePointStyle: true, boxWidth: 8, font: { family: 'Inter' } } },
      tooltip: { backgroundColor: c('--bg-raised'), titleColor: c('--text'), bodyColor: c('--text-2'), borderColor: c('--border-strong'), borderWidth: 1, padding: 10 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: c('--text-3'), maxTicksLimit: 8, font: { family: 'Inter' } }, border: { color: c('--border') } },
      y: { beginAtZero: true, grid: { color: c('--border') }, ticks: { color: c('--text-3'), precision: 0, font: { family: 'Inter' } }, border: { display: false } },
    },
  };
  const brand = c('--brand');
  state.charts.push(new Chart($('growthChart'), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'New users', data: series.map((d) => d.signups), borderColor: brand, backgroundColor: c('--brand-soft'), fill: true, tension: .35, pointRadius: 0, borderWidth: 2 },
      { label: 'Active chatters', data: series.map((d) => d.active_users), borderColor: c('--cyan'), tension: .35, pointRadius: 0, borderWidth: 2 },
    ] },
    options: base,
  }));
  state.charts.push(new Chart($('activityChart'), {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Messages', data: series.map((d) => d.messages), backgroundColor: brand, borderRadius: 6, maxBarThickness: 18 },
      { label: 'Friend requests', data: series.map((d) => d.friend_requests), backgroundColor: c('--violet'), borderRadius: 6, maxBarThickness: 18 },
    ] },
    options: base,
  }));
}

// ── Messages ───────────────────────────────────────────────────────────────
async function renderMessages() {
  const cfg = await rpc('admin_list_config');
  const repliesOn = (cfg.find((r) => r.key === 'official_chat')?.value?.replies) !== false;
  $('view').innerHTML = `
    <div class="toolbar">
      <label class="check"><span class="switch"><input type="checkbox" id="repliesOn" ${repliesOn ? 'checked' : ''}><span></span></span>Users can reply</label>
      <button class="btn btn-primary" id="newMsg">${icon('plus')}New message</button>
    </div>
    <div class="card inbox" id="inbox">
      <div class="thread-list" id="threadList"></div>
      <div class="convo" id="convo"><div class="empty" style="margin:auto">${icon('messages')}<div>Pick a conversation, or start one with <b>New message</b>.</div></div></div>
    </div>`;
  $('repliesOn').onchange = async (e) => {
    await rpc('admin_set_config', { config_key: 'official_chat', config_value: { replies: e.target.checked } });
    toast(e.target.checked ? 'Users can reply' : 'Replies off — it’s an announcements channel now');
  };
  $('newMsg').onclick = () => composeModal();
  await refreshThreads();
  if (state.openConv) openThread(state.openConv);
  // Near-live while this page is open (admins aren't chat members, so they
  // can't use Realtime on messages): the open chat every 4s, the list every 10s.
  let tick = 0;
  state.msgTimer = setInterval(async () => {
    if (document.hidden || state.page !== 'messages') return;
    tick++;
    try {
      if (state.openConv) await loadConvo(state.openConv, true);
      if (tick % 3 === 0 || !state.openConv) await refreshThreads(true);
    } catch (e) { /* offline — next tick */ }
  }, 4000);
}

let threads = [];
async function refreshThreads(quiet = false) {
  if (!$('threadList')) return;
  if (quiet) {
    const { data, error } = await sb.rpc('admin_official_threads');
    if (error || !data) return;
    if (JSON.stringify(data) === JSON.stringify(threads)) return;
    threads = data;
    const unread = threads.reduce((n, t) => n + (t.unread || 0), 0);
    if (state.stats.unread_official !== unread) { state.stats.unread_official = unread; renderNav(); }
  } else {
    threads = await rpc('admin_official_threads');
  }
  $('threadList').innerHTML = threads.map((t) => {
    const preview = t.last_kind === 'image' ? '📷 Photo' : (t.last_body || '');
    return `<div class="thread-item ${state.openConv === t.conversation_id ? 'on' : ''} ${t.unread ? 'unread' : ''}" data-conv="${esc(t.conversation_id)}">
      <div class="avatar tone-${toneFor(t.user_id)}">${esc(initials(t.display_name))}</div>
      <div class="thread-main">
        <div class="thread-top"><span class="thread-name">${esc(t.display_name)}</span><span class="thread-time">${esc(ago(t.last_at))}</span></div>
        <div class="thread-preview"><span>${t.last_from_user ? '' : 'You: '}${esc(preview)}</span>${t.unread ? `<span class="count">${num(t.unread)}</span>` : ''}</div>
      </div></div>`;
  }).join('') || `<div class="empty">${icon('inbox')}<div>No conversations yet.</div></div>`;
  $('threadList').querySelectorAll('[data-conv]').forEach((el) => el.onclick = () => openThread(el.dataset.conv));
}

async function openThread(conv) {
  state.openConv = conv;
  const t = threads.find((x) => x.conversation_id === conv);
  $('threadList').querySelectorAll('[data-conv]').forEach((el) => el.classList.toggle('on', el.dataset.conv === conv));
  $('inbox').classList.add('has-open');
  const keepDraft = $('replyBody')?.value || '';
  $('convo').innerHTML = `
    <div class="convo-head">
      <button class="icon-btn" id="backToList" aria-label="Back" style="display:none">${icon('back')}</button>
      <div class="avatar tone-${toneFor(t?.user_id || conv)}">${esc(initials(t?.display_name))}</div>
      <div style="min-width:0"><div style="font-weight:600">${esc(t?.display_name || 'User')}</div><div class="small muted">@${esc(t?.username || '')}</div></div>
    </div>
    <div class="convo-body" id="convoBody"><div class="skeleton" style="height:40px;width:50%"></div></div>
    <form class="composer" id="replyForm">
      <textarea class="textarea" id="replyBody" maxlength="4000" placeholder="Reply as Spencheck…" rows="1"></textarea>
      <button class="btn btn-primary" type="submit">${icon('send')}<span class="hide-sm">Send</span></button>
    </form>`;
  if (window.matchMedia('(max-width: 720px)').matches) {
    $('backToList').style.display = 'inline-flex';
    $('backToList').onclick = () => { state.openConv = null; $('inbox').classList.remove('has-open'); };
  }
  $('replyBody').value = keepDraft;
  $('replyBody').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('replyForm').requestSubmit(); } };
  $('replyForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = $('replyBody').value.trim();
    if (!body) return;
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try { await rpc('admin_official_reply', { conv, body }); $('replyBody').value = ''; await loadConvo(conv); refreshThreads(); }
    finally { btn.disabled = false; }
  };
  await loadConvo(conv);
  refreshThreads();
  state.stats = await rpc('admin_stats');
  renderNav();
}

let lastConvoKey = '';
async function loadConvo(conv, quiet = false) {
  let msgs;
  if (quiet) {
    const { data, error } = await sb.rpc('admin_official_messages', { conv });
    if (error || !data) return;
    msgs = data;
  } else {
    msgs = await rpc('admin_official_messages', { conv });
  }
  if (state.openConv !== conv || !$('convoBody')) return;
  const key = conv + ':' + msgs.length + ':' + (msgs[0]?.id || '');
  if (quiet && key === lastConvoKey) return;
  lastConvoKey = key;
  // Newest first (column-reverse), with a day label after each day's last message.
  let html = '';
  msgs.forEach((m, i) => {
    const cls = m.kind === 'system' ? 'system' : m.from_user ? 'them' : 'me';
    const text = m.kind === 'image' ? `📷 Photo${m.body ? ` · ${m.body}` : ''}` : m.kind === 'split' || m.kind === 'settle' ? `[${m.kind}] ${m.body || ''}` : m.body;
    html += `<div class="bubble ${cls}">${esc(text)}<time>${esc(new Date(m.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }))}</time></div>`;
    const next = msgs[i + 1];
    if (!next || new Date(next.created_at).toDateString() !== new Date(m.created_at).toDateString()) {
      html += `<div class="day-sep">${esc(fmtDay(m.created_at))}</div>`;
    }
  });
  $('convoBody').innerHTML = html || `<div class="empty" style="margin:auto">No messages yet.</div>`;
}

function composeModal(draft = {}) {
  const m = openModal({
    title: 'New message from Spencheck',
    overflow: true,
    body: `
      <div class="field"><label>Send to</label>
        <div class="segmented" id="toSeg"><button type="button" class="on" data-to="one">One user</button><button type="button" data-to="all">Everyone</button></div></div>
      <div class="field" id="toUserField"><label for="cmUser">Username</label><input class="input" id="cmUser" placeholder="@username" autocomplete="off"></div>
      <div class="field"><label for="cmBody">Message</label><textarea class="textarea" id="cmBody" maxlength="4000" placeholder="Hi! …"></textarea>
        <span class="hint" id="cmHint">Arrives in their Chats tab from “Spencheck” with a verified tick, plus a push notification.</span></div>`,
    foot: `<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="cmSend">${icon('send')}Send</button>`,
  });
  let all = false;
  m.querySelectorAll('#toSeg button').forEach((b) => b.onclick = () => {
    all = b.dataset.to === 'all';
    m.querySelectorAll('#toSeg button').forEach((x) => x.classList.toggle('on', x === b));
    m.querySelector('#toUserField').hidden = all;
    m.querySelector('#cmHint').textContent = all
      ? `Goes to all ${num(state.stats.profiles)} users, each with a push notification.`
      : 'Arrives in their Chats tab from “Spencheck” with a verified tick, plus a push notification.';
  });
  attachUserSuggest(m.querySelector('#cmUser'));
  m.querySelector('#cmUser').value = draft.user || '';
  m.querySelector('#cmBody').value = draft.body || '';
  if (draft.all) m.querySelector('#toSeg [data-to=all]').click();
  m.querySelector(draft.all ? '#cmBody' : '#cmUser').focus();
  m.querySelector('#cmSend').onclick = async () => {
    const body = m.querySelector('#cmBody').value.trim();
    const user = m.querySelector('#cmUser').value.trim();
    if (!body) { toast('Write a message first', 'err'); return; }
    if (!all && !user) { toast('Enter a @username', 'err'); return; }
    if (all && !(await confirmDialog('Send to everyone?', `This goes to all ${num(state.stats.profiles)} users with a push notification. It can’t be unsent.`, 'Send to everyone'))) { composeModal({ all, user, body }); return; }
    const btn = $('cmSend');
    if (btn) btn.disabled = true;
    try {
      const n = await rpc('admin_send_official', { target_username: all ? null : user, body });
      closeModal();
      toast(`Sent to ${num(n)} ${n === 1 ? 'user' : 'users'}`);
      await refreshThreads();
      if (!all && threads[0]) openThread(threads[0].conversation_id);
    } catch (e) { if (btn) btn.disabled = false; }
  };
}

// ── Push notifications ─────────────────────────────────────────────────────
async function renderNotifications() {
  $('view').innerHTML = `<div class="grid two">
    <div class="card">
      <div class="card-head"><div><h2>New notification</h2><p>Shows in the phone’s notification shade, even when Spencheck is closed</p></div></div>
      <div class="card-pad">
        <div class="field"><label>Send to</label>
          <div class="segmented" id="nfTo"><button type="button" class="on" data-to="all">Everyone</button><button type="button" data-to="user">One user</button></div>
          <span class="hint" id="nfToHint">Every phone with Spencheck installed and notifications allowed.</span></div>
        <div class="field" id="nfUserField" hidden><label for="nfUser">Username</label><input class="input" id="nfUser" placeholder="@username" autocomplete="off"></div>
        <div class="field"><label for="nfTitle">Title <span class="muted small" id="nfTitleCount">0/65</span></label><input class="input" id="nfTitle" maxlength="65" placeholder="e.g. Your November wrap is ready"></div>
        <div class="field"><label for="nfBody">Message <span class="muted small" id="nfBodyCount">0/240</span></label><textarea class="textarea" id="nfBody" maxlength="240" placeholder="One or two short lines."></textarea></div>
        <div class="field"><label for="nfLink">Tapping it opens</label><select class="select" id="nfLink">${LINKS.map(([v, l]) => `<option value="${esc(v)}">${esc(v === '' ? 'The app (home)' : l)}</option>`).join('')}</select></div>
        <div class="field" id="nfUrlField" hidden><label for="nfUrl">Web link</label><input class="input" id="nfUrl" placeholder="https://…"></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" id="nfSend">${icon('send')}Send notification</button></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Preview</h2><p>Roughly how Android shows it</p></div></div>
      <div class="card-pad" style="background:var(--bg-raised);border-radius:0 0 var(--radius) var(--radius)">
        <div style="background:#1F2330;color:#F3F5F9;border-radius:22px;padding:14px 16px;box-shadow:var(--shadow);max-width:380px;margin:0 auto">
          <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:#AAB2C2"><span class="logo" style="width:18px;height:18px;border-radius:6px;font-size:10px;box-shadow:none">S</span>Spencheck · now</div>
          <div id="nfPvTitle" style="font-weight:600;margin-top:8px;font-size:14px">Title</div>
          <div id="nfPvBody" style="color:#C9CFDA;font-size:13px;margin-top:2px;white-space:pre-wrap"></div>
        </div>
        <p class="hint" style="text-align:center;margin-top:14px">Delivered once. It can’t be edited or recalled after sending.</p>
      </div>
    </div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><div><h2>History</h2><p>Last 100 sent from this panel</p></div></div><div class="table-wrap" id="nfHistory"></div></div>`;
  attachUserSuggest($('nfUser'), { needsDevice: true });
  let audience = 'all';
  const pv = () => {
    $('nfPvTitle').textContent = $('nfTitle').value || 'Title';
    $('nfPvBody').textContent = $('nfBody').value;
    $('nfTitleCount').textContent = `${$('nfTitle').value.length}/65`;
    $('nfBodyCount').textContent = `${$('nfBody').value.length}/240`;
  };
  ['nfTitle', 'nfBody'].forEach((id) => $(id).addEventListener('input', pv));
  $('nfLink').onchange = () => { $('nfUrlField').hidden = $('nfLink').value !== 'url'; };
  $('nfTo').querySelectorAll('button').forEach((b) => b.onclick = () => {
    audience = b.dataset.to;
    $('nfTo').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    $('nfUserField').hidden = audience !== 'user';
    $('nfToHint').textContent = audience === 'user'
      ? 'Their registered phones (they need a username, and to have opened the app since).'
      : 'Every phone with Spencheck installed and notifications allowed.';
  });
  $('nfSend').onclick = async () => {
    const title = $('nfTitle').value.trim();
    const body = $('nfBody').value.trim();
    const link = $('nfLink').value === 'url' ? $('nfUrl').value.trim() : $('nfLink').value;
    const username = $('nfUser').value.trim();
    if (!title || !body) { toast('Add a title and a message', 'err'); return; }
    if ($('nfLink').value === 'url' && !/^https:\/\//.test(link)) { toast('Web links must start with https://', 'err'); return; }
    if (audience === 'user' && !username) { toast('Enter a @username', 'err'); return; }
    const ok = await confirmDialog(
      audience === 'all' ? 'Send to everyone?' : `Send to @${username.replace(/^@/, '')}?`,
      audience === 'all' ? 'Every phone with Spencheck gets this notification. It can’t be recalled.' : 'It arrives on their phone right away.',
      'Send', audience === 'all');
    if (!ok) return;
    $('nfSend').disabled = true;
    try {
      const { data, error } = await sb.functions.invoke('admin-push', { body: { title, body, link, audience, username } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).error || msg; } catch (e) { /* keep */ }
        toast(msg, 'err');
      } else {
        toast(audience === 'all' ? 'Sent to everyone' : `Sent to ${data.devices} ${data.devices === 1 ? 'phone' : 'phones'}`);
        $('nfTitle').value = ''; $('nfBody').value = ''; pv();
      }
    } finally {
      $('nfSend').disabled = false;
      loadHistory();
    }
  };
  pv();
  loadHistory();
  async function loadHistory() {
    const rows = await rpc('admin_list_notifications');
    const tone = { sent: 'tone-green', failed: 'tone-red', sending: 'tone-amber' };
    $('nfHistory').innerHTML = rows.length ? `<table><thead><tr><th>Notification</th><th>To</th><th class="hide-sm">Opens</th><th>Status</th><th class="hide-sm">Sent</th></tr></thead><tbody>${rows.map((r) => `
      <tr><td><div class="cell-title">${esc(r.title)}</div><div class="cell-sub">${esc(r.body)}</div></td>
        <td>${r.audience === 'all' ? 'Everyone' : '@' + esc(r.target_username)}</td>
        <td class="hide-sm small muted">${esc(!r.link ? 'The app' : (LINKS.find(([v]) => v === r.link)?.[1] || r.link))}</td>
        <td><span class="badge ${tone[r.status] || 'tone-slate'}" ${r.error ? `title="${esc(r.error)}"` : ''}>${esc(r.status)}</span></td>
        <td class="hide-sm small muted">${esc(fmtDate(r.created_at))}</td></tr>`).join('')}</tbody></table>`
      : `<div class="empty">${icon('bell')}<div>No notifications sent yet.</div></div>`;
  }
}

// ── Banners & popups ───────────────────────────────────────────────────────
const SLOT_LABEL = { home_inline: 'Home card', app_open_popup: 'App-open popup', system_popup: 'System popup', home_carousel: 'Home carousel', post_save: 'After save', more_offers: 'More tab' };
const LINKS = [
  ['', 'Nothing (just close)'], ['spencheck://social', 'Social tab'], ['spencheck://friends/find', 'Find friends'],
  ['spencheck://budget', 'Budget'], ['spencheck://reports', 'Reports'], ['spencheck://sms', 'SMS review'],
  ['spencheck://year-review', 'Year review'], ['spencheck://bills', 'Upcoming bills'], ['spencheck://reminders', 'Reminders'],
  ['spencheck://notifications', 'Notification settings'], ['spencheck://update', 'Play Store (update)'], ['url', 'Web link…'],
];
function promoStatus(p) {
  const now = Date.now();
  if (!p.is_active) return ['Paused', 'tone-slate'];
  if (Date.parse(p.starts_at) > now) return ['Scheduled', 'tone-brand'];
  if (p.ends_at && Date.parse(p.ends_at) <= now) return ['Ended', 'tone-slate'];
  return ['Live', 'tone-green'];
}
let promos = [];
async function renderPromotions() {
  $('view').innerHTML = `<div class="toolbar"><div class="segmented" id="promoFilter">
      <button class="on" data-f="all">All</button><button data-f="live">Live</button><button data-f="scheduled">Scheduled</button><button data-f="off">Paused / ended</button></div>
      <button class="btn btn-primary" id="newPromo">${icon('plus')}New banner or popup</button></div>
    <div class="card table-wrap" id="promoTable"></div>`;
  $('newPromo').onclick = () => promoEditor(null);
  let filter = 'all';
  $('promoFilter').querySelectorAll('button').forEach((b) => b.onclick = () => {
    filter = b.dataset.f;
    $('promoFilter').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  });
  promos = await rpc('admin_list_promotions');
  draw();
  function draw() {
    const rows = promos.filter((p) => {
      const s = promoStatus(p)[0];
      return filter === 'all' || (filter === 'live' && s === 'Live') || (filter === 'scheduled' && s === 'Scheduled') || (filter === 'off' && (s === 'Paused' || s === 'Ended'));
    });
    $('promoTable').innerHTML = rows.length ? `<table><thead><tr><th>Promotion</th><th>Where</th><th class="hide-sm">Schedule</th><th>Status</th></tr></thead><tbody>${rows.map((p) => {
      const [label, tone] = promoStatus(p);
      return `<tr class="click" data-id="${esc(p.id)}"><td><div style="display:flex;gap:12px;align-items:center">
          ${p.image_url ? `<img class="thumb" src="${esc(p.image_url)}" alt="">` : `<div class="thumb kpi-icon tone-brand">${icon(p.slot === 'home_inline' ? 'promo' : 'phone')}</div>`}
          <div style="min-width:0"><div class="cell-title">${esc(p.title)}${p.blocking ? ' <span class="badge plain tone-red">Blocking</span>' : ''}${p.sponsored ? ' <span class="badge plain tone-amber">Sponsored</span>' : ''}</div><div class="cell-sub">${esc(p.subtitle || '')}</div></div></div></td>
        <td>${esc(SLOT_LABEL[p.slot] || p.slot)}</td>
        <td class="hide-sm small muted">${esc(fmtDate(p.starts_at))} → ${esc(p.ends_at ? fmtDate(p.ends_at) : 'no end')}</td>
        <td><span class="badge ${tone}">${label}</span></td></tr>`;
    }).join('')}</tbody></table>`
      : `<div class="empty">${icon('promo')}<div>Nothing here yet. Create a Home card or a popup.</div></div>`;
    $('promoTable').querySelectorAll('tr[data-id]').forEach((tr) => tr.onclick = () => promoEditor(promos.find((p) => p.id === tr.dataset.id)));
  }
}

function promoEditor(p) {
  const link = p?.deep_link || '';
  const known = LINKS.some(([v]) => v === link);
  const m = openModal({
    wide: true,
    title: p ? 'Edit promotion' : 'New banner or popup',
    body: `<div class="editor"><div>
      <div class="field"><label>Where it shows</label>
        <div class="segmented" id="peSlot">
          <button type="button" data-slot="home_inline">Home card</button>
          <button type="button" data-slot="app_open_popup">App-open popup</button>
          <button type="button" data-slot="system_popup">System popup</button></div>
        <span class="hint" id="peSlotHint"></span></div>
      <div class="field"><label for="peTitle">Title</label><input class="input" id="peTitle" maxlength="80"></div>
      <div class="field"><label for="peSub">Message</label><textarea class="textarea" id="peSub" maxlength="300"></textarea></div>
      <div class="field-row">
        <div class="field"><label for="peCta">Button label</label><input class="input" id="peCta" maxlength="30" placeholder="e.g. Try it"></div>
        <div class="field"><label for="peLink">Button opens</label><select class="select" id="peLink">${LINKS.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>
      </div>
      <div class="field" id="peUrlField" hidden><label for="peUrl">Web link</label><input class="input" id="peUrl" placeholder="https://…"></div>
      <div class="field"><label for="peImage">Image <span class="muted">(optional)</span></label><input class="input" type="file" id="peImage" accept="image/*" style="padding-top:9px"></div>
      <div class="field-row">
        <div class="field"><label for="peStart">Starts</label><input class="input" type="datetime-local" id="peStart"></div>
        <div class="field"><label for="peEnd">Ends <span class="muted">(optional)</span></label><input class="input" type="datetime-local" id="peEnd"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="peFreq">How often (popups)</label><select class="select" id="peFreq"><option value="once_per_user">Once per user</option><option value="once_per_day">Once a day</option><option value="every_open">Every app open</option></select></div>
        <div class="field"><label for="peBelow">Only app versions below</label><input class="input" type="number" id="peBelow" placeholder="blank = everyone"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
        <label class="check"><span class="switch"><input type="checkbox" id="peActive"><span></span></span>Active</label>
        <label class="check" id="peBlockingRow"><span class="switch"><input type="checkbox" id="peBlocking"><span></span></span>Blocking — full screen, can’t be dismissed (maintenance)</label>
        <label class="check"><span class="switch"><input type="checkbox" id="peSponsored"><span></span></span>Sponsored label</label>
      </div>
    </div>
    <div><div class="field"><label>Preview</label></div><div class="phone"><div class="phone-screen" id="pePreview"></div></div></div></div>`,
    foot: `${p ? `<button class="btn btn-danger-outline" id="peDelete">Delete</button>` : ''}<span class="spacer"></span><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="peSave">Save &amp; publish</button>`,
  });
  const q = (id) => m.querySelector('#' + id);
  let slot = p?.slot && ['home_inline', 'app_open_popup', 'system_popup'].includes(p.slot) ? p.slot : 'home_inline';
  let imageUrl = p?.image_url || '';
  let file = null;
  q('peTitle').value = p?.title || '';
  q('peSub').value = p?.subtitle || '';
  q('peCta').value = p?.cta_label || '';
  q('peLink').value = known ? link : 'url';
  q('peUrl').value = known ? '' : link;
  q('peUrlField').hidden = known;
  q('peStart').value = toLocalInput(p?.starts_at || new Date());
  q('peEnd').value = toLocalInput(p?.ends_at);
  q('peFreq').value = p?.frequency || 'once_per_user';
  q('peBelow').value = p?.audience?.below_version ?? '';
  q('peActive').checked = p ? p.is_active : true;
  q('peBlocking').checked = !!p?.blocking;
  q('peSponsored').checked = !!p?.sponsored;

  const hints = {
    home_inline: 'A card on Home under the shortcuts. Users can close it.',
    app_open_popup: 'A dialog when the app opens, at the frequency below.',
    system_popup: 'Shown before any other popup. Turn on “Blocking” for maintenance.',
  };
  function setSlot(s) {
    slot = s;
    m.querySelectorAll('#peSlot button').forEach((b) => b.classList.toggle('on', b.dataset.slot === s));
    q('peSlotHint').textContent = hints[s];
    q('peBlockingRow').hidden = s !== 'system_popup';
    if (s !== 'system_popup') q('peBlocking').checked = false;
    preview();
  }
  m.querySelectorAll('#peSlot button').forEach((b) => b.onclick = () => setSlot(b.dataset.slot));
  q('peLink').onchange = () => { q('peUrlField').hidden = q('peLink').value !== 'url'; };
  q('peImage').onchange = () => { file = q('peImage').files[0] || null; preview(); };
  ['peTitle', 'peSub', 'peCta'].forEach((id) => q(id).addEventListener('input', preview));
  ['peSponsored', 'peBlocking'].forEach((id) => q(id).addEventListener('change', preview));

  function preview() {
    const title = esc(q('peTitle').value || 'Your title');
    const sub = esc(q('peSub').value);
    const cta = esc(q('peCta').value);
    const img = file ? URL.createObjectURL(file) : imageUrl;
    const spons = q('peSponsored').checked ? '<div class="p-spons">Sponsored</div>' : '';
    const home = `<div class="phone-hero"><span style="color:#98A2B3">This month</span><b>₹24,580</b></div><div class="phone-row"></div>`;
    let html;
    if (slot === 'home_inline') {
      html = `${home}<div class="p-card">${img ? `<img src="${esc(img)}" alt="">` : ''}<div style="flex:1;min-width:0">${spons}<div class="p-title">${title}</div>${sub ? `<div class="p-sub">${sub}</div>` : ''}${cta ? `<div class="p-cta">${cta}</div>` : ''}</div><span style="color:#98A2B3">✕</span></div><div class="phone-row"></div><div class="phone-row"></div>`;
    } else if (slot === 'system_popup' && q('peBlocking').checked) {
      html = `<div class="p-full"><div class="ic">${icon('alert')}</div><div class="p-title" style="font:700 16px var(--font-heading)">${title}</div>${sub ? `<div class="p-sub" style="font-size:12px">${sub}</div>` : ''}${cta ? `<div class="btnx">${cta}</div>` : ''}</div>`;
    } else {
      html = `${home}<div class="phone-row"></div><div class="p-overlay"><div class="p-dialog">${img ? `<img src="${esc(img)}" alt="">` : ''}<div class="in">${spons}<div class="p-title">${title}</div>${sub ? `<div class="p-sub" style="margin-top:6px;font-size:11.5px">${sub}</div>` : ''}</div><div class="p-actions"><span style="color:#8B9BFF">${cta ? 'Not now' : 'OK'}</span>${cta ? `<span class="fill">${cta}</span>` : ''}</div></div></div>`;
    }
    q('pePreview').innerHTML = html;
  }
  setSlot(slot);

  q('peSave').onclick = async () => {
    const title = q('peTitle').value.trim();
    if (!title) { toast('Add a title', 'err'); q('peTitle').focus(); return; }
    const linkVal = q('peLink').value === 'url' ? q('peUrl').value.trim() : q('peLink').value;
    if (q('peLink').value === 'url' && !/^https:\/\//.test(linkVal)) { toast('Web links must start with https://', 'err'); return; }
    q('peSave').disabled = true;
    try {
      if (file) {
        const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const { error } = await sb.storage.from('promotions').upload(path, file, { contentType: file.type });
        if (error) { toast(error.message, 'err'); return; }
        imageUrl = sb.storage.from('promotions').getPublicUrl(path).data.publicUrl;
      }
      const below = q('peBelow').value.trim();
      await rpc('admin_save_promotion', { p: {
        id: p?.id ?? null, slot, title, subtitle: q('peSub').value.trim(), cta_label: q('peCta').value.trim(),
        deep_link: linkVal, image_url: imageUrl || null,
        starts_at: q('peStart').value ? new Date(q('peStart').value).toISOString() : null,
        ends_at: q('peEnd').value ? new Date(q('peEnd').value).toISOString() : null,
        frequency: q('peFreq').value, audience: below ? { below_version: Number(below) } : {},
        is_active: q('peActive').checked, blocking: q('peBlocking').checked, sponsored: q('peSponsored').checked,
      } });
      closeModal();
      toast(p ? 'Saved' : 'Published');
      renderPromotions();
    } finally { if (q('peSave')) q('peSave').disabled = false; }
  };
  if (p) q('peDelete').onclick = async () => {
    if (!(await confirmDialog('Delete this promotion?', `“${p.title}” disappears from every phone on its next app start.`, 'Delete', true))) { promoEditor(p); return; }
    await rpc('admin_delete_promotion', { promotion_id: p.id });
    toast('Deleted');
    renderPromotions();
  };
}

// ── Reports ────────────────────────────────────────────────────────────────
const REASON = { spam: 'Spam', harassment: 'Harassment', scam: 'Scam or fraud', inappropriate: 'Inappropriate', other: 'Other' };
const STATUS_TONE = { open: 'tone-amber', reviewed: 'tone-brand', dismissed: 'tone-slate', actioned: 'tone-green' };
async function renderReports(onlyOpen = true) {
  $('view').innerHTML = `<div class="toolbar"><div class="segmented" id="repFilter"><button data-open="1" class="${onlyOpen ? 'on' : ''}">Open</button><button data-open="0" class="${onlyOpen ? '' : 'on'}">All</button></div></div>
    <div class="card table-wrap" id="repTable"><div class="empty"><div class="skeleton" style="height:16px;width:40%;margin:auto"></div></div></div>`;
  $('repFilter').querySelectorAll('button').forEach((b) => b.onclick = () => renderReports(b.dataset.open === '1'));
  const rows = await rpc('admin_list_reports', { only_open: onlyOpen });
  $('repTable').innerHTML = rows.length ? `<table><thead><tr><th>Reported</th><th>Reason</th><th class="hide-sm">Details</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((r) => `
    <tr><td><div style="display:flex;gap:10px;align-items:center"><div class="avatar tone-${toneFor(r.reported_id || r.id)}" style="width:34px;height:34px;font-size:12px">${esc(initials(r.reported_display_name || '?'))}</div>
        <div><div class="cell-title">${esc(r.reported_display_name || 'Deleted account')}</div><div class="cell-sub">${r.reported_username ? '@' + esc(r.reported_username) : ''} · ${esc(fmtDate(r.created_at))} · by @${esc(r.reporter_username || 'deleted')}</div></div></div></td>
      <td>${esc(REASON[r.reason] || r.reason)}</td>
      <td class="hide-sm" style="max-width:340px">${esc(r.details || '')}${r.message_body ? `<div class="cell-sub" style="margin-top:4px">Message: “${esc(r.message_body)}”</div>` : ''}${!r.details && !r.message_body ? '<span class="muted">—</span>' : ''}</td>
      <td><span class="badge ${STATUS_TONE[r.status] || 'tone-slate'}">${esc(r.status)}</span></td>
      <td style="white-space:nowrap;text-align:right">${r.status === 'open' ? `
        <button class="btn btn-ghost btn-sm" data-act="dismissed" data-id="${esc(r.id)}">Dismiss</button>
        <button class="btn btn-outline btn-sm" data-act="reviewed" data-id="${esc(r.id)}">Reviewed</button>
        ${r.reported_username ? `<button class="btn btn-danger-outline btn-sm" data-remove="${esc(r.reported_id)}" data-name="${esc(r.reported_username)}">Remove user</button>` : ''}` : ''}</td></tr>`).join('')}</tbody></table>`
    : `<div class="empty">${icon('check')}<div>${onlyOpen ? 'No open reports. All clear.' : 'No reports yet.'}</div></div>`;
  $('repTable').querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => {
    await rpc('admin_set_report_status', { report_id: b.dataset.id, new_status: b.dataset.act });
    toast(b.dataset.act === 'dismissed' ? 'Dismissed' : 'Marked reviewed');
    renderReports(onlyOpen);
  });
  $('repTable').querySelectorAll('[data-remove]').forEach((b) => b.onclick = async () => {
    if (!(await confirmDialog(`Remove @${b.dataset.name}?`, 'Deletes their username, friends, chats and messages. Their sign-in and the money data on their phone are not touched.', 'Remove user', true))) return;
    await rpc('admin_remove_profile', { target_id: b.dataset.remove });
    toast('User removed');
    renderReports(onlyOpen);
  });
}

// ── Feedback ───────────────────────────────────────────────────────────────
const KIND = { bug: ['Bug', 'tone-red'], idea: ['Idea', 'tone-amber'], question: ['Question', 'tone-brand'], other: ['Other', 'tone-slate'] };
const FB_TONE = { new: 'tone-cyan', read: 'tone-slate', replied: 'tone-green', closed: 'tone-slate' };
async function renderFeedback(onlyOpen = true) {
  $('view').innerHTML = `<div class="toolbar"><div class="segmented" id="fbFilter"><button data-open="1" class="${onlyOpen ? 'on' : ''}">Open</button><button data-open="0" class="${onlyOpen ? '' : 'on'}">All</button></div></div>
    <div class="grid" id="fbList"><div class="card card-pad"><div class="skeleton" style="height:16px;width:40%"></div></div></div>`;
  $('fbFilter').querySelectorAll('button').forEach((b) => b.onclick = () => renderFeedback(b.dataset.open === '1'));
  const rows = await rpc('admin_list_feedback', { only_open: onlyOpen });
  // Opening the page marks new items as read.
  const fresh = rows.filter((r) => r.status === 'new');
  $('fbList').innerHTML = rows.length ? rows.map((r) => {
    const [kind, tone] = KIND[r.kind] || KIND.other;
    const who = r.display_name ? `${esc(r.display_name)} <span class="muted">@${esc(r.username)}</span>` : (r.email ? esc(r.email) : '<span class="muted">Anonymous</span>');
    return `<div class="card"><div class="card-head" style="align-items:flex-start">
        <div style="display:flex;gap:12px;align-items:center;min-width:0"><div class="avatar tone-${toneFor(r.username || r.email || r.id)}">${esc(initials(r.display_name || r.email || '?'))}</div>
          <div style="min-width:0"><div style="font-weight:600">${who}</div><div class="small muted">${esc(fmtDate(r.created_at))}${r.app_version ? ` · v${esc(r.app_version)}` : ''}${r.device ? ` · ${esc(r.device)}` : ''}</div></div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="badge plain ${tone}">${kind}</span><span class="badge ${FB_TONE[r.status] || 'tone-slate'}">${esc(r.status)}</span></div></div>
      <div class="card-pad" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.message)}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding:0 20px 16px">
        ${r.username ? `<button class="btn btn-primary btn-sm" data-chat="${esc(r.username)}" data-id="${esc(r.id)}">${icon('messages')}Reply in chat</button>` : ''}
        ${r.email ? `<a class="btn btn-outline btn-sm" href="mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent('Re: your Spencheck feedback')}" data-mail="${esc(r.id)}">${icon('mail')}Email</a>` : ''}
        ${r.status !== 'closed' ? `<button class="btn btn-ghost btn-sm" data-close="${esc(r.id)}">Close</button>` : ''}
      </div></div>`;
  }).join('') : `<div class="card empty">${icon('check')}<div>${onlyOpen ? 'No open feedback.' : 'No feedback yet.'}</div></div>`;
  $('fbList').querySelectorAll('[data-chat]').forEach((b) => b.onclick = async () => {
    await rpc('admin_set_feedback_status', { feedback_id: b.dataset.id, new_status: 'replied' });
    go('messages');
    composeModal({ user: '@' + b.dataset.chat, body: '' });
  });
  $('fbList').querySelectorAll('[data-mail]').forEach((a) => a.addEventListener('click', () => rpc('admin_set_feedback_status', { feedback_id: a.dataset.mail, new_status: 'replied' })));
  $('fbList').querySelectorAll('[data-close]').forEach((b) => b.onclick = async () => {
    await rpc('admin_set_feedback_status', { feedback_id: b.dataset.close, new_status: 'closed' });
    toast('Closed');
    renderFeedback(onlyOpen);
  });
  for (const r of fresh) await sb.rpc('admin_set_feedback_status', { feedback_id: r.id, new_status: 'read' });
  if (fresh.length) { state.stats.new_feedback = 0; renderNav(); }
}

// ── App config ─────────────────────────────────────────────────────────────
async function renderConfig() {
  const rows = await rpc('admin_list_config');
  const get = (k) => rows.find((r) => r.key === k)?.value || {};
  const fu = get('force_update');
  const oc = get('official_chat');
  const ai = get('ai');
  $('view').innerHTML = `<div class="grid two">
    <div class="card">
      <div class="card-head"><div style="display:flex;gap:12px;align-items:center"><div class="kpi-icon tone-red">${icon('update')}</div><div><h2>Force update</h2><p>Older versions get a full-screen “Update required”</p></div></div>
        <span class="badge ${fu.min_version ? 'tone-red' : 'tone-slate'}">${fu.min_version ? 'On' : 'Off'}</span></div>
      <div class="card-pad">
        <div class="field"><label for="cfMin">Minimum version code</label><input class="input" type="number" id="cfMin" value="${esc(fu.min_version ?? '')}" placeholder="blank = off">
          <span class="hint">The number after “+” in pubspec’s version, e.g. 1.0.0+<b>15</b>. Phones below it can’t use the app until they update.</span></div>
        <div class="field"><label for="cfMsg">Message</label><textarea class="textarea" id="cfMsg" placeholder="This version of Spencheck is no longer supported. Update to keep using the app — your data stays on your phone.">${esc(fu.message ?? '')}</textarea></div>
        <div style="text-align:right"><button class="btn btn-primary" id="cfSave">Save</button></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div style="display:flex;gap:12px;align-items:center"><div class="kpi-icon tone-brand">${icon('messages')}</div><div><h2>Official chat</h2><p>The verified Spencheck account</p></div></div></div>
      <div class="card-pad">
        <label class="check"><span class="switch"><input type="checkbox" id="cfReplies" ${oc.replies !== false ? 'checked' : ''}><span></span></span>Users can reply</label>
        <p class="hint" style="margin-top:10px">Off turns it into a read-only announcements channel. The database enforces it, so it applies instantly — even on old app versions.</p>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div style="display:flex;gap:12px;align-items:center"><div class="kpi-icon tone-violet">${icon('spark')}</div><div><h2>Built-in AI</h2><p>For users without their own Gemini/ChatGPT key</p></div></div></div>
      <div class="card-pad">
        <div class="field"><label for="cfAi">Free AI messages per user per day</label><input class="input" type="number" min="0" max="200" id="cfAi" value="${esc(ai.daily_limit ?? 15)}">
          <span class="hint">0 turns the built-in AI off (offline commands still work). Each message costs you a little on your Gemini key; tool steps inside one message count once.</span></div>
        <div style="text-align:right"><button class="btn btn-primary" id="cfAiSave">Save</button></div>
      </div>
    </div></div>`;
  $('cfSave').onclick = async () => {
    const v = $('cfMin').value.trim();
    if (v && !(await confirmDialog('Turn on force update?', `Every phone on a version below ${v} will be blocked until it updates. Make sure that version is live on the Play Store first.`, 'Turn on', true))) return;
    await rpc('admin_set_config', { config_key: 'force_update', config_value: v ? { min_version: Number(v), message: $('cfMsg').value.trim() } : {} });
    toast(v ? `Force update on for versions below ${v}` : 'Force update off');
    renderConfig();
  };
  $('cfAiSave').onclick = async () => {
    const n = Math.max(0, Math.min(200, Number($('cfAi').value || 0)));
    await rpc('admin_set_config', { config_key: 'ai', config_value: { daily_limit: n } });
    toast(n ? `Built-in AI: ${n} messages per user per day` : 'Built-in AI turned off');
  };
  $('cfReplies').onchange = async (e) => {
    await rpc('admin_set_config', { config_key: 'official_chat', config_value: { replies: e.target.checked } });
    toast(e.target.checked ? 'Users can reply' : 'Replies off');
  };
}

paintThemeBtn();
boot();
