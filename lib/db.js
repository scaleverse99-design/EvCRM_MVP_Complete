import fs from 'fs';
import path from 'path';

const OPSMANAGER_URL = process.env.OPSMANAGER_URL;
const OPSMANAGER_TOKEN = process.env.OPSMANAGER_TOKEN;

// Local Storage Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const LOGS_FILE = path.join(DATA_DIR, 'auth_logs.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

async function callOps(action) {
  if (!OPSMANAGER_URL) return null;
  
  try {
    const res = await fetch(OPSMANAGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: OPSMANAGER_TOKEN,
        actions: [{ appId: 'ev-crm', ...action }]
      })
    });
    const result = await res.json();
    return result.success ? (result.results?.[0]?.data || result.results?.[0]) : null;
  } catch (err) {
    console.warn("[SovereignDB] Ops Manager unreachable. Falling back to local storage.");
    return null;
  }
}

// ── Local File Helpers ───────────────────────────────────────────

function readLocal(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return []; }
}

function writeLocal(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
}

// ── User Queries ─────────────────────────────────────────────────

export async function findUserByEmail(email) {
  const emailClean = email.toLowerCase().trim();
  
  // 1. Try Ops Manager
  let user = await callOps({
    type: 'QUERY_RECORDS',
    data: { sheet: 'evcrm_users', filter: { email: emailClean } }
  });
  if (Array.isArray(user)) user = user[0];

  // 2. Fallback to Local
  if (!user) {
    const users = readLocal(USERS_FILE);
    user = users.find(u => u.email === emailClean);
  }

  return user || null;
}

export async function findUserById(id) {
  // 1. Try Ops Manager
  let user = await callOps({
    type: 'QUERY_RECORDS',
    data: { sheet: 'evcrm_users', filter: { id } }
  });
  if (Array.isArray(user)) user = user[0];

  // 2. Fallback to Local
  if (!user) {
    const users = readLocal(USERS_FILE);
    user = users.find(u => u.id === id);
  }

  return user || null;
}

export async function createUser(userData) {
    const newUser = { 
        ...userData, 
        id: userData.id || `user_${Date.now()}`, 
        created_at: new Date().toISOString() 
    };

    // 1. Write Local (Safety First)
    const users = readLocal(USERS_FILE);
    users.push(newUser);
    writeLocal(USERS_FILE, users);

    // 2. Try Ops Manager (Cloud Sync)
    await callOps({
        type: 'WRITE_RECORD',
        data: { sheet: 'evcrm_users', row: newUser }
    });

    return newUser;
}

// ── Session Queries ───────────────────────────────────────────────

export async function createSession(userId, tokenHash, ipAddress, userAgent) {
  const session = {
    id: `sess_${Date.now()}`,
    user_id: userId,
    token_hash: tokenHash,
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  };
  
  // 1. Write Local
  const sessions = readLocal(SESSIONS_FILE);
  sessions.push(session);
  writeLocal(SESSIONS_FILE, sessions);

  // 2. Try Ops Manager
  await callOps({
    type: 'WRITE_RECORD',
    data: { sheet: 'evcrm_sessions', row: session }
  });

  return session;
}

export async function findSession(tokenHash) {
  // 1. Try Ops Manager
  let sessions = await callOps({
    type: 'QUERY_RECORDS',
    data: { sheet: 'evcrm_sessions', filter: { token_hash: tokenHash } }
  });
  
  let session = Array.isArray(sessions) ? sessions[0] : sessions;

  // 2. Fallback to Local
  if (!session) {
    const localSessions = readLocal(SESSIONS_FILE);
    session = localSessions.find(s => s.token_hash === tokenHash);
  }

  if (!session) return null;

  // Check expiration
  if (new Date(session.expires_at) < new Date()) return null;

  // Fetch user
  const user = await findUserById(session.user_id);
  if (!user) return null;

  return { ...session, evcrm_users: user };
}

export async function deleteSession(tokenHash) {
  // 1. Delete Local
  const sessions = readLocal(SESSIONS_FILE);
  const filtered = sessions.filter(s => s.token_hash !== tokenHash);
  writeLocal(SESSIONS_FILE, filtered);

  // 2. Try Ops Manager
  await callOps({
    type: 'DELETE_RECORD',
    data: { sheet: 'evcrm_sessions', filter: { token_hash: tokenHash } }
  });
}

// ── Auth Logs & Tracking ──────────────────────────────────────────

export async function logLoginAttempt(email, ip, success) {
  const log = {
    timestamp: new Date().toISOString(),
    email,
    ip,
    success
  };
  
  // 1. Write to Ops Manager (Cloud Sync)
  await callOps({
    type: 'WRITE_RECORD',
    data: { sheet: 'evcrm_auth_logs', row: log }
  });

  // 2. Local Fallback (Only if writeable)
  try {
    const logs = readLocal(LOGS_FILE);
    logs.unshift(log);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, 100), null, 2));
  } catch (e) {
    // Silently ignore fs errors in read-only production envs
  }
}

export async function countRecentFailedAttempts(email, ip) {
  // Try to fetch from Ops Manager for accuracy
  const logs = await callOps({
    type: 'QUERY_RECORDS',
    data: { sheet: 'evcrm_auth_logs' }
  }) || readLocal(LOGS_FILE);

  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  const recent = logs.filter(l => new Date(l.timestamp).getTime() > fifteenMinsAgo && !l.success);
  
  return {
    emailCount: recent.filter(l => l.email === email).length,
    ipCount: recent.filter(l => l.ip === ip).length
  };
}

