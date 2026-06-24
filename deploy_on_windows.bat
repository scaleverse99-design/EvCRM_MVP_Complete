@echo off
set FIREBASE_CLI_EXPERIMENTS=webframeworks
npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive
