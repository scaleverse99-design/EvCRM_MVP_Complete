const fs = require('fs');
const path = require('path');

const MCP_SERVER_PATH = path.resolve(__dirname, './mcp-server/dist/index.js');

async function main() {
  console.log('🚀 SmartNotes IDE & Claude Desktop MCP Installer\n');

  const configBlock = {
    command: "node",
    args: [MCP_SERVER_PATH],
    env: {}
  };

  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\balaj', 'AppData', 'Roaming');
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\balaj';

  // 1. Claude Desktop Config
  const claudeConfigDir = path.join(appData, 'Claude');
  const claudeConfigPath = path.join(claudeConfigDir, 'claude_desktop_config.json');
  console.log(`Checking Claude Desktop configuration...`);
  try {
    if (!fs.existsSync(claudeConfigDir)) {
      fs.mkdirSync(claudeConfigDir, { recursive: true });
    }
    let config = { mcpServers: {} };
    if (fs.existsSync(claudeConfigPath)) {
      try {
        config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
      } catch (e) {
        console.warn('⚠️ Existing Claude Desktop config was malformed. Backing it up and recreating.');
        fs.writeFileSync(claudeConfigPath + '.bak', fs.readFileSync(claudeConfigPath));
      }
    }
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers.smartnotes = configBlock;
    fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✅ Updated Claude Desktop config at: ${claudeConfigPath}`);
  } catch (err) {
    console.error(`❌ Failed to update Claude Desktop config:`, err.message);
  }

  // 2. VS Code (Cline) Config
  const clineConfigDir = path.join(appData, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings');
  const clineConfigPath = path.join(clineConfigDir, 'cline_mcp_settings.json');
  console.log(`\nChecking VS Code (Cline) configuration...`);
  try {
    if (fs.existsSync(path.join(appData, 'Code'))) {
      if (!fs.existsSync(clineConfigDir)) {
        fs.mkdirSync(clineConfigDir, { recursive: true });
      }
      let config = { mcpServers: {} };
      if (fs.existsSync(clineConfigPath)) {
        config = JSON.parse(fs.readFileSync(clineConfigPath, 'utf8'));
      }
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers.smartnotes = configBlock;
      fs.writeFileSync(clineConfigPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`✅ Updated VS Code (Cline) config at: ${clineConfigPath}`);
    } else {
      console.log('ℹ️ VS Code directory not found, skipping Cline config auto-write.');
    }
  } catch (err) {
    console.error(`❌ Failed to update Cline config:`, err.message);
  }

  // 3. VS Code (Roo Code) Config
  const rooConfigDir = path.join(appData, 'Code', 'User', 'globalStorage', 'roodev.roprompt-dev', 'settings');
  const rooConfigPath = path.join(rooConfigDir, 'cline_mcp_settings.json');
  console.log(`\nChecking VS Code (Roo Code) configuration...`);
  try {
    if (fs.existsSync(path.join(appData, 'Code'))) {
      if (!fs.existsSync(rooConfigDir)) {
        fs.mkdirSync(rooConfigDir, { recursive: true });
      }
      let config = { mcpServers: {} };
      if (fs.existsSync(rooConfigPath)) {
        config = JSON.parse(fs.readFileSync(rooConfigPath, 'utf8'));
      }
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers.smartnotes = configBlock;
      fs.writeFileSync(rooConfigPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`✅ Updated VS Code (Roo Code) config at: ${rooConfigPath}`);
    }
  } catch (err) {
    console.error(`❌ Failed to update Roo Code config:`, err.message);
  }

  // 4. Windsurf Config
  const windsurfConfigDir = path.join(userProfile, '.codeium', 'windsurf');
  const windsurfConfigPath = path.join(windsurfConfigDir, 'mcp_config.json');
  console.log(`\nChecking Windsurf configuration...`);
  try {
    if (fs.existsSync(windsurfConfigDir)) {
      let config = { mcpServers: {} };
      if (fs.existsSync(windsurfConfigPath)) {
        config = JSON.parse(fs.readFileSync(windsurfConfigPath, 'utf8'));
      }
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers.smartnotes = configBlock;
      fs.writeFileSync(windsurfConfigPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`✅ Updated Windsurf config at: ${windsurfConfigPath}`);
    } else {
      console.log('ℹ️ Windsurf directory not found, skipping config auto-write.');
    }
  } catch (err) {
    console.error(`❌ Failed to update Windsurf config:`, err.message);
  }

  // 5. Cursor instructions
  console.log('\n────────────────────────────────────────────────────────────────');
  console.log('🖱️ Cursor IDE Manual Setup Guide:');
  console.log('Cursor does not use a global JSON configuration for MCP.');
  console.log('Follow these steps to connect SmartNotes to Cursor:');
  console.log('  1. Open Cursor and go to Cursor Settings (Gear Icon top right).');
  console.log('  2. Go to "Features" -> "MCP".');
  console.log('  3. Click "+ Add New MCP Server".');
  console.log('  4. Set the values:');
  console.log('     - Name: smartnotes');
  console.log('     - Type: command');
  console.log('     - Command:');
  console.log(`       node "${MCP_SERVER_PATH}"`);
  console.log('  5. Click "Save".');
  console.log('────────────────────────────────────────────────────────────────\n');
}

main();
