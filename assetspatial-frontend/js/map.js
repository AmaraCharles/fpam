// ── LIVE MAP ─────────────────────────────────────────────────────────────────
let leafletMap     = null;
let leafletMarkers = [];
let currentTile    = null;
let _mapSat        = false;

const TILES = {
  road:      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

const COND_COLORS = { Good:'#00c864', Fair:'#f0b400', Poor:'rgba(240,120,0,0.9)', Critical:'#e05555' };

function markerIcon(cond) {
  const color = COND_COLORS[cond] || '#8aab96';
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:${color};border:2px solid rgba(255,255,255,.85);border-radius:50%;box-shadow:0 0 8px ${color}66;transition:transform .2s"></div>`,
    iconSize:[14,14], iconAnchor:[7,7], popupAnchor:[0,-10],
  });
}

async function initMap() {
  const el = document.getElementById('leaflet-map');
  if (!el || !window.L) return;

  // Centre on Abuja by default
  if (!leafletMap) {
    leafletMap = L.map(el, { zoomControl:false }).setView([9.0765, 7.3986], 7);
    L.control.zoom({ position:'bottomright' }).addTo(leafletMap);
    currentTile = L.tileLayer(TILES.road, { attribution:'© OpenStreetMap' }).addTo(leafletMap);

    // Coord display
    leafletMap.on('mousemove', e => {
      const c = document.getElementById('map-cursor-coords');
      if (c) c.textContent = e.latlng.lat.toFixed(5)+'°N, '+e.latlng.lng.toFixed(5)+'°E';
    });
  }

  await renderMap();
}

async function renderMap() {
  // Clear existing markers
  leafletMarkers.forEach(m => m.remove());
  leafletMarkers = [];

  // Get filter values
  const typeFilter = document.getElementById('map-filter-type')?.value || '';
  const condFilter = document.getElementById('map-filter-cond')?.value || '';

  // Load assets
  let mapAssets = assets;
  try {
    const r = await apiGetAssets({ limit:1000 });
    if (r.assets?.length) mapAssets = r.assets;
  } catch {}

  // Apply filters
  if (typeFilter) mapAssets = mapAssets.filter(a => a.type === typeFilter);
  if (condFilter) mapAssets = mapAssets.filter(a => a.condition === condFilter);

  // Count display
  const cnt = document.getElementById('map-count');
  if (cnt) cnt.textContent = mapAssets.length + ' assets';

  // Plot markers
  const validAssets = [];
  mapAssets.forEach(a => {
    const lat = a.lat || a.location?.coordinates?.[1];
    const lng = a.lng || a.location?.coordinates?.[0];
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    validAssets.push(a);

    const m = L.marker([lat, lng], { icon: markerIcon(a.condition) })
      .addTo(leafletMap)
      .on('click', () => showMapInfoPanel(a));

    m.bindPopup(`<div style="font-family:'Space Grotesk',sans-serif;min-width:160px">
      <strong style="font-size:13px">${escHtml(a.name||a.assetId||a.id)}</strong><br>
      <span style="font-size:11px;color:#666">${escHtml(a.type)} · <span style="color:${COND_COLORS[a.condition]||'#aaa'}">${escHtml(a.condition)}</span></span><br>
      <span style="font-family:'Space Mono',monospace;font-size:10px;color:#00c864">${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}</span>
    </div>`, { maxWidth: 240 });

    leafletMarkers.push(m);
  });

  // Render chip strip
  const chipsEl = document.getElementById('map-chips');
  const emptyEl = document.getElementById('map-chip-empty');
  if (chipsEl && emptyEl) {
    if (!validAssets.length) {
      emptyEl.style.display = 'inline';
      emptyEl.textContent = mapAssets.length ? 'No located assets match filters' : 'No assets with GPS coordinates';
      chipsEl.innerHTML = '';
    } else {
      emptyEl.style.display = 'none';
      chipsEl.innerHTML = validAssets.slice(0, 30).map(a => {
        const lat = a.lat || a.location?.coordinates?.[1];
        const lng = a.lng || a.location?.coordinates?.[0];
        return `<button class="map-chip" onclick="flyToAsset(${lat},${lng})">${escHtml(a.name||a.assetId||a.id)}</button>`;
      }).join('');
    }
  }
}

