const fs = require('fs');
const os = require('os');
const path = require('path');

const temporaryPaths = new Set();

function tempDir(name) {
  return registerTemporaryPath(fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`)));
}

function registerTemporaryPath(temporaryPath) {
  temporaryPaths.add(temporaryPath);
  return temporaryPath;
}

function cleanupTemporaryPaths() {
  const errors = [];
  for (const temporaryPath of temporaryPaths) {
    try {
      fs.rmSync(temporaryPath, { recursive: true, force: true });
      temporaryPaths.delete(temporaryPath);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to clean temporary test artifacts');
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { tempDir, registerTemporaryPath, cleanupTemporaryPaths, writeJson, readJson };
