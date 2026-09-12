// ═══════════════════════════════════════════════════════
//  Ivy Homes — API Findings View Module
// ═══════════════════════════════════════════════════════

async function loadFindingsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div class="hero-section"><h1 class="hero-title">API Documentation Audit</h1></div><div style="text-align:center;padding:40px;color:var(--text-muted);">Loading findings…</div>`;

  try {
    const res = await apiFetch('/api/submission');
    if (!res || !res.ok) return;
    const sub      = await res.json();
    const findings = sub.findings || [];

    container.innerHTML = `
      <div class="hero-section">
        <div class="hero-eyebrow">🔍 API Audit Report</div>
        <h1 class="hero-title">15 Proven Documentation Discrepancies</h1>
        <p class="hero-subtitle">Systematic comparison of <code style="font-size:0.9em;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">API_REFERENCE.md</code> versus live API at <code style="font-size:0.9em;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">solve.ivy.homes</code>.</p>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:20px;">
          ${['auth','pagination','units','missing_endpoint','sorting','data_quality','fraud','consistency','duplicates','completeness'].map(cat => {
            const st = CATEGORY_STYLE[cat] || {};
            const count = findings.filter(f => f.category === cat).length;
            return count ? `<span class="chip" style="background:${st.color}18;color:${st.color};border-color:${st.color}40;">${st.icon||''} ${cat} (${count})</span>` : '';
          }).join('')}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        ${findings.map((f, i) => {
          const st = CATEGORY_STYLE[f.category] || { color:'var(--accent)', icon:'📌', cls:'' };
          return `
            <div class="glass-card finding-card ${st.cls} fade-in">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:32px;height:32px;border-radius:8px;background:${st.color}22;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${st.icon}</div>
                  <div>
                    <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${st.color};margin-bottom:2px;">#${i+1} · ${f.category.replace(/_/g,' ')}</div>
                    <code style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">${f.endpoint}</code>
                  </div>
                </div>
                <span class="chip" style="background:${st.color}15;color:${st.color};border-color:${st.color}30;">${f.evidence?.length||0} evidence IDs</span>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div style="background:rgba(248,113,113,0.07);padding:12px 14px;border-radius:var(--r-sm);border:1px solid rgba(248,113,113,0.15);">
                  <div style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--danger);margin-bottom:6px;">📄 Documented</div>
                  <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.6;">${f.documented}</p>
                </div>
                <div style="background:rgba(34,211,165,0.07);padding:12px 14px;border-radius:var(--r-sm);border:1px solid rgba(34,211,165,0.15);">
                  <div style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent);margin-bottom:6px;">✅ Actual API</div>
                  <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.6;">${f.actual}</p>
                </div>
              </div>

              <div style="font-size:0.82rem;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:16px;">
                <span><strong style="color:var(--text-secondary)">How found:</strong> ${f.how_found}</span>
                <span><strong style="color:var(--text-secondary)">Impact:</strong> ${f.impact}</span>
              </div>

              ${f.evidence?.length ? `
                <div style="margin-top:10px;padding:8px 12px;background:rgba(0,0,0,0.25);border-radius:var(--r-sm);border:1px solid var(--border-color);">
                  <span style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Evidence: </span>
                  <code style="font-size:0.78rem;color:var(--text-secondary);word-break:break-all;">${f.evidence.join(' · ')}</code>
                </div>` : ''}
            </div>`;
        }).join('')}
      </div>`;
  } catch (e) { console.error('loadFindings:', e); }
}
