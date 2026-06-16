// ── ASSET DETAIL MODAL — Full Production Port ─────────────────────────────────
// Replaces all IndexedDB / localStorage logic with GridFS API calls

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcRiskScore(a) {
  let score = 0;
  if (a.condition === 'Critical')  score += 40;
  else if (a.condition === 'Poor') score += 25;
  else if (a.condition === 'Fair') score += 10;
  if (a.nextInspection) {
    const daysLeft = Math.round((new Date(a.nextInspection) - new Date()) / 86400000);
    if (daysLeft < 0)  score += 30;
    else if (daysLeft < 30) score += 15;
  }
  if (a.type === 'Infrastructure') score += 10;
  else if (a.type === 'Utility')   score += 8;
  return Math.min(score, 100);
}

function riskBadge(score) {
  if (score >= 60) return `<span class="tag tag-red" title="Risk score: ${score}/100"><i class="fa-solid fa-circle-exclamation"></i> HIGH ${score}</span>`;
  if (score >= 30) return `<span class="tag tag-warn" title="Risk score: ${score}/100"><i class="fa-solid fa-triangle-exclamation"></i> MED ${score}</span>`;
  return `<span class="tag tag-green" title="Risk score: ${score}/100"><i class="fa-solid fa-circle-check"></i> LOW ${score}</span>`;
}

// ── ASSET DETAIL MODAL ────────────────────────────────────────────────────────
function showAssetDetail(a) {
  if (!a) return;
  const id  = a.assetId || a.id;
  const lat = a.lat || a.location?.coordinates?.[1];
  const lng = a.lng || a.location?.coordinates?.[0];
  const mapsLink = (lat && lng && !isNaN(lat) && !isNaN(lng))
    ? `<a class="btn btn-secondary btn-sm" href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank"><i class="fa-solid fa-map-location-dot"></i> Google Maps</a>`
    : '';

  // Store asset on window so switchDetailTab can access it for location map
  window._detailAsset = a;

  openModal(escHtml(a.name || id), `
    <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:16px;gap:0;overflow-x:auto">
      <button class="dtab-btn active" data-tab="info"     onclick="switchDetailTab('info',this)">     <i class="fa-solid fa-circle-info"></i> Info</button>
      <button class="dtab-btn"        data-tab="location" onclick="switchDetailTab('location',this)"> <i class="fa-solid fa-map-pin"></i> Location</button>
      <button class="dtab-btn"        data-tab="maint"    onclick="switchDetailTab('maint',this)">   <i class="fa-solid fa-wrench"></i> Maintenance</button>
      <button class="dtab-btn"        data-tab="history"  onclick="switchDetailTab('history',this)"> <i class="fa-solid fa-chart-line"></i> History</button>
      <button class="dtab-btn"        data-tab="photos"   onclick="switchDetailTab('photos',this)">  <i class="fa-solid fa-camera"></i> Photos</button>
      <button class="dtab-btn"        data-tab="excel"    onclick="switchDetailTab('excel',this)">   <i class="fa-solid fa-file-excel"></i> Excel</button>
      <button class="dtab-btn"        data-tab="documents" onclick="switchDetailTab('documents',this)"><i class="fa-solid fa-file-lines"></i> Documents</button>
      <button class="dtab-btn"        data-tab="valuation" onclick="switchDetailTab('valuation',this)"><i class="fa-solid fa-naira-sign"></i> Valuation</button>
    </div>

    <!-- INFO TAB -->
    <div id="dtab-info" class="dtab-content" style="display:block">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        ${_detailRow('Asset ID',     `<span style="font-family:'Space Mono',monospace;color:var(--accent)">${escHtml(id)}</span>`)}
        ${_detailRow('Status',       `<span class="tag ${(a.status||'Active')==='Active'?'tag-green':'tag-gray'}">${escHtml(a.status||'Active')}</span>`)}
        ${_detailRow('Type',         `<span class="tag ${typeColor(a.type)}">${escHtml(a.type)}</span>`)}
        ${_detailRow('Condition',    `<span class="tag ${condColor(a.condition)}">${escHtml(a.condition)}</span>`)}
        ${_detailRow('Risk',         riskBadge(calcRiskScore(a)))}
        ${_detailRow('Geometry',     `${geomIcon(a.geomType||a.geom)} ${escHtml(a.geomType||a.geom||'—')}`)}
        ${_detailRow('MDA / Agency', escHtml(a.mda||'—'))}
        ${_detailRow('State',        escHtml(a.state||'—'))}
        ${_detailRow('LGA',          escHtml(a.lga||'—'))}
        ${_detailRow('Address',      escHtml(a.address||'—'), true)}
        ${_detailRow('Material',     escHtml(a.material||'—'))}
        ${_detailRow('Area/Dim',     escHtml(a.area||'—'))}
        ${_detailRow('Captured By',  escHtml(a.agent||a.capturedBy?.name||'—'))}
        ${_detailRow('Capture Date', escHtml(a.date||a.captureDate||'—'))}
        ${(lat&&lng)?_detailRow('Coordinates',`<span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--accent)">${Number(lat).toFixed(6)}°N, ${Number(lng).toFixed(6)}°E</span>`,true):''}
        ${a.nextInspection?_detailRow('Next Inspection',`<span style="color:${new Date(a.nextInspection)<new Date()?'var(--danger)':'var(--warn)'}">${escHtml(a.nextInspection)}</span>`):''}
        ${a.notes?_detailRow('Notes',escHtml(a.notes),true):''}
      </div>
      ${a.typeData&&Object.keys(a.typeData).length?`
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
          <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px">Type-Specific Fields</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
            ${Object.entries(a.typeData).map(([k,v])=>_detailRow(escHtml(k),escHtml(v))).join('')}
          </div>
        </div>`:''}
    </div>

    <!-- LOCATION TAB -->
    <div id="dtab-location" class="dtab-content" style="display:none">
      ${(lat && lng && !isNaN(lat) && !isNaN(lng)) ? `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px">
          <i class="fa-solid fa-crosshairs" style="color:var(--accent);font-size:14px"></i>
          <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--accent)">${Number(lat).toFixed(6)}°N, ${Number(lng).toFixed(6)}°E</span>
          <span style="margin-left:auto;font-size:10px;color:var(--text3)">WGS84</span>
        </div>
        <div id="dtab-location-map-${id}" style="height:260px;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--surface2)"></div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          ${mapsLink}
          <a class="btn btn-secondary btn-sm" href="map.html" style="font-size:11px"><i class="fa-solid fa-map"></i> Open Full Map</a>
        </div>
      ` : `
        <div style="text-align:center;padding:40px;color:var(--text3)">
          <i class="fa-solid fa-location-slash" style="font-size:32px;margin-bottom:12px;display:block;color:var(--border2)"></i>
          <div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:5px">No coordinates recorded</div>
          <div style="font-size:11px">Capture GPS from the Field Capture page to add a location.</div>
        </div>
      `}
    </div>

    <!-- MAINTENANCE TAB -->
    <div id="dtab-maint" class="dtab-content" style="display:none">
      <div id="maint-content-${id}">
        <div style="text-align:center;padding:20px"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- HISTORY TAB -->
    <div id="dtab-history" class="dtab-content" style="display:none">
      <div id="history-content-${id}">
        <div style="text-align:center;padding:20px"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- PHOTOS TAB -->
    <div id="dtab-photos" class="dtab-content" style="display:none">
      <div id="photo-gallery-${id}">
        <div style="text-align:center;padding:24px;color:var(--text3)"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- EXCEL DATA TAB -->
    <div id="dtab-excel" class="dtab-content" style="display:none">
      <div id="excel-content-${id}">
        <div style="text-align:center;padding:24px;color:var(--text3)"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- DOCUMENTS TAB -->
    <div id="dtab-documents" class="dtab-content" style="display:none">
      <div id="documents-content-${id}">
        <div style="text-align:center;padding:24px;color:var(--text3)"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- VALUATION TAB -->
    <div id="dtab-valuation" class="dtab-content" style="display:none">
      ${_buildValuationTab(a)}
    </div>
  `,
  `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
   ${mapsLink}
   <button class="btn btn-secondary btn-sm" onclick="openQRModal('${id}')"><i class="fa-solid fa-qrcode"></i> QR</button>
   <button class="btn btn-secondary btn-sm" onclick="closeModal();openEditAsset(window._detailAsset)"><i class="fa-solid fa-pen"></i> Edit</button>
   <button class="btn btn-danger btn-sm" onclick="deleteAsset('${id}');closeModal()"><i class="fa-solid fa-trash"></i> Delete</button>`
  );

  // Load maintenance immediately (already in the asset object usually)
  _renderMaintenanceTab(id, a);

  // Add tab button styles
  document.querySelectorAll('.dtab-btn').forEach(b => {
    b.style.cssText = 'background:none;border:none;border-bottom:2px solid transparent;padding:9px 14px;font-size:12.5px;color:var(--text2);cursor:pointer;font-family:"Space Grotesk",sans-serif;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:all .15s';
  });
  document.querySelector('.dtab-btn.active').style.cssText += ';color:var(--accent);border-bottom-color:var(--accent)';
}

function _detailRow(label, value, fullWidth = false) {
  return `<div ${fullWidth?'style="grid-column:1/-1"':''}>
    <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${label}</div>
    <div style="font-size:13px;color:var(--text)">${value}</div>
  </div>`;
}

function switchDetailTab(tab, btn) {
  document.querySelectorAll('.dtab-content').forEach(el => el.style.display = 'none');
  const el = document.getElementById('dtab-' + tab);
  if (el) el.style.display = 'block';

  document.querySelectorAll('.dtab-btn').forEach(b => {
    b.style.cssText = 'background:none;border:none;border-bottom:2px solid transparent;padding:9px 14px;font-size:12.5px;color:var(--text2);cursor:pointer;font-family:"Space Grotesk",sans-serif;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:all .15s';
    b.classList.remove('active');
  });
  if (btn) {
    btn.style.cssText += ';color:var(--accent);border-bottom-color:var(--accent)';
    btn.classList.add('active');
  }

  // Resolve assetId from the stored asset (most reliable)
  const a       = window._detailAsset;
  const assetId = a ? (a.assetId || a.id) : null;

  // Lazy load tabs
  if (tab === 'photos'    && assetId) _loadPhotoGallery(assetId);
  if (tab === 'excel'     && assetId) _loadExcelTab(assetId);
  if (tab === 'documents' && assetId) _loadDocumentsTab(assetId);
  if (tab === 'maint'     && assetId) _renderMaintenanceTab(assetId, a || {});
  if (tab === 'location'  && assetId) _renderLocationMap(assetId, a);
  if (tab === 'history'   && assetId) _loadHistoryTab(assetId);
}

// ── HISTORY TAB ───────────────────────────────────────────────────────────────
async function _loadHistoryTab(assetId) {
  const el = document.getElementById(`history-content-${assetId}`);
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';

  // Start with whatever we have locally
  let a = window._detailAsset || {};
  let localHistory = a.conditionHistory || [];

  try {
    const r = await apiFetch(`/assets/${assetId}`);
    const fresh = r.asset || (r.assetId || r._id || r.name ? r : null);
    if (fresh) {
      const backendHistory = fresh.conditionHistory || [];
      // Merge: backend is authoritative, but keep local entries the backend doesn't know about yet
      const merged = [...backendHistory];
      localHistory.forEach(lh => {
        const alreadyIn = merged.some(bh =>
          Math.abs(new Date(bh.changedAt||bh.ts||0) - new Date(lh.changedAt||lh.ts||0)) < 5000
        );
        if (!alreadyIn) merged.push(lh);
      });
      merged.sort((a,b) => new Date(a.changedAt||a.ts||0) - new Date(b.changedAt||b.ts||0));
      fresh.conditionHistory = merged;
      a = { ...a, ...fresh };
      if (window._detailAsset) window._detailAsset.conditionHistory = merged;
    }
  } catch {}

  el.innerHTML = _buildConditionHistory(a);
}

// ── LOCATION MAP ──────────────────────────────────────────────────────────────
function _renderLocationMap(assetId, a) {
  const mapEl = document.getElementById(`dtab-location-map-${assetId}`);
  if (!mapEl || mapEl._leafletMap) return; // already rendered

  const lat = Number(a?.lat || a?.location?.coordinates?.[1]);
  const lng = Number(a?.lng || a?.location?.coordinates?.[0]);
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

  if (!window.L) { mapEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">Leaflet not loaded</div>'; return; }

  const m = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(m);

  const icon = L.divIcon({
    html: `<div style="background:var(--accent,#00c864);width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
    className: '', iconSize: [14, 14], iconAnchor: [7, 7]
  });
  L.marker([lat, lng], { icon }).addTo(m).bindPopup(`<b>${escHtml(a.name||assetId)}</b><br>${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`).openPopup();

  mapEl._leafletMap = m;
  // Force size recalculation (modal may have just become visible)
  setTimeout(() => m.invalidateSize(), 50);
}

