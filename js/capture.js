// ── FIELD CAPTURE ─────────────────────────────────────────────────────────────

const TYPE_FIELDS = {
  'Infrastructure': [
    { label:'Subtype',          id:'ts-infra-sub',  type:'select', opts:['Bridge','Road','Dam','Building','Culvert','Retaining Wall','Fence'] },
    { label:'Age (years)',      id:'ts-infra-age',  type:'number', ph:'e.g. 15' },
    { label:'Span / Length (m)',id:'ts-infra-span', type:'number', ph:'e.g. 40' },
    { label:'Load Capacity (T)',id:'ts-infra-load', type:'number', ph:'e.g. 80' },
    { label:'Last Inspection',  id:'ts-infra-insp', type:'date' },
    { label:'Owner Authority',  id:'ts-infra-own',  type:'text',   ph:'e.g. FCDA / FMWH' },
  ],
  'Land / Property': [
    { label:'Title Number',     id:'ts-land-title', type:'text',   ph:'e.g. LO2834/2024' },
    { label:'Plot Size (m²)',   id:'ts-land-size',  type:'number', ph:'e.g. 1450' },
    { label:'Land Use',         id:'ts-land-use',   type:'select', opts:['Residential','Commercial','Industrial','Agricultural','Government','Mixed'] },
    { label:'Registered Owner', id:'ts-land-own',   type:'text',   ph:'Name of legal owner' },
    { label:'Survey Number',    id:'ts-land-surv',  type:'text',   ph:'e.g. SV-2024-0012' },
  ],
  'Utility': [
    { label:'Subtype',          id:'ts-util-sub',   type:'select', opts:['Water','Electricity','Gas','Telecoms','Sewerage','Irrigation'] },
    { label:'Capacity',         id:'ts-util-cap',   type:'text',   ph:'e.g. 5000 kVA' },
    { label:'Voltage / Pressure',id:'ts-util-volt', type:'text',   ph:'e.g. 33kV / 5 bar' },
    { label:'Provider / Agency',id:'ts-util-prov',  type:'text',   ph:'e.g. AEDC, FMWR' },
    { label:'Install Year',     id:'ts-util-year',  type:'number', ph:'e.g. 2012' },
    { label:'Operational Status',id:'ts-util-op',   type:'select', opts:['Operational','Partially Operational','Non-operational','Under Construction','Decommissioned'] },
  ],
  'Environmental': [
    { label:'Category',         id:'ts-env-cat',    type:'select', opts:['Wetland','Forest','Erosion Site','Flood Plain','Protected Area','Waste Site','Game Reserve'] },
    { label:'Protected Status', id:'ts-env-prot',   type:'select', opts:['Protected','Partially Protected','Unprotected','Proposed'] },
    { label:'Key Species',      id:'ts-env-spec',   type:'text',   ph:'e.g. Savanna elephant, Mahogany' },
    { label:'Risk Level',       id:'ts-env-risk',   type:'select', opts:['Low','Medium','High','Critical'] },
    { label:'Responsible Agency',id:'ts-env-agcy',  type:'text',   ph:'e.g. NESREA, Forestry Commission' },
  ],
  'Equipment': [
    { label:'Make / Brand',     id:'ts-eq-make',    type:'text',   ph:'e.g. Caterpillar' },
    { label:'Model',            id:'ts-eq-model',   type:'text',   ph:'e.g. 320D' },
    { label:'Serial Number',    id:'ts-eq-serial',  type:'text',   ph:'SN-XXXX' },
    { label:'Manufacture Year', id:'ts-eq-year',    type:'number', ph:'e.g. 2019' },
    { label:'Power / Output',   id:'ts-eq-power',   type:'text',   ph:'e.g. 150kW' },
    { label:'Next Maintenance', id:'ts-eq-next',    type:'date' },
  ],
  'Monument': [
    { label:'Monument Type',    id:'ts-mon-type',   type:'select', opts:['War Memorial','Statue','Heritage Site','Plaque','Cultural Site','Historical Building','National Park Feature'] },
    { label:'Year Erected',     id:'ts-mon-year',   type:'number', ph:'e.g. 1960' },
    { label:'Dedicated To',     id:'ts-mon-ded',    type:'text',   ph:'Person, event or occasion' },
    { label:'Heritage Status',  id:'ts-mon-her',    type:'select', opts:['National Heritage','State Heritage','Local Heritage','Proposed','Undesignated'] },
    { label:'Managing Authority',id:'ts-mon-auth',  type:'text',   ph:'e.g. NCMM, NICON' },
    { label:'Public Access',    id:'ts-mon-acc',    type:'select', opts:['Open','Restricted','Closed','Seasonal'] },
  ],
};

