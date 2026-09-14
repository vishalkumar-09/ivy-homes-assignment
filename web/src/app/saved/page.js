'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { formatListingClient } from '@/lib/constants';
import { PropertyCard, SkeletonCards } from '@/components/Cards';
import { useAuth } from '@/contexts/AuthContext';

export default function SavedPage() {
  const { user, setLoginOpen } = useAuth();
  const [data, setData]        = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/saved');
        if (res && res.ok) setData(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', opacity: 0.4 }}>❤️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 }}>Sign in to Save Properties</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.7 }}>Your saved listings are synced to your account and available across sessions.</p>
        <button className="btn btn-primary btn-lg" onClick={() => setLoginOpen(true)}>Sign In with Demo Account</button>
      </div>
    );
  }

  return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">❤️ Saved Properties</div>
        <h1 className="hero-title">Your Favourites</h1>
        <p className="hero-subtitle">Saved on: <strong>{user.email}</strong> · Synced across sessions.</p>
      </div>

      <div id="saved-grid" className="property-grid">
        {loading ? <SkeletonCards count={6} /> :
          !data?.results?.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">🤍</div>
              <div className="empty-state-title">No saved properties yet</div>
              <div className="empty-state-sub">Browse listings and click ❤️ to save your favourites.</div>
              <a href="/" className="btn btn-primary" style={{ marginTop: 20 }}>Browse Properties</a>
            </div>
          ) : data.results.map(l => <PropertyCard key={l.listing_id} listing={formatListingClient(l)} />)
        }
      </div>
    </>
  );
}
