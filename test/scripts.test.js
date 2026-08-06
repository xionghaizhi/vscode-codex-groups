const assert = require('assert');
const fs = require('fs');

module.exports = {
  name: 'scripts',
  tests: [
    {
      name: 'patch scripts default to native-history safe mode',
      run() {
        for (const file of ['scripts/plan-patches.js', 'scripts/apply-patches.js', 'scripts/repair-codex-ui.js', 'scripts/verify-patched-bundles.js', 'src/extension.js']) {
          const text = fs.readFileSync(file, 'utf8');
          assert.ok(text.includes('safeMode: true'), file);
        }
        const verify = fs.readFileSync('scripts/verify-patched-bundles.js', 'utf8');
        assert.ok(verify.includes('is265730 ? 16 : is26727 ? 15 : 14'));
        assert.ok(verify.includes('codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistoryPatchVersion=4'));
        assert.ok(verify.includes('codexLocalGroupsGroupLimit'));
        assert.ok(verify.includes('codex-local-groups-visible-counts-v1'));
        assert.ok(verify.includes('group-more-'));
        assert.ok(verify.includes('收起到最近 15 条'));
        assert.ok(verify.includes('展开更多'));
        assert.ok(verify.includes('sticky top-0 z-10 bg-token-dropdown-background'));
        assert.ok(verify.includes('codexLocalGroupsProjectRowsView'));
        assert.ok(verify.includes('contentStyle:{height:`600px`,overflow:`hidden`}'));
        assert.ok(verify.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=2'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistory26727PatchVersion=5'));
        assert.ok(verify.includes('codexLocalGroupsCodexUi26727PatchVersion=3'));
        assert.ok(verify.includes('codexLocalGroupsPower26727PatchVersion=3'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistory265730PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsCodexUi265730PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsPower265730PatchVersion=1'));
        assert.ok(verify.includes('this.onTimeout()},12e4))'));
        assert.ok(verify.includes('codexLocalGroupsHandleWebviewMessage(c,e)'));
        assert.ok(verify.includes('CODEX_EXTENSIONS_ROOT'));
        assert.ok(verify.includes('var codexLocalGroupsInitialMeta='));
        assert.ok(!verify.includes('yuxiMetadataSummary'));
      },
    },
  ],
};
