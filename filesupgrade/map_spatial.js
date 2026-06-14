// ── MAP SPATIAL TOOLS: Polygon Selection + Heatmap + Condition Layer ──────────
// Adds to existing map.js without modifying it.
// Requires Leaflet.draw to be loaded (added to map.html).

let _drawControl    = null;
let _drawnItems     = null;
let _selectionLayer = null;
let _heatLayer      = null;
let _heatActive     = false;
let _mapAllAssets   = [];

// ── INIT: called once map is ready ───────────────────────────────────────────
function initSpatialTools() {
  if (!window.L || !leafletMap) return;

  // Feature group to hold drawn shapes
  _drawnItems = new L.FeatureGroup().addTo(leafletMap);

  // Draw control (polygon + rectangle)
  if (window.L.Control && window.L.Control.Draw) {
    _drawControl = new L.Control.Draw({
      draw: {
        polygon:   { shapeOptions: { color: '#4A90D9', weight: 2, fillOpacity: 0.1 } },
        rectangle: { shapeOptions: { color: '#4A90D9', weight: 2, fillOpacity: 0.1 } },
        circle: false, marker: false, polyline: false, circlemarker: false,
      },
      edit: { featureGroup: _drawnItems, remove: true },
    });
    leafletMap.addControl(_drawControl);

    leafletMap.on(L.Draw.Event.CREATED, e => {
      _drawnItems.clearLayers();
      _drawnItems.addLayer(e.layer);
      _runPolygonSelection(e.layer);
    });
    leafletMap.on(L.Draw.Event.DELETED, () => {
      _clearPolygonResults();
    });
  }

  // Load all assets once for spatial tools
  _loadAllAssetsForSpatial();

  // Inject toolbar buttons into map controls bar
  _injectSpatialToolbar();
}

async function _loadAllAssetsForSpatial() {
  try {
    const r = await apiGetAssets({ limit: 5000 });
    _mapAllAssets = r.assets || [];
  } catch {
    _mapAllAssets = assets || [];
  }
}

function _injectSpatialToolbar() {
  const existing = document.getElementById('spatial-toolbar');
  if (existing) return;

  // Find the map toolbar to append to
  const toolbar = document.querySelector('.map-toolbar') || document.getElementById('map-controls');
  if (!toolbar) return;

  const div = document.createElement('div');
  div.id = 'spatial-toolbar';
  div.style.cssText = 'display:flex;gap:6px;align-items:center';
  div.innerHTML = `
    <div style="width:1px;height:20px;background:var(--border);margin:0 4px"></div>
    <button class="btn btn-secondary btn-sm" id="btn-heatmap" onclick="toggleHeatmap()" title="Toggle condition heatmap">
      <i class="fa-solid fa-fire"></i> Heatmap
    </button>
    <button class="btn btn-secondary btn-sm" onclick="clearPolygonSelection()" title="Clear drawn shapes">
      <i class="fa-solid fa-xmark"></i> Clear Selection
    </button>
    <button class="btn btn-secondary btn-sm" onclick="generateMdaReport(document.getElementById('map-filter-mda')?.value||'')" title="MDA report for current filter">
      <i class="fa-solid fa-file-lines"></i> MDA Report
    </button>`;
  toolbar.appendChild(div);
}

// ── POLYGON SELECTION ─────────────────────────────────────────────────────────
function _runPolygonSelection(layer) {
  if (!_mapAllAssets.length) { _loadAllAssetsForSpatial().then(() => _runPolygonSelection(layer)); return; }

  const bounds = layer instanceof L.Rectangle
    ? layer.getBounds()
    : null;

  const geojson = layer.toGeoJSON();
  const selected = _mapAllAssets.filter(a => {
    const lat = a.lat || a.location?.coordinates?.[1];
    const lng = a.lng || a.location?.coordinates?.[0];
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return false;
    const pt = L.latLng(lat, lng);
    if (bounds) return bounds.contains(pt);
    // Point-in-polygon for arbitrary shapes
    return _pointInGeoJSON([lng, lat], geojson.geometry);
  });

  _showSelectionResults(selected);
}

function _pointInGeoJSON(point, geometry) {
  if (geometry.type !== 'Polygon') return false;
  return _pointInPolygon(point, geometry.coordinates[0]);
}

function _pointInPolygon([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function _showSelectionResults(selected) {
  // Remove old results layer
  if (_selectionLayer) { _selectionLayer.remove(); _selectionLayer = null; }

  // Highlight selected assets
  _selectionLayer = L.layerGroup();
  selected.forEach(a => {
    const lat = a.lat || a.location?.coordinates?.[1];
    const lng = a.lng || a.location?.coordinates?.[0];
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;background:#4A90D9;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(74,144,217,.8)"></div>`,
      iconSize:[18,18], iconAnchor:[9,9],
    });
    L.marker([lat, lng], { icon })
      .bindPopup(`<b>${escHtml(a.name||a.assetId)}</b><br><span style="font-size:11px">${a.type} · ${a.condition||'Unassessed'}</span>`)
      .addTo(_selectionLayer);
  });
  _selectionLayer.addTo(leafletMap);

  // Show results panel
  _showSelectionPanel(selected);
}

