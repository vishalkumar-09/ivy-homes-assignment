// ═══════════════════════════════════════════════════════
//  Ivy Homes — Authentication & Session Module
// ═══════════════════════════════════════════════════════

function setSession(data) {
  state.accessToken  = data.access_token;
  state.refreshToken = data.refresh_token;
  state.user         = data.user;
  localStorage.setItem('ivy_access_token',  data.access_token);
  localStorage.setItem('ivy_refresh_token', data.refresh_token);
  localStorage.setItem('ivy_user', JSON.stringify(data.user));
  updateAuthUI();
  fetchSavedIds();
}

function logout() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  state.savedListingIds.clear();
  localStorage.removeItem('ivy_access_token');
  localStorage.removeItem('ivy_refresh_token');
  localStorage.removeItem('ivy_user');
  updateAuthUI();
  navigate('listings');
}

function updateAuthUI() {
  const c = document.getElementById('nav-auth-container');
  if (!c) return;
  if (state.user) {
    const initials = state.user.email.charAt(0).toUpperCase();
    c.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:1px solid var(--border-color);padding:5px 12px 5px 6px;border-radius:99px;">
          <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--indigo));display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#022c20;">${initials}</div>
          <span style="font-size:0.83rem;color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${state.user.email}</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="logout()">Sign out</button>
      </div>`;
  } else {
    c.innerHTML = `<button class="btn btn-primary btn-sm" onclick="openLoginModal()">Sign in</button>`;
  }
}

function openLoginModal()  { const m = document.getElementById('login-modal'); if (m) m.style.display='flex'; }
function closeLoginModal() { const m = document.getElementById('login-modal'); if (m) m.style.display='none'; }

function fillDemo(email) {
  document.getElementById('login-email').value    = email;
  document.getElementById('login-password').value = '5edd65b804';
}

async function submitLogin(e) {
  if (e) e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = e?.target?.querySelector('button[type=submit]');
  errEl.innerText = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      errEl.innerText = err.detail || 'Login failed. Check credentials.';
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
      return;
    }

    const data = await res.json();
    setSession(data);
    await fetchSavedIds();
    closeLoginModal();
    renderView();
  } catch (err) {
    errEl.innerText = 'Network error — is the server running?';
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
  }
}
