/**
 * AssetSpatial — Shared App Logic
 * State management, navigation, helpers, toast, dark mode
 */

// ── STATE ──────────────────────────────────────────────────────────────────
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

// Local state (used when API is offline)
let assets   = LS.get('asdm_assets')   || [];
let users    = LS.get('asdm_users')    || [];
let auditLog = LS.get('asdm_audit')    || [];
let settings = LS.get('asdm_settings') || { name: 'AssetSpatial', org: 'Federal Government of Nigeria' };
let assetCounter = LS.get('asdm_counter') || 1000;

// Clear old seed assets (AST-1001 to AST-1005) from localStorage —
// they were fake and block the real asset registry from showing.
if (assets.some(a => ['AST-1001','AST-1002','AST-1003','AST-1004','AST-1005'].includes(a.id||a.assetId))) {
  assets = assets.filter(a => !['AST-1001','AST-1002','AST-1003','AST-1004','AST-1005'].includes(a.id||a.assetId));
  LS.set('asdm_assets', assets);
}

// Seed placeholder users/audit only — NO fake asset seed data.
// Asset seed data was causing real DB assets to be hidden when API returned
// a different response shape — the fallback showed fake data instead of errors.
if (users.length === 0) {
  users = [
    { id:'USR-1000', name:'Admin User',  role:'System Admin', email:'admin@assetspatial.gov.ng', color:'#00c864' },
    { id:'USR-1001', name:'Emeka Obi',   role:'Field Agent',  email:'emeka@assetspatial.gov.ng', color:'#3b9eff' },
    { id:'USR-1002', name:'Aisha Bello', role:'Supervisor',   email:'aisha@assetspatial.gov.ng', color:'#f0b400' },
    { id:'USR-1003', name:'Chidi Eze',   role:'GIS Analyst',  email:'chidi@assetspatial.gov.ng', color:'#e05555' },
  ];
  LS.set('asdm_users', users);
}
if (auditLog.length === 0) {
  auditLog = [
    { action:'USER_LOGIN', entity:'USR-1000', user:'Admin User', ts:Date.now()-3e7, detail:'Admin login' },
  ];
  LS.set('asdm_audit', auditLog);
}

function saveLocal() {
  LS.set('asdm_assets', assets);
  LS.set('asdm_users', users);
  LS.set('asdm_audit', auditLog);
  LS.set('asdm_settings', settings);
  LS.set('asdm_counter', assetCounter);
}

function addAudit(action, entity, user, detail) {
  auditLog.unshift({ action, entity, user: user || 'System', detail: detail || '', ts: Date.now() });
  if (auditLog.length > 500) auditLog.pop();
  saveLocal();
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function typeColor(type) {
  const m = { 'Infrastructure':'tag-blue', 'Land / Property':'tag-green', 'Utility':'tag-orange', 'Environmental':'tag-green', 'Equipment':'tag-gray' };
  return m[type] || 'tag-gray';
}
function condColor(c) {
  return { Good:'tag-green', Fair:'tag-warn', Poor:'tag-orange', Critical:'tag-red' }[c] || 'tag-gray';
}
function geomIcon(g) {
  return { Point:'<i class="fa-solid fa-location-dot"></i>', Polygon:'<i class="fa-solid fa-draw-polygon"></i>', Linear:'<i class="fa-solid fa-route"></i>' }[g] || '';
}
function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── TOAST ─────────────────────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, icon = 'fa-circle-check', isError = false) {
  const el = document.getElementById('toast');
  const iconEl = document.getElementById('toast-icon');
  const msgEl  = document.getElementById('toast-msg');
  if (!el) return;
  if (iconEl) iconEl.className = 'fa-solid ' + icon;
  if (msgEl)  msgEl.textContent = msg;
  el.style.borderColor = isError ? 'rgba(224,85,85,0.4)' : 'var(--border2)';
  if (iconEl) iconEl.style.color = isError ? 'var(--danger)' : 'var(--accent2)';
  el.classList.add('open');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('open'), 3000);
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
const PAGE_META = {
  dashboard: { title: 'Dashboard',        bc: 'Overview' },
  map:       { title: 'Live Map',         bc: 'Spatial / Map View' },
  assets:    { title: 'Asset Registry',   bc: 'Registry' },
  capture:   { title: 'Field Capture',    bc: 'Field Capture' },
  analytics: { title: 'Analytics',        bc: 'Analytics & Reports' },
  viz:       { title: 'Data Visualisation', bc: 'Analytics / Viz' },
  users:     { title: 'User Management',  bc: 'Users & Roles' },
  ocr:       { title: 'OCR Scanner',      bc: 'Data Tools / OCR' },
  excel:     { title: 'Excel Import',     bc: 'Data Tools / Excel' },
  filedb:    { title: 'File Database',    bc: 'Data Tools / Files' },
  audit:     { title: 'Audit Log',        bc: 'System / Audit' },
  settings:  { title: 'Settings',         bc: 'System / Settings' },
};

