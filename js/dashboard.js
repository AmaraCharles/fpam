// ── DASHBOARD ────────────────────────────────────────────────────────────────

// The backend hard-caps any single /assets request at 200 records
// (assetService.js listAssets: Math.min(200, limit)), so asking for
// limit:500 silently only returns 200. This pages through the full
// result set instead, same approach used in assets.js.
async function _fetchAllAssetsForDashboard(baseParams = {}) {
  const BACKEND_PAGE_LIMIT = 200;
  const SAFETY_MAX_PAGES   = 50; // hard ceiling: 50 * 200 = 10,000 assets

  const first = await apiGetAssets({ ...baseParams, page: 1, limit: BACKEND_PAGE_LIMIT });
  let combined = first.assets || [];
  const totalPages = Math.min(first.pages || 1, SAFETY_MAX_PAGES);

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        apiGetAssets({ ...baseParams, page: i + 2, limit: BACKEND_PAGE_LIMIT })
      )
    );
    rest.forEach(r => { combined = combined.concat(r.assets || []); });
  }
  return combined;
}

async function renderDashboard() {
  // ── KPI stats ──────────────────────────────────────────────────────────────
  // Try the dedicated analytics endpoint first; if it 404s or fails,
  // compute the same numbers directly from the assets list.
  let total = 0, active = 0, critical = 0, underMaint = 0, totalValue = null;

  try {
    const data = await apiDashboard();
    console.log('[Dashboard] apiDashboard raw:', data);

    // Handle multiple response shapes
    const s = data.summary || data.stats || data.data || data;

    total      = s.total      || s.totalAssets  || s.count       || 0;
    active     = s.active     || s.activeAssets || s.operational || 0;
    critical   = s.critical   || s.criticalAssets                || 0;
    underMaint = s.underMaintenance || s.maintenance             || 0;
    totalValue = s.totalValueNGN || s.totalValue || s.value      || null;
  } catch(e) {
    console.warn('[Dashboard] analytics endpoint failed:', e.message, '— computing from assets');
    // Compute directly from the asset list
    try {
      const list = await _fetchAllAssetsForDashboard();
      total      = list.length;
      active     = list.filter(a => a.status === 'Active').length;
      critical   = list.filter(a => a.condition === 'Critical').length;
      underMaint = list.filter(a => a.status === 'Under Maintenance').length;
      totalValue = list.reduce((sum, a) => sum + (a.valuation?.amount || 0), 0) || null;
    } catch {
      // Full offline fallback
      total      = assets.length;
      active     = assets.filter(a => a.status === 'Active').length;
      critical   = assets.filter(a => a.condition === 'Critical').length;
      underMaint = assets.filter(a => a.status === 'Under Maintenance').length;
    }
  }

  // Write to DOM
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total',    total);
  set('stat-active',   active);
  set('stat-critical', critical);
  set('stat-maint',    underMaint);
  set('stat-value',    totalValue
    ? '₦' + (totalValue >= 1e9
        ? (totalValue / 1e9).toFixed(1) + 'B'
        : (totalValue / 1e6).toFixed(1) + 'M')
    : '—');
  set('nb-assets',  total);
  set('nb-assets2', total);

  // ── Recent assets ──────────────────────────────────────────────────────────
  try {
    const r = await apiGetAssets({ limit: 5 });
    renderDashboardRecent(r.assets || []);
  } catch {
    renderDashboardRecent([...assets].sort((a,b) => (b.ts||0) - (a.ts||0)).slice(0, 5));
  }

  // ── User count badge ────────────────────────────────────────────────────────
  try {
    const ur = await apiGetUsers({ limit: 1 });
    const ub = document.getElementById('nb-users');
    if (ub) ub.textContent = ur.total || '';
  } catch {}

  // ── Activity feed — fetch from audit API, fall back to local ───────────────
  try {
    const ar = await apiGetAudit({ limit: 6 });
    const entries = ar.logs || ar.data || ar.results || [];
    renderActivityFeed(entries);
  } catch {
    renderActivityFeed([...auditLog].slice(0, 6));
  }

  // ── Inspection alerts + Mini charts — both need the full asset list ────────
  let allAssetsForCharts = [];
  try {
    allAssetsForCharts = await _fetchAllAssetsForDashboard();
  } catch {
    allAssetsForCharts = [...assets];
  }
  renderInspectionAlerts(allAssetsForCharts);

  let byTypeData = [], overtimeData = [];
  try {
    const [bt, ot] = await Promise.allSettled([apiByType(), apiCapturesOverTime(30)]);
    if (bt.status === 'fulfilled') byTypeData  = bt.value?.data || bt.value?.byType  || bt.value || [];
    if (ot.status === 'fulfilled') overtimeData = ot.value?.data || ot.value?.overtime || ot.value || [];
  } catch {}

  if (typeof renderMiniCharts === 'function') {
    renderMiniCharts(allAssetsForCharts, byTypeData, overtimeData);
  }
}

