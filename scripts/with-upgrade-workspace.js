const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const workspaceDirectories = {
  CODEX_UPGRADE_OFFICIAL_DIR: 'official',
  CODEX_UPGRADE_EXTRACTED_DIR: 'extracted',
  CODEX_UPGRADE_PATCHED_DIR: 'patched',
  CODEX_UPGRADE_ROLLBACK_DIR: 'rollback',
  CODEX_UPGRADE_VSIX_DIR: 'vsix',
  CODEX_UPGRADE_NPM_CACHE_DIR: 'npm-cache',
  CODEX_UPGRADE_REVIEW_DIR: 'review',
  CODEX_UPGRADE_PROBE_DIR: 'probe',
  CODEX_UPGRADE_SCHEMA_DIR: 'schema',
  CODEX_UPGRADE_LOG_DIR: 'log',
  CODEX_UPGRADE_HELPER_DIR: 'helper',
};

function createUpgradeWorkspace() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-upgrade-'));
  const temporaryDirectory = path.join(workspaceRoot, 'tmp');
  const environment = { CODEX_UPGRADE_WORKSPACE_ROOT: workspaceRoot };
  try {
    fs.mkdirSync(temporaryDirectory);
    for (const [name, directory] of Object.entries(workspaceDirectories)) {
      const directoryPath = path.join(workspaceRoot, directory);
      fs.mkdirSync(directoryPath);
      environment[name] = directoryPath;
    }
    return { workspaceRoot, environment: workspaceEnvironment(environment, temporaryDirectory) };
  } catch (error) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    throw error;
  }
}

function workspaceEnvironment(environment, temporaryDirectory) {
  return {
    ...environment,
    TMPDIR: temporaryDirectory,
    TMP: temporaryDirectory,
    TEMP: temporaryDirectory,
    NODE_DISABLE_COMPILE_CACHE: '1',
    NPM_CONFIG_CACHE: environment.CODEX_UPGRADE_NPM_CACHE_DIR,
    npm_config_cache: environment.CODEX_UPGRADE_NPM_CACHE_DIR,
  };
}

function commandArguments(args) {
  const separator = args.indexOf('--');
  return separator >= 0 ? args.slice(separator + 1) : args;
}

function runChildCommand(command, args, environment) {
  const result = childProcess.spawnSync(command, args, { env: { ...process.env, ...environment }, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Upgrade command ended with signal ${result.signal}`);
  return result.status === null ? 1 : result.status;
}

function main(args) {
  const [command, ...commandArgs] = commandArguments(args);
  if (!command) throw new Error('Usage: node scripts/with-upgrade-workspace.js -- <command> [args...]');
  const workspace = createUpgradeWorkspace();
  let exitCode = 1;
  try {
    exitCode = runChildCommand(command, commandArgs, workspace.environment);
  } finally {
    try {
      fs.rmSync(workspace.workspaceRoot, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to clean upgrade workspace: ${error.message}`);
      exitCode = 1;
    }
  }
  return exitCode;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

module.exports = { commandArguments, createUpgradeWorkspace, main, runChildCommand, workspaceDirectories };
