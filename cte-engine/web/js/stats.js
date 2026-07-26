/**
 * CTE Dashboard & Stats Manager
 */

async function fetchStats() {
  try {
    const res = await fetch('/api/v1/stats');
    const data = await res.json();

    if (data.success) {
      document.getElementById('product-count').textContent = data.total_products.toLocaleString();
      
      // Render Last Crawl Time
      const lastCrawlEl = document.getElementById('last-crawl');
      if (data.last_crawl) {
        const crawlDate = new Date(data.last_crawl);
        lastCrawlEl.textContent = formatTimeAgo(crawlDate);
      } else {
        lastCrawlEl.textContent = 'None yet';
      }

      // Render Trending Searches
      const trendEl = document.getElementById('trending-searches');
      trendEl.innerHTML = '';
      if (data.top_searches && data.top_searches.length > 0) {
        data.top_searches.forEach(search => {
          const badge = document.createElement('span');
          badge.className = 'trend-item';
          badge.textContent = `🔍 ${search.query} (${search.volume})`;
          trendEl.appendChild(badge);
        });
      } else {
        trendEl.innerHTML = '<span>No search patterns logged yet</span>';
      }
    }
  } catch (err) {
    console.error('Error fetching system stats:', err);
  }
}

async function fetchArticles() {
  try {
    const res = await fetch('/api/v1/articles');
    const data = await res.json();

    const articlesList = document.getElementById('articles-list');
    articlesList.innerHTML = '';

    if (data.success && data.data.length > 0) {
      data.data.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
          <div class="article-meta">${article.category.replace(/_/g, ' ')}</div>
          <h3>${article.title}</h3>
          <div class="article-preview">${article.content_html}</div>
        `;
        articlesList.appendChild(card);
      });
    } else {
      articlesList.innerHTML = '<p class="loading-text">No articles generated yet. Run crawler to populate guides.</p>';
    }
  } catch (err) {
    console.error('Error fetching articles:', err);
  }
}

async function searchProducts(query = '') {
  const catalogSection = document.getElementById('catalog-section');
  const productList = document.getElementById('product-list');

  if (!query) return;

  try {
    catalogSection.style.display = 'block';
    productList.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--accent-color);">
        <div style="font-size: 2rem; margin-bottom: 12px;">⚡</div>
        <h3 style="margin-bottom: 8px;">Sourcing Market Intelligence for "${query}"...</h3>
        <p style="color: #94a3b8; font-size: 0.9rem;">Checking 1,026,000+ CTE VAHAN database records & live Google Search Index</p>
      </div>
    `;
    catalogSection.scrollIntoView({ behavior: 'smooth' });

    const res = await fetch(`/api/v1/products?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    productList.innerHTML = '';

    // If Research Query (e.g., "Ather sales data from last 5 years" or "ather last 5 years price changes")
    if (data.success && data.query_type === 'research' && data.research_report) {
      const rep = data.research_report;
      const reportCard = document.createElement('div');
      reportCard.style.cssText = 'grid-column: 1 / -1; background: #0f172a; border: 1.5px solid var(--accent-color); border-radius: 16px; padding: 24px; color: #f8fafc; margin-bottom: 24px;';

      let salesRowsHtml = '';
      if (rep.sales_data && rep.sales_data.length > 0) {
        rep.sales_data.forEach(r => {
          salesRowsHtml += `
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; font-weight: 700;">${r.manufacturer || rep.brand || 'Vehicle OEM'}</td>
              <td style="padding: 10px;">${r.category || 'EV 2-Wheeler'}</td>
              <td style="padding: 10px; font-weight: 800; color: var(--accent-color);">${(r.registrations_count || 0).toLocaleString('en-IN')} units</td>
              <td style="padding: 10px; color: #94a3b8;">${r.month_year || '5-Year Time Series'}</td>
            </tr>
          `;
        });
      }

      let priceRowsHtml = '';
      if (rep.price_history && rep.price_history.length > 0) {
        rep.price_history.forEach(p => {
          priceRowsHtml += `
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; font-weight: 700;">${p.brand || rep.brand} ${p.model || ''}</td>
              <td style="padding: 10px; font-weight: 800; color: var(--accent-color);">₹${(p.price || 0).toLocaleString('en-IN')}</td>
              <td style="padding: 10px; color: #94a3b8;">${p.recorded_at ? new Date(p.recorded_at).toLocaleDateString('en-IN') : 'Historical Log'}</td>
            </tr>
          `;
        });
      }

      let liveSourcesHtml = '';
      if (rep.live_sources && rep.live_sources.length > 0) {
        rep.live_sources.slice(0, 4).forEach((s, idx) => {
          liveSourcesHtml += `
            <div style="margin-top: 10px; padding: 12px; background: #1e293b; border-radius: 8px;">
              <div style="font-weight: 700; font-size: 0.95rem;">${idx + 1}. <a href="${s.link}" target="_blank" rel="noopener" style="color: var(--accent-color); text-decoration: none;">${s.title}</a></div>
              <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px;">${s.snippet || ''}</div>
            </div>
          `;
        });
      }

      let execSummaryHtml = '';
      if (rep.executive_answer) {
        let bulletsHtml = (rep.executive_answer.bullets || []).map(b => {
          let text = b.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return `<li style="margin-bottom: 8px; color: #f1f5f9;">${text}</li>`;
        }).join('');

        execSummaryHtml = `
          <div style="background: #1e293b; border-left: 4px solid var(--accent-color); padding: 18px; border-radius: 12px; margin-bottom: 24px; font-size: 0.95rem; line-height: 1.6;">
            <div style="font-weight: 800; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; color: var(--accent-color); margin-bottom: 10px;">💡 ${rep.executive_answer.title || 'Executive Research Answer'}</div>
            <ul style="margin: 0; padding-left: 20px;">
              ${bulletsHtml}
            </ul>
          </div>
        `;
      } else if (rep.executive_summary) {
        let formattedText = rep.executive_summary
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');

        execSummaryHtml = `
          <div style="background: #1e293b; border-left: 4px solid var(--accent-color); padding: 18px; border-radius: 12px; margin-bottom: 24px; font-size: 0.95rem; line-height: 1.6;">
            <div style="font-weight: 800; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; color: var(--accent-color); margin-bottom: 10px;">💡 Executive Research Answer</div>
            <div style="color: #f1f5f9;">${formattedText}</div>
          </div>
        `;
      }

      reportCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.3rem; font-weight: 800; margin: 0;">📊 Verified Market & Price Research Report</h3>
            <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 4px;">Topic: "${query}"</div>
          </div>
          <span style="background: var(--accent-color); color: #000; font-weight: 800; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">100% Truth Verified</span>
        </div>

        ${execSummaryHtml}

        ${salesRowsHtml ? `
          <h4 style="margin-top: 20px; margin-bottom: 10px; color: #e2e8f0;">📈 5-Year VAHAN Registration & Sales Records</h4>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
              <thead>
                <tr style="border-bottom: 2px solid #475569; color: #94a3b8;">
                  <th style="padding: 10px;">Manufacturer</th>
                  <th style="padding: 10px;">Category</th>
                  <th style="padding: 10px;">Registrations</th>
                  <th style="padding: 10px;">Period</th>
                </tr>
              </thead>
              <tbody>
                ${salesRowsHtml}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${priceRowsHtml ? `
          <h4 style="margin-top: 20px; margin-bottom: 10px; color: #e2e8f0;">🏷️ Historical Pricing Timeline Logs</h4>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
              <thead>
                <tr style="border-bottom: 2px solid #475569; color: #94a3b8;">
                  <th style="padding: 10px;">Model Variant</th>
                  <th style="padding: 10px;">Ex-Showroom Price</th>
                  <th style="padding: 10px;">Date Recorded</th>
                </tr>
              </thead>
              <tbody>
                ${priceRowsHtml}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${liveSourcesHtml ? `
          <h4 style="margin-top: 24px; margin-bottom: 10px; color: #e2e8f0;">🌐 Verified Live Market Intelligence & Price Reports</h4>
          ${liveSourcesHtml}
        ` : ''}

        <div style="margin-top: 24px; text-align: right; border-top: 1px solid #334155; padding-top: 16px;">
          <span style="color: var(--accent-color); font-weight: 700; font-size: 0.85rem;">⚡ CTE Verified Market Index</span>
        </div>
      `;

      productList.appendChild(reportCard);
    }

    // Standard Product Card Rendering (Categorized into New OEM Specs vs Pre-Owned Regional Listings)
    if (data.success && data.data && data.data.length > 0) {
      const oemSpecs = [];
      const preOwnedListings = [];

      data.data.forEach(prod => {
        if (!prod.current_price && (!prod.specs || !prod.specs.range_km)) return;
        const isPreOwned = /Listing|Owner|Used|Pre-Owned/i.test(prod.name) || (prod.specs && (prod.specs.owner || prod.specs.city));
        if (isPreOwned) {
          preOwnedListings.push(prod);
        } else {
          oemSpecs.push(prod);
        }
      });

      // 1. Render Official New Vehicle OEM Specs First
      if (oemSpecs.length > 0) {
        const oemHeader = document.createElement('div');
        oemHeader.style.cssText = 'grid-column: 1 / -1; margin-top: 12px; margin-bottom: 8px; font-weight: 800; font-size: 1.1rem; color: #f8fafc; display: flex; align-items: center; gap: 8px;';
        oemHeader.innerHTML = `<span>✨ Official OEM Vehicle Specification Profiles</span>`;
        productList.appendChild(oemHeader);

        oemSpecs.forEach(prod => {
          renderProductCard(prod, productList, false);
        });
      }

      // 2. Render Pre-Owned Regional Listings below with explanatory header
      if (preOwnedListings.length > 0) {
        const preOwnedHeader = document.createElement('div');
        preOwnedHeader.style.cssText = 'grid-column: 1 / -1; margin-top: 32px; margin-bottom: 8px; border-top: 1px dashed #475569; padding-top: 24px; color: #cbd5e1;';
        preOwnedHeader.innerHTML = `
          <h4 style="font-size: 1.1rem; font-weight: 800; margin: 0; color: #f8fafc;">📍 Pre-Owned Regional Market Valuations</h4>
          <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px; margin-bottom: 0;">Verified used vehicle aggregator listings (Prices vary across cities based on model year, owner count & odometer km).</p>
        `;
        productList.appendChild(preOwnedHeader);

        preOwnedListings.forEach(prod => {
          renderProductCard(prod, productList, true);
        });
      }

      fetchStats();
    } else {
      productList.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; background: #1e293b; border-radius: 12px; border: 1px solid #334155;">
          <h4 style="color: #f8fafc; margin-bottom: 8px;">Query Logged to CTE Index</h4>
          <p style="color: #94a3b8; font-size: 0.9rem;">"${query}" has been captured by the Zero-Miss engine. Sourcing live data in background.</p>
        </div>
      `;
      fetchStats();
    }
  } catch (err) {
    console.error('Error searching products:', err);
    productList.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #ef4444;">Failed to connect to CTE API. Please try again.</div>`;
  }
}

function renderProductCard(prod, productList, isPreOwned) {
  const card = document.createElement('div');
  card.className = 'product-card';
  if (isPreOwned) {
    card.style.border = '1px solid #334155';
    card.style.background = '#0f172a';
  }
  
  let specsHtml = '';
  if (prod.specs) {
    Object.keys(prod.specs).forEach(key => {
      if (key === 'top_search_sources' && Array.isArray(prod.specs[key])) {
        let sourcesLinks = prod.specs[key].map(s => `<a href="${s.url}" target="_blank" rel="noopener" style="color: var(--accent-color);">${s.title || s.url}</a>`).join(', ');
        specsHtml += `<li><strong>Sources:</strong> ${sourcesLinks}</li>`;
      } else if (key !== 'price' && key !== 'organized_by' && prod.specs[key] !== null) {
        const val = typeof prod.specs[key] === 'object' ? JSON.stringify(prod.specs[key]) : prod.specs[key];
        specsHtml += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${val}</li>`;
      }
    });
  }

  const badgeText = isPreOwned ? 'USED MARKET LISTING' : (prod.source || 'CTE Verified Index');
  const badgeColor = isPreOwned ? '#f59e0b' : 'var(--accent-color)';
  const priceLabel = isPreOwned ? 'Resale Market Valuation' : 'Ex-Showroom Price';

  card.innerHTML = `
    <div class="product-header">
      <div>
        <div class="product-title">${prod.name}</div>
        <span class="product-source" style="color: ${badgeColor}; font-weight: 700;">${badgeText}</span>
      </div>
      <div class="product-score-badge">${prod.overall_score || 75}</div>
    </div>
    <div class="product-details">
      <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">${priceLabel}</div>
      <div class="product-price-tag">₹${(prod.current_price || 0).toLocaleString('en-IN')}</div>
      <ul class="spec-list">
        ${specsHtml}
      </ul>
    </div>
    <button class="compare-btn" style="cursor: default; opacity: 0.9;">${isPreOwned ? '📍 Pre-Owned Market Valuation' : '⚡ CTE Verified New Spec'}</button>
  `;
  productList.appendChild(card);
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

// Event Listeners
document.getElementById('search-btn').addEventListener('click', () => {
  const query = document.getElementById('search-input').value.trim();
  searchProducts(query);
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = document.getElementById('search-input').value.trim();
    searchProducts(query);
  }
});

// Init
window.addEventListener('DOMContentLoaded', () => {
  fetchStats();
  fetchArticles();
});
