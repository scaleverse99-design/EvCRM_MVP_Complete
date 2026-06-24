// This script seeds the Firestore database with initial mock data
// Run with: node tmp/seed_firebase.js

const admin = require('firebase-admin');
const path = require('path');

// You need to set these env vars or have a service account file
// For this environment, we'll assume the env vars are readable or the agent can provide them.
// Since I'm the agent, I'll write the script to use the project ID if available.

if (!process.env.FIREBASE_PROJECT_ID) {
  console.error("FIREBASE_PROJECT_ID not set");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault() // or cert() if we had the file
});

const db = admin.firestore();

const leads = [
  { name:"Amit Verma",    vehicle:"Tata Nexon EV Max",   source:"walkin",    status:"HOT",  score:9.2, time:"2h ago",  repId:null, phone:"+91 98765 43210", comment:"Very interested, price thoda zyada lag raha hai", created_at: new Date().toISOString() },
  { name:"Sneha Patel",   vehicle:"Ather 450X Gen 3",    source:"instagram", status:"HOT",  score:8.7, time:"4h ago",  repId:null, phone:"+91 87654 32109", comment:"Test drive book karni hai aaj", created_at: new Date().toISOString() },
  { name:"Rajesh Kumar",  vehicle:"Ola S1 Pro",          source:"showroom",  status:"WARM", score:7.1, time:"1d ago",  repId:null, phone:"+91 76543 21098", comment:"EMI options poochha tha, follow up pending", created_at: new Date().toISOString() },
  { name:"Divya Sharma",  vehicle:"TVS iQube ST",        source:"facebook",  status:"WARM", score:6.4, time:"2d ago",  repId:null, phone:"+91 65432 10987", comment:"Husband ko dikhana hai pehle", created_at: new Date().toISOString() },
  { name:"Karan Mehta",   vehicle:"Okaya Faast F4",      source:"instagram", status:"NEW",  score:8.9, time:"30m ago", repId:null, phone:"+91 54321 09876", comment:"Fresh enquiry from Instagram campaign", created_at: new Date().toISOString() },
  { name:"Pooja Nair",    vehicle:"Bajaj Chetak Premium",source:"referral",  status:"HOT",  score:8.4, time:"3h ago",  repId:null, phone:"+91 43210 98765", comment:"Ready to book, needs final price confirmation", created_at: new Date().toISOString() },
];

async function seed() {
  console.log("Seeding evcrm_leads...");
  for (const lead of leads) {
    await db.collection('evcrm_leads').add(lead);
    console.log(`Added lead: ${lead.name}`);
  }
  console.log("Seeding complete!");
}

seed().catch(console.error);
