// ── BACKEND CAPABILITY FLAGS ─────────────────────────────────────────────────
// Set these to true once you've registered the corresponding backend routes.
// Prevents 404 console noise from optional endpoints that aren't wired yet.
window.AS_BACKEND = window.AS_BACKEND || {
  relationships: false,   // set true after mounting asset_extras_routes.js
  lifecycle:     false,   // set true after mounting asset_extras_routes.js
  inspections:   false,   // set true after mounting inspection_routes.js
  bulkUpdate:    false,   // set true afer mounting asset_extras_routes.js
  completeness:  false,   // set true after mounting asset_extras_routes.js
};

// Quick helper — auto-detects by probing /api/health-extras once
(async () => {
  try {
    const r = await fetch((window.API_BASE||'https://fpambacend.onrender.com/api') + '/health-extras',
      { headers: { Authorization: 'Bearer ' + (localStorage.getItem('as_token')||'') } });
    if (r.ok) {
      const d = await r.json().catch(()=>({}));
      if (d.relationships) window.AS_BACKEND.relationships = true;
      if (d.lifecycle)     window.AS_BACKEND.lifecycle     = true;
      if (d.inspections)   window.AS_BACKEND.inspections   = true;
      if (d.bulkUpdate)    window.AS_BACKEND.bulkUpdate     = true;
      if (d.completeness)  window.AS_BACKEND.completeness   = true;
    }
  } catch {}
})();

// ── API ADDITIONS ─────────────────────────────────────────────────────────────
// Append these functions to your existing js/api.js file.

// ── Inspections ───────────────────────────────────────────────────────────────
async function apiGetInspections(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/inspections${qs ? '?' + qs : ''}`);
}
async function apiCreateInspection(data) {
  return apiFetch('/inspections', { method: 'POST', body: data });
}
async function apiGetInspection(id) {
  return apiFetch(`/inspections/${id}`);
}
async function apiUpdateInspection(id, data) {
  return apiFetch(`/inspections/${id}`, { method: 'PUT', body: data });
}
async function apiSubmitInspectionReport(id, data) {
  return apiFetch(`/inspections/${id}/submit`, { method: 'POST', body: data });
}
async function apiApproveInspection(id) {
  return apiFetch(`/inspections/${id}/approve`, { method: 'POST', body: {} });
}
async function apiRejectInspection(id, reason) {
  return apiFetch(`/inspections/${id}/reject`, { method: 'POST', body: { reason } });
}
async function apiInspectionSummary() {
  return apiFetch('/inspections/summary');
}
async function apiGetAssetInspections(assetId) {
  return apiFetch(`/assets/${assetId}/inspections`);
}

// ── Relationships ─────────────────────────────────────────────────────────────
async function apiGetRelationships(assetId) {
  return apiFetch(`/assets/${assetId}/relationships`);
}
async function apiLinkAssets(parentId, childId) {
  return apiFetch(`/assets/${parentId}/relationships/link`, { method: 'POST', body: { childId } });
}
async function apiUnlinkAssets(parentId, childId) {
  return apiFetch(`/assets/${parentId}/relationships/unlink`, { method: 'DELETE', body: { childId } });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
async function apiGetLifecycle(assetId) {
  return apiFetch(`/assets/${assetId}/lifecycle`);
}
async function apiLifecycleTransition(assetId, stage, note = '', document = '') {
  return apiFetch(`/assets/${assetId}/lifecycle/transition`, { method: 'POST', body: { stage, note, document } });
}

// ── Bulk Update ───────────────────────────────────────────────────────────────
async function apiBulkUpdateAssets(updates) {
  return apiFetch('/assets/bulk-update', { method: 'POST', body: { updates } });
}

// ── Completeness ──────────────────────────────────────────────────────────────
async function apiGetCompleteness() {
  return apiFetch('/assets/completeness');
}