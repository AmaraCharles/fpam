// // ── ASSET RELATIONSHIPS (Parent-Child) ────────────────────────────────────────
// // Stored as { parentId, childIds[] } in localStorage under 'as_relationships'
// // and optionally synced to a backend field. Non-destructive — works alongside
// // the existing asset model.

// const REL_KEY = 'as_relationships';

// function _getRelationships() {
//   try { return JSON.parse(localStorage.getItem(REL_KEY)) || {}; } catch { return {}; }
// }
// function _saveRelationships(data) {
//   localStorage.setItem(REL_KEY, JSON.stringify(data));
// }

// function linkAssets(parentId, childId) {
//   const rels = _getRelationships();
//   if (!rels[parentId]) rels[parentId] = [];
//   if (!rels[parentId].includes(childId)) rels[parentId].push(childId);
//   // Back-link: record parent on child
//   if (!rels[`_parent_${childId}`]) rels[`_parent_${childId}`] = parentId;
//   _saveRelationships(rels);
// }

// function unlinkAssets(parentId, childId) {
//   const rels = _getRelationships();
//   if (rels[parentId]) rels[parentId] = rels[parentId].filter(id => id !== childId);
//   delete rels[`_parent_${childId}`];
//   _saveRelationships(rels);
// }

// function getChildren(assetId) {
//   const rels = _getRelationships();
//   return rels[assetId] || [];
// }

// function getParent(assetId) {
//   const rels = _getRelationships();
//   return rels[`_parent_${assetId}`] || null;
// }

// // ── RELATIONSHIPS TAB RENDERER ────────────────────────────────────────────────
// // Called from asset_detail.js or asset-view.html to render the relationships UI.
// async function renderRelationshipsTab(assetId, containerEl) {
//   if (!containerEl) return;

//   const allAssets = await _getAllAssets();
//   const assetMap  = {};
//   allAssets.forEach(a => { assetMap[a.assetId||a.id] = a; });

//   const children = getChildren(assetId);
//   const parentId = getParent(assetId);
//   const parent   = parentId ? assetMap[parentId] : null;

//   containerEl.innerHTML = `
//     <!-- Parent -->
//     <div style="margin-bottom:20px">
//       <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:10px">Parent Asset</div>
//       ${parent
//         ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px">
//             <i class="fa-solid fa-sitemap" style="color:var(--accent);font-size:14px"></i>
//             <div style="flex:1">
//               <div style="font-weight:600;font-size:13px">${escHtml(parent.name||parentId)}</div>
//               <div style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace">${parentId}</div>
//             </div>
//             <button class="btn btn-ghost btn-xs" onclick="unlinkAssets('${parentId}','${assetId}');renderRelationshipsTab('${assetId}',this.closest('[id]'))">
//               <i class="fa-solid fa-unlink"></i> Unlink
//             </button>
//           </div>`
//         : `<div style="font-size:12px;color:var(--text3);padding:10px 0">No parent asset linked.</div>`}
//     </div>

//     <!-- Children -->
//     <div style="margin-bottom:20px">
//       <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
//         <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700">
//           Child Assets <span style="font-size:12px;font-weight:400;text-transform:none">(${children.length})</span>
//         </div>
//         <button class="btn btn-ghost btn-xs" onclick="openLinkChildModal('${assetId}')">
//           <i class="fa-solid fa-plus"></i> Link Child
//         </button>
//       </div>
//       ${children.length
//         ? children.map(cid => {
//             const child = assetMap[cid];
//             if (!child) return `<div style="font-size:11px;color:var(--text3);padding:6px 0">${cid} (not found)</div>`;
//             return `<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
//               <i class="fa-solid fa-arrow-turn-down-right" style="color:var(--accent);font-size:12px"></i>
//               <div style="flex:1">
//                 <div style="font-weight:600;font-size:13px">${escHtml(child.name||cid)}</div>
//                 <div style="font-size:10px;color:var(--text3)">${cid} · ${child.type||'—'} · <span style="color:${child.condition==='Critical'?'#e05555':child.condition==='Good'?'#2DB87B':'#f0a500'}">${child.condition||'Unassessed'}</span></div>
//               </div>
//               <button class="btn btn-ghost btn-xs" onclick="unlinkAssets('${assetId}','${cid}');renderRelationshipsTab('${assetId}',this.closest('[data-rel]'))">
//                 <i class="fa-solid fa-unlink"></i>
//               </button>
//             </div>`;
//           }).join('')
//         : `<div style="font-size:12px;color:var(--text3);padding:8px 0">No child assets linked.</div>`}
//     </div>

//     <!-- Roll-up summary -->
//     ${children.length ? `
//     <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px">
//       <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:8px">Portfolio Roll-up</div>
//       ${_buildRollup(children.map(cid => assetMap[cid]).filter(Boolean))}
//     </div>` : ''}`;
// }

