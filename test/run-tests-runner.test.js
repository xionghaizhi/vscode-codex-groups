const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');

if (process.env.CODEX_RUNNER_SELF_TEST === '1') {
  module.exports = { name: 'test runner', tests: [] };
} else {
  module.exports = {
    name: 'test runner',
    tests: [
      {
        name: 'filters tests with grep',
        run() {
          const result = runSelf(['--grep', 'package json - hides silent patch command from command palette']);
          assert.strictEqual(result.status, 0, result.stdout + result.stderr);
          assert.ok(result.stdout.includes('PASS package json - hides silent patch command from command palette'));
          assert.ok(!result.stdout.includes('PASS metadata store -'));
          assert.ok(result.stdout.includes('PASS 1 tests'));
        },
      },
      {
        name: 'fails when grep matches no tests',
        run() {
          const result = runSelf(['--grep', 'not-a-real-test-name']);
          assert.strictEqual(result.status, 1, result.stdout + result.stderr);
          assert.ok(result.stderr.includes('No tests matched: not-a-real-test-name'));
        },
      },
      {
        name: 'reclaims temporary artifacts after a passing test run',
        run() {
          const run = isolatedRun('');
          const result = runSelf(['--grep', 'metadata store - creates metadata when file is missing'], run.environment);
          assert.strictEqual(result.status, 0, result.stdout + result.stderr);
          assert.deepStrictEqual(fs.readdirSync(run.tmpdir).sort(), run.expectedPaths);
        },
      },
      {
        name: 'reclaims direct mkdtemp artifacts after a passing test run',
        run() {
          const run = isolatedRun('');
          const result = runSelf(['--grep', 'scripts - verifies the 26.5803 composer subagent panel contract'], run.environment);
          assert.strictEqual(result.status, 0, result.stdout + result.stderr);
          assert.deepStrictEqual(fs.readdirSync(run.tmpdir).sort(), run.expectedPaths);
        },
      },
      {
        name: 'reclaims temporary artifacts after an assertion failure',
        run() {
          const run = isolatedRun("require('assert').deepStrictEqual=()=>{throw new Error('forced assertion failure')}");
          const result = runSelf(['--grep', 'metadata store - creates metadata when file is missing'], run.environment);
          assert.strictEqual(result.status, 1, result.stdout + result.stderr);
          assert.ok(result.stderr.includes('forced assertion failure'));
          assert.deepStrictEqual(fs.readdirSync(run.tmpdir).sort(), run.expectedPaths);
        },
      },
      {
        name: 'reclaims registered artifacts when no tests match or setup throws',
        run() {
          const noMatch = isolatedRun("require('" + testUtilsPath() + "').tempDir('codex-runner-no-match')");
          const noMatchResult = runSelf(['--grep', 'not-a-real-test-name'], noMatch.environment);
          assert.strictEqual(noMatchResult.status, 1, noMatchResult.stdout + noMatchResult.stderr);
          assert.deepStrictEqual(fs.readdirSync(noMatch.tmpdir).sort(), noMatch.expectedPaths);

          const thrown = isolatedRun("require('" + testUtilsPath() + "').tempDir('codex-runner-throw')");
          const thrownResult = runSelf(['--grep', '['], thrown.environment);
          assert.strictEqual(thrownResult.status, 1, thrownResult.stdout + thrownResult.stderr);
          assert.ok(thrownResult.stderr.includes('SyntaxError'));
          assert.deepStrictEqual(fs.readdirSync(thrown.tmpdir).sort(), thrown.expectedPaths);
        },
      },
      {
        name: 'fails the command when temporary artifact cleanup fails',
        run() {
          const source = "const fs=require('fs'),{tempDir}=require('" + testUtilsPath() + "'),temporaryPath=tempDir('codex-runner-cleanup-fail'),remove=fs.rmSync;fs.rmSync=(file,...args)=>{if(file===temporaryPath)throw new Error('forced cleanup failure');return remove(file,...args)}";
          const run = isolatedRun(source);
          const result = runSelf(['--grep', 'package json - hides silent patch command from command palette'], run.environment);
          assert.strictEqual(result.status, 1, result.stdout + result.stderr);
          assert.ok(result.stderr.includes('Failed to clean temporary test artifacts'));
        },
      },
    ],
  };
}

function isolatedRun(source) {
  const tmpdir = tempDir('codex-runner-cleanup');
  const preservedPath = path.join(tmpdir, 'pre-existing');
  const preloadPath = path.join(tmpdir, 'preload.js');
  fs.mkdirSync(preservedPath);
  fs.writeFileSync(preloadPath, source);
  return {
    tmpdir,
    expectedPaths: ['pre-existing', 'preload.js'],
    environment: { TMPDIR: tmpdir, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require=${preloadPath}`.trim() },
  };
}

function runSelf(args, environment = {}) {
  return spawnSync(process.execPath, [path.join(__dirname, 'run-tests.js'), ...args], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, ...environment, CODEX_RUNNER_SELF_TEST: '1' },
    encoding: 'utf8',
  });
}

function testUtilsPath() {
  return path.join(__dirname, 'test-utils.js').replace(/\\/g, '\\\\');
}
