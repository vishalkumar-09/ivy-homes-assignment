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

with open("investigation/data/raw/projects.json", "r", encoding="utf-8") as f:
    projects = json.load(f)["results"]

proj_by_id = {p["project_id"]: p for p in projects}

print("=== 1. CHECKING CONTACT NUMBERS & POSTED_BY ===")
contact_to_listings = defaultdict(list)
for l in listings:
    c = l.get("posted_by_contact")
    if c:
        contact_to_listings[c].append(l)

# Check if certain contacts post only suspicious/scam listings
contact_stats = []
for c, items in contact_to_listings.items():
    scam_count = 0
    bait_price_count = 0
    for l in items:
        desc = l.get("description", "").lower()
        if any(w in desc for w in ["site visit only after", "booking amount", "token amount", "this week only", "below market price"]):
            scam_count += 1
        if 0 < l.get("price", 0) < 100000:
            bait_price_count += 1
    contact_stats.append({
        "contact": c,
        "total": len(items),
        "scam_count": scam_count,
        "bait_price_count": bait_price_count,
        "names": set(l.get("posted_by_name") for l in items),
        "types": set(l.get("posted_by") for l in items),
        "sample_ids": [l["listing_id"] for l in items]
    })

contact_stats.sort(key=lambda x: (x["scam_count"] + x["bait_price_count"]), reverse=True)
print("Top contacts with suspicious listings:")
for cs in contact_stats[:15]:
    print(f"Contact {cs['contact']}: Total={cs['total']}, scam={cs['scam_count']}, bait={cs['bait_price_count']}, names={cs['names']}, types={cs['types']}")

print("\n=== 2. CHECKING PROJECT LINKAGES & MISMATCHES ===")
# Check if listing's apartment name / locality contradicts the linked project_id!
project_mismatches = []
for l in listings:
    pid = l.get("project_id")
    if pid and pid in proj_by_id:
        proj = proj_by_id[pid]
        p_apt = proj.get("apartment_name", "").lower()
        l_apt = l.get("apartment_name", "").lower()
        p_loc = proj.get("locality", "").lower()
        l_loc = l.get("locality", "").lower()
        
        # Check if locality or apartment completely contradicts
        if p_loc != l_loc:
            project_mismatches.append({
                "listing_id": l["listing_id"],
                "p_loc": p_loc,
                "l_loc": l_loc,
                "p_apt": p_apt,
                "l_apt": l_apt,
                "listing": l
            })

print(f"Listings where listing locality contradicts linked project locality: {len(project_mismatches)}")
for pm in project_mismatches[:10]:
    print(f"  {pm['listing_id']}: listing locality '{pm['l_loc']}' vs project locality '{pm['p_loc']}' | apt: '{pm['l_apt']}' vs '{pm['p_apt']}'")

print("\n=== 3. CHECKING AGENT / BROKER FRAUD NETWORKS ===")
# Let's inspect if there are listings posted by agents where is_verified is False or description has hidden contact numbers / URLs
unverified_with_scam = [l for l in listings if l.get("is_verified") is False]
print(f"Total unverified listings: {len(unverified_with_scam)}")

# Check duplicate listings across different websites for the same property with conflicting prices (e.g. 1 genuine price, 1 fake bait price)
prop_clusters = defaultdict(list)
for l in listings:
    # Cluster by physical property
    apt = str(l.get("apartment_name", "")).strip().lower()
    loc = str(l.get("locality", "")).strip().lower()
    floor = l.get("floor")
    bed = l.get("bedroom")
    bath = l.get("bathroom")
    facing = str(l.get("facing_direction", "")).strip().lower()
    pt = str(l.get("property_type", "")).strip().lower()
    if pt != "plot":
        prop_key = (apt, loc, pt, floor, bed, bath, facing)
        prop_clusters[prop_key].append(l)

price_discrepancy_clusters = []
for k, group in prop_clusters.items():
    if len(group) > 1:
        prices = [g.get("price", 0) for g in group if g.get("price") and g.get("price") > 0]
        if prices and (max(prices) / (min(prices) + 1)) > 5: # huge price divergence!
            price_discrepancy_clusters.append((k, group))

print(f"\nProperty clusters with extreme price divergence (>5x difference for same physical unit): {len(price_discrepancy_clusters)}")
for k, group in price_discrepancy_clusters[:10]:
    print(f"Cluster: {k}")
    for g in group:
        print(f"   {g['listing_id']} ({g.get('website')}): price={g.get('price'):,} | desc='{g.get('description')[:70]}...'")