function showMapInfoPanel(a) {
  const panel  = document.getElementById('map-info-panel');
  const content = document.getElementById('map-info-content');
  if (!panel || !content) return;

  const lat = a.lat || a.location?.coordinates?.[1] || '—';
  const lng = a.lng || a.location?.coordinates?.[0] || '—';

  content.innerHTML = `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;color:var(--text3);font-family:'Space Mono',monospace;margin-bottom:4px">${escHtml(a.assetId||a.id)}</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">${escHtml(a.name)}</div>
      <span class="tag ${typeColor(a.type)}" style="margin-right:6px">${escHtml(a.type)}</span>
      <span class="tag ${condColor(a.condition)}">${escHtml(a.condition)}</span>
    </div>
    <div style="display:grid;gap:10px;font-size:12px">
      <div><span style="color:var(--text3);font-family:'Space Mono',monospace;font-size:9px;display:block;text-transform:uppercase;margin-bottom:2px">Coordinates</span>
        <span style="font-family:'Space Mono',monospace;font-size:11px;color:var(--accent)">${typeof lat==='number'?lat.toFixed(6):lat}°N, ${typeof lng==='number'?lng.toFixed(6):lng}°E</span></div>
      <div><span style="color:var(--text3);font-family:'Space Mono',monospace;font-size:9px;display:block;text-transform:uppercase;margin-bottom:2px">Geometry</span>${geomIcon(a.geomType||a.geom)} ${escHtml(a.geomType||a.geom||'—')}</div>
      ${a.state?`<div><span style="color:var(--text3);font-family:'Space Mono',monospace;font-size:9px;display:block;text-transform:uppercase;margin-bottom:2px">Location</span>${escHtml(a.state)}${a.lga?', '+escHtml(a.lga):''}</div>`:''}
      ${a.material?`<div><span style="color:var(--text3);font-family:'Space Mono',monospace;font-size:9px;display:block;text-transform:uppercase;margin-bottom:2px">Material</span>${escHtml(a.material)}</div>`:''}
      ${a.notes?`<div><span style="color:var(--text3);font-family:'Space Mono',monospace;font-size:9px;display:block;text-transform:uppercase;margin-bottom:2px">Notes</span><span style="color:var(--text2)">${escHtml(a.notes)}</span></div>`:''}
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <a href="assets.html" class="btn btn-primary btn-sm" style="font-size:11px"><i class="fa-solid fa-database"></i> View in Registry</a>
      <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="leafletMap.flyTo([${lat},${lng}],16)"><i class="fa-solid fa-location-dot"></i> Zoom In</button>
    </div>`;

  panel.classList.add('open');
}

function closeInfoPanel() {
  document.getElementById('map-info-panel')?.classList.remove('open');
}

function flyToAsset(lat, lng) {
  if (leafletMap && lat && lng && !isNaN(lat) && !isNaN(lng)) {
    leafletMap.flyTo([lat, lng], 15, { duration:1.2 });
  }
}

function leafletFitAll() {
  if (!leafletMap || !leafletMarkers.length) return;
  const group = L.featureGroup(leafletMarkers);
  leafletMap.fitBounds(group.getBounds().pad(0.1));
}

function fitAllMarkers() { leafletFitAll(); }

function setLeafletLayer(type) {
  if (!leafletMap) return;
  if (currentTile) currentTile.remove();
  currentTile = L.tileLayer(TILES[type] || TILES.road, { attribution:'© OpenStreetMap/ESRI' }).addTo(leafletMap);
}

function toggleMapType() {
  _mapSat = !_mapSat;
  setLeafletLayer(_mapSat ? 'satellite' : 'road');
  const btn = document.getElementById('map-type-btn');
  if (btn) btn.innerHTML = _mapSat
    ? '<i class="fa-solid fa-globe"></i> Road Map'
    : '<i class="fa-solid fa-layer-group"></i> Satellite';
}

function locateMe() {
  if (!navigator.geolocation) { toast('Geolocation not supported', 'fa-triangle-exclamation', true); return; }
  navigator.geolocation.getCurrentPosition(
    p => { if (leafletMap) leafletMap.flyTo([p.coords.latitude, p.coords.longitude], 14); },
    () => toast('Could not get location', 'fa-triangle-exclamation', true),
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

function filterMap() { renderMap(); }
