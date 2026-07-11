const assert = require('assert');
const packageJson = require('../package.json');

module.exports = {
  name: 'package json',
  tests: [
    {
      name: 'contributes every command used for activation',
      run() {
        const commands = new Set(packageJson.contributes.commands.map((item) => item.command));
        for (const event of packageJson.activationEvents) {
          if (event.startsWith('onCommand:')) {
            assert.ok(commands.has(event.slice('onCommand:'.length)), event);
          }
        }
      },
    },
    {
      name: 'hides silent patch command from command palette',
      run() {
        const menus = packageJson.contributes.menus || {};
        const commandPalette = menus.commandPalette || [];
        assert.ok(commandPalette.some((item) => item.command === 'codexLocalGroups.applyPatchesSilent' && item.when === 'false'));
      },
    },
    {
      name: 'does not patch Codex during VS Code startup',
      run() {
        assert.ok(!packageJson.activationEvents.includes('*'));
        assert.ok(!packageJson.activationEvents.includes('onStartupFinished'));
      },
    },
    {
      name: 'contributes status search and manage commands',
      run() {
        const commands = new Set(packageJson.contributes.commands.map((item) => item.command));
        assert.ok(commands.has('codexLocalGroups.checkStatus'));
        assert.ok(commands.has('codexLocalGroups.searchConversations'));
        assert.ok(commands.has('codexLocalGroups.manageGroups'));
        assert.ok(commands.has('codexLocalGroups.repairCodexUi'));
        assert.ok(commands.has('codexLocalGroups.restoreCodexUi'));
        assert.ok(packageJson.activationEvents.includes('onCommand:codexLocalGroups.checkStatus'));
        assert.ok(packageJson.activationEvents.includes('onCommand:codexLocalGroups.searchConversations'));
        assert.ok(packageJson.activationEvents.includes('onCommand:codexLocalGroups.manageGroups'));
        assert.ok(packageJson.activationEvents.includes('onCommand:codexLocalGroups.repairCodexUi'));
        assert.ok(packageJson.activationEvents.includes('onCommand:codexLocalGroups.restoreCodexUi'));
      },
    },
    {
      name: 'contributes restore script for disabled-extension recovery',
      run() {
        assert.strictEqual(packageJson.scripts['restore-codex-ui'], 'node scripts/restore-codex-ui.js');
      },
    },
  ],
};
