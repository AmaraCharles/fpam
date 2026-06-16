// ── BULK CONDITION UPDATE VIA EXCEL ───────────────────────────────────────────
// Accepts an XLSX/CSV file with columns: assetId, condition, notes, captureDate
// Matches on assetId, previews changes, then applies them batch-by-batch.
// Requires SheetJS (xlsx) — already loaded in assets.html.

function openBulkUpdateModal() {
  if (typeof openModal !== 'function') return;
  openModal('Bulk Update from Excel / CSV',
    `<div style="font-size:13px">
      <div style="background:var(--surface2,rgba(255,255,255,.04));border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:16px">
        <div style="font-weight:700;margin-bottom:6px"><i class="fa-solid fa-circle-info" style="color:var(--accent)"></i> File Format</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.7">
          Your spreadsheet must have these columns (any order):<br>
          <code style="background:var(--surface3,#0d1f17);padding:2px 6px;border-radius:4px;font-size:11px">assetId</code>
          <code style="background:var(--surface3,#0d1f17);padding:2px 6px;border-radius:4px;font-size:11px">condition</code>
          (Good / Fair / Poor / Critical)<br>
          Optional: <code style="background:var(--surface3,#0d1f17);padding:2px 6px;border-radius:4px;font-size:11px">notes</code>
          <code style="background:var(--surface3,#0d1f17);padding:2px 6px;border-radius:4px;font-size:11px">captureDate</code>
          <code style="background:var(--surface3,#0d1f17);padding:2px 6px;border-radius:4px;font-size:11px">status</code>
          <code style="background:var(--surface3,#0d1f17);padding:2px 6px;border-radius:4px;font-size:11px">sector</code>
          <code style="background:var(--surface3,#0d1f17);padding:2px 6px;border-radius:4px;font-size:11px">assessed</code>
        </div>
      </div>
      <label class="btn btn-secondary" style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;margin-bottom:16px">
        <i class="fa-solid fa-file-excel"></i> Choose Excel / CSV File
        <input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="parseBulkUpdateFile(this.files[0])">
      </label>
      <div id="bulk-update-preview"></div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" id="btn-apply-bulk" style="display:none" onclick="applyBulkUpdate()">
       <i class="fa-solid fa-bolt"></i> Apply Updates
     </button>`
  );
}

let _bulkUpdateRows = [];

