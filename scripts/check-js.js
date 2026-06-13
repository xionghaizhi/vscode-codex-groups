const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const roots = ['src', 'scripts', 'test'];
const files = roots.flatMap((root) => listJs(path.join(process.cwd(), root)));
for (const file of files) {
  const result = childProcess.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(result.status || 1);
  }
  console.log(`check ${path.relative(process.cwd(), file)}`);
}

function listJs(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listJs(file);
    }
    return entry.name.endsWith('.js') ? [file] : [];
  });
}
