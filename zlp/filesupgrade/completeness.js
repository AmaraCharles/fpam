// ── DATA COMPLETENESS DASHBOARD ───────────────────────────────────────────────
// Analyses field coverage across all assets and surfaces gaps by MDA/sector.
// Rendered into #completeness-panel if present on the page, or as a modal.

const COMPLETENESS_FIELDS = [
  { key: 'location',    label: 'GPS Coordinates', check: a => !!(a.lat || a.location?.coordinates?.[1]) },
  { key: 'condition',   label: 'Condition',        check: a => !!a.condition },
  { key: 'sector',      label: 'Sector',           check: a => !!a.sector },
  { key: 'mda',         label: 'MDA / Agency',     check: a => !!a.mda },
  { key: 'state',       label: 'State',            check: a => !!a.state },
  { key: 'address',     label: 'Address',          check: a => !!a.address },
  { key: 'photos',      label: 'Photos',           check: a => !!(a.photos?.length || a.photoCount > 0) },
  { key: 'valuation',   label: 'Valuation',        check: a => !!a.valuation?.amount },
  { key: 'captureDate', label: 'Capture Date',     check: a => !!(a.captureDate || a.date) },
  { key: 'assessed',    label: 'Assessed',         check: a => a.assessed === 'Assessed' },
];

async function loadCompletenessData() {
  try {
    const r = await apiGetAssets({ limit: 2000 });
    return r.assets || [];
  } catch {
    return assets || [];
  }
}

function computeCompleteness(list) {
  if (!list.length) return { overall: 0, byField: [], byMda: [], byState: [] };

  // Per-field scores
  const byField = COMPLETENESS_FIELDS.map(f => {
    const filled = list.filter(f.check).length;
    return { key: f.key, label: f.label, filled, total: list.length, pct: Math.round(filled / list.length * 100) };
  });

  // Overall score = average of all field percentages
  const overall = Math.round(byField.reduce((s, f) => s + f.pct, 0) / byField.length);

  // Per-MDA breakdown
  const mdaMap = {};
  list.forEach(a => {
    const mda = a.mda || 'Unassigned';
    if (!mdaMap[mda]) mdaMap[mda] = [];
    mdaMap[mda].push(a);
  });
  const byMda = Object.entries(mdaMap).map(([mda, items]) => {
    const score = Math.round(COMPLETENESS_FIELDS.reduce((s, f) => s + (items.filter(f.check).length / items.length * 100), 0) / COMPLETENESS_FIELDS.length);
    return { mda, count: items.length, score };
  }).sort((a, b) => a.score - b.score);

  // Per-state breakdown
  const stateMap = {};
  list.forEach(a => {
    const st = a.state || 'Unknown';
    if (!stateMap[st]) stateMap[st] = [];
    stateMap[st].push(a);
  });
  const byState = Object.entries(stateMap).map(([state, items]) => {
    const score = Math.round(COMPLETENESS_FIELDS.reduce((s, f) => s + (items.filter(f.check).length / items.length * 100), 0) / COMPLETENESS_FIELDS.length);
    return { state, count: items.length, score };
  }).sort((a, b) => a.score - b.score);

  return { overall, byField, byMda, byState };
}

function scoreColor(pct) {
  if (pct >= 80) return '#2DB87B';
  if (pct >= 50) return '#f0a500';
  return '#e05555';
}

