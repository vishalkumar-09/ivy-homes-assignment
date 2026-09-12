import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("IVY_BASE_URL", "https://solve.ivy.homes").rstrip("/")
API_KEY = os.getenv("IVY_API_KEY", "")

print(f"[*] Base URL: {BASE_URL}")
print(f"[*] API Key: {API_KEY[:6]}...{API_KEY[-4:] if len(API_KEY)>10 else ''}")

session = requests.Session()

def get_url(path, params=None, headers=None, auth_in_query=True):
    p = params.copy() if params else {}
    if auth_in_query and API_KEY:
        p["api_key"] = API_KEY
    url = f"{BASE_URL}{path}"
    h = headers.copy() if headers else {}
    return session.get(url, params=p, headers=h, timeout=15)

def post_url(path, data=None, params=None, headers=None, auth_in_query=True):
    p = params.copy() if params else {}
    if auth_in_query and API_KEY:
        p["api_key"] = API_KEY
    url = f"{BASE_URL}{path}"
    h = headers.copy() if headers else {}
    return session.post(url, json=data, params=p, headers=h, timeout=15)

def delete_url(path, data=None, params=None, headers=None, auth_in_query=True):
    p = params.copy() if params else {}
    if auth_in_query and API_KEY:
        p["api_key"] = API_KEY
    url = f"{BASE_URL}{path}"
    h = headers.copy() if headers else {}
    return session.delete(url, json=data, params=p, headers=h, timeout=15)

print("\n--- 1. Testing /health ---")
r_health = requests.get(f"{BASE_URL}/health", timeout=10)
print(f"Status: {r_health.status_code}")
print(f"Response: {r_health.text}")

print("\n--- 2. Testing Authentication Methods for /v1/listings ---")
# 2a. Query param
r1 = requests.get(f"{BASE_URL}/v1/listings?api_key={API_KEY}&limit=2")
print(f"Query Param: Status {r1.status_code}, length={len(r1.text)}")
if r1.status_code == 200:
    data1 = r1.json()
    print(f"Keys in response: {list(data1.keys())}")
    print(f"total: {data1.get('total')}, page: {data1.get('page')}, page_size: {data1.get('page_size')}, results count: {len(data1.get('results', []))}")

# 2b. Header x-api-key
r2 = requests.get(f"{BASE_URL}/v1/listings?limit=2", headers={"x-api-key": API_KEY})
print(f"Header x-api-key: Status {r2.status_code}")

# 2c. Header Authorization: Bearer <API_KEY>
r3 = requests.get(f"{BASE_URL}/v1/listings?limit=2", headers={"Authorization": f"Bearer {API_KEY}"})
print(f"Header Bearer API_KEY: Status {r3.status_code}")

# 2d. Missing API key
r4 = requests.get(f"{BASE_URL}/v1/listings?limit=2")
print(f"No API key: Status {r4.status_code}, Body: {r4.text}")

print("\n--- 3. Testing Auth Login ---")
# Let's test demo logins
passwords_to_test = ["password", "demo", "demo123", API_KEY, "ivyhomes", "solve"]
for pw in passwords_to_test:
    r_auth = post_url("/auth/login", data={"email": "demo1@ivy.homes", "password": pw})
    print(f"Login with pw='{pw[:6]}...': Status {r_auth.status_code}, Body: {r_auth.text}")
    if r_auth.status_code == 200:
        token = r_auth.json().get("token")
        print(f"--> Found valid password: '{pw}', token: {token[:20]}...")
        break

print("\n--- 4. Testing Endpoints Existence ---")
endpoints = [
    ("GET", "/v1/listings"),
    ("GET", "/v1/listing/1"),
    ("GET", "/v1/listings/1"),
    ("GET", "/v1/listings/1/similar"),
    ("GET", "/v1/rentals"),
    ("GET", "/v1/rentals/1"),
    ("GET", "/v1/projects"),
    ("GET", "/v1/projects/1"),
    ("GET", "/v1/favourites"),
    ("POST", "/v1/favourites"),
    ("DELETE", "/v1/favourites"),
    ("GET", "/v1/analytics/summary"),
]

for method, ep in endpoints:
    if method == "GET":
        resp = get_url(ep, params={"limit": 1})
    elif method == "POST":
        resp = post_url(ep, data={"id": "test"})
    elif method == "DELETE":
        resp = delete_url(ep, data={"id": "test"})
    print(f"{method:6} {ep:30} -> {resp.status_code} ({resp.reason}) - {resp.text[:80]}")
