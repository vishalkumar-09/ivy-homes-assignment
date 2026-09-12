import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

# Ensure stdout uses utf-8
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

load_dotenv()

BASE_URL = os.getenv("IVY_BASE_URL", "https://solve.ivy.homes").rstrip("/")
API_KEY = os.getenv("IVY_API_KEY", "")
PASSWORD = os.getenv("IVY_DEMO_PASSWORD", "")

os.makedirs("investigation/data/raw", exist_ok=True)

class IvyAPIClient:
    def __init__(self):
        self.base_url = BASE_URL
        self.api_key = API_KEY
        self.password = PASSWORD
        self.access_token = None
        self.refresh_token = None
        self.session = requests.Session()
        self.login()

    def login(self):
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        r = self.session.post(
            f"{self.base_url}/auth/login",
            headers=headers,
            json={"email": "demo1@ivy.homes", "password": self.password},
            timeout=15
        )
        if r.status_code != 200:
            raise Exception(f"Login failed: {r.status_code} {r.text}")
        data = r.json()
        self.access_token = data["access_token"]
        self.refresh_token = data.get("refresh_token")
        self.token_expiry = time.time() + data.get("expires_in", 900) - 60
        print(f"[+] Logged in successfully as demo1@ivy.homes. Token expires in {data.get('expires_in')}s")

    def get_auth_headers(self):
        if time.time() > self.token_expiry:
            print("[*] Access token expiring, refreshing...")
            self.refresh_token_call()
        return {
            "X-API-Key": self.api_key,
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def refresh_token_call(self):
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        r = self.session.post(
            f"{self.base_url}/auth/refresh",
            headers=headers,
            json={"refresh_token": self.refresh_token},
            timeout=15
        )
        if r.status_code == 200:
            data = r.json()
            self.access_token = data["access_token"]
            self.refresh_token = data.get("refresh_token")
            self.token_expiry = time.time() + data.get("expires_in", 900) - 60
            print("[+] Refreshed token successfully.")
        else:
            print("[-] Refresh failed, re-logging in...")
            self.login()

    def fetch_collection(self, endpoint, name):
        print(f"\n[*] Fetching collection: {endpoint} -> {name}")
        all_results = []
        offset = 0
        limit = 50
        first_page_meta = None
        page_count = 0

        while True:
            headers = self.get_auth_headers()
            r = self.session.get(
                f"{self.base_url}{endpoint}",
                headers=headers,
                params={"limit": limit, "offset": offset},
                timeout=25
            )
            if r.status_code != 200:
                print(f"[-] Error fetching {endpoint} at offset {offset}: {r.status_code} {r.text}")
                break
            
            data = r.json()
            results = data.get("results", [])
            total_reported = data.get("total")
            has_more = data.get("has_more")
            page_count += 1
            
            if page_count == 1:
                first_page_meta = {
                    "reported_total": total_reported,
                    "reported_limit": data.get("limit"),
                    "reported_offset": data.get("offset"),
                    "reported_has_more": has_more
                }
                print(f"    Total reported by API header/body: {total_reported}")

            all_results.extend(results)
            print(f"    Page {page_count:3d} (offset {offset:5d}): fetched {len(results):2d} items. Running total: {len(all_results)} (reported total: {total_reported}, has_more: {has_more})")

            # ONLY break when results is empty or has_more is explicitly False
            if not results:
                print("    Stopping: results list is empty.")
                break
            if has_more is False:
                print("    Stopping: has_more is False.")
                break

            offset += len(results)
            time.sleep(0.04)

        print(f"[OK] Completed {name}: Downloaded {len(all_results)} records (reported total: {first_page_meta['reported_total']})")
        
        filepath = f"investigation/data/raw/{name}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "endpoint": endpoint,
                "first_page_meta": first_page_meta,
                "downloaded_count": len(all_results),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "results": all_results
            }, f, indent=2)
        print(f"    Saved to {filepath}")
        return all_results

if __name__ == "__main__":
    client = IvyAPIClient()
    
    # 1. Fetch Listings
    listings = client.fetch_collection("/v1/listings", "listings")
    
    # 2. Fetch Rentals
    rentals = client.fetch_collection("/v1/rentals", "rentals")
    
    # 3. Fetch Projects
    projects = client.fetch_collection("/v1/projects", "projects")

    # 4. Fetch Health
    r_health = requests.get(f"{BASE_URL}/health")
    with open("investigation/data/raw/health.json", "w", encoding="utf-8") as f:
        json.dump(r_health.json(), f, indent=2)
    print("\n[OK] Saved health.json")
