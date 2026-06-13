const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function resolveNodePath() {
  if (process.env.NODE_BIN) {
    return process.env.NODE_BIN;
  }
  if (nodeMajor(process.execPath) >= 20) {
    return process.execPath;
  }
  const vscodeNode = latestVscodeServerNode();
  return vscodeNode || process.execPath;
}

function latestVscodeServerNode() {
  const root = '/root/.vscode-server/bin';
  if (!fs.existsSync(root)) {
    return null;
  }
  return fs.readdirSync(root)
    .map((name) => path.join(root, name, 'node'))
    .filter((file) => fs.existsSync(file) && nodeMajor(file) >= 20)
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function nodeMajor(file) {
  const result = childProcess.spawnSync(file, ['-v'], { encoding: 'utf8' });
  if (result.status !== 0) {
    return 0;
  }
  const match = result.stdout.match(/^v(\d+)/);
  return match ? Number(match[1]) : 0;
}

module.exports = { resolveNodePath };
