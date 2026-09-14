import { NextResponse } from 'next/server';
import { getCache, formatListing } from '@/lib/ivyClient';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const { listings } = await getCache();
    const match = listings.find(l => l.listing_id === id);
    if (!match) return NextResponse.json({ detail: 'Listing not found' }, { status: 404 });

    const formatted = formatListing(match);
    const price = match.price || 0;
    const min_p = price * 0.85;
    const max_p = price * 1.15;

    const similar = [];
    for (const l of listings) {
      if (l.listing_id === id || l.is_live !== true) continue;
      if (l.locality === match.locality && l.bedroom === match.bedroom) {
        const p = l.price || 0;
        if (p >= min_p && p <= max_p) {
          similar.push(formatListing(l));
          if (similar.length >= 6) break;
        }
      }
    }

    return NextResponse.json({ listing: formatted, similar });
  } catch (e) {
    console.error('/api/listings/[id] error:', e);
    return NextResponse.json({ detail: 'Failed to load listing' }, { status: 500 });
  }
}
