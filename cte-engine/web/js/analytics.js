document.addEventListener('DOMContentLoaded', () => {
  let priceChart = null;
  let demandChart = null;

  // Initialize Price Trends Chart
  async function initPriceTrends(brand = 'ather') {
    try {
      const res = await fetch(`/api/v1/analytics/price-trends?brand=${brand}`);
      const body = await res.json();
      
      if (!body.success) {
        console.error('Failed to fetch price trends:', body.error);
        return;
      }

      const rawData = body.data || [];
      
      // Group price points by recorded date
      const dates = [...new Set(rawData.map(d => d.recorded_at))].sort();
      const prices = dates.map(date => {
        const point = rawData.find(d => d.recorded_at === date);
        return point ? point.price : null;
      });

      const ctx = document.getElementById('priceChart').getContext('2d');
      
      if (priceChart) {
        priceChart.destroy();
      }

      priceChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
          }),
          datasets: [{
            label: `${brand.toUpperCase()} Ex-Showroom Price (₹)`,
            data: prices,
            borderColor: '#84cc16',
            backgroundColor: 'rgba(132, 204, 22, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#84cc16'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#f3f4f6', font: { family: 'Plus Jakarta Sans' } }
            }
          },
          scales: {
            x: {
              grid: { color: '#1f2937' },
              ticks: { color: '#9ca3af' }
            },
            y: {
              grid: { color: '#1f2937' },
              ticks: {
                color: '#9ca3af',
                callback: function(value) {
                  return '₹' + value.toLocaleString('en-IN');
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Error initializing price trends chart:', err);
    }
  }

  // Initialize Demand / Registrations Share Chart
  async function initDemandShare() {
    try {
      const res = await fetch('/api/v1/analytics/demand-share');
      const body = await res.json();
      
      if (!body.success) {
        console.error('Failed to fetch demand share:', body.error);
        return;
      }

      const rawData = body.data || [];
      
      // Get unique month keys sorted ascending
      const months = [...new Set(rawData.map(d => d.month_year))].sort();
      const manufacturers = [...new Set(rawData.map(d => d.manufacturer))];

      // Build dataset for each manufacturer
      const datasets = manufacturers.map((mfg, idx) => {
        const colors = [
          '#84cc16', // Ola / Ather green
          '#3b82f6', // blue
          '#ec4899', // pink
          '#f59e0b', // amber
          '#10b981', // emerald
          '#8b5cf6', // violet
          '#ef4444'  // red
        ];

        return {
          label: mfg,
          data: months.map(m => {
            const matches = rawData.filter(d => d.month_year === m && d.manufacturer === mfg);
            return matches.reduce((sum, item) => sum + item.registrations_count, 0);
          }),
          backgroundColor: colors[idx % colors.length]
        };
      });

      const ctx = document.getElementById('demandChart').getContext('2d');
      
      if (demandChart) {
        demandChart.destroy();
      }

      demandChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months.map(m => {
            const date = new Date(m);
            return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
          }),
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#f3f4f6', font: { family: 'Plus Jakarta Sans' } }
            }
          },
          scales: {
            x: {
              stacked: true,
              grid: { color: '#1f2937' },
              ticks: { color: '#9ca3af' }
            },
            y: {
              stacked: true,
              grid: { color: '#1f2937' },
              ticks: { color: '#9ca3af' }
            }
          }
        }
      });
    } catch (err) {
      console.error('Error initializing demand share chart:', err);
    }
  }

  // Handle brand dropdown selection change
  const brandSelect = document.getElementById('brand-select');
  if (brandSelect) {
    brandSelect.addEventListener('change', (e) => {
      initPriceTrends(e.target.value);
    });
  }

  // Load initial charts
  initPriceTrends('ather');
  initDemandShare();
});
