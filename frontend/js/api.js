// ═══════════════════════════════════════════════════════
//  Ivy Homes — API Helper Module
// ═══════════════════════════════════════════════════════

async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.accessToken) headers['Authorization'] = `Bearer ${state.accessToken}`;

  let response = await fetch(endpoint, { ...options, headers });

  if (response.status === 401 && state.refreshToken && !endpoint.includes('/auth/')) {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: state.refreshToken }),
    });
    if (refreshRes.ok) {
      setSession(await refreshRes.json());
      headers['Authorization'] = `Bearer ${state.accessToken}`;
      response = await fetch(endpoint, { ...options, headers });
    } else {
      logout();
      return null;
    }
  }
  return response;
}
