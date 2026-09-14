/**
 * Ivy Homes — Remote API client & Data Cache (server-side only)
 * Loads data from local curated dataset files in `src/data/` (or `investigation/data/raw/`)
 * and falls back to live authenticated remote Ivy API (`https://solve.ivy.homes`).
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.IVY_BASE_URL || 'https://solve.ivy.homes';
const API_KEY  = process.env.IVY_API_KEY  || 'IVY26-9A0B5D37765D';
const DEMO_PASSWORD = process.env.IVY_DEMO_PASSWORD || '5edd65b804';

// ── Corrupt + fake IDs from submission.json ─────────────────────────────────
export const CORRUPT_IDS = new Set([
  '100-1000035','100-1000753','100-1001077','100-1001141','100-1002346','100-1002442',
  '100-1002512','100-1002600','100-1002884','100-1003117','100-1003624','DWE-1000614',
  'DWE-1001165','DWE-1001183','DWE-1001909','DWE-1002892','DWE-1003673','MAG-1000179',
  'MAG-1000885','MAG-1002362','MAG-1003269','MAG-1003510','SQU-1000394','SQU-1000979',
  'SQU-1002298','SQU-1002843','SQU-1003177','SQU-1003370','ZER-1000260','ZER-1000430',
  'ZER-1000500','ZER-1001207','ZER-1001249','ZER-1001334','ZER-1002586','ZER-1002632',
  'ZER-1002667','ZER-1002911','ZER-1003426','ZER-1003603',
]);

export const FAKE_IDS = new Set([
  '100-1000060','100-1000461','100-1000995','100-1001341','100-1001464','100-1001466',
  '100-1001559','100-1001896','100-1002376','100-1002426','100-1002452','100-1002483',
  '100-1002501','100-1003248','100-1003327','100-1003721','100-1004028','100-1004169',
  '100-1004259','100-1004275','100-1004443','100-1004486','DWE-1000041','DWE-1000213',
  'DWE-1000884','DWE-1000921','DWE-1000988','DWE-1001091','DWE-1001367','DWE-1001503',
  'DWE-1001565','DWE-1001798','DWE-1001972','DWE-1002631','DWE-1002897','DWE-1003102',
  'DWE-1003148','DWE-1003181','DWE-1003856','DWE-1004129','DWE-1004194','DWE-1004256',
  'MAG-1000464','MAG-1000899','MAG-1001219','MAG-1001930','MAG-1001951','MAG-1002169',
  'MAG-1002587','MAG-1003136','MAG-1003311','MAG-1003492','MAG-1003498','MAG-1003632',
  'MAG-1004014','MAG-1004020','MAG-1004030','MAG-1004084','MAG-1004411','MAG-1004604',
  'SQU-1000028','SQU-1000110','SQU-1000196','SQU-1000316','SQU-1000398','SQU-1000647',
  'SQU-1000848','SQU-1001431','SQU-1001730','SQU-1001990','SQU-1002915','SQU-1002988',
  'SQU-1003023','SQU-1003277','SQU-1003524','SQU-1004086','SQU-1004126','SQU-1004240',
  'SQU-1004270','SQU-1004329','SQU-1004487','SQU-1004554','SQU-1004652','ZER-1000181',
  'ZER-1000531','ZER-1000830','ZER-1001001','ZER-1001172','ZER-1001622','ZER-1001855',
  'ZER-1002516','ZER-1002851','ZER-1002908','ZER-1002980','ZER-1003652','ZER-1003813',
  'ZER-1004332','ZER-1004389','ZER-1004683',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

export function ivyHeaders() {
  return { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
}

export function ivyAuthHeaders(token) {
  return { ...ivyHeaders(), Authorization: `Bearer ${token}` };
}

/**
 * Normalise one listing: SqM → SqFt for magichomes, price_per_sqft, price_formatted.
 */
export function formatListing(l) {
  const c   = l.carpet_area || 0;
  const pt  = (l.property_type || '').toLowerCase();
  let is_sqm = false;
  let c_sqft = c;
  if (pt !== 'plot' && l.website === 'magichomes' && c < 300) {
    is_sqm = true;
    c_sqft = Math.round(c * 10.7639104 * 10) / 10;
  }
  const price = l.price || 0;
  const ppsq  = c_sqft && price > 0 ? Math.round(price / c_sqft) : 0;
  return {
    ...l,
    carpet_area_sqft:  c_sqft,
    is_unit_sqm:       is_sqm,
    price_per_sqft:    ppsq,
    price_formatted:   price ? `₹${price.toLocaleString('en-IN')}` : '₹0',
  };
}

