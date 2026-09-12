import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("IVY_BASE_URL", "https://solve.ivy.homes").rstrip("/")
API_KEY = os.getenv("IVY_API_KEY", "")

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

print(f"[*] Base URL: {BASE_URL}")
print(f"[*] Testing /v1/listings with X-API-Key header...")

r = requests.get(f"{BASE_URL}/v1/listings?limit=2", headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print("Keys in response:", list(data.keys()))
    print("total:", data.get("total"))
    print("page:", data.get("page"))
    print("page_size:", data.get("page_size"))
    print("limit:", data.get("limit"))
    print("offset:", data.get("offset"))
    print("results count:", len(data.get("results", [])))
    if data.get("results"):
        print("Sample listing item keys:", list(data["results"][0].keys()))
        print("Sample listing item:", json.dumps(data["results"][0], indent=2))
else:
    print("Response text:", r.text)

print("\n[*] Testing other endpoints with X-API-Key header...")
test_paths = [
    ("GET", "/v1/listings"),
    ("GET", "/v1/listing/100-1000042"),
    ("GET", "/v1/listings/100-1000042"),
    ("GET", "/v1/listings/1"),
    ("GET", "/v1/listings/100-1000042/similar"),
    ("GET", "/v1/rentals"),
    ("GET", "/v1/rentals/R1000042"),
    ("GET", "/v1/projects"),
    ("GET", "/v1/projects/P10001"),
    ("GET", "/v1/favorites"), # test US spelling!
    ("GET", "/v1/favourites"),
    ("GET", "/v1/analytics"),
    ("GET", "/v1/analytics/summary"),
    ("GET", "/v1/summary"),
    ("POST", "/auth/login"),
]

for method, path in test_paths:
    if method == "GET":
        res = requests.get(f"{BASE_URL}{path}", headers=headers, params={"limit": 2})
    elif method == "POST":
        res = requests.post(f"{BASE_URL}{path}", headers=headers, json={"email": "demo1@ivy.homes", "password": "password"})
    print(f"{method:6} {path:35} -> {res.status_code} ({res.reason}) - {res.text[:100]}")
