// ═══════════════════════════════════════════════════════
//  Ivy Homes — 10 Analytical Questions View Module
// ═══════════════════════════════════════════════════════

async function loadAnswersView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div class="hero-section"><h1 class="hero-title">10 Assignment Questions</h1></div><div style="text-align:center;padding:40px;color:var(--text-muted);">Loading…</div>`;

  try {
    const res = await apiFetch('/api/submission');
    if (!res || !res.ok) return;
    const sub = await res.json();
    const a   = sub.answers;

    const QA = [
      { q:'Total Listing Records',          key:'total_listing_records', val: a.total_listing_records.toLocaleString(),       color:'var(--accent)',  derivation:'Exhaustive offset pagination (94 pages × 50) through /v1/listings until has_more = false.' },
      { q:'Unique Physical Properties',     key:'unique_properties',     val: a.unique_properties.toLocaleString(),           color:'var(--accent)',  derivation:'Clustered 4,700 records on composite key: apartment + floor + bedrooms + bathrooms + facing + normalized carpet area.' },
      { q:'Active Live Listings',           key:'active_listings',       val: a.active_listings.toLocaleString(),             color:'var(--accent)',  derivation:'Count of records with is_live == true. API returns 978 inactive records without filtering.' },
      { q:'Corrupt Listing IDs',            key:'corrupt_listing_ids',   val: `${a.corrupt_listing_ids.length} listings`,     color:'var(--danger)',  derivation:'Domain constraint checks: negative prices, floor > total_floors, carpet > super_built_up, swapped GPS coords outside Bangalore.' },
      { q:'Total Monthly Rent (Yelahanka)', key:'total_monthly_rent',    val: `₹${a.total_monthly_rent.toLocaleString('en-IN')}`, color:'var(--accent)', derivation:'Sum of price across all 162 rentals in assigned locality Yelahanka from /v1/rentals.' },
      { q:'Avg Price/SqFt — 2BHK Active',   key:'avg_price_per_sqft_2bhk', val:`₹${a.avg_price_per_sqft_2bhk.toLocaleString()} / sqft`, color:'var(--indigo)', derivation:'Mean of price÷carpet_area (sqft) for is_live=true, bedroom=2, excluding Q4 corrupt + Q9 fake, converting magichomes SqM areas × 10.7639.' },
      { q:'Costliest Project',              key:'costliest_project',     val: `${a.costliest_project.project_id} · ₹${(a.costliest_project.price_max_inr/10000000).toFixed(2)} Cr`, color:'var(--violet)', derivation:'Project P10068 (Puravankara Sanctuary) has price_max 99.8 in Crores = ₹99,80,00,000 INR.' },
      { q:'Listings in Last 7 Days',        key:'listings_last_7_days',  val: a.listings_last_7_days,                         color:'var(--accent)',  derivation:'Count posted_at ∈ [2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30). Lexicographic sort corrected via dateutil.' },
      { q:'Fake Bait Listing IDs',          key:'fake_listing_ids',      val: `${a.fake_listing_ids.length} listings`,        color:'var(--danger)',  derivation:'8 sale listings with price < ₹1,00,000 (rental bait) + 92 listings with advance fee/token amount scam text in description.' },
      { q:'Projects with Wrong Count',      key:'projects_with_wrong_listing_count', val:`${a.projects_with_wrong_listing_count} / 520`, color:'var(--warning)', derivation:'Cross-referenced project.total_listings vs actual count of listings per project_id in /v1/listings.' },
    ];

    container.innerHTML = `
      <div class="hero-section">
        <div class="hero-eyebrow">📝 Assignment Solutions</div>
        <h1 class="hero-title">10 Analytical Questions</h1>
        <p class="hero-subtitle">All answers anchored to <code style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;font-size:0.9em;">REFERENCE = 2026-09-10T00:00:00+05:30</code></p>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        ${QA.map((item, i) => `
          <div class="glass-card answer-card fade-in">
            <div class="answer-num">${i+1}</div>
            <div style="flex:1;">
              <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px;">${item.q}</div>
              <div class="answer-value" style="color:${item.color};">${item.val}</div>
              <p style="font-size:0.83rem;color:var(--text-secondary);margin-top:6px;line-height:1.6;">${item.derivation}</p>
            </div>
          </div>`).join('')}
      </div>

      <div class="glass-card" style="margin-top:28px;padding:24px;text-align:center;">
        <div style="font-family:var(--font-display);font-size:1.15rem;font-weight:700;margin-bottom:8px;">Submitted by</div>
        <div style="color:var(--accent);font-size:1.3rem;font-weight:800;">${sub.candidate.name}</div>
        <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:4px;">${sub.candidate.email}</div>
        <div style="margin-top:14px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
          <a href="${sub.candidate.repo_url}" target="_blank" class="btn btn-secondary btn-sm">📁 GitHub Repo</a>
          <a href="${sub.candidate.demo_url}" target="_blank" class="btn btn-primary btn-sm">🌐 Live Demo</a>
        </div>
      </div>`;
  } catch (e) { console.error('loadAnswers:', e); }
}
