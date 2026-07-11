# EV.CRM — Server, Hosting, and Database Stack

## 🌐 Where evcrm.in Is Running

### Hosting Architecture
```
Domain: evcrm.in
  └── Cloudflare (DNS + CDN proxy)  ← IPs: 104.21.18.170 / 172.67.182.197
       └── Firebase Hosting          ← Project: ev-crm-realtime
            └── Cloud Run (us-central1)  ← Next.js app backend (API routes)
                 └── Docker container (Dockerfile in project)
```

| Layer | Service | Detail |
|---|---|---|
| **DNS** | Cloudflare | DNS and SSL proxy management |
| **CDN/Proxy** | Cloudflare | Caches static assets |
| **Web Hosting** | **Firebase Hosting** | Connected to Firebase project: `ev-crm-realtime` |
| **API Backend** | **Google Cloud Run** | Deployed in `us-central1` with 512MiB memory allocation |
| **Container** | Docker / Node.js 18 | Exposed on port `8080` executing `node server.js` |
| **Deployment Tool** | Firebase CLI | Deployed via `npx firebase-tools deploy` (using Next.js web frameworks integration) |

---

### 🗄️ Database & Storage Layer

* **SovereignDB Layer (`lib/store.js`)**: 
  * Operates on a dual-mode schema.
  * **Development / Fallback**: Reads and writes to local flat files under the `/data` folder (like `leads.json`, `inventory.json`, `bookings.json`).
  * **Production**: Reads and writes to **Supabase** (PostgreSQL database with JSONB schema) when the environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.

---

### 🚀 Production Deployment Commands
To deploy updates to the live site:
```bat
set FIREBASE_CLI_EXPERIMENTS=webframeworks
npx firebase-tools deploy --only hosting --project ev-crm-realtime --non-interactive
```
*(Alternatively, you can execute the `deploy_on_windows.bat` script located in the project root.)*
