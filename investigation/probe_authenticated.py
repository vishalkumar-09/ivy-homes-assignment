import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("IVY_BASE_URL", "https://solve.ivy.homes").rstrip("/")
API_KEY = os.getenv("IVY_API_KEY", "")
PASSWORD = os.getenv("IVY_DEMO_PASSWORD", "")

print(f"[*] Base URL: {BASE_URL}")

# 1. Login
headers_base = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
r_login = requests.post(f"{BASE_URL}/auth/login", headers=headers_base, json={"email": "demo1@ivy.homes", "password": PASSWORD})
print("Login Status:", r_login.status_code)
login_data = r_login.json()
print("Login Data Keys:", list(login_data.keys()))
print("Expires in:", login_data.get("expires_in"))
print("Refresh URL:", login_data.get("refresh_url"))

access_token = login_data.get("access_token")
refresh_token = login_data.get("refresh_token")

auth_headers = {
    "X-API-Key": API_KEY,
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# 2. Test Refresh Flow
if login_data.get("refresh_url"):
    r_ref = requests.post(f"{BASE_URL}{login_data['refresh_url']}", headers={"X-API-Key": API_KEY, "Authorization": f"Bearer {refresh_token}"})
    print(f"Refresh Token endpoint {login_data['refresh_url']}: Status {r_ref.status_code}, Body: {r_ref.text[:120]}")

# 3. Sweep all possible and documented endpoints
endpoints = [
    ("GET", "/health", False),
    ("GET", "/v1/listings", True),
    ("GET", "/v1/listing/1", True),
    ("GET", "/v1/listings/1", True),
    ("GET", "/v1/listings/100-1000042", True),
    ("GET", "/v1/listings/100-1000042/similar", True),
    ("GET", "/v1/rentals", True),
    ("GET", "/v1/rentals/R1000042", True),
    ("GET", "/v1/projects", True),
    ("GET", "/v1/projects/P10001", True),
    ("GET", "/v1/favourites", True),
    ("GET", "/v1/favorites", True),
    ("POST", "/v1/favourites", True),
    ("POST", "/v1/favorites", True),
    ("GET", "/v1/analytics/summary", True),
    ("GET", "/v1/analytics", True),
    ("GET", "/v1/summary", True),
]

for method, ep, req_auth in endpoints:
    h = auth_headers if req_auth else headers_base
    if method == "GET":
        resp = requests.get(f"{BASE_URL}{ep}", headers=h, params={"limit": 2})
    elif method == "POST":
        resp = requests.post(f"{BASE_URL}{ep}", headers=h, json={"listing_id": "100-1000042", "id": "100-1000042"})
    print(f"{method:6} {ep:35} -> {resp.status_code} ({resp.reason}) | {resp.text[:100]}")