async function initCaptureForm() {
  const dateEl = document.getElementById('cap-date');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
  const idEl = document.getElementById('cap-id');
  if (idEl) idEl.value = 'AST-' + (assetCounter + 1);

  // Populate MDA dropdown
  await populateMdaSelect('cap-mda');

  // Wire up live code preview on field changes
  ['cap-mda', 'cap-type', 'cap-state', 'cap-date'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateCodePreview);
  });
  updateCodePreview();

  // Check for OCR suggestions from scanner
  const sugg = sessionStorage.getItem('ocr_suggestions');
  if (sugg) {
    try {
      const s = JSON.parse(sugg);
      if (s.name  && document.getElementById('cap-name'))  document.getElementById('cap-name').value  = s.name;
      if (s.state && document.getElementById('cap-state')) document.getElementById('cap-state').value = s.state;
      if (s.coordinates) {
        const [lng, lat] = s.coordinates;
        document.getElementById('cap-lat').value = lat;
        document.getElementById('cap-lng').value = lng;
        document.getElementById('gps-display').textContent = lat.toFixed(5)+'°N, '+lng.toFixed(5)+'°E';
      }
      sessionStorage.removeItem('ocr_suggestions');
      toast('Capture form pre-filled from OCR scan');
    } catch {}
  }

  loadRecentCaptures();
}

// ── Live asset code preview ────────────────────────────────────────────────────
function updateCodePreview() {
  const previewEl = document.getElementById('cap-code-preview');
  if (!previewEl) return;

  const mda   = document.getElementById('cap-mda')?.value   || '';
  const type  = document.getElementById('cap-type')?.value  || '';
  const state = document.getElementById('cap-state')?.value || '';
  const date  = document.getElementById('cap-date')?.value  || '';

  if (!mda && !type && !state) {
    previewEl.textContent = 'Fill MDA, Type and State to preview code…';
    previewEl.style.color = 'var(--text3)';
    return;
  }

  // Use AssetCodeIndex if available (loaded as a script), else build manually
  let code;
  if (window.AssetCodeIndex) {
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    code = window.AssetCodeIndex.buildAssetCode({ mda, type, state, year, seq: 'XXXX' });
  } else {
    const typeMap = { 'Infrastructure':'INF','Land / Property':'LND','Utility':'UTL',
                      'Environmental':'ENV','Equipment':'EQP','Monument':'MON' };
    const branchMap = { 'FCT':'001','Abia':'002','Adamawa':'003','Akwa Ibom':'004','Anambra':'005',
      'Bauchi':'006','Bayelsa':'007','Benue':'008','Borno':'009','Cross River':'010','Delta':'011',
      'Ebonyi':'012','Edo':'013','Ekiti':'014','Enugu':'015','Gombe':'016','Imo':'017','Jigawa':'018',
      'Kaduna':'019','Kano':'020','Katsina':'021','Kebbi':'022','Kogi':'023','Kwara':'024','Lagos':'025',
      'Nasarawa':'026','Niger':'027','Ogun':'028','Ondo':'029','Osun':'030','Oyo':'031','Plateau':'032',
      'Rivers':'033','Sokoto':'034','Taraba':'035','Yobe':'036','Zamfara':'037' };
    const mdaCode  = mda ? mda.replace(/Federal Ministry of|Ministry of|Department of/gi,'').trim()
                              .split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,6) || 'FGN' : 'FGN';
    const typeCode = typeMap[type] || 'UNK';
    const branch   = branchMap[state] || '000';
    const year     = date ? new Date(date).getFullYear() : new Date().getFullYear();
    code = `FGN-${mdaCode}-${typeCode}-${branch}-${year}-XXXX`;
  }

  const isHQ = code.includes('-001-');
  previewEl.textContent = code;
  previewEl.style.color = isHQ ? 'var(--success)' : 'var(--blue)';
  const hqBadge = document.getElementById('cap-code-hq-badge');
  if (hqBadge) hqBadge.style.display = isHQ ? '' : 'none';
  previewEl.title = isHQ ? '✓ HQ Asset — branch 001 indicates a headquarters asset' : '';
}

function renderTypeFields() {
  const type  = document.getElementById('cap-type')?.value;
  const wrap  = document.getElementById('type-specific-wrap');
  const inner = document.getElementById('type-fields-inner');
  const label = document.getElementById('type-fields-label');

  if (!type || !TYPE_FIELDS[type]) { if (wrap) wrap.style.display='none'; return; }
  if (label) label.textContent = type.toUpperCase() + ' — SPECIFIC FIELDS';
  if (inner) inner.innerHTML = TYPE_FIELDS[type].map(f => {
    let input;
    if (f.type === 'select') input = `<select class="form-control" id="${f.id}">${f.opts.map(o=>`<option>${o}</option>`).join('')}</select>`;
    else input = `<input class="form-control" id="${f.id}" type="${f.type}" placeholder="${f.ph||''}">`;
    return `<div class="form-group"><label class="form-label">${f.label}</label>${input}</div>`;
  }).join('');
  if (wrap) wrap.style.display='block';
}

