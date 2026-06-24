/**
 * SOVEREIGN BUSINESS TEMPLATES
 * Ready-to-use website code for automated provisioning.
 */

import fs from 'fs';
import path from 'path';

const baseTemplate = (title) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-black text-white min-h-screen flex items-center justify-center p-6">
    <div class="max-w-xl w-full bg-zinc-900 border border-zinc-800 p-12 rounded-[2rem] text-center shadow-2xl">
        <div class="text-6xl mb-8">🚀</div>
        <h1 class="text-4xl font-extrabold mb-4">${title}</h1>
        <p class="text-zinc-400 text-lg mb-8 leading-relaxed">
            Your sovereign storefront is live and running on <strong>Ops Manager V6.0</strong>. 
            All your data is stored securely in your own Google Drive.
        </p>
        <div class="space-y-4">
            <div class="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                <p class="text-xs text-zinc-500 uppercase tracking-widest font-black mb-1">Status</p>
                <p class="text-emerald-400 font-bold">🟢 Connected to Drive</p>
            </div>
            <div class="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                <p class="text-xs text-zinc-500 uppercase tracking-widest font-black mb-1">Powered By</p>
                <p class="text-white font-bold">Sovereign SaaS Engine</p>
            </div>
        </div>
        <div class="mt-12 pt-12 border-t border-zinc-800 text-zinc-600 text-sm">
            Edit your data in Google Drive to see changes instantly.
        </div>
    </div>
</body>
</html>
`;

// Load premium storefront templates
function loadPremiumTemplate(filename, fallbackTitle) {
  try {
    // Look in ops-manager-cloudrun directory
    const filePath = path.join(process.cwd(), 'ops-manager-cloudrun', filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    console.warn(`[Templates] Failed to load premium template ${filename}:`, err.message);
  }
  return baseTemplate(fallbackTitle);
}

export const templates = {
  'used-car-dealer': loadPremiumTemplate('cars.html', 'AutoPro Dealer'),
  'ev-dealer': loadPremiumTemplate('cars.html', 'EV Master Hub'),
  'agency': loadPremiumTemplate('socialcom_index.html', 'Sovereign Agency'),
  'restaurant': baseTemplate('Gourmet Express'),
  'retail-shop': baseTemplate('Premium Retail')
};
