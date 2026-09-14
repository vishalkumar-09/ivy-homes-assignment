import { NextResponse } from 'next/server';
import { ivyGet, ivyPost } from '@/lib/ivyClient';

function getToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(request) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const res  = await ivyGet('/v1/saved', token);
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ detail: 'Failed to fetch saved listings' }, { status: 500 });
  }
}

export async function POST(request) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const body = await request.json();
    const res  = await ivyPost('/v1/saved', body, token);
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ detail: 'Failed to save listing' }, { status: 500 });
  }
}