function _showSelectionPanel(selected) {
  let panel = document.getElementById('map-selection-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'map-selection-panel';
    panel.style.cssText = `position:absolute;bottom:40px;left:50%;transform:translateX(-50%);
      background:var(--surface,#1a2e25);border:1px solid var(--border2,#2a4a38);
      border-radius:12px;padding:16px 20px;z-index:1000;min-width:320px;max-width:90vw;
      box-shadow:0 8px 32px rgba(0,0,0,.4);font-family:'Space Grotesk',sans-serif`;
    document.getElementById('leaflet-map')?.parentElement?.appendChild(panel);
  }

  if (!selected.length) {
    panel.innerHTML = `<div style="text-align:center;color:var(--text3,#8aab96);font-size:13px">
      <i class="fa-solid fa-location-slash" style="margin-right:6px"></i>No assets in selected area</div>`;
    panel.style.display = '';
    return;
  }

  const byCondition = { Good:0, Fair:0, Poor:0, Critical:0, Unassessed:0 };
  selected.forEach(a => { byCondition[a.condition||'Unassessed'] = (byCondition[a.condition||'Unassessed']||0) + 1; });
  const totalVal = selected.reduce((s,a)=>s+(a.valuation?.amount||0),0);

  panel.style.display = '';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:14px;font-weight:700;color:var(--text,#e8f5ee)">
        <i class="fa-solid fa-draw-polygon" style="color:#4A90D9;margin-right:6px"></i>
        ${selected.length} assets in selection
      </div>
      <button onclick="clearPolygonSelection()" style="background:none;border:none;color:var(--text3,#8aab96);cursor:pointer;font-size:14px">✕</button>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      ${Object.entries(byCondition).filter(([,n])=>n>0).map(([c,n])=>
        `<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.08);color:var(--text2,#b8d4c8)">${c}: ${n}</span>`
      ).join('')}
      ${totalVal ? `<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;background:rgba(74,144,217,.15);color:#4A90D9">Value: ${totalVal>=1e9?(totalVal/1e9).toFixed(1)+'B':totalVal>=1e6?(totalVal/1e6).toFixed(1)+'M':totalVal.toLocaleString()}</span>` : ''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="_exportSelectionCSV()">
        <i class="fa-solid fa-download"></i> Export ${selected.length} assets
      </button>
      <button class="btn btn-secondary btn-sm" onclick="_viewSelectionInRegistry()">
        <i class="fa-solid fa-database"></i> View in Registry
      </button>
    </div>`;

  window._currentSelection = selected;
}

function clearPolygonSelection() {
  if (_drawnItems) _drawnItems.clearLayers();
  if (_selectionLayer) { _selectionLayer.remove(); _selectionLayer = null; }
  _clearPolygonResults();
}

function _clearPolygonResults() {
  const panel = document.getElementById('map-selection-panel');
  if (panel) panel.style.display = 'none';
  window._currentSelection = [];
}

function _exportSelectionCSV() {
  const sel = window._currentSelection || [];
  if (!sel.length) return;
  const headers = ['Asset ID','Name','Type','Condition','State','LGA','MDA','Sector','Lat','Lng','Status'];
  const rows = sel.map(a => [
    a.assetId||a.id, a.name, a.type, a.condition||'', a.state||'', a.lga||'',
    a.mda||'', a.sector||'',
    a.lat||a.location?.coordinates?.[1]||'',
    a.lng||a.location?.coordinates?.[0]||'',
    a.status||'Active',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'map_selection.csv'; link.click();
  URL.revokeObjectURL(url);
}

function _viewSelectionInRegistry() {
  const ids = (window._currentSelection||[]).map(a=>a.assetId||a.id);
  if (!ids.length) return;
  sessionStorage.setItem('as_map_selection', JSON.stringify(ids));
  window.location.href = 'assets.html?selection=map';
}

// ── HEATMAP (condition-based colour density) ──────────────────────────────────
function toggleHeatmap() {
  _heatActive = !_heatActive;
  const btn = document.getElementById('btn-heatmap');

  if (_heatActive) {
    if (btn) { btn.style.background = 'var(--accent,#00c864)'; btn.style.color = '#000'; }
    _renderHeatmap();
  } else {
    if (btn) { btn.style.background = ''; btn.style.color = ''; }
    if (_heatLayer) { _heatLayer.remove(); _heatLayer = null; }
  }
}

function _renderHeatmap() {
  if (_heatLayer) { _heatLayer.remove(); _heatLayer = null; }
  const list = _mapAllAssets.length ? _mapAllAssets : (assets||[]);
  const COND_WEIGHT = { Critical: 1.0, Poor: 0.7, Fair: 0.4, Good: 0.1 };

  // Create coloured circles representing condition density
  const circles = list.map(a => {
    const lat = a.lat || a.location?.coordinates?.[1];
    const lng = a.lng || a.location?.coordinates?.[0];
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
    const w = COND_WEIGHT[a.condition] ?? 0.2;
    const color = w >= 0.9 ? '#e05555' : w >= 0.6 ? 'rgba(240,120,0,.8)' : w >= 0.3 ? '#f0b400' : '#2DB87B';
    return L.circleMarker([lat, lng], {
      radius: 10 + w * 14,
      fillColor: color, fillOpacity: 0.25,
      color: color, weight: 1, opacity: 0.5,
    });
  }).filter(Boolean);

  _heatLayer = L.layerGroup(circles).addTo(leafletMap);
}

// ── Hook into existing map init ───────────────────────────────────────────────
// Wait for leafletMap to be available, then init spatial tools
const _spatialInitInterval = setInterval(() => {
  if (window.leafletMap && window.L) {
    clearInterval(_spatialInitInterval);
    setTimeout(initSpatialTools, 300);
  }
}, 200);
