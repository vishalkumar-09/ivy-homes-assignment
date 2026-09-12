import os
import sys
import json
import requests
from dotenv import load_dotenv

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

load_dotenv()

BASE_URL = os.getenv("IVY_BASE_URL", "https://solve.ivy.homes").rstrip("/")
API_KEY = os.getenv("IVY_API_KEY", "")
PASSWORD = os.getenv("IVY_DEMO_PASSWORD", "")

def get_token(email="demo1@ivy.homes"):
    r = requests.post(
        f"{BASE_URL}/auth/login",
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": PASSWORD}
    )
    return r.json()["access_token"]

token1 = get_token("demo1@ivy.homes")
token2 = get_token("demo2@ivy.homes")

headers1 = {"X-API-Key": API_KEY, "Authorization": f"Bearer {token1}", "Content-Type": "application/json"}
headers2 = {"X-API-Key": API_KEY, "Authorization": f"Bearer {token2}", "Content-Type": "application/json"}

print("==================================================")
print("1. TESTING /v1/listings FILTERS")
print("==================================================")

# 1a. Unfiltered baseline
r_base = requests.get(f"{BASE_URL}/v1/listings?limit=10", headers=headers1)
data_base = r_base.json()
print(f"Base unfiltered: total={data_base.get('total')}, count={len(data_base.get('results', []))}")

# 1b. Locality filter (lowercase vs capitalized)
for loc in ["koramangala", "Koramangala", "whitefield", "Whitefield", "yelahanka", "nonexistent_loc_xyz"]:
    r = requests.get(f"{BASE_URL}/v1/listings", headers=headers1, params={"locality": loc, "limit": 10})
    if r.status_code == 200:
        d = r.json()
        localities = [item.get("locality") for item in d.get("results", [])]
        print(f"locality='{loc}': status={r.status_code}, total={d.get('total')}, results={len(d.get('results', []))}, sample={localities[:3]}")
    else:
        print(f"locality='{loc}': status={r.status_code} {r.text[:80]}")

# 1c. BHK filter
for bhk in [1, 2, 3, 4, 5, 99]:
    r = requests.get(f"{BASE_URL}/v1/listings", headers=headers1, params={"bhk": bhk, "limit": 10})
    if r.status_code == 200:
        d = r.json()
        bhk_results = [item.get("bedroom") for item in d.get("results", [])]
        print(f"bhk={bhk}: status={r.status_code}, total={d.get('total')}, results={len(d.get('results', []))}, sample_bedrooms={bhk_results[:3]}")
    else:
        print(f"bhk={bhk}: status={r.status_code} {r.text[:80]}")

# 1d. Property Type filter
for pt in ["apartment", "villa", "independent house", "plot", "builder floor", "invalid_type"]:
    r = requests.get(f"{BASE_URL}/v1/listings", headers=headers1, params={"property_type": pt, "limit": 10})
    if r.status_code == 200:
        d = r.json()
        pt_results = [item.get("property_type") for item in d.get("results", [])]
        print(f"property_type='{pt}': status={r.status_code}, total={d.get('total')}, results={len(d.get('results', []))}, sample={pt_results[:3]}")
    else:
        print(f"property_type='{pt}': status={r.status_code} {r.text[:80]}")

# 1e. Price range filter
for p_params in [
    {"min_price": 10000000},
    {"max_price": 15000000},
    {"min_price": 10000000, "max_price": 15000000},
    {"min_price": 999999999}, # should return 0 or near 0
]:
    r = requests.get(f"{BASE_URL}/v1/listings", headers=headers1, params={**p_params, "limit": 10})
    if r.status_code == 200:
        d = r.json()
        prices = [item.get("price") for item in d.get("results", [])]
        print(f"Price params {p_params}: total={d.get('total')}, results={len(d.get('results', []))}, sample_prices={prices[:3]}")
    else:
        print(f"Price params {p_params}: status={r.status_code} {r.text[:80]}")

