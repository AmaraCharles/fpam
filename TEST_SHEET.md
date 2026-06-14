# AssetSpatial — Feature Test Sheet
**Project:** AssetSpatial — Nigerian Federal Public Asset Management Platform  
**Stack:** Node.js / Express · MongoDB · GridFS · Leaflet · Chart.js  
**Tester:** ___________________  **Date:** ___________________  **Server:** http://localhost:3001

---

> **How to use this sheet**  
> Work through each section in order. Mark each item:  
> `✅ Pass` · `❌ Fail` · `⚠️ Partial` · `⏭ Skipped`  
> Write notes in the Notes column for anything that needs follow-up.

---

## 1. Authentication ✅ COMPLETE

| # | Test | Status |
|---|------|--------|
| 1.1 | Navigate without token → redirected to login | ✅ |
| 1.2 | Wrong credentials → error toast | ✅ |
| 1.3 | Correct System Admin login → dashboard | ✅ |
| 1.4 | Console shows `[RBAC] role: System Admin` | ✅ |
| 1.5 | Refresh → still logged in | ✅ |
| 1.6 | Logout → redirected to login, token cleared | ✅ |
| 1.7 | Navigate after logout → redirected to login | ✅ |
| 1.8 | Log in as Field Agent → console shows Field Agent role | ✅ |
| 1.9 | Log in as Supervisor → console shows Supervisor role | ✅ |
| 1.10 | Log in as GIS Analyst → console shows GIS Analyst role | ✅ |

---

## 2. Role-Based Access Control ✅ COMPLETE

### 2A. System Admin ✅
| # | Test | Status |
|---|------|--------|
| 2A.1 | assets.html — New Asset + Export buttons visible/enabled | ✅ |
| 2A.2 | users.html — accessible, all buttons visible | ✅ |
| 2A.3 | settings.html — accessible | ✅ |
| 2A.4 | audit.html — accessible | ✅ |
| 2A.5 | Asset rows — View, Edit, Delete all enabled | ✅ |

### 2B. Supervisor ✅
| # | Test | Status |
|---|------|--------|
| 2B.1 | New Asset + Export visible | ✅ |
| 2B.2 | View, Edit, Delete enabled | ✅ |
| 2B.3 | users.html — hidden/denied | ✅ |
| 2B.4 | settings.html — hidden/denied | ✅ |
| 2B.5 | audit.html — accessible | ✅ |

### 2C. GIS Analyst ✅
| # | Test | Status |
|---|------|--------|
| 2C.1 | Export visible, New Asset disabled/hidden | ✅ |
| 2C.2 | Edit + Delete buttons disabled | ✅ |
| 2C.3 | audit.html accessible | ✅ |
| 2C.4 | users.html hidden/denied | ✅ |

### 2D. Field Agent ✅
| # | Test | Status |
|---|------|--------|
| 2D.1 | Asset list loads with all assets | ✅ |
| 2D.2 | New Asset button visible and enabled | ✅ |
| 2D.3 | Delete button disabled/grayed | ✅ |
| 2D.4 | Export button hidden/disabled | ✅ |
| 2D.5 | users.html not in sidebar | ✅ |
| 2D.6 | settings.html not in sidebar | ✅ |
| 2D.7 | audit.html not in sidebar | ✅ |

---

## 3. Dashboard ✅ COMPLETE

| # | Test | Status |
|---|------|--------|
| 3.1 | Page loads | ✅ |
| 3.2 | Total Assets card — real count from MongoDB | ✅ |
| 3.3 | Recent Assets table populated | ✅ |
| 3.4 | Click row → asset detail modal opens | ✅ |
| 3.5 | Inspection Alerts widget | ✅ |
| 3.6 | Click Action on alert → detail modal | ✅ |
| 3.7 | API status green dot | ✅ |
| 3.8 | User badge shows name + role | ✅ |
| 3.9 | Dark/light theme toggle + persists | ✅ |
| 3.10 | Mobile sidebar toggle | ✅ |
| 3.11 | Charts (condition donut, type bar, captures over time) | ✅ |

---

## 4. Asset Registry (`assets.html`)

### 4A. Loading
| # | Test | Status | Notes |
|---|------|--------|-------|
| 4A.1 | Page loads — table populates from MongoDB | ✅ | |
| 4A.2 | Console shows `[Assets] found N assets` with N > 0 | ✅ | |
| 4A.3 | Asset count badge in sidebar matches rows | | |

