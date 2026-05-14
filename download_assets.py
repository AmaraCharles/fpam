"""
FPAM Asset Image Downloader
============================
Run this on your own machine (not Claude's environment).

Install dependencies first:
    pip install pandas xlrd pillow requests openpyxl

Then run:
    python download_assets.py

Place the Excel file in the same folder as this script,
or update EXCEL_FILE to its full path.
"""

import os, re, io, time, zipfile, requests, pandas as pd
from PIL import Image

# ── CONFIGURATION ────────────────────────────────────────────────────
EXCEL_FILE  = "LOWER_VERSION_Inventory_of_Public_Buildings__1_.xls"
OUTPUT_DIR  = "asset_images"
ZIP_NAME    = "public_assets_images.zip"
DELAY_SEC   = 0.4   # polite delay between requests
# ─────────────────────────────────────────────────────────────────────

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Loading spreadsheet...")
df = pd.read_excel(EXCEL_FILE, header=None, engine="xlrd")
df.columns = df.iloc[2]
df = df.iloc[3:].reset_index(drop=True)
df.columns = ["sn","mda","purpose","state","lga","address","landmark","year","valuation","gps"]
df = df.dropna(subset=["mda"])
df["mda"]   = df["mda"].astype(str).str.strip()
df["state"] = df["state"].fillna("").astype(str).str.strip()

# Build unique MDA list
seen, assets = set(), []
for _, row in df.iterrows():
    mda, state = row["mda"], row["state"]
    if mda.lower() in ["nan","none","mda",""]: continue
    if mda.lower() in seen: continue
    seen.add(mda.lower())
    state_str = state if state.lower() not in ["nan","none",""] else ""
    query = f"{mda} {state_str} Nigeria".strip()
    assets.append({"name": mda, "query": query})

print(f"Unique MDAs found: {len(assets)}\n")

# ── Helpers ───────────────────────────────────────────────────────────
def clean_filename(n):
    return re.sub(r"[^a-zA-Z0-9]+", "_", n).strip("_").lower()[:80]

HDR = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/120.0.0.0 Safari/537.36")
}

def get_wikipedia_image(query):
    """
    Two-step: search Wikipedia for the best matching article,
    then fetch that article's lead image.
    """
    # Step 1: Search
    try:
        r = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={"action":"query","list":"search","srsearch":query,
                    "srlimit":1,"format":"json"},
            headers=HDR, timeout=15
        )
        results = r.json().get("query",{}).get("search",[])
        if not results:
            return None
        title = results[0]["title"]
    except Exception:
        return None

    # Step 2: Get page image
    try:
        r = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={"action":"query","titles":title,
                    "prop":"pageimages","piprop":"original","format":"json"},
            headers=HDR, timeout=15
        )
        pages = r.json().get("query",{}).get("pages",{})
        for _, page in pages.items():
            src = page.get("original",{}).get("source")
            if src and not src.endswith(".svg"):
                return src
    except Exception:
        pass
    return None

# ── Download loop ─────────────────────────────────────────────────────
success = skipped = 0

for i, asset in enumerate(assets, 1):
    name  = asset["name"]
    query = asset["query"]
    print(f"[{i:>3}/{len(assets)}] {name[:55]:<55}", end=" ", flush=True)

    img_url = get_wikipedia_image(query)
    if not img_url:
        print("— no image found")
        skipped += 1
        time.sleep(DELAY_SEC)
        continue

    try:
        r = requests.get(img_url, headers=HDR, timeout=30)
        if r.status_code != 200:
            print(f"— HTTP {r.status_code}")
            skipped += 1
            continue

        img = Image.open(io.BytesIO(r.content)).convert("RGB")

        # Skip tiny images (icons / flags / logos)
        if img.width < 200 or img.height < 150:
            print(f"— too small ({img.width}x{img.height})")
            skipped += 1
            continue

        fname = clean_filename(name) + ".jpg"
        img.save(os.path.join(OUTPUT_DIR, fname), "JPEG", quality=92)
        success += 1
        print(f"✓ {img.width}x{img.height}  →  {fname}")

    except Exception as e:
        print(f"— error: {e}")
        skipped += 1

    time.sleep(DELAY_SEC)

# ── ZIP ───────────────────────────────────────────────────────────────
print(f"\n{'─'*65}")
print(f"  Downloaded : {success} images")
print(f"  Skipped    : {skipped} (no Wikipedia match, too small, or error)")
print(f"{'─'*65}\n")

if success > 0:
    print("Creating ZIP archive...")
    with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(os.listdir(OUTPUT_DIR)):
            z.write(os.path.join(OUTPUT_DIR, f), arcname=f)
    size_mb = os.path.getsize(ZIP_NAME) / 1_000_000
    print(f"Done!  →  {ZIP_NAME}  ({size_mb:.1f} MB)")
else:
    print("No images were downloaded.")