function renderDashboardRecent(list) {
  const tbody = document.getElementById('recent-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-layer-group"></i></div><div class="empty-title">No assets yet</div><div class="empty-sub">Capture your first asset</div></div></td></tr>`;
    return;
  }
  window._assetMap = window._assetMap || {};
  list.forEach(a => { window._assetMap[a.assetId || a.id] = a; });

  tbody.innerHTML = list.map(a => {
    const id = a.assetId || a.id;
    return `
    <tr onclick="window.location.href='asset-view.html?id='+encodeURIComponent('${id}')" style="cursor:pointer">
      <td>${escHtml(a.name || id)}</td>
      <td><span class="tag ${typeColor(a.type)}">${escHtml(a.type)}</span></td>
      <td>${geomIcon(a.geomType || a.geom)} ${escHtml(a.geomType || a.geom || '—')}</td>
      <td><span class="tag ${condColor(a.condition)}">${escHtml(a.condition)}</span></td>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">${timeAgo(a.ts || new Date(a.createdAt).getTime())}</td>
    </tr>`}).join('');
}

function renderActivityFeed(entries) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  const list = entries || [...auditLog].slice(0, 6);
  if (!list.length) {
    feed.innerHTML = `<div class="activity-item"><div class="activity-text" style="color:var(--text3)">No activity recorded yet.</div></div>`;
    return;
  }
  feed.innerHTML = list.map((l, i) => {
    const action  = (l.action || l.type || '').replace(/_/g, ' ');
    const entity  = l.entity || l.entityId || l.assetId || '—';
    const detail  = l.detail || l.description || l.message || '';
    const who     = l.user   || l.performedBy || l.performedByName || l.performedById || '—';
    const when    = l.ts     || l.createdAt   || l.timestamp;
    return `
    <div class="activity-item ${i < 2 ? 'new' : ''}">
      <div class="activity-text">${escHtml(action)}: <strong>${escHtml(String(entity))}</strong>${detail ? ' — ' + escHtml(detail) : ''}</div>
      <div class="activity-time">${when ? new Date(when).toLocaleString('en-NG') : '—'} · ${escHtml(String(who))}</div>
    </div>`;
  }).join('');
}

function renderInspectionAlerts(assetList) {
  if (!assetList || !assetList.length) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const soon  = new Date(today); soon.setDate(today.getDate() + 30);

  const alertAssets = assetList.filter(a => {
    if (!a.nextInspection) return false;
    const d = new Date(a.nextInspection);
    return d <= soon;
  });

  const panel = document.getElementById('inspection-alerts-panel');
  if (!panel) return;

  if (!alertAssets.length) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  const countEl = document.getElementById('inspection-alert-count');
  if (countEl) countEl.textContent = alertAssets.length;

  window._assetMap = window._assetMap || {};
  alertAssets.forEach(a => { window._assetMap[a.assetId || a.id] = a; });

  const tbody = document.getElementById('inspection-alerts-tbody');
  if (!tbody) return;

  tbody.innerHTML = alertAssets.map(a => {
    const id       = a.assetId || a.id;
    const d        = new Date(a.nextInspection); d.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((d - today) / 86400000);
    const overdue  = daysLeft < 0;
    return `<tr style="${overdue ? 'background:rgba(224,85,85,.04)' : ''}">
      <td><strong>${escHtml(a.name || id)}</strong></td>
      <td><span class="tag ${typeColor(a.type)}">${escHtml(a.type || '—')}</span></td>
      <td style="font-family:'Space Mono',monospace;font-size:11px">${escHtml(String(a.nextInspection).slice(0, 10))}</td>
      <td><span class="tag ${overdue ? 'tag-red' : 'tag-warn'}">${overdue
        ? '<i class="fa-solid fa-circle-xmark"></i> OVERDUE ' + Math.abs(daysLeft) + 'd'
        : '<i class="fa-solid fa-clock"></i> ' + daysLeft + 'd'}</span></td>
      <td><button class="btn btn-primary btn-sm" onclick="window.location.href='asset-view.html?id='+encodeURIComponent('${id}')">
        <i class="fa-solid fa-pen"></i> Action</button></td>
    </tr>`;
  }).join('');
}