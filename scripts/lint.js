const fs = require('fs');
const path = require('path');

const files = ['package.json', ...listJs(path.join(process.cwd(), 'src')), ...listJs(path.join(process.cwd(), 'scripts')), ...listJs(path.join(process.cwd(), 'test'))];
let failed = false;
for (const file of files) {
  const fullPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const text = fs.readFileSync(fullPath, 'utf8');
  if (text.includes('\t')) {
    console.error(`tab found: ${path.relative(process.cwd(), fullPath)}`);
    failed = true;
  }
  if (/ +$/m.test(text)) {
    console.error(`trailing spaces found: ${path.relative(process.cwd(), fullPath)}`);
    failed = true;
  }
}
if (failed) {
  process.exit(1);
}
console.log(`lint ${files.length} files`);

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
