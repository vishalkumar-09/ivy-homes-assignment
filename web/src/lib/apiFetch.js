'use client';

// ═══════════════════════════════════════════════════════
//  Ivy Homes — API Fetch Utility (client-side)
// ═══════════════════════════════════════════════════════

let _accessToken  = null;
let _refreshToken = null;

export function initTokens(access, refresh) {
  _accessToken  = access;
  _refreshToken = refresh;
}

export function getAccessToken()  { return _accessToken; }
export function getRefreshToken() { return _refreshToken; }

export async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  let response = await fetch(endpoint, { ...options, headers });

  if (response.status === 401 && _refreshToken && !endpoint.includes('/auth/')) {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      _accessToken  = data.access_token;
      _refreshToken = data.refresh_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ivy_access_token',  data.access_token);
        localStorage.setItem('ivy_refresh_token', data.refresh_token);
        localStorage.setItem('ivy_user', JSON.stringify(data.user));
      }
      headers['Authorization'] = `Bearer ${_accessToken}`;
      response = await fetch(endpoint, { ...options, headers });
    } else {
      _accessToken  = null;
      _refreshToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ivy_access_token');
        localStorage.removeItem('ivy_refresh_token');
        localStorage.removeItem('ivy_user');
      }
      return null;
    }
  }
  return response;
}
