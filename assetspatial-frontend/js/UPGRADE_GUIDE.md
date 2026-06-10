# AssetSpatial — Feature Upgrade Integration Guide

All 10 features are self-contained JS files. They add functionality
without modifying any existing file. Integration = copy files + add
`<script>` tags in the right order.

---

## Step 1 — Copy files to your project

Copy these to your `js/` folder:
```
js/completeness.js
js/pdf_report_enhanced.js
js/map_spatial.js
js/inspections.js
js/bulk_update.js
js/asset_enhancements.js
js/notifications.js
js/lifecycle.js
```

Copy `inspections.html` to your project root (same level as `assets.html`).

---

## Step 2 — Add scripts to each HTML page

### assets.html
Add these **after** `js/assets.js`:
```html
<script src="js/notifications.js"></script>
<script src="js/completeness.js"></script>
<script src="js/pdf_report_enhanced.js"></script>
<script src="js/bulk_update.js"></script>
<script src="js/asset_enhancements.js"></script>
<script src="js/lifecycle.js"></script>
```

Then add these buttons to your existing selection toolbar or filter bar:
```html
<button class="btn btn-secondary btn-sm" onclick="renderCompletenessModal()">
  <i class="fa-solid fa-chart-bar"></i> Completeness Report
</button>
<button class="btn btn-secondary btn-sm" onclick="openBulkUpdateModal()">
  <i class="fa-solid fa-file-excel"></i> Bulk Update
</button>
<button class="btn btn-secondary btn-sm" onclick="generateDeferredMaintenanceReport()">
  <i class="fa-solid fa-file-pdf"></i> Deferred Report
</button>
```

### map.html
Add Leaflet.draw (polygon drawing), then `map_spatial.js` **after** `js/map.js`:
```html
<!-- After leaflet.min.js -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>

<!-- After js/map.js -->
<script src="js/map_spatial.js"></script>
<script src="js/pdf_report_enhanced.js"></script>
```

### asset-view.html
Add after `js/asset_detail.js`:
```html
<script src="js/notifications.js"></script>
<script src="js/inspections.js"></script>
<script src="js/lifecycle.js"></script>
<script src="js/pdf_report_enhanced.js"></script>
<script src="js/asset_enhancements.js"></script>
```

Then add these buttons to the `av-info-actions` div (the Edit/Export/QR row):
```html
<button class="btn btn-secondary btn-sm" onclick="openScheduleInspection(_assetId, _asset?.name)">
  <i class="fa-solid fa-clipboard-plus"></i> Schedule Inspection
</button>
<button class="btn btn-secondary btn-sm" onclick="generateAssetReport(_assetId)">
  <i class="fa-solid fa-file-pdf"></i> PDF Report
</button>
```

Also add a Relationships tab and Lifecycle tab to the tab bar:
```html
<button class="av-tab-btn" onclick="switchTab('relationships', this)">
  <i class="fa-solid fa-sitemap"></i> Relationships
</button>
<button class="av-tab-btn" onclick="switchTab('lifecycle', this)">
  <i class="fa-solid fa-arrows-rotate"></i> Lifecycle
</button>
```

And the corresponding panels inside the tabs div:
```html
<div id="tab-relationships" class="av-tab-panel">
  <div id="relationships-panel-content" data-rel="1">
    <div style="text-align:center;padding:40px"><div class="spinner"></div></div>
  </div>
</div>
<div id="tab-lifecycle" class="av-tab-panel">
  <div id="lifecycle-panel-content">
    <div style="text-align:center;padding:40px"><div class="spinner"></div></div>
  </div>
</div>
```

Then add these two cases to the `loadTabContent()` function in asset-view.html:
```javascript
if (name === 'relationships') {
  const el = document.getElementById('relationships-panel-content');
  if (el) renderRelationshipsTab(_assetId, el);
}
if (name === 'lifecycle') {
  const el = document.getElementById('lifecycle-panel-content');
  if (el) renderLifecycleTab(_assetId, el);
}
```

### analytics.html
Add after existing scripts:
```html
<script src="js/pdf_report_enhanced.js"></script>
<script src="js/completeness.js"></script>
```

Then add these buttons to the analytics header-actions:
```html
<button class="btn btn-secondary btn-sm" onclick="renderCompletenessModal()">
  <i class="fa-solid fa-chart-bar"></i> Data Completeness
</button>
<button class="btn btn-secondary btn-sm" onclick="generateDeferredMaintenanceReport()">
  <i class="fa-solid fa-triangle-exclamation"></i> Deferred Maintenance
</button>
```

### dashboard.html
Add after existing scripts:
```html
<script src="js/notifications.js"></script>
<script src="js/inspections.js"></script>
```

Add this widget div wherever you want the inspection summary on the dashboard:
```html
<div class="surface-card">
  <div class="card-header">
    <div class="card-title"><i class="fa-solid fa-clipboard-check" style="color:var(--accent)"></i> Inspections</div>
    <a href="inspections.html" class="btn btn-ghost btn-xs">View All</a>
  </div>
  <div style="padding:14px" id="inspection-widget">
    <div style="text-align:center;padding:20px"><div class="spinner"></div></div>
  </div>
</div>
```

Then in the dashboard's DOMContentLoaded callback, add:
```javascript
renderInspectionSummaryWidget();
```

### All HTML pages (global)
All pages benefit from notifications. Add to **every** page after `js/app.js`:
```html
<script src="js/notifications.js"></script>
```

---

## Step 3 — Sidebar: add Inspections link

In every HTML file's sidebar nav, add after the Field Capture link:
```html
<a class="nav-item" href="inspections.html">
  <i class="fa-solid fa-clipboard-check"></i>Inspections
</a>
```

---

## Feature Summary

| File | Feature |
|------|---------|
| `completeness.js` | Data completeness dashboard — field coverage by MDA, assets with gaps |
| `pdf_report_enhanced.js` | Printable reports: per-asset, MDA portfolio, deferred maintenance |
| `map_spatial.js` | Map polygon selection, condition heatmap, export selected assets |
| `inspections.js` | Full inspection workflow: schedule → assign → submit → approve |
| `bulk_update.js` | Bulk Excel/CSV condition update with preview and diff |
| `asset_enhancements.js` | Asset parent-child relationships + full-text search across all fields |
| `notifications.js` | In-app notification bell — overdue inspections, critical assets |
| `lifecycle.js` | Formal lifecycle stages with transition gates and disposal tracking |
| `inspections.html` | Standalone inspections management page |

---

## Notes

- All features gracefully fall back to localStorage when the API is offline.
- No existing files are modified — these are purely additive.
- `notifications.js` injects its own bell button into the header on load.
- `asset_enhancements.js` enhances the search input automatically on assets.html.
- `map_spatial.js` initialises after detecting that Leaflet is ready — no manual call needed.
- For `generateMdaReport()` on the map, the MDA name comes from the map's MDA filter dropdown.
