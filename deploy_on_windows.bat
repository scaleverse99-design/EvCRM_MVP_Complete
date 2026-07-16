@echo off
set FIREBASE_CLI_EXPERIMENTS=webframeworks

echo Taking pre-deploy snapshot (working tree + git history) into ..\evcrm-backups ...
sh scripts/snapshot.sh "pre-deploy"

REM Local dev overrides live in .env.development.local, which production
REM builds ignore by design — no env-file renaming needed here anymore.
REM (The old .env.local hide/restore dance twice left local dev silently
REM pointed at production Supabase when a deploy was interrupted.)

REM "call" is required — npx is a .cmd batch wrapper, and without call the
REM batch transfers control and NEVER RETURNS, silently skipping every step
REM below (this is why deploy git-tags were never created and the Cloudflare
REM purge didn't fire on the first auto-purge deploy).
call npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive

echo Purging Cloudflare cache so the new deploy is visible immediately...
node scripts/purge-cloudflare.js

echo Tagging this deploy in git history...
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set DEPLOYDATE=%%c-%%b-%%a
git tag -f "deploy-latest"
git tag "deploy-%DEPLOYDATE%-%random%" 2>nul