function renderCompletenessModal() {
  const body = `<div id="comp-loading" style="text-align:center;padding:40px"><div class="spinner"></div></div>
<div id="comp-content" style="display:none"></div>`;

  if (typeof openModal === 'function') {
    openModal('Data Completeness Report', body, `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-secondary btn-sm" onclick="exportCompletenessCSV()"><i class="fa-solid fa-download"></i> Export CSV</button>`);
  }

  loadCompletenessData().then(list => {
    const data = computeCompleteness(list);
    window._lastCompleteness = { data, list };

    const el = document.getElementById('comp-content');
    const loading = document.getElementById('comp-loading');
    if (!el) return;
    if (loading) loading.style.display = 'none';
    el.style.display = '';

    el.innerHTML = `
      <!-- Overall score ring -->
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:24px;padding:20px;background:var(--surface2,#f4f6f9);border-radius:12px;border:1px solid var(--border)">
        <div style="position:relative;width:90px;height:90px;flex-shrink:0">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="38" fill="none" stroke="var(--border)" stroke-width="10"/>
            <circle cx="45" cy="45" r="38" fill="none" stroke="${scoreColor(data.overall)}" stroke-width="10"
              stroke-dasharray="${2*Math.PI*38}" stroke-dashoffset="${2*Math.PI*38*(1-data.overall/100)}"
              stroke-linecap="round" transform="rotate(-90 45 45)" style="transition:stroke-dashoffset .5s"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:${scoreColor(data.overall)}">${data.overall}%</div>
        </div>
        <div>
          <div style="font-size:17px;font-weight:700;margin-bottom:4px">Overall Data Completeness</div>
          <div style="font-size:12px;color:var(--text3)">${list.length} assets analysed across ${COMPLETENESS_FIELDS.length} fields</div>
          <div style="font-size:12px;color:var(--text3);margin-top:4px">${data.overall >= 80 ? '✅ Good data quality' : data.overall >= 50 ? '⚠️ Moderate gaps — review flagged fields' : '🔴 Significant gaps — data import may be incomplete'}</div>
        </div>
      </div>

      <!-- Field-by-field breakdown -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:10px">Field Coverage</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
        ${data.byField.map(f => `
          <div style="background:var(--surface2,#f4f6f9);border:1px solid var(--border);border-radius:8px;padding:10px 14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <span style="font-size:12px;font-weight:600">${f.label}</span>
              <span style="font-size:12px;font-weight:700;color:${scoreColor(f.pct)}">${f.pct}%</span>
            </div>
            <div style="background:var(--border);border-radius:10px;height:5px;overflow:hidden">
              <div style="width:${f.pct}%;height:100%;background:${scoreColor(f.pct)};border-radius:10px;transition:width .4s"></div>
            </div>
            <div style="font-size:10px;color:var(--text3);margin-top:4px">${f.filled} / ${f.total} filled · ${f.total - f.filled} missing</div>
          </div>`).join('')}
      </div>

      <!-- MDA breakdown -->
      ${data.byMda.length > 1 ? `
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:10px">Completeness by MDA <span style="font-weight:400;font-size:10px;text-transform:none">(lowest first)</span></div>
      <div style="max-height:220px;overflow-y:auto;margin-bottom:20px">
        ${data.byMda.map(m => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;font-size:12px;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(m.mda)}">${escHtml(m.mda)}</div>
            <div style="font-size:10px;color:var(--text3);flex-shrink:0">${m.count} assets</div>
            <div style="width:80px;background:var(--border);border-radius:10px;height:6px;flex-shrink:0">
              <div style="width:${m.score}%;height:100%;background:${scoreColor(m.score)};border-radius:10px"></div>
            </div>
            <div style="font-size:11px;font-weight:700;color:${scoreColor(m.score)};flex-shrink:0;width:32px;text-align:right">${m.score}%</div>
          </div>`).join('')}
      </div>` : ''}

      <!-- Assets with most gaps -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:10px">Assets Needing Most Attention</div>
      <div style="max-height:200px;overflow-y:auto">
        ${list.map(a => {
          const missing = COMPLETENESS_FIELDS.filter(f => !f.check(a)).map(f => f.label);
          return { a, missing };
        }).filter(x => x.missing.length > 2)
          .sort((x, y) => y.missing.length - x.missing.length)
          .slice(0, 15)
          .map(({ a, missing }) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600">${escHtml(a.name || a.assetId)}</div>
              <div style="font-size:10px;color:var(--text3)">${escHtml(a.assetId)} · ${escHtml(a.mda||'No MDA')}</div>
              <div style="font-size:10px;color:#e05555;margin-top:2px">Missing: ${missing.join(', ')}</div>
            </div>
            <span style="background:rgba(224,85,85,.1);color:#e05555;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0">${missing.length} gaps</span>
          </div>`).join('') || '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">All assets have good coverage!</div>'}
      </div>`;
  });
}

async function exportCompletenessCSV() {
  const { data, list } = window._lastCompleteness || {};
  if (!list) return;
  const rows = [['Asset ID','Name','MDA','State',...COMPLETENESS_FIELDS.map(f=>f.label),'Score %']];
  list.forEach(a => {
    const checks = COMPLETENESS_FIELDS.map(f => f.check(a) ? 'Yes' : 'No');
    const score = Math.round(checks.filter(x=>x==='Yes').length / COMPLETENESS_FIELDS.length * 100);
    rows.push([a.assetId||a.id, a.name, a.mda||'', a.state||'', ...checks, score]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'completeness_report.csv'; link.click();
  URL.revokeObjectURL(url);
}
