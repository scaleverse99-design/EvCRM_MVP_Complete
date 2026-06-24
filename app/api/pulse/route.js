/**
 * GET /api/pulse
 * Public API — Fetches published EV news articles from the Ops Manager Sovereign Rack.
 * Used by the /news page on evcrm.in.
 */

import { NextResponse } from 'next/server';

const OPSMANAGER_URL = process.env.OPSMANAGER_URL;
const OPSMANAGER_TOKEN = process.env.OPSMANAGER_TOKEN;

// In-memory cache — refreshes every 10 minutes
let cache = { data: null, ts: 0 };
const CACHE_TTL = 10 * 60 * 1000;

async function fetchFromOpsManager() {
  if (!OPSMANAGER_URL || !OPSMANAGER_TOKEN) {
    throw new Error('OPSMANAGER_URL or TOKEN not set in .env');
  }

  const res = await fetch(OPSMANAGER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: OPSMANAGER_TOKEN,
      actions: [{ type: 'GET_RECORDS', appId: 'ev-crm', data: { sheet: 'pulse' } }]
    }),
    next: { revalidate: 600 }
  });

  if (!res.ok) throw new Error(`Ops Manager responded with ${res.status}`);
  
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Ops Manager returned failure');
  
  // Normalize the response — Ops Manager returns results array
  const raw = body.results?.[0]?.data || body.data || [];
  return Array.isArray(raw) ? raw : [];
}

export async function GET() {
  try {
    const now = Date.now();

    // Serve from cache if fresh
    if (cache.data && (now - cache.ts) < CACHE_TTL) {
      return NextResponse.json({ success: true, news: cache.data, source: 'cache' });
    }

    const articles = await fetchFromOpsManager();

    // Sort by publishedAt descending, filter published
    const sorted = articles
      .filter(a => a.publishedAt && !a.is_archived)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Update cache
    cache = { data: sorted, ts: now };

    return NextResponse.json({ success: true, news: sorted, source: 'live' });

  } catch (err) {
    console.error('[/api/pulse] Error:', err.message);

    // Try reading from local pulse storage (updated by News Agent)
    try {
      const fs = require('fs');
      const path = require('path');
      const pulsePath = path.join(process.cwd(), 'data', 'pulse.json');
      if (fs.existsSync(pulsePath)) {
        const pulseData = JSON.parse(fs.readFileSync(pulsePath, 'utf8'));
        return NextResponse.json({ success: true, news: pulseData, source: 'local-pulse' });
      }
      
      const mockPath = path.join(process.cwd(), 'data', 'mock_pulse.json');
      if (fs.existsSync(mockPath)) {
        const mockData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
        return NextResponse.json({ success: true, news: mockData, source: 'local-mock' });
      }
    } catch {}

    // Return cached data on error if available
    if (cache.data) {
      return NextResponse.json({ success: true, news: cache.data, source: 'cache-fallback' });
    }

    return NextResponse.json({ success: false, error: err.message, news: [] }, { status: 500 });
  }
}
