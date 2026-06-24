/**
 * Sovereign Bootstrap Script (v2.0)
 * Writes directly to local storage to guarantee login success.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function bootstrap() {
  console.log("🚀 Bootstrapping Sovereign Admin (Local Fallback Mode)...");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const passwordHash = await bcrypt.hash("admin123", 12);
  const adminUser = {
    id: "user_founder_001",
    email: "admin@evcrm.in",
    password_hash: passwordHash,
    role: "founder",
    name: "System Founder",
    is_active: true,
    created_at: new Date().toISOString()
  };

  try {
    let users = [];
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
    
    // Check if exists
    if (!users.find(u => u.email === adminUser.email)) {
      users.push(adminUser);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      console.log("✅ SUCCESS! Admin account created LOCALLY.");
    } else {
      console.log("ℹ️ Admin account already exists locally.");
    }

    console.log("📧 Email: admin@evcrm.in");
    console.log("🔑 Password: admin123");
    console.log("🌐 Login at: http://localhost:3002/login");
    
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

bootstrap();
