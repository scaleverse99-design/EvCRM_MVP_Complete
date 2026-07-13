@echo off
set FIREBASE_CLI_EXPERIMENTS=webframeworks
if exist .env.local (
  echo Temporarily hiding .env.local to prevent production environment overrides...
  ren .env.local .env.local.tmp
)
npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive
if exist .env.local.tmp (
  echo Restoring .env.local...
  ren .env.local.tmp .env.local
)
