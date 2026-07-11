# EvCRM Deployment & Production Setup

## The Problem: Why This Matters

**The live evcrm.in currently has NO persistent database.** All data (leads, quotes, bookings, service requests, contact logs) is written to `/data/*.json` inside the Cloud Run container, which is **wiped on every restart** — redeploy, auto-scale, or infra maintenance.

This is fine for local development. **It is a data-loss disaster in production.**

The fix is one configuration task: point Cloud Run at a Supabase database. After that, all data persists.

---

## Phase 1: Local Development (What You Do Now)

### Your Setup

```
Local machine (Windows)
  ↓
Next.js dev server (npm run dev)
  ↓
/data/*.json files (local fallback, auto-sync on write)
```

- **Work locally**. Build & test all features using the JSON fallback.
- **No Supabase needed yet.** Just `npm install` and `npm run dev`.
- **Data persists across dev restarts** because the `/data` folder stays on disk.

**Deploy to production only after features are tested locally.**

---

## Phase 2: Production Setup (Before First Real User)

### Step 1: Create a Free Supabase Project

1. Go to **https://supabase.com** → Sign up (or log in)
2. Click **New project**
   - **Name**: `evcrm-prod` (or any name)
   - **Database password**: save this somewhere (you won't need it again)
   - **Region**: closest to your dealers (e.g., `ap-south-1` for India)
3. Wait ~1 minute for the project to spin up
4. Open your new project → **SQL Editor** (left sidebar)
5. Create a new query and paste the entire contents of [`scripts/supabase-schema.sql`](scripts/supabase-schema.sql)
6. Click **Run** — this creates all your tables in one go

### Step 2: Get Your Supabase API Credentials

1. In your Supabase project, go to **Settings** → **API** (left sidebar)
2. Copy these two values:
   - **Project URL** (starts with `https://...supabase.co`) → this is `SUPABASE_URL`
   - **Service role key** (starts with `eyJhbG...` or `sb_...`) → this is `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ **Never share the service role key.** It's like your database password.

### Step 3: Set Environment Variables on Cloud Run

You need to tell the live service about Supabase. This is done in the Google Cloud Console:

1. Go to **https://console.cloud.google.com**
2. Search for **Cloud Run** (or navigate via menu: APIs & Services)
3. Find the service `ev-crm-realtime` → click to open it
4. Click **Edit & Deploy New Revision** (top right button)
5. Scroll down to **Runtime settings** (expand if needed)
6. Click **Add Variable** twice and add:
   - Name: `SUPABASE_URL` → Value: (paste your Project URL from Step 2)
   - Name: `SUPABASE_SERVICE_ROLE_KEY` → Value: (paste your Service role key from Step 2)
7. Click **Deploy** (bottom right) — this takes ~30 seconds

**Verify it worked:**
- Go to **Cloud Run** service logs → check for the green deployment ✓
- If you see `Connected to Supabase` or similar in logs, you're good
- If you see `CRITICAL: Production requires Supabase`, the env vars didn't take — redo Step 3

### Step 4: Seed Your Data (One-Time)

Now migrate all your local data into Supabase:

```bash
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=sb_your_long_key_here
node scripts/seed-supabase.js
```

This reads every `/data/*.json` file and imports it into Supabase. Run it once, then you're done.

**Example output:**
```
✓ users: seeded 3 rows
✓ leads: seeded 45 rows
✓ bookings: seeded 12 rows
…
✓ Seeded 342 total rows across 9 tables
```

---

## Phase 3: The Safe Development → Production Workflow

### Working on Features (Loop Locally)

1. Make changes on your machine
2. Test locally (`npm run dev`)
3. Commit to git when happy

### Before Deploying to Production

**Checklist:**

- [ ] All features work locally (tested in browser at `http://localhost:3000`)
- [ ] No hardcoded passwords/secrets in code (use `.env.local`)
- [ ] Supabase credentials are set on Cloud Run (verify in Step 3 above)
- [ ] You've run the seed script once (Step 4)

### Deploy to evcrm.in

```bash
cd C:\Users\balaj\Downloads\EvCRM_MVP_Complete\evcrm-mvp
set FIREBASE_CLI_EXPERIMENTS=webframeworks
npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive
```

Or use the one-liner batch file:

```bash
deploy_on_windows.bat
```

This takes ~2–3 minutes. When done, visit **https://evcrm.in** and test.

---

## Troubleshooting

### "Data disappeared after I deployed"

**Cause**: Supabase env vars not set on Cloud Run (Step 3 skipped).
**Fix**: Follow Step 3 exactly. Redeploy after setting the vars.

### "I get an error connecting to Supabase"

**Cause**: Wrong `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`.
**Fix**:
1. Go back to Supabase → Settings → API
2. Copy the values again (carefully)
3. Re-enter them on Cloud Run (Step 3)
4. Redeploy

### "seed-supabase.js says 'Parse error'"

**Cause**: A JSON file in `/data` is malformed.
**Fix**:
1. Open the file (e.g., `data/leads.json`)
2. Validate it's valid JSON (paste into **https://jsonlint.com** if unsure)
3. Fix the syntax, then re-run the seed script

---

## FAQ

**Q: Can I test Supabase locally before pushing to production?**

A: Yes. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your local `.env.local`, then run `npm run dev`. The app will use Supabase instead of JSON files. Good for checking the migration works.

**Q: What if I mess up the seed?**

A: Go to Supabase → delete all rows in each table (or delete the project and make a new one) → re-run the seed. No harm done.

**Q: How much does Supabase cost?**

A: Free tier covers Phase 1 easily: 500 MB database, 1 GB file storage, 50k reads/day. Upgrade to Pro ($25/mo) if you hit those limits.

**Q: Can I use a different database (Firebase, AWS, etc.)?**

A: Not without rewriting `lib/store.js`. The current code is built for Supabase. Stick with it for Phase 1.

---

## What's Next

Once Supabase is live and seeded:

- **All data written by dealers is now durable.** Restart, redeploy, scale — nothing is lost.
- **Work locally, deploy often.** The workflow is: feature → test locally → commit → deploy → test live.
- **Monitor live data** via the Supabase dashboard (browse tables, run queries, check logs).

**Before 100 dealers**: prioritize the row-level store rewrite (replace whole-table writes with upsert/delete per row) to handle concurrent writes. Current design works for ~20 dealers; beyond that it silently loses edits.
