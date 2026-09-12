import os
import sys
import json
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
print("DEEP DIVE: PROPERTY TYPES & ZERO VALUES")
print("=======================================================")
for pt in set(l.get("property_type") for l in listings):
    pt_listings = [l for l in listings if l.get("property_type") == pt]
    zero_bed = [l for l in pt_listings if l.get("bedroom") == 0]
    zero_floor = [l for l in pt_listings if l.get("total_floors") == 0]
    print(f"Property Type: '{pt}' (Total: {len(pt_listings)}) -> zero_bed: {len(zero_bed)}, zero_total_floors: {len(zero_floor)}")

print("\n=======================================================")
print("DEEP DIVE: CORRUPT LISTINGS (PHYSICALLY IMPOSSIBLE)")
print("=======================================================")
# Let's check clear physical impossibilities:
# 1. Negative prices
# 2. Floor > total_floors (for buildings)
# 3. Carpet area > super built-up area
# 4. Inverted coordinates (Lat > 50, Lng < 20 in India)
# 5. Non-plot with 0 bedrooms or 0 bathrooms
# 6. Carpet area <= 0 or super built up <= 0

corrupt_dict = {}

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
    
    # Negative price
    if price is not None and price <= 0:
        reasons.append(f"negative_price ({price})")
        
    # Swapped lat/lng (Lat in Bangalore is ~12.8-13.2, Lng is ~77.4-77.8)
    if lat and lng:
        if lat > 50 and lng < 20: # clearly swapped lat and lng
            reasons.append(f"swapped_coordinates (lat={lat}, lng={lng})")
        elif not (10.0 <= lat <= 15.0 and 70.0 <= lng <= 85.0):
            reasons.append(f"out_of_bounds_geo (lat={lat}, lng={lng})")
            
    # Carpet area > SBUA (Carpet area can never exceed Super Built Up Area)
    if carpet > 0 and sbua > 0 and carpet > sbua:
        reasons.append(f"carpet_area_greater_than_super_built_up ({carpet} > {sbua})")
        
    # Floor > Total floors
    if pt != "plot" and floor is not None and total_floors is not None:
        if total_floors > 0 and floor > total_floors:
            reasons.append(f"floor_exceeds_total_floors ({floor} > {total_floors})")
        if floor < 0:
            reasons.append(f"negative_floor ({floor})")
            
    # Zero bedroom / bathroom in non-plot
    if pt not in ["plot"] and bed == 0:
        reasons.append(f"zero_bedroom_in_{pt}")
    if pt not in ["plot"] and bath == 0:
        reasons.append(f"zero_bathroom_in_{pt}")

    if reasons:
        corrupt_dict[lid] = {"reasons": reasons, "item": l}

print(f"Total verified corrupt listing IDs: {len(corrupt_dict)}")
for lid, info in sorted(corrupt_dict.items()):
    print(f"  {lid}: {', '.join(info['reasons'])} | {info['item'].get('apartment_name')} | {info['item'].get('locality')} | price={info['item'].get('price')}")

print("\n=======================================================")
print("DEEP DIVE: QUESTION 9 - FAKE LISTINGS (FRAUD DETECTION)")
print("=======================================================")
# Fake listings exist to generate enquiries (bait/lead gen)
# Signals:
# 1. Unusually low price (e.g. price per sqft < 1000 INR/sqft or price way below market)
# 2. Duplicate descriptions with mismatched details (e.g. description says "3 BHK in Prestige Whitefield" but listing is 2 BHK in Koramangala)
# 3. Repeated contact numbers across completely different unrelated properties/websites with identical templates
# 4. Description containing obvious fake/spam patterns or mismatched apartment name
# 5. Extremely suspicious price patterns

# Let's inspect price per sqft distribution for all valid listings
price_per_sqft_list = []
for l in listings:
    if l["listing_id"] not in corrupt_dict and l.get("price") and l.get("carpet_area") and l["carpet_area"] > 0:
        ppsq = l["price"] / l["carpet_area"]
        price_per_sqft_list.append((ppsq, l))

price_per_sqft_list.sort(key=lambda x: x[0])
print("\nLowest 15 price_per_sqft listings:")
for ppsq, l in price_per_sqft_list[:15]:
    print(f"  {l['listing_id']}: {ppsq:.2f} INR/sqft | price={l['price']:,} | carpet={l['carpet_area']} | {l['bedroom']}BHK {l['property_type']} | {l['apartment_name']} ({l['locality']}) | desc='{l['description'][:60]}...'")

print("\nHighest 10 price_per_sqft listings:")
for ppsq, l in price_per_sqft_list[-10:]:
    print(f"  {l['listing_id']}: {ppsq:.2f} INR/sqft | price={l['price']:,} | carpet={l['carpet_area']} | {l['bedroom']}BHK {l['property_type']} | {l['apartment_name']} ({l['locality']}) | desc='{l['description'][:60]}...'")

