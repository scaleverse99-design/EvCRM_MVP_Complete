/**
 * POST /api/pulse/submit
 * Internal API — Called by the ev-news-agent to submit processed articles.
 * Secured via INTERNAL_API_SECRET. Writes directly to Ops Manager.
 */

import { NextResponse } from 'next/server';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const OPSMANAGER_URL = process.env.OPSMANAGER_URL;
const OPSMANAGER_TOKEN = process.env.OPSMANAGER_TOKEN;

export async function POST(req) {
  try {
    // 1. Verify internal secret
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== INTERNAL_API_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json();
    const { aiResult, sourceName, dbId, type = 'news' } = body;

    if (!aiResult || !aiResult.headline) {
      return NextResponse.json({ success: false, error: 'Missing aiResult.headline' }, { status: 400 });
    }

    const postStatus = process.env.POST_STATUS || 'review'; // 'publish' or 'review'
    const sheet = postStatus === 'publish' ? 'pulse' : 'pending_reviews';

    // 3. Write to Ops Manager
    const articleRow = {
      id: dbId || `art_${Date.now()}`,
      title: aiResult.headline,
      subheadline: aiResult.subheadline,
      body_html: aiResult.body_html,
      meta_description: aiResult.meta_description,
      category: aiResult.category,
      tags: Array.isArray(aiResult.tags) ? aiResult.tags.join(',') : aiResult.tags,
      slug: aiResult.seo_slug,
      stakeholder_insight: aiResult.stakeholder_insight,
      reading_time: aiResult.reading_time,
      source_name: sourceName,
      type: type,
      is_ai_generated: true,
      state: type === 'blog' ? 'Blog' : 'Industry',
      featured_image_url: `https://placehold.co/800x400/0f172a/10b981?text=${encodeURIComponent(aiResult.category || 'EV News')}`,
      publishedAt: postStatus === 'publish' ? new Date().toISOString() : null,
      status: postStatus === 'publish' ? 'published' : 'pending'
    };

    try {
      const opsRes = await fetch(OPSMANAGER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: OPSMANAGER_TOKEN,
          actions: [{ type: 'WRITE_RECORD', appId: 'ev-crm', data: { sheet, row: articleRow } }]
        })
      });

      const opsBody = await opsRes.json();
      if (!opsBody.success) throw new Error(opsBody.error || 'Ops Manager write failed');
    } catch (opsErr) {
      console.warn('[Submission Fallback] Ops Manager unavailable. Saving to local mock storage.');
      // Simple local file fallback for local development visibility
      const fs = require('fs');
      const path = require('path');
      const mockPath = path.join(process.cwd(), 'data', 'mock_pulse.json');
      let mockData = [];
      try { mockData = JSON.parse(fs.readFileSync(mockPath, 'utf8')); } catch {}
      mockData.push(articleRow);
      if (!fs.existsSync(path.dirname(mockPath))) fs.mkdirSync(path.dirname(mockPath), { recursive: true });
      fs.writeFileSync(mockPath, JSON.stringify(mockData, null, 2));
    }

    return NextResponse.json({
      success: true,
      id: articleRow.id,
      sheet,
      headline: aiResult.headline
    });

  } catch (err) {
    console.error('[/api/pulse/submit] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