// ── PHOTO GALLERY ─────────────────────────────────────────────────────────────

// Extract the GridFS file ID from a photo/file object — always returns a string or null.
// IMPORTANT: fileId is the GridFS storage ID. _id is the subdocument ID.
// We must use fileId for streaming — _id is NOT stored in GridFS.
function _fileId(f) {
  const raw = f.fileId || f.gridfsId || f.photoId || f.file_id ||
              f.id     || f._id      ||
    (typeof f === 'string' ? f : null);
  if (!raw) return null;
  return typeof raw === 'string' ? raw : String(raw);
}

// Fetch a protected image as a blob URL so the Authorization header is sent
const _blobCache = {};
async function _authedImgSrc(url) {
  if (_blobCache[url]) return _blobCache[url];
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + (localStorage.getItem('as_token') || '') } });
    console.log('[Photo fetch]', url, '→', r.status, r.headers.get('content-type'));
    if (!r.ok) { console.warn('[Photo fetch] failed:', r.status, r.statusText); return null; }
    const blob = await r.blob();
    console.log('[Photo fetch] blob size:', blob.size, 'type:', blob.type);
    if (!blob.size) { console.warn('[Photo fetch] empty blob'); return null; }
    const bUrl = URL.createObjectURL(blob);
    _blobCache[url] = bUrl;
    return bUrl;
  } catch(e) { console.error('[Photo fetch] error:', e.message); return null; }
}

