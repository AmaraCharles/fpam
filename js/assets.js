// ── ASSET REGISTRY ──────────────────────────────────────────────────────────
let allAssets = [];        // full result set for the current filter (across all backend pages)
let filteredAssets = [];   // allAssets after client-side search/geom/mda filtering
let selectedAssetIds = new Set();

const ASSETS_PAGE_SIZE = 50;  // rows shown per page in the table
let currentPage = 1;

// Canonical list of Nigeria's 36 states + FCT (matches the #filter-state dropdown).
// Used to validate the freeform `state` field before it's counted in the stats
// bar — bulk imports can leave typos, blanks, or non-state text in that column,
// which previously inflated the "States" count with garbage values.
const NIGERIA_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna',
  'Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo',
  'Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','FCT'];

const _NIGERIA_STATES_LOOKUP = new Map(NIGERIA_STATES.map(s => [s.toLowerCase(), s]));

// Returns the canonical state name if `raw` matches a real Nigerian state
// (trimmed, case-insensitive), otherwise null so it gets excluded from counts.
function normalizeNigeriaState(raw) {
  if (!raw) return null;
  return _NIGERIA_STATES_LOOKUP.get(String(raw).trim().toLowerCase()) || null;
}

// The backend hard-caps any single request at 200 records (assetService.js
// listAssets: Math.min(200, limit)), so a 1000+ asset database needs multiple
// requests to retrieve in full. This fetches page 1 to learn the total page
// count, then fires the remaining pages in parallel.
async function fetchAllAssets(baseParams = {}) {
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

async function renderAssets() {
  currentPage = 1;
  try {
    const q = document.getElementById('search-input')?.value.trim() || '';
    const type = document.getElementById('filter-type')?.value || '';
    const cond = document.getElementById('filter-cond')?.value || '';
    const geom = document.getElementById('filter-geom')?.value || '';
    const mda  = document.getElementById('filter-mda')?.value   || '';
    const params = {};
    if (type) params.type      = type;
    if (cond) params.condition = cond;
    allAssets = await fetchAllAssets(params);
    filteredAssets = [...allAssets];
    if (q) filteredAssets = filteredAssets.filter(a =>
      (a.name||'').toLowerCase().includes(q.toLowerCase()) ||
      (a.assetId||'').toLowerCase().includes(q.toLowerCase()) ||
      (a.state||'').toLowerCase().includes(q.toLowerCase())
    );
    if (geom) filteredAssets = filteredAssets.filter(a => (a.geomType||a.geom) === geom);
    if (mda)  filteredAssets = filteredAssets.filter(a => a.mda === mda);
  } catch {
    // Offline fallback
    allAssets = [...assets];
    filteredAssets = [...allAssets];
    const q = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    const type = document.getElementById('filter-type')?.value || '';
    const cond = document.getElementById('filter-cond')?.value || '';
    const geom = document.getElementById('filter-geom')?.value || '';
    const mda  = document.getElementById('filter-mda')?.value   || '';
    if (q) filteredAssets = filteredAssets.filter(a =>
      (a.name||'').toLowerCase().includes(q) || (a.id||'').toLowerCase().includes(q) ||
      (a.state||'').toLowerCase().includes(q)
    );
    if (type) filteredAssets = filteredAssets.filter(a => a.type === type);
    if (cond) filteredAssets = filteredAssets.filter(a => a.condition === cond);
    if (geom) filteredAssets = filteredAssets.filter(a => (a.geomType||a.geom) === geom);
    if (mda)  filteredAssets = filteredAssets.filter(a => a.mda === mda);
  }

  // ── PHOTOS FIRST ─────────────────────────────────────────────────────────
  // Stable sort (guaranteed since ES2019) — orders by actual photo count
  // descending, so assets with the most photos lead, down to zero-photo
  // assets at the bottom, rather than hiding anything.
  if (document.getElementById('filter-photos-first')?.checked) {
    const photoCount = a => a.photos?.length || a.photoCount || 0;
    filteredAssets.sort((a, b) => photoCount(b) - photoCount(a));
  }

  renderAssetsTable(filteredAssets);
}

function renderAssetsTable(list) {
  // ── STATS BAR ──────────────────────────────────────────────────────────────
  // Runs unconditionally (even when the filtered list is empty) so the bar
  // always reflects the current filter, not just the current page.
  const uniqueStates = [...new Set(filteredAssets.map(a => normalizeNigeriaState(a.state)).filter(Boolean))].sort();
  const uniqueLgas   = [...new Set(filteredAssets.map(a => a.lga).filter(Boolean))].sort();
  const goodCount    = filteredAssets.filter(a => a.condition === 'Good').length;
  const critCount    = filteredAssets.filter(a => a.condition === 'Critical').length;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('stat-bar-total',    filteredAssets.length);
  setEl('stat-bar-states',   uniqueStates.length);
  setEl('stat-bar-lgas',     uniqueLgas.length);
  setEl('stat-bar-good',     goodCount);
  setEl('stat-bar-critical', critCount);
  const listEl = document.getElementById('stat-bar-states-list');
  if (listEl) listEl.textContent = uniqueStates.length ? uniqueStates.join(' · ') : '';

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / ASSETS_PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ASSETS_PAGE_SIZE;
  const pageItems = list.slice(start, start + ASSETS_PAGE_SIZE);

  const tbody = document.getElementById('assets-tbody');
  if (!total) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state">
      <div class="empty-icon"><i class="fa-solid fa-layer-group"></i></div>
      <div class="empty-title">No assets found</div>
      <div class="empty-sub">Adjust filters or capture a new asset</div>
    </div></td></tr>`;
    renderAssetsPagination(0, 0, 0);
    return;
  }

  tbody.innerHTML = pageItems.map(a => {
    const id = a.assetId || a.id;
    const geom = a.geomType || a.geom || '—';
    const lat = a.lat || a.location?.coordinates?.[1] || '—';
    const lng = a.lng || a.location?.coordinates?.[0] || '—';
    const agent = a.agent || a.capturedBy?.name || '—';
    const mda   = a.mda || '—';
    return `<tr>
      <td style="width:36px"><input type="checkbox" class="asset-row-check" data-id="${id}" onchange="onAssetRowCheck()" ${selectedAssetIds.has(id)?'checked':''}></td>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">${escHtml(id)}</td>
      <td><strong>${escHtml(a.name)}</strong></td>
      <td><span class="tag ${typeColor(a.type)}">${escHtml(a.type)}</span></td>
      <td>${geomIcon(geom)} <span style="font-size:11px;color:var(--text3);margin-left:2px">${geom}</span></td>
      <td><span class="tag ${condColor(a.condition)}">${escHtml(a.condition)}</span></td>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">${typeof lat==='number'?lat.toFixed(4):lat}, ${typeof lng==='number'?lng.toFixed(4):lng}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(a.state||'—')}</td>
      <td style="font-size:11px;color:var(--text2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(mda)}">${escHtml(mda)}</td>
      <td>${typeof calcRiskScore !== 'undefined' ? riskBadge(calcRiskScore(a)) : ''}</td>
      <td style="font-size:12px;color:var(--text3)">${escHtml(agent)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-xs" onclick="window.location.href='asset-view.html?id='+encodeURIComponent('${id}')" title="View detail">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn btn-ghost btn-xs" onclick='openEditAsset(${JSON.stringify(a).replace(/'/g,"&#39;")})' title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-danger btn-xs" onclick="deleteAsset('${id}')" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  renderAssetsPagination(start + 1, Math.min(start + ASSETS_PAGE_SIZE, total), total);
}

