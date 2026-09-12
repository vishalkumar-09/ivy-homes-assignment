import os
import sys
import json
import re
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 1. Load Raw Datasets
with open("investigation/data/raw/listings.json", "r", encoding="utf-8") as f:
    listings = json.load(f)["results"]

with open("investigation/data/raw/rentals.json", "r", encoding="utf-8") as f:
    rentals = json.load(f)["results"]

with open("investigation/data/raw/projects.json", "r", encoding="utf-8") as f:
    projects = json.load(f)["results"]

# ==============================================================================
# Q1: total_listing_records
# ==============================================================================
total_listing_records = len(listings)

# ==============================================================================
# Q4: corrupt_listing_ids
# ==============================================================================
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
    
    # 1. Negative or zero price
    if price is not None and price <= 0:
        corrupt_set.add(lid)
    # 2. Swapped coordinates (Lat > 50 in India)
    elif lat and lng and (lat > 50 and lng < 20):
        corrupt_set.add(lid)
    # 3. Carpet area > Super Built-up Area
    elif carpet > 0 and sbua > 0 and carpet > sbua:
        corrupt_set.add(lid)
    # 4. Floor > Total Floors (in buildings)
    elif pt != "plot" and floor is not None and total_floors is not None and total_floors > 0 and floor > total_floors:
        corrupt_set.add(lid)
    # 5. Non-plot with 0 bedrooms or 0 bathrooms
    elif pt not in ["plot"] and (bed == 0 or bath == 0):
        corrupt_set.add(lid)

corrupt_listing_ids = sorted(list(corrupt_set))

# ==============================================================================
# Q9: fake_listing_ids
# ==============================================================================
fake_set = set()
scam_patterns = [
    r"site visit only after the booking amount is paid",
    r"Pay a token amount of Rs 25,000 today to block the unit",
    r"Below market price, this week only",
]

for l in listings:
    lid = l["listing_id"]
    # 1. Bait rental prices listed as sales (< 100k INR)
    p = l.get("price", 0)
    if p and 0 < p < 100000:
        fake_set.add(lid)
    # 2. Scam phrases in description
    desc = l.get("description", "")
    for pat in scam_patterns:
        if re.search(pat, desc, re.IGNORECASE):
            fake_set.add(lid)

fake_listing_ids = sorted(list(fake_set))

# ==============================================================================
# Q2: unique_properties
# ==============================================================================
def normalize_str(s):
    if not s:
        return ""
    return re.sub(r'[^a-z0-9]', '', str(s).lower())

def get_norm_carpet(l):
    c = l.get("carpet_area", 0)
    pt = l.get("property_type")
    if pt != "plot" and l.get("website") == "magichomes" and c < 300:
        return int(round(c * 10.763910416709722))
    return int(c)

property_clusters = defaultdict(list)
for l in listings:
    apt = normalize_str(l.get("apartment_name"))
    loc = normalize_str(l.get("locality"))
    pt = normalize_str(l.get("property_type"))
    floor = l.get("floor")
    bed = l.get("bedroom")
    bath = l.get("bathroom")
    facing = normalize_str(l.get("facing_direction"))
    c_sqft = get_norm_carpet(l)
    c_bucket = round(c_sqft / 5) * 5
    
    key = (apt, loc, pt, floor, bed, bath, facing, c_bucket)
    property_clusters[key].append(l["listing_id"])

unique_properties = len(property_clusters)

# ==============================================================================
# Q3: active_listings
# ==============================================================================
active_listings = len([l for l in listings if l.get("is_live") is True])

# ==============================================================================
# Q5: total_monthly_rent (Locality: Yelahanka)
# ==============================================================================
yelahanka_rentals = [r for r in rentals if str(r.get("locality", "")).strip().lower() == "yelahanka"]
total_monthly_rent = sum(r.get("price", 0) for r in yelahanka_rentals)

# ==============================================================================
# Q6: avg_price_per_sqft_2bhk
# ==============================================================================
# Across retrievable listing records where is_live is true and bedroom is 2,
# leaving out the records in answers to 4 and 9:
# the mean of price divided by carpet area, in rupees per square foot, to 2 decimals.
valid_2bhk = [
    l for l in listings
    if l.get("is_live") is True
    and l.get("bedroom") == 2
    and l["listing_id"] not in corrupt_set
    and l["listing_id"] not in fake_set
]

ppsq_list = []
for l in valid_2bhk:
    c = l.get("carpet_area", 0)
    # Unit conversion for magichomes SqM listings
    if l.get("website") == "magichomes" and c < 300:
        c_sqft = c * 10.763910416709722
    else:
        c_sqft = c
    if c_sqft > 0:
        ppsq_list.append(l["price"] / c_sqft)

avg_price_per_sqft_2bhk = round(sum(ppsq_list) / len(ppsq_list), 2)

# ==============================================================================
# Q7: costliest_project
# ==============================================================================
sorted_projects = sorted(projects, key=lambda p: p.get("price_max", 0), reverse=True)
top_proj = sorted_projects[0]
costliest_project = {
    "project_id": top_proj["project_id"],
    "price_max_inr": int(round(top_proj["price_max"] * 10000000))
}

# ==============================================================================
# Q8: listings_last_7_days
# ==============================================================================
# Reference: 2026-09-10T00:00:00+05:30
# Window: [2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30) in IST
ist_tz = timezone(timedelta(hours=5, minutes=30))
ref_end_ist = datetime(2026, 9, 10, 0, 0, 0, tzinfo=ist_tz)
ref_start_ist = datetime(2026, 9, 3, 0, 0, 0, tzinfo=ist_tz)

last_7_days_count = 0
for l in listings:
    posted_str = l.get("posted_at")
    if posted_str:
        dt = datetime.fromisoformat(posted_str.replace("Z", "+00:00"))
        dt_ist = dt.astimezone(ist_tz)
        if ref_start_ist <= dt_ist < ref_end_ist:
            last_7_days_count += 1

listings_last_7_days = last_7_days_count

# ==============================================================================
# Q10: projects_with_wrong_listing_count
# ==============================================================================
actual_project_listings = Counter(l.get("project_id") for l in listings if l.get("project_id") is not None)
wrong_count = 0
for p in projects:
    pid = p["project_id"]
    reported = p.get("total_listings", 0)
    actual = actual_project_listings.get(pid, 0)
    if reported != actual:
        wrong_count += 1

projects_with_wrong_listing_count = wrong_count

# ==============================================================================
# Print Results Summary
# ==============================================================================
answers = {
    "total_listing_records": total_listing_records,
    "unique_properties": unique_properties,
    "active_listings": active_listings,
    "corrupt_listing_ids": corrupt_listing_ids,
    "total_monthly_rent": total_monthly_rent,
    "avg_price_per_sqft_2bhk": avg_price_per_sqft_2bhk,
    "costliest_project": costliest_project,
    "listings_last_7_days": listings_last_7_days,
    "fake_listing_ids": fake_listing_ids,
    "projects_with_wrong_listing_count": projects_with_wrong_listing_count
}

print("==================================================================")
print("FINAL CALCULATED ANSWERS (10 QUESTIONS):")
print("==================================================================")
print(json.dumps(answers, indent=2))

with open("investigation/answers_output.json", "w", encoding="utf-8") as f:
    json.dump(answers, f, indent=2)
