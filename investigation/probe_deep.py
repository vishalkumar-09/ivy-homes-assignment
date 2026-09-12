import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("IVY_BASE_URL", "https://solve.ivy.homes").rstrip("/")
API_KEY = os.getenv("IVY_API_KEY", "")
PASSWORD = os.getenv("IVY_DEMO_PASSWORD", "")

headers_base = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

# 1. Login
r_login = requests.post(f"{BASE_URL}/auth/login", headers=headers_base, json={"email": "demo1@ivy.homes", "password": PASSWORD})
login_data = r_login.json()
access_token = login_data.get("access_token")
refresh_token = login_data.get("refresh_token")

auth_headers = {
    "X-API-Key": API_KEY,
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

print("=== 1. Check OpenAPI / Docs / Schema ===")
docs_urls = ["/openapi.json", "/docs", "/redoc", "/api/openapi.json", "/v1/openapi.json", "/schema", "/swagger.json"]
for d in docs_urls:
    r = requests.get(f"{BASE_URL}{d}", headers=auth_headers)
    print(f"{d:25} -> {r.status_code}")
    if r.status_code == 200 and "application/json" in r.headers.get("content-type", ""):
        print(f"--> FOUND OPENAPI SCHEMA at {d}! Keys: {list(r.json().keys())}")

print("\n=== 2. Check /auth/refresh ===")
r_ref = requests.post(f"{BASE_URL}/auth/refresh", headers=headers_base, json={"refresh_token": refresh_token})
print(f"POST /auth/refresh with json -> {r_ref.status_code}: {r_ref.text}")

print("\n=== 3. Probe Favourites & Analytics Candidate Routes ===")
candidate_routes = [
    # Favourites
    ("GET", "/v1/favourites"),
    ("GET", "/v1/favorites"),
    ("GET", "/v1/saved"),
    ("GET", "/v1/saved_listings"),
    ("GET", "/v1/saved-listings"),
    ("GET", "/v1/user/favourites"),
    ("GET", "/v1/user/favorites"),
    ("GET", "/v1/me/favourites"),
    ("GET", "/v1/me/favorites"),
    ("GET", "/v1/users/me/favourites"),
    ("GET", "/v1/users/me/favorites"),
    ("GET", "/favourites"),
    ("GET", "/favorites"),
    ("GET", "/saved"),
    ("GET", "/v1/bookmarks"),
    ("GET", "/v1/shortlist"),
    ("GET", "/v1/watchlist"),
    # Analytics / Summary
    ("GET", "/v1/analytics/summary"),
    ("GET", "/v1/analytics"),
    ("GET", "/v1/summary"),
    ("GET", "/v1/stats"),
    ("GET", "/v1/insights"),
    ("GET", "/v1/metrics"),
    ("GET", "/analytics/summary"),
    ("GET", "/analytics"),
    ("GET", "/summary"),
    ("GET", "/stats"),
]

for method, path in candidate_routes:
    r = requests.get(f"{BASE_URL}{path}", headers=auth_headers)
    if r.status_code != 404:
        print(f"--> FOUND ROUTE! {method} {path} -> {r.status_code}: {r.text[:120]}")
    else:
        # Also check without /v1 or with trailing slash
        pass

print("\n=== 4. Test Pagination Parameters on /v1/listings ===")
# Test page=1 vs offset=0 vs limit=10, limit=200, limit=500
for p_params in [
    {"limit": 5, "offset": 0},
    {"limit": 5, "offset": 5},
    {"limit": 5, "page": 1},
    {"limit": 5, "page": 2},
    {"limit": 100},
    {"limit": 200},
    {"limit": 250},
    {"limit": 500},
    {"limit": 1000},
]:
    r = requests.get(f"{BASE_URL}/v1/listings", headers=auth_headers, params=p_params)
    if r.status_code == 200:
        d = r.json()
        print(f"Params {p_params} -> count={d.get('count')}, limit={d.get('limit')}, offset={d.get('offset')}, total={d.get('total')}, first_id={d['results'][0]['listing_id'] if d.get('results') else None}")
    else:
        print(f"Params {p_params} -> {r.status_code}: {r.text[:80]}")

print("\n=== 5. Sample Full Listing, Rental, Project Records ===")
r_list = requests.get(f"{BASE_URL}/v1/listings", headers=auth_headers, params={"limit": 1})
if r_list.status_code == 200 and r_list.json().get("results"):
    sample_listing = r_list.json()["results"][0]
    print("\nSAMPLE LISTING:")
    print(json.dumps(sample_listing, indent=2))
    # Test getting single listing
    single_id = sample_listing["listing_id"]
    r_single = requests.get(f"{BASE_URL}/v1/listings/{single_id}", headers=auth_headers)
    print(f"\nGET /v1/listings/{single_id} -> {r_single.status_code}: {list(r_single.json().keys()) if r_single.status_code==200 else r_single.text}")

r_rent = requests.get(f"{BASE_URL}/v1/rentals", headers=auth_headers, params={"limit": 1})
if r_rent.status_code == 200 and r_rent.json().get("results"):
    sample_rental = r_rent.json()["results"][0]
    print("\nSAMPLE RENTAL:")
    print(json.dumps(sample_rental, indent=2))
    rent_id = sample_rental["listing_id"]
    r_single_rent = requests.get(f"{BASE_URL}/v1/rentals/{rent_id}", headers=auth_headers)
    print(f"\nGET /v1/rentals/{rent_id} -> {r_single_rent.status_code}: {list(r_single_rent.json().keys()) if r_single_rent.status_code==200 else r_single_rent.text}")

r_proj = requests.get(f"{BASE_URL}/v1/projects", headers=auth_headers, params={"limit": 1})
if r_proj.status_code == 200 and r_proj.json().get("results"):
    sample_proj = r_proj.json()["results"][0]
    print("\nSAMPLE PROJECT:")
    print(json.dumps(sample_proj, indent=2))
    proj_id = sample_proj["project_id"]
    r_single_proj = requests.get(f"{BASE_URL}/v1/projects/{proj_id}", headers=auth_headers)
    print(f"\nGET /v1/projects/{proj_id} -> {r_single_proj.status_code}: {list(r_single_proj.json().keys()) if r_single_proj.status_code==200 else r_single_proj.text}")
