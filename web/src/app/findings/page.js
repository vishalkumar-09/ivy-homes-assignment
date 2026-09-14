'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { CATEGORY_STYLE } from '@/lib/constants';

const CATEGORIES = ['auth','pagination','units','missing_endpoint','sorting','data_quality','fraud','consistency','duplicates','completeness'];

export default function FindingsPage() {
  const [findings, setFindings] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/submission');
        if (res && res.ok) {
          const sub = await res.json();
          setFindings(sub.findings || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <>
      <div className="hero-section"><h1 className="hero-title">API Documentation Audit</h1></div>
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading findings…</div>
    </>
  );

  if (!findings) return null;

  return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">🔍 API Audit Report</div>
        <h1 className="hero-title">15 Proven Documentation Discrepancies</h1>
        <p className="hero-subtitle">
          Systematic comparison of <code style={{ fontSize: '0.9em', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>API_REFERENCE.md</code> versus live API at <code style={{ fontSize: '0.9em', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>solve.ivy.homes</code>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          {CATEGORIES.map(cat => {
            const st    = CATEGORY_STYLE[cat] || {};
            const count = findings.filter(f => f.category === cat).length;
            return count ? (
              <span key={cat} className="chip" style={{ background: `${st.color}18`, color: st.color, borderColor: `${st.color}40` }}>
                {st.icon || ''} {cat} ({count})
              </span>
            ) : null;
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {findings.map((f, i) => {
          const st = CATEGORY_STYLE[f.category] || { color: 'var(--accent)', icon: '📌', cls: '' };
          return (
            <div key={i} className={`glass-card finding-card ${st.cls} fade-in`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${st.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{st.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: st.color, marginBottom: 2 }}>#{i+1} · {f.category.replace(/_/g, ' ')}</div>
                    <code style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.endpoint}</code>
                  </div>
                </div>
                <span className="chip" style={{ background: `${st.color}15`, color: st.color, borderColor: `${st.color}30` }}>{f.evidence?.length || 0} evidence IDs</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: 'rgba(248,113,113,0.07)', padding: '12px 14px', borderRadius: 'var(--r-sm)', border: '1px solid rgba(248,113,113,0.15)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--danger)', marginBottom: 6 }}>📄 Documented</div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.documented}</p>
                </div>
                <div style={{ background: 'rgba(34,211,165,0.07)', padding: '12px 14px', borderRadius: 'var(--r-sm)', border: '1px solid rgba(34,211,165,0.15)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 6 }}>✅ Actual API</div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.actual}</p>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <span><strong style={{ color: 'var(--text-secondary)' }}>How found:</strong> {f.how_found}</span>
                <span><strong style={{ color: 'var(--text-secondary)' }}>Impact:</strong> {f.impact}</span>
              </div>

              {f.evidence?.length ? (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence: </span>
                  <code style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{f.evidence.join(' · ')}</code>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