### 4B. Filtering & Search — IN PROGRESS
| # | Test | Status | Notes |
|---|------|--------|-------|
| 4B.1 | Type filter | | |
| 4B.2 | Condition filter | | |
| 4B.3 | Geometry filter | | |
| 4B.4 | Search by name | | |
| 4B.5 | Search by asset ID | | |
| 4B.6 | Search / filter by state | ✅ | Fixed — state filter wired in |
| 4B.7 | Clear all filters restores full list | | |
| 4B.8 | Column header click sorts | | |
| 4B.9 | Same header click reverses sort | | |

### 4C. View Asset Detail
| # | Test | Status | Notes |
|---|------|--------|-------|
| 4C.1 | Click Eye → detail modal opens | | |
| 4C.2 | Info tab — all fields shown | | |
| 4C.3 | Geometry field shows icon + label correctly | ✅ | Fixed |
| 4C.4 | Location tab — Leaflet map renders | ✅ | Fixed — Leaflet added to assets.html |
| 4C.5 | Location map marker at correct coordinates | | |
| 4C.6 | Maintenance tab — loads from DB | ✅ | Fixed |
| 4C.7 | History tab — shows condition changes | ✅ | Fixed |
| 4C.8 | Photos tab — thumbnails load (no broken images) | ✅ | Fixed — authed blob fetch |
| 4C.9 | Photo hover → delete button (Admin only) | ✅ | Fixed |
| 4C.10 | Excel tab — files listed | ✅ | Fixed |
| 4C.11 | Excel Preview — full table renders | ✅ | Fixed — SheetJS multi-sheet |
| 4C.12 | Documents tab — PDFs/docs listed | ✅ | Built |
| 4C.13 | Document Preview — PDF in iframe / text / Word | ✅ | Built |
| 4C.14 | Valuation tab | | |
| 4C.15 | QR code button → QR modal | | |
| 4C.16 | Close modal | | |

### 4D. Edit Asset
| # | Test | Status | Notes |
|---|------|--------|-------|
| 4D.1 | Click Edit → modal opens pre-filled | | |
| 4D.2 | Details tab fields visible | | |
| 4D.3 | Photos tab in Edit — existing photos visible | | |
| 4D.4 | Change name → saves, table updates | | |
| 4D.5 | Change condition → no 422 error | ✅ | Fixed — validateBody removed from PUT |
| 4D.6 | After condition change → History tab shows entry | ✅ | Fixed — conditionHistory in schema + service |
| 4D.7 | Asset with special chars in name → Edit opens without crash | ✅ | Fixed — no JSON.stringify in onclick |
| 4D.8 | Cancel → no changes saved | | |

### 4E. Delete Asset (Admin/Supervisor)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 4E.1 | Delete button → confirmation dialog | | |
| 4E.2 | Confirm → asset removed, toast shown | | |
| 4E.3 | Cancel → asset remains | | |

### 4F. Bulk Actions
| # | Test | Status | Notes |
|---|------|--------|-------|
| 4F.1 | Check rows → bulk bar appears | | |
| 4F.2 | Select All → all rows checked | | |
| 4F.3 | Bulk Export CSV | | |
| 4F.4 | Bulk Delete (Admin only) | | |
| 4F.5 | Clear Selection | | |

### 4G. Export
| # | Test | Status | Notes |
|---|------|--------|-------|
| 4G.1 | Export → CSV downloads | | |
| 4G.2 | Export → JSON downloads | | |
| 4G.3 | Export → GeoJSON downloads | | |

---

## 5. Asset Photos
| # | Test | Status | Notes |
|---|------|--------|-------|
| 5.1 | Photos tab shows thumbnails (not broken) | ✅ | |
| 5.2 | No 401 in console | ✅ | Fixed — authed blob fetch |
| 5.3 | No `/photos/undefined` in console | ✅ | Fixed — fileId priority in _fileId() |
| 5.4 | Click thumbnail → lightbox | | |
| 5.5 | Click outside lightbox → closes | | |
| 5.6 | Hover thumbnail → delete button (Admin only) | ✅ | Fixed |
| 5.7 | Delete photo → removed from gallery | | |
| 5.8 | Upload photo from Edit modal | | |
| 5.9 | Upload photo from detail view | | |

---

## 6. Maintenance Logs
| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.1 | Maintenance tab loads from DB | ✅ | Fixed |
| 6.2 | Add entry → appears immediately | | |
| 6.3 | Reopen asset → entry still visible (DB persisted) | | |
| 6.4 | Multiple entries in order | | |
| 6.5 | Delete entry | | |

