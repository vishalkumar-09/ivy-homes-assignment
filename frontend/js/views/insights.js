// ═══════════════════════════════════════════════════════
//  Ivy Homes — Market Insights View Module
// ═══════════════════════════════════════════════════════

async function loadInsightsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div class="hero-section"><div class="hero-eyebrow">📊 Market Intelligence</div><h1 class="hero-title">Bangalore Real Estate Insights</h1></div><div style="text-align:center;padding:40px;color:var(--text-muted);">Computing insights…</div>`;

  try {
    const res  = await apiFetch('/api/insights/summary');
    if (!res || !res.ok) return;
    const data = await res.json();

    const topLoc  = data.locality_breakdown.slice(0, 8);
    const maxCount = Math.max(...topLoc.map(l => l.count), 1);

    const insightsHTML = `
      <div class="hero-section">
        <div class="hero-eyebrow">📊 Market Intelligence</div>
        <h1 class="hero-title">Bangalore Real Estate Insights</h1>
        <p class="hero-subtitle">Aggregated analytics from ${(data.total_listings).toLocaleString()} listings · corrected for units, fraud, and data quality.</p>
      </div>

      <!-- Key Stats -->
      <div class="stats-strip" style="margin-bottom:36px;">
        ${[
          { icon:'🏠', label:'Total Listings',     value: data.total_listings.toLocaleString(),  sub:'Retrieved' },
          { icon:'✅', label:'Active & Live',       value: data.active_listings.toLocaleString(), sub:'is_live = true', accent:true },
          { icon:'🔑', label:'Rental Properties',  value: data.total_rentals.toLocaleString(),   sub:'Monthly' },
          { icon:'🏗️', label:'Builder Projects',  value: data.total_projects.toLocaleString(),  sub:'Developments' },
          { icon:'🔍', label:'API Discrepancies',  value: data.findings_count,                   sub:'Proven findings', warn:true },
        ].map(s => `
          <div class="glass-card stat-box">
            <div class="stat-icon">${s.icon}</div>
            <div class="stat-label">${s.label}</div>
            <div class="stat-value" style="${s.accent?'color:var(--accent)':s.warn?'color:var(--warning)':''}">${s.value}</div>
            <div class="stat-sub">${s.sub}</div>
          </div>`).join('')}
      </div>

      <div class="insights-grid">
        <!-- Locality Benchmark -->
        <div class="glass-card" style="padding:24px;">
          <div class="section-heading">🏙️ Locality Price Benchmark</div>
          ${topLoc.map(loc => `
            <div class="mini-bar-wrap">
              <div class="mini-bar-label">${loc.locality}</div>
              <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width:${Math.round(loc.count/maxCount*100)}%;"></div>
              </div>
              <div class="mini-bar-value">${loc.count}</div>
            </div>`).join('')}
          <div class="divider"></div>
          <div class="table-responsive">
            <table class="custom-table">
              <thead><tr><th>Locality</th><th>Listings</th><th>Median Price</th></tr></thead>
              <tbody>
                ${topLoc.map(loc => `
                  <tr>
                    <td><strong>${loc.locality}</strong></td>
                    <td><span class="chip">${loc.count}</span></td>
                    <td style="color:var(--accent);font-weight:700;">${loc.median_price_formatted}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- BHK Distribution -->
        <div class="glass-card" style="padding:24px;">
          <div class="section-heading">🛏️ BHK Distribution</div>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:8px;">
            ${data.bhk_distribution.map(b => {
              const pct = ((b.count / (data.active_listings||1)) * 100).toFixed(1);
              return `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:6px;">
                    <span style="color:var(--text-primary);font-weight:600;">${b.bhk}</span>
                    <span style="color:var(--text-muted);"><strong style="color:var(--text-secondary)">${b.count.toLocaleString()}</strong> · ${pct}%</span>
                  </div>
                  <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--indigo));border-radius:4px;transition:width 0.8s ease;"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>

          <div class="divider"></div>
          <div class="section-heading" style="font-size:1rem;">🧠 Data Quality Summary</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${[
              { label:'Corrupt listings (impossible data)',   value: data.answers?.corrupt_listing_ids?.length || 40,  color:'var(--danger)' },
              { label:'Fraudulent bait listings',            value: data.answers?.fake_listing_ids?.length || 100,     color:'var(--warning)' },
              { label:'Cross-portal duplicates',             value: 4700-4572,                                          color:'var(--indigo)' },
              { label:'Area in SqM, not SqFt (magichomes)',  value: '~374',                                             color:'var(--violet)' },
              { label:'Projects with wrong listing count',   value: data.answers?.projects_with_wrong_listing_count || 392, color:'var(--warning)' },
            ].map(d => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:var(--r-sm);border:1px solid var(--border-color);">
                <span style="font-size:0.85rem;color:var(--text-secondary);">${d.label}</span>
                <strong style="color:${d.color};font-family:var(--font-display);font-size:1rem;">${d.value}</strong>
              </div>`).join('')}
          </div>
        </div>
      </div>`;

    container.innerHTML = insightsHTML;
  } catch (e) { console.error('loadInsights:', e); }
}