# Check Description vs Metadata Mismatches (e.g. Description says "3 BHK" but bedroom == 2, or description says "Whitefield" but locality == "koramangala")
print("\nChecking Description vs Metadata discrepancies:")
desc_mismatches = []
for l in listings:
    desc = l.get("description", "").lower()
    loc = l.get("locality", "").lower()
    bed = l.get("bedroom")
    apt = l.get("apartment_name", "").lower()
    
    flags = []
    # Check if description mentions a completely different locality
    localities_all = ["whitefield", "koramangala", "indiranagar", "hsr layout", "bellandur", "electronic city", "jp nagar", "hebbal", "yelahanka", "sarjapur road"]
    mentioned_locs = [lo for lo in localities_all if lo in desc]
    if mentioned_locs and loc not in mentioned_locs:
        flags.append(f"desc_mentions_locality_{mentioned_locs}_but_listing_is_{loc}")
        
    # Check BHK mismatch in description: e.g. "3 bhk" in desc but bedroom == 2
    bhk_match = re.search(r'(\d)\s*bhk', desc)
    if bhk_match:
        desc_bhk = int(bhk_match.group(1))
        if desc_bhk != bed and bed is not None:
            flags.append(f"desc_says_{desc_bhk}bhk_but_bedroom_is_{bed}")
            
    if flags:
        desc_mismatches.append({"listing_id": l["listing_id"], "flags": flags, "listing": l})

print(f"Found {len(desc_mismatches)} listings with Description vs Field contradictions:")
for dm in desc_mismatches[:20]:
    print(f"  {dm['listing_id']}: {dm['flags']} | Loc={dm['listing'].get('locality')}, BHK={dm['listing'].get('bedroom')} | Desc='{dm['listing'].get('description')}'")

# Check Phone Number frequency / syndicates
phone_counter = Counter(l.get("posted_by_contact") for l in listings if l.get("posted_by_contact"))
print(f"\nTop 10 most frequent phone numbers:")
for ph, count in phone_counter.most_common(10):
    print(f"  {ph}: {count} listings")

# Check exact duplicate descriptions across different listing_ids
desc_to_ids = defaultdict(list)
for l in listings:
    if l.get("description"):
        desc_to_ids[l["description"].strip()].append(l["listing_id"])

duplicate_descs = {k: v for k, v in desc_to_ids.items() if len(v) > 1}
print(f"\nDescriptions shared across multiple listings: {len(duplicate_descs)} unique descriptions covering {sum(len(v) for v in duplicate_descs.values())} listings")

print("\n=======================================================")
print("DEEP DIVE: QUESTION 2 - UNIQUE PROPERTIES")
print("=======================================================")
# How to define a distinct physical property:
# A physical property in an apartment/society is determined by:
# (apartment_name, locality, floor, bedroom, bathroom, carpet_area, facing_direction)
# or exact coordinates (lat, lng) + floor + bedroom + carpet_area
property_clusters = defaultdict(list)
for l in listings:
    # Normalize key
    apt = str(l.get("apartment_name", "")).strip().lower()
    loc = str(l.get("locality", "")).strip().lower()
    floor = l.get("floor")
    bed = l.get("bedroom")
    bath = l.get("bathroom")
    carpet = l.get("carpet_area")
    facing = str(l.get("facing_direction", "")).strip().lower()
    pt = str(l.get("property_type", "")).strip().lower()
    
    # Physical property key
    prop_key = (apt, loc, pt, floor, bed, bath, carpet, facing)
    property_clusters[prop_key].append(l["listing_id"])

print(f"Total property clusters: {len(property_clusters)}")
multi_listing_props = {k: v for k, v in property_clusters.items() if len(v) > 1}
print(f"Properties with multiple listings: {len(multi_listing_props)} covering {sum(len(v) for v in multi_listing_props.values())} listing records")
print(f"Sample duplicate property: Key={list(multi_listing_props.keys())[0]} -> IDs={list(multi_listing_props.values())[0]}")

# Let's also check coordinate-based clusters
coord_clusters = defaultdict(list)
for l in listings:
    lat = round(l.get("latitude", 0), 5) if l.get("latitude") else None
    lng = round(l.get("longitude", 0), 5) if l.get("longitude") else None
    floor = l.get("floor")
    bed = l.get("bedroom")
    carpet = l.get("carpet_area")
    facing = str(l.get("facing_direction", "")).strip().lower()
    coord_key = (lat, lng, floor, bed, carpet, facing)
    coord_clusters[coord_key].append(l["listing_id"])

print(f"Total coordinate-based property clusters: {len(coord_clusters)}")
