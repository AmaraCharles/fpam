// Shared HTML snippets used across all pages
const NAV = (active) => `
<div class="hero-ticker">
  <div class="ticker-label"><i class="fa-solid fa-broadcast-tower"></i> Live</div>
  <div class="ticker-track">
    <span class="ticker-item"><i class="fa-solid fa-building"></i> 2,764+ Federal Assets Catalogued Nationwide</span>
    <span class="ticker-item"><i class="fa-solid fa-sitemap"></i> 31 Federal Ministries & Agencies — Fully Inventoried</span>
    <span class="ticker-item"><i class="fa-solid fa-map-location-dot"></i> Coverage Across All 36 States + FCT Abuja</span>
    <span class="ticker-item"><i class="fa-solid fa-shield-halved"></i> FPAM — Under the Federal Ministry of Housing & Urban Development</span>
    <span class="ticker-item"><i class="fa-solid fa-building"></i> 2,764+ Federal Assets Catalogued Nationwide</span>
    <span class="ticker-item"><i class="fa-solid fa-sitemap"></i> 31 Federal Ministries & Agencies — Fully Inventoried</span>
    <span class="ticker-item"><i class="fa-solid fa-map-location-dot"></i> Coverage Across All 36 States + FCT Abuja</span>
    <span class="ticker-item"><i class="fa-solid fa-shield-halved"></i> FPAM — Under the Federal Ministry of Housing & Urban Development</span>
  </div>
</div>
<nav id="mainNav">
  <div class="nav-brand">
    <div class="nav-coat">🦅</div>
    <div class="nav-title">Federal Public Assets Management <span>Federal Ministry of Housing & Urban Development</span></div>
  </div>
  <div class="nav-links">
    <a href="./about.html" class="${active==='about'?'active':''}">About</a>
    <a href="./mandate.html" class="${active==='mandate'?'active':''}">Mandate</a>
    <a href="./inventory.html" class="${active==='inventory'?'active':''}">Inventory</a>
    <a href="./ministries.html" class="${active==='ministries'?'active':''}">By Ministry</a>
    <a href="./gallery.html" class="${active==='gallery'?'active':''}">Gallery</a>
    <a href="./contact.html" class="${active==='contact'?'active':''}">Contact</a>
  </div>
  <button class="nav-mobile-btn" id="mobileMenuBtn"><i class="fa-solid fa-bars"></i></button>
</nav>`;