// ── PAGINATION CONTROLS ───────────────────────────────────────────────────────
function renderAssetsPagination(from, to, total) {
  const info  = document.getElementById('page-info');
  const pager = document.getElementById('pagination');
  if (info) info.textContent = total ? `Showing ${from}–${to} of ${total} assets` : 'Showing 0 assets';
  if (!pager) return;

  const totalPages = Math.max(1, Math.ceil(total / ASSETS_PAGE_SIZE));
  if (totalPages <= 1) { pager.innerHTML = ''; return; }

  const pageBtn = (label, page, disabled, active) =>
    `<button class="btn btn-ghost btn-xs" style="${active ? 'background:var(--blue,#4A90D9);color:#fff;' : ''}" ${disabled ? 'disabled' : ''} onclick="goToAssetsPage(${page})">${label}</button>`;

  let html = pageBtn('<i class="fa-solid fa-angle-left"></i>', currentPage - 1, currentPage === 1, false);

  const window_ = 1;
  const pagesToShow = new Set([1, totalPages]);
  for (let p = currentPage - window_; p <= currentPage + window_; p++) {
    if (p >= 1 && p <= totalPages) pagesToShow.add(p);
  }
  let prev = 0;
  [...pagesToShow].sort((a, b) => a - b).forEach(p => {
    if (p - prev > 1) html += `<span style="padding:0 6px;color:var(--text3)">…</span>`;
    html += pageBtn(String(p), p, false, p === currentPage);
    prev = p;
  });

  html += pageBtn('<i class="fa-solid fa-angle-right"></i>', currentPage + 1, currentPage === totalPages, false);
  pager.innerHTML = html;
}

