@echo off
set FIREBASE_CLI_EXPERIMENTS=webframeworks

echo Taking pre-deploy snapshot (working tree + git history) into ..\evcrm-backups ...
sh scripts/snapshot.sh "pre-deploy"

REM Local dev overrides live in .env.development.local, which production
REM builds ignore by design — no env-file renaming needed here anymore.
REM (The old .env.local hide/restore dance twice left local dev silently
REM pointed at production Supabase when a deploy was interrupted.)

npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive

echo Tagging this deploy in git history...
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set DEPLOYDATE=%%c-%%b-%%a
git tag -f "deploy-latest"
git tag "deploy-%DEPLOYDATE%-%random%" 2>nul
