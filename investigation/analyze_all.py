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

# Load raw datasets
with open("investigation/data/raw/listings.json", "r", encoding="utf-8") as f:
    raw_listings_data = json.load(f)
    listings = raw_listings_data["results"]

with open("investigation/data/raw/rentals.json", "r", encoding="utf-8") as f:
    raw_rentals_data = json.load(f)
    rentals = raw_rentals_data["results"]

with open("investigation/data/raw/projects.json", "r", encoding="utf-8") as f:
    raw_projects_data = json.load(f)
    projects = raw_projects_data["results"]

print(f"Total downloaded listings: {len(listings)}")
print(f"Total downloaded rentals: {len(rentals)}")
print(f"Total downloaded projects: {len(projects)}")

# Check duplicate listing_ids in downloaded listings stream
listing_ids = [l["listing_id"] for l in listings]
id_counts = Counter(listing_ids)
duplicates_in_stream = {k: v for k, v in id_counts.items() if v > 1}
print(f"Unique listing_ids in downloaded listings: {len(set(listing_ids))}")
if duplicates_in_stream:
    print(f"WARNING: Found {len(duplicates_in_stream)} listing_ids repeated in pagination stream!")
    print(f"Sample repeated IDs: {list(duplicates_in_stream.items())[:5]}")

print("\n=======================================================")
print("QUESTION 1: total_listing_records")
print("=======================================================")
print(f"1. Total raw records fetched from /v1/listings: {len(listings)}")
print(f"2. Reported total on page 1: {raw_listings_data['first_page_meta']['reported_total']}")
print(f"3. Unique listing_ids: {len(set(listing_ids))}")

print("\n=======================================================")
print("QUESTION 3: active_listings")
print("=======================================================")
live_listings = [l for l in listings if l.get("is_live") is True]
print(f"Listings with is_live == True: {len(live_listings)}")
print(f"Listings with is_live == False: {len([l for l in listings if l.get('is_live') is False])}")
print(f"Listings with is_live is None/Missing: {len([l for l in listings if 'is_live' not in l])}")

print("\n=======================================================")
print("QUESTION 4: corrupt_listing_ids (Impossible Listings)")
print("=======================================================")
corrupt_candidates = []

for l in listings:
    lid = l["listing_id"]
    reasons = []
    
    # 1. Negative or zero price
    if l.get("price") is not None and l["price"] <= 0:
        reasons.append(f"negative_or_zero_price ({l['price']})")
        
    # 2. Floor > total_floors
    floor = l.get("floor")
    total_floors = l.get("total_floors")
    if floor is not None and total_floors is not None:
        if floor > total_floors:
            reasons.append(f"floor_exceeds_total_floors (floor {floor} > total {total_floors})")
        if floor < 0:
            reasons.append(f"negative_floor ({floor})")
        if total_floors <= 0:
            reasons.append(f"non_positive_total_floors ({total_floors})")

    # 3. Carpet area > Super built-up area
    carpet = l.get("carpet_area")
    sbua = l.get("super_built_up_area")
    if carpet is not None and sbua is not None:
        if carpet <= 0:
            reasons.append(f"negative_or_zero_carpet_area ({carpet})")
        if sbua <= 0:
            reasons.append(f"negative_or_zero_super_built_up ({sbua})")
        if carpet > sbua and sbua > 0:
            reasons.append(f"carpet_exceeds_sbua ({carpet} > {sbua})")

    # 4. Bedrooms / Bathrooms <= 0
    bed = l.get("bedroom")
    bath = l.get("bathroom")
    if bed is not None and bed <= 0:
        reasons.append(f"zero_or_negative_bedrooms ({bed})")
    if bath is not None and bath <= 0:
        reasons.append(f"zero_or_negative_bathrooms ({bath})")

    # 5. Geolocation outside valid Bangalore area (~lat 12.7 to 13.3, lng 77.3 to 77.9)
    lat = l.get("latitude")
    lng = l.get("longitude")
    if lat is not None and lng is not None:
        if not (12.0 <= lat <= 14.0 and 76.0 <= lng <= 79.0):
            reasons.append(f"impossible_geo ({lat}, {lng})")
        if lat == 0 and lng == 0:
            reasons.append("zero_coordinates")

    if reasons:
        corrupt_candidates.append({"listing_id": lid, "reasons": reasons, "listing": l})

