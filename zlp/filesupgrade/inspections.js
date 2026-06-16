// ── INSPECTION WORKFLOW ENGINE ────────────────────────────────────────────────
// Statuses: Scheduled → Assigned → In Progress → Submitted → Approved / Rejected
// Stored in localStorage under 'as_inspections' (synced to backend when available).

const INSP_KEY = 'as_inspections';
const INSP_STATUSES = ['Scheduled','Assigned','In Progress','Submitted','Approved','Rejected'];
const INSP_STATUS_COLOR = {
  Scheduled:   '#5A6A7A',
  Assigned:    '#4A90D9',
  'In Progress':'#f0a500',
  Submitted:   '#9b59b6',
  Approved:    '#2DB87B',
  Rejected:    '#e05555',
};

function _getInspections() {
  try { return JSON.parse(localStorage.getItem(INSP_KEY)) || []; } catch { return []; }
}
function _saveInspections(list) {
  localStorage.setItem(INSP_KEY, JSON.stringify(list));
}
function _inspId() {
  return 'INS-' + Date.now().toString(36).toUpperCase();
}

// ── CREATE INSPECTION ─────────────────────────────────────────────────────────
function openScheduleInspection(assetId, assetName) {
  if (typeof openModal !== 'function') return;

  openModal('Schedule Inspection',
    `<div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Asset</label>
        <input class="form-control" value="${escHtml(assetName||assetId)}" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Scheduled Date *</label>
        <input class="form-control" type="date" id="insp-date" value="${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}">
      </div>
      <div class="form-group">
        <label class="form-label">Inspection Type</label>
        <select class="form-control" id="insp-type">
          <option>Routine</option><option>Condition Assessment</option>
          <option>Post-Maintenance</option><option>Emergency</option><option>Annual</option>
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Assign To (Agent Name)</label>
        <input class="form-control" id="insp-agent" placeholder="Enter field agent name">
      </div>
      <div class="form-group full">
        <label class="form-label">Notes / Instructions</label>
        <textarea class="form-control" id="insp-notes" rows="2" placeholder="What should the agent check?"></textarea>
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="scheduleInspection('${assetId}','${escHtml(assetName||assetId)}')">
       <i class="fa-solid fa-calendar-plus"></i> Schedule
     </button>`
  );
}

function scheduleInspection(assetId, assetName) {
  const date  = document.getElementById('insp-date')?.value;
  const type  = document.getElementById('insp-type')?.value;
  const agent = document.getElementById('insp-agent')?.value.trim();
  const notes = document.getElementById('insp-notes')?.value.trim();
  if (!date) { if(typeof toast==='function') toast('Set a scheduled date', 'fa-triangle-exclamation', true); return; }

  const list = _getInspections();
  const insp = {
    id:          _inspId(),
    assetId,
    assetName,
    type,
    scheduledDate: date,
    assignedTo:  agent || null,
    status:      agent ? 'Assigned' : 'Scheduled',
    notes,
    createdAt:   new Date().toISOString(),
    createdBy:   typeof getCurrentUser === 'function' ? (getCurrentUser()?.name || 'Unknown') : 'Unknown',
    history:     [{ status: agent ? 'Assigned' : 'Scheduled', at: new Date().toISOString(), by: typeof getCurrentUser === 'function' ? getCurrentUser()?.name : 'System' }],
  };
  list.push(insp);
  _saveInspections(list);

  // Also update asset's nextInspection date
  if (typeof apiUpdateAsset === 'function') {
    apiUpdateAsset(assetId, { nextInspection: date }).catch(() => {});
  }

  if(typeof toast==='function') toast(`Inspection scheduled for ${date}`, 'fa-calendar-check');
  if(typeof closeModal==='function') closeModal();
  if(typeof addAudit==='function') addAudit('INSPECTION_SCHEDULED', assetId, null, `${type} inspection scheduled for ${date}`);

  // Refresh if we're on the inspections page
  if (document.getElementById('inspections-table')) renderInspectionsTable();
}