// alias (used in capture.html)
const onTypeChange = renderTypeFields;

function getTypeSpecificValues() {
  const type = document.getElementById('cap-type')?.value;
  if (!type || !TYPE_FIELDS[type]) return {};
  const out = {};
  TYPE_FIELDS[type].forEach(f => {
    const el = document.getElementById(f.id);
    if (el && el.value) out[f.label] = el.value;
  });
  return out;
}

let _gpsPreviewMap = null;
let _gpsPreviewMarker = null;

function captureGPS() {
  const btn = document.getElementById('gps-btn');
  if (!navigator.geolocation) { toast('Geolocation not supported by this browser', 'fa-triangle-exclamation', true); return; }
  if (btn) { btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Locating…'; btn.disabled=true; }
  document.getElementById('gps-display').textContent = 'Acquiring GPS…';
  document.getElementById('gps-accuracy').textContent = '';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;

      document.getElementById('cap-lat').value = lat.toFixed(6);
      document.getElementById('cap-lng').value = lng.toFixed(6);
      document.getElementById('gps-display').textContent = lat.toFixed(5)+'°N, '+lng.toFixed(5)+'°E';
      document.getElementById('gps-accuracy').textContent = '±'+Math.round(acc)+'m';

      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Captured';
        btn.className = 'btn btn-success btn-sm';
        btn.disabled  = false;
      }
      toast('GPS captured: '+lat.toFixed(5)+', '+lng.toFixed(5));

      // Update preview map
      const previewEl = document.getElementById('preview-map');
      const coordLabel = document.getElementById('preview-coords-label');
      if (coordLabel) coordLabel.textContent = lat.toFixed(5)+'°N, '+lng.toFixed(5)+'°E';
      if (previewEl && window.L) {
        if (!_gpsPreviewMap) {
          _gpsPreviewMap = L.map(previewEl, { zoomControl:false, dragging:false }).setView([lat,lng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(_gpsPreviewMap);
        } else {
          _gpsPreviewMap.setView([lat,lng], 15);
        }
        if (_gpsPreviewMarker) _gpsPreviewMarker.remove();
        _gpsPreviewMarker = L.circleMarker([lat,lng], { radius:8, color:'#00c864', fillColor:'#00c864', fillOpacity:.7, weight:2 }).addTo(_gpsPreviewMap);
      }
    },
    err => {
      document.getElementById('gps-display').textContent = 'Failed to get location';
      if (btn) { btn.innerHTML='<i class="fa-solid fa-satellite-dish"></i> Capture GPS'; btn.disabled=false; }
      toast('GPS error: '+err.message, 'fa-triangle-exclamation', true);
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}

// alias
const simulateGPS = captureGPS;

let _pendingPhotoFiles = [];

function handlePhotoFiles(files) {
  _pendingPhotoFiles = [...files];
  const preview = document.getElementById('photo-preview');
  if (!preview) return;
  preview.innerHTML = '';
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image')) return;
    const url = URL.createObjectURL(file);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:90px;height:90px;border-radius:8px;overflow:hidden;border:1px solid var(--border);flex-shrink:0;background:var(--bg)';
    const img = document.createElement('img');
    img.src=url; img.style.cssText='width:100%;height:100%;object-fit:cover;display:block';
    const del = document.createElement('button');
    del.innerHTML='<i class="fa-solid fa-xmark" style="font-size:9px"></i>';
    del.style.cssText='position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s';
    wrap.addEventListener('mouseenter',()=>del.style.opacity='1');
    wrap.addEventListener('mouseleave',()=>del.style.opacity='0');
    del.addEventListener('click',()=>{ wrap.remove(); });
    wrap.appendChild(img); wrap.appendChild(del);
    preview.appendChild(wrap);
  });
}

