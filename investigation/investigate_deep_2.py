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

with open("investigation/data/raw/rentals.json", "r", encoding="utf-8") as f:
    rentals = json.load(f)["results"]

with open("investigation/data/raw/projects.json", "r", encoding="utf-8") as f:
    projects = json.load(f)["results"]

print("=======================================================")
print("UNIT INVESTIGATION: CARPET AREA BY WEBSITE")
print("=======================================================")
websites = set(l.get("website") for l in listings)
for w in websites:
    w_listings = [l for l in listings if l.get("website") == w]
    carpets = [l.get("carpet_area", 0) for l in w_listings if l.get("carpet_area")]
    prices = [l.get("price", 0) for l in w_listings if l.get("price") and l.get("price") > 0]
    avg_carpet = sum(carpets) / len(carpets) if carpets else 0
    min_carpet = min(carpets) if carpets else 0
    max_carpet = max(carpets) if carpets else 0
    print(f"Website: {w:15} | Count: {len(w_listings):4d} | Carpet Area Range: [{min_carpet}, {max_carpet}] (Avg: {avg_carpet:.1f})")

print("\n=======================================================")
print("CHECKING 2BHK CARPET AREA ACROSS WEBSITES")
print("=======================================================")
for w in websites:
    w_2bhk = [l for l in listings if l.get("website") == w and l.get("bedroom") == 2 and l.get("property_type") == "apartment"]
    carpets = [l.get("carpet_area", 0) for l in w_2bhk]
    avg_c = sum(carpets)/len(carpets) if carpets else 0
    print(f"Website: {w:15} | 2BHK Apartment Count: {len(w_2bhk):3d} | 2BHK Carpet Area Range: [{min(carpets) if carpets else 0}, {max(carpets) if carpets else 0}] (Avg: {avg_c:.1f})")

print("\n=======================================================")
print("QUESTION 4: COMPLETE CORRUPT LISTINGS PROOF")
print("=======================================================")
corrupt_records = []
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
    
    reasons = []
    
    # 1. Negative Price
    if price is not None and price <= 0:
        reasons.append(f"negative_price ({price})")
        
    # 2. Swapped / Impossible Coordinates (Lat > 50 in Bangalore)
    if lat and lng:
        if lat > 50 and lng < 20:
            reasons.append(f"swapped_coordinates (lat={lat}, lng={lng})")
        elif not (12.0 <= lat <= 14.0 and 76.0 <= lng <= 79.0):
            reasons.append(f"out_of_bounds_geo (lat={lat}, lng={lng})")
            
    # 3. Carpet Area > Super Built-up Area
    if carpet > 0 and sbua > 0 and carpet > sbua:
        reasons.append(f"carpet_area_greater_than_sbua ({carpet} > {sbua})")
        
    # 4. Floor > Total Floors (in buildings)
    if pt != "plot" and floor is not None and total_floors is not None:
        if total_floors > 0 and floor > total_floors:
            reasons.append(f"floor_exceeds_total_floors ({floor} > {total_floors})")
        if floor < 0:
            reasons.append(f"negative_floor ({floor})")
            
    # 5. Zero bedroom / bathroom in non-plot property
    if pt not in ["plot"] and bed == 0:
        reasons.append(f"zero_bedroom_in_{pt}")
    if pt not in ["plot"] and bath == 0:
        reasons.append(f"zero_bathroom_in_{pt}")

    if reasons:
        corrupt_records.append({
            "listing_id": lid,
            "reasons": reasons,
            "property_type": pt,
            "apartment_name": l.get("apartment_name"),
            "price": price,
            "carpet_area": carpet,
            "super_built_up_area": sbua,
            "floor": floor,
            "total_floors": total_floors,
            "lat": lat,
            "lng": lng
        })

print(f"Total Corrupt Listings Found: {len(corrupt_records)}")
corrupt_listing_ids = sorted([c["listing_id"] for c in corrupt_records])
print("Sorted Corrupt Listing IDs:")
print(json.dumps(corrupt_listing_ids, indent=2))

