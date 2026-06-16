// ── ENHANCED ASSET PDF REPORT ─────────────────────────────────────────────────
// Generates a printable HTML report for a single asset, MDA portfolio,
// or deferred maintenance summary.

function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });
}
function _fmtNaira(v) {
  if (!v) return '—';
  const n = Number(v);
  if (n >= 1e9) return '₦' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '₦' + (n/1e6).toFixed(1) + 'M';
  return '₦' + n.toLocaleString();
}
function _condStyle(c) {
  const m = { Good:'color:#0f7a4d;background:rgba(45,184,123,.15)', Fair:'color:#8a5e00;background:rgba(240,165,0,.15)', Poor:'color:#7a3000;background:rgba(240,120,0,.15)', Critical:'color:#a02020;background:rgba(224,85,85,.15)' };
  return m[c] || 'color:#2C3E50;background:rgba(90,106,122,.12)';
}

// ── SINGLE ASSET REPORT ───────────────────────────────────────────────────────
async function generateAssetReport(assetId) {
  let a;
  try {
    const r = await apiGetAsset(assetId);
    a = r.asset || r;
  } catch {
    a = (assets || []).find(x => (x.assetId||x.id) === assetId);
  }
  if (!a) { if(typeof toast==='function') toast('Asset not found', 'fa-circle-xmark', true); return; }

  const lat = a.lat || a.location?.coordinates?.[1];
  const lng = a.lng || a.location?.coordinates?.[0];
  const maint = a.maintenanceLogs || a.maintenance || [];
  const maintTotal = maint.reduce((s, m) => s + Number(m.cost||m.amount||0), 0);
  const riskScore = typeof calcRiskScore === 'function' ? calcRiskScore(a) : (typeof calcRisk === 'function' ? calcRisk(a) : 0);

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>Asset Report — ${a.name||assetId}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#0B1829;background:#fff;padding:40px}
  @media print{body{padding:20px}button{display:none!important}.page-break{page-break-before:always}}
  h1{font-size:22px;font-weight:800;margin-bottom:4px}
  h2{font-size:14px;font-weight:700;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #0B2545;color:#0B2545;text-transform:uppercase;letter-spacing:.5px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #4A90D9;margin-bottom:24px}
  .logo-block .org{font-size:10px;color:#5A6A7A;letter-spacing:1px;text-transform:uppercase}
  .logo-block .brand{font-size:16px;font-weight:800;color:#0B2545}
  .id-block{text-align:right;font-family:monospace;font-size:11px;color:#5A6A7A}
  .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
  .grid-2{grid-template-columns:1fr 1fr}
  .cell{background:#F4F6F9;border-radius:8px;padding:12px 14px;border:1px solid #E8ECF0}
  .cell-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#5A6A7A;font-weight:700;margin-bottom:4px}
  .cell-val{font-size:13px;font-weight:600;color:#0B1829}
  .badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#0B2545;color:#fff;padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:9px 12px;border-bottom:1px solid #E8ECF0}
  tr:hover td{background:#F4F6F9}
  .risk-bar{height:8px;border-radius:10px;overflow:hidden;background:#e8ecf0}
  .risk-fill{height:100%;border-radius:10px}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E8ECF0;font-size:10px;color:#5A6A7A;display:flex;justify-content:space-between}
  .btn-print{position:fixed;top:20px;right:20px;background:#4A90D9;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
  .notes-box{background:#F4F6F9;border:1px solid #E8ECF0;border-radius:8px;padding:14px;font-size:12px;line-height:1.6;color:#2C3E50}
</style></head><body>
<button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>

<div class="header">
  <div class="logo-block">
    <div class="brand">AssetSpatial</div>
    <div class="org">Federal Public Asset Management Department</div>
    <div style="margin-top:6px"><h1>${a.name || assetId}</h1></div>
  </div>
  <div class="id-block">
    <div>ASSET ID: <strong>${a.assetId||a.id}</strong></div>
    <div style="margin-top:4px">Report Date: ${_fmtDate(new Date())}</div>
    ${a.sector ? `<div style="margin-top:4px">Sector: ${a.sector}</div>` : ''}
  </div>
</div>

<h2>Asset Overview</h2>
<div class="grid">
  <div class="cell"><div class="cell-label">Type</div><div class="cell-val">${a.type||'—'}</div></div>
  <div class="cell"><div class="cell-label">Condition</div><div class="cell-val"><span class="badge" style="${_condStyle(a.condition)}">${a.condition||'Unassessed'}</span></div></div>
  <div class="cell"><div class="cell-label">Status</div><div class="cell-val">${a.status||'Active'}</div></div>
  <div class="cell"><div class="cell-label">MDA / Agency</div><div class="cell-val">${a.mda||'—'}</div></div>
  <div class="cell"><div class="cell-label">State</div><div class="cell-val">${a.state||'—'}</div></div>
  <div class="cell"><div class="cell-label">LGA</div><div class="cell-val">${a.lga||'—'}</div></div>
  <div class="cell"><div class="cell-label">Address</div><div class="cell-val">${a.address||'—'}</div></div>
  <div class="cell"><div class="cell-label">Capture Date</div><div class="cell-val">${_fmtDate(a.captureDate||a.createdAt)}</div></div>
  <div class="cell"><div class="cell-label">Captured By</div><div class="cell-val">${a.agent||a.capturedBy?.name||'—'}</div></div>
</div>

${lat && lng ? `
<h2>Location</h2>
<div class="grid grid-2">
  <div class="cell"><div class="cell-label">Coordinates (WGS84)</div><div class="cell-val" style="font-family:monospace">${Number(lat).toFixed(6)}°N, ${Number(lng).toFixed(6)}°E</div></div>
  <div class="cell"><div class="cell-label">Geometry Type</div><div class="cell-val">${a.geomType||a.geom||'Point'}</div></div>
</div>` : ''}

<h2>Risk Assessment</h2>
<div class="grid grid-2">
  <div class="cell">
    <div class="cell-label">Risk Score</div>
    <div class="cell-val" style="font-size:24px;font-weight:800;color:${riskScore>=60?'#e05555':riskScore>=30?'#f0a500':'#2DB87B'}">${riskScore}<span style="font-size:14px;font-weight:400;color:#5A6A7A">/100</span></div>
    <div class="risk-bar" style="margin-top:8px"><div class="risk-fill" style="width:${riskScore}%;background:${riskScore>=60?'#e05555':riskScore>=30?'#f0a500':'#2DB87B'}"></div></div>
  </div>
  <div class="cell">
    <div class="cell-label">Next Inspection</div>
    <div class="cell-val" style="color:${a.nextInspection&&new Date(a.nextInspection)<new Date()?'#e05555':'#0B1829'}">${_fmtDate(a.nextInspection)}</div>
    ${a.nextInspection && new Date(a.nextInspection) < new Date() ? '<div style="color:#e05555;font-size:11px;margin-top:4px;font-weight:600">⚠ OVERDUE</div>' : ''}
  </div>
</div>

${a.valuation?.amount ? `
<h2>Valuation</h2>
<div class="grid grid-2">
  <div class="cell"><div class="cell-label">Estimated Value</div><div class="cell-val" style="font-size:20px;font-weight:800;color:#0B2545">${_fmtNaira(a.valuation.amount)}</div></div>
  <div class="cell">
    <div class="cell-label">Method</div><div class="cell-val">${a.valuation.method||'—'}</div>
    <div class="cell-label" style="margin-top:8px">Valued On</div><div class="cell-val">${_fmtDate(a.valuation.valuedAt)}</div>
  </div>
</div>` : ''}

${maint.length ? `
<h2>Maintenance History</h2>
<table>
  <thead><tr><th>Date</th><th>Description</th><th>Technician</th><th>Cost (₦)</th></tr></thead>
  <tbody>
    ${maint.map(m=>`<tr>
      <td style="font-family:monospace;font-size:11px">${m.date||m.performedAt?.slice(0,10)||'—'}</td>
      <td>${m.desc||m.description||'—'}</td>
      <td>${m.tech||m.technician||'—'}</td>
      <td style="font-family:monospace">₦${Number(m.cost||m.amount||0).toLocaleString()}</td>
    </tr>`).join('')}
    <tr style="background:#F4F6F9;font-weight:700">
      <td colspan="3" style="text-align:right">Total Maintenance Spend:</td>
      <td style="font-family:monospace">₦${maintTotal.toLocaleString()}</td>
    </tr>
  </tbody>
</table>` : ''}

${a.conditionHistory?.length ? `
<h2>Condition History</h2>
<table>
  <thead><tr><th>Date</th><th>From</th><th>To</th><th>Changed By</th></tr></thead>
  <tbody>
    ${[...a.conditionHistory].sort((x,y)=>new Date(y.changedAt||0)-new Date(x.changedAt||0)).map(h=>`<tr>
      <td style="font-family:monospace;font-size:11px">${_fmtDate(h.changedAt)}</td>
      <td>${h.from||'—'}</td>
      <td><span class="badge" style="${_condStyle(h.to)}">${h.to||'—'}</span></td>
      <td>${h.changedBy?.name||h.changedBy||'—'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

${a.notes ? `<h2>Notes</h2><div class="notes-box">${a.notes}</div>` : ''}

<div class="footer">
  <span>Generated by AssetSpatial — Federal Public Asset Management Department</span>
  <span>${new Date().toLocaleString('en-NG')}</span>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ── MDA PORTFOLIO REPORT ──────────────────────────────────────────────────────
async function generateMdaReport(mdaName) {
  let list;
  try {
    const r = await apiGetAssets({ mda: mdaName, limit: 500 });
    list = r.assets || [];
  } catch {
    list = (assets||[]).filter(a => a.mda === mdaName);
  }
  if (!list.length) { if(typeof toast==='function') toast('No assets found for this MDA'); return; }

  const total = list.length;
  const byCondition = ['Good','Fair','Poor','Critical',''].reduce((acc, c) => {
    acc[c||'Unassessed'] = list.filter(a => (a.condition||'') === c).length;
    return acc;
  }, {});
  const totalValue = list.reduce((s, a) => s + (a.valuation?.amount||0), 0);
  const withCoords = list.filter(a => a.lat || a.location?.coordinates?.[1]).length;
  const overdue = list.filter(a => a.nextInspection && new Date(a.nextInspection) < new Date());

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>MDA Report — ${mdaName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#0B1829;padding:40px}
  @media print{button{display:none!important}}
  h1{font-size:20px;font-weight:800;margin-bottom:4px}
  h2{font-size:13px;font-weight:700;margin:22px 0 10px;padding-bottom:5px;border-bottom:2px solid #0B2545;color:#0B2545;text-transform:uppercase;letter-spacing:.5px}
  .header{padding-bottom:16px;border-bottom:3px solid #4A90D9;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .kpi{background:#F4F6F9;border:1px solid #E8ECF0;border-radius:8px;padding:14px;text-align:center}
  .kpi-val{font-size:26px;font-weight:800;color:#0B2545}
  .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#5A6A7A;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#0B2545;color:#fff;padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:9px 12px;border-bottom:1px solid #E8ECF0}
  .badge{display:inline-block;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #E8ECF0;font-size:10px;color:#5A6A7A;display:flex;justify-content:space-between}
  .btn-print{position:fixed;top:20px;right:20px;background:#4A90D9;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600}
</style></head><body>
<button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>
<div class="header">
  <div>
    <div style="font-size:11px;color:#5A6A7A;text-transform:uppercase;letter-spacing:1px">MDA Portfolio Report</div>
    <h1>${mdaName}</h1>
    <div style="font-size:12px;color:#5A6A7A;margin-top:4px">Federal Public Asset Management Department</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#5A6A7A">
    <div>Report Date: ${_fmtDate(new Date())}</div>
    <div style="margin-top:4px">Total Portfolio Value: <strong style="color:#0B2545">${_fmtNaira(totalValue)}</strong></div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val">${total}</div><div class="kpi-label">Total Assets</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#2DB87B">${byCondition.Good||0}</div><div class="kpi-label">Good Condition</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#e05555">${(byCondition.Critical||0)+(byCondition.Poor||0)}</div><div class="kpi-label">Critical / Poor</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#f0a500">${overdue.length}</div><div class="kpi-label">Overdue Inspection</div></div>
</div>

<h2>Asset Register</h2>
<table>
  <thead><tr><th>Asset ID</th><th>Name</th><th>Type</th><th>State</th><th>Condition</th><th>Status</th><th>Value</th><th>Next Inspection</th></tr></thead>
  <tbody>
    ${list.map(a => {
      const cs = _condStyle(a.condition);
      const overdue = a.nextInspection && new Date(a.nextInspection) < new Date();
      return `<tr>
        <td style="font-family:monospace;font-size:10px">${a.assetId||a.id}</td>
        <td><strong>${a.name||'—'}</strong></td>
        <td>${a.type||'—'}</td>
        <td>${a.state||'—'}</td>
        <td><span class="badge" style="${cs}">${a.condition||'Unassessed'}</span></td>
        <td>${a.status||'Active'}</td>
        <td style="font-family:monospace;font-size:11px">${a.valuation?.amount?_fmtNaira(a.valuation.amount):'—'}</td>
        <td style="color:${overdue?'#e05555':'inherit'}">${a.nextInspection?a.nextInspection.slice(0,10):'—'}${overdue?' ⚠':''}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<div class="footer">
  <span>AssetSpatial — Federal Public Asset Management Department</span>
  <span>${new Date().toLocaleString('en-NG')}</span>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ── DEFERRED MAINTENANCE REPORT ───────────────────────────────────────────────
async function generateDeferredMaintenanceReport() {
  let list;
  try {
    const r = await apiGetAssets({ limit: 2000 });
    list = r.assets || [];
  } catch {
    list = assets || [];
  }

  const today = new Date();
  const overdue = list
    .filter(a => a.nextInspection && new Date(a.nextInspection) < today)
    .map(a => {
      const daysOverdue = Math.round((today - new Date(a.nextInspection)) / 86400000);
      const riskScore = typeof calcRiskScore === 'function' ? calcRiskScore(a) : 0;
      return { ...a, daysOverdue, riskScore };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>Deferred Maintenance Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#0B1829;padding:40px}
  @media print{button{display:none!important}}
  h1{font-size:20px;font-weight:800;margin-bottom:4px}
  h2{font-size:13px;font-weight:700;margin:22px 0 10px;padding-bottom:5px;border-bottom:2px solid #e05555;color:#a02020;text-transform:uppercase}
  .header{padding-bottom:16px;border-bottom:3px solid #e05555;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#a02020;color:#fff;padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:9px 12px;border-bottom:1px solid #E8ECF0}
  tr:nth-child(even) td{background:#fff5f5}
  .badge{display:inline-block;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #E8ECF0;font-size:10px;color:#5A6A7A;display:flex;justify-content:space-between}
  .btn-print{position:fixed;top:20px;right:20px;background:#e05555;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600}
  .summary{background:#fff5f5;border:1px solid rgba(224,85,85,.3);border-radius:8px;padding:16px;margin-bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center}
  .sum-val{font-size:28px;font-weight:800;color:#a02020}
  .sum-label{font-size:10px;text-transform:uppercase;color:#5A6A7A;margin-top:4px}
</style></head><body>
<button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>
<div class="header">
  <div style="font-size:11px;color:#a02020;text-transform:uppercase;letter-spacing:1px;font-weight:700">⚠ DEFERRED MAINTENANCE REPORT</div>
  <h1>Assets Overdue for Inspection</h1>
  <div style="font-size:12px;color:#5A6A7A;margin-top:4px">Generated: ${_fmtDate(new Date())} — Federal Public Asset Management Department</div>
</div>
<div class="summary">
  <div><div class="sum-val">${overdue.length}</div><div class="sum-label">Overdue Assets</div></div>
  <div><div class="sum-val">${overdue.filter(a=>a.condition==='Critical').length}</div><div class="sum-label">Critical Condition</div></div>
  <div><div class="sum-val">${overdue.length?Math.round(overdue.reduce((s,a)=>s+a.daysOverdue,0)/overdue.length):0}d</div><div class="sum-label">Avg Days Overdue</div></div>
</div>
${overdue.length ? `
<table>
  <thead><tr><th>Asset ID</th><th>Name</th><th>MDA</th><th>State</th><th>Condition</th><th>Days Overdue</th><th>Risk Score</th><th>Due Date</th></tr></thead>
  <tbody>
    ${overdue.map(a=>`<tr>
      <td style="font-family:monospace;font-size:10px">${a.assetId||a.id}</td>
      <td><strong>${a.name||'—'}</strong></td>
      <td style="font-size:11px">${a.mda||'—'}</td>
      <td>${a.state||'—'}</td>
      <td><span class="badge" style="${_condStyle(a.condition)}">${a.condition||'Unassessed'}</span></td>
      <td style="color:#a02020;font-weight:700;font-family:monospace">${a.daysOverdue} days</td>
      <td style="color:${a.riskScore>=60?'#e05555':a.riskScore>=30?'#f0a500':'#2DB87B'};font-weight:700">${a.riskScore}/100</td>
      <td style="font-family:monospace;font-size:11px">${a.nextInspection?.slice(0,10)||'—'}</td>
    </tr>`).join('')}
  </tbody>
</table>` : '<div style="text-align:center;padding:40px;color:#2DB87B;font-size:15px;font-weight:600">✅ No assets are overdue for inspection.</div>'}
<div class="footer">
  <span>AssetSpatial — Federal Public Asset Management Department</span>
  <span>${new Date().toLocaleString('en-NG')}</span>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
