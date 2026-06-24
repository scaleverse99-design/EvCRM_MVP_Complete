const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const users = [
  {
    id: "user_founder_001",
    email: "admin@evcrm.in",
    password_hash: bcrypt.hashSync("admin123", 12),
    role: "founder",
    name: "System Founder",
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const target = path.join(__dirname, '..', 'data', 'users.json');
fs.writeFileSync(target, JSON.stringify(users, null, 2));
console.log("✅ Admin seeded at: " + target);
