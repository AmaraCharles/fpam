// ── ASSET LIFECYCLE MANAGEMENT ────────────────────────────────────────────────
// Formal lifecycle: Draft → Active → Under Review → Scheduled for Disposal → Decommissioned
// Approval gates, disposal documents, transition audit trail.
// Works alongside the existing 'status' field — lifecycle state is stored
// in localStorage 'as_lifecycle' keyed by assetId, synced to asset notes/status
// on save so it survives backend roundtrips.

const LC_KEY = 'as_lifecycle';

const LC_STAGES = ['Draft','Active','Under Review','Scheduled for Disposal','Decommissioned'];
const LC_TRANSITIONS = {
  Draft:                    ['Active'],
  Active:                   ['Under Review','Under Maintenance'],
  'Under Maintenance':      ['Active'],
  'Under Review':           ['Active','Scheduled for Disposal'],
  'Scheduled for Disposal': ['Decommissioned','Active'],
  Decommissioned:           [],
};
const LC_COLORS = {
  Draft:                    '#5A6A7A',
  Active:                   '#2DB87B',
  'Under Maintenance':      '#f0a500',
  'Under Review':           '#4A90D9',
  'Scheduled for Disposal': '#e05555',
  Decommissioned:           '#2C3E50',
};
const LC_ICONS = {
  Draft:                    'fa-file-pen',
  Active:                   'fa-circle-check',
  'Under Maintenance':      'fa-wrench',
  'Under Review':           'fa-magnifying-glass',
  'Scheduled for Disposal': 'fa-trash-can-clock',
  Decommissioned:           'fa-ban',
};

function _getLifecycle() {
  try { return JSON.parse(localStorage.getItem(LC_KEY)) || {}; } catch { return {}; }
}
function _saveLifecycle(data) { localStorage.setItem(LC_KEY, JSON.stringify(data)); }

function getLcState(assetId) {
  // First check lifecycle store, then fall back to asset status
  const lc = _getLifecycle();
  if (lc[assetId]?.stage) return lc[assetId];
  // Bootstrap from existing status field
  const a = (assets||[]).find(x=>(x.assetId||x.id)===assetId);
  const stage = a?.status === 'Decommissioned' ? 'Decommissioned' :
                a?.status === 'Under Maintenance' ? 'Under Maintenance' :
                a?.status ? 'Active' : 'Draft';
  return { stage, history: [], documents: [] };
}

function setLcState(assetId, stage, note = '', docName = '') {
  const lc = _getLifecycle();
  if (!lc[assetId]) lc[assetId] = { stage: 'Draft', history: [], documents: [] };
  const prev = lc[assetId].stage;
  lc[assetId].stage = stage;
  lc[assetId].history = lc[assetId].history || [];
  lc[assetId].history.push({
    from: prev, to: stage,
    at: new Date().toISOString(),
    by: typeof getCurrentUser==='function' ? getCurrentUser()?.name||'Unknown' : 'Unknown',
    note,
    document: docName || null,
  });
  if (docName) {
    lc[assetId].documents = lc[assetId].documents || [];
    lc[assetId].documents.push({ name: docName, stage, at: new Date().toISOString() });
  }
  _saveLifecycle(lc);

  // Sync to backend status field
  const statusMap = {
    Active: 'Active', Draft: 'Active',
    'Under Maintenance': 'Under Maintenance',
    'Under Review': 'Under Maintenance',
    'Scheduled for Disposal': 'Disputed',
    Decommissioned: 'Decommissioned',
  };
  if (typeof apiUpdateAsset === 'function') {
    apiUpdateAsset(assetId, { status: statusMap[stage] || 'Active' }).catch(()=>{});
  }
  if (typeof addAudit === 'function') {
    addAudit('LIFECYCLE_TRANSITION', assetId, null, `${prev} → ${stage}${note?' · '+note:''}`);
  }

  // Push notification
  if (typeof pushNotification === 'function') {
    pushNotification({
      type: 'LIFECYCLE_CHANGE', assetId,
      title: 'Asset Lifecycle Changed',
      body: `Asset ${assetId} moved from ${prev} to ${stage}`,
      icon: LC_ICONS[stage]||'fa-arrows-rotate', color: LC_COLORS[stage]||'#4A90D9',
    });
  }
}