async function _loadPhotoGallery(assetId) {
  const el = document.getElementById(`photo-gallery-${assetId}`);
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  el.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';

  try {
    const r = await apiFetch(`/assets/${assetId}/photos`);
    console.log('[Photos] raw response:', r);
    const photos = r.files || r.photos || r.data || r.results || [];
    console.log('[Photos] count:', photos.length, '| first photo:', photos[0]);
    if (photos.length) {
      console.log('[Photos] _fileId result:', _fileId(photos[0]));
      console.log('[Photos] URL would be:', `${API_BASE}/assets/${assetId}/photos/${_fileId(photos[0])}`);
    }
    await _renderPhotoGallery(assetId, photos, el);
  } catch(e) {
    el.dataset.loaded = ''; // allow retry
    el.innerHTML = `<div style="color:var(--text3);font-size:12px;text-align:center;padding:20px">
      Could not load photos${e.message ? ': ' + e.message : ''}<br>
      <button class="btn btn-ghost btn-xs" style="margin-top:8px" onclick="this.closest('[id]').dataset.loaded='';_loadPhotoGallery('${assetId}')">Retry</button>
    </div>
    <div style="margin-top:12px">${_photoUploadControls(assetId)}</div>`;
  }
}

async function _renderPhotoGallery(assetId, photos, container) {
  const el = container || document.getElementById(`photo-gallery-${assetId}`);
  if (!el) return;

  if (!photos.length) {
    el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text3)">
      <i class="fa-solid fa-camera" style="font-size:28px;margin-bottom:10px;display:block"></i>No photos yet
    </div>` + _photoUploadControls(assetId);
    return;
  }

  // Only System Admin can delete photos
  const isAdmin = (getCurrentUser()?.role || '') === 'System Admin';

  // Build placeholder grid — no delete button yet (image not loaded)
  const thumbId = (p) => `thumb-${assetId}-${_fileId(p)}`;
  el.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px" id="photo-grid-${assetId}">
    ${photos.map(p => {
      const pid = _fileId(p);
      return `<div id="${thumbId(p)}"
        style="position:relative;width:90px;height:90px;border-radius:6px;overflow:hidden;
               border:1px solid var(--border);background:var(--surface2);
               display:flex;align-items:center;justify-content:center"
        data-pid="${pid}">
        <div class="spinner" style="width:18px;height:18px;border-width:2px"></div>
      </div>`;
    }).join('')}
  </div>` + _photoUploadControls(assetId);

  // Load each image with auth header, then replace placeholder content
  for (const p of photos) {
    const pid = _fileId(p);
    if (!pid) continue;
    const apiUrl = `${API_BASE}/assets/${assetId}/photos/${pid}`;
    const div    = document.getElementById(thumbId(p));
    if (!div) continue;

    const bUrl = await _authedImgSrc(apiUrl);
    if (bUrl) {
      div.style.cursor = 'pointer';
      // Delete button only injected for System Admin, revealed on hover
      const deleteBtn = isAdmin ? `
        <button
          onclick="event.stopPropagation();deleteAssetPhoto('${assetId}','${pid}',this.closest('div[data-pid]'))"
          style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.72);color:#fff;
                 border:none;border-radius:50%;width:24px;height:24px;font-size:11px;
                 cursor:pointer;display:flex;align-items:center;justify-content:center;
                 opacity:0;transition:opacity .15s;z-index:2"
          title="Delete photo">
          <i class="fa-solid fa-xmark"></i>
        </button>` : '';

      div.innerHTML = `
        <img src="${bUrl}" style="width:100%;height:100%;object-fit:cover" loading="lazy">
        ${deleteBtn}`;

      // Hover: show/hide delete button
      if (isAdmin) {
        const btn = div.querySelector('button');
        div.addEventListener('mouseenter', () => { if (btn) btn.style.opacity = '1'; });
        div.addEventListener('mouseleave', () => { if (btn) btn.style.opacity = '0'; });
      }

      div.addEventListener('click', () => openLightbox(bUrl));
    } else {
      div.innerHTML = `<i class="fa-solid fa-image-slash" style="font-size:20px;color:var(--text3)"></i>`;
      div.title = 'Could not load image';
    }
  }
}

function _photoUploadControls(assetId) {
  return `<div style="display:flex;gap:8px;flex-wrap:wrap">
    <label class="btn btn-secondary btn-sm" style="cursor:pointer">
      <i class="fa-solid fa-image"></i> Add Photo
      <input type="file" accept="image/*" multiple style="display:none" onchange="uploadAssetPhotos('${assetId}',this.files)">
    </label>
    <label class="btn btn-secondary btn-sm" style="cursor:pointer">
      <i class="fa-solid fa-camera"></i> Camera
      <input type="file" accept="image/*" capture="environment" style="display:none" onchange="uploadAssetPhotos('${assetId}',this.files)">
    </label>
  </div>`;
}

async function uploadAssetPhotos(assetId, files) {
  if (!files?.length) return;
  let uploaded = 0;
  for (const file of files) {
    try {
      const fd = new FormData(); fd.append('photo', file);
      await apiFetchRaw(`/assets/${assetId}/photos`, { method:'POST', body:fd });
      uploaded++;
    } catch {}
  }
  toast(`${uploaded} photo(s) uploaded`);
  addAudit('PHOTO_ATTACHED', assetId, null, `${uploaded} photo(s) added`);
  // Reload gallery
  const el = document.getElementById(`photo-gallery-${assetId}`);
  if (el) { el.dataset.loaded = ''; _loadPhotoGallery(assetId); }
}

async function deleteAssetPhoto(assetId, photoId, thumbEl) {
  if (!confirm('Delete this photo?')) return;
  try {
    await apiFetch(`/assets/${assetId}/photos/${photoId}`, { method:'DELETE' });
    thumbEl?.remove();
    toast('Photo deleted');
    addAudit('PHOTO_DELETED', assetId, null, 'Photo removed');
  } catch(e) {
    toast('Could not delete photo: ' + e.message, 'fa-circle-xmark', true);
  }
}

function openLightbox(src) {
  const lb = document.createElement('div');
  lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(4px)';
  lb.innerHTML = `<img src="${src}" style="max-width:92vw;max-height:88vh;border-radius:8px;box-shadow:0 24px 80px rgba(0,0,0,.6)">
    <button onclick="this.parentElement.remove()" style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-xmark"></i></button>`;
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}

