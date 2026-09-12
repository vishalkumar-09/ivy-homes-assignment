import httpx
import json
import os
import time
from typing import Optional, Dict, Any, List
from app.core.config import settings

class IvyClient:
    def __init__(self):
        self.base_url = settings.BASE_URL
        self.api_key = settings.API_KEY
        self.http = httpx.AsyncClient(timeout=20.0)
        self._cached_listings: Optional[List[Dict[str, Any]]] = None
        self._cached_rentals: Optional[List[Dict[str, Any]]] = None
        self._cached_projects: Optional[List[Dict[str, Any]]] = None
        self._load_local_data()

    def _load_local_data(self):
        try:
            if os.path.exists("investigation/data/raw/listings.json"):
                with open("investigation/data/raw/listings.json", "r", encoding="utf-8") as f:
                    self._cached_listings = json.load(f).get("results", [])
            if os.path.exists("investigation/data/raw/rentals.json"):
                with open("investigation/data/raw/rentals.json", "r", encoding="utf-8") as f:
                    self._cached_rentals = json.load(f).get("results", [])
            if os.path.exists("investigation/data/raw/projects.json"):
                with open("investigation/data/raw/projects.json", "r", encoding="utf-8") as f:
                    self._cached_projects = json.load(f).get("results", [])
        except Exception as e:
            print(f"Error loading local cached datasets: {e}")

    def get_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        resp = await self.http.post(
            f"{self.base_url}/auth/login",
            headers=self.get_headers(),
            json={"email": email, "password": password}
        )
        if resp.status_code != 200:
            raise httpx.HTTPStatusError("Login failed", request=resp.request, response=resp)
        return resp.json()

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        resp = await self.http.post(
            f"{self.base_url}/auth/refresh",
            headers=self.get_headers(),
            json={"refresh_token": refresh_token}
        )
        if resp.status_code != 200:
            raise httpx.HTTPStatusError("Token refresh failed", request=resp.request, response=resp)
        return resp.json()

    async def get_saved(self, token: str) -> Dict[str, Any]:
        resp = await self.http.get(
            f"{self.base_url}/v1/saved",
            headers=self.get_headers(token)
        )
        return resp.json() if resp.status_code == 200 else {"count": 0, "results": []}

    async def add_saved(self, token: str, listing_id: str) -> Dict[str, Any]:
        resp = await self.http.post(
            f"{self.base_url}/v1/saved",
            headers=self.get_headers(token),
            json={"listing_id": listing_id}
        )
        return resp.json() if resp.status_code in [200, 201] else {"ok": False, "status": resp.status_code}

    async def remove_saved(self, token: str, listing_id: str) -> Dict[str, Any]:
        resp = await self.http.delete(
            f"{self.base_url}/v1/saved/{listing_id}",
            headers=self.get_headers(token)
        )
        return resp.json() if resp.status_code == 200 else {"ok": False, "status": resp.status_code}

ivy_client = IvyClient()
