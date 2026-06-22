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
  assertContains(target.extensionJsPath, '"account-info":async()=>({accountId:null,userId:null,plan:null,email:null,computeResidency:null})');
  assertNotContains(target.extensionJsPath, 'Unable to extract account id and plan from auth token.');
  assertContains(target.extensionJsPath, '"--disable","plugins"');
  assertContains(target.extensionJsPath, '"mcp_oauth_credentials_store=\\"file\\""');
  assertNotContains(target.extensionJsPath, 'typeof navigator<"u"&&navigator');
  assertContains(target.headerPath, 'codexLocalGroupsHeaderPatchVersion=33');
  assertContains(target.headerPath, 'paddingRight:`160px`');
  assertNotContains(target.headerPath, 'paddingRight:`112px`');
  assertContains(target.headerPath, 'codex-local-groups-conversation-row relative');
  assertContains(target.headerPath, 'codex-local-groups-inline-actions absolute');
  assertContains(target.headerPath, 'top-1');
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
  assertContains(target.headerPath, 'function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow)');
  assertContains(target.headerPath, '(0,Q.jsx)(codexLocalGroupsRow,{item:o');
  assertNotContains(target.headerPath, '(0,Q.jsx)(Je,{item:o');
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
  assertContains(target.headerPath, 'codexLocalGroupsStoreCurrentRoot');
  assertContains(target.headerPath, 'codexRecentTaskMenuCurrentRoot');
  assertContains(target.headerPath, 'codex-local-groups-current-root-v1');
  assertContains(target.headerPath, 'n.textContent===t&&(n.textContent=r)');
  assertContains(target.headerPath, 't[20]!==o');
  assertContains(target.headerPath, 't[33]!==codexLocalGroupsRefresh');
  assertContains(target.headerPath, 'function rt(e){let t=(0,Z.c)(35)');
  assertNotContains(target.headerPath, 'codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot)');
  assertNotContains(target.headerPath, 't[31]!==codexLocalGroupsRefresh');
  assertNotContains(target.headerPath, 't[31]=codexLocalGroupsRefresh');
  assertContains(target.headerPath, '打开中…');
  assertContains(target.headerPath, 'max-h-[450px]');
  assertNotContains(target.headerPath, 'dispatchHostMessage({type:`navigate-to-route`,path:`/local/');
  assertContains(target.headerPath, 't.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptGroup');
  assertNotContains(target.headerPath, 'overflow-hidden rounded-lg');
  assertContains(target.headerPath, 'children:`设置标题`');
  assertContains(target.headerPath, 'children:`设置分组`');
  assertNotContains(target.headerPath, '`set-group-`+o.key');
  assertNotContains(target.headerPath, 'border-l pb-1 pl-8');
  assertContains(target.headerPath, 'promptConversationTitle');
  assertContains(target.headerPath, 'promptConversationGroup');
  assertContains(target.headerPath, 'metadataSaved');
  assertContains(target.headerPath, '(a.updatedAtMs??0)>(o.updatedAtMs??0)');
  assertContains(target.appMainPath, 'codexLocalGroupsWebviewPatchVersion=6');
  assertContains(target.appMainPath, 'preventAllNetworkTraffic:!0');
  assertContains(target.appMainPath, 'promptConversationTitle');
  assertContains(target.appMainPath, 'codexTitleAliasFor');
  assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentPatchVersion=1');
  assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentThreadListParams');
  assertContains(target.appServerManagerSignalsPath, 'codex-local-groups-current-root-v1');
  assertContains(target.appServerManagerSignalsPath, 'cwds:t');
  assertContains(target.requestPath, 'codexLocalGroupsRequestPatchVersion=1');
  assertContains(target.requestPath, 'codexLocalGroupsIsDisabledUsageRequest');
  assertContains(target.requestPath, 'if(codexLocalGroupsIsDisabledUsageRequest(s))return null');
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
