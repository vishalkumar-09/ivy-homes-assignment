import { NextResponse } from 'next/server';
import { ivyDelete } from '@/lib/ivyClient';

function getToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function DELETE(request, { params }) {
  const { id }  = await params;
  const token   = getToken(request);
  if (!token) return NextResponse.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const res  = await ivyDelete(`/v1/saved/${id}`, token);
    if (res.status === 204) return NextResponse.json({ ok: true });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ detail: 'Failed to delete saved listing' }, { status: 500 });
  }
}
