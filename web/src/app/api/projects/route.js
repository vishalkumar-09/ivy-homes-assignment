import { NextResponse } from 'next/server';
import { getCache } from '@/lib/ivyClient';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locality       = searchParams.get('locality')       || '';
  const project_status = searchParams.get('project_status') || '';
  const sort_by        = searchParams.get('sort_by')        || 'price_max';
  const order          = searchParams.get('order')          || 'desc';
  const offset         = parseInt(searchParams.get('offset') || '0');
  const limit          = parseInt(searchParams.get('limit')  || '12');

  try {
    const { listings, projects } = await getCache();

    // Cross-reference actual listing counts per project
    const actualCounts = {};
    for (const l of listings) {
      if (l.project_id) actualCounts[l.project_id] = (actualCounts[l.project_id] || 0) + 1;
    }

    // Format projects: convert price from Crores to INR, add actual listing count
    const formatted = projects.map(p => {
      const pMinCr = p.price_min || 0;
      const pMaxCr = p.price_max || 0;
      return {
        ...p,
        price_min_inr:         Math.round(pMinCr * 10000000),
        price_max_inr:         Math.round(pMaxCr * 10000000),
        price_range_formatted: `₹${pMinCr.toFixed(2)} Cr – ₹${pMaxCr.toFixed(2)} Cr`,
        actual_total_listings: actualCounts[p.project_id] || 0,
      };
    });

    // Filter
    let filtered = formatted.filter(p => {
      if (locality       && p.locality?.toLowerCase()       !== locality.toLowerCase())       return false;
      if (project_status && p.project_status?.toLowerCase() !== project_status.toLowerCase()) return false;
      return true;
    });

    // Sort
    const reverse = order.toLowerCase() === 'desc';
    const sortKey = {
      price_max:   p => p.price_max || 0,
      price_min:   p => p.price_min || 0,
      total_units: p => p.total_units || 0,
      launch_date: p => p.launch_date || '',
    }[sort_by] || (p => p.price_max || 0);

    filtered.sort((a, b) => {
      const va = sortKey(a), vb = sortKey(b);
      return reverse ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
    });

    const total   = filtered.length;
    const results = filtered.slice(offset, offset + limit);
    return NextResponse.json({ total, offset, limit, count: results.length, has_more: (offset + limit) < total, results });
  } catch (e) {
    return NextResponse.json({ detail: 'Failed to load projects' }, { status: 500 });
  }
}