// ── MAINTENANCE TAB ───────────────────────────────────────────────────────────
async function _renderMaintenanceTab(assetId, a) {
  const el = document.getElementById(`maint-content-${assetId}`);
  if (!el) return;

  // Show loading
  el.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';

  let logs = a?.maintenanceLogs || [];
  try {
    const r = await apiFetch(`/assets/${assetId}`);
    // Backend may wrap under r.asset or return fields at top level
    const fetched = r.asset?.maintenanceLogs ?? r.maintenanceLogs ?? null;
    if (fetched) logs = fetched;
  } catch {}

  // Update the stored asset so tab re-renders have fresh data
  if (window._detailAsset && (window._detailAsset.assetId || window._detailAsset.id) === assetId) {
    window._detailAsset.maintenanceLogs = logs;
  }

  const total = logs.reduce((s, l) => s + Number(l.cost || l.amount || 0), 0);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:12px;color:var(--text2)"><strong>${logs.length}</strong> maintenance entries</div>
      <div style="font-family:'Space Mono',monospace;font-size:11px;color:var(--accent)">Total: ₦${total.toLocaleString()}</div>
    </div>

    <!-- Add entry form -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:14px">
      <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Add New Entry</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Description *</label>
          <input class="form-control" id="ml-desc-${assetId}" placeholder="What was done"></div>
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Date</label>
          <input class="form-control" id="ml-date-${assetId}" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Technician</label>
          <input class="form-control" id="ml-tech-${assetId}" placeholder="Name"></div>
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Cost (₦)</label>
          <input class="form-control" id="ml-cost-${assetId}" type="number" placeholder="0"></div>
      </div>
      <button class="btn btn-primary btn-sm" style="width:100%" onclick="addMaintenanceEntry('${assetId}')">
        <i class="fa-solid fa-plus"></i> Add Entry
      </button>
    </div>

    <!-- Log table -->
    <div class="table-wrap" style="margin-bottom:0">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Description</th><th>Technician</th><th>Cost (₦)</th><th></th></tr></thead>
        <tbody id="maint-tbody-${assetId}">
          ${logs.length
            ? logs.map((l, i) => `<tr>
                <td style="font-family:'Space Mono',monospace;font-size:10px">${escHtml(l.date||l.performedAt?.slice(0,10)||'—')}</td>
                <td>${escHtml(l.desc||l.description||'—')}</td>
                <td>${escHtml(l.tech||l.technician||'—')}</td>
                <td style="font-family:'Space Mono',monospace;font-size:11px;color:var(--accent)">₦${Number(l.cost||l.amount||0).toLocaleString()}</td>
                <td><button class="btn btn-danger btn-xs" onclick="deleteMaintenanceEntry('${assetId}',${i})"><i class="fa-solid fa-trash"></i></button></td>
              </tr>`).join('')
            : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">No maintenance records yet</td></tr>'
          }
        </tbody>
      </table>
    </div>`;
}

async function addMaintenanceEntry(assetId) {
  const desc = document.getElementById(`ml-desc-${assetId}`)?.value.trim();
  const date = document.getElementById(`ml-date-${assetId}`)?.value;
  const tech = document.getElementById(`ml-tech-${assetId}`)?.value;
  const cost = parseFloat(document.getElementById(`ml-cost-${assetId}`)?.value) || 0;
  if (!desc) { toast('Description is required', 'fa-triangle-exclamation', true); return; }

  const entry = { desc, date, tech, cost, amount: cost };
  try {
    await apiAddMaintenance(assetId, entry);
    toast('Maintenance entry added');
  } catch {
    const a = assets.find(x=>(x.assetId||x.id)===assetId);
    if (a) { a.maintenanceLogs = a.maintenanceLogs||[]; a.maintenanceLogs.push(entry); saveLocal(); }
    toast('Saved locally');
  }
  addAudit('MAINTENANCE_LOGGED', assetId, null, desc);
  // Re-fetch fresh data from backend so DB entries show immediately
  _renderMaintenanceTab(assetId, window._detailAsset || {});
}

async function deleteMaintenanceEntry(assetId, idx) {
  if (!confirm('Remove this maintenance entry?')) return;
  try {
    await apiFetch(`/assets/${assetId}/maintenance/${idx}`, { method:'DELETE' });
    toast('Entry removed');
  } catch {
    const a = assets.find(x=>(x.assetId||x.id)===assetId);
    if (a?.maintenanceLogs) { a.maintenanceLogs.splice(idx,1); saveLocal(); }
    toast('Removed locally');
  }
  addAudit('MAINTENANCE_DELETED', assetId, null, `Entry #${idx} removed`);
  // Refresh tab
  const asset = assets.find(x=>(x.assetId||x.id)===assetId) || {};
  _renderMaintenanceTab(assetId, asset);
}

// ── CONDITION HISTORY ─────────────────────────────────────────────────────────
function _buildConditionHistory(a) {
  const history = a.conditionHistory || [];
  if (!history.length) {
    return `<div style="text-align:center;padding:32px;color:var(--text3)">
      <i class="fa-solid fa-chart-line" style="font-size:28px;margin-bottom:10px;display:block;color:var(--border2)"></i>
      <div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:5px">No condition changes recorded</div>
      <div style="font-size:11px">Edit this asset and change its condition to start tracking.</div>
    </div>`;
  }
  const COLORS = { Good:'var(--accent)', Fair:'var(--warn)', Poor:'rgba(240,120,0,.9)', Critical:'var(--danger)' };
  const all = [{ from:null, to:history[0]?.from, ts: a.ts||a.createdAt, user: a.agent||'System' }, ...history];
  return `<div style="padding-left:16px;border-left:2px solid var(--border)">
    ${all.map(h => `<div style="position:relative;padding:0 0 18px 20px">
      <div style="position:absolute;left:-5px;top:4px;width:8px;height:8px;border-radius:50%;background:${COLORS[h.to]||'var(--border2)'};box-shadow:0 0 6px ${COLORS[h.to]||'transparent'}"></div>
      <div style="font-size:13px;font-weight:600;color:var(--text)">
        ${h.to ? `→ <span style="color:${COLORS[h.to]}">${escHtml(h.to)}</span>` : '<span style="color:var(--text3)">Initial capture</span>'}
      </div>
      ${h.from ? `<div style="font-size:11px;color:var(--text3)">from ${escHtml(h.from)}</div>` : ''}
      <div style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;margin-top:3px">
        ${new Date(h.ts||h.changedAt||Date.now()).toLocaleString('en-NG')} · ${escHtml(h.user||h.changedBy?.name||'—')}
      </div>
    </div>`).join('')}
  </div>`;
}

