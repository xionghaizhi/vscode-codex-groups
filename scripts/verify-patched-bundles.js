const fs = require('fs');
const { CodexExtensionLocator } = require('../src/extensionLocator');
const { CodexPatchEngine } = require('../src/patchEngine');
const { configuredCustomModelProviderId } = require('../src/codexConfig');
const { resolveNodePath } = require('./node-path');

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    process.exit(1);
  }
}

function main() {
  const locatorOptions = process.env.CODEX_EXTENSIONS_ROOT ? { extensionsRoot: process.env.CODEX_EXTENSIONS_ROOT } : {};
  const target = new CodexExtensionLocator(locatorOptions).locate();
  const is26727 = String(target.version).startsWith('26.727.');
  const is265730 = String(target.version).startsWith('26.5730.');
  const is265803 = String(target.version).startsWith('26.5803.');
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
  const provider = configuredCustomModelProviderId();
  const fallbacks = fs.readFileSync(target.extensionJsPath, 'utf8').match(/,"-c","model_providers\.[A-Za-z0-9_-]+\.supports_websockets=false"/g) || [];
  if (target.version === '26.721.41059' && provider) {
    const expected = `,"-c","model_providers.${provider}.supports_websockets=false"`;
    if (fallbacks.length !== 1 || fallbacks[0] !== expected) throw new Error(`Responses WebSocket fallback 不匹配：${target.extensionJsPath}`);
  } else if (fallbacks.length) {
    throw new Error(`存在过期 Responses WebSocket fallback：${target.extensionJsPath}`);
  }
  const headerMarker = is265803 ? 'codexLocalGroupsHeaderSafe265803PatchVersion=1' : `codexLocalGroupsHeaderSafePatchVersion=${is265730 ? 16 : is26727 ? 15 : 14}`;
  const rowMarker = is265803 ? 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),' : is265730 ? 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(24),' : is26727 ? 'qn=(0,Wn.memo)(function(e){let t=(0,Un.c)(24),' : 'Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(24),';
  const titleSlot = is265803 ? 24 : 23;
  assertContains(target.headerPath, headerMarker);
  assertContains(target.headerPath, rowMarker);
  assertContains(target.headerPath, `t[${titleSlot}]!==n.conversation.title`);
  assertContains(target.headerPath, `t[${titleSlot}]=n.conversation.title`);
  assertContains(target.headerPath, 'titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0');
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
  const historySource = is265803 ? '{data:m}=r(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)' : is265730 ? '{data:d}=p(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)' : is26727 ? '{data:f}=v(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)' : '{data:d}=ee(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)';
  assertContains(target.headerPath, historySource);
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
  const projectRowsViewRuntime = is265803 || is265730 ? 'Dn' : is26727 ? 'Wn' : 'Gn';
  assertContains(target.headerPath, `function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,${projectRowsViewRuntime}.useState)(0);return(0,${projectRowsViewRuntime}.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(\`codex-local-groups-refresh\`,e),()=>window.removeEventListener(\`codex-local-groups-refresh\`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}`);
  const projectRowsView = is265803 ? '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:N' : is265730 ? '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:P' : is26727 ? '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:te' : '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F';
  assertContains(target.headerPath, projectRowsView);
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
  if (is26727) {
    assertContains(target.headerPath, 'N0 as codexLocalGroupsMessengerImport');
    assertNotContains(target.headerPath, 'qQ as codexLocalGroupsMessengerImport');
    assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsProjectHistory26727PatchVersion=5');
    assertContains(target.appServerManagerSignalsPath, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations26727(this,e)}');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.addThreadArchivedListener===`function`');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.listAllThreads!==`function`');
    assertNotContains(target.appServerManagerSignalsPath, 'Number.MAX_SAFE_INTEGER');
    assertContains(target.appMainPath, 'codexLocalGroupsCodexUi26727PatchVersion=3');
    assertContains(target.appMainPath, 'r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)');
    assertContains(target.appMainPath, 'isBackgroundSubagentsEnabled:o=!0');
    assertContains(target.appMainPath, 'type:`subagent-activity`');
    assertContains(target.appStatsigPath, 'codexLocalGroupsPower26727PatchVersion=3');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:max');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:ultra');
    assertContains(target.appStatsigPath, 'zUt([...yG,VUt].filter');
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`max`)');
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`ultra`)');
    assertContains(target.appStatsigPath, 'isBackgroundSubagentsEnabled:!0');
    assertContains(target.appStatsigPath, 'subagentsPanel');
    assertNotContains(target.appMainPath, '1221508807');
    assertNotContains(target.appStatsigPath, '1221508807');
  }
  if (is265730) {
    assertContains(target.extensionJsPath, 'this.onTimeout()},12e4))}dispose(){this.disposed=!0');
    assertNotContains(target.extensionJsPath, 'this.onTimeout()},3e4))}dispose(){this.disposed=!0');
    assertContains(target.extensionJsPath, 'if(codexLocalGroupsHandleWebviewMessage(c,e))return;this.handleMessage(e,c)});');
    assertContains(target.headerPath, 'N$ as codexLocalGroupsMessengerImport');
    assertContains(target.headerPath, 'wB as codexUseExecutionTarget');
    assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsProjectHistory265730PatchVersion=1');
    assertContains(target.appServerManagerSignalsPath, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265730(this,e)}');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.addThreadArchivedListener===`function`');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.listAllThreads!==`function`');
    assertNotContains(target.appServerManagerSignalsPath, 'Number.MAX_SAFE_INTEGER');
    assertContains(target.appMainPath, 'codexLocalGroupsCodexUi265730PatchVersion=1');
    assertContains(target.appMainPath, 'r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)');
    assertContains(target.appStatsigPath, 'codexLocalGroupsPower265730PatchVersion=1');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:max');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:ultra');
    assertContains(target.appStatsigPath, 'vOt([...Dq,bOt].filter');
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`max`)');
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`ultra`)');
    assertContains(target.appMainPath, 'isBackgroundSubagentsEnabled:o=!0');
    assertContains(target.appMainPath, 'type:`subagent-activity`');
    assertContains(target.appStatsigPath, 'isBackgroundSubagentsEnabled:!0');
    assertContains(target.appStatsigPath, 'subagentsPanel');
    assertNotContains(target.appMainPath, '1221508807');
    assertNotContains(target.appStatsigPath, '1221508807');
  }
  if (is265803) {
    verifyOpenedConversationTitle265803(target.headerPath);
    verifyComposerSubagentPanel265803(target.appMainPath, target.appStatsigPath);
    assertContains(target.extensionJsPath, 'this.onTimeout()},12e4))}dispose(){this.disposed=!0');
    assertNotContains(target.extensionJsPath, 'this.onTimeout()},3e4))}dispose(){this.disposed=!0');
    assertContains(target.extensionJsPath, 'if(codexLocalGroupsHandleWebviewMessage(c,e))return;this.handleMessage(e,c)});');
    assertContains(target.headerPath, '$1 as codexLocalGroupsMessengerImport');
    assertContains(target.headerPath, 'LV as codexUseExecutionTarget');
    assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsProjectHistory265803PatchVersion=1');
    assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsPower265803PatchVersion=1');
    assertContains(target.appServerManagerSignalsPath, 'ROt([...JK,BOt].filter');
    assertContains(target.appMainPath, 'codexLocalGroupsCodexUi265803PatchVersion=1');
    assertContains(target.appMainPath, 'isBackgroundSubagentsEnabled:o=!0');
    assertMatches(target.appMainPath, /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6000}?case`collabAgentToolCall`:\{if\(![A-Za-z_$][\w$]*\|\|\1\.tool===`wait`\)break;let ([A-Za-z_$][\w$]*)=\{type:`multi-agent-action`,id:\1\.id(?:,[^{}]{0,500})?\};[A-Za-z_$][\w$]*\.push\(\2\);break\}/, 'V1 子 agent 活动转换');
    assertMatches(target.appMainPath, /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6500}?case`subAgentActivity`:if\(![A-Za-z_$][\w$]*\)break;[A-Za-z_$][\w$]*\.push\(\{type:`subagent-activity`,id:\1\.id(?:,[^{}]{0,300})?\}\);break;?/, 'V2 子 agent 活动转换');
    assertContains(target.appStatsigPath, 'isBackgroundSubagentsEnabled:!0');
    assertNotContains(target.appMainPath, '1221508807');
    assertNotContains(target.appStatsigPath, '1221508807');
  }
  for (const file of bundlePaths(target)) {
    assertNotContains(file, 'requestAllThreadList(e)');
    assertNotContains(file, 'codexLocalGroupsMetadataOnly');
    assertNotContains(file, 'codexLocalGroupsMetadataItems');
    assertNotContains(file, 'codexLocalGroupsMetadataRow');
  }
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath(), safeMode: true, responsesWebsocketFallbackProvider: provider });
  for (const item of engine.runSyntaxChecks(target)) {
    console.log(`语法检查通过：${item.file}`);
  }
  console.log(`安全补丁标记检查通过：${target.extensionDir}`);
}