// ── RENDER LIFECYCLE PANEL ────────────────────────────────────────────────────
function renderLifecycleTab(assetId, containerEl) {
  if (!containerEl) return;
  const state = getLcState(assetId);
  const stage = state.stage;
  const next  = LC_TRANSITIONS[stage] || [];
  const hist  = (state.history || []).slice().reverse();
  const docs  = state.documents || [];

  containerEl.innerHTML = `
    <!-- Stage Progress Bar -->
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;position:relative;padding:0 10px">
        <div style="position:absolute;top:14px;left:20px;right:20px;height:3px;background:var(--border);z-index:0"></div>
        ${LC_STAGES.map((s, i) => {
          const active = s === stage;
          const past   = LC_STAGES.indexOf(stage) > i;
          const color  = LC_COLORS[s];
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;z-index:1">
            <div style="width:28px;height:28px;border-radius:50%;
              background:${active||past?color:'var(--surface2)'};
              border:3px solid ${active?color:past?color:'var(--border)'};
              display:flex;align-items:center;justify-content:center;
              box-shadow:${active?`0 0 0 4px ${color}33`:'none'};transition:all .3s">
              <i class="fa-solid ${LC_ICONS[s]||'fa-circle'}" style="font-size:11px;color:${active||past?'#fff':'var(--text3)'}"></i>
            </div>
            <div style="font-size:9px;text-align:center;max-width:60px;line-height:1.3;
              color:${active?color:past?'var(--text2)':'var(--text3)'};
              font-weight:${active?'700':'500'}">${s}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Current stage info -->
    <div style="background:${LC_COLORS[stage]}15;border:1px solid ${LC_COLORS[stage]}44;border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <i class="fa-solid ${LC_ICONS[stage]}" style="font-size:18px;color:${LC_COLORS[stage]}"></i>
      <div>
        <div style="font-size:14px;font-weight:700;color:${LC_COLORS[stage]}">${stage}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${_lcDescription(stage)}</div>
      </div>
    </div>

    <!-- Transition buttons -->
    ${next.length ? `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:10px">Advance to Next Stage</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${next.map(s => `
          <button class="btn btn-sm" style="background:${LC_COLORS[s]}18;color:${LC_COLORS[s]};border:1px solid ${LC_COLORS[s]}44"
            onclick="openLcTransitionModal('${assetId}','${s}')">
            <i class="fa-solid ${LC_ICONS[s]||'fa-arrow-right'}"></i> Move to ${s}
          </button>`).join('')}
      </div>
    </div>` : '<div style="font-size:12px;color:var(--text3);margin-bottom:20px">This asset is in a terminal stage and cannot be advanced further.</div>'}

    <!-- Documents -->
    ${docs.length ? `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:10px">Lifecycle Documents</div>
      ${docs.map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
        <i class="fa-solid fa-file-lines" style="color:var(--accent)"></i>
        <span style="flex:1;font-weight:500">${escHtml(d.name)}</span>
        <span style="font-size:10px;color:var(--text3)">${d.stage} · ${d.at?.slice(0,10)}</span>
      </div>`).join('')}
    </div>` : ''}

    <!-- History -->
    ${hist.length ? `
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:10px">Transition History</div>
      ${hist.map(h=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
        <i class="fa-solid fa-arrow-right-long" style="color:${LC_COLORS[h.to]||'var(--accent)'};font-size:11px;margin-top:2px;flex-shrink:0"></i>
        <div style="flex:1">
          <span style="font-weight:600;color:${LC_COLORS[h.to]||'var(--text)'}">${h.from} → ${h.to}</span>
          ${h.note?`<span style="color:var(--text3);margin-left:6px">· ${escHtml(h.note)}</span>`:''}
          <div style="font-size:10px;color:var(--text3);margin-top:2px;font-family:'Space Mono',monospace">${h.at?.slice(0,16)?.replace('T',' ')} · ${escHtml(h.by)}</div>
        </div>
      </div>`).join('')}
    </div>` : ''}`;
}

function openLcTransitionModal(assetId, targetStage) {
  if(typeof openModal!=='function') return;
  const needsDoc = ['Scheduled for Disposal','Decommissioned'].includes(targetStage);
  openModal(`Move to: ${targetStage}`,
    `<div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Reason / Notes</label>
        <textarea class="form-control" id="lc-note" rows="2" placeholder="Why is this asset being moved to this stage?"></textarea>
      </div>
      ${needsDoc?`<div class="form-group full">
        <label class="form-label">Supporting Document Name ${needsDoc?'(recommended)':''}</label>
        <input class="form-control" id="lc-doc" placeholder="e.g. ICPC Disposal Approval Letter">
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Record the name/reference of any approval document</div>
      </div>`:''}
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" style="background:${LC_COLORS[targetStage]}" onclick="_doLcTransition('${assetId}','${targetStage}')">
       <i class="fa-solid ${LC_ICONS[targetStage]||'fa-check'}"></i> Confirm
     </button>`
  );
}

function _doLcTransition(assetId, stage) {
  const note   = document.getElementById('lc-note')?.value.trim();
  const docName= document.getElementById('lc-doc')?.value.trim();
  setLcState(assetId, stage, note, docName);
  if(typeof toast==='function') toast(`Asset moved to: ${stage}`, 'fa-arrows-rotate');
  if(typeof closeModal==='function') closeModal();
  // Re-render lifecycle tab if visible
  const lcEl = document.getElementById('dtab-lifecycle') || document.getElementById('tab-lifecycle');
  if (lcEl && lcEl.style.display !== 'none') renderLifecycleTab(assetId, lcEl);
}

function _lcDescription(stage) {
  const d = {
    Draft:                    'Asset record created but not yet formally entered into registry',
    Active:                   'Asset is in active use and included in all operational reporting',
    'Under Maintenance':      'Asset is temporarily out of service for maintenance or repair',
    'Under Review':           'Asset is under formal review — may be recommended for disposal',
    'Scheduled for Disposal': 'Disposal approved — awaiting completion of disposal procedure (ICPC/BPP)',
    Decommissioned:           'Asset has been formally decommissioned and removed from active registry',
  };
  return d[stage] || '';
}
