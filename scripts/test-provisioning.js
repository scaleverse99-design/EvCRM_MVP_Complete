/**
 * OPS MANAGER V6.0 — Full Backend Logic Test
 * This script simulates the provisioning flow without the browser.
 */

import { google } from 'googleapis';
import { ProvisioningFactory } from '../lib/provisioning-factory.js';
import { listAllClients } from '../lib/master-registry.js';

async function test() {
  const token = process.argv[2];
  if (!token) {
    console.error('Please provide a Google Access Token');
    process.exit(1);
  }

  // 1. Setup Auth
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });

  // 2. Test Provisioning Factory
  const factory = new ProvisioningFactory(oauth2Client);
  console.log('🚀 TESTING PROVISIONING FLOW...');
  
  try {
    const result = await factory.setupNewBusiness(
      'Simulation Test ' + Math.floor(Math.random() * 1000),
      'restaurant',
      { 
        domain: 'sim-' + Math.floor(Math.random() * 1000) + '.socialcom.store',
        ownerEmail: 'scaleverse99@gmail.com'
      }
    );
    
    console.log('✅ PROVISIONING SUCCESSFUL!');
    console.log('Result:', JSON.stringify(result, null, 2));

    // 3. Test Registry Listing
    console.log('\n🚀 TESTING REGISTRY LISTING...');
    const clients = await listAllClients();
    console.log(`✅ FOUND ${Object.keys(clients).length} CLIENTS IN REGISTRY`);
    
    const lastClient = Object.values(clients).pop();
    console.log('Last Client in Registry:', lastClient.businessName);

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    if (err.response) {
      console.error('API Error Details:', JSON.stringify(err.response.data, null, 2));
    }
    console.error(err.stack);
  }
}

test().catch(console.error);
