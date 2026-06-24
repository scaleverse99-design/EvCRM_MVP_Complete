import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.resolve(__dirname, './dist/index.js');

console.log(`Spawning MCP server at: ${serverPath}`);
const mcpProcess = spawn('node', [serverPath]);

let responseData = '';

mcpProcess.stdout.on('data', (data) => {
  responseData += data.toString();
  console.log(`STDOUT RECEIVED: ${data.toString()}`);
  
  try {
    const json = JSON.parse(responseData.trim());
    console.log('Successfully parsed JSON response!');
    console.log(JSON.stringify(json, null, 2));
    
    // Check if tools are listed
    if (json.result && json.result.tools) {
      console.log('✅ PASS: Tools listed successfully!');
      console.log(`Tool count: ${json.result.tools.length}`);
      mcpProcess.kill();
      process.exit(0);
    }
  } catch (e) {
    // Wait for more data if it's not complete JSON yet
  }
});

mcpProcess.stderr.on('data', (data) => {
  console.error(`STDERR: ${data.toString()}`);
});

mcpProcess.on('close', (code) => {
  console.log(`Process exited with code: ${code}`);
});

// Send JSON-RPC list tools request
const request = {
  jsonrpc: '2.0',
  id: '1',
  method: 'tools/list',
  params: {}
};

console.log(`Sending tools/list request...`);
mcpProcess.stdin.write(JSON.stringify(request) + '\n');