// ── EXCEL DATA TAB ────────────────────────────────────────────────────────────
async function _loadExcelTab(assetId) {
  const el = document.getElementById(`excel-content-${assetId}`);
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  el.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';

  try {
    const r = await apiFetch(`/assets/${assetId}/excel`);
    // Handle every possible response shape the backend might return
    const files = r.files || r.excel || r.excelFiles || r.data || r.results || [];

    if (!files.length) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text3)">
        <i class="fa-solid fa-file-excel" style="font-size:28px;margin-bottom:10px;display:block;color:var(--border2)"></i>
        <div style="font-size:13px;color:var(--text2);margin-bottom:6px">No Excel files attached</div>
        <div style="font-size:11px">Use the <a href="excel.html" style="color:var(--accent)">Excel Import</a> page and attach a file to this asset.</div>
      </div>`;
      return;
    }

    el.innerHTML = files.map((f) => {
      const fid  = _fileId(f);
      const name = f.originalname || f.filename || f.name || 'Excel File';
      const mime = f.contentType || f.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const size = f.length || f.size || 0;
      const date = new Date(f.uploadDate || f.createdAt || Date.now()).toLocaleString('en-NG');
      return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:13px"><i class="fa-solid fa-file-excel" style="color:#1d6f42;margin-right:6px"></i>${escHtml(name)}</div>
            <div style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;margin-top:2px">
              ${date}${size ? ' · ' + (size/1024).toFixed(1) + ' KB' : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-ghost btn-xs"
              onclick="previewFile('${assetId}','${fid}','${escHtml(name)}','${mime}','excel')">
              <i class="fa-solid fa-eye"></i> Preview
            </button>
            <button class="btn btn-secondary btn-xs" onclick="_downloadExcelAuthed('${assetId}','${fid}','${escHtml(name)}')">
              <i class="fa-solid fa-download"></i> Download
            </button>
            <button class="btn btn-danger btn-xs" onclick="deleteAssetExcel('${assetId}','${fid}',this.closest('div[style]'))">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

  } catch(e) {
    el.dataset.loaded = ''; // allow retry
    el.innerHTML = `<div style="color:var(--text3);font-size:12px;text-align:center;padding:20px">
      Could not load Excel files${e.message ? ': ' + e.message : ''}
      <br><button class="btn btn-ghost btn-xs" style="margin-top:8px" onclick="this.closest('[id]').dataset.loaded='';_loadExcelTab('${assetId}')">Retry</button>
    </div>`;
  }
}

// Download an Excel file with Authorization header (plain <a href> can't send it)
async function _downloadExcelAuthed(assetId, fileId, filename) {
  try {
    const url = `${API_BASE}/assets/${assetId}/excel/${fileId}`;
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + (localStorage.getItem('as_token') || '') } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const blob = await r.blob();
    const bUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = bUrl; a.download = filename || 'excel_file.xlsx';
    a.click();
    URL.revokeObjectURL(bUrl);
  } catch(e) {
    toast('Download failed: ' + e.message, 'fa-circle-xmark', true);
  }
}

// ── DOCUMENTS TAB ─────────────────────────────────────────────────────────────

async function _loadDocumentsTab(assetId) {
  const el = document.getElementById(`documents-content-${assetId}`);
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  el.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';

  const isAdmin = (getCurrentUser()?.role || '') === 'System Admin';

  try {
    const r     = await apiFetch(`/assets/${assetId}/documents`);
    const files = r.documents || r.files || r.data || r.results || [];

    if (!files.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--text3)">
          <i class="fa-solid fa-file-lines" style="font-size:28px;margin-bottom:10px;display:block;color:var(--border2)"></i>
          <div style="font-size:13px;color:var(--text2);margin-bottom:6px">No documents attached</div>
          <div style="font-size:11px;color:var(--text3)">Upload a PDF, Word document, or text file below.</div>
        </div>
        ${_documentUploadControls(assetId)}`;
      return;
    }

    const ICONS = {
      'application/pdf':    { icon: 'fa-file-pdf',   color: '#e05555' },
      'application/msword': { icon: 'fa-file-word',  color: '#2b5797' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                            { icon: 'fa-file-word',  color: '#2b5797' },
      'text/plain':         { icon: 'fa-file-lines', color: 'var(--text3)' },
    };

    el.innerHTML = files.map(f => {
      const fid   = _fileId(f);
      const name  = f.originalname || f.filename || f.name || 'Document';
      const mime  = f.contentType  || f.mimeType || '';
      const size  = f.length       || f.size     || 0;
      const date  = new Date(f.uploadDate || f.uploadedAt || Date.now()).toLocaleString('en-NG');
      const { icon, color } = ICONS[mime] || { icon: 'fa-file', color: 'var(--accent)' };

      const deleteBtn = isAdmin
        ? `<button class="btn btn-danger btn-xs" title="Delete document"
             onclick="deleteAssetDocument('${assetId}','${fid}',this.closest('div[data-doc]'))">
             <i class="fa-solid fa-trash"></i>
           </button>`
        : '';

      return `
        <div data-doc="${fid}" style="background:var(--surface2);border:1px solid var(--border);
             border-radius:8px;padding:14px;margin-bottom:10px;display:flex;
             align-items:center;gap:14px">
          <div style="flex-shrink:0;width:40px;height:40px;border-radius:8px;
               background:var(--surface3,var(--border));display:flex;
               align-items:center;justify-content:center">
            <i class="fa-solid ${icon}" style="font-size:18px;color:${color}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px;white-space:nowrap;
                 overflow:hidden;text-overflow:ellipsis" title="${escHtml(name)}">
              ${escHtml(name)}
            </div>
            <div style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;margin-top:2px">
              ${escHtml(mime||'—')}${size ? ' · ' + (size/1024).toFixed(1) + ' KB' : ''} · ${date}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-ghost btn-xs"
              onclick="previewFile('${assetId}','${fid}','${escHtml(name)}','${escHtml(mime)}','documents')">
              <i class="fa-solid fa-eye"></i> Preview
            </button>
            <button class="btn btn-secondary btn-xs"
              onclick="_downloadDocAuthed('${assetId}','${fid}','${escHtml(name)}')">
              <i class="fa-solid fa-download"></i> Download
            </button>
            ${deleteBtn}
          </div>
        </div>`;
    }).join('') + _documentUploadControls(assetId);

  } catch(e) {
    el.dataset.loaded = '';
    el.innerHTML = `<div style="color:var(--text3);font-size:12px;text-align:center;padding:20px">
      Could not load documents${e.message ? ': ' + e.message : ''}
      <br><button class="btn btn-ghost btn-xs" style="margin-top:8px"
        onclick="this.closest('[id]').dataset.loaded='';_loadDocumentsTab('${assetId}')">Retry</button>
    </div>`;
  }
}

function _documentUploadControls(assetId) {
  // Only roles that can edit assets can upload documents
  const canUpload = can('canEdit');
  if (!canUpload) return '';
  return `
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--accent);
           letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px">
        <i class="fa-solid fa-upload"></i> Attach Document
      </div>
      <label class="btn btn-secondary btn-sm" style="cursor:pointer">
        <i class="fa-solid fa-file-arrow-up"></i> Choose File (PDF, DOCX, TXT)
        <input type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
          style="display:none" onchange="uploadAssetDocument('${assetId}',this)">
      </label>
      <div style="font-size:10px;color:var(--text3);margin-top:6px">
        Accepted: PDF · Word (.doc, .docx) · Plain Text · RTF · ODT · max 20 MB
      </div>
    </div>`;
}

async function uploadAssetDocument(assetId, input) {
  const file = input.files?.[0];
  if (!file) return;

  // Replace input label with progress indicator
  const label = input.closest('label');
  if (label) {
    label.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px;
      display:inline-block;margin-right:6px"></div> Uploading…`;
  }

  try {
    await apiUploadDocument(assetId, file);
    toast('Document uploaded', 'fa-circle-check');
    addAudit('DOCUMENT_UPLOADED', assetId, null, file.name + ' attached');
    // Force reload of the tab
    const el = document.getElementById(`documents-content-${assetId}`);
    if (el) el.dataset.loaded = '';
    _loadDocumentsTab(assetId);
  } catch(e) {
    toast('Upload failed: ' + (e.message || 'error'), 'fa-circle-xmark', true);
    if (label) {
      label.innerHTML = `<i class="fa-solid fa-file-arrow-up"></i> Choose File
        <input type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
          style="display:none" onchange="uploadAssetDocument('${assetId}',this)">`;
    }
  }
}

