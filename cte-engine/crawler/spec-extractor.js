/**
 * CTE Spec Extractor & Article Generator (No AI)
 * Uses deterministic rule-based regex and HTML parsing.
 */

const pino = require('pino');
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const CATEGORY_RULES = {
  ev_two_wheeler: {
    required_specs: ['range_km', 'charging_hours', 'price'],
    weights: { range_km: 0.4, charging_hours: 0.3, price: 0.3 }
  },
  used_car: {
    required_specs: ['mileage', 'year', 'price'],
    weights: { mileage: 0.3, age: 0.4, price: 0.3 }
  },
  auto_insurance: {
    required_specs: ['premium_price', 'coverage_types'],
    weights: { premium_price: 0.5, coverage_types: 0.5 }
  },
  auto_loan: {
    required_specs: ['interest_rate', 'emi'],
    weights: { interest_rate: 0.6, emi: 0.4 }
  }
};

/**
 * Regex-based spec extractor for different categories
 */
function extractSpecs(product, category) {
  const textContent = `${product.name} ${product.specs || ''} ${product.html || ''}`.toLowerCase();
  const specs = {};

  // Extract price
  if (product.price) {
    specs.price = parseInt(product.price.toString().replace(/\D/g, '')) || 0;
  } else {
    // Attempt price regex from text
    const priceMatch = textContent.match(/(?:rs\.?|₹|inr)\s*([\d,]+)/i);
    if (priceMatch) {
      specs.price = parseInt(priceMatch[1].replace(/,/g, '')) || 0;
    }
  }

  if (category === 'ev_two_wheeler') {
    // Range KM
    const rangeMatch = textContent.match(/(\d+)\s*(?:km|range|kms|kilometer)/i);
    specs.range_km = rangeMatch ? parseInt(rangeMatch[1]) : null;

    // Charging Hours
    const chargingMatch = textContent.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour|hrs|hours|charging\s*time)/i);
    specs.charging_hours = chargingMatch ? parseFloat(chargingMatch[1]) : null;

    // Battery capacity
    const batteryMatch = textContent.match(/(\d+(?:\.\d+)?)\s*(?:kwh|battery\s*capacity|battery)/i);
    specs.battery_kwh = batteryMatch ? parseFloat(batteryMatch[1]) : null;

  } else if (category === 'used_car') {
    // Year
    const yearMatch = textContent.match(/\b(20\d{2})\b/);
    specs.year = yearMatch ? parseInt(yearMatch[1]) : null;

    // Mileage
    const mileageMatch = textContent.match(/(\d+(?:,\d+)?)\s*(?:km|kms|kilometer|mileage|driven)/i);
    if (mileageMatch) {
      specs.mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
    }

  } else if (category === 'auto_insurance') {
    // Coverage type
    specs.coverage_types = textContent.includes('comprehensive') ? 'Comprehensive' 
                          : textContent.includes('third party') ? 'Third Party' 
                          : 'Standard';

    // Premium price (fallback to price)
    specs.premium_price = specs.price || null;

  } else if (category === 'auto_loan') {
    // Interest rate
    const rateMatch = textContent.match(/\b(\d+(?:\.\d+)?)\s*%/);
    specs.interest_rate = rateMatch ? parseFloat(rateMatch[1]) : null;

    // EMI
    const emiMatch = textContent.match(/(?:emi\s*(?:of|starts\s*at)?\s*(?:rs\.?|₹)?\s*([\d,]+))/i);
    if (emiMatch) {
      specs.emi = parseInt(emiMatch[1].replace(/,/g, ''));
    }
  }

  const score = scoreProduct(specs, category);
  return { specs, score };
}

/**
 * Deterministic scoring algorithm
 */
