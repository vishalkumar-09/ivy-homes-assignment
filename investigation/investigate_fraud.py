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

print("=======================================================")
print("FRAUD INVESTIGATION: DESCRIPTIONS & BAIT PATTERNS")
print("=======================================================")

# Let's inspect all unique sentences across all descriptions
all_sentences = set()
for l in listings:
    desc = l.get("description", "")
    # split by periods
    sentences = [s.strip() for s in desc.split(".") if len(s.strip()) > 3]
    for s in sentences:
        all_sentences.add(s)

print(f"Total unique sentences across all listings: {len(all_sentences)}")

# Check sentences related to urgency, advance fees, booking amounts, below market price
suspicious_patterns = [
    r'token amount',
    r'booking amount',
    r'this week only',
    r'below market price',
    r'site visit only after',
    r'owner moving abroad',
    r'urgent sale',
    r'priced to sell',
    r'advance',
    r'block the unit',
    r'transfer',
]

pattern_matches = defaultdict(list)
for l in listings:
    desc = l.get("description", "")
    for pat in suspicious_patterns:
        if re.search(pat, desc, re.IGNORECASE):
            pattern_matches[pat].append(l)

for pat, matched_list in pattern_matches.items():
    print(f"Pattern '{pat}': {len(matched_list)} listings")

# Look at combinations of patterns
# e.g. token amount / booking amount / this week only / site visit only after
scam_tells = [
    r'token amount',
    r'booking amount',
    r'this week only',
    r'site visit only after',
]

hard_scam_listings = []
for l in listings:
    desc = l.get("description", "")
    matched_tells = [pat for pat in scam_tells if re.search(pat, desc, re.IGNORECASE)]
    if matched_tells:
        hard_scam_listings.append((l, matched_tells))

print(f"\nListings with explicit scam/advance-fee tells: {len(hard_scam_listings)}")
for l, tells in hard_scam_listings[:15]:
    print(f"  {l['listing_id']} ({l.get('website')}): tells={tells} | price={l.get('price'):,} | desc='{l.get('description')}'")

# Also check the bait price listings (< 1 Lakh)
bait_price_listings = [l for l in listings if l.get("price") and 0 < l["price"] < 100000]
print(f"\nListings with rental-level bait prices (< 100k): {len(bait_price_listings)}")
for l in bait_price_listings:
    print(f"  {l['listing_id']}: price={l.get('price')} | desc='{l.get('description')}'")

# Check if there are other suspicious characteristics:
# What about websites? Are fake listings concentrated in certain websites or distributed?
print("\nDistribution of hard scam listings by website:")
print(Counter(l.get("website") for l, _ in hard_scam_listings))

print("Distribution of bait price listings by website:")
print(Counter(l.get("website") for l in bait_price_listings))
