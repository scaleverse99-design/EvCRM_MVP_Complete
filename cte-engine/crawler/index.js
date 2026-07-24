/**
 * CTE Main Crawler (Dynamic & Database-Driven)
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');
const { extractSpecs } = require('./spec-extractor');

// Initialize logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Initialize Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  logger.error('SUPABASE_URL and SUPABASE_KEY environment variables are required.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

class CTECrawler {
  constructor() {
    this.browser = null;
    this.stats = {
      crawled: 0,
      failed: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        timeout: 60000,
        dumpio: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });
      logger.info('Browser launched successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to launch browser');
      throw error;
    }
  }

  async fetchTargets() {
    const { data, error } = await supabase
      .from('crawler_targets')
      .select('*')
      .eq('active', true);

    if (error) {
      logger.error({ error }, 'Failed to load crawler targets from Supabase');
      throw error;
    }

    return data || [];
  }

  async crawlTarget(target) {
    let page = null;
    let processedProducts = [];

    try {
      page = await this.browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      logger.info(`Crawling Target: ${target.name} (${target.url})`);

      // Resolve URL (prepend protocol if missing)
      const targetUrl = target.url.startsWith('http') ? target.url : `https://${target.url}`;
      
      // Go to target URL (with a generous timeout fallback)
      try {
        await page.goto(targetUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
      } catch (gotoErr) {
        logger.warn(`Goto timeout for ${target.name}, attempting fallback extraction...`);
      }

      const selectors = target.selectors_json || {};
      const productSelector = selectors.products || '.product-card';

      // Simple DOM extraction based on configured selectors
      let rawProducts = await page.evaluate((prodSel, selConfig) => {
        const items = Array.from(document.querySelectorAll(prodSel));
        return items.slice(0, 10).map((el, index) => {
          // Find link
          const linkEl = el.querySelector('a');
          const productUrl = linkEl ? linkEl.href : window.location.href;

          // Standard selectors mapping
          const nameText = el.textContent.trim().split('\n')[0] || `Product ${index + 1}`;
          const priceText = el.textContent.match(/(?:₹|Rs\.?|INR)\s*[\d,]+/i)?.[0] || '';

          return {
            name: nameText,
            price: priceText,
            url: productUrl,
            specs: el.textContent.trim(),
            html: el.innerHTML
          };
        });
      }, productSelector, selectors);

      if (rawProducts.length === 0) {
        // CTE is a TRANSPARENCY engine — fabricated specs must NEVER be served
        // or published, or the trust (and Google ranking) collapses. The
        // realistic-fallback generator is kept ONLY for local demos and is
        // gated behind CTE_DEMO_MODE=true (default OFF). In production a target
        // that matches nothing simply logs a warning and stores nothing real —
        // fix its selectors / repoint it at an aggregator page instead.
        if (process.env.CTE_DEMO_MODE === 'true') {
          logger.warn(`[DEMO MODE] No products matched on ${target.name}. Injecting fabricated fallback specs.`);
          rawProducts = this.generateFallbackProducts(target);
        } else {
          logger.warn(`No products matched selectors on ${target.name} — storing nothing (fabrication disabled).`);
        }
      }

      logger.info(`Found ${rawProducts.length} raw products on ${target.name}`);

      for (const rawProduct of rawProducts) {
        try {
          const { specs, score } = extractSpecs(rawProduct, target.category);
          
          const productRecord = {
            category: target.category,
            name: rawProduct.name || 'Unknown Item',
            brand: target.name,
            url: rawProduct.url,
            source: target.name,
            current_price: specs.price || 0,
            specs,
            overall_score: score.overall,
            quality_score: score.quality,
            value_score: score.value,
            satisfaction_score: score.satisfaction,
            crawled_at: new Date()
          };

          await this.storeProduct(productRecord);
          processedProducts.push(productRecord);
          this.stats.crawled++;
        } catch (err) {
          logger.error(`Error processing product: ${rawProduct.name} - ${err.message}`);
          this.stats.failed++;
        }
      }

      // CTE is a pure DATA SOURCE — it crawls and stores products only.
      // Article writing is intentionally NOT done here: the EvCRM orchestrator
      // (lib/orchestrator, using GEMINI_ORCHESTRATOR_KEY) reads the `products`
      // table and writes the real, cited articles. Do not re-add template
      // article/news generation here — it would compete with those articles.

      // Update last crawled timestamp
      await supabase
        .from('crawler_targets')
        .update({ last_crawled_at: new Date() })
        .eq('id', target.id);

      await this.logActivity(target.name, target.category, rawProducts.length);

    } catch (error) {
      logger.error(error, `Failed crawling target: ${target.name}`);
      this.stats.failed++;
    } finally {
      if (page) await page.close();
    }
  }

  async storeProduct(product) {
    const { error } = await supabase
      .from('products')
      .upsert([product], { onConflict: 'url' });

    if (error) {
      logger.error({ error }, `Supabase error storing product: ${product.name}`);
      throw error;
    }
  }

  async logActivity(siteName, category, count) {
    const { error } = await supabase
      .from('crawler_log')
      .insert([{
        site_name: siteName,
        category,
        products_found: count,
        completed_at: new Date()
      }]);

    if (error) logger.warn({ error }, 'Failed to record crawl activity log');
  }

  generateFallbackProducts(target) {
    const list = [];
    if (target.name === 'ather') {
      list.push(
        { name: 'Ather 450X Gen 3', price: '₹145,000', url: 'https://atherenergy.com/450x', specs: 'Range: 146 km, Battery: 3.7 kWh, Top Speed: 90 km/h, Charge Time: 5.5 hours' },
        { name: 'Ather 450S', price: '₹129,000', url: 'https://atherenergy.com/450s', specs: 'Range: 115 km, Battery: 2.9 kWh, Top Speed: 90 km/h, Charge Time: 8.5 hours' },
        { name: 'Ather Apex', price: '₹189,000', url: 'https://atherenergy.com/apex', specs: 'Range: 157 km, Battery: 3.7 kWh, Top Speed: 100 km/h, Charge Time: 5.5 hours' }
      );
    } else if (target.name === 'ola-electric') {
      list.push(
        { name: 'Ola S1 Pro Gen 2', price: '₹147,000', url: 'https://olaelectric.com/s1-pro', specs: 'Range: 195 km, Battery: 4.0 kWh, Top Speed: 120 km/h, Charge Time: 6.5 hours' },
        { name: 'Ola S1 Air', price: '₹115,000', url: 'https://olaelectric.com/s1-air', specs: 'Range: 151 km, Battery: 3.0 kWh, Top Speed: 90 km/h, Charge Time: 5 hours' },
        { name: 'Ola S1 X (4kWh)', price: '₹109,000', url: 'https://olaelectric.com/s1-x', specs: 'Range: 190 km, Battery: 4.0 kWh, Top Speed: 90 km/h, Charge Time: 6.5 hours' }
      );
    } else if (target.name === 'cars24' || target.name === 'spinny') {
      list.push(
        { name: `Used Tata Nexon EV XM [${target.name}]`, price: '₹1,050,000', url: `https://${target.url}/tata-nexon-ev`, specs: 'Mileage: 28,000 km, Battery: 30.2 kWh, Range: 312 km, Year: 2021, Loan EMI: ₹18,500/mo' },
        { name: `Used MG ZS EV Exclusive [${target.name}]`, price: '₹1,580,000', url: `https://${target.url}/mg-zs-ev`, specs: 'Mileage: 19,000 km, Battery: 44.5 kWh, Range: 419 km, Year: 2021, Loan EMI: ₹27,800/mo' }
      );
    } else if (target.category === 'auto_insurance') {
      list.push(
        { name: `${target.name === 'acko-insurance' ? 'Acko' : 'PolicyBazaar'} Comprehensive EV Plan`, price: '₹8,500/year', url: `https://${target.url}/comprehensive`, specs: 'Zero Depreciation, Battery Cover Included, Claim Settlement: 98%' },
        { name: `${target.name === 'acko-insurance' ? 'Acko' : 'PolicyBazaar'} Third Party EV Plan`, price: '₹3,572/year', url: `https://${target.url}/third-party`, specs: 'Roadside Assistance, Battery Fire Protection, Claim Settlement: 95%' }
      );
    } else if (target.category === 'auto_loan') {
      list.push(
        { name: 'SBI Green Car Loan (EV)', price: '8.75% interest', url: `https://${target.url}/sbi-green`, specs: 'Max Tenure: 7 years, Processing Fee: 0%, Min EMI: ₹1,550 per Lakh' },
        { name: 'HDFC Custom EV Loan', price: '9.25% interest', url: `https://${target.url}/hdfc-ev`, specs: 'Max Tenure: 5 years, Processing Fee: ₹1,500, Min EMI: ₹1,870 per Lakh' }
      );
    }
    return list;
  }

  async run() {
    try {
      await this.initialize();
      const targets = await this.fetchTargets();
      
      logger.info(`Loaded ${targets.length} active crawl targets from database.`);

      for (const target of targets) {
        await this.crawlTarget(target);
        // Rate-limiting delay between targets
        await new Promise(r => setTimeout(r, 2000));
      }

      const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
      logger.info(`Crawler run complete. Scraped: ${this.stats.crawled}, Failed: ${this.stats.failed}, Duration: ${duration}s`);

    } catch (error) {
      logger.error({ error }, 'Scraper thread crashed');
    } finally {
      if (this.browser) await this.browser.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const http = require('http');
  const crawler = new CTECrawler();
  
  // Start a simple HTTP server to satisfy Cloud Run's port health check
  const PORT = process.env.PORT || 8080;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/crawl') {
      logger.info('Triggered crawler via HTTP request');
      await crawler.run().catch(err => logger.error(err));
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'crawl run completed', stats: crawler.stats }));
    } else if (req.url === '/health' || req.url === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'healthy', service: 'cte-crawler' }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'not found' }));
    }
  });

  server.listen(PORT, () => {
    logger.info(`Crawler HTTP listener started on port ${PORT}`);
  });
}

module.exports = CTECrawler;
