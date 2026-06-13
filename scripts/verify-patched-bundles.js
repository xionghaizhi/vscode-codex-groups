const fs = require('fs');
const { CodexExtensionLocator } = require('../src/extensionLocator');
const { CodexPatchEngine } = require('../src/patchEngine');
const { resolveNodePath } = require('./node-path');

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
}

function main() {
  const target = new CodexExtensionLocator().locate();
  assertContains(target.extensionJsPath, 'codexLocalGroupsPatchVersion=4');
  assertContains(target.headerPath, 'codexLocalGroupsHeaderPatchVersion=4');
  assertContains(target.appMainPath, 'codexLocalGroupsWebviewPatchVersion=4');
  assertContains(target.appMainPath, 'id:`codex-local-title`');
  assertContains(target.appMainPath, 'id:`codex-local-group`');
  assertContains(target.localTitlePath, 'codexLocalGroupsLocalTitlePatchVersion=4');
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
  for (const item of engine.runSyntaxChecks(target)) {
    console.log(`语法检查通过：${item.file}`);
  }
  console.log(`补丁标记检查通过：${target.extensionDir}`);
}

function assertContains(file, marker) {
  if (!fs.readFileSync(file, 'utf8').includes(marker)) {
    throw new Error(`缺少补丁标记：${file} ${marker}`);
  }
}