print("\n=======================================================")
print("QUESTION 9: COMPLETE FAKE LISTINGS (FRAUD) INVESTIGATION")
print("=======================================================")

# Hypotheses for Fake Listings:
# 1. Bait prices (e.g. Sale price < 50,000 INR for multi-crore property)
# 2. Duplicate descriptions that mention different apartment / locality than metadata
# 3. Repeated contact numbers posting bait / fake listings
# 4. Same property posted with conflicting attributes
# Let's inspect all candidate fake listings:

fake_candidates = []

# Check bait prices (< 100,000 INR for sale listing)
bait_price_listings = [l for l in listings if l.get("price") and 0 < l["price"] < 100000 and l["listing_id"] not in corrupt_listing_ids]
print(f"1. Listings with absurd bait price (< 1 Lakh INR): {len(bait_price_listings)}")
for l in bait_price_listings:
    print(f"   {l['listing_id']}: price={l['price']} | {l['apartment_name']} ({l['locality']}) | {l['bedroom']}BHK | {l['posted_by_contact']}")

# Check text contradictions: Description contains "Owner moving abroad, priced to sell" or template spam
spam_phrases = ["owner moving abroad", "urgent sale", "priced to sell"]
spam_listings = []
for l in listings:
    desc = l.get("description", "").lower()
    if any(p in desc for p in spam_phrases):
        spam_listings.append(l)

print(f"\n2. Listings with urgent/bait phrases in description: {len(spam_listings)}")
for l in spam_listings[:10]:
    print(f"   {l['listing_id']}: price={l['price']:,} | {l['apartment_name']} ({l['locality']}) | desc='{l['description']}'")

# Check Description vs Field contradictions (e.g. description says 3 BHK in Whitefield, metadata says 2 BHK in Koramangala)
contradiction_listings = []
for l in listings:
    if l["listing_id"] in corrupt_listing_ids:
        continue
    desc = l.get("description", "")
    desc_lower = desc.lower()
    loc = l.get("locality", "").lower()
    bed = l.get("bedroom")
    apt = l.get("apartment_name", "").lower()
    
    reasons = []
    # Check BHK in description vs field
    m_bhk = re.search(r'(\d)\s*bhk', desc_lower)
    if m_bhk and bed is not None and int(m_bhk.group(1)) != bed:
        reasons.append(f"description says {m_bhk.group(1)} BHK but bedroom field is {bed}")
        
    # Check locality in description vs field
    for loc_name in ["whitefield", "koramangala", "indiranagar", "hsr layout", "bellandur", "electronic city", "jp nagar", "hebbal", "yelahanka", "sarjapur road"]:
        if loc_name in desc_lower and loc != loc_name and f"in {loc_name}" in desc_lower:
            reasons.append(f"description says in {loc_name} but locality is {loc}")

    if reasons:
        contradiction_listings.append({"listing_id": l["listing_id"], "reasons": reasons, "listing": l})

print(f"\n3. Listings with Description vs Metadata contradictions: {len(contradiction_listings)}")
for cl in contradiction_listings:
    print(f"   {cl['listing_id']}: {', '.join(cl['reasons'])} | Desc='{cl['listing'].get('description')}'")

# Check cross-project duplicate descriptions
desc_map = defaultdict(list)
for l in listings:
    d_clean = l.get("description", "").strip()
    if d_clean:
        desc_map[d_clean].append(l)

shared_desc_across_different_apts = []
for desc, group in desc_map.items():
    apts = set(g.get("apartment_name") for g in group)
    if len(apts) > 1:
        # Same exact description used for completely different apartments!
        shared_desc_across_different_apts.extend(group)

print(f"\n4. Listings sharing exact same description across DIFFERENT apartments: {len(shared_desc_across_different_apts)}")
for l in shared_desc_across_different_apts[:10]:
    print(f"   {l['listing_id']}: apt='{l.get('apartment_name')}' loc='{l.get('locality')}' | desc='{l.get('description')[:60]}...'")