let _adminToken = null;
let _adminTokenExpiry = 0;

async function getAdminToken() {
  const now = Date.now();
  if (_adminToken && _adminTokenExpiry > now + 60000) {
    return _adminToken;
  }
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: ivyHeaders(),
      body: JSON.stringify({ email: 'demo1@ivy.homes', password: DEMO_PASSWORD }),
    });
    if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
    const data = await res.json();
    _adminToken = data.access_token;
    _adminTokenExpiry = now + (data.expires_in || 900) * 1000;
    return _adminToken;
  } catch (err) {
    console.warn('[ivyClient] Could not login as demo user:', err.message);
    return null;
  }
}

async function fetchRemoteAll(pathName, extraParams = {}) {
  const token = await getAdminToken();
  if (!token) return [];
  const results = [];
  let offset = 0;
  const limit = 50;
  while (true) {
    const qs = new URLSearchParams({ ...extraParams, offset, limit }).toString();
    const res = await fetch(`${BASE_URL}${pathName}?${qs}`, {
      headers: ivyAuthHeaders(token),
    });
    if (!res.ok) break;
    const data = await res.json();
    const page = data.results || [];
    results.push(...page);
    if (!data.has_more || page.length === 0) break;
    offset += limit;
  }
  return results;
}

function tryReadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(text);
      return data.results || data;
    }
  } catch (e) {
    // Ignore read error
  }
  return null;
}

function loadLocalDataset() {
  const possibleDirs = [
    path.join(process.cwd(), 'src', 'data'),
    path.join(process.cwd(), 'data'),
    path.join(process.cwd(), '..', 'investigation', 'data', 'raw'),
    path.join(process.cwd(), 'investigation', 'data', 'raw'),
  ];

  for (const dir of possibleDirs) {
    const listings = tryReadJson(path.join(dir, 'listings.json'));
    const rentals  = tryReadJson(path.join(dir, 'rentals.json'));
    const projects = tryReadJson(path.join(dir, 'projects.json'));
    if (listings && listings.length > 0) {
      return {
        listings,
        rentals: rentals || [],
        projects: projects || []
      };
    }
  }
  return null;
}

// ── In-memory cache ─────────────────────────────────────────────────────────

let _listings = null;
let _rentals  = null;
let _projects = null;
let _loadPromise = null;

async function populateCache() {
  // 1. Try local JSON first (instantaneous)
  const local = loadLocalDataset();
  if (local && local.listings.length > 0) {
    _listings = local.listings;
    _rentals  = local.rentals;
    _projects = local.projects;
    console.log(`[ivyClient] Loaded from local data: ${_listings.length} listings, ${_rentals.length} rentals, ${_projects.length} projects`);
    return;
  }

  // 2. Fall back to remote authenticated API
  console.log('[ivyClient] Local data not found. Fetching from remote Ivy API...');
  const [listings, rentals, projects] = await Promise.all([
    fetchRemoteAll('/v1/listings'),
    fetchRemoteAll('/v1/rentals'),
    fetchRemoteAll('/v1/projects'),
  ]);
  _listings = listings;
  _rentals  = rentals;
  _projects = projects;
  console.log(`[ivyClient] Loaded from remote: ${_listings.length} listings, ${_rentals.length} rentals, ${_projects.length} projects`);
}

export async function getCache() {
  if (_listings !== null) return { listings: _listings, rentals: _rentals, projects: _projects };
  if (!_loadPromise) {
    _loadPromise = populateCache().finally(() => { _loadPromise = null; });
  }
  await _loadPromise;
  return { listings: _listings, rentals: _rentals, projects: _projects };
}

// ── Direct proxy helpers (auth, saved) ───────────────────────────────────────

export async function ivyPost(pathName, body, token = null) {
  const headers = token ? ivyAuthHeaders(token) : ivyHeaders();
  return fetch(`${BASE_URL}${pathName}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

export async function ivyDelete(pathName, token) {
  return fetch(`${BASE_URL}${pathName}`, { method: 'DELETE', headers: ivyAuthHeaders(token) });
}

export async function ivyGet(pathName, token) {
  return fetch(`${BASE_URL}${pathName}`, { headers: ivyAuthHeaders(token) });
}
