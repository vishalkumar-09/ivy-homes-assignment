'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';

const DEMO_ACCOUNTS = [
  { email: 'demo1@ivy.homes', label: 'demo1' },
  { email: 'demo2@ivy.homes', label: 'demo2' },
  { email: 'demo3@ivy.homes', label: 'demo3' },
];
const DEMO_PASSWORD = '5edd65b804';

export default function LoginModal() {
  const { loginOpen, setLoginOpen, setSession } = useAuth();
  const { fetchSavedIds } = useSaved();
  const [email, setEmail]     = useState('demo1@ivy.homes');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  if (!loginOpen) return null;

  const close = () => { setLoginOpen(false); setError(''); };

  const fillDemo = (e) => { setEmail(e); setPassword(DEMO_PASSWORD); };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || 'Login failed. Check credentials.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSession(data);
      await fetchSavedIds();
      close();
    } catch (e) {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal-container">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-icon" style={{ width: 30, height: 30, fontSize: '0.9rem' }}>🌿</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>Sign in to Ivy Homes</h3>
          </div>
          <button onClick={close} style={{ fontSize: '1.4rem', color: 'var(--text-muted)', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Session persists via auto-refresh tokens. Your saved properties sync instantly across all devices.
          </p>

          <div style={{ padding: 14, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>⚡ Quick Demo Access</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DEMO_ACCOUNTS.map(({ email: e, label }) => (
                <button key={e} className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => fillDemo(e)}>{label}</button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="filter-label" style={{ display: 'block', marginBottom: 6 }}>Email Address</label>
              <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="demo1@ivy.homes" />
            </div>
            <div>
              <label className="filter-label" style={{ display: 'block', marginBottom: 6 }}>Password</label>
              <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••••" />
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
            <button type="submit" id="login-submit-btn" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
