import { NextResponse } from 'next/server';
import { getCache } from '@/lib/ivyClient';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locality  = searchParams.get('locality')  || '';
  const bhk       = searchParams.get('bhk')       ? parseInt(searchParams.get('bhk')) : null;
  const furnishing = searchParams.get('furnishing') || '';
  const sort_by   = searchParams.get('sort_by')   || 'price';
  const order     = searchParams.get('order')     || 'asc';
  const offset    = parseInt(searchParams.get('offset') || '0');
  const limit     = parseInt(searchParams.get('limit')  || '12');

  try {
    const { rentals } = await getCache();
    let filtered = [];

    for (const r of rentals) {
      if (locality  && r.locality?.toLowerCase()  !== locality.toLowerCase())  continue;
      if (bhk !== null && r.bedroom               !== bhk)                     continue;
      if (furnishing && r.furnishing?.toLowerCase() !== furnishing.toLowerCase()) continue;
      filtered.push(r);
    }

    const reverse = order.toLowerCase() === 'desc';
    const sortKey = {
      price:       r => r.price || 0,
      carpet_area: r => r.carpet_area || 0,
      posted_at:   r => r.posted_at || '',
    }[sort_by] || (r => r.price || 0);

    filtered.sort((a, b) => {
      const va = sortKey(a), vb = sortKey(b);
      return reverse ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
    });

    const total   = filtered.length;
    const results = filtered.slice(offset, offset + limit);
    return NextResponse.json({ total, offset, limit, count: results.length, has_more: (offset + limit) < total, results });
  } catch (e) {
    return NextResponse.json({ detail: 'Failed to load rentals' }, { status: 500 });
  }
}
