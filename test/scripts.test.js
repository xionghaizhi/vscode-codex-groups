const assert = require('assert');
const fs = require('fs');

module.exports = {
  name: 'scripts',
  tests: [
    {
      name: 'patch scripts default to api-key compatible full mode',
      run() {
        for (const file of ['scripts/plan-patches.js', 'scripts/apply-patches.js', 'scripts/repair-codex-ui.js', 'scripts/verify-patched-bundles.js', 'src/extension.js']) {
          const text = fs.readFileSync(file, 'utf8');
          assert.ok(!text.includes('safeMode: true'), file);
        }
        const verify = fs.readFileSync('scripts/verify-patched-bundles.js', 'utf8');
        assert.ok(verify.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(verify.includes('preventAllNetworkTraffic:!0'));
        assert.ok(verify.includes('var codexLocalGroupsInitialMeta='));
        assert.ok(!verify.includes('yuxiMetadataSummary'));
      },
    },
  ],
};
