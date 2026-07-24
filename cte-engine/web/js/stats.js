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
  try {
    const res = await fetch(`/api/v1/products?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    const catalogSection = document.getElementById('catalog-section');
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';

    if (data.success && data.data.length > 0) {
      catalogSection.style.display = 'block';
      data.data.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let specsHtml = '';
        if (prod.specs) {
          Object.keys(prod.specs).forEach(key => {
            if (key !== 'price') {
              specsHtml += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${prod.specs[key]}</li>`;
            }
          });
        }

        card.innerHTML = `
          <div class="product-header">
            <div>
              <div class="product-title">${prod.name}</div>
              <span class="product-source">${prod.source}</span>
            </div>
            <div class="product-score-badge">${prod.overall_score}</div>
          </div>
          <div class="product-details">
            <div class="product-price-tag">₹${(prod.current_price || 0).toLocaleString('en-IN')}</div>
            <ul class="spec-list">
              ${specsHtml}
            </ul>
          </div>
          <button class="compare-btn">Specs Transparency Verified</button>
        `;
        productList.appendChild(card);
      });
      
      // Smooth scroll to catalog section
      catalogSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      if (query !== '') {
        alert('No vehicles found matching search. The query has been logged to help seed targets.');
        fetchStats(); // Update trending list since query was logged
      }
    }
  } catch (err) {
    console.error('Error searching products:', err);
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