// ── SUBMIT INSPECTION REPORT ──────────────────────────────────────────────────
function openSubmitInspection(inspId) {
  const list = _getInspections();
  const insp = list.find(i => i.id === inspId);
  if (!insp) return;

  openModal(`Submit Report — ${insp.assetName}`,
    `<div class="form-grid">
      <div class="form-group">
        <label class="form-label">Condition Found *</label>
        <select class="form-control" id="sub-cond">
          <option value="">— Select —</option>
          ${['Good','Fair','Poor','Critical'].map(c=>`<option>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Inspection Date</label>
        <input class="form-control" type="date" id="sub-date" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="form-group full">
        <label class="form-label">Findings *</label>
        <textarea class="form-control" id="sub-findings" rows="3" placeholder="Describe what was observed"></textarea>
      </div>
      <div class="form-group full">
        <label class="form-label">Recommendations</label>
        <textarea class="form-control" id="sub-reco" rows="2" placeholder="Any maintenance or repair recommendations"></textarea>
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="submitInspectionReport('${inspId}')">
       <i class="fa-solid fa-paper-plane"></i> Submit for Review
     </button>`
  );
}

function submitInspectionReport(inspId) {
  const condition = document.getElementById('sub-cond')?.value;
  const date      = document.getElementById('sub-date')?.value;
  const findings  = document.getElementById('sub-findings')?.value.trim();
  const reco      = document.getElementById('sub-reco')?.value.trim();
  if (!condition || !findings) { if(typeof toast==='function') toast('Condition and findings are required', 'fa-triangle-exclamation', true); return; }

  const list = _getInspections();
  const insp = list.find(i => i.id === inspId);
  if (!insp) return;

  insp.status = 'Submitted';
  insp.report = { condition, date, findings, recommendations: reco, submittedAt: new Date().toISOString() };
  insp.history.push({ status: 'Submitted', at: new Date().toISOString(), by: typeof getCurrentUser === 'function' ? getCurrentUser()?.name : 'Agent' });
  _saveInspections(list);

  if(typeof toast==='function') toast('Report submitted for supervisor review', 'fa-paper-plane');
  if(typeof closeModal==='function') closeModal();
  if(typeof addAudit==='function') addAudit('INSPECTION_SUBMITTED', insp.assetId, null, `Condition: ${condition}`);
  if (document.getElementById('inspections-table')) renderInspectionsTable();
}

// ── APPROVE / REJECT ──────────────────────────────────────────────────────────
function approveInspection(inspId) {
  const list = _getInspections();
  const insp = list.find(i => i.id === inspId);
  if (!insp || !insp.report) return;

  insp.status = 'Approved';
  insp.history.push({ status: 'Approved', at: new Date().toISOString(), by: typeof getCurrentUser === 'function' ? getCurrentUser()?.name : 'Supervisor' });
  _saveInspections(list);

  // Update asset condition with approved finding
  if (typeof apiUpdateAsset === 'function') {
    apiUpdateAsset(insp.assetId, {
      condition: insp.report.condition,
      previousCondition: undefined,
      lastInspection: insp.report.date,
      notes: insp.report.recommendations || undefined,
    }).catch(() => {});
  }

  if(typeof toast==='function') toast('Inspection approved — asset condition updated', 'fa-circle-check');
  if(typeof addAudit==='function') addAudit('INSPECTION_APPROVED', insp.assetId, null, `Condition set to ${insp.report.condition}`);
  renderInspectionsTable();
}

function rejectInspection(inspId, reason) {
  const list = _getInspections();
  const insp = list.find(i => i.id === inspId);
  if (!insp) return;
  insp.status = 'Rejected';
  insp.rejectionReason = reason || 'No reason given';
  insp.history.push({ status: 'Rejected', at: new Date().toISOString(), by: typeof getCurrentUser === 'function' ? getCurrentUser()?.name : 'Supervisor', note: reason });
  _saveInspections(list);
  if(typeof toast==='function') toast('Inspection rejected', 'fa-circle-xmark', true);
  renderInspectionsTable();
}

// ── RENDER TABLE ──────────────────────────────────────────────────────────────
function renderInspectionsTable(filter = '') {
  const tbody = document.getElementById('inspections-table');
  if (!tbody) return;

  let list = _getInspections();
  if (filter) list = list.filter(i => i.status === filter);
  list = list.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">
      No inspections found. <button class="btn btn-primary btn-sm" style="margin-left:10px" onclick="openScheduleInspectionPicker()">
        <i class="fa-solid fa-plus"></i> Schedule One
      </button>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(insp => {
    const color = INSP_STATUS_COLOR[insp.status] || '#5A6A7A';
    const today = new Date().toISOString().slice(0,10);
    const overdue = insp.scheduledDate < today && !['Submitted','Approved','Rejected'].includes(insp.status);
    return `<tr>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">${insp.id}</td>
      <td>
        <div style="font-weight:600;font-size:13px">${escHtml(insp.assetName||insp.assetId)}</div>
        <div style="font-size:10px;color:var(--text3)">${escHtml(insp.assetId)}</div>
      </td>
      <td style="font-size:12px">${escHtml(insp.type)}</td>
      <td style="font-family:'Space Mono',monospace;font-size:11px;color:${overdue?'#e05555':'inherit'}">
        ${insp.scheduledDate}${overdue?'<span style="color:#e05555;font-size:9px;margin-left:4px;font-weight:700">OVERDUE</span>':''}
      </td>
      <td style="font-size:12px">${escHtml(insp.assignedTo||'—')}</td>
      <td>
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;background:${color}22;color:${color}">
          ${insp.status}
        </span>
      </td>
      <td style="font-size:11px;color:var(--text3)">${escHtml(insp.report?.condition||'—')}</td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${insp.status === 'Scheduled' || insp.status === 'Assigned' || insp.status === 'In Progress'
            ? `<button class="btn btn-ghost btn-xs" onclick="openSubmitInspection('${insp.id}')"><i class="fa-solid fa-paper-plane"></i> Submit</button>`
            : ''}
          ${insp.status === 'Submitted'
            ? `<button class="btn btn-primary btn-xs" onclick="approveInspection('${insp.id}')"><i class="fa-solid fa-check"></i> Approve</button>
               <button class="btn btn-danger btn-xs" onclick="rejectInspection('${insp.id}','')"><i class="fa-solid fa-xmark"></i> Reject</button>`
            : ''}
          ${insp.report?.findings
            ? `<button class="btn btn-ghost btn-xs" onclick="viewInspectionReport('${insp.id}')"><i class="fa-solid fa-eye"></i></button>`
            : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function viewInspectionReport(inspId) {
  const list = _getInspections();
  const insp = list.find(i => i.id === inspId);
  if (!insp || !insp.report) return;
  const r = insp.report;
  if(typeof openModal !== 'function') return;
  openModal(`Inspection Report — ${insp.assetName}`,
    `<div style="font-size:13px;display:grid;gap:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Type</div><div style="font-weight:600">${insp.type}</div></div>
        <div><div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Date</div><div style="font-weight:600">${r.date||'—'}</div></div>
        <div><div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Condition Found</div><div style="font-weight:700;color:${r.condition==='Good'?'#2DB87B':r.condition==='Critical'?'#e05555':'#f0a500'}">${r.condition}</div></div>
        <div><div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Agent</div><div style="font-weight:600">${insp.assignedTo||'—'}</div></div>
      </div>
      <div><div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Findings</div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;line-height:1.6">${escHtml(r.findings)}</div>
      </div>
      ${r.recommendations?`<div><div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Recommendations</div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;line-height:1.6">${escHtml(r.recommendations)}</div>
      </div>`:''}
      <div><div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-bottom:6px">Status History</div>
        ${insp.history.map(h=>`<div style="display:flex;gap:8px;font-size:11px;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="font-family:'Space Mono',monospace;color:var(--text3)">${h.at?.slice(0,16)?.replace('T',' ')}</span>
          <span style="font-weight:600">${h.status}</span>
          <span style="color:var(--text3)">· ${h.by}</span>
          ${h.note?`<span style="color:#e05555">— ${h.note}</span>`:''}
        </div>`).join('')}
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`
  );
}

// ── OPEN PICKER (no assetId known) ────────────────────────────────────────────
function openScheduleInspectionPicker() {
  if(typeof openModal !== 'function') return;
  openModal('Schedule Inspection',
    `<div class="form-group full">
      <label class="form-label">Asset ID</label>
      <input class="form-control" id="insp-picker-id" placeholder="e.g. AST-1004">
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Enter the Asset ID to schedule an inspection for it</div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="openScheduleInspection(document.getElementById('insp-picker-id').value,'Asset '+document.getElementById('insp-picker-id').value)">
       <i class="fa-solid fa-arrow-right"></i> Continue
     </button>`
  );
}

// ── DASHBOARD SUMMARY (inject into dashboard page) ────────────────────────────
function renderInspectionSummaryWidget() {
  const el = document.getElementById('inspection-widget');
  if (!el) return;
  const list = _getInspections();
  const today = new Date().toISOString().slice(0,10);
  const overdue  = list.filter(i => i.scheduledDate < today && !['Submitted','Approved','Rejected'].includes(i.status));
  const pending  = list.filter(i => i.status === 'Submitted');
  const upcoming = list.filter(i => i.scheduledDate >= today && !['Approved','Rejected'].includes(i.status));

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
      <div style="text-align:center;background:rgba(224,85,85,.08);border:1px solid rgba(224,85,85,.2);border-radius:8px;padding:12px">
        <div style="font-size:24px;font-weight:800;color:#e05555">${overdue.length}</div>
        <div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-top:2px">Overdue</div>
      </div>
      <div style="text-align:center;background:rgba(155,89,182,.08);border:1px solid rgba(155,89,182,.2);border-radius:8px;padding:12px">
        <div style="font-size:24px;font-weight:800;color:#9b59b6">${pending.length}</div>
        <div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-top:2px">Awaiting Review</div>
      </div>
      <div style="text-align:center;background:rgba(74,144,217,.08);border:1px solid rgba(74,144,217,.2);border-radius:8px;padding:12px">
        <div style="font-size:24px;font-weight:800;color:#4A90D9">${upcoming.length}</div>
        <div style="font-size:10px;text-transform:uppercase;color:var(--text3);margin-top:2px">Upcoming</div>
      </div>
    </div>
    ${overdue.slice(0,3).map(i=>`
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <i class="fa-solid fa-circle-exclamation" style="color:#e05555;font-size:11px;flex-shrink:0"></i>
        <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(i.assetName||i.assetId)}</div>
          <div style="font-size:10px;color:var(--text3)">${i.type} · Due ${i.scheduledDate}</div>
        </div>
        <button class="btn btn-ghost btn-xs" onclick="openSubmitInspection('${i.id}')">Submit</button>
      </div>`).join('')}
    <div style="margin-top:10px"><a href="inspections.html" style="font-size:12px;color:var(--accent);text-decoration:none;font-weight:600">View all inspections →</a></div>`;
}
