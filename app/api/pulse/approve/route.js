/**
 * POST /api/pulse/approve
 * Admin API — Approves a pending article and moves it to the published 'pulse' sheet.
 * Requires admin JWT token.
 */

import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';

const OPSMANAGER_URL = process.env.OPSMANAGER_URL;
const OPSMANAGER_TOKEN = process.env.OPSMANAGER_TOKEN;

export async function POST(req) {
  try {
    // 1. Verify admin JWT
    const authHeader = req.headers.get('authorization');
    const jwtToken = authHeader?.replace('Bearer ', '');
    const decoded = verifyToken(jwtToken);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    const { articleId } = await req.json();
    if (!articleId) {
      return NextResponse.json({ success: false, error: 'articleId required' }, { status: 400 });
    }

    // 3. Get from pending_reviews
    const getRes = await fetch(OPSMANAGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: OPSMANAGER_TOKEN,
        actions: [{ type: 'GET_RECORDS', appId: 'ev-crm', data: { sheet: 'pending_reviews', filter: { id: articleId } } }]
      })
    });
    const getBody = await getRes.json();
    const article = getBody.results?.[0]?.data?.[0];
    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found in pending_reviews' }, { status: 404 });
    }

    // 4. Write to pulse (published)
    const publishRes = await fetch(OPSMANAGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: OPSMANAGER_TOKEN,
        actions: [{ type: 'WRITE_RECORD', appId: 'ev-crm', data: {
          sheet: 'pulse',
          row: { ...article, publishedAt: new Date().toISOString(), status: 'published' }
        }}]
      })
    });
    const publishBody = await publishRes.json();
    if (!publishBody.success) throw new Error(publishBody.error);

    // 5. Remove from pending_reviews
    await fetch(OPSMANAGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: OPSMANAGER_TOKEN,
        actions: [{ type: 'UPDATE_RECORD', appId: 'ev-crm', data: { sheet: 'pending_reviews', id: articleId, updates: { status: 'approved' } } }]
      })
    });

    return NextResponse.json({ success: true, message: 'Article published to live site.', id: articleId });

  } catch (err) {
    console.error('[/api/pulse/approve] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
