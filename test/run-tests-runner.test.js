const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

if (process.env.CODEX_RUNNER_SELF_TEST === '1') {
  module.exports = { name: 'test runner', tests: [] };
} else {
  module.exports = {
    name: 'test runner',
    tests: [
      {
        name: 'filters tests with grep',
        run() {
          const result = runSelf('--grep', 'package json - hides silent patch command from command palette');
          assert.strictEqual(result.status, 0, result.stdout + result.stderr);
          assert.ok(result.stdout.includes('PASS package json - hides silent patch command from command palette'));
          assert.ok(!result.stdout.includes('PASS metadata store -'));
          assert.ok(result.stdout.includes('PASS 1 tests'));
        },
      },
      {
        name: 'fails when grep matches no tests',
        run() {
          const result = runSelf('--grep', 'not-a-real-test-name');
          assert.strictEqual(result.status, 1, result.stdout + result.stderr);
          assert.ok(result.stderr.includes('No tests matched: not-a-real-test-name'));
        },
      },
    ],
  };
}

function runSelf(...args) {
  return spawnSync(process.execPath, [path.join(__dirname, 'run-tests.js'), ...args], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, CODEX_RUNNER_SELF_TEST: '1' },
    encoding: 'utf8',
  });
}
