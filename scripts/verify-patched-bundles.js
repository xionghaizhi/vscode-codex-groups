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
  assertContains(target.extensionJsPath, 'codexLocalGroupsPatchVersion=14');
  assertContains(target.extensionJsPath, 'c.cwds=s');
  assertContains(target.extensionJsPath, '"--disable","plugins"');
  assertContains(target.extensionJsPath, '"account-info":async()=>({accountId:null');
  assertContains(target.headerPath, 'codexLocalGroupsHeaderPatchVersion=36');
  assertContains(target.headerPath, 'codexLocalGroupsHistoryLimit=120');
  assertContains(target.headerPath, 'codexLocalGroupsHistoryRecovered');
  assertContains(target.appMainPath, 'codexLocalGroupsWebviewPatchVersion=6');
  assertContains(target.appMainPath, 'preventAllNetworkTraffic:!0');
  assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentPatchVersion=3');
  assertContains(target.appServerManagerSignalsPath, 'cwds:t');
  assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentThreadListParams({limit:200');
  assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentThreadListParams({limit:t');
  assertContains(target.requestPath, 'codexLocalGroupsRequestPatchVersion=2');
  assertContains(target.requestPath, 't.startsWith(`/wham/usage`)');
  if (target.sidebarProjectGroupSignalsPath) {
    assertContains(target.sidebarProjectGroupSignalsPath, 'codexLocalGroupsSidebarProjectStatusPatchVersion=1');
  }
  assertContains(target.localTitlePath, 'codexLocalGroupsLocalTitlePatchVersion=6');
  for (const file of bundlePaths(target)) {
    assertNotContains(file, 'requestAllThreadList(e)');
    assertNotContains(file, 'codexLocalGroupsMetadataOnly');
    assertNotContains(file, 'codexLocalGroupsMetadataItems');
    assertNotContains(file, 'codexLocalGroupsMetadataRow');
  }
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
  for (const item of engine.runSyntaxChecks(target)) {
    console.log(`语法检查通过：${item.file}`);
  }
  console.log(`完整补丁标记检查通过：${target.extensionDir}`);
}

function bundlePaths(target) {
  return [
    target.extensionJsPath,
    target.headerPath,
    target.appServerManagerSignalsPath,
    target.appMainPath,
    target.requestPath,
    target.localTitlePath,
    target.sidebarProjectGroupSignalsPath,
  ].filter(Boolean);
}

function assertContains(file, marker) {
  if (!fs.readFileSync(file, 'utf8').includes(marker)) {
    throw new Error(`缺少补丁标记：${file} ${marker}`);
  }
}

function assertNotContains(file, marker) {
  if (fs.readFileSync(file, 'utf8').includes(marker)) {
    throw new Error(`存在不应出现的补丁标记：${file} ${marker}`);
  }
}