export async function updateLastLogin(userId) {
  // 1. Sync to Ops Manager
  await callOps({
    type: 'UPDATE_RECORD',
    data: { 
      sheet: 'evcrm_users', 
      filter: { id: userId }, 
      update: { last_login: new Date().toISOString() } 
    }
  });

  // 2. Local Fallback
  try {
    const users = readLocal(USERS_FILE);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].last_login = new Date().toISOString();
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
  } catch (e) {}
}

// ── OTP & Password Updates (Decentralized Sync) ─────────────────────
const OTPS_FILE = path.join(DATA_DIR, 'otps.json');

export async function updateUserPassword(email, passwordHash) {
  const emailClean = email.toLowerCase().trim();
  
  // 1. Sync to Ops Manager
  await callOps({
    type: 'UPDATE_RECORD',
    data: {
      sheet: 'evcrm_users',
      filter: { email: emailClean },
      update: { password_hash: passwordHash, updated_at: new Date().toISOString() }
    }
  });

  // 2. Local Fallback
  try {
    const users = readLocal(USERS_FILE);
    const idx = users.findIndex(u => u.email === emailClean);
    if (idx !== -1) {
      users[idx].password_hash = passwordHash;
      users[idx].updated_at = new Date().toISOString();
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
  } catch (e) {}
}

export async function createOTP(email, otpHash, purpose = "password_reset") {
  const emailClean = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  
  // Delete any existing unused OTPs for this email+purpose locally
  const otps = readLocal(OTPS_FILE);
  const filtered = otps.filter(o => !(o.email === emailClean && o.purpose === purpose));
  
  const otpRecord = {
    id: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    email: emailClean,
    otp_hash: otpHash,
    purpose,
    used: false,
    attempts: 0,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };
  
  filtered.push(otpRecord);
  writeLocal(OTPS_FILE, filtered);

  // Sync to Ops Manager
  await callOps({
    type: 'WRITE_RECORD',
    data: { sheet: 'evcrm_otps', row: otpRecord }
  });

  return otpRecord;
}

export async function findOTP(email, purpose = "password_reset") {
  const emailClean = email.toLowerCase().trim();
  
  // 1. Try Ops Manager
  let otps = await callOps({
    type: 'QUERY_RECORDS',
    data: { sheet: 'evcrm_otps', filter: { email: emailClean, purpose, used: false } }
  });
  
  let otp = Array.isArray(otps) ? otps[0] : otps;
  
  // 2. Fallback to Local
  if (!otp) {
    const localOtps = readLocal(OTPS_FILE);
    // Find matching, unused, and not expired
    otp = localOtps.find(o => 
      o.email === emailClean && 
      o.purpose === purpose && 
      !o.used && 
      new Date(o.expires_at) > new Date()
    );
  }
  
  return otp || null;
}

export async function incrementOTPAttempts(otpId) {
  // 1. Local
  const otps = readLocal(OTPS_FILE);
  const idx = otps.findIndex(o => o.id === otpId);
  let newAttempts = 1;
  if (idx !== -1) {
    otps[idx].attempts = (otps[idx].attempts || 0) + 1;
    newAttempts = otps[idx].attempts;
    writeLocal(OTPS_FILE, otps);
  }

  // 2. Try Ops Manager
  await callOps({
    type: 'UPDATE_RECORD',
    data: { 
      sheet: 'evcrm_otps', 
      filter: { id: otpId }, 
      update: { attempts: newAttempts } 
    }
  });

  return newAttempts;
}

export async function markOTPUsed(otpId) {
  // 1. Local
  const otps = readLocal(OTPS_FILE);
  const idx = otps.findIndex(o => o.id === otpId);
  if (idx !== -1) {
    otps[idx].used = true;
    writeLocal(OTPS_FILE, otps);
  }

  // 2. Try Ops Manager
  await callOps({
    type: 'UPDATE_RECORD',
    data: { 
      sheet: 'evcrm_otps', 
      filter: { id: otpId }, 
      update: { used: true } 
    }
  });
}

// ── Compatibility Layer ──────────────────────────────────────────

const db = {
    from: (sheet) => ({
        select: (cols, options) => ({
            eq: (field, val) => ({
                eq: (f2, v2) => ({
                    single: async () => {
                        const user = await (field === 'email' ? findUserByEmail(val) : findUserById(val));
                        return { data: user, error: user ? null : { code: 'PGRST116' } };
                    }
                }),
                single: async () => {
                    const user = await (field === 'email' ? findUserByEmail(val) : findUserById(val));
                    return { data: user, error: user ? null : { code: 'PGRST116' } };
                }
            }),
            order: (col, opts) => ({
                limit: (n) => ({
                    then: async (resolve) => {
                        const data = await callOps({ type: 'QUERY_RECORDS', data: { sheet } });
                        resolve({ data: Array.isArray(data) ? data.slice(0, n) : [], error: null });
                    }
                }),
                then: async (resolve) => {
                    const data = await callOps({ type: 'QUERY_RECORDS', data: { sheet } });
                    resolve({ data: Array.isArray(data) ? data : [], error: null });
                }
            }),
            then: async (resolve) => {
                const data = await callOps({ type: 'QUERY_RECORDS', data: { sheet } });
                resolve({ data: Array.isArray(data) ? data : [], error: null });
            }
        }),
        insert: (row) => ({
            select: () => ({
                single: async () => {
                    const newUser = await createUser(row);
                    return { data: newUser, error: newUser ? null : { message: 'Insert failed' } };
                }
            })
        })
    })
};

export default db;
