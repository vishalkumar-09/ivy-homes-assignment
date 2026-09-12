import os
import sys
import json
import re
from collections import Counter, defaultdict

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

with open("investigation/data/raw/listings.json", "r", encoding="utf-8") as f:
    listings = json.load(f)["results"]

print(f"Total listing records: {len(listings)}")

# Normalize helper
def normalize_str(s):
    if not s:
        return ""
    # remove special characters and lowercase
    return re.sub(r'[^a-z0-9]', '', str(s).lower())

def get_norm_carpet(l):
    c = l.get("carpet_area", 0)
    pt = l.get("property_type")
    # if sqm (<300 and non-plot and website == 'magichomes')
    if pt != "plot" and l.get("website") == "magichomes" and c < 300:
        return int(round(c * 10.763910416709722))
    return int(c)

# Method 1: Physical attributes cluster (apt, loc, pt, floor, bed, bath, facing, normalized_carpet)
clusters_1 = defaultdict(list)
for l in listings:
    apt = normalize_str(l.get("apartment_name"))
    loc = normalize_str(l.get("locality"))
    pt = normalize_str(l.get("property_type"))
    floor = l.get("floor")
    bed = l.get("bedroom")
    bath = l.get("bathroom")
    facing = normalize_str(l.get("facing_direction"))
    c_sqft = get_norm_carpet(l)
    
    # Bucket carpet to within +/- 2 sqft to absorb rounding
    c_bucket = round(c_sqft / 5) * 5
    
    key = (apt, loc, pt, floor, bed, bath, facing, c_bucket)
    clusters_1[key].append(l["listing_id"])

print(f"Method 1 (Physical signature with normalized carpet bucket): {len(clusters_1)} unique properties")

# Method 2: Physical attributes exact (apt, loc, pt, floor, bed, bath, facing)
clusters_2 = defaultdict(list)
for l in listings:
    apt = normalize_str(l.get("apartment_name"))
    loc = normalize_str(l.get("locality"))
    pt = normalize_str(l.get("property_type"))
    floor = l.get("floor")
    bed = l.get("bedroom")
    bath = l.get("bathroom")
    facing = normalize_str(l.get("facing_direction"))
    
    key = (apt, loc, pt, floor, bed, bath, facing)
    clusters_2[key].append(l["listing_id"])

print(f"Method 2 (Physical signature without carpet): {len(clusters_2)} unique properties")

# Method 3: Geo coordinates + Floor + Bedroom + Facing
clusters_3 = defaultdict(list)
for l in listings:
    lat = round(l.get("latitude", 0), 4) if l.get("latitude") else 0
    lng = round(l.get("longitude", 0), 4) if l.get("longitude") else 0
    # if swapped lat/lng, swap them back for clustering
    if lat > 50 and lng < 20:
        lat, lng = lng, lat
    floor = l.get("floor")
    bed = l.get("bedroom")
    facing = normalize_str(l.get("facing_direction"))
    key = (lat, lng, floor, bed, facing)
    clusters_3[key].append(l["listing_id"])

print(f"Method 3 (Geo + Floor + Bed + Facing): {len(clusters_3)} unique properties")

# Let's inspect sample multi-listing clusters
multi_clusters = {k: v for k, v in clusters_1.items() if len(v) > 1}
print(f"\nMulti-listing properties count: {len(multi_clusters)}")
print("Sample duplicate properties:")
for k, lids in list(multi_clusters.items())[:5]:
    print(f"\nCluster Key: {k}")
    sample_items = [l for l in listings if l["listing_id"] in lids]
    for s in sample_items:
        print(f"  - {s['listing_id']} ({s.get('website')}): price={s.get('price'):,}, carpet={s.get('carpet_area')}, floor={s.get('floor')}/{s.get('total_floors')}, posted_by={s.get('posted_by_name')}")