function nav(elOrPage) {
  const page = typeof elOrPage === 'string' ? elOrPage : elOrPage.dataset.page;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const meta = PAGE_META[page] || {};
  const titleEl = document.getElementById('hdr-title');
  const bcEl    = document.getElementById('hdr-bc');
  if (titleEl) titleEl.textContent = meta.title || page;
  if (bcEl)    bcEl.textContent = 'AssetSpatial / ' + (meta.bc || page);

  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');

  renderPage(page);
}

function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  if (page === 'map')       renderMap();
  if (page === 'assets')    renderAssets();
  if (page === 'analytics') { if (typeof loadAnalytics === 'function') loadAnalytics(); }
  if (page === 'users')     renderUsers();
  if (page === 'audit')     renderAudit();
  if (page === 'capture')   { if (typeof initCapturePage === 'function') initCapturePage(); }
  // Re-apply role gates after every page render (new buttons may have appeared)
  setTimeout(applyRoleGates, 100);
}

// ── ROLE & PERMISSION SYSTEM ──────────────────────────────────────────────────
// Source of truth: the user object stored in localStorage at login (r.user from backend)
// permissions come from u.permissions (per-user overrides) falling back to role defaults.

const ROLE_DEFAULTS = {
  'System Admin':  { canCreate:true,  canEdit:true,  canDelete:true,  canExport:true,  canViewAll:true,  canManageUsers:true,  canViewAudit:true,  canManageSettings:true  },
  'Supervisor':    { canCreate:true,  canEdit:true,  canDelete:true,  canExport:true,  canViewAll:true,  canManageUsers:false, canViewAudit:true,  canManageSettings:false },
  'GIS Analyst':   { canCreate:false, canEdit:false, canDelete:false, canExport:true,  canViewAll:true,  canManageUsers:false, canViewAudit:true,  canManageSettings:false },
  'Field Agent':   { canCreate:false, canEdit:false, canDelete:false, canExport:false, canViewAll:false, canManageUsers:false, canViewAudit:false, canManageSettings:false },
};

function getUserPerms() {
  const u = getCurrentUser();
  if (!u) return {};
  const defaults = ROLE_DEFAULTS[u.role] || {};
  // Per-user overrides from backend (stored in as_user.permissions)
  return { ...defaults, ...(u.permissions || {}) };
}

function can(perm) {
  return getUserPerms()[perm] === true;
}

