const fs = require('fs');
const path = require('path');

function searchDir(dir, prefix = '') {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    let stats;
    try { stats = fs.statSync(fullPath); } catch (e) { continue; }
    if (stats.isDirectory()) {
      if (item === '.wrangler' || item === 'wrangler') {
        console.log(`Found wrangler directory: ${prefix}${item}`);
        listDirRecursive(fullPath);
      } else {
        searchDir(fullPath, prefix + item + '/');
      }
    }
  }
}

function listDirRecursive(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      listDirRecursive(fullPath);
    } else {
      console.log(`File: ${fullPath} (${stats.size} bytes)`);
      if (item.endsWith('.json') || item.endsWith('.toml')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          console.log(`--- Content of ${item} ---`);
          console.log(content);
          console.log('--------------------------');
        } catch (e) {
          console.log(`Error reading ${item}:`, e.message);
        }
      }
    }
  }
}

console.log('Searching in AppData/Roaming...');
searchDir(path.join(process.env.APPDATA));
console.log('Searching in user home...');
const homeDir = process.env.USERPROFILE || 'C:/Users/balaj';
const wranglerHome = path.join(homeDir, '.wrangler');
if (fs.existsSync(wranglerHome)) {
  console.log('Found .wrangler in home:', wranglerHome);
  listDirRecursive(wranglerHome);
}
const configHome = path.join(homeDir, '.config', 'wrangler');
if (fs.existsSync(configHome)) {
  console.log('Found .config/wrangler:', configHome);
  listDirRecursive(configHome);
}
