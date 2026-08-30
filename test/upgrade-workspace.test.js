const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');
const { workspaceDirectories } = require('../scripts/with-upgrade-workspace');

const artifactVariables = Object.keys(workspaceDirectories);

module.exports = {
  name: 'upgrade workspace',
  tests: [
    {
      name: 'creates every upgrade artifact directory under one cleaned workspace',
      run() {
        const result = runUpgradeCommand(upgradeWorkspaceChildScript());
        assert.strictEqual(result.status, 0, result.stdout + result.stderr);
        const report = upgradeWorkspaceReport(result);
        assertOwnedDirectories(report);
        assertRemovedWorkspace(report.workspaceRoot);
      },
    },
    {
      name: 'cleans the workspace when the upgrade command fails',
      run() {
        const result = runUpgradeCommand(upgradeWorkspaceChildScript('process.exit(23);'));
        assert.strictEqual(result.status, 23, result.stdout + result.stderr);
        assertRemovedWorkspace(upgradeWorkspaceReport(result).workspaceRoot);
      },
    },
    {
      name: 'cleans the workspace when the upgrade command throws',
      run() {
        const result = runUpgradeCommand(upgradeWorkspaceChildScript('throw new Error(`forced upgrade failure`);'));
        assert.strictEqual(result.status, 1, result.stdout + result.stderr);
        assert.ok(result.stderr.includes('forced upgrade failure'));
        assertRemovedWorkspace(upgradeWorkspaceReport(result).workspaceRoot);
      },
    },
    {
      name: 'cleans the workspace when the upgrade command is signalled',
      run() {
        const result = runUpgradeCommand(upgradeWorkspaceChildScript('process.kill(process.pid, `SIGTERM`);'));
        assert.strictEqual(result.status, 1, result.stdout + result.stderr);
        assert.ok(result.stderr.includes('Upgrade command ended with signal SIGTERM'));
        assertRemovedWorkspace(upgradeWorkspaceReport(result).workspaceRoot);
      },
    },
    {
      name: 'preserves unrelated temporary content',
      run() {
        const testRoot = tempDir('codex-upgrade-unrelated');
        const unrelatedPath = path.join(testRoot, 'unrelated');
        fs.mkdirSync(unrelatedPath);
        try {
          const result = runUpgradeCommand(upgradeWorkspaceChildScript(), { UPGRADE_UNRELATED_PATH: unrelatedPath });
          assert.strictEqual(result.status, 0, result.stdout + result.stderr);
          assert.ok(fs.existsSync(unrelatedPath));
          assertRemovedWorkspace(upgradeWorkspaceReport(result).workspaceRoot);
        } finally {
          fs.rmSync(testRoot, { recursive: true, force: true });
        }
      },
    },
    {
      name: 'fails when workspace cleanup fails',
      run() {
        const testRoot = tempDir('codex-upgrade-cleanup-failure');
        const preloadPath = path.join(testRoot, 'fail-cleanup.js');
        fs.writeFileSync(preloadPath, cleanupFailurePreload());
        let workspaceRoot;
        try {
          const result = runUpgradeCommand(upgradeWorkspaceChildScript(), { NODE_OPTIONS: nodeRequireOption(preloadPath) });
          workspaceRoot = upgradeWorkspaceReport(result).workspaceRoot;
          assert.strictEqual(result.status, 1, result.stdout + result.stderr);
          assert.ok(result.stderr.includes('Failed to clean upgrade workspace'));
          assert.ok(fs.existsSync(workspaceRoot));
        } finally {
          if (workspaceRoot) fs.rmSync(workspaceRoot, { recursive: true, force: true });
          fs.rmSync(testRoot, { recursive: true, force: true });
        }
      },
    },
  ],
};

function runUpgradeCommand(source, environment = {}) {
  return spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'with-upgrade-workspace.js'), '--', process.execPath, '-e', source], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
}

function upgradeWorkspaceChildScript(afterWrite = '') {
  return [
    "const fs=require('fs'),path=require('path'),names=" + JSON.stringify(artifactVariables) + ';',
    'const directories={};for(const name of names){const directory=process.env[name];if(!directory)throw new Error(`Missing ${name}`);fs.writeFileSync(path.join(directory,`${name}.artifact`),name);directories[name]=directory}',
    'fs.writeFileSync(path.join(process.env.TMPDIR,`temporary.artifact`),`temporary`);',
    'console.log(JSON.stringify({workspaceRoot:process.env.CODEX_UPGRADE_WORKSPACE_ROOT,directories,tmpdir:process.env.TMPDIR,npmCache:process.env.NPM_CONFIG_CACHE,compileCacheDisabled:process.env.NODE_DISABLE_COMPILE_CACHE,unrelated:process.env.UPGRADE_UNRELATED_PATH}));',
    afterWrite,
  ].join('');
}

function upgradeWorkspaceReport(result) {
  return JSON.parse(result.stdout.trim());
}

function assertOwnedDirectories(report) {
  assert.ok(report.workspaceRoot.startsWith(path.join(require('os').tmpdir(), 'codex-upgrade-')));
  for (const directory of Object.values(report.directories)) assert.ok(directory.startsWith(`${report.workspaceRoot}${path.sep}`));
  assert.ok(report.tmpdir.startsWith(`${report.workspaceRoot}${path.sep}`));
  assert.strictEqual(report.npmCache, report.directories.CODEX_UPGRADE_NPM_CACHE_DIR);
  assert.strictEqual(report.compileCacheDisabled, '1');
}

function assertRemovedWorkspace(workspaceRoot) {
  assert.ok(!fs.existsSync(workspaceRoot), `workspace was not removed: ${workspaceRoot}`);
}

function cleanupFailurePreload() {
  return "const fs=require('fs'),path=require('path'),remove=fs.rmSync;fs.rmSync=(target,...args)=>{if(path.basename(String(target)).startsWith('codex-upgrade-'))throw new Error('forced upgrade cleanup failure');return remove(target,...args)};";
}

function nodeRequireOption(preloadPath) {
  return `${process.env.NODE_OPTIONS || ''} --require=${preloadPath}`.trim();
}
