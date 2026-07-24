const fs = require('fs');
const path = require('path');

const manufacturers = [
  { name: 'Ather Energy', model: '450X', category: 'ev_two_wheeler', baseVolume: 300, growthRate: 0.05 },
  { name: 'Ola Electric', model: 'S1 Pro', category: 'ev_two_wheeler', baseVolume: 500, growthRate: 0.08, startYear: 2021, startMonth: 9 }, // Launched late 2021
  { name: 'TVS Motor', model: 'iQube', category: 'ev_two_wheeler', baseVolume: 150, growthRate: 0.06 },
  { name: 'Bajaj Auto', model: 'Chetak', category: 'ev_two_wheeler', baseVolume: 100, growthRate: 0.04 },
  { name: 'Hero Electric', model: 'Photon', category: 'ev_two_wheeler', baseVolume: 400, growthRate: -0.02 }, // Declined later
  { name: 'Tata Motors', model: 'Nexon EV', category: 'ev_four_wheeler', baseVolume: 200, growthRate: 0.07 },
  { name: 'Mahindra & Mahindra', model: 'XUV400', category: 'ev_four_wheeler', baseVolume: 50, growthRate: 0.03, startYear: 2023, startMonth: 1 } // Launched 2023
];

const states = ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Uttar Pradesh', 'Gujarat', 'Rajasthan'];

function generateData() {
  const records = [];
  records.push('manufacturer,model,category,registrations_count,month_year,state');

  const startYear = 2021;
  const endYear = 2026;
  const endMonth = 7; // up to July 2026

  for (let year = startYear; year <= endYear; year++) {
    const maxMonth = (year === endYear) ? endMonth : 12;
    for (let month = 1; month <= maxMonth; month++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      // Calculate months elapsed since Jan 2021
      const monthsElapsed = (year - startYear) * 12 + (month - 1);

      for (const mfg of manufacturers) {
        // Check if model was launched yet
        if (mfg.startYear && (year < mfg.startYear || (year === mfg.startYear && month < mfg.startMonth))) {
          continue;
        }

        // Base volume grows monthly
        let monthlyVolume = mfg.baseVolume * Math.pow(1 + mfg.growthRate, monthsElapsed);

        // Add some seasonality (higher in festival season Oct-Nov, lower in March)
        if (month === 10 || month === 11) {
          monthlyVolume *= 1.35; // Oct-Nov spike
        } else if (month === 3) {
          monthlyVolume *= 0.85; // March dip
        }

        // Add slight random noise
        monthlyVolume *= (0.9 + Math.random() * 0.2);

        // Distribute volume across states
        let remainingVolume = Math.round(monthlyVolume);
        
        states.forEach((state, index) => {
          let stateShare = 0.15; // default share
          if (state === 'Maharashtra') stateShare = 0.25;
          if (state === 'Karnataka') stateShare = 0.22;
          if (state === 'Delhi') stateShare = 0.18;
          if (state === 'Tamil Nadu') stateShare = 0.15;
          
          let stateVolume = Math.round(monthlyVolume * stateShare * (0.85 + Math.random() * 0.3));
          if (index === states.length - 1) {
            stateVolume = Math.max(0, remainingVolume);
          } else {
            remainingVolume -= stateVolume;
          }

          if (stateVolume > 0) {
            records.push(`"${mfg.name}","${mfg.model}","${mfg.category}",${stateVolume},"${dateStr}","${state}"`);
          }
        });
      }
    }
  }

  const csvContent = records.join('\n');
  fs.writeFileSync(path.join(__dirname, 'historical_seed.csv'), csvContent, 'utf8');
  console.log(`Generated ${records.length - 1} VAHAN registration seed records in historical_seed.csv`);
}

generateData();
