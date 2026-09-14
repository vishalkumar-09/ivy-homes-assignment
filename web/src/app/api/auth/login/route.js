import { NextResponse } from 'next/server';
import { ivyPost } from '@/lib/ivyClient';

export async function POST(request) {
  try {
    const body = await request.json();
    const res  = await ivyPost('/auth/login', body);
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ detail: 'Login request failed' }, { status: 500 });
  }
}
