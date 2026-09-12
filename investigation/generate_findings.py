import os
import sys
import json

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

findings = [
    {
        "endpoint": "*",
        "category": "auth",
        "documented": "Every request must carry the API key you were issued. Append it as a query parameter: GET /v1/listings?api_key=IVY26-XXXXXXXXXXXX",
        "actual": "Passing the API key as a query parameter returns HTTP 401 with 'send your key in the X-API-Key request header, not as a query parameter'. Requests must send the key in the 'X-API-Key' HTTP header.",
        "how_found": "Tested GET requests with query parameter ?api_key=... and observed explicit 401 rejection with header instructions.",
        "impact": "Any frontend or client adhering strictly to query parameter authentication fails immediately on all protected routes.",
        "evidence": []
    },
    {
        "endpoint": "/auth/login",
        "category": "auth",
        "documented": "POST /auth/login returns token, token_type, expires_in (86400 / 24h), user (email, name). States 'Tokens are valid for 24 hours... There is no refresh flow.'",
        "actual": "Returns 'access_token' instead of 'token', 'expires_in' is 900 seconds (15 minutes), includes 'refresh_token' and 'refresh_url' (/auth/refresh), and user object only contains 'email' (no 'name'). A refresh flow exists and is required.",
        "how_found": "Executed POST /auth/login with valid demo credentials and inspected JSON response payload and token expiry value.",
        "impact": "Applications looking for data.token or expecting 24h lifetime break with 401 unauthorized after 15 minutes unless implementing /auth/refresh.",
        "evidence": []
    },
    {
        "endpoint": "/v1/listings",
        "category": "pagination",
        "documented": "Every collection endpoint takes page (1-indexed) and limit (max 200). Response is shaped: {\"total\": 1240, \"page\": 1, \"page_size\": 20, \"results\": [...]}.",
        "actual": "The 'page' query parameter is silently ignored. Pagination is strictly offset-based using 'offset' and 'limit'. The 'limit' is hard-capped at 50 (requesting limit=200 returns 50 items). Response contains 'limit', 'offset', 'count', 'total', 'has_more', and 'results'.",
        "how_found": "Tested page=1 vs page=2 and limit=200; verified page had no effect on returned records while offset shifted items, and limits above 50 were clamped to 50.",
        "impact": "Clients attempting page-based pagination get stuck repeatedly fetching page 1. Requesting limits above 50 without verifying count causes missing data.",
        "evidence": []
    },
    {
        "endpoint": "/v1/listing/{id}",
        "category": "missing_endpoint",
        "documented": "GET /v1/listing/ returns a single listing object.",
        "actual": "Singular route GET /v1/listing/{id} does not exist and returns HTTP 404 Not Found. The actual single listing endpoint is plural: GET /v1/listings/{id}.",
        "how_found": "Sent GET requests to /v1/listing/{id} (404) versus /v1/listings/{id} (200 OK) with valid listing IDs.",
        "impact": "Detail pages routing to singular /v1/listing/{id} fail with 404 Not Found.",
        "evidence": []
    },
    {
        "endpoint": "/v1/listings/{id}/similar",
        "category": "missing_endpoint",
        "documented": "GET /v1/listings/ returns up to ten comparable listings with same locality, bedroom count, price within 15%.",
        "actual": "GET /v1/listings/{id}/similar and related comparable endpoints return HTTP 404 Not Found.",
        "how_found": "Tested GET requests to /v1/listings/{id}/similar on valid listing IDs.",
        "impact": "Similar listing recommendations must be computed dynamically on client/backend using existing listing data.",
        "evidence": []
    },
    {
        "endpoint": "/v1/favourites",
        "category": "missing_endpoint",
        "documented": "GET /v1/favourites returns user favourites, POST /v1/favourites with {\"id\": \"...\"} saves a listing, DELETE /v1/favourites/ deletes a saved listing.",
        "actual": "/v1/favourites returns HTTP 404 Not Found. The actual working favourites endpoint is /v1/saved: GET /v1/saved, POST /v1/saved with {\"listing_id\": \"...\"}, and DELETE /v1/saved/{listing_id}.",
        "how_found": "Fuzzed potential candidate routes for saved properties; tested POST, GET, and DELETE operations against /v1/saved.",
        "impact": "Attempting to save or retrieve favourites using /v1/favourites results in 404 errors.",
        "evidence": []
    },
    {
        "endpoint": "/v1/analytics/summary",
        "category": "missing_endpoint",
        "documented": "GET /v1/analytics/summary returns pre-computed aggregates for city.",
        "actual": "GET /v1/analytics/summary and related /v1/analytics endpoints return HTTP 404 Not Found.",
        "how_found": "Probed GET /v1/analytics/summary, /v1/analytics, /v1/summary; all returned 404.",
        "impact": "Analytics dashboard metrics must be computed directly from retrievable listings and project datasets.",
        "evidence": []
    },
    {
        "endpoint": "/v1/listings",
        "category": "sorting",
        "documented": "Supports sort_by (price, carpet_area, posted_at, bedroom) and order (asc default, desc).",
        "actual": "The 'order' query parameter is silently ignored. Requesting order=desc returns records in ascending order identically to order=asc. Furthermore, sort_by=posted_at sorts lexicographically rather than chronologically.",
        "how_found": "Compared output of GET /v1/listings?sort_by=price&order=desc against order=asc and observed identical ascending price sequences.",
        "impact": "Descending sorting cannot be performed server-side; applications must sort records on the frontend/client.",
        "evidence": []
    },
    {
        "endpoint": "/v1/projects",
        "category": "units",
        "documented": "price_min and price_max are in rupees (integer).",
        "actual": "price_min and price_max are floating-point numbers in Crores (INR Cr, where 1 Cr = 10,000,000 INR), not raw INR rupees.",
        "how_found": "Examined project payloads (e.g. price_min: 1.04, price_max: 2.95 for multi-crore luxury residential projects).",
        "impact": "Showing raw project prices without multiplying by 10,000,000 displays multi-crore apartments as costing 1 to 3 Rupees.",
        "evidence": [
            "P10001", "P10068", "P10415", "P10016", "P10238", "P10390", "P10002", "P10003", "P10004", "P10005"
        ]
    },
    {
        "endpoint": "/v1/listings",
        "category": "units",
        "documented": "Area: Square feet, integer, everywhere in the API.",
        "actual": "Listings originating from source website 'magichomes' with carpet area < 300 have 'carpet_area' and 'super_built_up_area' recorded in Square Meters (sqm), not square feet.",
        "how_found": "Statistical analysis of carpet area distributions by source website revealed 374 magichomes listings clustered between 35 and 200 sqm.",
        "impact": "Calculating price per square foot without converting sqm to sqft (multiply by 10.7639) inflates price/sqft by over 10x for magichomes listings.",
        "evidence": [
            "MAG-1002627", "MAG-1001407", "MAG-1000459", "MAG-1000658", "MAG-1001162",
            "MAG-1001490", "MAG-1002739", "MAG-1000924", "MAG-1003078", "MAG-1004445",
            "MAG-1002778", "MAG-1003492"
        ]
    },
    {
        "endpoint": "/v1/listings",
        "category": "data_quality",
        "documented": "Listings describe valid physical properties ready to display to users.",
        "actual": "40 retrievable listing records contain physically impossible data: negative prices, floor > total_floors in multi-story towers, carpet area > super built-up area, swapped latitude/longitude coordinates, and non-plots with 0 bedrooms/bathrooms.",
        "how_found": "Executed domain constraint checks (price > 0, floor <= total_floors, carpet <= sbua, coordinates in Bangalore bounds) across all 4,700 listings.",
        "impact": "Corrupt records corrupt price averages, geographic mapping, and building floor filters unless filtered out.",
        "evidence": [
            "100-1002346", "ZER-1002632", "SQU-1000979", "SQU-1002843", "DWE-1001183",
            "DWE-1001909", "ZER-1001207", "MAG-1000179", "MAG-1000885", "MAG-1003269",
            "MAG-1003510", "ZER-1001249", "ZER-1001334", "ZER-1002911", "100-1003117",
            "SQU-1003177", "ZER-1000500", "ZER-1002667", "DWE-1002892", "SQU-1000394"
        ]
    },
    {
        "endpoint": "/v1/listings",
        "category": "fraud",
        "documented": "Returns active genuine sale listings with verified seller details.",
        "actual": "100 listings are fraudulent lead-generation baits: 8 listings advertise multi-crore properties for rental prices (< 100k INR, e.g. Rs 6,550 for a 2BHK), and 92 listings contain advance booking fee/token amount scam scripts.",
        "how_found": "Regex analysis of listing descriptions for advance payment/token fee keywords and filtering for outlier sale prices below 100k INR.",
        "impact": "Fraudulent listings trick users into paying advance booking amounts for phantom properties.",
        "evidence": [
            "DWE-1003102", "ZER-1003652", "100-1002501", "MAG-1003492", "SQU-1003524",
            "SQU-1001431", "DWE-1002631", "ZER-1003813", "SQU-1004652", "DWE-1001798",
            "100-1002452", "100-1004443", "100-1001464", "ZER-1002980", "100-1003248",
            "SQU-1003023", "SQU-1004086", "ZER-1004332", "ZER-1001855", "MAG-1004411"
        ]
    },
    {
        "endpoint": "/v1/projects",
        "category": "consistency",
        "documented": "total_listings is the number of listings currently available in the project. It is recomputed whenever a listing is added or withdrawn, so it always agrees with what GET /v1/listings?project_id=... returns.",
        "actual": "392 out of 520 builder projects have a total_listings count that disagrees with the actual number of listings associated with that project_id in /v1/listings.",
        "how_found": "Cross-referenced project.total_listings against the count of listings in /v1/listings having matching project_id.",
        "impact": "Displaying project.total_listings directly from the projects endpoint misrepresents available project inventory.",
        "evidence": [
            "P10001", "P10002", "P10003", "P10004", "P10005", "P10006", "P10007", "P10008", "P10009", "P10010",
            "P10011", "P10012", "P10013", "P10014", "P10015", "P10016", "P10017", "P10018", "P10019", "P10020"
        ]
    },
    {
        "endpoint": "/v1/listings",
        "category": "duplicates",
        "documented": "Every listing_id is globally unique, and each listing corresponds to exactly one physical property.",
        "actual": "Multiple listing records across different real estate portal sources describe the exact same physical property unit (same apartment, floor, bedroom count, bathroom count, facing direction, and normalized carpet area). Across 4,700 listing records, there are 4,572 distinct physical properties.",
        "how_found": "Clustered listing records by composite physical property key (apartment, locality, property_type, floor, bedroom, bathroom, facing, carpet_area).",
        "impact": "Inventory metrics and listings count are inflated by cross-portal syndication unless deduplicated.",
        "evidence": [
            "DWE-1004037", "ZER-1003310", "SQU-1000295", "100-1004301", "SQU-1004075",
            "DWE-1002136", "SQU-1004515", "DWE-1004402", "DWE-1001646", "SQU-1003425",
            "ZER-1004262"
        ]
    },
    {
        "endpoint": "/v1/listings",
        "category": "completeness",
        "documented": "Returns active sale listings in your city. Inactive, expired and withdrawn listings are excluded server side, so anything this endpoint returns is safe to show to a user.",
        "actual": "The /v1/listings endpoint returns 978 inactive listings with is_live: false alongside 3,722 active listings. Inactive listings are not excluded server-side.",
        "how_found": "Analyzed is_live values across all 4,700 returned listing records.",
        "impact": "Failing to filter on is_live == true on the frontend exposes expired and withdrawn listings to end users.",
        "evidence": [
            "100-1000005", "100-1000008", "100-1000010", "100-1000012", "100-1000018",
            "100-1000024", "100-1000025", "100-1000028", "100-1000029", "100-1000030"
        ]
    }
]

print(f"Generated {len(findings)} validated findings.")

# Validate schema
valid_categories = {
    "auth", "pagination", "units", "filters", "sorting", "timestamps",
    "duplicates", "completeness", "data_quality", "fraud", "consistency",
    "missing_endpoint", "undocumented_endpoint"
}

for i, f in enumerate(findings):
    assert f["category"] in valid_categories, f"Invalid category {f['category']} in finding {i}"
    assert "endpoint" in f and "documented" in f and "actual" in f and "how_found" in f and "impact" in f and "evidence" in f
    assert len(f["evidence"]) <= 20, f"Evidence exceeds 20 items in finding {i}"

with open("investigation/findings_output.json", "w", encoding="utf-8") as f:
    json.dump(findings, f, indent=2)

print("[OK] All findings validated against submission schema successfully.")
