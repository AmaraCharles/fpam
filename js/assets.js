// ── ASSET REGISTRY ──────────────────────────────────────────────────────────
let filteredAssets = [];
let selectedAssetIds = new Set();

async function renderAssets() {
  try {
    const q = document.getElementById('search-input')?.value.trim() || '';
    const type = document.getElementById('filter-type')?.value || '';
    const cond = document.getElementById('filter-cond')?.value || '';
    const geom = document.getElementById('filter-geom')?.value || '';
    const mda  = document.getElementById('filter-mda')?.value   || '';
    const params = {};
    if (type) params.type      = type;
    if (cond) params.condition = cond;
    const r = await apiGetAssets(params);
    filteredAssets = r.assets || [];
    if (q) filteredAssets = filteredAssets.filter(a =>
      (a.name||'').toLowerCase().includes(q.toLowerCase()) ||
      (a.assetId||'').toLowerCase().includes(q.toLowerCase()) ||
      (a.state||'').toLowerCase().includes(q.toLowerCase())
    );
    if (geom) filteredAssets = filteredAssets.filter(a => (a.geomType||a.geom) === geom);
    if (mda)  filteredAssets = filteredAssets.filter(a => a.mda === mda);
  } catch {
    // Offline fallback
    filteredAssets = [...assets];
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
  renderAssetsTable(filteredAssets);

  // ── Stats summary bar ──────────────────────────────────────────────────────
  const uniqueStates = [...new Set(filteredAssets.map(a => a.state).filter(Boolean))].sort();
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

  // Handle ?highlight= or ?q= URL params on first load
  const params = new URLSearchParams(location.search);
  const highlight = params.get('highlight');
  const qParam    = params.get('q');
  if (highlight) {
    const row = document.querySelector(`[data-id="${highlight}"]`)?.closest('tr');
    if (row) {
      row.style.background = 'rgba(74,144,217,.1)';
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => row.style.background = '', 2500);
    }
  }
  if (qParam) {
    const si = document.getElementById('search-input');
    if (si) { si.value = qParam; renderAssets(); }
  }
}