function applyRoleGates() {
  const u = getCurrentUser();
  if (!u) return; // not logged in — nothing to gate

  const role  = u.role || '';
  const perms = getUserPerms();

  // Debug: log to console so you can verify what role/perms are active
  console.log('[RBAC] role:', role, '| perms:', perms);

  // ── data-require="canDelete" → hide element if permission missing ─────────
  document.querySelectorAll('[data-require]').forEach(el => {
    const needed = el.dataset.require;
    el.style.display = perms[needed] ? '' : 'none';
  });

  // ── data-require-role="System Admin,Supervisor" → hide if role not in list ─
  document.querySelectorAll('[data-require-role]').forEach(el => {
    const allowed = el.dataset.requireRole.split(',').map(r => r.trim());
    el.style.display = allowed.includes(role) ? '' : 'none';
  });

  // ── Nav: hide pages the user can't access ─────────────────────────────────
  const navGates = {
    'users.html':    'canManageUsers',
    'settings.html': 'canManageSettings',
    'audit.html':    'canViewAudit',
  };
  document.querySelectorAll('.nav-item').forEach(el => {
    const href = (el.getAttribute('href') || '').split('/').pop();
    const needed = navGates[href];
    if (needed) el.style.display = perms[needed] ? '' : 'none';
  });

  // ── Delete buttons ────────────────────────────────────────────────────────
  if (!perms.canDelete) {
    document.querySelectorAll(
      '.btn-danger, [data-action="delete"], button[onclick*="delete"], button[onclick*="Delete"]'
    ).forEach(el => {
      el.disabled      = true;
      el.style.opacity = '0.3';
      el.style.cursor  = 'not-allowed';
      el.title         = 'Your role (' + role + ') cannot delete records';
    });
  }

  // ── Edit buttons ──────────────────────────────────────────────────────────
  if (!perms.canEdit) {
    document.querySelectorAll(
      '[data-action="edit"],' +
      '[data-require="canEdit"],' +
      'button[title="Edit"],' +
      'button[onclick*="openEditAsset"],' +
      'button[onclick*="openEditUser"]'
    ).forEach(el => {
      el.disabled      = true;
      el.style.opacity = '0.3';
      el.style.cursor  = 'not-allowed';
      el.title         = 'Your role (' + role + ') cannot edit records';
      // Replace onclick so the action cannot fire even if disabled is bypassed
      el.setAttribute('onclick',
        'event.preventDefault();event.stopPropagation();' +
        'toast(\"Your role cannot edit records\",\"fa-ban\",true);return false;'
      );
    });
  }

  // ── Create / capture ──────────────────────────────────────────────────────
  if (!perms.canCreate) {
    document.querySelectorAll(
      '#btn-new-asset, [data-action="create"], a[href="capture.html"]'
    ).forEach(el => {
      el.style.pointerEvents = 'none';
      el.style.opacity       = '0.3';
      el.title               = 'Your role (' + role + ') cannot create assets';
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  if (!perms.canExport) {
    document.querySelectorAll(
      '[data-action="export"], button[onclick*="export"], button[onclick*="Export"]'
    ).forEach(el => {
      el.disabled      = true;
      el.style.opacity = '0.3';
      el.title         = 'Your role (' + role + ') cannot export data';
    });
  }
}

function enforceAfterRender() {
  // Small delay to let the DOM settle after dynamic renders
  setTimeout(applyRoleGates, 80);
}


function initTheme() {
  const saved = LS.get('as_theme') || 'dark';
  document.body.classList.toggle('light', saved === 'light');
  updateThemeBtn();
}
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  LS.set('as_theme', isLight ? 'light' : 'dark');
  updateThemeBtn();
}
function updateThemeBtn() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isLight = document.body.classList.contains('light');
  btn.innerHTML = isLight
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';
  btn.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
}

// ── GLOBAL SEARCH ─────────────────────────────────────────────────────────────
let gsActions = [];
function globalSearch(q) {
  const dd = document.getElementById('global-search-dropdown');
  q = (q || '').trim().toLowerCase();
  if (!q) { dd.classList.remove('open'); dd.innerHTML = ''; return; }

  const results = [];
  assets.filter(a =>
    (a.name||'').toLowerCase().includes(q) || (a.id||'').toLowerCase().includes(q) ||
    (a.type||'').toLowerCase().includes(q) || (a.state||'').toLowerCase().includes(q)
  ).slice(0,6).forEach(a => results.push({
    group:'Assets', icon:'fa-layer-group',
    title: a.name || a.id,
    sub: a.id + ' · ' + (a.type||'') + ' · ' + (a.condition||''),
    action: () => { window.location.href = `asset-view.html?id=${encodeURIComponent(a.assetId || a.id)}`; }
  }));
  users.filter(u =>
    (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
  ).slice(0,3).forEach(u => results.push({
    group:'Users', icon:'fa-user',
    title: u.name, sub: u.role + ' · ' + u.email,
    action: () => { nav('users'); document.getElementById('global-search-input').value=''; dd.classList.remove('open'); }
  }));

  if (!results.length) {
    dd.innerHTML = `<div class="gs-no-results">No results for "${escHtml(q)}"</div>`;
    dd.classList.add('open'); return;
  }
  let html = ''; let lastGroup = '';
  results.forEach((r, i) => {
    if (r.group !== lastGroup) { html += `<div class="gs-group-label">${r.group}</div>`; lastGroup = r.group; }
    html += `<div class="gs-result" data-gs-idx="${i}" onclick="gsActions[${i}]()">
      <i class="fa-solid ${r.icon}"></i>
      <div class="gs-result-main">
        <div class="gs-result-title">${escHtml(r.title)}</div>
        <div class="gs-result-sub">${escHtml(r.sub)}</div>
      </div></div>`;
  });
  gsActions = results.map(r => r.action);
  dd.innerHTML = html;
  dd.classList.add('open');
}

function gsKeyNav(e) {
  const dd = document.getElementById('global-search-dropdown');
  const items = dd.querySelectorAll('.gs-result');
  if (!items.length) return;
  let active = dd.querySelector('.gs-result.gs-active');
  if (e.key === 'ArrowDown') { e.preventDefault(); const next = active ? active.nextElementSibling : items[0]; if (next?.classList.contains('gs-result')) { active?.classList.remove('gs-active'); next.classList.add('gs-active'); } }
  if (e.key === 'ArrowUp')   { e.preventDefault(); const prev = active?.previousElementSibling; if (prev?.classList.contains('gs-result')) { active?.classList.remove('gs-active'); prev.classList.add('gs-active'); } }
  if (e.key === 'Enter' && active) active.click();
  if (e.key === 'Escape') { dd.classList.remove('open'); document.getElementById('global-search-input')?.blur(); }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body-inner').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay')?.classList.remove('open'); }

// ── USER BADGE IN SIDEBAR ────────────────────────────────────────────────────
function renderUserBadge() {
  const user = getCurrentUser() || { name: 'Admin User', role: 'System Admin' };
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const nameEl = document.getElementById('sb-user-name');
  const roleEl = document.getElementById('sb-user-role');
  const initEl = document.getElementById('sb-user-initials');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role?.toUpperCase();
  if (initEl) initEl.textContent = initials;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkApiHealth();
  renderUserBadge();
  // Apply role gates as early as possible
  applyRoleGates();

  // Mobile sidebar
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('open');
  });
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
  });

  // Modal close on backdrop
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Re-apply gates when modal closes (new buttons rendered inside)
  document.getElementById('modal-overlay')?.addEventListener('click', () => {
    setTimeout(applyRoleGates, 60);
  });

  // Close search on outside click
  document.addEventListener('click', e => {
    const wrap = document.getElementById('global-search-wrap');
    if (wrap && !wrap.contains(e.target)) document.getElementById('global-search-dropdown')?.classList.remove('open');
  });

  // Page init handled per-page (multi-page app)
});