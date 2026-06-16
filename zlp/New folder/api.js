/**
 * AssetSpatial — API Client
 * All communication with the Node.js backend.
 * Falls back gracefully to localStorage when backend is unreachable.
 */

const API_BASE = window.API_BASE || 'http://localhost:3001/api';

let _token = localStorage.getItem('as_token') || null;
let _apiOnline = false;

// ── Auth ──────────────────────────────────────────────────────────────────────
async function apiLogin(email, password) {
  const r = await apiFetch('/auth/login', { method: 'POST', body: { email, password } }, false);
  if (r.token) {
    _token = r.token;
    localStorage.setItem('as_token', r.token);
    localStorage.setItem('as_user', JSON.stringify(r.user));
  }
  return r;
}

async function apiLogout() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  _token = null;
  localStorage.removeItem('as_token');
  localStorage.removeItem('as_user');
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('as_user')); } catch { return null; }
}

// ── Assets ───────────────────────────────────────────────────────────────────
async function apiGetAssets(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/assets${qs ? '?' + qs : ''}`);
}

async function apiCreateAsset(data) {
  return apiFetch('/assets', { method: 'POST', body: data });
}

async function apiGetAsset(id) {
  return apiFetch(`/assets/${id}`);
}

async function apiUpdateAsset(id, data) {
  return apiFetch(`/assets/${id}`, { method: 'PUT', body: data });
}

async function apiDeleteAsset(id) {
  return apiFetch(`/assets/${id}`, { method: 'DELETE' });
}

async function apiSearchAssets(q) {
  return apiFetch(`/assets/search?q=${encodeURIComponent(q)}`);
}

// ── Photos ───────────────────────────────────────────────────────────────────
async function apiUploadPhoto(assetId, file) {
  const fd = new FormData();
  fd.append('photo', file);
  return apiFetchRaw(`/assets/${assetId}/photos`, { method: 'POST', body: fd });
}

function apiPhotoUrl(assetId, fileId) {
  return `${API_BASE}/assets/${assetId}/photos/${fileId}`;
}

async function apiDeletePhoto(assetId, fileId) {
  return apiFetch(`/assets/${assetId}/photos/${fileId}`, { method: 'DELETE' });
}

// ── Documents ────────────────────────────────────────────────────────────────
async function apiUploadDocument(assetId, file) {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetchRaw(`/assets/${assetId}/documents`, { method: 'POST', body: fd });
}

async function apiDeleteDocument(assetId, fileId) {
  return apiFetch(`/assets/${assetId}/documents/${fileId}`, { method: 'DELETE' });
}

// ── Excel ────────────────────────────────────────────────────────────────────
async function apiUploadExcel(assetId, file) {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetchRaw(`/assets/${assetId}/excel`, { method: 'POST', body: fd });
}

async function apiPreviewExcel(assetId, fileId) {
  return apiFetch(`/assets/${assetId}/excel/${fileId}?preview=true`);
}

// ── Maintenance ───────────────────────────────────────────────────────────────
async function apiAddMaintenance(assetId, data) {
  return apiFetch(`/assets/${assetId}/maintenance`, { method: 'POST', body: data });
}

async function apiDeleteMaintenance(assetId, idx) {
  return apiFetch(`/assets/${assetId}/maintenance/${idx}`, { method: 'DELETE' });
}

// ── Valuation ────────────────────────────────────────────────────────────────
async function apiUpdateValuation(assetId, data) {
  return apiFetch(`/assets/${assetId}/valuation`, { method: 'PUT', body: data });
}

// ── Spatial ──────────────────────────────────────────────────────────────────
async function apiNearby(lat, lng, radiusKm = 5) {
  return apiFetch(`/assets/spatial/near?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
}

async function apiWithin(polygon) {
  return apiFetch('/assets/spatial/within', { method: 'POST', body: { polygon } });
}

// ── Analytics ────────────────────────────────────────────────────────────────
async function apiDashboard() { return apiFetch('/analytics/dashboard'); }
async function apiByType() { return apiFetch('/analytics/by-type'); }
async function apiByState() { return apiFetch('/analytics/by-state'); }
async function apiConditionBreakdown() { return apiFetch('/analytics/condition-breakdown'); }
async function apiCapturesOverTime(days = 30) { return apiFetch(`/analytics/captures-over-time?days=${days}`); }
async function apiMaintenanceSpend() { return apiFetch('/analytics/maintenance-spend'); }

// ── OCR ──────────────────────────────────────────────────────────────────────
async function apiOcrScan(file) {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetchRaw('/ocr/scan', { method: 'POST', body: fd });
}

async function apiOcrJobStatus(jobId) {
  return apiFetch(`/ocr/jobs/${jobId}`);
}

// ── Export ───────────────────────────────────────────────────────────────────
function apiExportUrl(format, ids = null) {
  const base = `${API_BASE}/assets/export`;
  if (ids) return `${base}/bulk?ids=${ids.join(',')}&format=${format}`;
  return `${base}?format=${format}`;
}

function downloadExport(format, ids = null) {
  const url = apiExportUrl(format, ids);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', '');
  // Add auth header via fetch + blob since <a> can't send headers
  fetch(url, { headers: authHeaders() })
    .then(r => r.blob())
    .then(blob => {
      const bUrl = URL.createObjectURL(blob);
      a.href = bUrl;
      a.download = `assets_export.${format}`;
      a.click();
      URL.revokeObjectURL(bUrl);
    })
    .catch(() => toast('Export failed — check connection', 'fa-triangle-exclamation', true));
}

