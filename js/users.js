// ── USER MANAGEMENT ───────────────────────────────────────────────────────────

// Role → avatar background colour (used when backend doesn't supply u.color)
function roleColor(role) {
  const map = {
    'System Admin':  '#6c47ff',
    'Supervisor':    '#0ea5e9',
    'GIS Analyst':   '#10b981',
    'Field Agent':   '#f59e0b',
  };
  return map[role] || '#6b7280';
}

async function loadUsers() {
  const roleFilter = document.getElementById('filter-role')?.value || '';
  let list = users;

  try {
    const params = {};
    if (roleFilter) params.role = roleFilter;
    const r = await apiGetUsers(params);
    list = r.users || list;
    // Update badge
    const badge = document.getElementById('nb-users');
    if (badge) badge.textContent = r.total || list.length;
  } catch {
    if (roleFilter) list = list.filter(u => u.role === roleFilter);
  }

  renderUsersGrid(list);
}

function renderUsersGrid(list) {
  const grid = document.getElementById('users-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">
      <i class="fa-solid fa-users" style="font-size:32px;margin-bottom:12px;display:block;color:var(--border2)"></i>
      No users found
    </div>`;
    return;
  }

  grid.innerHTML = list.map(u => {
    const initials = (u.name||'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const color    = u.color || roleColor(u.role);
    const assetCount  = u.assets ?? u.stats?.assetsCreated ?? 0;
    const actionCount = auditLog.filter(l=>(l.user||l.performedBy?.name||l.performedBy)===u.name).length;
    const isActive = u.isActive !== false;
    return `<div class="user-tile">
      <div class="user-tile-top">
        <div class="user-avatar-lg" style="background:${color}">${initials}</div>
        <div style="flex:1;min-width:0">
          <div class="user-tile-name">${escHtml(u.name)}</div>
          <div class="user-tile-role" style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;text-transform:uppercase;margin-top:2px">${escHtml(u.role)}</div>
        </div>
        <span class="tag ${isActive?'tag-green':'tag-red'}" style="font-size:8px">${isActive?'ACTIVE':'INACTIVE'}</span>
      </div>
      <div style="display:flex;gap:18px;margin-bottom:12px;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
        <div class="user-stat"><div class="user-stat-val">${assetCount}</div><div class="user-stat-lbl">Assets</div></div>
        <div class="user-stat"><div class="user-stat-val" style="color:var(--info)">${actionCount}</div><div class="user-stat-lbl">Actions</div></div>
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--text3);margin-bottom:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        <i class="fa-solid fa-envelope" style="margin-right:5px"></i>${escHtml(u.email||'—')}
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="tag tag-gray" style="font-size:8px">${escHtml(u.userId||u._id||u.id||'—')}</span>
        <div style="margin-left:auto;display:flex;gap:5px">
          <button class="btn btn-ghost btn-xs" onclick='openEditUser(${JSON.stringify(u).replace(/'/g,"&#39;")})' title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-ghost btn-xs" onclick='openPermissionsModal(${JSON.stringify(u).replace(/'/g,"&#39;")})' title="Permissions">
            <i class="fa-solid fa-shield-halved"></i>
          </button>
          <button class="btn btn-ghost btn-xs" onclick="resetPasswordPrompt('${u._id||u.id}')" title="Reset password">
            <i class="fa-solid fa-key"></i>
          </button>
          <button class="btn btn-danger btn-xs" onclick="deactivateUser('${u._id||u.id||u.userId}')" title="${isActive?'Deactivate':'Reactivate'}">
            <i class="fa-solid fa-${isActive?'ban':'check'}"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openCreateUser() {
  openModal('Add New User',
    `<div class="form-grid">
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <div style="position:relative">
          <i class="fa-solid fa-user" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:13px;pointer-events:none"></i>
          <input class="form-control" id="nu-name" placeholder="e.g. Ngozi Adamu" style="padding-left:36px">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Role *</label>
        <select class="form-control" id="nu-role">
          <option>Field Agent</option><option>Supervisor</option><option>GIS Analyst</option><option>System Admin</option>
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Email Address *</label>
        <div style="position:relative">
          <i class="fa-solid fa-envelope" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:13px;pointer-events:none"></i>
          <input class="form-control" id="nu-email" type="email" placeholder="user@agency.gov.ng" style="padding-left:36px">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Password *</label>
        <input class="form-control" id="nu-pass" type="password" placeholder="Minimum 8 characters">
      </div>
      <div class="form-group">
        <label class="form-label">Zone / Region</label>
        <select class="form-control" id="nu-zone">
          <option value="">— No Zone —</option>
          <option>North Central</option><option>North East</option><option>North West</option>
          <option>South East</option><option>South South</option><option>South West</option>
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">States (scope)</label>
        <input class="form-control" id="nu-states" placeholder="e.g. Lagos, FCT, Kano (comma separated)">
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Leave empty for all states access</div>
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="doCreateUser()"><i class="fa-solid fa-user-plus"></i> Create User</button>`
  );
}

// alias for old name
const openAddUserModal = openCreateUser;

async function doCreateUser() {
  const name  = document.getElementById('nu-name')?.value.trim();
  const email = document.getElementById('nu-email')?.value.trim();
  const pass  = document.getElementById('nu-pass')?.value;
  const role  = document.getElementById('nu-role')?.value;

  if (!name || !email || !pass) { toast('Name, email and password are required', 'fa-triangle-exclamation', true); return; }
  if (pass.length < 8) { toast('Password must be at least 8 characters', 'fa-triangle-exclamation', true); return; }

  const data = {
    name, email, password: pass, role,
    zone:   document.getElementById('nu-zone')?.value,
    states: (document.getElementById('nu-states')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
  };

  try {
    const r = await apiCreateUser(data);
    const newUser = r.user || { ...data, id: 'USR-'+Date.now(), color: roleColor(role), assets: 0 };
    users.push(newUser); saveLocal();
    addAudit('USER_CREATED', newUser.userId||newUser.id, null, `${name} created as ${role}`);
    toast(`${name} added as ${role}`);
    closeModal();
    loadUsers();
  } catch(e) {
    toast(e.message || 'Failed to create user', 'fa-circle-xmark', true);
  }
}

// alias
const addUser = doCreateUser;

function openEditUser(u) {
  openModal('Edit User',
    `<div class="form-grid">
      <div class="form-group full"><label class="form-label">Name</label><input class="form-control" id="eu-name" value="${escHtml(u.name)}"></div>
      <div class="form-group"><label class="form-label">Role</label>
        <select class="form-control" id="eu-role">
          ${['Field Agent','Supervisor','GIS Analyst','System Admin'].map(r=>`<option ${u.role===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Zone</label>
        <select class="form-control" id="eu-zone">
          <option value="">— No Zone —</option>
          ${['North Central','North East','North West','South East','South South','South West'].map(z=>`<option ${u.zone===z?'selected':''}>${z}</option>`).join('')}
        </select>
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="doEditUser('${u._id||u.id}')"><i class="fa-solid fa-floppy-disk"></i> Save</button>`
  );
}

async function doEditUser(id) {
  const data = {
    name: document.getElementById('eu-name')?.value.trim(),
    role: document.getElementById('eu-role')?.value,
    zone: document.getElementById('eu-zone')?.value,
  };
  try {
    await apiUpdateUser(id, data);
    toast('User updated');
  } catch {
    const u = users.find(x=>(x._id||x.id)===id);
    if (u) Object.assign(u, data);
    saveLocal();
    toast('Updated locally');
  }
  addAudit('USER_UPDATED', id, null, `${data.name} updated`);
  closeModal(); loadUsers();
}

// alias
const saveEditUser = doEditUser;

function openPermissionsModal(u) {
  const PERMS = ['canCreate','canEdit','canDelete','canExport','canViewAll','canManageUsers','canViewAudit','canManageSettings'];
  const LABELS = { canCreate:'Create Assets', canEdit:'Edit Assets', canDelete:'Delete Assets', canExport:'Export Data', canViewAll:'View All Assets', canManageUsers:'Manage Users', canViewAudit:'View Audit Log', canManageSettings:'Manage Settings' };
  const current = u.permissions || {};

  openModal(`Permissions — ${u.name}`,
    `<div style="margin-bottom:10px;font-size:12px;color:var(--text2)">Override default role permissions for this user. Unchecked = denied regardless of role defaults.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${PERMS.map(p=>`<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface2);border-radius:6px;padding:8px 12px">
        <span style="font-size:12px;color:var(--text2)">${LABELS[p]||p}</span>
        <input type="checkbox" id="perm-${p}" ${current[p]!==false?'checked':''} style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer">
      </div>`).join('')}
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="doSavePermissions('${u._id||u.id}')"><i class="fa-solid fa-shield-halved"></i> Save Permissions</button>`
  );
}

async function doSavePermissions(id) {
  const PERMS = ['canCreate','canEdit','canDelete','canExport','canViewAll','canManageUsers','canViewAudit','canManageSettings'];
  const perms = {};
  PERMS.forEach(p => { perms[p] = document.getElementById(`perm-${p}`)?.checked ?? true; });
  try {
    await apiUpdatePermissions(id, perms);
    toast('Permissions saved');
  } catch {
    const u = users.find(x=>(x._id||x.id)===id);
    if (u) { u.permissions = perms; saveLocal(); }
    toast('Saved locally');
  }
  addAudit('USER_UPDATED', id, null, 'Permissions updated');
  closeModal();
}

// alias
const savePermissions = doSavePermissions;

async function deactivateUser(id) {
  if (!confirm('Deactivate this user? They will lose access immediately.')) return;
  try {
    await apiDeactivateUser(id);
    toast('User deactivated');
  } catch {
    const u = users.find(x=>(x._id||x.id||x.userId)===id);
    if (u) { u.isActive = false; saveLocal(); }
    toast('Updated locally');
  }
  addAudit('USER_REMOVED', id, null, 'User deactivated');
  loadUsers();
}

async function resetPasswordPrompt(id) {
  if (!confirm('Send password reset email to this user?')) return;
  try {
    await apiResetPassword(id);
    toast('Password reset email sent');
  } catch {
    toast('Could not reset password (API offline)', 'fa-triangle-exclamation', true);
  }
}

async function loadRoleConfigs() {
  try {
    const data = await apiGetRoleConfigs();
    renderRoleConfigCards(data.configs || data || []);
  } catch {
    // Show default placeholder
    const roleMap = { 'Field Agent':'field', 'Supervisor':'super', 'GIS Analyst':'gis' };
    const defaults = {
      'Field Agent':  { canCreate:true,  canEdit:true,  canDelete:false, canExport:false, canViewAll:false, canManageUsers:false, canViewAudit:false, canManageSettings:false },
      'Supervisor':   { canCreate:true,  canEdit:true,  canDelete:true,  canExport:true,  canViewAll:true,  canManageUsers:false, canViewAudit:true,  canManageSettings:false },
      'GIS Analyst':  { canCreate:false, canEdit:false, canDelete:false, canExport:true,  canViewAll:true,  canManageUsers:false, canViewAudit:true,  canManageSettings:false },
    };
    renderRoleConfigCards(Object.entries(defaults).map(([role,d])=>({ role, defaults:d })));
  }
}

async function saveRoleConfig(role) {
  const PERMS = ['canCreate','canEdit','canDelete','canExport','canViewAll','canManageUsers','canViewAudit','canManageSettings'];
  const cfg = {};
  PERMS.forEach(p => {
    const el = document.querySelector(`[data-perm-role="${role}"][data-perm-key="${p}"]`);
    if (el) cfg[p] = el.checked;
  });
  try {
    await apiUpdateRoleConfig(role, { defaults: cfg });
    toast(`${role} permissions saved`);
  } catch {
    toast(`Saved locally`);
  }
  addAudit('ROLE_CONFIG_CHANGED', role, null, `${role} defaults updated`);
}

async function resetRoleConfigs() {
  if (!confirm('Reset ALL role permissions to factory defaults? This cannot be undone.')) return;
  try {
    await apiResetRoleConfigs();
    toast('All permissions reset to defaults');
    loadRoleConfigs();
  } catch {
    toast('Reset failed — API offline', 'fa-circle-xmark', true);
  }
}

// alias
const renderUsers = loadUsers;