async function parseBulkUpdateFile(file) {
  if (!file) return;
  const preview = document.getElementById('bulk-update-preview');
  if (preview) preview.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';

  try {
    const buf = await file.arrayBuffer();
    let rows = [];

    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      // Parse CSV manually
      const text = new TextDecoder().decode(buf);
      const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.replace(/^"|"$/g,'').trim()));
      const headers = lines[0].map(h => h.toLowerCase().trim());
      rows = lines.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
        return obj;
      });
    } else {
      // Parse Excel with SheetJS
      if (!window.XLSX) throw new Error('SheetJS library not loaded. Add xlsx.full.min.js to the page.');
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Normalise headers to lowercase
      rows = rows.map(r => {
        const out = {};
        Object.entries(r).forEach(([k,v]) => { out[k.toLowerCase().trim()] = String(v||'').trim(); });
        return out;
      });
    }

    // Validate rows
    const VALID_CONDITIONS = ['Good','Fair','Poor','Critical',''];
    const valid = [], invalid = [];
    rows.forEach((r, i) => {
      const id = r.assetid || r['asset id'] || r.asset_id || r.id || '';
      const cond = r.condition || '';
      if (!id) { invalid.push({ row: i+2, reason: 'Missing assetId' }); return; }
      if (cond && !VALID_CONDITIONS.includes(cond)) { invalid.push({ row: i+2, id, reason: `Invalid condition: "${cond}"` }); return; }
      valid.push({ assetId: id, condition: cond||null, notes: r.notes||'', captureDate: r.capturedate||r['capture date']||'', status: r.status||'', sector: r.sector||'', assessed: r.assessed||'' });
    });

    _bulkUpdateRows = valid;

    // Load current asset data for diff preview
    // The backend hard-caps any single /assets request at 200 records
    // (assetService.js listAssets: Math.min(200, limit)), so limit:5000 was
    // silently only returning the first 200 — every assetId outside that
    // window would incorrectly show up as "not found". Page through it all.
    let currentAssets = [];
    try {
      const BACKEND_PAGE_LIMIT = 200;
      const SAFETY_MAX_PAGES   = 50; // hard ceiling: 50 * 200 = 10,000 assets
      const first = await apiGetAssets({ page: 1, limit: BACKEND_PAGE_LIMIT });
      currentAssets = first.assets || [];
      const totalPages = Math.min(first.pages || 1, SAFETY_MAX_PAGES);
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            apiGetAssets({ page: i + 2, limit: BACKEND_PAGE_LIMIT })
          )
        );
        rest.forEach(r => { currentAssets = currentAssets.concat(r.assets || []); });
      }
    } catch { currentAssets = assets || []; }
    const assetMap = {};
    currentAssets.forEach(a => { assetMap[a.assetId||a.id] = a; });

    // Build preview
    const matched   = valid.filter(r => !!assetMap[r.assetId]);
    const notFound  = valid.filter(r => !assetMap[r.assetId]);
    const changes   = matched.filter(r => {
      const cur = assetMap[r.assetId];
      return (r.condition && r.condition !== cur.condition) ||
             (r.notes && r.notes !== cur.notes) ||
             (r.status && r.status !== cur.status) ||
             (r.sector && r.sector !== cur.sector) ||
             r.captureDate || r.assessed;
    });

    if (preview) preview.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <span style="background:rgba(45,184,123,.15);color:#0f7a4d;font-size:12px;font-weight:700;padding:4px 12px;border-radius:6px">${matched.length} matched</span>
        <span style="background:rgba(74,144,217,.15);color:#0d5291;font-size:12px;font-weight:700;padding:4px 12px;border-radius:6px">${changes.length} with changes</span>
        ${notFound.length ? `<span style="background:rgba(224,85,85,.15);color:#a02020;font-size:12px;font-weight:700;padding:4px 12px;border-radius:6px">${notFound.length} not found</span>` : ''}
        ${invalid.length ? `<span style="background:rgba(240,165,0,.15);color:#8a5e00;font-size:12px;font-weight:700;padding:4px 12px;border-radius:6px">${invalid.length} invalid rows</span>` : ''}
      </div>
      ${changes.length ? `
      <div style="max-height:240px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="position:sticky;top:0;background:var(--surface)">
            <tr>
              <th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">Asset ID</th>
              <th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">Current Condition</th>
              <th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">New Condition</th>
              <th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)">Other Changes</th>
            </tr>
          </thead>
          <tbody>
            ${changes.map(r => {
              const cur = assetMap[r.assetId];
              const other = [r.notes?'Notes':'',r.status?'Status':'',r.sector?'Sector':'',r.captureDate?'Date':'',r.assessed?'Assessed':''].filter(Boolean).join(', ');
              return `<tr>
                <td style="padding:8px;font-family:'Space Mono',monospace;font-size:10px;border-bottom:1px solid var(--border)">${r.assetId}</td>
                <td style="padding:8px;border-bottom:1px solid var(--border)"><span style="font-size:11px;color:var(--text3)">${cur.condition||'Unassessed'}</span></td>
                <td style="padding:8px;border-bottom:1px solid var(--border)"><span style="font-size:11px;font-weight:700;color:${r.condition==='Good'?'#2DB87B':r.condition==='Critical'?'#e05555':r.condition==='Poor'?'#f07000':'#f0a500'}">${r.condition||'Unassessed'}</span></td>
                <td style="padding:8px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border)">${other||'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">No changes detected in matched assets.</div>'}
      ${invalid.length ? `<div style="margin-top:12px;font-size:11px;color:#e05555">${invalid.map(e=>`Row ${e.row}: ${e.reason}`).join(' · ')}</div>` : ''}`;

    const applyBtn = document.getElementById('btn-apply-bulk');
    if (applyBtn) applyBtn.style.display = changes.length ? '' : 'none';

    // Store changes for apply step
    window._bulkChanges = changes.map(r => ({ ...r, previousCondition: assetMap[r.assetId]?.condition || '' }));

  } catch(e) {
    if (preview) preview.innerHTML = `<div style="color:#e05555;font-size:12px;padding:10px"><i class="fa-solid fa-circle-xmark"></i> Parse error: ${e.message}</div>`;
  }
}

async function applyBulkUpdate() {
  const changes = window._bulkChanges || [];
  if (!changes.length) return;

  const applyBtn = document.getElementById('btn-apply-bulk');
  if (applyBtn) { applyBtn.disabled = true; applyBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></div> Applying…'; }

  let done = 0, failed = 0;
  for (const r of changes) {
    const payload = {};
    if (r.condition   !== undefined) payload.condition   = r.condition || null;
    if (r.previousCondition)         payload.previousCondition = r.previousCondition;
    if (r.notes)                     payload.notes       = r.notes;
    if (r.status)                    payload.status      = r.status;
    if (r.sector)                    payload.sector      = r.sector;
    if (r.captureDate)               payload.captureDate = r.captureDate;
    if (r.assessed)                  payload.assessed    = r.assessed;

    try {
      await apiUpdateAsset(r.assetId, payload);
      done++;
    } catch {
      // Offline: update local cache
      const a = (assets||[]).find(x=>(x.assetId||x.id)===r.assetId);
      if (a) Object.assign(a, payload);
      failed++;
    }
  }

  if (typeof saveLocal === 'function') saveLocal();
  if (typeof toast === 'function') toast(`${done} assets updated${failed?`, ${failed} failed (saved locally)`:''}`, 'fa-bolt');
  if (typeof addAudit === 'function') addAudit('BULK_UPDATE', 'MULTIPLE', null, `${done} assets updated via Excel import`);
  if (typeof closeModal === 'function') closeModal();
  if (typeof renderAssets === 'function') renderAssets();
}