// function _buildRollup(children) {
//   if (!children.length) return '';
//   const conds = { Good:0, Fair:0, Poor:0, Critical:0, Unassessed:0 };
//   children.forEach(a => { conds[a.condition||'Unassessed']++; });
//   const totalVal = children.reduce((s,a)=>s+(a.valuation?.amount||0),0);
//   const worstCond = ['Critical','Poor','Fair','Good','Unassessed'].find(c=>conds[c]>0);
//   return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;text-align:center">
//     ${Object.entries(conds).map(([c,n])=>`
//       <div style="font-size:11px">
//         <div style="font-weight:700;font-size:16px;color:${c==='Good'?'#2DB87B':c==='Critical'?'#e05555':c==='Poor'?'#f07000':c==='Fair'?'#f0a500':'#5A6A7A'}">${n}</div>
//         <div style="color:var(--text3)">${c}</div>
//       </div>`).join('')}
//   </div>
//   ${totalVal ? `<div style="margin-top:8px;font-size:12px;color:var(--text2)">Combined Value: <strong>${totalVal>=1e9?(totalVal/1e9).toFixed(1)+'B':totalVal>=1e6?(totalVal/1e6).toFixed(1)+'M':'₦'+totalVal.toLocaleString()}</strong></div>` : ''}
//   <div style="margin-top:6px;font-size:12px;color:var(--text2)">Worst Condition: <strong style="color:${worstCond==='Good'?'#2DB87B':worstCond==='Critical'?'#e05555':'#f0a500'}">${worstCond}</strong></div>`;
// }

// function openLinkChildModal(parentId) {
//   if(typeof openModal!=='function') return;
//   openModal('Link Child Asset',
//     `<div class="form-group">
//       <label class="form-label">Child Asset ID</label>
//       <input class="form-control" id="link-child-id" placeholder="e.g. AST-1008">
//       <div style="font-size:11px;color:var(--text3);margin-top:4px">Enter the ID of the asset that belongs under this one</div>
//     </div>`,
//     `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
//      <button class="btn btn-primary" onclick="_doLinkChild('${parentId}')">
//        <i class="fa-solid fa-link"></i> Link
//      </button>`
//   );
// }

// function _doLinkChild(parentId) {
//   const childId = document.getElementById('link-child-id')?.value.trim();
//   if (!childId) return;
//   linkAssets(parentId, childId);
//   if(typeof toast==='function') toast(`Linked ${childId} as child of ${parentId}`, 'fa-link');
//   if(typeof closeModal==='function') closeModal();
//   if(typeof addAudit==='function') addAudit('ASSET_LINKED', parentId, null, `${childId} linked as child`);
// }

// async function _getAllAssets() {
//   try {
//     const r = await apiGetAssets({ limit: 5000 });
//     return r.assets || [];
//   } catch { return assets || []; }
// }

// // ── ENHANCED FULL-TEXT SEARCH ─────────────────────────────────────────────────
// // Replaces the basic name/id/state search with a comprehensive multi-field search
// // that includes notes, address, MDA, sector, LGA, and assetCode.

// let _searchIndex = [];
// let _searchIndexBuilt = false;

// async function buildSearchIndex() {
//   if (_searchIndexBuilt) return;
//   try {
//     const r = await apiGetAssets({ limit: 5000 });
//     _searchIndex = (r.assets || []).map(a => ({
//       a,
//       text: [
//         a.assetId||a.id, a.name, a.type, a.condition, a.status,
//         a.mda, a.sector, a.state, a.lga, a.address,
//         a.notes, a.agent, a.capturedBy?.name, a.assetCode,
//         ...(Object.values(a.typeData||{})),
//       ].join(' ').toLowerCase(),
//     }));
//     _searchIndexBuilt = true;
//   } catch {
//     _searchIndex = (assets||[]).map(a => ({
//       a,
//       text: [a.assetId||a.id, a.name, a.type, a.state, a.notes, a.mda].join(' ').toLowerCase(),
//     }));
//   }
// }

// function enhancedSearch(query) {
//   if (!query || !query.trim()) return _searchIndex.map(x => x.a);
//   const terms = query.toLowerCase().trim().split(/\s+/);
//   return _searchIndex
//     .filter(({ text }) => terms.every(t => text.includes(t)))
//     .map(x => x.a);
// }

// // Invalidate index when assets change
// function invalidateSearchIndex() {
//   _searchIndexBuilt = false;
//   _searchIndex = [];
// }

// // ── GLOBAL SEARCH BAR ENHANCEMENT ────────────────────────────────────────────
// // Hooks into the existing global search or search-input fields.
// let _gsDebounce = null;

// function initEnhancedSearch() {
//   // Build index in background
//   buildSearchIndex();

//   // Hook into search input if on assets page
//   const si = document.getElementById('search-input');
//   if (si) {
//     si.placeholder = 'Search name, ID, MDA, sector, notes, address…';
//     si.addEventListener('input', () => {
//       clearTimeout(_gsDebounce);
//       _gsDebounce = setTimeout(async () => {
//         if (!_searchIndexBuilt) await buildSearchIndex();
//         const q = si.value.trim();
//         if (!q) { if(typeof renderAssets==='function') renderAssets(); return; }

//         // Use enhanced search
//         const results = enhancedSearch(q);

//         // Also try backend text search
//         let backendResults = [];
//         try {
//           const r = await apiSearchAssets(q);
//           backendResults = r.assets || r.results || [];
//         } catch {}

//         // Merge (deduplicate by assetId)
//         const seen = new Set();
//         const merged = [...results, ...backendResults].filter(a => {
//           const id = a.assetId||a.id;
//           if (seen.has(id)) return false;
//           seen.add(id); return true;
//         });

//         if (typeof renderAssetsTable === 'function') {
//           filteredAssets = merged;
//           renderAssetsTable(merged);
//         }
//       }, 250);
//     });
//   }
// }

// // Auto-init when DOM is ready
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', initEnhancedSearch);
// } else {
//   setTimeout(initEnhancedSearch, 500);
// }
