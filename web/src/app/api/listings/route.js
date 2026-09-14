import { NextResponse } from 'next/server';
import { getCache, formatListing, CORRUPT_IDS } from '@/lib/ivyClient';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locality      = searchParams.get('locality')      || '';
  const bhk           = searchParams.get('bhk')           ? parseInt(searchParams.get('bhk')) : null;
  const property_type = searchParams.get('property_type') || '';
  const furnishing    = searchParams.get('furnishing')    || '';
  const min_price     = searchParams.get('min_price')     ? parseFloat(searchParams.get('min_price')) : null;
  const max_price     = searchParams.get('max_price')     ? parseFloat(searchParams.get('max_price')) : null;
  const sort_by       = searchParams.get('sort_by')       || 'posted_at';
  const order         = searchParams.get('order')         || 'desc';
  const offset        = parseInt(searchParams.get('offset') || '0');
  const limit         = parseInt(searchParams.get('limit')  || '12');

  try {
    const { listings } = await getCache();
    let filtered = [];

    for (const l of listings) {
      if (CORRUPT_IDS.has(l.listing_id))                                       continue;
      if (l.is_live !== true)                                                   continue;
      if (locality      && l.locality?.toLowerCase()      !== locality.toLowerCase())      continue;
      if (bhk !== null  && l.bedroom                      !== bhk)             continue;
      if (property_type && l.property_type?.toLowerCase() !== property_type.toLowerCase()) continue;
      if (furnishing    && l.furnishing?.toLowerCase()    !== furnishing.toLowerCase())    continue;
      if (min_price !== null && (l.price || 0) < min_price)                    continue;
      if (max_price !== null && (l.price || 0) > max_price)                    continue;
      filtered.push(l);
    }

    // Sort accurately (remote API ignores order=desc)
    const reverse = order.toLowerCase() === 'desc';
    const sortKey = {
      price:       l => l.price || 0,
      carpet_area: l => l.carpet_area || 0,
      bedroom:     l => l.bedroom || 0,
      posted_at:   l => l.posted_at || '',
    }[sort_by] || (l => l.posted_at || '');

    filtered.sort((a, b) => {
      const va = sortKey(a), vb = sortKey(b);
      return reverse ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
    });

    const total   = filtered.length;
    const results = filtered.slice(offset, offset + limit).map(formatListing);

    return NextResponse.json({ total, offset, limit, count: results.length, has_more: (offset + limit) < total, results });
  } catch (e) {
    console.error('/api/listings error:', e);
    return NextResponse.json({ detail: 'Failed to load listings' }, { status: 500 });
  }
}