// ── Users ────────────────────────────────────────────────────────────────────
async function apiGetUsers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/users${qs ? '?' + qs : ''}`);
}

async function apiCreateUser(data) {
  return apiFetch('/users', { method: 'POST', body: data });
}

async function apiUpdateUser(id, data) {
  return apiFetch(`/users/${id}`, { method: 'PUT', body: data });
}

async function apiUpdatePermissions(id, perms) {
  return apiFetch(`/users/${id}/permissions`, { method: 'PUT', body: perms });
}

async function apiDeactivateUser(id) {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}

async function apiResetPassword(id) {
  return apiFetch(`/users/${id}/reset-password`, { method: 'POST' });
}

// ── Role Config ───────────────────────────────────────────────────────────────
async function apiGetRoleConfigs() { return apiFetch('/users/role-config'); }
async function apiUpdateRoleConfig(role, defaults) {
  return apiFetch(`/users/role-config/${encodeURIComponent(role)}`, { method: 'PUT', body: defaults });
}

// ── Audit ────────────────────────────────────────────────────────────────────
async function apiGetAudit(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/audit${qs ? '?' + qs : ''}`);
}

// ── Settings ─────────────────────────────────────────────────────────────────
async function apiGetSettings() { return apiFetch('/settings'); }
async function apiUpdateSettings(data) {
  return apiFetch('/settings', { method: 'PUT', body: data });
}

// ── Core fetch helpers ────────────────────────────────────────────────────────
function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = 'Bearer ' + _token;
  return h;
}

async function apiFetch(path, opts = {}, auth = true) {
  const url = API_BASE + path;
  const headers = auth ? authHeaders() : { 'Content-Type': 'application/json' };
  const body = opts.body ? JSON.stringify(opts.body) : undefined;
  try {
    const r = await fetch(url, { ...opts, headers, body });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    _apiOnline = true;
    updateConnIndicator(true);
    return data;
  } catch (err) {
    if (err.message !== 'Failed to fetch') throw err;
    _apiOnline = false;
    updateConnIndicator(false);
    throw err;
  }
}

async function apiFetchRaw(path, opts = {}) {
  const url = API_BASE + path;
  const headers = {};
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  try {
    const r = await fetch(url, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    _apiOnline = true;
    updateConnIndicator(true);
    return data;
  } catch (err) {
    if (err.message !== 'Failed to fetch') throw err;
    _apiOnline = false;
    updateConnIndicator(false);
    throw err;
  }
}

function updateConnIndicator(online) {
  const dot = document.getElementById('conn-dot');
  const label = document.getElementById('conn-label');
  if (!dot) return;
  dot.className = online ? 'live' : '';
  if (label) label.textContent = online ? 'LIVE' : 'LOCAL';
}

// Check API health on load
async function checkApiHealth() {
  try {
    const r = await fetch(`${window.API_BASE || 'http://localhost:3001'}/health`);
    if (r.ok) { _apiOnline = true; updateConnIndicator(true); }
  } catch { _apiOnline = false; updateConnIndicator(false); }
}

// ── ALIASES & SHARED HELPERS ──────────────────────────────────────────────────
// Only aliases that have NO definition in any page-specific JS file live here.
// Page-specific JS files (capture.js, map.js, assets.js, users.js, etc.) own
// their own functions — do not re-declare them here.

// OCR — normalise camelCase vs UPPERCASE variants
const apiOCRScan      = (file) => apiOcrScan(file);
const apiOCRJobStatus = (id)   => apiOcrJobStatus(id);

// File-list helpers used by filedb.html (no dedicated JS file)
const apiGetPhotoList    = (assetId) => apiFetch(`/assets/${assetId}/photos`);
const apiGetDocumentList = (assetId) => apiFetch(`/assets/${assetId}/documents`);
const apiGetExcelList    = (assetId) => apiFetch(`/assets/${assetId}/excel`);

// Users list alias used by pages that call apiGetUserList
const apiGetUserList = (p = {}) => apiGetUsers(p);

// Role-config reset — thin wrapper; no dedicated JS file owns it
const apiResetRoleConfigs = () => apiFetch('/users/role-config/reset', { method: 'POST' });

// ── PERM LABELS & ROLE CONFIG CARD RENDERER ───────────────────────────────────
// Defined here (not in users.js) because users.html loads api.js first and
// settings.html also calls renderRoleConfigCards without loading users.js.
const PERM_LABELS = {
  canCreate: 'Create Assets', canEdit: 'Edit Assets', canDelete: 'Delete Assets',
  canExport: 'Export Data', canViewAll: 'View All Assets', canManageUsers: 'Manage Users',
  canViewAudit: 'View Audit Log', canManageSettings: 'Manage Settings',
};

function renderRoleConfigCards(configs) {
  const roleMap = { 'Field Agent': 'field', 'Supervisor': 'super', 'GIS Analyst': 'gis' };
  (configs || []).forEach(cfg => {
    const key = roleMap[cfg.role];
    if (!key) return;
    const el = document.getElementById(`perm-body-${key}`);
    if (!el) return;
    el.innerHTML = Object.entries(cfg.defaults || {}).map(([k, v]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
        <span style="color:var(--text2)">${PERM_LABELS[k] || k}</span>
        <input type="checkbox" data-perm-role="${cfg.role}" data-perm-key="${k}" ${v ? 'checked' : ''} style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer">
      </div>`).join('');
  });
}