async function submitCapture() {
  const name     = document.getElementById('cap-name')?.value.trim();
  const type     = document.getElementById('cap-type')?.value;
  const lat      = parseFloat(document.getElementById('cap-lat')?.value);
  const lng      = parseFloat(document.getElementById('cap-lng')?.value);
  const cond     = document.getElementById('cap-cond')?.value || 'Good';
  const geomType = document.getElementById('cap-geom')?.value || 'Point';

  if (!name) { toast('Asset name is required', 'fa-triangle-exclamation', true); document.getElementById('cap-name')?.focus(); return; }
  if (!type) { toast('Asset type is required', 'fa-triangle-exclamation', true); document.getElementById('cap-type')?.focus(); return; }
  if (isNaN(lat) || isNaN(lng)) { toast('Please capture GPS coordinates first', 'fa-satellite-dish', true); return; }

  const typeData = getTypeSpecificValues();
  const payload = {
    name, type, geomType, condition: cond,
    coordinates:      [lng, lat],
    sector:           document.getElementById('cap-sector')?.value || '',
    assessed:         document.getElementById('cap-assessed')?.value || 'Assessed',
    mda:              document.getElementById('cap-mda')?.value || '',
    material:         document.getElementById('cap-material')?.value || '',
    state:            document.getElementById('cap-state')?.value || '',
    lga:              document.getElementById('cap-lga')?.value || '',
    address:          document.getElementById('cap-address')?.value || '',
    notes:            document.getElementById('cap-notes')?.value || '',
    captureDate:      document.getElementById('cap-date')?.value || new Date().toISOString().split('T')[0],
    installDate:      document.getElementById('cap-install-date')?.value || '',
    nextInspection:   document.getElementById('cap-next-inspection')?.value || '',
    typeData,
  };

  const btn = document.getElementById('submit-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

  let savedId = null;
  try {
    const r = await apiCreateAsset(payload);
    const saved = r.asset || {};
    savedId = saved.assetId;
    assets.unshift({ ...saved, id:saved.assetId, lat, lng, geom:geomType, ts:Date.now() });
    addAudit('ASSET_CREATED', saved.assetId, null, name+' captured at '+lat.toFixed(5)+', '+lng.toFixed(5));
    toast(`Asset ${saved.assetId} captured and saved`);

    // Upload pending photos
    if (_pendingPhotoFiles.length && savedId) {
      for (const f of _pendingPhotoFiles) {
        try { await apiUploadPhoto(savedId, f); } catch {}
      }
    }
  } catch {
    assetCounter++;
    const a = { id:'AST-'+assetCounter, assetId:'AST-'+assetCounter, name, type, geomType, lat, lng, condition:cond, typeData, ts:Date.now(), ...payload };
    assets.unshift(a);
    saveLocal();
    addAudit('ASSET_CREATED', a.id, null, name+' saved locally');
    toast('Asset saved locally — will sync when online');
    savedId = a.id;
  }

  clearForm();
  loadRecentCaptures();
  if (btn) { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Submit Capture'; }
}

// alias
const captureAsset = submitCapture;

function clearForm() {
  ['cap-name','cap-material','cap-state','cap-lga','cap-address','cap-notes',
   'cap-lat','cap-lng','cap-sector','cap-area','cap-elev'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const mdaEl  = document.getElementById('cap-mda');  if (mdaEl)  mdaEl.value  = '';
  const typeEl = document.getElementById('cap-type'); if (typeEl) typeEl.value = '';
  const geomEl = document.getElementById('cap-geom'); if (geomEl) geomEl.value = 'Point';
  const condEl = document.getElementById('cap-cond'); if (condEl) condEl.value = 'Good';
  // Reset assessment toggle
  const assEl  = document.getElementById('cap-assessed'); if (assEl) assEl.value = 'Assessed';
  if (typeof setAssessment === 'function') setAssessment('Assessed');
  const dispEl = document.getElementById('gps-display');  if (dispEl) dispEl.textContent = 'No coordinates captured';
  const accEl  = document.getElementById('gps-accuracy'); if (accEl)  accEl.textContent  = '';
  const idEl   = document.getElementById('cap-id');       if (idEl)   idEl.value         = 'AST-' + (assetCounter + 1);
  const wrap   = document.getElementById('type-specific-wrap'); if (wrap) wrap.style.display = 'none';
  const btn    = document.getElementById('gps-btn');
  if (btn) { btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Capture GPS'; btn.disabled = false; btn.className = 'btn btn-gps btn-sm'; }
  const preview = document.getElementById('photo-preview'); if (preview) preview.innerHTML = '';
  const coordLabel = document.getElementById('preview-coords-label'); if (coordLabel) coordLabel.textContent = 'No coordinates captured';
  _pendingPhotoFiles = [];
}

// alias
const clearCaptureForm = clearForm;

function loadRecentCaptures() {
  const tbody = document.getElementById('recent-captures');
  if (!tbody) return;
  const rows = [...assets].slice(0,6);
  tbody.innerHTML = rows.length
    ? rows.map(a=>`<tr>
        <td style="font-weight:500;font-size:13px">${escHtml(a.name||a.assetId||a.id)}</td>
        <td><span class="tag ${typeColor(a.type)}">${escHtml(a.type||'—')}</span></td>
        <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">${timeAgo(a.ts||Date.now())}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="color:var(--text3);padding:16px;text-align:center;font-size:12px">No recent captures</td></tr>';
}

// alias used by app.js
const renderCaptureRecent = loadRecentCaptures;
const initCapturePage     = initCaptureForm;