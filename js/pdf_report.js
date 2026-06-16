// ── PDF REPORT — jsPDF production port ───────────────────────────────────────

async function generatePDFReport() {
  if (typeof window.jspdf === 'undefined') {
    toast('Loading PDF library…', 'fa-spinner', false);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => setTimeout(generatePDFReport, 300);
    document.head.appendChild(s);
    return;
  }

  const btn = document.getElementById('pdf-report-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Generating…'; }

  let allAssets = assets;
  try { const r = await apiGetAssets({ limit:1000 }); allAssets = r.assets || assets; } catch {}

  const { jsPDF }  = window.jspdf;
  const doc        = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W = 210, L = 16, R = 16, CW = W - L - R;
  const today = new Date().toLocaleDateString('en-NG', { day:'2-digit', month:'long', year:'numeric' });
  const orgName = (typeof settings !== 'undefined' && settings.org) || 'AssetSpatial Platform';

  const conds = ['Good','Fair','Poor','Critical'];
  const condRGB = [[0,135,83],[230,167,0],[255,107,53],[214,69,69]];
  const condCounts = conds.map(c => allAssets.filter(a=>a.condition===c).length);
  const types = ['Infrastructure','Land / Property','Utility','Environmental','Equipment'];

  // ── COVER ──
  doc.setFillColor(10, 15, 13); doc.rect(0,0,W,297,'F');
  doc.setFillColor(0,135,83); doc.rect(0,0,W,64,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(30); doc.text('ASSET MANAGEMENT', L, 30);
  doc.setFontSize(18); doc.text('PLATFORM REPORT', L, 44);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text(orgName, L, 56);

  doc.setTextColor(100,150,120); doc.setFontSize(9);
  doc.text(`Generated: ${today}`, L, 78);
  doc.text(`Total Assets: ${allAssets.length}`, L, 86);
  doc.text(`Field Agents: ${(typeof users!=='undefined'?users.filter(u=>u.role==='Field Agent').length:0)}`, L, 94);
  doc.text(`Critical Assets: ${condCounts[3]}`, L, 102);

  // KPI BOXES
  const kw = (CW - 9) / 4, ky = 114;
  conds.forEach((c, i) => {
    const x = L + i * (kw + 3);
    doc.setFillColor(...condRGB[i]); doc.roundedRect(x, ky, kw, 22, 2, 2, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(18);
    doc.text(String(condCounts[i]), x + kw/2, ky+13, { align:'center' });
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text(c.toUpperCase(), x + kw/2, ky+20, { align:'center' });
  });

  // By type summary
  doc.setTextColor(180,210,190); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('ASSET DISTRIBUTION BY TYPE', L, 148);
  doc.setDrawColor(0,135,83); doc.setLineWidth(0.4); doc.line(L, 150, W-R, 150);

  let ty = 158;
  const barMax = Math.max(...types.map(t=>allAssets.filter(a=>a.type===t).length), 1);
  types.forEach((t, i) => {
    const cnt = allAssets.filter(a=>a.type===t).length;
    const barW = cnt / barMax * (CW - 60);
    doc.setTextColor(180,210,190); doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text(t, L, ty);
    doc.setFillColor(0,135,83); doc.roundedRect(L+58, ty-5, barW||1, 5, 1, 1, 'F');
    doc.setTextColor(100,150,120); doc.text(String(cnt), L+58+barW+3, ty);
    ty += 10;
  });

  // ── PAGE 2: ASSET TABLE ──
  doc.addPage();
  doc.setFillColor(0,135,83); doc.rect(0,0,W,14,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('ASSET REGISTRY', L, 10);

  const COLS = ['ID','Name','Type','Condition','State','Captured'];
  const colW = [25, 50, 32, 22, 25, 24];
  let y = 22;

  // Header
  doc.setFillColor(20,30,25); doc.rect(L, y-5, CW, 8, 'F');
  doc.setTextColor(0,200,100); doc.setFontSize(7); doc.setFont('helvetica','bold');
  let cx = L;
  COLS.forEach((c, i) => { doc.text(c, cx+1, y); cx += colW[i]; });
  y += 6;

  doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
  allAssets.slice(0, 60).forEach((a, row) => {
    if (y > 278) { doc.addPage(); y = 16; }
    if (row % 2 === 0) { doc.setFillColor(15,25,18); doc.rect(L, y-4, CW, 7, 'F'); }
    const condRGBmap = { Good:[0,200,100], Fair:[230,167,0], Poor:[255,107,53], Critical:[214,69,69] };
    cx = L;
    const vals = [
      (a.assetId||a.id).slice(0,12),
      (a.name||'—').slice(0,28),
      (a.type||'—').slice(0,18),
      a.condition||'—',
      (a.state||'—').slice(0,12),
      (a.date||a.captureDate||'—').slice(0,10),
    ];
    vals.forEach((v, i) => {
      if (i === 3) { const rgb = condRGBmap[v]||[120,130,125]; doc.setTextColor(...rgb); }
      else doc.setTextColor(180,210,190);
      doc.text(String(v), cx+1, y);
      cx += colW[i];
    });
    y += 7;
  });

  if (allAssets.length > 60) {
    doc.setTextColor(80,120,100); doc.setFontSize(8);
    doc.text(`…and ${allAssets.length - 60} more assets not shown. Export full CSV for complete data.`, L, y+4);
  }

  // ── PAGE 3: SUMMARY ──
  doc.addPage();
  doc.setFillColor(0,135,83); doc.rect(0,0,W,14,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('SUMMARY & RECOMMENDATIONS', L, 10);

  y = 26;
  const recommendations = [
    condCounts[3] > 0 ? `Address ${condCounts[3]} critical asset(s) as a priority.` : 'No critical assets — maintain current inspection schedules.',
    condCounts[2] > 0 ? `${condCounts[2]} asset(s) in poor condition require maintenance budgeting.` : 'Poor condition assets are under control.',
    `${Math.round(condCounts[0]/Math.max(allAssets.length,1)*100)}% of assets are in good condition.`,
    `Ensure all assets have GPS coordinates for spatial analysis.`,
    `Schedule regular condition assessments for infrastructure and utility assets.`,
  ];

  recommendations.forEach((r, i) => {
    doc.setFillColor(20,35,25); doc.roundedRect(L, y-4, CW, 10, 2, 2, 'F');
    doc.setTextColor(0,200,100); doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text(String(i+1)+'.', L+3, y+2);
    doc.setTextColor(180,210,190); doc.setFont('helvetica','normal');
    doc.text(r, L+10, y+2, { maxWidth: CW-12 });
    y += 14;
  });

  // Footer
  doc.setTextColor(60,100,80); doc.setFontSize(7);
  doc.text(`AssetSpatial Platform · Generated ${today} · Federal Republic of Nigeria`, W/2, 290, { align:'center' });

  // Save
  const filename = `AssetSpatial_Report_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
  toast('PDF report downloaded');
  addAudit('EXPORT', 'ALL', null, `PDF report generated — ${allAssets.length} assets`);

  if (btn) { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-file-pdf"></i> Download PDF Report'; }
}
