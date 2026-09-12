import os
import sys
import json
import re

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

with open("investigation/data/raw/listings.json", "r", encoding="utf-8") as f:
    listings = json.load(f)["results"]

# Corrupt listing identification
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

print(f"Corrupt listings count: {len(corrupt_set)}")

# Fake listing identification
fake_set = set()
fake_reasons = {}

# 1. Bait rental prices posted as sale (< 100k)
for l in listings:
    lid = l["listing_id"]
    p = l.get("price", 0)
    if p and 0 < p < 100000:
        fake_set.add(lid)
        fake_reasons[lid] = f"bait_price_under_100k (price={p})"

# 2. Scam phrases in description
scam_patterns = [
    (r"site visit only after the booking amount is paid", "advance_booking_fee_scam"),
    (r"Pay a token amount of Rs 25,000 today to block the unit", "token_amount_scam"),
    (r"Below market price, this week only", "urgency_bait_scam"),
]

for l in listings:
    lid = l["listing_id"]
    desc = l.get("description", "")
    for pat, label in scam_patterns:
        if re.search(pat, desc, re.IGNORECASE):
            fake_set.add(lid)
            fake_reasons[lid] = label

print(f"Fake listings count: {len(fake_set)}")
overlap = corrupt_set.intersection(fake_set)
print(f"Overlap between Corrupt and Fake: {len(overlap)}")
if overlap:
    print(f"Overlapping IDs: {overlap}")

print("\n--- Summary of Fake Listings ---")
print(f"Total unique fake listings: {len(fake_set)}")
for lid in sorted(fake_set):
    print(f"  {lid}: {fake_reasons.get(lid)}")
