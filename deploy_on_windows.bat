@echo off
set FIREBASE_CLI_EXPERIMENTS=webframeworks

echo Taking pre-deploy snapshot (working tree + git history) into ..\evcrm-backups ...
sh scripts/snapshot.sh "pre-deploy"

if exist .env.local (
  echo Temporarily hiding .env.local to prevent production environment overrides...
  ren .env.local .env.local.tmp
)
npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive
if exist .env.local.tmp (
  echo Restoring .env.local...
  ren .env.local.tmp .env.local
)

echo Tagging this deploy in git history...
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set DEPLOYDATE=%%c-%%b-%%a
git tag -f "deploy-latest"
git tag "deploy-%DEPLOYDATE%-%random%" 2>nul
