'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';

const QA_TEMPLATE = (a) => [
  { q: 'Total Listing Records',          val: a.total_listing_records?.toLocaleString(),          color: 'var(--accent)',  derivation: 'Exhaustive offset pagination (94 pages × 50) through /v1/listings until has_more = false.' },
  { q: 'Unique Physical Properties',     val: a.unique_properties?.toLocaleString(),              color: 'var(--accent)',  derivation: 'Clustered 4,700 records on composite key: apartment + floor + bedrooms + bathrooms + facing + normalized carpet area.' },
  { q: 'Active Live Listings',           val: a.active_listings?.toLocaleString(),                color: 'var(--accent)',  derivation: 'Count of records with is_live == true. API returns 978 inactive records without filtering.' },
  { q: 'Corrupt Listing IDs',            val: `${a.corrupt_listing_ids?.length} listings`,        color: 'var(--danger)',  derivation: 'Domain constraint checks: negative prices, floor > total_floors, carpet > super_built_up, swapped GPS coords outside Bangalore.' },
  { q: 'Total Monthly Rent (Yelahanka)', val: `₹${a.total_monthly_rent?.toLocaleString('en-IN')}`, color: 'var(--accent)', derivation: 'Sum of price across all 162 rentals in assigned locality Yelahanka from /v1/rentals.' },
  { q: 'Avg Price/SqFt — 2BHK Active',   val: `₹${a.avg_price_per_sqft_2bhk?.toLocaleString()} / sqft`, color: 'var(--indigo)', derivation: 'Mean of price÷carpet_area (sqft) for is_live=true, bedroom=2, excluding Q4 corrupt + Q9 fake, converting magichomes SqM areas × 10.7639.' },
  { q: 'Costliest Project',              val: `${a.costliest_project?.project_id} · ₹${((a.costliest_project?.price_max_inr || 0) / 10000000).toFixed(2)} Cr`, color: 'var(--violet)', derivation: 'Project P10068 (Puravankara Sanctuary) has price_max 99.8 in Crores = ₹99,80,00,000 INR.' },
  { q: 'Listings in Last 7 Days',        val: a.listings_last_7_days,                             color: 'var(--accent)',  derivation: 'Count posted_at ∈ [2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30). Lexicographic sort corrected via dateutil.' },
  { q: 'Fake Bait Listing IDs',          val: `${a.fake_listing_ids?.length} listings`,           color: 'var(--danger)',  derivation: '8 sale listings with price < ₹1,00,000 (rental bait) + 92 listings with advance fee/token amount scam text in description.' },
  { q: 'Projects with Wrong Count',      val: `${a.projects_with_wrong_listing_count} / 520`,     color: 'var(--warning)', derivation: 'Cross-referenced project.total_listings vs actual count of listings per project_id in /v1/listings.' },
];

export default function AnswersPage() {
  const [sub, setSub]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/submission');
        if (res && res.ok) setSub(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <>
      <div className="hero-section"><h1 className="hero-title">10 Assignment Questions</h1></div>
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</div>
    </>
  );

  if (!sub) return null;

  const QA = QA_TEMPLATE(sub.answers || {});

  return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">📝 Assignment Solutions</div>
        <h1 className="hero-title">10 Analytical Questions</h1>
        <p className="hero-subtitle">
          All answers anchored to <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4, fontSize: '0.9em' }}>REFERENCE = 2026-09-10T00:00:00+05:30</code>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {QA.map((item, i) => (
          <div key={i} className="glass-card answer-card fade-in">
            <div className="answer-num">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>{item.q}</div>
              <div className="answer-value" style={{ color: item.color }}>{item.val}</div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{item.derivation}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ marginTop: 28, padding: 24, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Submitted by</div>
        <div style={{ color: 'var(--accent)', fontSize: '1.3rem', fontWeight: 800 }}>{sub.candidate?.name}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{sub.candidate?.email}</div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a href={sub.candidate?.repo_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">📁 GitHub Repo</a>
          <a href={sub.candidate?.demo_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">🌐 Live Demo</a>
        </div>
      </div>
    </>
  );
}
