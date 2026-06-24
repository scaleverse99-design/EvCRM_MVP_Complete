# Ops Manager — Complete Architecture Document
### Version 6.0 | Sovereign Cloud OS
> **For:** Fresh developers onboarding to the Ops Manager platform
> **Purpose:** Understand every layer, build client websites confidently
> **Reading time:** ~25 minutes

---

## Table of Contents
1. [What is Ops Manager?](#1-what-is-ops-manager)
2. [The Big Picture — How It All Works](#2-the-big-picture)
3. [Layer 1 — The Middle Layer (Your Engine)](#3-layer-1--the-middle-layer)
4. [Layer 2 — Drive JSON (Your Database)](#4-layer-2--drive-json-your-database)
5. [Layer 3 — The Write Queue & Batch Sync](#5-layer-3--write-queue--batch-sync)
6. [Layer 4 — Apps Script (Night Watchman)](#6-layer-4--apps-script-night-watchman)
7. [Layer 5 — Auth & Security](#7-layer-5--auth--security)
8. [Layer 6 — Email & Notifications](#8-layer-6--email--notifications)
9. [The Provisioning Engine (One-Click Deploy)](#9-the-provisioning-engine)
10. [Deployment Modes](#10-deployment-modes)
11. [Per-Client Isolation Model](#11-per-client-isolation-model)
12. [Speed & Performance](#12-speed--performance)
13. [Quota & Limits Reference](#13-quota--limits-reference)
14. [Building Your First Client Website](#14-building-your-first-client-website)
15. [File & Folder Structure](#15-file--folder-structure)
16. [Data Schema Reference](#16-data-schema-reference)
17. [Common Patterns & Code Snippets](#17-common-patterns--code-snippets)
18. [What NOT to Do](#18-what-not-to-do)
19. [Business Model Context](#19-business-model-context)
20. [Glossary](#20-glossary)

---

## 1. What is Ops Manager?

Ops Manager is a **Sovereign Cloud OS** — a complete business platform (website + app + CRM) that runs entirely on a client's own Google Account. Every business gets their own isolated backend. No shared servers. No monthly AWS bill. No data lock-in.

### The one-line explanation
> "We give small businesses a premium website, mobile app, and CRM — hosted on their own Google Account — for less than the cost of a Swiggy order per day."

### Why this is different from normal SaaS
| Normal SaaS | Ops Manager |
|---|---|
| Your data lives on vendor's server | Your data lives in YOUR Google Drive |
| Vendor goes bankrupt → you lose data | You always own your data |
| Cost grows as you grow | Cost stays near ₹0 |
| Complex server management | Zero maintenance |
| Shared infrastructure | Fully isolated per client |

### What a client gets
- A live website on their own domain
- A mobile-ready web app
- A CRM to manage leads and orders
- All data in their own Google Drive
- Email notifications from their own Gmail

---

## 2. The Big Picture

Here is the complete flow from a customer action to data being stored:

```
CUSTOMER / BUSINESS USER
         |
         | (any action: view product, place order, update status)
         ▼
   MIDDLE LAYER  ◄──── This is your main engine
         |
    ┌────┴────┐
    │         │
    ▼         ▼
READ PATH   WRITE PATH
    │         │
    ▼         │
Drive JSON    ▼
(instant   Write Queue
 serve)    (Drive JSON)
               │
               │ (every few hours)
               ▼
          Batch Sync
               │
               ▼
         Apps Script
         (integrity +
          analytics)
```

### The golden rule
> **Real-time experience comes from the cache. Accuracy comes from the batch sync. Apps Script almost never runs during live user interactions.**

This is why your system can handle hundreds of users without hitting Google's quota limits. A customer browsing products or placing an order never triggers Apps Script. It only fires in the background, on a schedule, to keep data clean and accurate.

---

## 3. Layer 1 — The Middle Layer

**What it is:** A JavaScript module (running in the browser or a thin server) that sits between the user interface and Drive storage. It is the brain of the entire system.

**What it does:**
- Receives every action from the UI
- Reads from the Drive JSON cache instantly
- Writes to the pending queue
- Returns an immediate response to the user
- Never makes the user wait for a server

### How to think about it
Think of the Middle Layer like a **smart cashier at a supermarket**. When you buy something:
1. The cashier shows you the price immediately (reads from cache)
2. Marks the item as sold (writes to queue)
3. Gives you a receipt (instant UI response)
4. The inventory system updates in the background later (batch sync)

You don't stand at the counter waiting for the warehouse database to update. The experience is instant.

### Middle Layer responsibilities
```javascript
// Every action in the system flows through these 4 steps

async function handleAction(action) {
  // Step 1: Read current state from cache (instant)
  const currentState = await readFromDriveCache(action.resourceId);

  // Step 2: Apply the action to in-memory state
  const newState = applyAction(currentState, action);

  // Step 3: Write new state back to Drive cache (fast)
  await writeToDriveCache(action.resourceId, newState);

  // Step 4: Add to write queue for batch sync later
  await addToWriteQueue(action);

  // Return instantly — user sees result immediately
  return { success: true, data: newState };
}
```

### Concurrency protection — CRITICAL
When two users act on the same data simultaneously (e.g., two customers buying the last item), you need a version check to prevent silent data loss.

```javascript
async function safeWrite(fileId, newData) {
  // Read current file including its version number
  const current = await driveRead(fileId);

  // If someone else wrote since we last read, retry
  if (current.version !== newData.expectedVersion) {
    throw new Error('VERSION_CONFLICT'); // caller should retry
  }

  // Safe to write — increment version
  newData.version = current.version + 1;
  newData.lastUpdated = new Date().toISOString();

  await driveWrite(fileId, newData);
  return newData;
}
```

> **Rule:** Every JSON file you write to Drive must have a `version` field. Always read before you write. Always increment the version. This prevents the #1 data integrity bug in this architecture.

---

## 4. Layer 2 — Drive JSON (Your Database)

**What it is:** Your custom database engine. Instead of MySQL or PostgreSQL, you store structured JSON files in Google Drive. Drive is your hard disk. Your middle layer is the database engine.

**Why this works:**
- Google Drive files are served from Google's Indian CDN nodes (Mumbai, Chennai, Delhi, Hyderabad)
- Opening a Drive JSON file is exactly like opening a Google Photos image — served from the nearest Google server to the user
- For Indian users accessing Indian businesses, this is **faster than most paid cloud servers** in Singapore or other international locations
- Each client has their own Drive = their own database = zero quota sharing

### Drive as a CDN
This is the breakthrough insight. Google has more Indian infrastructure than most companies can afford. When a customer in Hyderabad opens your Drive JSON file:
- Google's network detects they are in Hyderabad
- Serves the file from the nearest Google POP (Point of Presence)
- Latency: ~20-50ms
- A typical VPS in Bangalore or Singapore: ~80-200ms

You get Google-grade CDN performance for free, per client, with no configuration.

### JSON file structure per client
Each client has a folder in their Google Drive with this structure:

```
/OpsManager/
  /cache/
    products.json       ← product catalogue (read by customers)
    inventory.json      ← stock levels
    orders_live.json    ← today's orders (refreshed frequently)
    business_info.json  ← name, address, hours, contact
    homepage.json       ← hero content, banners, announcements
  /queue/
    pending_writes.json ← actions waiting to be batch-synced
    processing.json     ← items currently being synced (lock file)
  /data/
    orders_archive.json ← all historical orders
    customers.json      ← customer records
    leads.json          ← CRM leads
    analytics.json      ← daily summaries
  /config/
    settings.json       ← app configuration
    auth_tokens.json    ← security tokens (never expose publicly)
```

### Reading from Drive (the fast path)
```javascript
// This is how the website reads data — no Apps Script involved
async function getProducts(driveFileId) {
  // Direct Drive API call — instant, no quota cost
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return await response.json();
}
```

### Writing to Drive (the queue path)
```javascript
// Customer places an order — this is fast and non-blocking
async function placeOrder(orderData) {
  // 1. Read current pending queue
  const queue = await getFromDrive(QUEUE_FILE_ID);

  // 2. Add new order to queue
  queue.pending.push({
    id: generateId(),
    type: 'NEW_ORDER',
    data: orderData,
    timestamp: Date.now(),
    status: 'pending'
  });

  // 3. Write queue back to Drive
  await writeToDrive(QUEUE_FILE_ID, queue);

  // 4. Also update live orders cache so business sees it instantly
  await updateLiveOrdersCache(orderData);

  // Done — customer sees "Order Placed" immediately
  return { success: true, orderId: orderData.id };
}
```

---

## 5. Layer 3 — Write Queue & Batch Sync

**What it is:** A two-step pattern that gives users instant feedback while ensuring data accuracy in the background.

**The problem it solves:** Drive API writes are fast but not instantaneous. If every user action waited for a Drive write to complete and confirm, the experience would feel slow. The queue pattern separates "telling the user it worked" from "actually writing it permanently."

### How the queue works

```
User action
    │
    ▼
Write to pending_writes.json  (fast — just appending to a list)
    │
    ▼
Show user "success" immediately
    │
    │ (2-3 times per day, or triggered by queue size)
    ▼
Batch sync job reads all pending items
    │
    ▼
Processes each item (validate, deduplicate, apply)
    │
    ▼
Writes final state to data/ folder (the source of truth)
    │
    ▼
Clears processed items from queue
```

### The pending_writes.json structure
```json
{
  "version": 47,
  "lastProcessed": "2024-01-15T10:30:00Z",
  "pending": [
    {
      "id": "op_001",
      "type": "NEW_ORDER",
      "status": "pending",
      "timestamp": 1705312200000,
      "data": {
        "orderId": "ORD-2024-001",
        "customerId": "CUST-123",
        "items": [...],
        "total": 1500
      }
    },
    {
      "id": "op_002",
      "type": "UPDATE_INVENTORY",
      "status": "pending",
      "timestamp": 1705312205000,
      "data": {
        "productId": "PROD-456",
        "quantityChange": -1
      }
    }
  ]
}
```

### The batch sync job
```javascript
async function runBatchSync() {
  // 1. Read all pending items
  const queue = await getFromDrive(QUEUE_FILE_ID);
  if (queue.pending.length === 0) return; // nothing to do

  // 2. Mark as processing (prevents double-processing)
  await setProcessingLock(true);

  // 3. Process each item
  for (const item of queue.pending) {
    try {
      await processQueueItem(item);
      item.status = 'synced';
    } catch (err) {
      item.status = 'failed';
      item.error = err.message;
      // Failed items stay in queue for next run
    }
  }

  // 4. Remove synced items, keep failed ones for retry
  queue.pending = queue.pending.filter(i => i.status !== 'synced');
  queue.lastProcessed = new Date().toISOString();

  // 5. Write cleaned queue back
  await writeToDrive(QUEUE_FILE_ID, queue);
  await setProcessingLock(false);
}
```

### When to trigger the sync
- **Time-based:** Every 4-8 hours via Apps Script time trigger (most common)
- **Size-based:** When queue reaches 50+ items
- **Manual:** Business owner can trigger from their dashboard
- **Daily:** Always run once at midnight for end-of-day accuracy

---

## 6. Layer 4 — Apps Script (Night Watchman)

**What it is:** Google Apps Script is NOT your server. It is your maintenance crew. It runs in the background, on a schedule, doing jobs that don't need to happen in real-time.

**The key insight:** By the time we designed the middle layer and Drive JSON cache, Apps Script's quota limits became almost irrelevant. We use ~2-5 minutes of the 90-minute daily quota. The rest is untouched.

### What Apps Script actually does
```javascript
// apps_script/main.gs

// Runs 3 times per day — triggered by time
function scheduledSync() {
  runBatchSync();         // Process write queue
  refreshReadCaches();    // Rebuild fast-read JSON files
  checkDataIntegrity();   // Validate no corruption
}

// Runs once per day at midnight
function dailyJob() {
  generateAnalyticsSummary();  // Build analytics.json
  sendDailyDigestEmail();      // Email summary to business owner
  archiveOldOrders();          // Move old orders to archive
  cleanupProcessedQueue();     // Remove old synced queue items
}

// Runs on demand — only for auth
function validateAuthToken(token) {
  // This is the ONLY real-time Apps Script call
  // Validates that a request is from an authorized user
  return checkTokenAgainstConfig(token);
}
```

### What Apps Script does NOT do
- ❌ Handle customer page loads
- ❌ Serve product listings
- ❌ Process orders in real-time
- ❌ Handle any user-facing requests
- ❌ Run on every action

> **Rule for developers:** If you're thinking of calling Apps Script for a user-facing action, stop. Find a way to do it through the Drive cache instead. Apps Script is background only.

---

## 7. Layer 5 — Auth & Security

**What it is:** A token-based system that ensures only authorized users can read or write to a client's Drive files.

### How auth works

```
User logs in
    │
    ▼
Apps Script validates credentials
    │
    ▼
Issues a SECURITY_TOKEN (a long random string)
    │
    ▼
Token stored in auth_tokens.json on Drive
    │
    ▼
Every subsequent request includes this token
    │
    ▼
Middle layer validates token against Drive config
    │
    ├── Valid → allow action
    └── Invalid → reject, show login
```

### Security token structure
```json
{
  "tokens": [
    {
      "token": "om_a8f3d2c1e9b4...",
      "userId": "user_001",
      "role": "owner",
      "created": "2024-01-15T08:00:00Z",
      "expires": "2024-02-15T08:00:00Z",
      "lastUsed": "2024-01-15T14:32:00Z"
    }
  ]
}
```

### Role levels
| Role | Can do |
|---|---|
| `owner` | Everything — full access |
| `manager` | View and edit orders, leads, inventory |
| `staff` | View orders, update status |
| `customer` | View products, place orders, view own orders |
| `public` | View products only (no login needed) |

### Important security rules
1. **Never expose `auth_tokens.json` publicly** — this file must have Drive sharing set to private
2. **Never put tokens in URLs** — always in request headers
3. **Rotate tokens monthly** — Apps Script daily job handles this
4. **Separate public files from private files** — product catalogue is public, customer data is private

---

## 8. Layer 6 — Email & Notifications

**What it is:** Gmail API used through the client's own Google Account to send transactional emails.

**Why this works for SMBs:** Most small businesses send fewer than 30-40 emails per day. The Gmail API via Apps Script allows 1,500 emails/day on Workspace accounts. For a typical dealer or shop, this is effectively unlimited.

### Email types and when to send them

| Email type | Trigger | Template |
|---|---|---|
| Order confirmation | Customer places order | `order_confirm.html` |
| Order received | Business gets new order | `order_alert.html` |
| Status update | Order status changes | `status_update.html` |
| Daily summary | Midnight batch job | `daily_digest.html` |
| New lead | Lead form submitted | `new_lead.html` |

### Sending an email via Apps Script
```javascript
// apps_script/email.gs

function sendOrderConfirmation(order, customerEmail) {
  const template = HtmlService.createTemplateFromFile('order_confirm');
  template.order = order;
  template.businessName = getBusinessConfig().name;

  GmailApp.sendEmail(
    customerEmail,
    `Order Confirmed — ${order.id}`,
    '',  // plain text fallback
    {
      htmlBody: template.evaluate().getContent(),
      name: getBusinessConfig().name  // emails come from business name
    }
  );
}
```

> **Note on OTPs:** If you add OTP-based login in future, use SMS (MSG91 or Fast2SMS at ₹0.15/SMS) rather than email. SMS is more reliable for login flows and doesn't share the email quota.

---

## 9. The Provisioning Engine

**What it is:** The system that sets up a brand new client in one click. This is the most important piece of infrastructure for scaling the business.

**What it does in sequence:**
1. Receives new client details (business name, owner email, plan)
2. Triggers Google OAuth flow — client authorizes Ops Manager
3. Creates folder structure in client's Google Drive
4. Uploads template JSON files (empty database)
5. Deploys Apps Script project to client's Google account
6. Sets security tokens and configuration
7. Returns: live website URL + admin dashboard URL

### Provisioning flow
```javascript
// provisioning/index.js

async function provisionNewClient(clientDetails) {
  const { businessName, ownerEmail, plan, domain } = clientDetails;

  // Step 1: Create Drive folder structure
  const folders = await createDriveFolders(ownerEmail, businessName);

  // Step 2: Upload template files
  await uploadTemplateFiles(folders, {
    businessName,
    plan,
    createdAt: new Date().toISOString()
  });

  // Step 3: Deploy Apps Script
  const scriptUrl = await deployAppsScript(ownerEmail, {
    cacheFolder: folders.cache,
    queueFolder: folders.queue,
    dataFolder: folders.data,
    configFolder: folders.config
  });

  // Step 4: Generate security tokens
  const tokens = await generateInitialTokens(ownerEmail);
  await writeToConfig(folders.config, 'auth_tokens.json', tokens);

  // Step 5: Configure website
  const websiteConfig = buildWebsiteConfig(clientDetails, folders, scriptUrl);
  await writeToConfig(folders.config, 'settings.json', websiteConfig);

  // Step 6: Return client's URLs
  return {
    websiteUrl: `https://opsmanager.in/${businessName.toLowerCase()}`,
    adminUrl: `https://admin.opsmanager.in/${tokens.ownerToken}`,
    scriptUrl,
    status: 'live'
  };
}
```

### Template files (what every new client starts with)

Every new client gets these pre-filled JSON templates:

```json
// template/products.json
{
  "version": 1,
  "businessId": "{{BUSINESS_ID}}",
  "lastUpdated": "{{TIMESTAMP}}",
  "products": []
}

// template/business_info.json
{
  "version": 1,
  "name": "{{BUSINESS_NAME}}",
  "tagline": "",
  "phone": "",
  "email": "{{OWNER_EMAIL}}",
  "address": "",
  "hours": "",
  "logo": "",
  "theme": "default"
}

// template/pending_writes.json
{
  "version": 1,
  "lastProcessed": null,
  "pending": []
}
```

---

## 10. Deployment Modes

Ops Manager supports three deployment modes. The core engine is identical across all three — only the storage backend changes.

### Mode 1: Sovereign Google (Starter)
- **Storage:** Client's own Google Drive
- **Who it's for:** Small businesses, first-time digital presence
- **Price:** ₹299–599/month
- **Your cost:** ₹0 per client
- **Key benefit:** Client fully owns their data

### Mode 2: Ops Manager Cloud (Growth)
- **Storage:** Your own servers (Hetzner/DigitalOcean)
- **Who it's for:** Businesses that want managed hosting
- **Price:** ₹799–1,499/month
- **Your cost:** ~₹10–30 per client (one server handles 200+ clients)
- **Key benefit:** Faster provisioning, managed backups

### Mode 3: On-Premise (Enterprise)
- **Storage:** Client's own servers
- **Who it's for:** Hospitals, franchises, large dealers
- **Price:** ₹50,000–2,00,000 setup + annual support
- **Your cost:** Only setup time
- **Key benefit:** Complete data sovereignty, no external dependency

### How to switch storage backends
Because the middle layer abstracts all storage calls behind a standard interface, switching backends requires changing only one module:

```javascript
// storage/interface.js — this never changes
export interface StorageAdapter {
  read(path: string): Promise<any>;
  write(path: string, data: any): Promise<void>;
  delete(path: string): Promise<void>;
  list(folder: string): Promise<string[]>;
}

// storage/google-drive.js — Mode 1
// storage/s3-compatible.js — Mode 2 (works with any S3 API)
// storage/local.js — Mode 3 (local filesystem)
```

---

## 11. Per-Client Isolation Model

This is one of the most important architectural decisions. Every client runs on their own Google Account. This means:

### What isolation gives you
- **Quota isolation:** Client A hitting limits has zero effect on Client B
- **Data isolation:** No way for one client's data to leak to another
- **Failure isolation:** One client's Drive being slow doesn't affect others
- **Google One resale:** Each client needs their own storage upgrade = your revenue

### Quota per client (Google Workspace account)
| Resource | Limit | Typical usage | Buffer |
|---|---|---|---|
| Apps Script execution | 90 min/day | ~3-5 min/day | 94% unused |
| Gmail sends | 1,500/day | ~30-40/day | 97% unused |
| Drive storage | 15GB free | ~100MB/client | 99% unused |
| Drive API calls | 12,000/100sec | ~50/100sec | 99% unused |

### The business model consequence
Because each client is a separate Google Account, you can grow to 10,000 clients with zero quota concerns. 10,000 clients = 10,000 separate Google accounts, each with their own independent limits.

---

## 12. Speed & Performance

### Why Drive JSON is fast for Indian users

Google has Points of Presence (POPs) across India:
- Mumbai (largest)
- Chennai
- Delhi
- Hyderabad
- Bengaluru

When a customer opens a product listing, the Drive JSON file is served from the nearest Google node — exactly the same way Google Photos opens instantly on your phone. This is not a coincidence; it's the same infrastructure.

**Typical latencies:**
| Action | Latency | Why |
|---|---|---|
| Read product list | 20-50ms | Served from Google CDN |
| Place order (queue write) | 50-100ms | Drive API write |
| Auth check | 200-400ms | Apps Script call |
| Batch sync | Background | Never user-facing |

### Performance rules for developers
1. **Never make an Apps Script call on page load** — always pre-cache
2. **Pre-flatten data into read-optimized JSON** — don't make the client do processing
3. **Cache at the file level** — one Drive read serves all users until the file changes
4. **Lazy-load images** — Drive-hosted images use standard `loading="lazy"`
5. **Build homepage.json to be self-contained** — entire homepage renders from one JSON file

---

## 13. Quota & Limits Reference

Quick reference for the most important limits:

### Apps Script limits (per client account)
| Limit | Value | Impact |
|---|---|---|
| Daily execution time | 90 min | Near-irrelevant with our architecture |
| Single execution | 6 min | Only relevant for large batch jobs |
| HTTP response timeout | 30 sec | Never hit (user actions don't call AS) |
| Triggers per account | 20 | Plenty for 3x daily sync + daily job |
| Email sends/day | 1,500 (Workspace) | SMBs use <50/day |

### Google Drive limits (per client account)
| Limit | Value | Impact |
|---|---|---|
| Storage (free) | 15GB | ~100MB per typical client = years of headroom |
| Drive API reads | 12,000/100sec | Essentially unlimited for 1 business |
| Drive API writes | 12,000/100sec | Essentially unlimited for 1 business |
| File size | 5TB | Not relevant for JSON files |

### What to do when a client approaches storage limit
1. Compress and archive old orders to a single annual archive JSON
2. Upsell them to Google One (100GB for ₹130/month) — this is your reseller revenue trigger
3. The storage limit is a business opportunity, not a crisis

---

## 14. Building Your First Client Website

Step-by-step guide for a fresh developer building their first client on Ops Manager.

### Step 1: Run the provisioning engine
```bash
node provisioning/index.js \
  --business-name "Ravi Motors" \
  --owner-email "ravi@ravimotors.in" \
  --plan starter \
  --domain ravimotors.in
```

This creates the Drive structure and returns the client's config.

### Step 2: Fill in business_info.json
```json
{
  "version": 1,
  "name": "Ravi Motors",
  "tagline": "Your trusted EV dealer in Hyderabad",
  "phone": "+91-98765-43210",
  "email": "ravi@ravimotors.in",
  "address": "123 Main Road, Jubilee Hills, Hyderabad",
  "hours": "Mon-Sat 9AM-7PM",
  "logo": "https://drive.google.com/uc?id=FILE_ID",
  "theme": "blue",
  "socialLinks": {
    "whatsapp": "https://wa.me/919876543210",
    "instagram": ""
  }
}
```

### Step 3: Add products
```json
{
  "version": 1,
  "lastUpdated": "2024-01-15T10:00:00Z",
  "products": [
    {
      "id": "PROD-001",
      "name": "Ola S1 Pro",
      "category": "scooter",
      "price": 147499,
      "discountedPrice": 139999,
      "images": ["https://drive.google.com/uc?id=IMG_FILE_ID"],
      "description": "India's best electric scooter",
      "specs": {
        "range": "181 km",
        "topSpeed": "116 kmph",
        "chargingTime": "6.5 hrs"
      },
      "inStock": true,
      "stockCount": 5
    }
  ]
}
```

### Step 4: Connect the frontend
```javascript
// frontend/app.js

const CLIENT_CONFIG = {
  businessInfoFileId: 'DRIVE_FILE_ID_1',
  productsFileId: 'DRIVE_FILE_ID_2',
  ordersQueueFileId: 'DRIVE_FILE_ID_3',
  scriptUrl: 'https://script.google.com/macros/s/SCRIPT_ID/exec',
  accessToken: 'CLIENT_ACCESS_TOKEN'
};

// On page load — reads from Drive directly
async function loadHomepage() {
  const [businessInfo, products] = await Promise.all([
    readDriveFile(CLIENT_CONFIG.businessInfoFileId),
    readDriveFile(CLIENT_CONFIG.productsFileId)
  ]);

  renderBusinessInfo(businessInfo);
  renderProductGrid(products.products);
}
```

### Step 5: Handle orders
```javascript
// When customer submits order form
async function submitOrder(formData) {
  const order = {
    id: `ORD-${Date.now()}`,
    customerId: getCurrentUser().id,
    items: formData.items,
    total: calculateTotal(formData.items),
    status: 'placed',
    placedAt: new Date().toISOString()
  };

  // Write to queue — instant
  await addToQueue('NEW_ORDER', order);

  // Update live cache so business sees it immediately
  await updateLiveOrders(order);

  // Show success to customer
  showOrderConfirmation(order.id);
}
```

---

## 15. File & Folder Structure

### Repository structure
```
ops-manager/
├── provisioning/
│   ├── index.js              ← one-click deploy engine
│   ├── templates/            ← JSON templates for new clients
│   └── oauth/                ← Google OAuth handling
│
├── middle-layer/
│   ├── index.js              ← main engine
│   ├── cache.js              ← read/write cache logic
│   ├── queue.js              ← write queue management
│   ├── storage.js            ← Drive API abstraction
│   └── concurrency.js        ← version-lock system
│
├── apps-script/
│   ├── main.gs               ← scheduled jobs
│   ├── sync.gs               ← batch sync logic
│   ├── email.gs              ← email sending
│   ├── auth.gs               ← token validation
│   └── analytics.gs          ← daily summaries
│
├── frontend/
│   ├── website/              ← customer-facing site
│   │   ├── index.html
│   │   ├── products.html
│   │   ├── order.html
│   │   └── app.js
│   └── admin/                ← business owner dashboard
│       ├── dashboard.html
│       ├── orders.html
│       ├── leads.html
│       └── admin.js
│
├── email-templates/
│   ├── order_confirm.html
│   ├── order_alert.html
│   ├── daily_digest.html
│   └── new_lead.html
│
└── docs/
    └── this file
```

---

## 16. Data Schema Reference

### Order schema
```json
{
  "id": "ORD-2024-001",
  "version": 1,
  "status": "placed | confirmed | processing | dispatched | delivered | cancelled",
  "customerId": "CUST-123",
  "customerName": "Priya Sharma",
  "customerPhone": "+91-98765-43210",
  "customerEmail": "priya@email.com",
  "items": [
    {
      "productId": "PROD-001",
      "productName": "Ola S1 Pro",
      "quantity": 1,
      "unitPrice": 139999,
      "total": 139999
    }
  ],
  "subtotal": 139999,
  "tax": 0,
  "total": 139999,
  "paymentStatus": "pending | paid | refunded",
  "placedAt": "2024-01-15T14:32:00Z",
  "updatedAt": "2024-01-15T14:32:00Z",
  "notes": ""
}
```

### Lead schema
```json
{
  "id": "LEAD-2024-001",
  "version": 1,
  "status": "new | contacted | qualified | converted | lost",
  "name": "Arjun Reddy",
  "phone": "+91-90000-00000",
  "email": "arjun@email.com",
  "interest": "Ola S1 Pro",
  "source": "website | whatsapp | walkin | referral",
  "assignedTo": "staff_001",
  "notes": [],
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

## 17. Common Patterns & Code Snippets

### Read a Drive file
```javascript
async function readDriveFile(fileId, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  return await res.json();
}
```

### Write a Drive file
```javascript
async function writeDriveFile(fileId, data, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );
  if (!res.ok) throw new Error(`Drive write failed: ${res.status}`);
  return await res.json();
}
```

### Generate a unique ID
```javascript
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Check auth token
```javascript
async function validateToken(token, configFileId, accessToken) {
  const config = await readDriveFile(configFileId, accessToken);
  const tokenRecord = config.tokens.find(t => t.token === token);

  if (!tokenRecord) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
  if (new Date(tokenRecord.expires) < new Date()) return { valid: false, reason: 'TOKEN_EXPIRED' };

  return { valid: true, userId: tokenRecord.userId, role: tokenRecord.role };
}
```

---

## 18. What NOT to Do

These are the mistakes that will break the system. Memorize them.

| ❌ Don't | ✅ Do instead |
|---|---|
| Call Apps Script for every user action | Use Drive JSON cache for all reads |
| Write directly to data/ without going through queue | Always write to pending_writes.json first |
| Ignore version numbers when writing | Always read → check version → write → increment version |
| Make multiple Drive reads per page load | Pre-build a single homepage.json that contains everything |
| Store auth tokens in localStorage | Keep tokens server-side or in httpOnly cookies |
| Share one Google Account across multiple clients | Every client gets their own Google Account |
| Run heavy processing in Apps Script HTTP handlers | Move heavy work to time-based triggers |
| Expose Drive file IDs in public frontend code | Keep file IDs in server-side config only |

---

## 19. Business Model Context

Understanding why we built it this way helps you make better technical decisions.

### The three-sided value exchange
- **Google** gets new Google One subscribers — earns recurring revenue
- **SMB clients** get a premium website + app + CRM at ₹300-500/month
- **Ops Manager (us)** earns platform subscription + Google One reseller margin (15-20%)

### Revenue per client
```
Platform subscription:  ₹500/month
Google One reseller margin: ₹100-150/month
Onboarding fee (one-time): ₹2,000-5,000
────────────────────────────────────
Monthly recurring per client: ₹600-650
Infrastructure cost per client: ₹0
Gross margin per client: ~100%
```

### At scale
- 100 clients = ₹65,000/month
- 500 clients = ₹3,25,000/month
- 2,000 clients = ₹13,00,000/month
- Infrastructure cost at 2,000 clients: still ≈ ₹0

This is why the architecture matters. We didn't just build a clever technical system — we built a business model where the technical choices create the margin.

---

## 20. Glossary

| Term | Meaning |
|---|---|
| **Middle Layer** | The JS engine between UI and Drive storage |
| **Shadow Cache** | Drive JSON files that mirror the database for fast reads |
| **Write Queue** | pending_writes.json — list of actions waiting to be synced |
| **Batch Sync** | The scheduled job that processes the write queue |
| **Provisioning Engine** | The one-click system that sets up a new client |
| **Per-client isolation** | Each client on their own Google Account — no shared limits |
| **Sovereign** | The client owns all their data, on their own account |
| **Night Watchman** | Our nickname for Apps Script — runs in background only |
| **POP** | Point of Presence — a Google CDN node (Mumbai, Chennai etc.) |
| **Version conflict** | When two writes collide — solved by version number checking |
| **ISV** | Independent Software Vendor — what Ops Manager is to Google |

---

*Document maintained by the Ops Manager platform team.*
*Update this document whenever architecture decisions change.*
*Last updated: V6.0*
