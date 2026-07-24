/**
 * CTE Express API & SSE-based MCP Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Initialize Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  logger.error('SUPABASE_URL and SUPABASE_KEY are required.');
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/css for simple frontend demo
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static('web'));

// Log HTTP Requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// -------------------------------------------------------------
// STANDARD REST API ENDPOINTS
// -------------------------------------------------------------

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Helper: Log search query for market insights
async function logSearchQuery(query, category, intent) {
  if (!query) return;
  try {
    // Check if query exists for today
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cte_search_queries')
      .select('id, volume')
      .eq('query', query.toLowerCase().trim())
      .eq('tracked_date', today)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // Increment volume
      await supabase
        .from('cte_search_queries')
        .update({ volume: data.volume + 1 })
        .eq('id', data.id);
    } else {
      // Insert new query log
      await supabase
        .from('cte_search_queries')
        .insert([{
          query: query.toLowerCase().trim(),
          category: category || 'all',
          intent: intent || 'informational',
          volume: 1,
          tracked_date: today
        }]);
    }
  } catch (err) {
    logger.warn(`Failed to log search query insight: ${err.message}`);
  }
}

// Get Products (with Search & Insights logging)
app.get('/api/v1/products', async (req, res) => {
  try {
    const { category, query, max_price, sort_by, limit } = req.query;

    if (query) {
      await logSearchQuery(query, category, 'product_search');
    }

    let dbQuery = supabase
      .from('products')
      .select('*');

    if (category) dbQuery = dbQuery.eq('category', category);
    if (max_price) dbQuery = dbQuery.lte('current_price', parseInt(max_price));
    if (query) dbQuery = dbQuery.ilike('name', `%${query}%`);

    if (sort_by === 'quality') {
      dbQuery = dbQuery.order('quality_score', { ascending: false });
    } else if (sort_by === 'value') {
      dbQuery = dbQuery.order('value_score', { ascending: false });
    } else {
      dbQuery = dbQuery.order('overall_score', { ascending: false });
    }

    const { data, error } = await dbQuery.limit(parseInt(limit) || 20);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Error fetching products');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compare Products
app.post('/api/v1/compare', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid product IDs list' });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Error comparing products');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Articles (SEO blog posts)
app.get('/api/v1/articles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Error fetching articles');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get News & Launch Alerts
app.get('/api/v1/news', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news_updates')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Error fetching news');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Dashboard Stats & Search Insights (Exposed to EvCRM)
app.get('/api/v1/stats', async (req, res) => {
  try {
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Fetch popular search queries
    const { data: topSearches } = await supabase
      .from('cte_search_queries')
      .select('query, volume, category')
      .order('volume', { ascending: false })
      .limit(5);

    // Fetch latest logs
    const { data: latestCrawl } = await supabase
      .from('crawler_log')
      .select('completed_at')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({
      success: true,
      total_products: totalProducts || 0,
      top_searches: topSearches || [],
      last_crawl: latestCrawl?.completed_at || null
    });
  } catch (error) {
    logger.error({ error }, 'Error compiling stats');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Price Trends (Analytics)
app.get('/api/v1/analytics/price-trends', async (req, res) => {
  try {
    const { brand, category } = req.query;
    let query = supabase.from('price_history').select('*');
    
    if (brand) query = query.eq('brand', brand);
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query.order('recorded_at', { ascending: true });
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Error fetching price trends');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get EV Demand Share (Analytics)
app.get('/api/v1/analytics/demand-share', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registration_data')
      .select('*')
      .order('month_year', { ascending: true });
      
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Error fetching demand share');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Subscribe Newsletter
app.post('/api/v1/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const { error } = await supabase
      .from('subscriber_emails')
      .insert([{ email }]);

    if (error && error.code !== '23505') throw error; // Ignore duplicate email errors

    res.json({ success: true, message: 'Successfully subscribed' });
  } catch (error) {
    logger.error({ error }, 'Error subscribing');
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// MODEL CONTEXT PROTOCOL (MCP) SERVER OVER SSE
// -------------------------------------------------------------

const activeSessions = new Map();

// GET /mcp - Server-Sent Events endpoint
app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sessionId = crypto.randomUUID();
  activeSessions.set(sessionId, res);

  logger.info(`New MCP Client session established: ${sessionId}`);

  // Send the endpoint configuration event
  const initEvent = {
    event: 'endpoint',
    data: `/mcp/message?sessionId=${sessionId}`
  };
  res.write(`event: ${initEvent.event}\ndata: ${initEvent.data}\n\n`);

  req.on('close', () => {
    activeSessions.delete(sessionId);
    logger.info(`MCP Client session closed: ${sessionId}`);
  });
});

// POST /mcp/message - Receives JSON-RPC messages from MCP client
app.post('/mcp/message', async (req, res) => {
  const { sessionId } = req.query;
  const clientResponse = activeSessions.get(sessionId);

  if (!clientResponse) {
    return res.status(400).json({ error: 'Session not found or expired' });
  }

  const { jsonrpc, method, params, id } = req.body;
  logger.info(`Received MCP request [${method}] ID: ${id}`);

  let result = {};

  try {
    if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'cte-transparency-server',
          version: '1.0.0'
        }
      };
    } else if (method === 'tools/list') {
      result = {
        tools: [
          {
            name: 'search_products',
            description: 'Queries product details, specifications, and transparency scores. Logs query intent for market insights.',
            inputSchema: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Categories: ev_two_wheeler, used_car, auto_insurance, auto_loan' },
                query: { type: 'string', description: 'Keywords to search' },
                max_price: { type: 'number', description: 'Filter products below a maximum price (INR)' }
              }
            }
          },
          {
            name: 'compare_vehicles',
            description: 'Compares specifications and values of multiple vehicle IDs side-by-side.',
            inputSchema: {
              type: 'object',
              properties: {
                ids: { type: 'array', items: { type: 'string' }, description: 'Array of vehicle/product IDs' }
              },
              required: ['ids']
            }
          },
          {
            name: 'get_seo_articles',
            description: 'Fetches auto-generated comparison blog posts and buying guides targeting SEO keywords.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'get_latest_automobile_news',
            description: 'Fetches latest automobile industry updates, launches, and pricing notifications.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'find_charging_stations',
            description: 'Locates nearby EV charging stations by GPS coordinates or city, shows charger types (Fast/Slow), status, and distance.',
            inputSchema: {
              type: 'object',
              properties: {
                latitude: { type: 'number', description: 'Latitude for location-based search' },
                longitude: { type: 'number', description: 'Longitude for location-based search' },
                radius_km: { type: 'number', description: 'Search radius in kilometers (default 8)' },
                max_results: { type: 'number', description: 'Maximum results to return (default 10)' }
              }
            }
          }
        ]
      };
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;

      if (name === 'search_products') {
        const { category, query, max_price } = args || {};
        
        // Log query intent for EvCRM dashboards
        if (query) {
          await logSearchQuery(query, category, 'mcp_ai_search');
        }

        let dbQuery = supabase.from('products').select('*');
        if (category) dbQuery = dbQuery.eq('category', category);
        if (max_price) dbQuery = dbQuery.lte('current_price', max_price);
        if (query) dbQuery = dbQuery.ilike('name', `%${query}%`);

        const { data, error } = await dbQuery.order('overall_score', { ascending: false }).limit(10);
        if (error) throw error;

        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      } else if (name === 'compare_vehicles') {
        const { ids } = args || {};
        const { data, error } = await supabase.from('products').select('*').in('id', ids);
        if (error) throw error;

        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      } else if (name === 'get_seo_articles') {
        const { data, error } = await supabase.from('articles').select('*').order('published_at', { ascending: false }).limit(5);
        if (error) throw error;

        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      } else if (name === 'get_latest_automobile_news') {
        const { data, error } = await supabase.from('news_updates').select('*').order('date', { ascending: false }).limit(5);
        if (error) throw error;

        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      } else {
        throw new Error(`Tool not found: ${name}`);
      }
    } else {
      result = {};
    }

    // Send RPC response back over SSE
    const rpcResponse = { jsonrpc: '2.0', result, id };
    clientResponse.write(`data: ${JSON.stringify(rpcResponse)}\n\n`);
    res.status(200).json({ success: true });

  } catch (err) {
    logger.error(`MCP Error: ${err.message}`);
    const rpcError = {
      jsonrpc: '2.0',
      error: { code: -32603, message: err.message },
      id
    };
    clientResponse.write(`data: ${JSON.stringify(rpcError)}\n\n`);
    res.status(200).json({ success: true });
  }
});

// Start Server
const PORT = process.env.PORT || process.env.API_PORT || 3000;
app.listen(PORT, () => {
  logger.info(`CTE Engine running on port ${PORT}`);
  logger.info(`MCP SSE server endpoint ready at http://localhost:${PORT}/mcp`);
});