function goToAssetsPage(p) {
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ASSETS_PAGE_SIZE));
  currentPage = Math.min(Math.max(1, p), totalPages);
  renderAssetsTable(filteredAssets);
}

function filterAssets() { renderAssets(); }
function clearFilters() {
  ['search-input','filter-type','filter-cond','filter-geom','filter-state','filter-mda'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const photosFirst = document.getElementById('filter-photos-first');
  if (photosFirst) photosFirst.checked = false;
  renderAssets();
}

// ── ASSET DETAIL ──────────────────────────────────────────────────────────────
// ── DELETE ────────────────────────────────────────────────────────────────────
async function deleteAsset(id) {
  if (!confirm(`Delete asset ${id}? This cannot be undone.`)) return;
  try {
    await apiDeleteAsset(id);
    toast('Asset deleted', 'fa-trash');
  } catch {
    assets = assets.filter(a => (a.assetId||a.id) !== id);
    saveLocal();
    toast('Deleted locally', 'fa-trash');
  }
  addAudit('ASSET_DELETED', id, null, 'Asset removed');
  renderAssets();
  renderDashboard();
}

// ── EDIT ──────────────────────────────────────────────────────────────────────
function openEditAsset(a) {
  const id = a.assetId || a.id;
  openModal('Edit Asset',
    `<div class="form-grid">
      <div class="form-group full"><label class="form-label">Name</label><input class="form-control" id="edit-name" value="${escHtml(a.name)}"></div>
      <div class="form-group"><label class="form-label">Condition</label>
        <select class="form-control" id="edit-cond">
          ${['Good','Fair','Poor','Critical'].map(c=>`<option ${a.condition===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-control" id="edit-status">
          ${['Active','Under Maintenance','Decommissioned','Disputed','Recovered'].map(s=>`<option ${(a.status||'Active')===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      <div class="form-group full"><label class="form-label">MDA / Agency</label>
        <select class="form-control" id="edit-mda"><option value="">— Select MDA —</option></select></div>
      <div class="form-group"><label class="form-label">State</label><input class="form-control" id="edit-state" value="${escHtml(a.state||'')}"></div>
      <div class="form-group"><label class="form-label">LGA</label><input class="form-control" id="edit-lga" value="${escHtml(a.lga||'')}"></div>
      <div class="form-group full"><label class="form-label">Notes</label><textarea class="form-control" id="edit-notes">${escHtml(a.notes||'')}</textarea></div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveEditedAsset('${id}')"><i class="fa-solid fa-save"></i> Save Changes</button>`
  );
  populateMdaSelect('edit-mda', a.mda || '');
}

async function saveEditedAsset(id) {
  const data = {
    name:      document.getElementById('edit-name')?.value.trim(),
    condition: document.getElementById('edit-cond')?.value,
    status:    document.getElementById('edit-status')?.value,
    mda:       document.getElementById('edit-mda')?.value || '',
    state:     document.getElementById('edit-state')?.value,
    lga:       document.getElementById('edit-lga')?.value,
    notes:     document.getElementById('edit-notes')?.value,
  };
  try {
    await apiUpdateAsset(id, data);
    toast('Asset updated', 'fa-circle-check');
  } catch {
    const a = assets.find(x => (x.assetId||x.id) === id);
    if (a) Object.assign(a, data);
    saveLocal();
    toast('Saved locally', 'fa-circle-check');
  }
  addAudit('ASSET_UPDATED', id, null, `${data.name} updated`);
  closeModal();
  renderAssets();
}

// ── BULK ACTIONS ──────────────────────────────────────────────────────────────
function onAssetRowCheck() {
  selectedAssetIds = new Set([...document.querySelectorAll('.asset-row-check:checked')].map(c => c.dataset.id));
  updateBulkBar();
}
function toggleSelectAllAssets(checked) {
  document.querySelectorAll('.asset-row-check').forEach(c => { c.checked = checked; });
  selectedAssetIds = checked ? new Set([...document.querySelectorAll('.asset-row-check')].map(c => c.dataset.id)) : new Set();
  updateBulkBar();
}
function updateBulkBar() {
  const n = selectedAssetIds.size;
  const bar = document.getElementById('bulk-action-bar');
  const toolbar = document.getElementById('asset-selection-toolbar');
  const countEl = document.getElementById('sel-toolbar-count');
  if (countEl) countEl.textContent = n + ' selected';
  if (toolbar) toolbar.style.display = n > 0 ? 'flex' : 'none';
  if (bar) bar.classList.toggle('visible', n > 0);
  const bulkCount = document.getElementById('bulk-count');
  if (bulkCount) bulkCount.textContent = n + ' selected';
}
function clearBulkSelection() {
  selectedAssetIds.clear();
  document.querySelectorAll('.asset-row-check').forEach(c => c.checked = false);
  updateBulkBar();
}

async function bulkDelete() {
  if (!selectedAssetIds.size) return;
  if (!confirm(`Delete ${selectedAssetIds.size} assets? This cannot be undone.`)) return;
  for (const id of selectedAssetIds) {
    try { await apiDeleteAsset(id); } catch { assets = assets.filter(a => (a.assetId||a.id) !== id); }
  }
  saveLocal();
  addAudit('BULK_DELETE', 'MULTIPLE', null, `${selectedAssetIds.size} assets deleted`);
  selectedAssetIds.clear();
  updateBulkBar();
  renderAssets();
  toast(`${selectedAssetIds.size || 'Selected'} assets deleted`, 'fa-trash');
}

function bulkExportCSV() {
  downloadExport('csv', [...selectedAssetIds]);
}

// ── STANDALONE PAGE FUNCTIONS ─────────────────────────────────────────────────

// loadAssets = entry point for assets.html
const loadAssets = renderAssets;

// sortBy — click table headers to sort
let _sortField = 'ts';
let _sortDir   = -1;

function sortBy(field) {
  if (_sortField === field) { _sortDir *= -1; } else { _sortField = field; _sortDir = -1; }
  filteredAssets.sort((a, b) => {
    const va = a[field] || a.location?.coordinates?.[field] || '';
    const vb = b[field] || b.location?.coordinates?.[field] || '';
    if (typeof va === 'number') return (va - vb) * _sortDir;
    return String(va).localeCompare(String(vb)) * _sortDir;
  });
  currentPage = 1;
  renderAssetsTable(filteredAssets);
}

function exportAssets(fmt) { downloadExport(fmt); }

// Bulk bar for assets.html (uses sel-toolbar + sel-count)
function toggleSelectAll(checked) { toggleSelectAllAssets(checked); }
function clearSelection() { clearBulkSelection(); }
function bulkExport(fmt) { downloadExport(fmt, [...selectedAssetIds]); }