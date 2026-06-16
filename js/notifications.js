// ── NOTIFICATIONS & ALERTS SYSTEM ────────────────────────────────────────────
// Guard against double-loading (script included on multiple pages)
if (typeof window._AS_NOTIF_LOADED !== 'undefined') {
  // Already loaded — skip re-declaration
} else {
window._AS_NOTIF_LOADED = true;


const NOTIF_KEY = 'as_notifications';
const NOTIF_READ_KEY = 'as_notif_read';

function _getNotifications() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || []; } catch { return []; }
}
function _saveNotifications(list) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, 200))); // cap at 200
}
function _getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIF_READ_KEY)) || []); } catch { return new Set(); }
}
function _markRead(id) {
  const ids = _getReadIds();
  ids.add(id);
  localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...ids]));
}
function _markAllRead() {
  const notifs = _getNotifications();
  const ids = notifs.map(n => n.id);
  localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(ids));
  updateNotifBadge();
}

function _newNotifId() { return 'N-' + Date.now() + '-' + Math.random().toString(36).slice(2,6); }

function pushNotification({ type, title, body, assetId, icon, color }) {
  const notifs = _getNotifications();
  // Deduplicate: don't push same type+assetId within 24h
  const recent = Date.now() - 86400000;
  if (assetId && notifs.some(n => n.type === type && n.assetId === assetId && n.ts > recent)) return;

  notifs.unshift({
    id:      _newNotifId(),
    type,
    title,
    body,
    assetId: assetId || null,
    icon:    icon || 'fa-bell',
    color:   color || 'var(--accent)',
    ts:      Date.now(),
  });
  _saveNotifications(notifs);
  updateNotifBadge();
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
function updateNotifBadge() {
  const notifs = _getNotifications();
  const readIds = _getReadIds();
  const unread = notifs.filter(n => !readIds.has(n.id)).length;

  document.querySelectorAll('.notif-badge').forEach(el => {
    el.textContent = unread > 99 ? '99+' : unread;
    el.style.display = unread > 0 ? '' : 'none';
  });
  document.querySelectorAll('.notif-badge-count').forEach(el => { el.textContent = unread; });
}

// ── NOTIFICATION CENTRE PANEL ─────────────────────────────────────────────────
// Store navigate-after-read target separately to avoid inline JS timing issues
window._notifNavigateTo = null;

function _notifItemClick(notifId, assetId) {
  _markRead(notifId);
  const panel = document.getElementById('notif-panel');
  if (assetId) {
    // Navigate immediately — don't re-render first
    if (panel) panel.remove();
    window.location.href = 'asset-view.html?id=' + encodeURIComponent(assetId);
  } else {
    if (panel) renderNotifPanel(panel);
  }
}

function toggleNotifPanel() {
  const existing = document.getElementById('notif-panel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = [
    'position:fixed', 'top:68px', 'right:20px', 'width:360px', 'max-height:520px',
    'background:#fff', 'border:1px solid var(--border,#E8ECF0)',
    'border-radius:14px', 'box-shadow:0 8px 40px rgba(0,0,0,.15)',
    'z-index:9000', 'display:flex', 'flex-direction:column', 'overflow:hidden',
    "font-family:'Plus Jakarta Sans',sans-serif",
  ].join(';');
  document.body.appendChild(panel);
  renderNotifPanel(panel);

  // Outside-click to close — use capture so it fires before other handlers
  const outsideClose = (e) => {
    const bell = document.getElementById('notif-bell');
    if (!panel.contains(e.target) && (!bell || !bell.contains(e.target))) {
      panel.remove();
      document.removeEventListener('click', outsideClose, true);
    }
  };
  // Delay by one frame so the click that opened it doesn't immediately close it
  setTimeout(() => document.addEventListener('click', outsideClose, true), 0);
}

function renderNotifPanel(panel) {
  if (!panel) return;
  const notifs  = _getNotifications();
  const readIds = _getReadIds();
  const unread  = notifs.filter(n => !readIds.has(n.id)).length;

  panel.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--border,#E8ECF0);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:14px;font-weight:700;color:var(--text,#0B1829)">
        Notifications
        ${unread > 0 ? `<span style="background:#e05555;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px;margin-left:6px">${unread}</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${unread > 0 ? `<button onclick="_markAllRead();renderNotifPanel(document.getElementById('notif-panel'))"
          style="background:none;border:none;color:var(--accent,#4A90D9);font-size:11px;cursor:pointer;font-weight:600;font-family:inherit">
          Mark all read</button>` : ''}
        <button onclick="clearAllNotifications()"
          style="background:none;border:none;color:var(--text3,#5A6A7A);font-size:11px;cursor:pointer;font-family:inherit">
          Clear all</button>
      </div>
    </div>
    <div style="overflow-y:auto;flex:1">
      ${!notifs.length
        ? `<div style="text-align:center;padding:40px 20px;color:var(--text3,#5A6A7A);font-size:13px">
            <i class="fa-solid fa-bell-slash" style="font-size:28px;display:block;margin-bottom:10px;opacity:.4"></i>
            No notifications yet
           </div>`
        : notifs.slice(0, 50).map(n => {
            const isRead  = readIds.has(n.id);
            const ago     = _timeAgo(n.ts);
            const color   = n.color || '#4A90D9';
            const hoverBg = 'rgba(74,144,217,.06)';
            const baseBg  = isRead ? 'transparent' : 'rgba(74,144,217,.03)';
            const hasLink = !!n.assetId;
            return `
              <div onclick="_notifItemClick('${n.id}',${n.assetId ? `'${n.assetId}'` : 'null'})"
                style="padding:12px 16px;border-bottom:1px solid var(--border,#E8ECF0);
                  cursor:${hasLink ? 'pointer' : 'default'};display:flex;gap:10px;align-items:flex-start;
                  background:${baseBg};transition:background .12s"
                onmouseover="this.style.background='${hoverBg}'"
                onmouseout="this.style.background='${baseBg}'">
                <div style="width:34px;height:34px;border-radius:9px;background:${color}18;
                  display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">
                  <i class="fa-solid ${n.icon || 'fa-bell'}" style="font-size:13px;color:${color}"></i>
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:${isRead ? '500' : '700'};color:var(--text,#0B1829);margin-bottom:2px;line-height:1.4">
                    ${escHtml(n.title)}
                  </div>
                  <div style="font-size:11px;color:var(--text3,#5A6A7A);line-height:1.5">${escHtml(n.body)}</div>
                  <div style="display:flex;align-items:center;gap:6px;margin-top:5px">
                    <span style="font-size:10px;color:var(--text3,#5A6A7A)">${ago}</span>
                    ${hasLink ? `<span style="font-size:10px;color:var(--accent,#4A90D9);font-weight:600">View asset →</span>` : ''}
                  </div>
                </div>
                ${!isRead ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--accent,#4A90D9);flex-shrink:0;margin-top:6px"></div>` : ''}
              </div>`;
          }).join('')}
    </div>
    <div style="padding:10px 16px;border-top:1px solid var(--border,#E8ECF0);text-align:center;flex-shrink:0">
      <a href="assets.html" style="font-size:12px;color:var(--accent,#4A90D9);font-weight:600;text-decoration:none">
        View all assets →
      </a>
    </div>`;
}

function clearAllNotifications() {
  _saveNotifications([]);
  localStorage.removeItem(NOTIF_READ_KEY);
  updateNotifBadge();
  const panel = document.getElementById('notif-panel');
  if (panel) renderNotifPanel(panel);
}

function _timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.round(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.round(diff/3600000) + 'h ago';
  if (diff < 604800000) return Math.round(diff/86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-NG');
}

// ── AUTO-GENERATE ALERTS ──────────────────────────────────────────────────────
async function runAlertScan() {
  let list = [];
  try {
    const r = await apiGetAssets({ limit: 2000 });
    list = r.assets || [];
  } catch { list = assets || []; }

  const today = new Date();
  const soon  = new Date(today.getTime() + 7*86400000);

  list.forEach(a => {
    const id = a.assetId || a.id;

    // Overdue inspections
    if (a.nextInspection && new Date(a.nextInspection) < today) {
      const daysOver = Math.round((today - new Date(a.nextInspection)) / 86400000);
      pushNotification({
        type: 'INSPECTION_OVERDUE', assetId: id,
        title: 'Inspection Overdue',
        body: `${a.name||id} is ${daysOver} day${daysOver!==1?'s':''} overdue for inspection`,
        icon: 'fa-calendar-xmark', color: '#e05555',
      });
    }
    // Upcoming within 7 days
    else if (a.nextInspection && new Date(a.nextInspection) <= soon) {
      pushNotification({
        type: 'INSPECTION_DUE', assetId: id,
        title: 'Inspection Due Soon',
        body: `${a.name||id} inspection due ${a.nextInspection.slice(0,10)}`,
        icon: 'fa-calendar-clock', color: '#f0a500',
      });
    }

    // Critical condition
    if (a.condition === 'Critical') {
      pushNotification({
        type: 'CRITICAL_CONDITION', assetId: id,
        title: 'Critical Asset',
        body: `${a.name||id} is in Critical condition — immediate attention required`,
        icon: 'fa-triangle-exclamation', color: '#e05555',
      });
    }

    // No coordinates
    if (!a.lat && !a.location?.coordinates?.[1]) {
      pushNotification({
        type: 'MISSING_COORDS', assetId: id,
        title: 'Missing GPS Coordinates',
        body: `${a.name||id} has no coordinates — capture GPS to place on map`,
        icon: 'fa-location-slash', color: '#5A6A7A',
      });
    }
  });

  updateNotifBadge();
}

// ── INJECT BELL BUTTON INTO HEADER ───────────────────────────────────────────
function injectNotifBell() {
  const header = document.getElementById('header');
  if (!header || document.getElementById('notif-bell')) return;

  const btn = document.createElement('button');
  btn.id = 'notif-bell';
  btn.onclick = toggleNotifPanel;
  btn.title = 'Notifications';
  btn.style.cssText = [
    'position:relative', 'background:#fff', 'border:1px solid var(--border,#E8ECF0)',
    'color:var(--text2,#2C3E50)', 'border-radius:8px', 'width:36px', 'height:36px',
    'display:flex', 'align-items:center', 'justify-content:center',
    'cursor:pointer', 'font-size:14px', 'flex-shrink:0', 'transition:border-color .15s',
  ].join(';');
  btn.onmouseover = () => { btn.style.borderColor = 'var(--accent,#4A90D9)'; btn.style.color = 'var(--accent,#4A90D9)'; };
  btn.onmouseout  = () => { btn.style.borderColor = ''; btn.style.color = ''; };
  btn.innerHTML = `
    <i class="fa-solid fa-bell"></i>
    <span class="notif-badge" style="
      position:absolute;top:-5px;right:-5px;
      background:#e05555;color:#fff;
      font-size:9px;font-weight:700;
      padding:1px 5px;border-radius:10px;
      min-width:16px;text-align:center;
      display:none;line-height:14px;
      font-family:'Plus Jakarta Sans',sans-serif">0</span>`;

  const actions = header.querySelector('.header-actions');
  if (actions) actions.insertBefore(btn, actions.firstChild);
  else header.appendChild(btn);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initNotifications() {
  injectNotifBell();
  updateNotifBadge();
  // Run scan 2 seconds after page load to avoid blocking critical path
  setTimeout(runAlertScan, 2000);
  // Re-scan every 10 minutes
  setInterval(runAlertScan, 600000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotifications);
} else {
  setTimeout(initNotifications, 300);
}

} // end _AS_NOTIF_LOADED guard