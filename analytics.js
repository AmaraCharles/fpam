// ── ANALYTICS PAGE ───────────────────────────────────────────────────────────
let _charts = {};

async function loadAnalytics() {
  // Destroy old charts
  Object.values(_charts).forEach(c => { try { c.destroy(); } catch {} });
  _charts = {};

  const days = parseInt(document.getElementById('days-select')?.value || '30');

  let byType = [], byState = [], byCondition = [], overtime = [], maintSpend = [], dashData = {};

  try {
    [byType, byState, byCondition, overtime, maintSpend, dashData] = await Promise.all([
      apiByType().then(r => r.byType || r || []),
      apiByState().then(r => r.byState || r || []),
      apiConditionBreakdown().then(r => r.breakdown || r || []),
      apiCapturesOverTime(days).then(r => r.data || r || []),
      apiMaintenanceSpend().then(r => r.spend || r || []),
      apiDashboard().then(r => r.summary || r || {}),
    ]);
  } catch {
    // Offline fallback
    const types = ['Infrastructure','Land / Property','Utility','Environmental','Equipment'];
    const conds = ['Good','Fair','Poor','Critical'];
    byType      = types.map(t => ({ _id:t, count: assets.filter(a=>a.type===t).length }));
    byCondition = conds.map(c => ({ _id:c, count: assets.filter(a=>a.condition===c).length }));
    byState     = [];
    overtime    = [];
    maintSpend  = [];
    dashData    = {
      total: assets.length,
      active: assets.filter(a=>a.status!=='Decommissioned').length,
      critical: assets.filter(a=>a.condition==='Critical').length,
    };
  }

  // KPIs
  const total    = dashData.total    ?? assets.length;
  const active   = dashData.active   ?? assets.filter(a=>a.status!=='Decommissioned').length;
  const critical = dashData.critical ?? assets.filter(a=>a.condition==='Critical').length;
  const poor     = assets.filter(a=>a.condition==='Poor').length;
  const value    = dashData.totalValueNGN;

  _set('an-total',    total);
  _set('an-active',   active);
  _set('an-critical', critical + poor);
  _set('an-value',    value ? '₦' + (value/1e9).toFixed(1) + 'B' : '—');

  // Colour scheme
  const COND_COLORS  = ['#00c864','#f0b400','rgba(240,120,0,.9)','#e05555'];
  const TYPE_COLORS  = ['#00c864','#3b9eff','#f0b400','rgba(240,120,0,.85)','#e05555'];
  const tickColor    = '#4d7a5e';
  const gridColor    = 'rgba(255,255,255,0.05)';

  // ── By Type bar ─────────────────────────────────────────────────────────────
  const typeLabels = byType.map(t => (t._id||'').split(' ')[0]);
  const typeCounts = byType.map(t => t.count);
  _mkChart('ch-type', 'bar', {
    labels: typeLabels,
    datasets: [{ data: typeCounts, backgroundColor: TYPE_COLORS, borderRadius: 6, borderSkipped: false }]
  }, { plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:tickColor,font:{size:10}},grid:{color:gridColor}}, y:{ticks:{color:tickColor,font:{size:10}},grid:{color:gridColor},beginAtZero:true} }});

  // ── Condition donut ──────────────────────────────────────────────────────────
  const condLabels = byCondition.map(c => c._id);
  const condCounts = byCondition.map(c => c.count);
  _mkChart('ch-cond', 'doughnut', {
    labels: condLabels.length ? condLabels : ['Good','Fair','Poor','Critical'],
    datasets: [{ data: condCounts.length ? condCounts : COND_COLORS.map((_,i) => assets.filter(a=>a.condition===(['Good','Fair','Poor','Critical'][i])).length), backgroundColor: COND_COLORS, borderWidth: 2, borderColor: 'var(--surface)', hoverOffset: 4 }]
  }, { cutout:'65%', plugins:{ legend:{ position:'right', labels:{ color:tickColor, font:{size:10}, padding:12 }}}});

  // ── Captures over time ───────────────────────────────────────────────────────
  let timeLabels, timeCounts;
  if (overtime.length) {
    timeLabels = overtime.map(d => (d._id?.slice(5) || d.date || ''));
    timeCounts = overtime.map(d => d.count);
  } else {
    timeLabels = Array.from({length:Math.min(days,30)},(_,i)=>{ const d=new Date(Date.now()-(days-1-i)*86400000); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); });
    timeCounts = timeLabels.map((_,i)=>{ const s=Date.now()-(days-1-i)*86400000; return assets.filter(a=>(a.ts||0)>=s&&(a.ts||0)<s+86400000).length; });
    // Thin out if > 30 points
    if (timeLabels.length > 12) { const step = Math.ceil(timeLabels.length/12); timeLabels=timeLabels.filter((_,i)=>i%step===0||i===timeLabels.length-1); timeCounts=timeCounts.filter((_,i)=>i%step===0||i===timeCounts.length-1); }
  }
  _mkChart('ch-time', 'line', {
    labels: timeLabels,
    datasets: [{ data: timeCounts, borderColor:'#00c864', backgroundColor:'rgba(0,200,100,0.08)', tension:0.4, fill:true, pointRadius:3, pointBackgroundColor:'#00c864', borderWidth:2 }]
  }, { plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:tickColor,font:{size:9}},grid:{display:false}}, y:{ticks:{color:tickColor,font:{size:9}},grid:{color:gridColor},beginAtZero:true} }});

  // ── Geometry donut ───────────────────────────────────────────────────────────
  const geoms = ['Point','Polygon','Linear'];
  _mkChart('ch-geom', 'doughnut', {
    labels: geoms,
    datasets: [{ data: geoms.map(g=>assets.filter(a=>(a.geomType||a.geom)===g).length), backgroundColor:['#00c864','#3b9eff','#f0b400'], borderWidth:2, borderColor:'var(--surface)' }]
  }, { cutout:'60%', plugins:{ legend:{ position:'right', labels:{ color:tickColor, font:{size:10}, padding:10 }}}});

  // ── State table ──────────────────────────────────────────────────────────────
  const stateBody = document.getElementById('state-table');
  if (stateBody) {
    const stateData = byState.length
      ? byState.sort((a,b)=>b.count-a.count).slice(0,12)
      : [...assets.reduce((m,a)=>{ const s=a.state||'Unknown'; m.set(s,(m.get(s)||0)+1); return m; }, new Map())].map(([_id,count])=>({_id,count})).sort((a,b)=>b.count-a.count).slice(0,12);
    const tot = stateData.reduce((s,d)=>s+d.count,0)||1;
    stateBody.innerHTML = stateData.map(d=>`<tr>
      <td>${escHtml(d._id||'Unknown')}</td>
      <td style="font-family:'Space Mono',monospace;font-size:11px;color:var(--accent2)">${d.count}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;background:var(--surface2);border-radius:4px;height:4px;overflow:hidden">
            <div style="width:${Math.round(d.count/tot*100)}%;height:100%;background:var(--accent);border-radius:4px"></div>
          </div>
          <span style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;width:32px;text-align:right">${Math.round(d.count/tot*100)}%</span>
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text3)">No state data</td></tr>';
  }

  // ── Maintenance spend table ───────────────────────────────────────────────────
  const maintBody = document.getElementById('maint-table');
  if (maintBody) {
    if (maintSpend.length) {
      maintBody.innerHTML = maintSpend.slice(0,10).map(d=>`<tr>
        <td>${escHtml(d.assetName||d._id)}</td>
        <td style="font-family:'Space Mono',monospace;font-size:11px;color:var(--accent2)">₦${(d.totalCost||0).toLocaleString()}</td>
        <td style="text-align:center;color:var(--text3)">${d.logCount||0}</td>
      </tr>`).join('');
    } else {
      maintBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text3)">No maintenance data yet</td></tr>';
    }
  }
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _mkChart(id, type, data, options = {}) {
  const ctx = document.getElementById(id)?.getContext('2d');
  if (!ctx) return;
  _charts[id] = new Chart(ctx, {
    type, data,
    options: { responsive: true, maintainAspectRatio: false, ...options }
  });
}

// alias — app.js renderPage calls renderAnalytics; analytics.html calls loadAnalytics
const renderAnalytics = loadAnalytics;
