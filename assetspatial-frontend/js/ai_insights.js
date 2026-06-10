// ── AI INSIGHTS — Anthropic API via claude-sonnet-4-20250514 ──────────────────

async function generateAIInsights() {
  if (!assets.length) { toast('Add assets first to generate insights', 'fa-triangle-exclamation', true); return; }

  const btn  = document.getElementById('ai-insights-btn');
  const cont = document.getElementById('ai-insights-container');
  if (!btn || !cont) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analysing…';
  cont.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text3)">
    <i class="fa-solid fa-wand-magic-sparkles" style="font-size:28px;margin-bottom:12px;display:block;color:var(--accent);animation:pulse 1.5s infinite"></i>
    <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:1.5px">Analysing your asset portfolio…</div>
  </div>`;

  const types = ['Infrastructure','Land / Property','Utility','Environmental','Equipment'];
  const conds = ['Good','Fair','Poor','Critical'];
  const portfolio = {
    total:    assets.length,
    byType:   types.map(t => ({ type:t, count: assets.filter(a=>a.type===t).length })),
    byCondition: conds.map(c => ({ condition:c, count: assets.filter(a=>a.condition===c).length })),
    byState:  [...assets.reduce((m,a) => { m.set(a.state||'Unknown',(m.get(a.state||'Unknown')||0)+1); return m; }, new Map())].map(([s,c])=>({state:s,count:c})).sort((a,b)=>b.count-a.count).slice(0,8),
    critical: assets.filter(a=>a.condition==='Critical').map(a=>({ name:a.name, type:a.type, state:a.state })).slice(0,5),
    overdue:  assets.filter(a=>a.nextInspection && new Date(a.nextInspection)<new Date()).length,
    fieldAgents: (typeof users !== 'undefined') ? users.filter(u=>u.role==='Field Agent').length : 0,
    recentCaptures: assets.filter(a=>(a.ts||0) > Date.now() - 7*86400000).length,
  };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are an expert asset management and GIS analyst specialising in Nigerian federal infrastructure. Respond ONLY with a valid JSON array — no markdown, no preamble, no code fences. Each element must be exactly: { "title": string (4 words max), "insight": string (2 sentences, actionable), "severity": "info"|"warning"|"critical"|"success", "action": string (what to do, 6 words max) }. Generate exactly 6 diverse insights covering condition, inspection compliance, geographic coverage, asset types, risk, and data quality.`,
        messages: [{ role:'user', content:`Analyse this Nigerian federal asset portfolio and generate 6 actionable management insights:\n${JSON.stringify(portfolio)}` }]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'API error');
    const raw     = data.content?.find(b=>b.type==='text')?.text || '[]';
    const clean   = raw.replace(/```json|```/g,'').trim();
    const insights = JSON.parse(clean);

    const SEV = {
      info:     { bg:'rgba(59,158,255,.08)', border:'rgba(59,158,255,.2)', color:'var(--info)',    icon:'fa-circle-info' },
      warning:  { bg:'rgba(240,180,0,.08)', border:'rgba(240,180,0,.2)',  color:'var(--warn)',    icon:'fa-triangle-exclamation' },
      critical: { bg:'rgba(224,85,85,.08)', border:'rgba(224,85,85,.2)',  color:'var(--danger)',  icon:'fa-circle-xmark' },
      success:  { bg:'rgba(0,200,100,.07)', border:'rgba(0,200,100,.2)',  color:'var(--accent)',  icon:'fa-circle-check' },
    };

    cont.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
      ${insights.map(ins => {
        const s = SEV[ins.severity] || SEV.info;
        return `<div style="background:${s.bg};border:1px solid ${s.border};border-radius:10px;padding:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <i class="fa-solid ${s.icon}" style="color:${s.color};font-size:14px"></i>
            <span style="font-family:'Space Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:${s.color}">${escHtml(ins.title)}</span>
          </div>
          <div style="font-size:12.5px;color:var(--text2);line-height:1.65;margin-bottom:10px">${escHtml(ins.insight)}</div>
          <div style="font-family:'Space Mono',monospace;font-size:9px;color:${s.color};border-top:1px solid ${s.border};padding-top:8px">
            <i class="fa-solid fa-arrow-right" style="margin-right:4px"></i>${escHtml(ins.action)}
          </div>
        </div>`;
      }).join('')}
    </div>`;

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Regenerate';
    toast('AI insights generated');
  } catch(e) {
    cont.innerHTML = `<div style="text-align:center;padding:24px;color:var(--danger);font-size:12px">
      <i class="fa-solid fa-triangle-exclamation" style="font-size:20px;margin-bottom:8px;display:block"></i>
      Could not generate insights: ${escHtml(e.message||'Unknown error')}
    </div>`;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI';
  }
}
