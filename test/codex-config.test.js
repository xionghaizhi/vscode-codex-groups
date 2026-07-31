const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');
const { configuredCustomModelProviderId } = require('../src/codexConfig');

module.exports = {
  name: 'codex config',
  tests: [
    {
      name: 'reads a safe custom provider with bare or quoted table keys',
      run() {
        const dir = tempDir('codex-config');
        const barePath = path.join(dir, 'bare.toml');
        const quotedPath = path.join(dir, 'quoted.toml');
        const literalPath = path.join(dir, 'literal.toml');
        fs.writeFileSync(barePath, 'model_provider = "newapi"\n[model_providers.newapi]\nsupports_websockets = true\n');
        fs.writeFileSync(quotedPath, 'model_provider = "newapi"\n[model_providers."newapi"]\nsupports_websockets = true\n');
        fs.writeFileSync(literalPath, "model_provider = 'newapi'\n[model_providers.'newapi']\nsupports_websockets = true\n");
        assert.strictEqual(configuredCustomModelProviderId({ configPath: barePath }), 'newapi');
        assert.strictEqual(configuredCustomModelProviderId({ configPath: quotedPath }), 'newapi');
        assert.strictEqual(configuredCustomModelProviderId({ configPath: literalPath }), 'newapi');
      },
    },
    {
      name: 'rejects unresolved, reserved, nested, or unsafe providers',
      run() {
        const dir = tempDir('codex-config-invalid');
        const builtInPath = path.join(dir, 'built-in.toml');
        const missingTablePath = path.join(dir, 'missing-table.toml');
        const tablePath = path.join(dir, 'table.toml');
        const unsafePath = path.join(dir, 'unsafe.toml');
        fs.writeFileSync(missingTablePath, 'model_provider = "newapi"\n');
        fs.writeFileSync(tablePath, '[profile.work]\nmodel_provider = "newapi"\n');
        fs.writeFileSync(unsafePath, 'model_provider = "newapi.value"\n');
        for (const provider of ['amazon-bedrock', 'openai', 'ollama', 'lmstudio']) {
          fs.writeFileSync(builtInPath, `model_provider = "${provider}"\n`);
          assert.strictEqual(configuredCustomModelProviderId({ configPath: builtInPath }), null);
        }
        assert.strictEqual(configuredCustomModelProviderId({ configPath: missingTablePath }), null);
        assert.strictEqual(configuredCustomModelProviderId({ configPath: tablePath }), null);
        assert.strictEqual(configuredCustomModelProviderId({ configPath: unsafePath }), null);
        assert.strictEqual(configuredCustomModelProviderId({ configPath: path.join(dir, 'missing.toml') }), null);
      },
    },
  ],
};