print(f"Found {len(corrupt_candidates)} corrupt listing records:")
for c in corrupt_candidates:
    print(f"  - {c['listing_id']}: {', '.join(c['reasons'])}")

corrupt_ids_sorted = sorted([c["listing_id"] for c in corrupt_candidates])

print("\n=======================================================")
print("QUESTION 5: total_monthly_rent (Assigned: Yelahanka)")
print("=======================================================")
yelahanka_rentals = [r for r in rentals if str(r.get("locality", "")).strip().lower() == "yelahanka"]
print(f"Total rentals in Yelahanka: {len(yelahanka_rentals)}")
total_rent = sum(r.get("price", 0) for r in yelahanka_rentals)
print(f"Sum of monthly rent in Yelahanka: INR {total_rent:,}")

# Check all rental localities
rent_localities = Counter(str(r.get("locality", "")).strip().lower() for r in rentals)
print(f"All rental localities distribution: {rent_localities}")

print("\n=======================================================")
print("QUESTION 7: costliest_project")
print("=======================================================")
# Check price_max for all projects
# Note: price_max in projects is in Crores (Cr)
sorted_projects = sorted(projects, key=lambda p: p.get("price_max", 0), reverse=True)
top_proj = sorted_projects[0]
print(f"Top project: ID={top_proj['project_id']}, Name='{top_proj.get('apartment_name')}', price_max={top_proj.get('price_max')} Cr")
# Convert Cr to INR (1 Cr = 10,000,000 INR = 1e7)
# Check whether price_max is float like 69.9 or integer
price_max_cr = top_proj["price_max"]
price_max_inr = int(round(price_max_cr * 10000000))
print(f"price_max_inr: {price_max_inr} (INR {price_max_inr:,})")
costliest_project_answer = {
    "project_id": top_proj["project_id"],
    "price_max_inr": price_max_inr
}
print(f"Top 5 costliest projects: {[(p['project_id'], p.get('apartment_name'), p.get('price_max'), int(round(p.get('price_max',0)*1e7))) for p in sorted_projects[:5]]}")

print("\n=======================================================")
print("QUESTION 8: listings_last_7_days")
print("=======================================================")
# Reference: 2026-09-10T00:00:00+05:30 (IST)
# 7 days before: 2026-09-03T00:00:00+05:30 (IST)
ist_tz = timezone(timedelta(hours=5, minutes=30))
ref_end_ist = datetime(2026, 9, 10, 0, 0, 0, tzinfo=ist_tz)
ref_start_ist = datetime(2026, 9, 3, 0, 0, 0, tzinfo=ist_tz)

print(f"Window in IST: [{ref_start_ist.isoformat()}, {ref_end_ist.isoformat()})")
ref_end_utc = ref_end_ist.astimezone(timezone.utc)
ref_start_utc = ref_start_ist.astimezone(timezone.utc)
print(f"Window in UTC: [{ref_start_utc.isoformat()}, {ref_end_utc.isoformat()})")

last_7_days_listings = []
for l in listings:
    posted_str = l.get("posted_at")
    if posted_str:
        # e.g. "2026-06-14T21:03:00Z"
        # Parse ISO
        dt = datetime.fromisoformat(posted_str.replace("Z", "+00:00"))
        # Convert to IST
        dt_ist = dt.astimezone(ist_tz)
        if ref_start_ist <= dt_ist < ref_end_ist:
            last_7_days_listings.append(l)

print(f"Total listings posted in last 7 days before reference moment: {len(last_7_days_listings)}")

print("\n=======================================================")
print("QUESTION 10: projects_with_wrong_listing_count")
print("=======================================================")
# Count actual listings for each project_id in listings
actual_project_listings = Counter(l.get("project_id") for l in listings if l.get("project_id") is not None)
mismatched_projects = []

for p in projects:
    pid = p["project_id"]
    reported_total = p.get("total_listings", 0)
    actual_count = actual_project_listings.get(pid, 0)
    if reported_total != actual_count:
        mismatched_projects.append({
            "project_id": pid,
            "reported": reported_total,
            "actual": actual_count,
            "diff": actual_count - reported_total
        })

print(f"Total projects evaluated: {len(projects)}")
print(f"Projects with mismatched listing count: {len(mismatched_projects)} / {len(projects)}")
print(f"Sample mismatches: {mismatched_projects[:5]}")
