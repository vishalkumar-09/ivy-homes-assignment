import os
import json
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, HTTPException, Query, Body, Depends
from app.core.ivy_client import ivy_client
from app.core.config import settings

api_router = APIRouter()

# Helper to normalize SqM to SqFt for magichomes
def format_listing(l: Dict[str, Any]) -> Dict[str, Any]:
    c = l.get("carpet_area", 0)
    pt = l.get("property_type")
    is_sqm = False
    c_sqft = c
    if pt != "plot" and l.get("website") == "magichomes" and c < 300:
        is_sqm = True
        c_sqft = round(c * 10.7639104, 1)
    
    price = l.get("price", 0)
    ppsq = round(price / c_sqft, 2) if c_sqft and price and price > 0 else 0
    
    return {
        **l,
        "carpet_area_sqft": c_sqft,
        "is_unit_sqm": is_sqm,
        "price_per_sqft": ppsq,
        "price_formatted": f"₹{price:,.0f}" if price else "₹0"
    }

# --- AUTH ---
@api_router.post("/auth/login")
async def login(credentials: Dict[str, str] = Body(...)):
    email = credentials.get("email")
    password = credentials.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    try:
        data = await ivy_client.login(email, password)
        return data
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials or key")

@api_router.post("/auth/refresh")
async def refresh_token(payload: Dict[str, str] = Body(...)):
    ref_token = payload.get("refresh_token")
    if not ref_token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    try:
        data = await ivy_client.refresh_token(ref_token)
        return data
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

@api_router.post("/auth/logout")
async def logout():
    return {"ok": True, "message": "Logged out successfully"}

# --- LISTINGS ---
@api_router.get("/listings")
async def get_listings(
    locality: Optional[str] = None,
    bhk: Optional[int] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    furnishing: Optional[str] = None,
    live_only: bool = True,
    exclude_corrupt: bool = True,
    sort_by: str = "posted_at",
    order: str = "desc",
    offset: int = 0,
    limit: int = 24
):
    all_l = ivy_client._cached_listings or []
    
    # Load corrupt set
    corrupt_ids = set()
    if os.path.exists("investigation/answers_output.json"):
        with open("investigation/answers_output.json", "r") as f:
            corrupt_ids = set(json.load(f).get("corrupt_listing_ids", []))

    filtered = []
    for l in all_l:
        if exclude_corrupt and l.get("listing_id") in corrupt_ids:
            continue
        if live_only and l.get("is_live") is not True:
            continue
        if locality and l.get("locality", "").lower() != locality.lower():
            continue
        if bhk is not None and l.get("bedroom") != bhk:
            continue
        if property_type and l.get("property_type", "").lower() != property_type.lower():
            continue
        if min_price is not None and l.get("price", 0) < min_price:
            continue
        if max_price is not None and l.get("price", 0) > max_price:
            continue
        if furnishing and l.get("furnishing", "").lower() != furnishing.lower():
            continue
        filtered.append(l)

    # Sort accurately (fixing API server-side ignored order=desc)
    reverse = (order.lower() == "desc")
    if sort_by == "price":
        filtered.sort(key=lambda x: x.get("price", 0), reverse=reverse)
    elif sort_by == "carpet_area":
        filtered.sort(key=lambda x: x.get("carpet_area", 0), reverse=reverse)
    elif sort_by == "bedroom":
        filtered.sort(key=lambda x: x.get("bedroom", 0), reverse=reverse)
    elif sort_by == "posted_at":
        filtered.sort(key=lambda x: x.get("posted_at", ""), reverse=reverse)

    total = len(filtered)
    results = [format_listing(l) for l in filtered[offset : offset + limit]]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "count": len(results),
        "has_more": (offset + limit) < total,
        "results": results
    }

