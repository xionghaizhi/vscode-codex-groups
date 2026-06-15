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
  assertContains(target.extensionJsPath, 'codexLocalGroupsPatchVersion=13');
  assertContains(target.extensionJsPath, 'showInputBox');
  assertContains(target.extensionJsPath, 'showQuickPick');
  assertContains(target.extensionJsPath, 'codexLocalGroupsExistingGroups');
  assertContains(target.extensionJsPath, 'codexLocalGroupsCleanGroupName');
  assertContains(target.extensionJsPath, 'promptConversationTitle');
  assertContains(target.extensionJsPath, 'promptConversationGroup');
  assertContains(target.extensionJsPath, 'promptNewGroup');
  assertContains(target.extensionJsPath, 'if(codexLocalGroupsHandleWebviewMessage(n))return;');
  assertContains(target.extensionJsPath, 'if(codexLocalGroupsHandleWebviewMessage(a,e))return;');
  assertContains(target.extensionJsPath, 'metadataSaved');
  assertContains(target.extensionJsPath, 'String.fromCharCode(10)');
  assertContains(target.extensionJsPath, 'codexLocalGroupsPatchVersion=13');
  assertContains(target.extensionJsPath, '&&!t)return!1');
  assertContains(target.extensionJsPath, 'Codex Local Groups: 已保存。');
  assertNotContains(target.extensionJsPath, '已保存，请 Reload Window 生效');
  assertNotContains(target.extensionJsPath, 'typeof navigator<"u"&&navigator');
  assertContains(target.headerPath, 'codexLocalGroupsHeaderPatchVersion=26');
  assertContains(target.headerPath, 'codexLocalGroupsDecoratedItem');
  assertContains(target.headerPath, 'codexLocalGroupsLocalTitle');
  assertContains(target.headerPath, 'codexLocalGroupsNormalizeGroupName');
  assertContains(target.headerPath, 'codexLocalGroupsToggleGroup');
  assertContains(target.headerPath, 'codexLocalGroupsVisibleItems');
  assertContains(target.headerPath, 'codex-local-groups-collapsed-v1');
  assertContains(target.headerPath, 'codex-local-groups-expanded-all-v1');
  assertContains(target.headerPath, 'aria-expanded');
  assertContains(target.headerPath, '展开全部');
  assertContains(target.headerPath, '收起到最近 5 条');
  assertContains(target.headerPath, 'titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0');
  assertContains(target.headerPath, 'e.groups.sort');
  assertContains(target.headerPath, 'bg-token-list-hover-background');
  assertContains(target.headerPath, '#93c5fd');
  assertContains(target.headerPath, 'borderLeftColor:i.label===`未分组`');
  assertContains(target.headerPath, 'codexLocalGroupsUuidTime');
  assertContains(target.headerPath, 'codex-local-groups-refresh');
  assertContains(target.headerPath, 'codexLocalGroupsStoreMeta(r,!0)');
  assertContains(target.headerPath, 'e.groupMap.has(f.group)');
  assertContains(target.headerPath, 'Date.now()-n<600000');
  assertContains(target.headerPath, 'codexLocalGroupsSetBusy');
  assertContains(target.headerPath, 'n.textContent===t&&(n.textContent=r)');
  assertContains(target.headerPath, 't[20]!==o');
  assertContains(target.headerPath, '打开中…');
  assertContains(target.headerPath, 'max-h-[450px]');
  assertContains(target.headerPath, 'dispatchHostMessage({type:`navigate-to-route`,path:`/local/');
  assertContains(target.headerPath, 't.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptGroup');
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