function renderAssetsTable(list) {
  const tbody = document.getElementById('assets-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state">
      <div class="empty-icon"><i class="fa-solid fa-layer-group"></i></div>
      <div class="empty-title">No assets found</div>
      <div class="empty-sub">Adjust filters or capture a new asset</div>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => {
    const id = a.assetId || a.id;
    const geom = a.geomType || a.geom || '—';
    const lat = a.lat || a.location?.coordinates?.[1] || '—';
    const lng = a.lng || a.location?.coordinates?.[0] || '—';
    const agent = a.agent || a.capturedBy?.name || '—';
    const mda   = a.mda || '—';
    return `<tr style="cursor:pointer" onclick="openAssetView('${id}', event)">
      <td style="width:36px"><input type="checkbox" class="asset-row-check" data-id="${id}" onchange="onAssetRowCheck()" ${selectedAssetIds.has(id)?'checked':''}></td>
      <td style="font-family:'Courier New',monospace;font-size:10px;color:var(--text3)">
        ${a.assetCode
          ? `<div style="font-weight:700;color:var(--text);letter-spacing:.3px;margin-bottom:2px">
               ${escHtml(a.assetCode)}
               ${a.assetCode.includes('-001-')
                 ? '<span style="font-size:9px;background:rgba(45,184,123,.15);color:#0f7a4d;padding:1px 6px;border-radius:10px;margin-left:4px;font-family:\'DM Sans\',sans-serif;font-weight:700">HQ</span>'
                 : ''}
             </div>
             <div style="font-size:9px;color:var(--text3)">${escHtml(id)}</div>`
          : escHtml(id)
        }
      </td>
      <td><strong>${escHtml(a.name)}</strong></td>
      <td><span class="tag ${typeColor(a.type)}">${escHtml(a.type)}</span></td>
      <td>${geomIcon(geom)} <span style="font-size:11px;color:var(--text3);margin-left:2px">${geom}</span></td>
      <td><span class="tag ${condColor(a.condition)}">${escHtml(a.condition)}</span></td>
      <td style="font-size:12px;color:var(--text2)">
        <div style="font-weight:500">${escHtml(a.state||'—')}</div>
        ${a.lga ? `<div style="font-size:10px;color:var(--text3);margin-top:1px">${escHtml(a.lga)}</div>` : ''}
      </td>
      <td>
        <span class="tag ${a.assessed === 'Assessed' ? 'tag-green' : 'tag-orange'}" style="font-size:10px">
          ${a.assessed === 'Assessed' ? '<i class="fa-solid fa-circle-check" style="font-size:9px"></i> Assessed' : '<i class="fa-solid fa-circle-question" style="font-size:9px"></i> Unassessed'}
        </span>
      </td>
      <td>${typeof calcRiskScore !== 'undefined' ? riskBadge(calcRiskScore(a)) : ''}</td>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">${escHtml(agent)}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-xs" onclick="openAssetView('${id}')" title="View detail">
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
}

// Navigate to asset-view page — skips row click if user clicked checkbox or action buttons
function openAssetView(id, event) {
  if (event) {
    // Don't navigate if the click was on a checkbox, button, or input
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'BUTTON' || event.target.closest('button') || event.target.closest('input')) return;
  }
  window.location.href = `asset-view.html?id=${encodeURIComponent(id)}`;
}
function clearFilters() {
  ['search-input','filter-type','filter-cond','filter-geom','filter-state','filter-mda'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderAssets();
}

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
  const id  = a.assetId || a.id;
  const lat = a.lat ?? a.location?.coordinates?.[1] ?? '';
  const lng = a.lng ?? a.location?.coordinates?.[0] ?? '';
  const capDate = (a.captureDate || a.date || '').toString().slice(0, 10);

  const SECTORS = [
    '', 'Administration & Governance', 'Defence & Security', 'Education', 'Health',
    'Infrastructure & Works', 'Energy & Power', 'Agriculture & Food Security',
    'Water Resources', 'Transportation', 'Finance & Economy', 'Justice & Legal Affairs',
    'Environment', 'Communications & Digital', 'Social Development', 'Science & Technology',
    'Trade & Investment', 'Petroleum & Mineral Resources', 'Labour & Employment',
    'Foreign Affairs', 'Culture, Tourism & Sports',
  ];

  openModal('Edit Asset',
    `<div class="form-grid">
      <input type="hidden" id="edit-prev-condition" value="${escHtml(a.condition||'')}">

      <div class="form-group full"><label class="form-label">Name</label>
        <input class="form-control" id="edit-name" value="${escHtml(a.name)}"></div>

      <div class="form-group"><label class="form-label">Condition</label>
        <select class="form-control" id="edit-cond">
          <option value="" ${!a.condition ? 'selected' : ''}>— Unassessed —</option>
          ${['Good','Fair','Poor','Critical'].map(c => `<option ${a.condition===c?'selected':''}>${c}</option>`).join('')}
        </select></div>

      <div class="form-group"><label class="form-label">Assessment Status</label>
        <select class="form-control" id="edit-assessed">
          <option value="Unassessed" ${(a.assessed||'Unassessed')==='Unassessed'?'selected':''}>Unassessed</option>
          <option value="Assessed"   ${a.assessed==='Assessed'?'selected':''}>Assessed</option>
        </select></div>

      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-control" id="edit-status">
          ${['Active','Under Maintenance','Decommissioned','Disputed','Recovered'].map(s => `<option ${(a.status||'Active')===s?'selected':''}>${s}</option>`).join('')}
        </select></div>

      <div class="form-group full"><label class="form-label">MDA / Agency</label>
        <select class="form-control" id="edit-mda"><option value="">— Select MDA —</option></select></div>

      <div class="form-group full"><label class="form-label">Sector</label>
        <select class="form-control" id="edit-sector">
          ${SECTORS.map(s => `<option value="${escHtml(s)}" ${(a.sector||'')=== s?'selected':''}>${s || '— Select Sector —'}</option>`).join('')}
        </select></div>

      <div class="form-group"><label class="form-label">State</label>
        <input class="form-control" id="edit-state" value="${escHtml(a.state||'')}"></div>
      <div class="form-group"><label class="form-label">LGA</label>
        <input class="form-control" id="edit-lga" value="${escHtml(a.lga||'')}"></div>

      <div class="form-group"><label class="form-label">Latitude</label>
        <input class="form-control" id="edit-lat" type="number" step="any" placeholder="e.g. 9.0765" value="${lat}"></div>
      <div class="form-group"><label class="form-label">Longitude</label>
        <input class="form-control" id="edit-lng" type="number" step="any" placeholder="e.g. 7.3986" value="${lng}"></div>

      <div class="form-group"><label class="form-label">Capture Date</label>
        <input class="form-control" id="edit-capture-date" type="date" value="${escHtml(capDate)}"></div>

      <div class="form-group full"><label class="form-label">Notes</label>
        <textarea class="form-control" id="edit-notes">${escHtml(a.notes||'')}</textarea></div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveEditedAsset('${id}')"><i class="fa-solid fa-save"></i> Save Changes</button>`
  );
  populateMdaSelect('edit-mda', a.mda || '');
}

async function saveEditedAsset(id) {
  const latVal = document.getElementById('edit-lat')?.value;
  const lngVal = document.getElementById('edit-lng')?.value;
  const lat    = parseFloat(latVal);
  const lng    = parseFloat(lngVal);
  const capDateVal = document.getElementById('edit-capture-date')?.value;

  const data = {
    name:              document.getElementById('edit-name')?.value.trim(),
    condition:         document.getElementById('edit-cond')?.value || null,
    previousCondition: document.getElementById('edit-prev-condition')?.value || '',
    assessed:          document.getElementById('edit-assessed')?.value,
    status:            document.getElementById('edit-status')?.value,
    mda:               document.getElementById('edit-mda')?.value || '',
    sector:            document.getElementById('edit-sector')?.value || '',
    state:             document.getElementById('edit-state')?.value,
    lga:               document.getElementById('edit-lga')?.value,
    notes:             document.getElementById('edit-notes')?.value,
    ...(capDateVal ? { captureDate: capDateVal } : {}),
    ...(!isNaN(lat) && !isNaN(lng) && latVal !== '' && lngVal !== '' ? {
      lat, lng,
      location: { type: 'Point', coordinates: [lng, lat] },
    } : {}),
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
  renderAssetsTable(filteredAssets);
}

function exportAssets(fmt) { downloadExport(fmt); }

// Bulk bar for assets.html (uses sel-toolbar + sel-count)
function toggleSelectAll(checked) { toggleSelectAllAssets(checked); }
function clearSelection() { clearBulkSelection(); }
function bulkExport(fmt) { downloadExport(fmt, [...selectedAssetIds]); }