async function _downloadDocAuthed(assetId, fileId, filename) {
  try {
    const url = `${API_BASE}/assets/${assetId}/documents/${fileId}`;
    const r   = await fetch(url, {
      headers: { Authorization: 'Bearer ' + (localStorage.getItem('as_token') || '') }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const blob = await r.blob();
    const bUrl = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = bUrl; a.download = filename || 'document';
    a.click();
    URL.revokeObjectURL(bUrl);
  } catch(e) {
    toast('Download failed: ' + e.message, 'fa-circle-xmark', true);
  }
}

async function deleteAssetDocument(assetId, fileId, cardEl) {
  if (!confirm('Delete this document? This cannot be undone.')) return;
  try {
    await apiFetch(`/assets/${assetId}/documents/${fileId}`, { method: 'DELETE' });
    cardEl?.remove();
    toast('Document deleted');
    addAudit('DOCUMENT_DELETED', assetId, null, 'Document removed');
  } catch(e) {
    toast('Delete failed: ' + e.message, 'fa-circle-xmark', true);
  }
}

async function loadExcelPreview(assetId, fileId) {
  const el = document.getElementById(`excel-preview-${fileId}`);
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="margin:8px auto"></div>';
  try {
    const r = await apiFetch(`/assets/${assetId}/excel/${fileId}?preview=true`);
    const rows = r.rows || r.preview || [];
    const headers = r.headers || (rows[0] ? Object.keys(rows[0]) : []);
    if (!rows.length) { el.textContent = 'No rows in preview'; return; }
    el.innerHTML = `<div style="overflow-x:auto;margin-top:8px"><table class="data-table" style="font-size:11px;white-space:nowrap">
      <thead><tr>${headers.map(h=>`<th>${escHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0,8).map(row=>`<tr>${headers.map(h=>`<td>${escHtml(String(row[h]||'—'))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>${rows.length>8?`<div style="font-size:10px;color:var(--text3);padding:6px">…and ${rows.length-8} more rows</div>`:''}</div>`;
  } catch {
    el.textContent = 'Could not load preview';
  }
}

async function deleteAssetExcel(assetId, fileId, cardEl) {
  if (!confirm('Remove this Excel file?')) return;
  try {
    await apiFetch(`/assets/${assetId}/excel/${fileId}`, { method:'DELETE' });
    cardEl?.remove();
    toast('Excel file removed');
  } catch(e) {
    toast('Could not delete: ' + e.message, 'fa-circle-xmark', true);
  }
}

// ── UNIVERSAL FILE PREVIEW ────────────────────────────────────────────────────
// Handles photos, PDFs, text, Excel, and Word documents in one function.

async function previewFile(assetId, fileId, filename, mimeType, segment) {
  const url = `${API_BASE}/assets/${assetId}/${segment}/${fileId}`;

  // Show a loading overlay while we fetch
  const overlay = document.createElement('div');
  overlay.id = 'file-preview-overlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10000;
    display:flex;flex-direction:column;align-items:center;justify-content:center`;
  overlay.innerHTML = `
    <div style="position:absolute;top:18px;right:22px;display:flex;gap:10px;align-items:center">
      <span style="color:rgba(255,255,255,.6);font-size:12px;max-width:300px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(filename)}</span>
      <button onclick="document.getElementById('file-preview-overlay').remove()"
        style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
          color:#fff;border-radius:50%;width:34px;height:34px;font-size:16px;
          cursor:pointer;display:flex;align-items:center;justify-content:center">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div id="fpo-body" style="width:92vw;max-width:900px;max-height:85vh;overflow:auto;
      display:flex;align-items:center;justify-content:center">
      <div class="spinner" style="width:32px;height:32px;border-width:3px"></div>
    </div>`;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);

  const body = document.getElementById('fpo-body');

  try {
    const r = await fetch(url, {
      headers: { Authorization: 'Bearer ' + (localStorage.getItem('as_token') || '') }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' — file not accessible');
    const blob = await r.blob();
    const mime  = mimeType || blob.type || '';
    const bUrl  = URL.createObjectURL(blob);

    // Clean up blob URL when overlay closes
    overlay.addEventListener('click', () => URL.revokeObjectURL(bUrl), { once: true });

    // ── IMAGE ──────────────────────────────────────────────────────────────────
    if (mime.startsWith('image/')) {
      body.innerHTML = `<img src="${bUrl}"
        style="max-width:100%;max-height:82vh;border-radius:6px;object-fit:contain">`;

    // ── PDF ────────────────────────────────────────────────────────────────────
    } else if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      body.style.cssText += ';width:92vw;max-width:960px;height:82vh;overflow:hidden;';
      body.innerHTML = `<iframe src="${bUrl}#toolbar=1"
        style="width:100%;height:82vh;border:none;border-radius:6px;background:#fff">
      </iframe>`;

    // ── PLAIN TEXT / CSV ───────────────────────────────────────────────────────
    } else if (mime.startsWith('text/') || filename.toLowerCase().endsWith('.txt')
            || filename.toLowerCase().endsWith('.csv')) {
      const text = await blob.text();
      if (filename.toLowerCase().endsWith('.csv')) {
        // Render CSV as a table
        const rows = text.trim().split('\n').map(l => l.split(','));
        const headers = rows[0];
        body.innerHTML = `
          <div style="overflow:auto;width:100%;max-height:78vh">
            <table style="border-collapse:collapse;font-size:12px;width:100%;background:#fff;
              border-radius:6px;overflow:hidden;color:#111">
              <thead style="background:#1a1a2e;color:#fff">
                <tr>${headers.map(h => `<th style="padding:8px 12px;text-align:left;
                  white-space:nowrap;border-right:1px solid rgba(255,255,255,.1)">${escHtml(h.trim())}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.slice(1, 201).map((row, i) => `
                  <tr style="background:${i%2===0?'#f8f9fa':'#fff'}">
                    ${row.map(c => `<td style="padding:6px 12px;border:1px solid #e8e8e8;
                      max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                      title="${escHtml(c.trim())}">${escHtml(c.trim())}</td>`).join('')}
                  </tr>`).join('')}
              </tbody>
            </table>
            ${rows.length > 201 ? `<div style="color:rgba(255,255,255,.5);font-size:11px;
              padding:8px;text-align:center">Showing first 200 of ${rows.length-1} rows</div>` : ''}
          </div>`;
      } else {
        body.innerHTML = `<pre style="background:var(--surface2,#1e2d26);color:#c8f0d8;
          padding:20px;border-radius:8px;font-size:12px;line-height:1.6;
          width:100%;max-height:78vh;overflow:auto;white-space:pre-wrap;
          word-break:break-word;font-family:'Space Mono',monospace">${escHtml(text.slice(0, 50000))}${text.length > 50000 ? '\n\n… (truncated)' : ''}</pre>`;
      }

    // ── EXCEL ─────────────────────────────────────────────────────────────────
    } else if (mime.includes('spreadsheet') || mime.includes('excel')
            || /\.(xlsx|xls|csv|ods)$/i.test(filename)) {
      if (typeof XLSX !== 'undefined') {
        const buf = await blob.arrayBuffer();
        // Try array type first (xlsx/ods/csv), fallback to binary string for legacy .xls
        let wb;
        try {
          wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true, raw: false });
        } catch {
          try {
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            wb = XLSX.read(binary, { type: 'binary', cellDates: true, raw: false });
          } catch(e2) { throw new Error('Could not parse spreadsheet: ' + e2.message); }
        }

        // Helper to render one sheet
        function renderSheet(wsName, visible) {
          const ws   = wb.Sheets[wsName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          const nonEmpty = data.filter(row => row.some(c => String(c).trim() !== ''));
          if (!nonEmpty.length) return `<div id="xl-${escHtml(wsName)}"
            style="${visible?'':'display:none'}padding:30px;text-align:center;
            color:#888;font-size:12px">This sheet is empty</div>`;
          const hdrs = nonEmpty[0];
          const rows = nonEmpty.slice(1, 501);
          return `<div id="xl-${escHtml(wsName)}" style="${visible?'':'display:none'}overflow-x:auto">
            <div style="font-size:10px;color:rgba(255,255,255,.35);padding:4px 0 8px;
              font-family:monospace">${escHtml(wsName)} · ${rows.length} rows shown
              ${nonEmpty.length>501?' (of '+(nonEmpty.length-1)+' total)':''}
            </div>
            <table style="border-collapse:collapse;font-size:12px;width:100%;background:#fff;
              color:#111;border-radius:6px;overflow:hidden">
              <thead style="background:#1d6f42;color:#fff;position:sticky;top:0">
                <tr>${hdrs.map(h=>`<th style="padding:8px 10px;text-align:left;white-space:nowrap;
                  border-right:1px solid rgba(255,255,255,.1);min-width:80px">${escHtml(String(h))}</th>`).join('')}</tr>
              </thead>
              <tbody>${rows.map((row,i)=>`<tr style="background:${i%2===0?'#f8f9fa':'#fff'}">
                ${hdrs.map((_,ci)=>`<td style="padding:6px 10px;border:1px solid #e8e8e8;
                  max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                  title="${escHtml(String(row[ci]??''))}">${escHtml(String(row[ci]??''))}</td>`).join('')}
              </tr>`).join('')}</tbody>
            </table>
          </div>`;
        }

        const tabs = wb.SheetNames.length > 1
          ? `<div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,.12);
               margin-bottom:10px;overflow-x:auto">
              ${wb.SheetNames.map((n,i)=>`<button
                onclick="this.parentElement.querySelectorAll('button').forEach(b=>{b.style.color='#888';b.style.borderBottomColor='transparent'});this.style.color='#1d6f42';this.style.borderBottomColor='#1d6f42';document.querySelectorAll('[id^=xl-]').forEach(d=>d.style.display='none');document.getElementById('xl-${escHtml(n)}').style.display=''"
                style="padding:4px 14px;border:none;border-bottom:2px solid ${i===0?'#1d6f42':'transparent'};
                background:none;cursor:pointer;font-size:11px;color:${i===0?'#1d6f42':'#888'};
                font-family:'Space Mono',monospace;white-space:nowrap">${escHtml(n)}</button>`).join('')}
             </div>` : '';

        body.innerHTML = `<div style="width:100%;max-height:82vh;display:flex;flex-direction:column">
          ${tabs}
          <div style="overflow:auto;flex:1">
            ${wb.SheetNames.map((n,i)=>renderSheet(n,i===0)).join('')}
          </div>
        </div>`;
      } else {
        body.innerHTML = `<div style="text-align:center;color:#fff;padding:40px">
          <i class="fa-solid fa-file-excel" style="font-size:48px;color:#1d6f42;margin-bottom:16px;display:block"></i>
          <div style="font-size:14px;margin-bottom:16px">SheetJS library not loaded.</div>
          <button class="btn btn-primary" onclick="_downloadExcelAuthed('${assetId}','${fileId}','${escHtml(filename)}');document.getElementById('file-preview-overlay').remove()">
            <i class="fa-solid fa-download"></i> Download Instead
          </button>
        </div>`;
      }

    // ── WORD DOCUMENT ─────────────────────────────────────────────────────────
    } else if (mime.includes('word') || mime.includes('msword')
            || /\.(docx|doc)$/i.test(filename)) {
      if (typeof mammoth !== 'undefined') {
        const buf    = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        body.innerHTML = `<div style="background:#fff;color:#111;padding:32px;border-radius:8px;
          width:100%;max-height:78vh;overflow:auto;font-family:Georgia,serif;
          font-size:14px;line-height:1.7">
          ${result.value}
        </div>`;
      } else {
        body.innerHTML = `<div style="text-align:center;color:#fff;padding:40px">
          <i class="fa-solid fa-file-word" style="font-size:48px;color:#2b5797;margin-bottom:16px;display:block"></i>
          <div style="font-size:14px;margin-bottom:8px">${escHtml(filename)}</div>
          <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:20px">
            Word documents require the Mammoth.js library to preview in-browser.
          </div>
          <button class="btn btn-primary" onclick="_downloadDocAuthed('${assetId}','${fileId}','${escHtml(filename)}');document.getElementById('file-preview-overlay').remove()">
            <i class="fa-solid fa-download"></i> Download to View
          </button>
        </div>`;
      }

    // ── UNKNOWN / UNSUPPORTED ─────────────────────────────────────────────────
    } else {
      body.innerHTML = `<div style="text-align:center;color:#fff;padding:40px">
        <i class="fa-solid fa-file" style="font-size:48px;color:var(--accent);margin-bottom:16px;display:block"></i>
        <div style="font-size:14px;margin-bottom:8px">${escHtml(filename)}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:20px">
          Preview not available for this file type (${escHtml(mime||'unknown')}).
        </div>
        <button class="btn btn-primary" onclick="_downloadDocAuthed('${assetId}','${fileId}','${escHtml(filename)}');document.getElementById('file-preview-overlay').remove()">
          <i class="fa-solid fa-download"></i> Download to View
        </button>
      </div>`;
    }

  } catch(e) {
    body.innerHTML = `<div style="text-align:center;color:#fff;padding:40px">
      <i class="fa-solid fa-circle-exclamation" style="font-size:40px;color:var(--danger);margin-bottom:14px;display:block"></i>
      <div style="font-size:13px;color:rgba(255,255,255,.7)">${escHtml(e.message)}</div>
    </div>`;
  }
}
function _buildValuationTab(a) {
  const v = a.valuation || {};
  return `<div>
    ${v.amount ? `<div style="background:var(--accent3);border:1px solid rgba(0,200,100,.2);border-radius:8px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
      <i class="fa-solid fa-naira-sign" style="color:var(--accent);font-size:18px"></i>
      <div><div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Current Valuation</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent)">₦${Number(v.amount).toLocaleString()}</div>
        <div style="font-size:11px;color:var(--text3)">${escHtml(v.method||'—')} · ${escHtml(v.valuedAt?.slice(0,10)||v.valuationDate||'—')}</div>
      </div>
    </div>` : ''}

    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px">
      <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:12px">Set / Update Valuation</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Amount (₦) *</label>
          <input class="form-control" id="val-amount-${a.assetId||a.id}" type="number" placeholder="e.g. 5000000" value="${v.amount||''}"></div>
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Valuation Method</label>
          <select class="form-control" id="val-method-${a.assetId||a.id}">
            ${['Market Value','Replacement Cost','Income Approach','Book Value','Professional Estimate'].map(m=>`<option ${v.method===m?'selected':''}>${m}</option>`).join('')}
          </select></div>
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Valuation Date</label>
          <input class="form-control" id="val-date-${a.assetId||a.id}" type="date" value="${v.valuedAt?.slice(0,10)||v.valuationDate||new Date().toISOString().split('T')[0]}"></div>
        <div><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Valued By</label>
          <input class="form-control" id="val-by-${a.assetId||a.id}" placeholder="Name of valuer" value="${escHtml(v.valuedBy||'')}"></div>
        <div style="grid-column:1/-1"><label style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);display:block;margin-bottom:4px;text-transform:uppercase">Notes</label>
          <input class="form-control" id="val-notes-${a.assetId||a.id}" placeholder="Optional notes" value="${escHtml(v.notes||'')}"></div>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="saveValuation('${a.assetId||a.id}')">
        <i class="fa-solid fa-floppy-disk"></i> Save Valuation
      </button>
    </div>
  </div>`;
}

async function saveValuation(assetId) {
  const amount  = parseFloat(document.getElementById(`val-amount-${assetId}`)?.value);
  const method  = document.getElementById(`val-method-${assetId}`)?.value;
  const date    = document.getElementById(`val-date-${assetId}`)?.value;
  const valuedBy= document.getElementById(`val-by-${assetId}`)?.value;
  const notes   = document.getElementById(`val-notes-${assetId}`)?.value;
  if (!amount || isNaN(amount)) { toast('Enter a valid amount', 'fa-triangle-exclamation', true); return; }

  const data = { amount, method, valuedAt: date, valuationDate: date, valuedBy, notes };
  try {
    await apiUpdateValuation(assetId, data);
    toast(`Valuation set: ₦${amount.toLocaleString()}`);
  } catch {
    const a = assets.find(x=>(x.assetId||x.id)===assetId);
    if (a) { a.valuation = data; saveLocal(); }
    toast('Saved locally');
  }
  addAudit('VALUATION_UPDATED', assetId, null, `₦${amount.toLocaleString()} via ${method}`);
}

// ── QR CODE ───────────────────────────────────────────────────────────────────
let _qrAssetId = null;
let _qrAsset   = null;

function openQRModal(assetId) {
  _qrAssetId = assetId;
  _qrAsset   = assets.find(x => (x.assetId||x.id) === assetId) || { id: assetId };

  const qrData = JSON.stringify({
    id:   _qrAsset.assetId || _qrAsset.id,
    name: _qrAsset.name,
    type: _qrAsset.type,
    lat:  _qrAsset.lat || _qrAsset.location?.coordinates?.[1],
    lng:  _qrAsset.lng || _qrAsset.location?.coordinates?.[0],
    app:  'AssetSpatial',
    url:  `${location.origin}/assets.html?id=${assetId}`,
  });

  // Build QR modal
  const overlay = document.createElement('div');
  overlay.id = 'qr-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border2);border-radius:14px;padding:28px;text-align:center;width:320px;max-width:95vw;box-shadow:0 24px 80px rgba(0,0,0,.5)">
      <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;margin-bottom:4px">${escHtml(_qrAsset.name||assetId)}</div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3);margin-bottom:16px">${escHtml(assetId)}</div>
      <canvas id="qr-canvas" width="200" height="200" style="border:4px solid #fff;border-radius:8px;margin-bottom:16px"></canvas>
      <div style="font-size:11px;color:var(--text3);margin-bottom:18px">Scan to open asset record</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="downloadQR()"><i class="fa-solid fa-download"></i> Download</button>
        <button class="btn btn-secondary btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('qr-overlay').remove()"><i class="fa-solid fa-xmark"></i> Close</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  // Draw QR
  const canvas = document.getElementById('qr-canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,200,200);

  if (window.QRCode) {
    const tmp = document.createElement('div');
    tmp.style.display = 'none';
    document.body.appendChild(tmp);
    try {
      new QRCode(tmp, { text: qrData, width:200, height:200, colorDark:'#000', colorLight:'#fff', correctLevel: QRCode.CorrectLevel.M });
      setTimeout(() => {
        const img = tmp.querySelector('img') || tmp.querySelector('canvas');
        if (img?.tagName === 'CANVAS') {
          ctx.drawImage(img, 0, 0, 200, 200);
        } else if (img) {
          const i = new Image(); i.onload = ()=>ctx.drawImage(i,0,0,200,200); i.src=img.src;
        }
        tmp.remove();
      }, 150);
    } catch { tmp.remove(); _drawQRFallback(ctx, assetId); }
  } else {
    _drawQRFallback(ctx, assetId);
  }
}

function _drawQRFallback(ctx, assetId) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,200,200);
  ctx.fillStyle = '#0f2e1c';
  ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
  ctx.fillText('AssetSpatial', 100, 80);
  ctx.font = '11px monospace';
  ctx.fillText(assetId, 100, 100);
  ctx.font = '9px monospace'; ctx.fillStyle = '#4a6b5a';
  ctx.fillText('Install qrcode.min.js', 100, 125);
  ctx.fillText('for real QR code', 100, 140);
}

function downloadQR() {
  const canvas = document.getElementById('qr-canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = `QR_${_qrAssetId||'asset'}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('QR code downloaded');
}

// ── INSPECTION ALERTS (dashboard) ─────────────────────────────────────────────
async function renderInspectionAlerts() {
  const panel = document.getElementById('inspection-alerts-panel');
  if (!panel) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const soon  = new Date(today); soon.setDate(soon.getDate() + 7);

  let allAssets = assets;
  try { const r = await apiGetAssets({ limit:500 }); allAssets = r.assets || assets; } catch {}

  const alertAssets = allAssets.filter(a => {
    if (!a.nextInspection) return false;
    const d = new Date(a.nextInspection); d.setHours(0,0,0,0);
    return d <= soon;
  }).sort((a,b) => new Date(a.nextInspection) - new Date(b.nextInspection));

  if (!alertAssets.length) { panel.style.display='none'; return; }
  panel.style.display = 'block';

  const overdue = alertAssets.filter(a => new Date(a.nextInspection) < today).length;
  const countEl = document.getElementById('inspection-alert-count');
  if (countEl) countEl.textContent = `${overdue} overdue · ${alertAssets.length - overdue} due within 7 days`;

  window._assetMap = window._assetMap || {};
  alertAssets.forEach(a => { window._assetMap[a.assetId || a.id] = a; });

  const tbody = document.getElementById('inspection-alerts-tbody');
  if (tbody) tbody.innerHTML = alertAssets.map(a => {
    const id = a.assetId || a.id;
    const d = new Date(a.nextInspection); d.setHours(0,0,0,0);
    const daysLeft = Math.round((d - today) / 86400000);
    const isOverdue = daysLeft < 0;
    return `<tr style="${isOverdue?'background:rgba(224,85,85,.04)':''}">
      <td><strong>${escHtml(a.name||id)}</strong></td>
      <td><span class="tag ${typeColor(a.type)}">${escHtml(a.type||'—')}</span></td>
      <td style="font-family:'Space Mono',monospace;font-size:11px">${escHtml(a.nextInspection)}</td>
      <td><span class="tag ${isOverdue?'tag-red':'tag-warn'}">${isOverdue?`<i class="fa-solid fa-circle-xmark"></i> OVERDUE ${Math.abs(daysLeft)}d`:`<i class="fa-solid fa-clock"></i> ${daysLeft}d`}</span></td>
      <td><button class="btn btn-primary btn-sm" onclick="showAssetDetail(window._assetMap['${id}'])"><i class="fa-solid fa-pen"></i> Action</button></td>
    </tr>`;
  }).join('');
}