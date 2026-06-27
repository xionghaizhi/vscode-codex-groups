const assert = require('assert');
const fs = require('fs');

module.exports = {
  name: 'scripts',
  tests: [
    {
      name: 'patch scripts default to safe mode',
      run() {
        for (const file of ['scripts/plan-patches.js', 'scripts/apply-patches.js', 'scripts/repair-codex-ui.js', 'scripts/verify-patched-bundles.js']) {
          const text = fs.readFileSync(file, 'utf8');
          assert.ok(text.includes('safeMode: true'), file);
        }
      },
    },
  ],
};
