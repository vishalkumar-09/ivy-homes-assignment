import os
import sys
import json
import numpy as np

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

with open("investigation/data/raw/listings.json", "r", encoding="utf-8") as f:
    listings = json.load(f)["results"]

with open("investigation/verify_fake_and_corrupt.py") as f:
    # Get the corrupt and fake sets
    pass

# Recompute corrupt and fake sets
import re

corrupt_set = set()
for l in listings:
    lid = l["listing_id"]
    pt = l.get("property_type")
    price = l.get("price", 0)
    floor = l.get("floor")
    total_floors = l.get("total_floors")
    carpet = l.get("carpet_area", 0)
    sbua = l.get("super_built_up_area", 0)
    lat = l.get("latitude")
    lng = l.get("longitude")
    bed = l.get("bedroom")
    bath = l.get("bathroom")
    
    if price is not None and price <= 0:
        corrupt_set.add(lid)
    elif lat and lng and (lat > 50 and lng < 20):
        corrupt_set.add(lid)
    elif carpet > 0 and sbua > 0 and carpet > sbua:
        corrupt_set.add(lid)
    elif pt != "plot" and floor is not None and total_floors is not None and total_floors > 0 and floor > total_floors:
        corrupt_set.add(lid)
    elif pt not in ["plot"] and (bed == 0 or bath == 0):
        corrupt_set.add(lid)

fake_set = set()
scam_patterns = [
    r"site visit only after the booking amount is paid",
    r"Pay a token amount of Rs 25,000 today to block the unit",
    r"Below market price, this week only",
]

for l in listings:
    lid = l["listing_id"]
    p = l.get("price", 0)
    if p and 0 < p < 100000:
        fake_set.add(lid)
    desc = l.get("description", "")
    for pat in scam_patterns:
        if re.search(pat, desc, re.IGNORECASE):
            fake_set.add(lid)

# Filter 2BHK listings where is_live == True, not in corrupt, not in fake
valid_2bhk = [
    l for l in listings
    if l.get("bedroom") == 2
    and l.get("is_live") is True
    and l["listing_id"] not in corrupt_set
    and l["listing_id"] not in fake_set
]

print(f"Total valid active 2BHK listings: {len(valid_2bhk)}")

# Let's inspect carpet area by website for these 2BHKs
for w in sorted(set(l.get("website") for l in valid_2bhk)):
    w_items = [l for l in valid_2bhk if l.get("website") == w]
    carpets = [l.get("carpet_area") for l in w_items]
    sbuas = [l.get("super_built_up_area") for l in w_items]
    prices = [l.get("price") for l in w_items]
    ppsq_raw = [p / c for p, c in zip(prices, carpets) if c > 0]
    print(f"Website {w:12}: Count={len(w_items):3d} | Carpet: min={min(carpets)}, max={max(carpets)}, median={np.median(carpets):.1f} | Raw P/sqft median={np.median(ppsq_raw):.1f}, mean={np.mean(ppsq_raw):.1f}")
    # Print 3 samples
    for s in w_items[:3]:
        print(f"   Sample {s['listing_id']}: price={s['price']:,}, carpet={s['carpet_area']}, sbua={s['super_built_up_area']}, pt={s['property_type']}")

print("\n--- Calculations for Question 6 ---")

# Option A: Raw price / carpet_area without conversion
ppsq_raw_all = [l["price"] / l["carpet_area"] for l in valid_2bhk]
mean_raw = sum(ppsq_raw_all) / len(ppsq_raw_all)
print(f"Option A (Raw price / carpet_area across all): {mean_raw:.4f} -> {mean_raw:.2f}")

# Option B: Convert magichomes sqm to sqft (if magichomes carpet_area is sqm, 1 sqm = 10.7639104 sqft)
# Note: In magichomes, let's check if all carpet_area < 200 are in sqm or if all magichomes are sqm
ppsq_converted = []
for l in valid_2bhk:
    c = l["carpet_area"]
    # Check if carpet area is in sqm (e.g. if website == 'magichomes' and carpet < 200)
    # Wait, let's check what carpet values exist in magichomes
    if l.get("website") == "magichomes" and c < 300: # sqm
        c_sqft = c * 10.763910416709722
    else:
        c_sqft = c
    ppsq_converted.append(l["price"] / c_sqft)

mean_converted = sum(ppsq_converted) / len(ppsq_converted)
print(f"Option B (Convert sqm to sqft for magichomes): {mean_converted:.4f} -> {mean_converted:.2f}")

# Option C: Check if super_built_up_area is also in sqm on magichomes
print("\nChecking magichomes sbua vs carpet:")
for l in valid_2bhk:
    if l.get("website") == "magichomes":
        print(f"   {l['listing_id']}: carpet={l['carpet_area']}, sbua={l['super_built_up_area']}, ratio={l['super_built_up_area']/l['carpet_area']:.2f}")
        break