---

## 7. Condition History
| # | Test | Status | Notes |
|---|------|--------|-------|
| 7.1 | Change condition Good→Poor → success, no 422 | ✅ | |
| 7.2 | History tab shows Good→Poor entry | ✅ | |
| 7.3 | Change again Poor→Critical | | |
| 7.4 | Both entries shown in order | | |
| 7.5 | Edit without changing condition → no new entry | | |

---

## 8. Valuation
| # | Test | Status | Notes |
|---|------|--------|-------|
| 8.1 | Valuation tab loads | | |
| 8.2 | Save amount + method → persists | | |
| 8.3 | Reopen → values still there | | |

---

## 9. QR Codes
| # | Test | Status | Notes |
|---|------|--------|-------|
| 9.1 | QR modal opens with scannable code | | |
| 9.2 | Scan with phone → resolves to asset ID | | |
| 9.3 | Download QR → PNG file | | |

---

## 10. Live Map (`map.html`)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 10.1 | Map renders, Nigeria visible | | |
| 10.2 | Asset markers appear | | |
| 10.3 | Click marker → info panel | | |
| 10.4 | Info panel → View Detail button works | | |
| 10.5 | Close info panel | | |
| 10.6 | Filter by type | | |
| 10.7 | Filter by condition | | |
| 10.8 | Fit All Markers button | | |
| 10.9 | Toggle Satellite/Road | | |
| 10.10 | Locate Me → spinner, flies to location | ✅ | Fixed |
| 10.11 | Locate Me → coordinates toast on success | ✅ | Fixed |
| 10.12 | Locate Me denied → error toast | | |

---

## 11. Field Capture (`capture.html`)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 11.1 | Page loads | | |
| 11.2 | Select type → type-specific fields appear | | |
| 11.3 | GPS button → acquires coordinates | | |
| 11.4 | Attach photos → previews show | | |
| 11.5 | Submit all fields → asset appears in registry | | |
| 11.6 | Submit without required fields → validation error | | |
| 11.7 | Clear Form → all fields reset | | |
| 11.8 | Recent Captures list | | |

---

## 12. Analytics (`analytics.html`)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 12.1 | Page loads, charts render | | |
| 12.2 | Assets by Type chart | | |
| 12.3 | Assets by Condition chart | | |
| 12.4 | Captures Over Time chart | | |
| 12.5 | Maintenance Spend chart | | |
| 12.6 | Days filter (30/90/365) reloads charts | | |
| 12.7 | KPI numbers correct | | |

---

## 13. User Management (`users.html`) — Admin only
| # | Test | Status | Notes |
|---|------|--------|-------|
| 13.1 | User grid loads from DB | | |
| 13.2 | Filter by role | | |
| 13.3 | Create User modal opens | | |
| 13.4 | Create Field Agent → appears in grid | | |
| 13.5 | Create Supervisor → correct role shown | | |
| 13.6 | Edit User → pre-filled modal | | |
| 13.7 | Edit name → updates in grid | | |
| 13.8 | Deactivate user → status changes | | |
| 13.9 | Reset Password → confirmation + toast | | |
| 13.10 | Permissions modal → toggles visible | | |
| 13.11 | Toggle permission → saved per-user | | |
| 13.12 | Log in as edited user → permissions reflected | | |
| 13.13 | Role Configurations tab | | |
| 13.14 | Edit role default permission | | |
| 13.15 | Reset Role Permissions → confirmation + defaults | | |

---

## 14. OCR Scanner (`ocr.html`)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 14.1 | Page loads | | |
| 14.2 | Upload image → OCR starts, spinner shows | | |
| 14.3 | OCR completes → text in output panel | | |
| 14.4 | Suggested field mapping shown | | |
| 14.5 | Copy Text button works | | |
| 14.6 | Clear button | | |
| 14.7 | Scan History listed | | |

---

## 15. Excel Import (`excel.html`)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 15.1 | Page loads | | |
| 15.2 | Drop .xlsx → preview table populates | | |
| 15.3 | File info (name, rows, sheet) shown | | |
| 15.4 | Auto-map columns | | |
| 15.5 | Manual column mapping | | |
| 15.6 | Preview table shows first rows | | |
| 15.7 | Continue → decision panel appears | | |
| 15.8 | Attach to Asset dropdown populates | | |
| 15.9 | Upload & Attach → file on asset's Excel tab | ✅ | Fixed |
| 15.10 | No 404 `/excel/upload` error | ✅ | Fixed |
| 15.11 | Save to File DB | | |
| 15.12 | Dismiss button | | |

