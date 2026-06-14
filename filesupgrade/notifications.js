// ── NOTIFICATIONS & ALERTS SYSTEM ────────────────────────────────────────────
// In-app notification centre. Checks for overdue inspections, stale assets,
// critical condition changes, and new capture submissions.
// Stored in localStorage 'as_notifications'. Badge on sidebar bell icon.

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
function toggleNotifPanel() {
  let panel = document.getElementById('notif-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.style.cssText = `position:fixed;top:60px;right:20px;width:360px;max-height:520px;
      background:var(--surface,#1a2e25);border:1px solid var(--border2,#2a4a38);
      border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.4);z-index:900;
      display:flex;flex-direction:column;overflow:hidden;font-family:'Space Grotesk',sans-serif`;
    document.body.appendChild(panel);
    document.addEventListener('click', e => {
      if (panel && !panel.contains(e.target) && !e.target.closest('[onclick*="toggleNotifPanel"]')) {
        panel.remove();
      }
    }, { once: true });
  } else {
    panel.remove(); return;
  }

  renderNotifPanel(panel);
}

function renderNotifPanel(panel) {
  const notifs = _getNotifications();
  const readIds = _getReadIds();
  const unread = notifs.filter(n => !readIds.has(n.id)).length;

  panel.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--border2,#2a4a38);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:14px;font-weight:700;color:var(--text,#e8f5ee)">Notifications ${unread>0?`<span style="background:#e05555;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px">${unread}</span>`:''}
      </div>
      <div style="display:flex;gap:8px">
        ${unread>0?`<button onclick="_markAllRead();renderNotifPanel(document.getElementById('notif-panel'))" style="background:none;border:none;color:var(--accent,#00c864);font-size:11px;cursor:pointer;font-weight:600">Mark all read</button>`:''}
        <button onclick="clearAllNotifications()" style="background:none;border:none;color:var(--text3,#8aab96);font-size:11px;cursor:pointer">Clear</button>
      </div>
    </div>
    <div style="overflow-y:auto;flex:1">
      ${!notifs.length
        ? `<div style="text-align:center;padding:40px 20px;color:var(--text3,#8aab96);font-size:13px">
            <i class="fa-solid fa-bell-slash" style="font-size:28px;display:block;margin-bottom:10px"></i>
            No notifications
          </div>`
        : notifs.slice(0, 50).map(n => {
            const isRead = readIds.has(n.id);
            const timeAgo = _timeAgo(n.ts);
            return `<div onclick="_markRead('${n.id}');renderNotifPanel(document.getElementById('notif-panel'));${n.assetId?`window.location='asset-view.html?id=${n.assetId}'`:''}"
              style="padding:12px 16px;border-bottom:1px solid var(--border2,#2a4a38);cursor:pointer;display:flex;gap:10px;align-items:flex-start;
              background:${isRead?'transparent':'rgba(255,255,255,.03)'};transition:background .15s"
              onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='${isRead?'transparent':'rgba(255,255,255,.03)'}'">
              <div style="width:32px;height:32px;border-radius:8px;background:${n.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fa-solid ${n.icon}" style="font-size:13px;color:${n.color}"></i>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:${isRead?'500':'700'};color:var(--text,#e8f5ee);margin-bottom:2px">${escHtml(n.title)}</div>
                <div style="font-size:11px;color:var(--text3,#8aab96);line-height:1.4">${escHtml(n.body)}</div>
                <div style="font-size:10px;color:var(--text3,#8aab96);margin-top:4px">${timeAgo}</div>
              </div>
              ${!isRead?`<div style="width:8px;height:8px;border-radius:50%;background:#4A90D9;flex-shrink:0;margin-top:4px"></div>`:''}
            </div>`;
          }).join('')}
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
  btn.style.cssText = `position:relative;background:none;border:1px solid var(--border);
    color:var(--text2);border-radius:8px;width:36px;height:36px;display:flex;
    align-items:center;justify-content:center;cursor:pointer;font-size:14px;flex-shrink:0`;
  btn.innerHTML = `<i class="fa-solid fa-bell"></i>
    <span class="notif-badge" style="position:absolute;top:-4px;right:-4px;background:#e05555;
      color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;
      display:none;font-family:'Space Grotesk',sans-serif">0</span>`;

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
