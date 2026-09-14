// ═══════════════════════════════════════════════════════
//  Ivy Homes — Constants & Helpers
// ═══════════════════════════════════════════════════════

export const PROPERTY_THEMES = {
  apartment:           { icon: '🏢', gradient: 'linear-gradient(135deg, #0f2027 0%, #1a3a4a 60%, #0d2635 100%)' },
  villa:               { icon: '🏡', gradient: 'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 60%, #1a2a1a 100%)' },
  'independent house': { icon: '🏠', gradient: 'linear-gradient(135deg, #1c1a0f 0%, #3a2f0f 60%, #1c1a0f 100%)' },
  'builder floor':     { icon: '🏗️', gradient: 'linear-gradient(135deg, #0f1a2a 0%, #1a2a4a 60%, #0f1a2a 100%)' },
  plot:                { icon: '🌳', gradient: 'linear-gradient(135deg, #0a1f0a 0%, #152d15 60%, #0a1f0a 100%)' },
};

export const LOCALITY_COLORS = {
  whitefield: '#22d3a5', koramangala: '#818cf8', indiranagar: '#f59e0b',
  'hsr layout': '#34d399', bellandur: '#60a5fa', 'electronic city': '#a78bfa',
  'jp nagar': '#f87171', hebbal: '#fb923c', yelahanka: '#2dd4bf',
  'sarjapur road': '#e879f9',
};

export const PROJ_GRADIENTS = [
  'linear-gradient(135deg,#0f1a2a,#1a2a4a)',
  'linear-gradient(135deg,#1a0f2a,#2a1a4a)',
  'linear-gradient(135deg,#0f2a1a,#1a4a2a)',
  'linear-gradient(135deg,#2a1a0f,#4a2a1a)',
];

export const CATEGORY_STYLE = {
  auth:                  { color: 'var(--indigo)',  icon: '🔐', cls: 'info' },
  pagination:            { color: 'var(--info)',    icon: '📄', cls: 'info' },
  units:                 { color: 'var(--warning)', icon: '📐', cls: 'warning' },
  filters:               { color: 'var(--info)',    icon: '🔎', cls: 'info' },
  sorting:               { color: 'var(--warning)', icon: '↕️', cls: 'warning' },
  timestamps:            { color: 'var(--indigo)',  icon: '🕐', cls: 'info' },
  duplicates:            { color: 'var(--violet)',  icon: '👥', cls: 'purple' },
  completeness:          { color: 'var(--info)',    icon: '📋', cls: 'info' },
  data_quality:          { color: 'var(--danger)',  icon: '💔', cls: 'danger' },
  fraud:                 { color: 'var(--danger)',  icon: '🚨', cls: 'danger' },
  consistency:           { color: 'var(--warning)', icon: '⚖️', cls: 'warning' },
  missing_endpoint:      { color: 'var(--warning)', icon: '🔌', cls: 'warning' },
  undocumented_endpoint: { color: 'var(--accent)',  icon: '✨', cls: '' },
};

export const LOCALITIES = [
  { value: '',               label: 'All Localities' },
  { value: 'whitefield',     label: 'Whitefield' },
  { value: 'koramangala',    label: 'Koramangala' },
  { value: 'indiranagar',    label: 'Indiranagar' },
  { value: 'hsr layout',     label: 'HSR Layout' },
  { value: 'bellandur',      label: 'Bellandur' },
  { value: 'electronic city', label: 'Electronic City' },
  { value: 'jp nagar',       label: 'JP Nagar' },
  { value: 'hebbal',         label: 'Hebbal' },
  { value: 'yelahanka',      label: 'Yelahanka' },
  { value: 'sarjapur road',  label: 'Sarjapur Road' },
];

export function fmtINR(n) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatListingClient(l) {
  if (!l) return {};
  const c   = l.carpet_area || 0;
  const pt  = (l.property_type || '').toLowerCase();
  let is_sqm = l.is_unit_sqm || false;
  let c_sqft = l.carpet_area_sqft || c;
  if (pt !== 'plot' && l.website === 'magichomes' && c < 300) {
    is_sqm = true;
    c_sqft = Math.round(c * 10.7639104 * 10) / 10;
  }
  const price = l.price || 0;
  const ppsq  = l.price_per_sqft || ((c_sqft && price > 0) ? Math.round(price / c_sqft) : 0);
  return {
    ...l,
    carpet_area_sqft: c_sqft,
    is_unit_sqm: is_sqm,
    price_per_sqft: ppsq,
    price_formatted: l.price_formatted || `₹${price.toLocaleString('en-IN')}`,
  };
}
