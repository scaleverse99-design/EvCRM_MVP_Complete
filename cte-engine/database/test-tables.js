const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function test() {
  console.log('Checking tables...');
  
  const { data: priceData, error: priceErr } = await supabase
    .from('price_history')
    .select('*')
    .limit(1);
    
  if (priceErr) {
    console.error('price_history table does not exist or error:', priceErr.message);
  } else {
    console.log('price_history table exists!');
  }

  const { data: regData, error: regErr } = await supabase
    .from('registration_data')
    .select('*')
    .limit(1);
    
  if (regErr) {
    console.error('registration_data table does not exist or error:', regErr.message);
  } else {
    console.log('registration_data table exists!');
  }
}

test();