# 1f. Furnishing filter
for f in ["unfurnished", "semi-furnished", "fully-furnished", "invalid"]:
    r = requests.get(f"{BASE_URL}/v1/listings", headers=headers1, params={"furnishing": f, "limit": 10})
    if r.status_code == 200:
        d = r.json()
        furnishings = [item.get("furnishing") for item in d.get("results", [])]
        print(f"furnishing='{f}': total={d.get('total')}, results={len(d.get('results', []))}, sample={furnishings[:3]}")
    else:
        print(f"furnishing='{f}': status={r.status_code} {r.text[:80]}")

print("\n==================================================")
print("2. TESTING /v1/listings SORTING")
print("==================================================")
for sort_by in ["price", "carpet_area", "posted_at", "bedroom", "invalid_col"]:
    for order in ["asc", "desc"]:
        r = requests.get(f"{BASE_URL}/v1/listings", headers=headers1, params={"sort_by": sort_by, "order": order, "limit": 5})
        if r.status_code == 200:
            d = r.json()
            vals = [item.get(sort_by) if sort_by in item else item.get('price') for item in d.get("results", [])]
            print(f"sort_by={sort_by} order={order}: values={vals}")
        else:
            print(f"sort_by={sort_by} order={order}: status={r.status_code} {r.text[:80]}")

print("\n==================================================")
print("3. TESTING /v1/saved (FAVOURITES)")
print("==================================================")
# Clear or check initial state for user 1
r_s1 = requests.get(f"{BASE_URL}/v1/saved", headers=headers1).json()
print("User 1 initial saved:", r_s1)
r_s2 = requests.get(f"{BASE_URL}/v1/saved", headers=headers2).json()
print("User 2 initial saved:", r_s2)

# Add listing to User 1
test_lid = "MAG-1002627"
r_add = requests.post(f"{BASE_URL}/v1/saved", headers=headers1, json={"listing_id": test_lid})
print(f"User 1 POST /v1/saved listing_id={test_lid}: status={r_add.status_code}, body={r_add.text}")

# Check User 1 vs User 2
r_s1_after = requests.get(f"{BASE_URL}/v1/saved", headers=headers1).json()
print("User 1 saved after add:", r_s1_after)
r_s2_after = requests.get(f"{BASE_URL}/v1/saved", headers=headers2).json()
print("User 2 saved after add (should be isolated):", r_s2_after)

# Delete from User 1
# Test DELETE /v1/saved/{id}
r_del_path = requests.delete(f"{BASE_URL}/v1/saved/{test_lid}", headers=headers1)
print(f"DELETE /v1/saved/{test_lid}: status={r_del_path.status_code}, body={r_del_path.text}")
if r_del_path.status_code != 200:
    # Test DELETE /v1/saved with json body
    r_del_body = requests.delete(f"{BASE_URL}/v1/saved", headers=headers1, json={"listing_id": test_lid})
    print(f"DELETE /v1/saved with json body: status={r_del_body.status_code}, body={r_del_body.text}")

# Check User 1 after delete
r_s1_final = requests.get(f"{BASE_URL}/v1/saved", headers=headers1).json()
print("User 1 saved after delete:", r_s1_final)

print("\n==================================================")
print("4. TESTING /v1/projects FILTERS & SORTING")
print("==================================================")
for sort_p in ["price_min", "price_max", "launch_date", "total_units"]:
    r = requests.get(f"{BASE_URL}/v1/projects", headers=headers1, params={"sort_by": sort_p, "order": "desc", "limit": 3})
    if r.status_code == 200:
        d = r.json()
        vals = [item.get(sort_p) for item in d.get("results", [])]
        print(f"Projects sort_by={sort_p} order=desc: values={vals}")

# Locality on projects
r_proj_loc = requests.get(f"{BASE_URL}/v1/projects", headers=headers1, params={"locality": "bellandur", "limit": 3}).json()
print(f"Projects locality='bellandur': total={r_proj_loc.get('total')}, sample={[x.get('locality') for x in r_proj_loc.get('results', [])]}")
