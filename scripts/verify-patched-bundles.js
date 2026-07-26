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
  const emptyMetadata = 'var codexLocalGroupsInitialMeta={"version":1,"conversations":{}}';
  assertContains(target.extensionJsPath, 'codexLocalGroupsPatchVersion=17');
  assertNotContains(target.extensionJsPath, 'typeof $g!="undefined"?$g:require("vscode")');
  assertContains(target.extensionJsPath, 'showInputBox({title:e,prompt:e,value:t??"",ignoreFocusOut:!0})');
  assertContains(target.extensionJsPath, 'placeHolder:"选择已有分组，或新建分组",ignoreFocusOut:!0');
  assertContains(target.extensionJsPath, 'e.action==="getMetadata"');
  assertNotContains(target.extensionJsPath, 'c.cwd=s');
  assertNotContains(target.extensionJsPath, 'c.cwds=s');
  assertNotContains(target.extensionJsPath, 'workspace.workspaceFolders?.map(a=>a.uri.fsPath).filter(Boolean)??[]');
  assertNotContains(target.extensionJsPath, 'workspace.workspaceFolders?.map(c=>c.uri.fsPath)??[]');
  assertNotContains(target.extensionJsPath, '"--disable","plugins"');
  assertContains(target.headerPath, 'codexLocalGroupsHeaderSafePatchVersion=12');
  assertContains(target.headerPath, 'contentStyle:{height:`600px`,overflow:`hidden`}');
  assertContains(target.headerPath, 'className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  assertContains(target.headerPath, 'vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1');
  assertNotContains(target.headerPath, 'className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  assertNotContains(target.headerPath, 'style:{maxHeight:`600px`}');
  assertNotContains(target.headerPath, 'vertical-scroll-fade-mask flex max-h-[60vh]');
  assertNotContains(target.headerPath, 'codexLocalGroupsHeaderPatchVersion=');
  assertNotContains(target.headerPath, 'max-h-[900px]');
  assertContains(target.headerPath, 'action:`getMetadata`');
  assertContains(target.headerPath, 'dispatchHostMessage({type:`new-chat`})');
  assertContains(target.headerPath, 'codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null');
  assertContains(target.headerPath, 'codexRecentTaskRootReady?codexRecentConversationFilter');
  assertContains(target.headerPath, '{data:d}=ee(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)');
  assertContains(target.headerPath, 'function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);');
  assertContains(target.headerPath, 'function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);');
  assertContains(target.headerPath, 'function codexLocalGroupsScopeProjectRoot(e)');
  assertContains(target.headerPath, 'threadSummary:n.conversation');
  assertContains(target.headerPath, 'codexUseExecutionTarget');
  assertNotContains(target.headerPath, 'codex-local-groups-current-root-v1');
  assertContains(target.headerPath, 'function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(n)return n;let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return codexRecentTaskNormalizePath(r)}');
  assertContains(target.headerPath, 'function codexLocalGroupsProjectKey(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return t||`${e.kind}:${codexLocalGroupsProjectLabel(e)}`}');
  assertContains(target.headerPath, 'function codexLocalGroupsItemIsActive(e,t){return e.kind===`local`&&e.conversation!=null&&t===e.conversation.id}');
  assertContains(target.headerPath, 'function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow,codexLocalGroupsArchiveStart){let r=[],i=new Map;for(let a of e){let o=codexLocalGroupsProjectKey(a),s=codexLocalGroupsProjectLabel(a),d=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(a)),c=i.get(o);');
  assertContains(target.headerPath, 'function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}');
  assertContains(target.headerPath, 'c={label:s,projectRoot:d,groups:[],groupMap:new Map}');
  assertContains(target.headerPath, 'u.items.push(a)');
  assertContains(target.headerPath, 'function codexLocalGroupsGroupLimit(e,t){let n=Number(codexLocalGroupsReadJsonState(`codex-local-groups-visible-counts-v1`)[codexLocalGroupsGroupKey(e,t)]);return Number.isFinite(n)&&n>=5?Math.floor(n):5}');
  assertContains(target.headerPath, 'function codexLocalGroupsSetGroupLimit(e,t,n){let r=codexLocalGroupsReadJsonState(`codex-local-groups-visible-counts-v1`);r[codexLocalGroupsGroupKey(e,t)]=Math.max(5,Math.floor(Number(n)||5)),codexLocalGroupsWriteJsonState(`codex-local-groups-visible-counts-v1`,r)}');
  assertContains(target.headerPath, 'function codexLocalGroupsVisibleItems(e,t,n,r){let i=e.slice(0,codexLocalGroupsGroupLimit(t,n)),a=e.find(e=>codexLocalGroupsItemIsActive(e,r));return a&&!i.includes(a)&&i.push(a),i}');
  assertContains(target.headerPath, 'let s=codexLocalGroupsGroupExpanded(e.projectRoot,i.label,i,t),d=codexLocalGroupsGroupLimit(e.projectRoot,i.label),u=s?codexLocalGroupsVisibleItems(i.items,e.projectRoot,i.label,t):[],c=Math.max(0,i.items.length-u.length),l=d>5,h=d>15;return[');
  assertContains(target.headerPath, 'function codexLocalGroupsWriteJsonState(e,t){try{localStorage.setItem(e,JSON.stringify(t)),window.dispatchEvent(new Event(`codex-local-groups-refresh`))}catch{}}');
  assertContains(target.headerPath, 'codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))');
  assertContains(target.headerPath, 'group-more-');
  assertContains(target.headerPath, 'className:`sticky top-0 z-10 bg-token-dropdown-background px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-semibold text-token-foreground`');
  assertContains(target.headerPath, '收起到最近 15 条');
  assertContains(target.headerPath, '收起到最近 5 条');
  assertContains(target.headerPath, '展开更多');
  assertContains(target.headerPath, 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Gn.useState)(0);return(0,Gn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}');
  assertContains(target.headerPath, '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F');
  assertNotContains(target.headerPath, 'project-more-');
  assertNotContains(target.headerPath, 'codex-local-groups-expanded-projects-v1');
  assertNotContains(target.headerPath, 'codex-local-groups-expanded-all-v2');
  assertNotContains(target.headerPath, 'codex-local-groups-expanded-all-v1');
  assertNotContains(target.headerPath, 'codexLocalGroupsHistoryLimit=120');
  assertNotContains(target.headerPath, 'codexLocalGroupsRefreshEffect=');
  assertContains(target.headerPath, emptyMetadata);
  assertNotContains(target.appMainPath, 'codexLocalGroupsWebviewPatchVersion=');
  assertNotContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentPatchVersion=');
  assertNotContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentThreadListParams');
  assertNotContains(target.requestPath, 'codexLocalGroupsRequestPatchVersion=');
  if (String(target.version).startsWith('26.721.')) {
    assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsProjectHistoryPatchVersion=4');
    assertContains(target.appServerManagerSignalsPath, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations(this,e)}');
    assertContains(target.appServerManagerSignalsPath, 'addThreadArchivedListener');
    assertContains(target.appServerManagerSignalsPath, 'addThreadUnarchivedListener');
    assertContains(target.appServerManagerSignalsPath, 'addThreadDeletedListener');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.addThreadArchivedListener===`function`');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.listAllThreads!==`function`');
    assertNotContains(target.appServerManagerSignalsPath, 'Number.MAX_SAFE_INTEGER');
    assertContains(target.appMainPath, 'codexLocalGroupsCodexUiFeatureGatePatchVersion=2');
    assertContains(target.appMainPath, 'i===`ultra`&&t!==`gpt-5.6-sol`');
    assertContains(target.appMainPath, 'w=C===`gpt-5.6-sol`?m?.model_reasoning_effort??null:');
    assertContains(target.appMainPath, 'r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)');
    assertContains(target.appMainPath, 'function bR(){return!0}');
    assertContains(target.appMainPath, 'let h=!0,g=m.getHostId();');
    assertContains(target.appMainPath, 'let r=!0;r&&t(Dkt,n.getHostId());');
    assertNotContains(target.appMainPath, '1221508807');
    assertContains(target.appStatsigPath, 'codexLocalGroupsPowerAndSubagentsPatchVersion=2');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:max');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:ultra');
    assertContains(target.appStatsigPath, 'e.reasoningEffort===`max`||e.reasoningEffort===`ultra`');
    assertContains(target.appStatsigPath, 'XNt([...XW,QNt].filter');
    assertContains(target.appStatsigPath, 't===`gpt-5.6-sol`&&(');
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`max`)');
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`ultra`)');
    assertContains(target.appStatsigPath, 'this.scope!=null&&rke(');
    assertContains(target.appStatsigPath, 'this.scope!=null&&ike(');
    assertContains(target.appStatsigPath, '=>{t(gKe);let n=t(jS,e);');
    assertContains(target.appStatsigPath, 'isBackgroundSubagentsEnabled:!0');
    assertContains(target.appStatsigPath, 'u=!0,d;');
    assertNotContains(target.appStatsigPath, '1221508807');
  }
  for (const file of bundlePaths(target)) {
    assertNotContains(file, 'requestAllThreadList(e)');
    assertNotContains(file, 'codexLocalGroupsMetadataOnly');
    assertNotContains(file, 'codexLocalGroupsMetadataItems');
    assertNotContains(file, 'codexLocalGroupsMetadataRow');
  }
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath(), safeMode: true });
  for (const item of engine.runSyntaxChecks(target)) {
    console.log(`语法检查通过：${item.file}`);
  }
  console.log(`安全补丁标记检查通过：${target.extensionDir}`);
}

function bundlePaths(target) {
  return Array.from(new Set([
    target.extensionJsPath,
    target.headerPath,
    target.appServerManagerSignalsPath,
    target.appMainPath,
    target.appStatsigPath,
    target.requestPath,
    target.localTitlePath,
    target.sidebarPath,
    target.sidebarProjectGroupSignalsPath,
  ].filter(Boolean)));
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
