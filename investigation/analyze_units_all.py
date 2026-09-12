import os
import sys
import json

with open("investigation/data/raw/listings.json", "r", encoding="utf-8") as f:
    listings = json.load(f)["results"]

# Inspect carpet area distribution
sqm_listings = []
sqft_listings = []

for l in listings:
    c = l.get("carpet_area", 0)
    pt = l.get("property_type")
    bed = l.get("bedroom", 0)
    
    # In Bangalore residential properties, 1 BHK is ~400-600 sqft (35-55 sqm)
    # 2 BHK is ~700-1100 sqft (65-100 sqm)
    # 3 BHK is ~1100-1800 sqft (100-170 sqm)
    # 4 BHK is ~1800-3000 sqft (170-280 sqm)
    # If c < 300 for a 1-5 BHK or non-plot property, it is in square meters!
    if pt != "plot" and c > 0:
        if c < 300: # Clearly square meters!
            sqm_listings.append(l)
        else:
            sqft_listings.append(l)

print(f"Total non-plot listings with carpet area in SqM (< 300): {len(sqm_listings)}")
print(f"Total non-plot listings with carpet area in SqFt (>= 300): {len(sqft_listings)}")
print(f"Websites of SqM listings: {set(l.get('website') for l in sqm_listings)}")

# Check if all SqM listings belong to 'magichomes' or others too
from collections import Counter
print("Count of SqM listings by website:", Counter(l.get('website') for l in sqm_listings))
print("Count of SqFt listings by website:", Counter(l.get('website') for l in sqft_listings))