function scoreProduct(specs, category) {
  let score = 50; // Base score

  if (category === 'ev_two_wheeler') {
    if (specs.range_km) {
      if (specs.range_km >= 120) score += 25;
      else if (specs.range_km >= 80) score += 15;
      else score += 5;
    }
    if (specs.charging_hours) {
      if (specs.charging_hours <= 3) score += 25;
      else if (specs.charging_hours <= 5) score += 15;
      else score -= 5;
    }
    if (specs.price) {
      if (specs.price < 120000) score += 10;
      else if (specs.price <= 160000) score += 5;
    }
  } else if (category === 'used_car') {
    if (specs.year) {
      const age = new Date().getFullYear() - specs.year;
      if (age <= 3) score += 25;
      else if (age <= 6) score += 15;
      else score += 5;
    }
    if (specs.mileage) {
      if (specs.mileage < 40000) score += 25;
      else if (specs.mileage < 80000) score += 15;
      else score -= 5;
    }
  } else if (category === 'auto_insurance') {
    if (specs.premium_price) {
      if (specs.premium_price < 5000) score += 30;
      else if (specs.premium_price <= 10000) score += 15;
    }
    if (specs.coverage_types === 'Comprehensive') score += 20;
  } else if (category === 'auto_loan') {
    if (specs.interest_rate) {
      if (specs.interest_rate < 8.5) score += 30;
      else if (specs.interest_rate <= 10.5) score += 15;
      else score -= 10;
    }
  }

  const overall = Math.min(Math.max(Math.round(score), 10), 100);

  return {
    overall,
    quality: Math.min(overall + 5, 100),
    value: Math.max(overall - 3, 30),
    satisfaction: Math.min(overall - 2, 95)
  };
}

/**
 * Generate SEO blog posts and news articles automatically on changes
 */
function generateArticlesFromData(newProducts, category) {
  const articles = [];
  const news = [];

  if (newProducts.length === 0) return { articles, news };

  // Sort products by overall score descending
  const sorted = [...newProducts].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
  const topProduct = sorted[0];

  // Article 1: Best Value Guide
  if (topProduct && topProduct.current_price) {
    const slug = `${category}-transparency-ranking-${Date.now()}`;
    const categoryName = category.replace(/_/g, ' ').toUpperCase();
    const title = `Top Rated ${categoryName} in India: Quality & Transparency Report`;
    
    let contentHtml = `
      <article>
        <h1>${title}</h1>
        <p>In our latest transparency assessment of the Indian ${categoryName} market, we analyzed pricing and technical specifications directly from manufacturers' official listings. Our goal is to highlight which models offer genuine quality and price fairness rather than marketing hype.</p>
        
        <h2>Winner: ${topProduct.name} (Score: ${topProduct.overall_score}/100)</h2>
        <p>The <strong>${topProduct.name}</strong> from <strong>${topProduct.brand || topProduct.source}</strong> emerged as the top performer, offering an excellent price-to-specification ratio.</p>
        <ul>
          <li><strong>Current Price:</strong> ₹${topProduct.current_price.toLocaleString('en-IN')}</li>
          <li><strong>Quality Score:</strong> ${topProduct.quality_score}/100</li>
          <li><strong>Value Score:</strong> ${topProduct.value_score}/100</li>
        </ul>
        
        <h2>Full Category Standings</h2>
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>Model Name</th>
              <th>Source</th>
              <th>Price</th>
              <th>Transparency Score</th>
            </tr>
          </thead>
          <tbody>
    `;

    sorted.slice(0, 5).forEach(p => {
      contentHtml += `
        <tr>
          <td>${p.name}</td>
          <td>${p.source}</td>
          <td>₹${(p.current_price || 0).toLocaleString('en-IN')}</td>
          <td><strong>${p.overall_score}/100</strong></td>
        </tr>
      `;
    });

    contentHtml += `
          </tbody>
        </table>
        
        <p style="margin-top: 20px;"><em>Disclaimer: Scores are calculated dynamically based on manufacturer-published specifications using standard transparency metrics.</em></p>
      </article>
    `;

    articles.push({
      slug,
      title,
      content_html: contentHtml,
      category
    });
  }

  // News Update: Launch Notification
  newProducts.forEach(p => {
    news.push({
      title: `New Product Detected: ${p.name} Scored`,
      content: `The product "${p.name}" has been detected by the Consumer Transparency Engine. Based on early parsed parameters, we assigned a Transparency Score of ${p.overall_score}/100, indicating high specifications alignment.`,
      source_url: p.url,
      category
    });
  });

  return { articles, news };
}

module.exports = {
  extractSpecs,
  scoreProduct,
  generateArticlesFromData
};
