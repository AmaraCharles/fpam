// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
let _auditPage = 1;
const _auditLimit = 50;

async function loadAudit() {
  _auditPage = 1;
  await _fetchAudit();
}

async function _fetchAudit() {
  const params = { limit: _auditLimit, page: _auditPage };
  const action  = document.getElementById('f-action')?.value;
  const entity  = document.getElementById('f-entity')?.value;
  const from    = document.getElementById('f-from')?.value;
  const to      = document.getElementById('f-to')?.value;
  if (action) params.action = action;
  if (entity) params.entityType = entity;
  if (from)   params.from = from;
  if (to)     params.to   = to;

  let logs = [...auditLog].reverse();
  let total = logs.length;

  try {
    const r = await apiGetAudit(params);
    logs  = r.logs  || logs;
    total = r.total || total;
  } catch {}

  // Client-side filter fallback
  if (action) logs = logs.filter(l => (l.action||'').includes(action));
  if (from)   logs = logs.filter(l => new Date(l.ts||l.timestamp) >= new Date(from));
  if (to)     logs = logs.filter(l => new Date(l.ts||l.timestamp) <= new Date(to+'T23:59:59'));

  renderAuditTable(logs);
  renderAuditPagination(total);

  const info = document.getElementById('audit-info');
  if (info) info.textContent = `Showing ${logs.length} of ${total} entries`;
}

const ACTION_COLORS = {
  ASSET_CREATED:'tag-green', ASSET_UPDATED:'tag-blue', ASSET_DELETED:'tag-red',
  USER_CREATED:'tag-blue', USER_UPDATED:'tag-blue', USER_REMOVED:'tag-red',
  USER_LOGIN:'tag-gray', USER_LOGOUT:'tag-gray',
  EXPORT:'tag-gray', BULK_DELETE:'tag-red', BULK_EXPORT:'tag-gray',
  OCR_SCAN:'tag-orange', EXCEL_IMPORT:'tag-orange',
  SETTINGS_CHANGED:'tag-warn', ROLE_CONFIG_CHANGED:'tag-warn',
  MAINTENANCE_LOGGED:'tag-blue', VALUATION_UPDATED:'tag-blue',
  PHOTO_ATTACHED:'tag-teal', PHOTO_DELETED:'tag-red',
};
const ACTION_ICONS = {
  ASSET_CREATED:'fa-circle-plus', ASSET_UPDATED:'fa-pen', ASSET_DELETED:'fa-trash',
  USER_CREATED:'fa-user-plus', USER_REMOVED:'fa-user-minus',
  USER_LOGIN:'fa-arrow-right-to-bracket', USER_LOGOUT:'fa-arrow-right-from-bracket',
  EXPORT:'fa-download', BULK_DELETE:'fa-trash-can',
  OCR_SCAN:'fa-magnifying-glass', EXCEL_IMPORT:'fa-file-excel',
  SETTINGS_CHANGED:'fa-gear', ROLE_CONFIG_CHANGED:'fa-shield-halved',
  MAINTENANCE_LOGGED:'fa-wrench', PHOTO_ATTACHED:'fa-camera',
};

function renderAuditTable(logs) {
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:36px">
      <div class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
      <div class="empty-title">No audit entries</div>
      <div class="empty-sub">Actions on the platform will appear here</div>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map((l, i) => {
    const action  = l.action || '';
    const entity  = l.entityId || l.entity || '—';
    const eType   = l.entityType || entity.startsWith('AST-') ? 'Asset' : entity.startsWith('USR-') ? 'User' : '—';
    const user    = l.performedBy?.name || l.user || '—';
    const ip      = l.ipAddress || '—';
    const detail  = l.detail || '';
    const ts      = new Date(l.ts || l.timestamp || Date.now()).toLocaleString('en-NG');
    const icon    = ACTION_ICONS[action] || 'fa-circle-dot';
    const tagCls  = ACTION_COLORS[action] || 'tag-gray';
    return `<tr>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">#${i+1}</td>
      <td><span class="tag ${tagCls}" style="gap:5px"><i class="fa-solid ${icon}" style="font-size:9px"></i> ${action.replace(/_/g,' ')}</span></td>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3)">${escHtml(entity)}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(user)}</td>
      <td style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3)">${escHtml(ip)}</td>
      <td style="font-family:'Space Mono',monospace;font-size:9px;color:var(--text3);white-space:nowrap">${ts}</td>
      <td style="font-size:12px;color:var(--text2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(detail)}</td>
    </tr>`;
  }).join('');
}

function renderAuditPagination(total) {
  const pages = Math.ceil(total / _auditLimit);
  if (pages <= 1) { const p = document.getElementById('audit-pagination'); if (p) p.innerHTML = ''; return; }
  const pag = document.getElementById('audit-pagination');
  if (!pag) return;
  pag.innerHTML = Array.from({length: Math.min(pages, 8)}, (_, i) => i + 1).map(p =>
    `<button class="btn btn-${p === _auditPage ? 'primary' : 'ghost'} btn-xs" onclick="_auditPage=${p};_fetchAudit()">${p}</button>`
  ).join('');
}

// Re-export renderAudit as alias for backward compat
const renderAudit = loadAudit;
