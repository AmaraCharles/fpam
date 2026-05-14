import os
import re
import io
import zipfile
import requests
import pandas as pd
from PIL import Image
from urllib.parse import quote

EXCEL_FILE = "LOWER VERSION Inventory of Public Buildings (1).xls"
OUTPUT_DIR = "asset_images"
ZIP_NAME = "public_assets_images.zip"

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Loading spreadsheet...")

df = pd.read_excel(EXCEL_FILE, header=None)

asset_names = []

# Extract possible asset names from all cells
for row in df.iterrows():
    values = row[1].tolist()

    for cell in values:
        if pd.isna(cell):
            continue

        name = str(cell).strip()

        if (
            len(name) > 6
            and name.lower() not in ["nan", "none"]
            and name not in asset_names
        ):
            asset_names.append(name)

print(f"Found {len(asset_names)} possible assets")


def clean_filename(name):
    name = re.sub(r"[^a-zA-Z0-9]+", "-", name)
    return name.strip("-").lower()


HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def search_wikimedia(asset_name):
    query = quote(asset_name)

    url = (
        "https://commons.wikimedia.org/w/api.php"
        f"?action=query&generator=search&gsrsearch={query}"
        "&gsrlimit=1&prop=imageinfo&iiprop=url&format=json"
    )

    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        data = r.json()

        if "query" not in data:
            return None

        pages = data["query"]["pages"]

        for _, page in pages.items():
            if "imageinfo" in page:
                return page["imageinfo"][0]["url"]

    except Exception:
        return None

    return None


success = 0

for idx, asset in enumerate(asset_names, start=1):
    print(f"[{idx}/{len(asset_names)}] Searching: {asset}")

    image_url = search_wikimedia(asset)

    if not image_url:
        continue

    try:
        r = requests.get(image_url, headers=HEADERS, timeout=30)

        if r.status_code != 200:
            continue

        img = Image.open(io.BytesIO(r.content)).convert("RGB")

        filename = clean_filename(asset) + ".jpg"
        filepath = os.path.join(OUTPUT_DIR, filename)

        img.save(filepath, "JPEG", quality=92)

        success += 1
        print(f"Saved: {filename}")

    except Exception:
        continue

print(f"\nDownloaded {success} images")

print("Creating ZIP archive...")

with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as zipf:
    for file in os.listdir(OUTPUT_DIR):
        path = os.path.join(OUTPUT_DIR, file)
        zipf.write(path, arcname=file)

print(f"Done → {ZIP_NAME}")