@api_router.get("/listings/{listing_id}")
async def get_listing_detail(listing_id: str):
    all_l = ivy_client._cached_listings or []
    match = next((l for l in all_l if l.get("listing_id") == listing_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    formatted = format_listing(match)
    
    # Compute similar / comparable listings: same locality, same bedroom count, price within 15%
    loc = match.get("locality")
    bhk = match.get("bedroom")
    price = match.get("price", 0)
    min_p = price * 0.85
    max_p = price * 1.15
    
    similar = []
    for l in all_l:
        if l.get("listing_id") != listing_id and l.get("is_live") is True:
            if l.get("locality") == loc and l.get("bedroom") == bhk:
                if min_p <= l.get("price", 0) <= max_p:
                    similar.append(format_listing(l))
                    if len(similar) >= 6:
                        break
                        
    return {
        "listing": formatted,
        "similar": similar
    }

# --- RENTALS ---
@api_router.get("/rentals")
async def get_rentals(
    locality: Optional[str] = None,
    bhk: Optional[int] = None,
    furnishing: Optional[str] = None,
    sort_by: str = "price",
    order: str = "asc",
    offset: int = 0,
    limit: int = 24
):
    all_r = ivy_client._cached_rentals or []
    filtered = []
    for r in all_r:
        if locality and r.get("locality", "").lower() != locality.lower():
            continue
        if bhk is not None and r.get("bedroom") != bhk:
            continue
        if furnishing and r.get("furnishing", "").lower() != furnishing.lower():
            continue
        filtered.append(r)

    reverse = (order.lower() == "desc")
    if sort_by == "price":
        filtered.sort(key=lambda x: x.get("price", 0), reverse=reverse)
    elif sort_by == "carpet_area":
        filtered.sort(key=lambda x: x.get("carpet_area", 0), reverse=reverse)
    elif sort_by == "posted_at":
        filtered.sort(key=lambda x: x.get("posted_at", ""), reverse=reverse)

    total = len(filtered)
    results = filtered[offset : offset + limit]
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "count": len(results),
        "has_more": (offset + limit) < total,
        "results": results
    }

# --- PROJECTS ---
@api_router.get("/projects")
async def get_projects(
    locality: Optional[str] = None,
    project_status: Optional[str] = None,
    sort_by: str = "price_max",
    order: str = "desc",
    offset: int = 0,
    limit: int = 24
):
    all_p = ivy_client._cached_projects or []
    # Cross-reference actual listing counts
    actual_counts = {}
    if ivy_client._cached_listings:
        for l in ivy_client._cached_listings:
            pid = l.get("project_id")
            if pid:
                actual_counts[pid] = actual_counts.get(pid, 0) + 1

    formatted_projects = []
    for p in all_p:
        pid = p.get("project_id")
        p_min_cr = p.get("price_min", 0)
        p_max_cr = p.get("price_max", 0)
        p_min_inr = int(round(p_min_cr * 10000000))
        p_max_inr = int(round(p_max_cr * 10000000))
        
        formatted_projects.append({
            **p,
            "actual_total_listings": actual_counts.get(pid, 0),
            "price_min_inr": p_min_inr,
            "price_max_inr": p_max_inr,
            "price_range_formatted": f"₹{p_min_cr:.2f} Cr - ₹{p_max_cr:.2f} Cr"
        })

    filtered = []
    for p in formatted_projects:
        if locality and p.get("locality", "").lower() != locality.lower():
            continue
        if project_status and p.get("project_status", "").lower() != project_status.lower():
            continue
        filtered.append(p)

    reverse = (order.lower() == "desc")
    if sort_by == "price_max":
        filtered.sort(key=lambda x: x.get("price_max", 0), reverse=reverse)
    elif sort_by == "price_min":
        filtered.sort(key=lambda x: x.get("price_min", 0), reverse=reverse)
    elif sort_by == "total_units":
        filtered.sort(key=lambda x: x.get("total_units", 0), reverse=reverse)
    elif sort_by == "launch_date":
        filtered.sort(key=lambda x: x.get("launch_date", ""), reverse=reverse)

    total = len(filtered)
    results = filtered[offset : offset + limit]
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "count": len(results),
        "has_more": (offset + limit) < total,
        "results": results
    }

# --- SAVED / FAVOURITES ---
@api_router.get("/saved")
async def get_saved_listings(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    token = authorization.split(" ")[1]
    data = await ivy_client.get_saved(token)
    return data

@api_router.post("/saved")
async def add_saved_listing(payload: Dict[str, str] = Body(...), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    token = authorization.split(" ")[1]
    listing_id = payload.get("listing_id")
    if not listing_id:
        raise HTTPException(status_code=400, detail="listing_id required")
    res = await ivy_client.add_saved(token, listing_id)
    return res

@api_router.delete("/saved/{listing_id}")
async def delete_saved_listing(listing_id: str, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    token = authorization.split(" ")[1]
    res = await ivy_client.remove_saved(token, listing_id)
    return res

# --- INSIGHTS / ANALYTICS ---
@api_router.get("/insights/summary")
async def get_insights_summary():
    all_l = ivy_client._cached_listings or []
    all_r = ivy_client._cached_rentals or []
    all_p = ivy_client._cached_projects or []
    
    # Load answers and findings
    answers = {}
    findings = []
    if os.path.exists("investigation/answers_output.json"):
        with open("investigation/answers_output.json", "r") as f:
            answers = json.load(f)
    if os.path.exists("investigation/findings_output.json"):
        with open("investigation/findings_output.json", "r") as f:
            findings = json.load(f)

    # Locality metrics
    loc_stats = {}
    for l in all_l:
        if l.get("is_live") is True and l.get("price") and l.get("price") > 0:
            loc = l.get("locality", "Unknown").title()
            if loc not in loc_stats:
                loc_stats[loc] = {"prices": [], "count": 0}
            loc_stats[loc]["prices"].append(l["price"])
            loc_stats[loc]["count"] += 1

    locality_breakdown = []
    for loc, data in sorted(loc_stats.items(), key=lambda x: x[1]["count"], reverse=True):
        prices = sorted(data["prices"])
        median_p = prices[len(prices)//2] if prices else 0
        avg_p = sum(prices)/len(prices) if prices else 0
        locality_breakdown.append({
            "locality": loc,
            "count": data["count"],
            "median_price": median_p,
            "median_price_formatted": f"₹{median_p:,.0f}",
            "avg_price": avg_p,
            "avg_price_formatted": f"₹{avg_p:,.0f}"
        })

    # BHK Distribution
    bhk_counter = {}
    for l in all_l:
        if l.get("is_live") is True:
            b = f"{l.get('bedroom', 0)} BHK" if l.get('bedroom', 0) > 0 else "Plot / Other"
            bhk_counter[b] = bhk_counter.get(b, 0) + 1

    bhk_distribution = [{"bhk": k, "count": v} for k, v in sorted(bhk_counter.items())]

    return {
        "city": settings.CITY,
        "total_listings": len(all_l),
        "active_listings": answers.get("active_listings", len([l for l in all_l if l.get("is_live") is True])),
        "total_rentals": len(all_r),
        "total_projects": len(all_p),
        "locality_breakdown": locality_breakdown,
        "bhk_distribution": bhk_distribution,
        "assigned_locality": settings.ASSIGNED_LOCALITY,
        "answers": answers,
        "findings_count": len(findings)
    }

@api_router.get("/submission")
async def get_submission():
    if os.path.exists("submission.json"):
        with open("submission.json", "r") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="submission.json not found")
