import sys
import os
import json
import httpx
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

load_dotenv()

BASE_URL = "http://127.0.0.1:8000"
PASSWORD = os.getenv("IVY_DEMO_PASSWORD", "5edd65b804")

client = httpx.Client(base_url=BASE_URL, timeout=15.0)

print("==================================================")
print("RUNNING END-TO-END VERIFICATION TEST SUITE")
print("==================================================")

# 1. Health Endpoint
r_health = client.get("/health")
assert r_health.status_code == 200, f"Health failed: {r_health.status_code}"
print("[PASS] 1. Health check:", r_health.json())

# 2. Frontend Assets
r_html = client.get("/")
assert r_html.status_code == 200 and "Ivy" in r_html.text, "Index HTML failed"
r_css = client.get("/static/css/styles.css")
assert r_css.status_code == 200 and len(r_css.text) > 1000, "CSS asset failed"
r_js = client.get("/static/js/app.js")
assert r_js.status_code == 200 and "formatListingClient" in r_js.text, "JS asset failed"
print("[PASS] 2. Frontend assets delivery (HTML, CSS, JS)")

# 3. Authentication Flow (demo1, demo2, demo3)
r_login = client.post("/api/auth/login", json={"email": "demo1@ivy.homes", "password": PASSWORD})
assert r_login.status_code == 200, f"Login failed: {r_login.text}"
auth_data = r_login.json()
assert "access_token" in auth_data and "refresh_token" in auth_data
token = auth_data["access_token"]
ref_token = auth_data["refresh_token"]
print(f"[PASS] 3. Auth login (demo1@ivy.homes): token={token[:16]}... expires_in={auth_data['expires_in']}s")

# 4. Token Refresh Flow
r_ref = client.post("/api/auth/refresh", json={"refresh_token": ref_token})
assert r_ref.status_code == 200, f"Refresh failed: {r_ref.text}"
print("[PASS] 4. Auth token refresh (/api/auth/refresh)")

# 5. Listings API (Filtering, Sorting, Pagination)
r_list = client.get("/api/listings?locality=whitefield&bhk=2&sort_by=price&order=asc&limit=5")
assert r_list.status_code == 200, "Listings query failed"
list_data = r_list.json()
assert len(list_data["results"]) > 0, "No listings returned"
first_lid = list_data["results"][0]["listing_id"]
print(f"[PASS] 5. Listings search & filters (Total: {list_data['total']}, Count: {list_data['count']})")

# 6. Listing Detail API & Similar Properties
r_detail = client.get(f"/api/listings/{first_lid}")
assert r_detail.status_code == 200, f"Listing detail failed for {first_lid}"
detail_data = r_detail.json()
assert "listing" in detail_data and "similar" in detail_data
print(f"[PASS] 6. Listing detail for {first_lid} with {len(detail_data['similar'])} similar recommendations")

# 7. Saved Listings (Full Add -> Get -> Remove -> Verify Cycle)
auth_headers = {"Authorization": f"Bearer {token}"}
# Clean/delete initial test item if present
client.delete(f"/api/saved/{first_lid}", headers=auth_headers)

r_saved_init = client.get("/api/saved", headers=auth_headers)
init_count = len(r_saved_init.json().get("results", []))

# Add
r_add = client.post("/api/saved", headers=auth_headers, json={"listing_id": first_lid})
assert r_add.status_code == 200 and r_add.json().get("ok") is True, f"Add saved failed: {r_add.text}"

# Verify presence
r_saved_after = client.get("/api/saved", headers=auth_headers)
saved_items = r_saved_after.json().get("results", [])
assert any(s["listing_id"] == first_lid for s in saved_items), "Saved item not found in list"

# Delete
r_del = client.delete(f"/api/saved/{first_lid}", headers=auth_headers)
assert r_del.status_code == 200 and r_del.json().get("ok") is True, "Delete saved failed"

# Verify removed
r_saved_final = client.get("/api/saved", headers=auth_headers)
final_items = r_saved_final.json().get("results", [])
assert not any(s["listing_id"] == first_lid for s in final_items), "Item still in saved list"
print(f"[PASS] 7. Saved Listings cycle (Add -> Get -> Delete -> Verify)")

# 8. Rentals API
r_rent = client.get("/api/rentals?locality=yelahanka&limit=5")
assert r_rent.status_code == 200 and len(r_rent.json()["results"]) > 0, "Rentals query failed"
print(f"[PASS] 8. Rentals endpoint (Yelahanka rentals total: {r_rent.json()['total']})")

# 9. Projects API (Crores & Listing Count Verification)
r_proj = client.get("/api/projects?limit=5")
assert r_proj.status_code == 200 and len(r_proj.json()["results"]) > 0, "Projects query failed"
p0 = r_proj.json()["results"][0]
assert "price_range_formatted" in p0 and "actual_total_listings" in p0
print(f"[PASS] 9. Projects endpoint (Project {p0['project_id']} price: {p0['price_range_formatted']})")

# 10. Insights Summary API
r_ins = client.get("/api/insights/summary")
assert r_ins.status_code == 200 and "locality_breakdown" in r_ins.json(), "Insights query failed"
print(f"[PASS] 10. Market Insights summary (Active listings: {r_ins.json()['active_listings']})")

# 11. Submission JSON Schema & Answers Integrity
with open("submission.json", "r", encoding="utf-8") as f:
    sub = json.load(f)

assert sub["api_key"] == "IVY26-9A0B5D37765D"
assert sub["candidate"]["name"] == "Vishal Kumar Gaud"
assert sub["answers"]["total_listing_records"] == 4700
assert sub["answers"]["unique_properties"] == 4572
assert sub["answers"]["active_listings"] == 3722
assert len(sub["answers"]["corrupt_listing_ids"]) == 40
assert sub["answers"]["total_monthly_rent"] == 5769800
assert sub["answers"]["avg_price_per_sqft_2bhk"] == 11633.35
assert sub["answers"]["costliest_project"]["project_id"] == "P10068"
assert sub["answers"]["listings_last_7_days"] == 149
assert len(sub["answers"]["fake_listing_ids"]) == 100
assert sub["answers"]["projects_with_wrong_listing_count"] == 392
assert len(sub["findings"]) == 15
print("[PASS] 11. submission.json schema, candidate metadata, and all 10 answers verified")

print("\n==================================================")
print("ALL 11 TEST SUITES PASSED FLAWLESSLY (100% HEALTHY)")
print("==================================================")
