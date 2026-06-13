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
  assertContains(target.extensionJsPath, 'codexLocalGroupsPatchVersion=7');
  assertContains(target.extensionJsPath, 'showInputBox');
  assertContains(target.extensionJsPath, 'promptConversationTitle');
  assertContains(target.extensionJsPath, 'promptConversationGroup');
  assertContains(target.extensionJsPath, 'promptNewGroup');
  assertContains(target.extensionJsPath, 'if(codexLocalGroupsHandleWebviewMessage(n))return;');
  assertContains(target.extensionJsPath, 'if(codexLocalGroupsHandleWebviewMessage(a,e))return;');
  assertContains(target.extensionJsPath, 'metadataSaved');
  assertContains(target.extensionJsPath, 'String.fromCharCode(10)');
  assertContains(target.headerPath, 'codexLocalGroupsHeaderPatchVersion=17');
  assertContains(target.headerPath, 'codexLocalGroupsDecoratedItem');
  assertContains(target.headerPath, 'codexLocalGroupsLocalTitle');
  assertContains(target.headerPath, 'titleOverride:codexLocalGroupsLocalTitle(n)??void 0');
  assertContains(target.headerPath, 'e.groups.sort');
  assertContains(target.headerPath, 'bg-token-list-hover-background');
  assertContains(target.headerPath, '#93c5fd');
  assertContains(target.headerPath, 'borderLeftColor:i.label===`未分组`');
  assertNotContains(target.headerPath, 'overflow-hidden rounded-lg');
  assertContains(target.headerPath, 'children:`设置标题`');
  assertContains(target.headerPath, 'children:`设置分组`');
  assertContains(target.headerPath, 'promptConversationTitle');
  assertContains(target.headerPath, 'promptConversationGroup');
  assertContains(target.headerPath, 'metadataSaved');
  assertContains(target.headerPath, '(a.updatedAtMs??0)>(o.updatedAtMs??0)');
  assertContains(target.appMainPath, 'codexLocalGroupsWebviewPatchVersion=6');
  assertContains(target.appMainPath, 'id:`codex-local-title`');
  assertContains(target.appMainPath, 'id:`codex-local-group`');
  assertContains(target.localTitlePath, 'codexLocalGroupsLocalTitlePatchVersion=6');
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

function assertNotContains(file, marker) {
  if (fs.readFileSync(file, 'utf8').includes(marker)) {
    throw new Error(`存在不应出现的补丁标记：${file} ${marker}`);
  }
}
