/**
 * OPS MANAGER V6.0 — Drive JSON Starter Templates
 * These 7 files are uploaded to every new client's Drive folder during provisioning.
 */

export function getStarterTemplates(clientId, businessName, ownerEmail) {
  const now = new Date().toISOString();
  const ownerToken = `tok_owner_${Math.random().toString(36).substr(2, 20)}`;

  return {
    // ── CACHE FILES (public, fast-read) ───────────────────────────────────
    'cache/products.json': {
      version: 1,
      businessId: clientId,
      lastUpdated: now,
      products: []
    },

    'cache/homepage.json': {
      version: 1,
      businessId: clientId,
      hero: {
        headline: `Welcome to ${businessName}`,
        subheadline: 'Your trusted local business',
        ctaText: 'Browse Now',
        ctaLink: '/products'
      },
      announcements: [],
      featuredProducts: [],
      lastUpdated: now
    },

    'cache/business_info.json': {
      version: 1,
      name: businessName,
      tagline: '',
      phone: '',
      email: ownerEmail,
      address: '',
      hours: 'Mon-Sat 9AM-7PM',
      logo: '',
      theme: 'default',
      socialLinks: { whatsapp: '', instagram: '', facebook: '' },
      lastUpdated: now
    },

    'cache/orders_live.json': {
      version: 1,
      orders: [],
      lastUpdated: now
    },

    // ── QUEUE FILE ────────────────────────────────────────────────────────
    'queue/pending_writes.json': {
      version: 1,
      pending: [],
      processing: false,
      lastProcessed: null
    },

    // ── DATA FILES (private, source of truth) ─────────────────────────────
    'data/orders.json': {
      version: 1,
      orders: [],
      lastUpdated: now
    },

    'data/leads.json': {
      version: 1,
      leads: [],
      lastUpdated: now
    },

    // ── CONFIG FILES (private) ────────────────────────────────────────────
    'config/settings.json': {
      version: 1,
      clientId,
      businessName,
      ownerEmail,
      templateId: null, // Set during provisioning
      domain: null,     // Set during provisioning
      storageAdapter: 'google-drive',
      provisionedAt: now,
      plan: 'starter'
    },

    'config/auth_tokens.json': {
      version: 1,
      tokens: [
        {
          token: ownerToken,
          userId: `user_${clientId}_owner`,
          role: 'owner',
          created: now,
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          lastUsed: null
        }
      ]
    }
  };
}
