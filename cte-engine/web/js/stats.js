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
        <h3 style="margin-bottom: 8px;">Sourcing Intelligence for "${query}"...</h3>
        <p style="color: #94a3b8; font-size: 0.9rem;">Checking 1,026,000+ CTE database records & live Google Search Index</p>
      </div>
    `;
    catalogSection.scrollIntoView({ behavior: 'smooth' });

    const res = await fetch(`/api/v1/products?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    productList.innerHTML = '';

    if (data.success && data.data && data.data.length > 0) {
      data.data.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let specsHtml = '';
        if (prod.specs) {
          Object.keys(prod.specs).forEach(key => {
            if (key !== 'price' && key !== 'top_search_sources' && key !== 'organized_by') {
              const val = typeof prod.specs[key] === 'object' ? JSON.stringify(prod.specs[key]) : prod.specs[key];
              specsHtml += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${val}</li>`;
            }
          });
        }

        card.innerHTML = `
          <div class="product-header">
            <div>
              <div class="product-title">${prod.name}</div>
              <span class="product-source">${prod.source || 'CTE Verified Index'}</span>
            </div>
            <div class="product-score-badge">${prod.overall_score || 75}</div>
          </div>
          <div class="product-details">
            <div class="product-price-tag">₹${(prod.current_price || 0).toLocaleString('en-IN')}</div>
            <ul class="spec-list">
              ${specsHtml}
            </ul>
          </div>
          <button class="compare-btn" onclick="window.open('https://evcrm.in/compare', '_blank')">Compare & Book on EvCRM ↗</button>
        `;
        productList.appendChild(card);
      });
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