---

## 16. File Database (`filedb.html`)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 16.1 | Files load from all assets | | |
| 16.2 | Stat cards (Total, Photos, Videos, Docs/PDFs, Excel) | ✅ | Built |
| 16.3 | Photos categorised correctly | | |
| 16.4 | Excel files categorised | | |
| 16.5 | PDF files categorised | | |
| 16.6 | Video files categorised | | |
| 16.7 | Filter by type — Photos only | | |
| 16.8 | Filter by asset | | |
| 16.9 | View photo → lightbox (no 401) | ✅ | Fixed |
| 16.10 | Download → correct filename | | |
| 16.11 | No 401 on download | ✅ | Fixed — authed blob fetch |
| 16.12 | Delete (Admin) → file removed | ✅ | Built |
| 16.13 | Stats decrement after delete | | |
| 16.14 | Upload File modal | | |
| 16.15 | Upload photo → appears in table | | |

---

## 17. Audit Log (`audit.html`)
| # | Test | Status | Notes |
|---|------|--------|-------|
| 17.1 | Audit entries load from DB | | |
| 17.2 | Action, entity, user, timestamp all shown | | |
| 17.3 | Filter by action type | | |
| 17.4 | Filter by date range | | |
| 17.5 | Pagination | | |
| 17.6 | Asset edit → ASSET_UPDATED entry appears | | |
| 17.7 | Asset capture → ASSET_CREATED entry | | |
| 17.8 | Login → USER_LOGIN entry | | |

---

## 18. Settings (`settings.html`) — Admin only
| # | Test | Status | Notes |
|---|------|--------|-------|
| 18.1 | Settings load from API | | |
| 18.2 | API status green dot | | |
| 18.3 | Change platform name → persists | | |
| 18.4 | Change org name → persists | | |
| 18.5 | Toggle OCR → persists | | |
| 18.6 | Toggle Offline Mode → persists | | |
| 18.7 | Theme toggle works | | |
| 18.8 | Sign Out → redirects to login | | |

---

## 19. Global Features
| # | Test | Status | Notes |
|---|------|--------|-------|
| 19.1 | Global search opens dropdown | | |
| 19.2 | Type name → matching assets shown | | |
| 19.3 | Click result → navigates/opens detail | | |
| 19.4 | Keyboard nav (↑↓ Enter) in search | | |
| 19.5 | Click outside → dropdown closes | | |
| 19.6 | Theme persists across pages | | |
| 19.7 | API health indicator | | |
| 19.8 | Toast notifications across all pages | | |
| 19.9 | Modal backdrop click closes modal | | |
| 19.10 | Sidebar active state on current page | | |
| 19.11 | All pages redirect to login without token | | |
| 19.12 | Hard refresh loads latest JS | ✅ | Cache-busting confirmed |

---

## 20. Backend Verification
| # | Test | Status | Notes |
|---|------|--------|-------|
| 20.1 | Assets visible as Field Agent | ✅ | Fixed — scopeFilter.js |
| 20.2 | scopeFilter returns `{}` for all roles | ✅ | Fixed |
| 20.3 | conditionHistory written on update | ✅ | Fixed — assetService.updateAsset |
| 20.4 | Photo `_id` = GridFS fileId on response | ✅ | Fixed — normaliseFileRef |
| 20.5 | Excel exposed as `excel` key | ✅ | Fixed — virtual + route normalisation |
| 20.6 | PUT /api/assets/:id returns 200 | ✅ | Fixed — validateBody removed |
| 20.7 | runValidators:false on update | ✅ | Fixed |
| 20.8 | Photo/doc/excel DELETE routes exist | ✅ | Built — assets_routes.js |
| 20.9 | resolvePermissions sets both key formats | ✅ | Fixed |
| 20.10 | lat/lng virtuals on asset objects | ✅ | Fixed — Asset.js schema |

---

## Sign-off

| Section | Pass / Fail / Partial |
|---------|----------------------|
| 1. Authentication | ✅ Complete |
| 2. RBAC | ✅ Complete |
| 3. Dashboard | ✅ Complete |
| 4. Asset Registry | 🔄 In Progress (at 4B) |
| 5–20 | ⏳ Pending |

---

**Total Tests:** 160  
**Pass:** 52  **Fail:** 0  **Partial:** 0  **Remaining:** 108
