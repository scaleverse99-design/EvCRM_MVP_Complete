const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXTENSION_SRC_DIR = __dirname;
const GLOBAL_PATHS = [
  'C:\\Users\\balaj\\.antigravity-ide\\extensions\\smartnotes-ide-extension',
  'C:\\Users\\balaj\\.antigravity\\extensions\\smartnotes-ide-extension',
  'C:\\Users\\balaj\\.vscode\\extensions\\smartnotes-ide-extension',
  'C:\\Users\\balaj\\.windsurf\\extensions\\smartnotes-ide-extension'
];

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

function copyFileSync(from, to) {
  const dir = path.dirname(to);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(from, to);
}

try {
  console.log('🔄 Step 1: Compiling TypeScript Extension...');
  execSync('npm run compile', { cwd: EXTENSION_SRC_DIR, stdio: 'inherit' });
  console.log('✅ TypeScript compilation completed successfully.');

  console.log('\n🔄 Step 2: Syncing extension to IDE paths...');
  const filesToCopy = [
    'package.json',
    'dist/extension.js'
  ];

  GLOBAL_PATHS.forEach(targetPath => {
    console.log(`\n📂 Syncing to: ${targetPath}`);
    
    // Copy main files
    filesToCopy.forEach(file => {
      const srcFile = path.join(EXTENSION_SRC_DIR, file);
      const destFile = path.join(targetPath, file);
      if (fs.existsSync(srcFile)) {
        copyFileSync(srcFile, destFile);
        console.log(`  Copied: ${file}`);
      }
    });

    // Copy resources folder
    const srcResources = path.join(EXTENSION_SRC_DIR, 'resources');
    const destResources = path.join(targetPath, 'resources');
    if (fs.existsSync(srcResources)) {
      copyFolderSync(srcResources, destResources);
      console.log('  Copied: resources folder');
    }
  });

  console.log('\n✨ Extension compile and sync process completed successfully!');
} catch (err) {
  console.error('💥 Failed to compile and sync extension:', err.message);
  process.exit(1);
}