function verifyOpenedConversationTitle265803(headerPath) {
  assertContains(headerPath, 'codexLocalGroupsOpenedTitle265803PatchVersion=1');
  assertMatches(
    headerPath,
    /function Bn\(e\)\{let t=\(0,Gn\.c\)\(64\),\{allowInitialRouteBack:n,className:i,centerContent:a,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l\}=e;let\[,([A-Za-z_$][\w$]*)\]=\(0,In\.useState\)\(0\);\(0,In\.useEffect\)\(\(\)=>\{let e=\(\)=>\1\(e=>e\+1\);return window\.addEventListener\(`codex-local-groups-refresh`,e\),\(\)=>window\.removeEventListener\(`codex-local-groups-refresh`,e\)\},\[\]\),s=o==null\?s:codexLocalGroupsLocalTitle\(\{kind:`local`,conversation:\{id:o\}\}\)\?\?s;/,
    '26.5803 已打开会话标题刷新',
  );
}

function verifyComposerSubagentPanel265803(appMainPath, appServerPath) {
  verifySubagentMembershipProducer265803(appMainPath);
  assertMatches(appServerPath, /sS as Up/, '26.5803 子 agent 数据源导入');
  assertMatches(
    appServerPath,
    /function Cen\(e\)\{[\s\S]{0,800}?a=no\(Up,r\?n:null\)[\s\S]{0,800}?e=>e\.parentConversationId===n[\s\S]{0,500}?\.filter\(Een\)[\s\S]{0,300}?s=[A-Za-z_$][\w$]*\.filter\(wen\)[\s\S]{0,800}?visibleRows:c/,
    '26.5803 子 agent 面板行筛选',
  );
  assertMatches(appServerPath, /function wen\(e\)\{return e\.isCurrentParentTurn\}/, '26.5803 当前父轮次筛选');
  assertMatches(appServerPath, /function Een\(e\)\{return e\.canInteract&&e\.displayName\.trim\(\)\.length>0\}/, '26.5803 可交互子 agent 筛选');
  assertMatches(appServerPath, /xn=\(Xe\.length>0\|\|Ft\)[\s\S]{0,40000}?subagentsPanel:xn/, '26.5803 子 agent 面板可见性');
  assertMatches(
    appServerPath,
    /xn\?\(0,[A-Za-z_$][\w$]*\.jsx\)\(_Rt,\{agentCount:Math\.max\(Xe\.length,Pt\)[\s\S]{0,500}?rows:Xe\}\):null/,
    '26.5803 子 agent 面板渲染',
  );
  const text = fs.readFileSync(appServerPath, 'utf8');
  const panelStart = text.indexOf('function _Rt({rows:e');
  const panelEnd = text.indexOf('}var bRt,', panelStart);
  if (panelStart < 0 || panelEnd < 0 || !text.slice(panelStart, panelEnd).includes('composer.backgroundSubagents.summary')) {
    throw new Error(`缺少补丁契约：${appServerPath} 26.5803 子 agent 面板摘要`);
  }
}

function verifySubagentMembershipProducer265803(appMainPath) {
  assertMatches(
    appMainPath,
    /function Zmt\(e,t,n\)\{[\s\S]{0,700}?e\.type===`subAgentActivity`[\s\S]{0,700}?parentConversationId:t[\s\S]{0,700}?e\.type!==`collabAgentToolCall`\|\|e\.tool!==`spawnAgent`[\s\S]{0,700}?parentConversationId:t/,
    '26.5803 子 agent membership 生产者',
  );
  assertMatches(appMainPath, /function Xmt\(\{cachedConversations:e,conversationTurns:t,[^}]+\}\)\{[\s\S]{0,700}?=Zmt\(t,r,o\)\.map/, '26.5803 子 agent membership 聚合');
  assertMatches(
    appMainPath,
    /XV=(?:Fs|Ps)\(Z,\(e,\{get:t\}\)=>\{[\s\S]{0,1600}?return Xmt\(\{cachedConversations:n\.getCachedConversations\(\),conversationTurns:o,[\s\S]{0,700}?parentConversationId:e[\s\S]{0,700}?\}\)\.filter/,
    '26.5803 子 agent membership selector',
  );
  assertMatches(appMainPath, /export\{[\s\S]{0,40000}?XV as sS(?:,|\})/, '26.5803 子 agent membership 导出');
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

function assertMatches(file, pattern, label) {
  if (!pattern.test(fs.readFileSync(file, 'utf8'))) {
    throw new Error(`缺少补丁契约：${file} ${label}`);
  }
}

function assertNotContains(file, marker) {
  if (fs.readFileSync(file, 'utf8').includes(marker)) {
    throw new Error(`存在不应出现的补丁标记：${file} ${marker}`);
  }
}

module.exports = { verifyComposerSubagentPanel265803, verifyOpenedConversationTitle265803 };
