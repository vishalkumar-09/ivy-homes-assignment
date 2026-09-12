# Ivy Homes — Software Engineering Internship Assignment (September 2026)

**Candidate**: Vishal Kumar Gaud  
**Email**: iamvishalkumar09@gmail.com  
**Assigned City**: Bangalore  
**Assigned Locality**: Yelahanka  
**Reference Timestamp**: `2026-09-10T00:00:00+05:30` (IST)  
**Repository**: [https://github.com/vishalkumar-09/ivy-homes-assignment](https://github.com/vishalkumar-09/ivy-homes-assignment)

---

## 1. Project Overview

This repository contains the end-to-end implementation of the **Ivy Homes Software Engineering Internship Assignment**.

The project encompasses:
1. **API Investigation & Lie Detection**: A comprehensive audit identifying 15 reproducible discrepancies between `API_REFERENCE.md` and the live running API (`https://solve.ivy.homes`).
2. **Data Analysis & 10 Solutions**: Reproducible Python scripts solving all 10 assignment questions with rigorous mathematical and domain validation.
3. **Full-Stack Web Application**: A modern, high-performance web platform built with **FastAPI** and a responsive single-page architecture (SPA), implementing real authentication, resilient client/server filtering, listing detail pages with similar properties, per-user saved favourites, rentals and projects directories, and an interactive market insights dashboard.
4. **Submission Artifact**: Validated `submission.json` populated with candidate metadata, exact answers, and categorized findings with concrete evidence.

---

## 2. Tech Stack & Frontend Architecture

- **Backend / API**: Python 3.14, **FastAPI**, Uvicorn, HTTPX, Pydantic, Jinja2
- **Frontend Architecture**: Clean, modular Single-Page Application (SPA) separated into dedicated modules under the `/frontend` directory:
  - `frontend/index.html`: Main SPA shell and semantic layout
  - `frontend/css/styles.css`: Complete design system (Glassmorphism, dark/light themes, CSS variables)
  - `frontend/js/state.js`: Central application state, reactive stores, formatting utilities
  - `frontend/js/api.js`: Resilient API fetcher with automatic 401 token refresh interceptor
  - `frontend/js/auth.js`: Session persistence, demo account credentials switcher, login modal
  - `frontend/js/router.js`: SPA hash-based client router and view dispatcher
  - `frontend/js/components/`: Modular UI components (`theme.js`, `pagination.js`, `cards.js`)
  - `frontend/js/views/`: Dedicated view controllers (`listings.js`, `listing-detail.js`, `rentals.js`, `projects.js`, `saved.js`, `insights.js`, `findings.js`, `answers.js`)
  - `frontend/js/app.js`: Application bootstrapping and event orchestration
- **Data Investigation**: Python (Requests, Dateutil, NumPy, Collections)

---

## 3. Setup Instructions

### Prerequisites
- Python 3.10+
- Git

### Installation
```bash
# 1. Clone repository
git clone https://github.com/vishalkumar-09/ivy-homes-assignment.git
cd ivy-homes-assignment

# 2. Create virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

### Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```env
IVY_BASE_URL=https://solve.ivy.homes
IVY_API_KEY=IVY26-9A0B5D37765D
IVY_CITY=Bangalore
IVY_ASSIGNED_LOCALITY=Yelahanka
IVY_DEMO_PASSWORD=5edd65b804
```
*(Note: `.env` is included in `.gitignore` and must never be committed).*

---

## 4. Running Locally

### Start Web Application
```bash
uvicorn app.main:app --reload --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Run Investigation & Question Solver
```bash
# Fetch fresh datasets
python investigation/fetch_all.py

# Run complete data analysis & solve all 10 questions
python investigation/solve_all_questions.py

# Verify documentation findings schema
python investigation/generate_findings.py
```

---

## 5. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Modern SPA Client (Browser)                 │
│  - Property Grid & Resilient Filters (Client-side fallback) │
│  - Listing Detail View & Comparable Recommendations         │
│  - Saved Favourites Sync & Demo Account Switcher            │
│  - Interactive Market Insights & Findings Explorer          │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON over HTTP
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Web Application                   │
│  - /api/auth (Login, Token Refresh, Session Management)     │
│  - /api/listings (Sanitized, unit-normalized, sorted)       │
│  - /api/rentals & /api/projects (Crores to INR conversion)   │
│  - /api/saved (Per-user persistent favourites)              │
│  - /api/insights (Aggregated market metrics & distributions)│
└──────────────────────────────┬──────────────────────────────┘
                               │ Async HTTP with X-API-Key
┌──────────────────────────────▼──────────────────────────────┐
│                   Ivy Homes Remote API                      │
│                https://solve.ivy.homes                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. API Investigation & Documentation Discrepancies

### Key Hypotheses Investigated & Verified

1. **Authentication Parameter vs Header**:
   - *Hypothesis*: `API_REFERENCE.md` specifies `GET /v1/listings?api_key=...`.
   - *Result*: Passing `?api_key=...` in the query returns HTTP 401: `{"detail": "send your key in the X-API-Key request header, not as a query parameter"}`. Requests must include `X-API-Key` in HTTP headers.

2. **Session Lifetime & Refresh Flow**:
   - *Hypothesis*: `API_REFERENCE.md` claims tokens last 24 hours (`expires_in: 86400`) and "There is no refresh flow."
   - *Result*: Tokens expire after **900 seconds (15 minutes)**. The login response returns `access_token`, `refresh_token`, and `refresh_url: "/auth/refresh"`. An active refresh flow is required for persistent sessions.

3. **Pagination Mechanism & Limits**:
   - *Hypothesis*: The API supports `page` (1-indexed) and `limit` up to 200.
   - *Result*: The `page` parameter is **silently ignored** (page=1 and page=2 return identical records at offset 0). The API uses `offset` and `limit`. The maximum limit is **capped at 50**.

4. **Broken Endpoint Paths**:
   - *Hypothesis*: Single listing is `GET /v1/listing/{id}`, comparable listings are at `GET /v1/listings/`, and favourites are at `/v1/favourites`.
   - *Result*:
     - `GET /v1/listing/{id}` returns 404 (the real route is plural `GET /v1/listings/{id}`).
     - `GET /v1/listings/{id}/similar` returns 404.
     - `GET /v1/favourites` returns 404 (the real route is `GET /v1/saved`, `POST /v1/saved`, `DELETE /v1/saved/{id}`).
     - `GET /v1/analytics/summary` returns 404.

5. **Silently Ignored Sorting**:
   - *Hypothesis*: Query parameter `order=desc` sorts descending.
   - *Result*: `order=desc` is silently ignored on `/v1/listings` and returns ascending order. Sort by `posted_at` performs lexicographical sorting instead of chronological parsing.

6. **Unit Discrepancies**:
   - *Projects*: `price_min` and `price_max` are in **Crores (Cr)** (e.g. `1.04` means ₹1,04,00,000), not integer INR rupees.
   - *Listings*: Listings from website `magichomes` with carpet area < 300 have areas recorded in **Square Meters (sqm)** rather than square feet (374 records).

7. **Data Quality & Fraud**:
   - *Corrupt*: 40 listing records describe physically impossible physical states (negative prices, floor > total floors, carpet area > super built-up area, inverted GPS coordinates).
   - *Fake*: 100 listings are fraudulent lead-generation baits (8 listings advertising multi-crore properties for rental prices < ₹1,00,000, and 92 listings with advance booking fee / token amount scam text).

---

## 7. Things That Turned Out to be Fine

1. **Locality Filtering**: Filtering by `locality` (e.g. `locality=yelahanka` or `locality=koramangala`) matches accurately and case-insensitively on both listings and rentals.
2. **BHK Filtering**: Filtering by `bhk` on `/v1/listings` filters bedrooms accurately.
3. **Per-User Favourites Isolation**: Saved listings on `/v1/saved` are properly isolated per user token (User 1's saved properties never leak into User 2's session).
4. **Server Clock & Timezone**: The `/health` endpoint correctly reports the server clock with an explicit `+05:30` (Asia/Kolkata) offset.
5. **Rate Limiting**: The 1200 req/min rate limit is fully honored and generous for exhaustive batch fetching.

---

## 8. Ten Assignment Answers

Anchor Reference Moment: `2026-09-10T00:00:00+05:30` (IST)

| # | Key | Answer | Derivation Summary |
|---|---|---|---|
| **1** | `total_listing_records` | **4700** | Exhaustive offset pagination through `/v1/listings` until `has_more == false` (94 pages of 50 items). |
| **2** | `unique_properties` | **4572** | Clustered records by physical property signature `(apartment, locality, property_type, floor, bedroom, bathroom, facing, normalized_carpet)`. |
| **3** | `active_listings` | **3722** | Retrievable listing records with `is_live == true` (excludes 978 inactive listings). |
| **4** | `corrupt_listing_ids` | **40 IDs** | Verified impossible records (negative prices, floor > total floors, carpet > SBUA, swapped lat/lng). |
| **5** | `total_monthly_rent` | **₹57,69,800** | Sum of monthly rent across all 162 retrievable rentals in assigned locality `Yelahanka`. |
| **6** | `avg_price_per_sqft_2bhk` | **11633.35** | Mean `price / carpet_area` in INR/sqft across active 2BHKs excluding corrupt and fake listings, converting SqM to SqFt for MagicHomes. |
| **7** | `costliest_project` | `{"project_id": "P10068", "price_max_inr": 998000000}` | *Puravankara Sanctuary* with max price of 99.8 Cr = ₹99,80,00,000. |
| **8** | `listings_last_7_days` | **149** | Count of listings posted in `[2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30)` in IST. |
| **9** | `fake_listing_ids` | **100 IDs** | 8 bait sale listings with rental prices (< ₹1,00,000) + 92 advance fee booking scam listings. |
| **10** | `projects_with_wrong_listing_count` | **392** | Projects where `project.total_listings` disagrees with actual listings linked to that `project_id`. |

---

## 9. Summary of Findings

All 15 findings are fully documented in `submission.json` and in the web application's **API Findings** explorer:

| Category | Endpoint | Summary of Discrepancy | Evidence Count |
|---|---|---|---|
| `auth` | `*` | Requires `X-API-Key` header; query parameter returns 401 | 0 |
| `auth` | `/auth/login` | Returns `access_token`, 15-min expiry, requires `/auth/refresh` | 0 |
| `pagination` | `/v1/listings` | `page` param ignored; offset-based; limit capped at 50 | 0 |
| `missing_endpoint` | `/v1/listing/{id}` | Singular route 404s; actual route is `/v1/listings/{id}` | 0 |
| `missing_endpoint` | `/v1/listings/{id}/similar` | Endpoint 404s; recommendations must be computed | 0 |
| `missing_endpoint` | `/v1/favourites` | 404 Not Found; actual endpoint is `/v1/saved` | 0 |
| `missing_endpoint` | `/v1/analytics/summary` | 404 Not Found; metrics must be computed dynamically | 0 |
| `sorting` | `/v1/listings` | `order=desc` silently ignored; returns ascending order | 0 |
| `units` | `/v1/projects` | `price_min`/`price_max` are in Crores, not integer INR | 10 IDs |
| `units` | `/v1/listings` | `magichomes` carpet areas (< 300) are in Square Meters | 12 IDs |
| `data_quality` | `/v1/listings` | 40 listings contain physically impossible parameters | 20 IDs |
| `fraud` | `/v1/listings` | 100 listings contain advance fee scams or bait prices | 20 IDs |
| `consistency` | `/v1/projects` | 392 of 520 projects report incorrect `total_listings` | 20 IDs |
| `duplicates` | `/v1/listings` | Multiple cross-portal listings represent same physical unit | 11 IDs |
| `completeness` | `/v1/listings` | Returns 978 inactive listings (`is_live: false`) | 10 IDs |

---

## 10. What I Would Do With Another Two Days

1. **Interactive Spatial Mapping**: Integrate an interactive Mapbox/Leaflet map visualization displaying locality boundaries, price heatmaps, and property clustering.
2. **Automated Continuous Integration & Test Suite**: Implement PyTest integration test suites validating API contract responses, schema mutations, and regression checks on GitHub Actions.
3. **Real-Time WebSockets**: Introduce real-time updates for newly added listings and dynamic price changes.
4. **Enhanced Data Pipeline**: Containerize the application with Docker and implement Redis caching with automatic stale-while-revalidate policies.
