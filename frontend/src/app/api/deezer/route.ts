import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    const deezerUrl = `https://api.deezer.com/${path}`;
    const res = await fetch(deezerUrl, {
      headers: { 'Accept': 'application/json' },
      // No cache - preview URLs expire quickly
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Deezer API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    
    return NextResponse.json(data, {
      headers: {
        // Allow browser to cache for 2 minutes max
        'Cache-Control': 'public, max-age=120',
      },
    });
  } catch (error) {
    console.error('Deezer proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch from Deezer' }, { status: 500 });
  }
}
