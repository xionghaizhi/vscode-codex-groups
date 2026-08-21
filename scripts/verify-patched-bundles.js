const fs = require('fs');
const { CodexExtensionLocator } = require('../src/extensionLocator');
const { CodexPatchEngine } = require('../src/patchEngine');
const { configuredCustomModelProviderId } = require('../src/codexConfig');
const { resolveNodePath } = require('./node-path');

const CODEX_265810_VERIFIER_VARIANTS = {
  41047: {
    historySource: '{data:p}=j(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)',
    projectRowsView: '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:y,onClose:i,row:An,onActiveArchiveStart:u}',
    messengerImport: 'Oat as codexLocalGroupsMessengerImport',
    executionTargetImport: 'KZ as codexUseExecutionTarget',
    powerUltraCall: 'Pon([...Ion,Lon].filter',
    composer: { producer: 'dyn', aggregator: 'uyn', store: 'lJ', storeFactory: 'Dc', storeRead: 'wc', hook: 'DOr', interactFilter: 'AOr', turnFilter: 'OOr', composer: 'aNr', panel: 'xzn', panelFlag: 'fn', jsx: 'J6' },
  },
  52044: {
    historySource: '{data:h}=te(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)',
    projectRowsView: '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:y,onClose:a,row:An,onActiveArchiveStart:f}',
    messengerImport: 'kat as codexLocalGroupsMessengerImport',
    executionTargetImport: 'qZ as codexUseExecutionTarget',
    powerUltraCall: 'Fon([...Lon,Ron].filter',
    composer: { producer: 'fyn', aggregator: 'dyn', store: 'uJ', storeFactory: 'Nc', storeRead: 'jc', hook: 'AOr', interactFilter: 'NOr', turnFilter: 'jOr', composer: 'cNr', panel: 'Szn', panelFlag: 'pn', jsx: 'q6' },
  },
};
const CODEX_265814_VERIFIER_VARIANTS = {
  41407: {
    historySource: '{data:f}=n(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)',
    projectRowsView: '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:I,activeId:v,onClose:a,row:An,onActiveArchiveStart:d}',
    messengerImport: 'Vst as codexLocalGroupsMessengerImport',
    executionTargetImport: 'U$ as codexUseExecutionTarget',
    powerUltraCall: 'Jdn([...Xdn,Zdn].filter',
  },
};
const CODEX_265818_VERIFIER_VARIANTS = {
  31338: {
    historySource: '{data:f}=a(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)',
    projectRowsView: '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:v,onClose:i,row:An,onActiveArchiveStart:d}',
    messengerImport: 'Flt as codexLocalGroupsMessengerImport',
    executionTargetImport: 'c0 as codexUseExecutionTarget',
    powerUltraCall: 'ogn([...cgn,lgn].filter',
  },
};
const HISTORY_265818_TITLE_CALL = '(t=>{let n=$j(String(t.name??``).trim())||String(t.name??``).trim()||null;if(n)return n;let r=sw(String(t.preview??``));if(r==null&&String(t.preview??``).trimStart().startsWith(`<codex_delegation>`))return null;let i=$j(String(r?.input??t.preview??``).trim())||String(r?.input??t.preview??``).trim()||null;return i==null?null:sA(i,60)})(r)';

function minifiedBlockScope(text, open) {
  if (open < 0 || text[open] !== '{') return '';
  let depth = 0;
  let quote = '';
  let regex = false;
  let characterClass = false;
  let previous = '';
  for (let index = open; index < text.length; index += 1) {
    const current = text[index];
    if ((quote || regex) && current === '\\') { index += 1; continue; }
    if (quote) { if (current === quote) { quote = ''; previous = 'x'; } continue; }
    if (regex) {
      if (current === '[') characterClass = true;
      if (current === ']') characterClass = false;
      if (current === '/' && !characterClass) { regex = false; previous = 'x'; }
      continue;
    }
    if (current === "'" || current === '"' || current === '`') { quote = current; continue; }
    if (current === '/' && text[index + 1] === '*') { index = text.indexOf('*/', index + 2); if (index < 0) return ''; index += 1; continue; }
    if (current === '/' && text[index + 1] === '/') { index = text.indexOf('\n', index + 2); if (index < 0) return ''; continue; }
    if (current === '/' && /[({[,:;=!?&|+*%^~<>-]/.test(previous)) { regex = true; continue; }
    if (current === '{') depth += 1;
    if (current === '}' && --depth === 0) return text.slice(open, index + 1);
    if (!/\s/.test(current)) previous = current;
  }
  return '';
}

function minifiedFunctionScope(text, name) {
  const start = text.indexOf(`function ${name}`);
  if (start < 0) return '';
  const open = text.indexOf('){', start);
  const body = minifiedBlockScope(text, open + 1);
  return body ? text.slice(start, open + 1) + body : '';
}

function minifiedCodeAtDepth(text, wanted) {
  let depth = 0;
  let quote = '';
  let regex = false;
  let characterClass = false;
  let previous = '';
  let output = '';
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if ((quote || regex) && current === '\\') { if (depth === wanted) output += current + text[index + 1]; index += 1; continue; }
    if (quote) { if (depth === wanted) output += current; if (current === quote) { quote = ''; previous = 'x'; } continue; }
    if (regex) {
      if (depth === wanted) output += current;
      if (current === '[') characterClass = true;
      if (current === ']') characterClass = false;
      if (current === '/' && !characterClass) { regex = false; previous = 'x'; }
      continue;
    }
    if (current === "'" || current === '"' || current === '`') { quote = current; if (depth === wanted) output += current; continue; }
    if (current === '/' && text[index + 1] === '*') { index = text.indexOf('*/', index + 2); if (index < 0) return ''; index += 1; continue; }
    if (current === '/' && text[index + 1] === '/') { index = text.indexOf('\n', index + 2); if (index < 0) return output; continue; }
    if (current === '/' && /[({[,:;=!?&|+*%^~<>-]/.test(previous)) { regex = true; if (depth === wanted) output += current; continue; }
    if (current === '{') depth += 1;
    else if (current === '}') depth -= 1;
    else if (depth === wanted) output += current;
    if (!/\s/.test(current)) previous = current;
  }
  return output;
}

function minifiedAnchoredBlock(text, anchor, wanted) {
  let depth = 0, quote = '', regex = false, characterClass = false, previous = '', match = '';
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (!quote && !regex && depth === wanted && text.startsWith(anchor, index)) {
      if (match) return '';
      match = minifiedBlockScope(text, index + anchor.length - 1);
    }
    if ((quote || regex) && current === '\\') { index += 1; continue; }
    if (quote) { if (current === quote) { quote = ''; previous = 'x'; } continue; }
    if (regex) {
      if (current === '[') characterClass = true;
      if (current === ']') characterClass = false;
      if (current === '/' && !characterClass) { regex = false; previous = 'x'; }
      continue;
    }
    if (current === "'" || current === '"' || current === '`') { quote = current; continue; }
    if (current === '/' && text[index + 1] === '*') { index = text.indexOf('*/', index + 2); if (index < 0) return ''; index += 1; continue; }
    if (current === '/' && text[index + 1] === '/') { index = text.indexOf('\n', index + 2); if (index < 0) return ''; continue; }
    if (current === '/' && /[({[,:;=!?&|+*%^~<>-]/.test(previous)) { regex = true; continue; }
    if (current === '{') depth += 1;
    else if (current === '}') depth -= 1;
    if (!/\s/.test(current)) previous = current;
  }
  return match;
}

function minifiedNestedBlock(text, anchors) {
  let block = text;
  for (const [anchor, depth] of anchors) block = minifiedAnchoredBlock(block, anchor, depth);
  return block;
}

function minifiedExactFunctionScopes(text, anchor) {
  const scopes = [];
  let start = 0;
  while ((start = text.indexOf(anchor, start)) >= 0) {
    const body = minifiedBlockScope(text, start + anchor.length - 1);
    if (body) scopes.push(anchor + body.slice(1));
    start += anchor.length;
  }
  return scopes;
}

function exactVerifierBuild(version, prefix, variants) {
  if (!String(version).startsWith(prefix + '.')) return '';
  const parts = String(version).split('.');
  if (parts.length !== 3 || !variants[parts[2]]) throw new Error(`不支持的 Codex ${prefix} build：${version}`);
  return parts[2];
}
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
  const is265810 = String(target.version).startsWith('26.5810.');
  const is265814 = String(target.version).startsWith('26.5814.');
  const is265818 = String(target.version).startsWith('26.5818.');
  const codex265810Build = exactVerifierBuild(target.version, '26.5810', CODEX_265810_VERIFIER_VARIANTS);
  const codex265814Build = exactVerifierBuild(target.version, '26.5814', CODEX_265814_VERIFIER_VARIANTS);
  const codex265818Build = exactVerifierBuild(target.version, '26.5818', CODEX_265818_VERIFIER_VARIANTS);
  const v265810 = CODEX_265810_VERIFIER_VARIANTS[codex265810Build] || null;
  const v265814 = CODEX_265814_VERIFIER_VARIANTS[codex265814Build] || null;
  const v265818 = CODEX_265818_VERIFIER_VARIANTS[codex265818Build] || null;
  const v26581x = v265818 || v265814 || v265810;
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
  const headerMarker = is265810 || is265814 || is265818 ? 'codexLocalGroupsHeaderSafe265810PatchVersion=1' : is265803 ? 'codexLocalGroupsHeaderSafe265803PatchVersion=1' : `codexLocalGroupsHeaderSafePatchVersion=${is265730 ? 16 : is26727 ? 15 : 14}`;
  const rowMarker = is265810 || is265814 || is265818 || is265803 ? 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),' : is265730 ? 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(24),' : is26727 ? 'qn=(0,Wn.memo)(function(e){let t=(0,Un.c)(24),' : 'Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(24),';
  const titleSlot = is265810 || is265814 || is265818 || is265803 ? 24 : 23;
  assertContains(target.headerPath, headerMarker);
  assertContains(target.headerPath, rowMarker);
  assertContains(target.headerPath, `t[${titleSlot}]!==n.conversation.title`);
  assertContains(target.headerPath, `t[${titleSlot}]=n.conversation.title`);
  assertContains(target.headerPath, 'titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0');
  if (is265818) verifyHeaderTitleOverride265818(target.headerPath);
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
  const historySource = is265810 || is265814 || is265818 ? v26581x.historySource : is265803 ? '{data:m}=r(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)' : is265730 ? '{data:d}=p(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)' : is26727 ? '{data:f}=v(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)' : '{data:d}=ee(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)';
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
  const projectRowsViewRuntime = is265810 || is265814 || is265818 || is265803 || is265730 ? 'Dn' : is26727 ? 'Wn' : 'Gn';
  assertContains(target.headerPath, `function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,${projectRowsViewRuntime}.useState)(0);return(0,${projectRowsViewRuntime}.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(\`codex-local-groups-refresh\`,e),()=>window.removeEventListener(\`codex-local-groups-refresh\`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}`);
  const projectRowsView = is265810 || is265814 || is265818 ? v26581x.projectRowsView : is265803 ? '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:N' : is265730 ? '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:P' : is26727 ? '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:te' : '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F';
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

  if (is265810 || is265814 || is265818) {
    if (is265818) verifyOpenedConversationTitle265818(target.headerPath);
    else if (is265814) verifyOpenedConversationTitle265814(target.headerPath);
    else verifyOpenedConversationTitle265810(target.headerPath);
    if (is265818) verifyComposerSubagentPanel265818(target.appMainPath);
    else if (is265814) verifyComposerSubagentPanel265814(target.appMainPath);
    else verifyComposerSubagentPanel265810(target.appMainPath, codex265810Build);
    if (is265818) verifyWatchdog265818(target.extensionJsPath);
    else {
      assertContains(target.extensionJsPath, 'timeoutMs:12e4})},12e4)');
      assertNotContains(target.extensionJsPath, 'timeoutMs:3e4})},3e4)');
    }
    assertContains(target.extensionJsPath, 'if(codexLocalGroupsHandleWebviewMessage(c,e))return;this.handleMessage(e,c)});');
    assertContains(target.extensionJsPath, `if(codexLocalGroupsHandleWebviewMessage(n))return;let o=${is265818 ? 'nY' : is265814 ? 'Q9' : 'B8'}(n)`);
    if (is265818) verifyExecutionTargetImport265818(target.headerPath);
    else {
      assertContains(target.headerPath, v26581x.messengerImport);
      assertContains(target.headerPath, v26581x.executionTargetImport);
    }
    assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsProjectHistory265810PatchVersion=1');
    assertContains(target.appServerManagerSignalsPath, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265810(this,e)}');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.addThreadArchivedListener===`function`');
    assertContains(target.appServerManagerSignalsPath, 'typeof e.listAllThreads!==`function`');
    if (is265818) verifyProjectHistory265818(target.appServerManagerSignalsPath);
    assertNotContains(target.appServerManagerSignalsPath, 'Number.MAX_SAFE_INTEGER');
    assertContains(target.appMainPath, 'codexLocalGroupsCodexUi265810PatchVersion=1');
    assertContains(target.appMainPath, 'r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)');
    assertContains(target.appStatsigPath, 'codexLocalGroupsPower265810PatchVersion=1');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:max');
    assertContains(target.appStatsigPath, 'gpt-5.6-sol:ultra');
    assertContains(target.appStatsigPath, v26581x.powerUltraCall);
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`max`)');
    assertContains(target.appStatsigPath, 'r.some(e=>e.reasoningEffort===`ultra`)');
    if (is265818) verifyPower265818(target.appStatsigPath);
    assertMatches(target.appMainPath, /isBackgroundSubagentsEnabled:[A-Za-z_$][\w$]*=!0/, `${is265818 ? '26.5818' : is265814 ? '26.5814' : '26.5810'} 背景子 agent 默认开启`);
    assertMatches(target.appMainPath, /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6000}?case`collabAgentToolCall`:\{if\(![A-Za-z_$][\w$]*\|\|\1\.tool===`wait`\)break;let ([A-Za-z_$][\w$]*)=\{type:`multi-agent-action`,id:\1\.id(?:,[^{}]{0,500})?\};[A-Za-z_$][\w$]*\.push\(\2\);break\}/, 'V1 子 agent 活动转换');
    assertMatches(target.appMainPath, /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6500}?case`subAgentActivity`:if\(![A-Za-z_$][\w$]*\)break;[A-Za-z_$][\w$]*\.push\(\{type:`subagent-activity`,id:\1\.id(?:,[^{}]{0,300})?\}\);break;?/, 'V2 子 agent 活动转换');
    assertNotContains(target.appMainPath, '1221508807');
    assertNotContains(target.appStatsigPath, '1221508807');
    if (is265814 || is265818) verifyMetadata265814(target.extensionJsPath, target.headerPath, is265818 ? 'nY' : 'Q9');
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

function verifyOpenedConversationTitle265810(headerPath) {
  assertContains(headerPath, 'codexLocalGroupsOpenedTitle265810PatchVersion=1');
  assertMatches(
    headerPath,
    /function Bn\(e\)\{let t=\(0,Gn\.c\)\(64\),\{allowInitialRouteBack:r,className:i,centerContent:a,desktopDeepLinkConversationId:s,title:c,onBack:l,trailing:u\}=e;let\[,([A-Za-z_$][\w$]*)\]=\(0,In\.useState\)\(0\);\(0,In\.useEffect\)\(\(\)=>\{let e=\(\)=>\1\(e=>e\+1\);return window\.addEventListener\(`codex-local-groups-refresh`,e\),\(\)=>window\.removeEventListener\(`codex-local-groups-refresh`,e\)\},\[\]\),c=s==null\?c:codexLocalGroupsLocalTitle\(\{kind:`local`,conversation:\{id:s\}\}\)\?\?c;/,
    '26.5810 已打开会话标题刷新',
  );
}

function verifyOpenedConversationTitle265814(headerPath) {
  assertContains(headerPath, 'codexLocalGroupsOpenedTitle265810PatchVersion=1');
  assertMatches(
    headerPath,
    /function zn\(e\)\{let t=\(0,Wn\.c\)\(64\),\{allowInitialRouteBack:r,className:i,centerContent:a,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l\}=e;let\[,([A-Za-z_$][\w$]*)\]=\(0,In\.useState\)\(0\);\(0,In\.useEffect\)\(\(\)=>\{let e=\(\)=>\1\(e=>e\+1\);return window\.addEventListener\(`codex-local-groups-refresh`,e\),\(\)=>window\.removeEventListener\(`codex-local-groups-refresh`,e\)\},\[\]\),s=o==null\?s:codexLocalGroupsLocalTitle\(\{kind:`local`,conversation:\{id:o\}\}\)\?\?s;/,
    '26.5814 已打开会话标题刷新',
  );
}

function verifyMetadata265814(extensionJsPath, headerPath, parser = 'Q9') {
  const header = fs.readFileSync(headerPath, 'utf8');
  const host = fs.readFileSync(extensionJsPath, 'utf8');
  const label = parser === 'nY' ? '26.5818' : '26.5814';
  if (!headerMetadata265814Holds(header)) throw new Error(`缺少补丁契约：${headerPath} ${label} Metadata Header 入口`);
  if (!hostMetadata265814Holds(host, parser)) throw new Error(`缺少补丁契约：${extensionJsPath} ${label} Metadata Host 回调`);
}

function headerMetadata265814Holds(text) {
  const title = minifiedFunctionScope(text, 'codexLocalGroupsPromptTitle');
  const group = minifiedFunctionScope(text, 'codexLocalGroupsPromptGroup');
  const newGroup = minifiedFunctionScope(text, 'codexLocalGroupsPromptNewGroup');
  const start = minifiedFunctionScope(text, 'codexLocalGroupsStartConversationInGroup');
  const anchor = 'window.addEventListener(`message`,e=>{';
  const listener = minifiedBlockScope(text, text.indexOf(anchor) + anchor.length - 1);
  const dispatch = 'codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{';
  const titleMessage = minifiedAnchoredBlock(minifiedAnchoredBlock(title, 'try{', 1), dispatch, 1);
  const groupMessage = minifiedAnchoredBlock(minifiedAnchoredBlock(group, 'try{', 1), dispatch, 1);
  const newGroupMessage = minifiedAnchoredBlock(minifiedAnchoredBlock(newGroup, 'try{', 1), dispatch, 1);
  const startTry = minifiedAnchoredBlock(start, 'try{', 1);
  const startMessage = minifiedAnchoredBlock(startTry, dispatch, 1);
  return minifiedCodeAtDepth(titleMessage, 1).includes('action:`promptConversationTitle`')
    && minifiedCodeAtDepth(groupMessage, 1).includes('action:`promptConversationGroup`')
    && minifiedCodeAtDepth(newGroupMessage, 1).includes('action:`promptNewGroup`')
    && minifiedCodeAtDepth(startMessage, 1).includes('action:`setPendingGroup`')
    && minifiedCodeAtDepth(minifiedAnchoredBlock(startTry, 'codexLocalGroupsMessenger.dispatchHostMessage({', 1), 1).includes('type:`new-chat`')
    && minifiedCodeAtDepth(listener, 1).includes('t.action===`metadataSaved`')
    && minifiedCodeAtDepth(listener, 1).includes('codexLocalGroupsStoreMeta(')
    && text.includes('var codexLocalGroupsMessenger=codexLocalGroupsMessengerImport');
}

function hostMetadata265814Holds(text, parser = 'Q9') {
  const conversation = minifiedFunctionScope(text, 'codexLocalGroupsPromptConversation');
  const groupSave = minifiedFunctionScope(text, 'codexLocalGroupsSavePromptGroup');
  const newGroup = minifiedFunctionScope(text, 'codexLocalGroupsPromptNewGroup');
  const message = minifiedFunctionScope(text, 'codexLocalGroupsHandleWebviewMessage');
  const conversationDirect = minifiedCodeAtDepth(conversation, 1);
  const messageDirect = minifiedCodeAtDepth(minifiedAnchoredBlock(message, 'try{', 1), 1);
  const rpcAnchor = 'onDidReceiveMessage(n=>{';
  const rpc = minifiedBlockScope(text, text.indexOf(rpcAnchor) + rpcAnchor.length - 1);
  const webviewAnchor = 'onDidReceiveMessage(c=>{';
  const webview = minifiedBlockScope(text, text.indexOf(webviewAnchor) + webviewAnchor.length - 1);
  return conversationDirect.includes('e.action==="promptConversationTitle"') && minifiedCodeAtDepth(minifiedAnchoredBlock(conversation, 'if(!o){', 1), 1).includes('codexLocalGroupsPromptGroupPick(r,')
    && minifiedCodeAtDepth(minifiedNestedBlock(conversation, [['codexLocalGroupsInputBox("设置本地标题",i,(i,a)=>{', 1], ['try{', 1], ['t?.postMessage?.({', 1]]), 1).includes('action:"metadataSaved",metadata:s')
    && minifiedCodeAtDepth(minifiedNestedBlock(groupSave, [['try{', 1], ['n?.postMessage?.({', 1]]), 1).includes('action:"metadataSaved",metadata:i')
    && minifiedCodeAtDepth(minifiedNestedBlock(newGroup, [['codexLocalGroupsInputBox("新建需求分组","",(n,o)=>{', 1], ['try{', 1], ['t?.postMessage?.({', 1]]), 1).includes('action:"metadataSaved",metadata:s')
    && messageDirect.includes('e.action==="promptConversationTitle"||e.action==="promptConversationGroup"')
    && messageDirect.includes('e.action==="promptNewGroup"')
    && messageDirect.includes('e.action==="setPendingGroup"||e.action==="newConversationInGroup"')
    && minifiedCodeAtDepth(minifiedNestedBlock(message, [['try{', 1], ['if(e.action==="getMetadata"){', 1], ['try{', 1], ['t?.postMessage?.({', 1]]), 1).includes('action:"metadataSaved",metadata:r')
    && minifiedCodeAtDepth(rpc, 1).includes('if(codexLocalGroupsHandleWebviewMessage(n))return;let o=' + parser + '(n)')
    && minifiedCodeAtDepth(webview, 1).includes('if(codexLocalGroupsHandleWebviewMessage(c,e))return;this.handleMessage(e,c)');
}

function verifyComposerSubagentPanel265814(appMainPath) {
  const text = fs.readFileSync(appMainPath, 'utf8');
  const composer = minifiedFunctionScope(text, 'vWr');
  const body = composer.slice(composer.indexOf('){') + 1);
  const direct = minifiedCodeAtDepth(body, 1);
  const hook = minifiedAnchoredBlock(body, 'zBr({', 1);
  const layout = minifiedAnchoredBlock(body, 'QFn({', 1);
  const panelProps = minifiedAnchoredBlock(body, 'yn?(0,I6.jsx)(RQn,{', 4);
  verifySubagentMembershipProducer265814(appMainPath);
  assertMatches(appMainPath, /function zBr\(e\)\{[\s\S]{0,300}?sl\(lX,/, '26.5814 子 agent membership 消费');
  assertMatches(appMainPath, /function zBr\(e\)\{[\s\S]{0,1000}?parentConversationId===n[\s\S]{0,300}?\.filter\(HBr\)[\s\S]{0,300}?\.filter\(BBr\)[\s\S]{0,600}?visibleRows:c/, '26.5814 子 agent 面板行筛选');
  assertMatches(appMainPath, /function BBr\(e\)\{return e\.isCurrentParentTurn\}/, '26.5814 当前父轮次筛选');
  assertMatches(appMainPath, /function HBr\(e\)\{return e\.canInteract&&e\.displayName\.trim\(\)\.length>0\}/, '26.5814 可交互子 agent 筛选');
  if (!minifiedCodeAtDepth(hook, 1).includes('activeConversationId:') || !direct.includes('yn=(rt.length>0||It)&&!dt&&!hn&&!ht&&!pt')) throw new Error(`缺少补丁契约：${appMainPath} 26.5814 子 agent 面板可见性`);
  if (!minifiedCodeAtDepth(layout, 1).includes('subagentsPanel:yn') || !minifiedCodeAtDepth(panelProps, 1).includes('rows:rt')) throw new Error(`缺少补丁契约：${appMainPath} 26.5814 子 agent 面板渲染`);
  const panel = text.slice(text.indexOf('function RQn(e){'), text.indexOf('function ', text.indexOf('function RQn(e){') + 1));
  if (!panel.includes('composer.backgroundSubagents.summary') || !panel.includes('{rows:n,agentCount:r')) throw new Error(`缺少补丁契约：${appMainPath} 26.5814 子 agent 面板摘要`);
}

function verifySubagentMembershipProducer265814(appMainPath) {
  assertMatches(appMainPath, /function SNn\(e,t,n,r\)\{[\s\S]{0,500}?e\.type===`subAgentActivity`\)\{let ([A-Za-z_$][\w$]*)=js\(e\.agentThreadId\)[\s\S]{0,500}?i\.set\(\1,\{conversationId:\1,[\s\S]{0,500}?parentConversationId:t[\s\S]{0,500}?e\.tool!==`spawnAgent`\)\)for\(let ([A-Za-z_$][\w$]*) of e\.receiverThreadIds\)\{let ([A-Za-z_$][\w$]*)=js\(\2\)[\s\S]{0,500}?i\.has\(\3\)\|\|i\.set\(\3,\{conversationId:\3,[\s\S]{0,500}?parentConversationId:t/, '26.5814 子 agent membership 生产者');
  assertMatches(appMainPath, /function xNn\(\{cachedConversations:e,conversationTurns:t,[^}]+\}\)\{[\s\S]{0,900}?=SNn\(t,/, '26.5814 子 agent membership 聚合');
  assertMatches(appMainPath, /lX=Ri\([^,]+,\(e,\{get:t\}\)=>\{[\s\S]{0,300}?let n=typeof e==`string`\?e:e\.conversationId[\s\S]{0,3300}?xNn\(\{[\s\S]{0,1200}?conversationTurns:[^,}]+,[\s\S]{0,1200}?parentConversationId:n(?:,|\})/, '26.5814 子 agent membership selector');
  assertMatches(appMainPath, /lX as IC(?:,|\})/, '26.5814 子 agent membership 导出');
}

function verifyComposerSubagentPanel265810(appMainPath, build) {
  const v = CODEX_265810_VERIFIER_VARIANTS[build] && CODEX_265810_VERIFIER_VARIANTS[build].composer;
  if (!v) throw new Error(`不支持的 Codex 26.5810 build：${build}`);
  verifySubagentMembershipProducer265810(appMainPath, build);
  assertMatches(appMainPath, new RegExp('function ' + v.hook + '\\(e\\)\\{[\\s\\S]{0,900}?' + v.storeRead + '\\(' + v.store + ','), '26.5810 子 agent membership 消费');
  assertMatches(appMainPath, new RegExp('function ' + v.hook + '\\(e\\)\\{[\\s\\S]{0,1600}?parentConversationId===n[\\s\\S]{0,400}?\\.filter\\(' + v.interactFilter + '\\)[\\s\\S]{0,400}?\\.filter\\(' + v.turnFilter + '\\)[\\s\\S]{0,900}?visibleRows:c'), '26.5810 子 agent 面板行筛选');
  assertMatches(appMainPath, new RegExp('function ' + v.turnFilter + '\\(e\\)\\{return e\\.isCurrentParentTurn\\}'), '26.5810 当前父轮次筛选');
  assertMatches(appMainPath, new RegExp('function ' + v.interactFilter + '\\(e\\)\\{return e\\.canInteract&&e\\.displayName\\.trim\\(\\)\\.length>0\\}'), '26.5810 可交互子 agent 筛选');
  assertMatches(appMainPath, new RegExp('function ' + v.composer + '[\\s\\S]{0,40000}?' + v.panelFlag + '=\\(Xe\\.length>0\\|\\|kt\\)'), '26.5810 子 agent 面板可见性');
  assertMatches(appMainPath, new RegExp('function ' + v.composer + '[\\s\\S]{0,50000}?subagentsPanel:' + v.panelFlag), '26.5810 子 agent 面板开关');
  assertMatches(appMainPath, new RegExp('function ' + v.composer + '[\\s\\S]{0,80000}?' + v.panelFlag + '\\?\\(0,' + v.jsx + '\\.jsx\\)\\(' + v.panel + ',[\\s\\S]{0,400}?rows:Xe'), '26.5810 子 agent 面板渲染');
  const text = fs.readFileSync(appMainPath, 'utf8');
  const panelStart = text.indexOf('function ' + v.panel + '(e){');
  const panelEnd = text.indexOf('function ', panelStart + 1);
  if (panelStart < 0 || panelEnd < 0 || !text.slice(panelStart, panelEnd).includes('composer.backgroundSubagents.summary') || !text.slice(panelStart, panelEnd).includes('{rows:n,agentCount:r')) {
    throw new Error(`缺少补丁契约：${appMainPath} 26.5810 子 agent 面板摘要`);
  }
}

function verifySubagentMembershipProducer265810(appMainPath, build) {
  const v = CODEX_265810_VERIFIER_VARIANTS[build] && CODEX_265810_VERIFIER_VARIANTS[build].composer;
  if (!v) throw new Error(`不支持的 Codex 26.5810 build：${build}`);
  assertMatches(
    appMainPath,
    new RegExp('function ' + v.producer + '\\(e,t,[A-Za-z_$][\\w$]*,[A-Za-z_$][\\w$]*\\)\\{[\\s\\S]{0,1800}?e\\.type===`subAgentActivity`[\\s\\S]{0,500}?parentConversationId:t[\\s\\S]{0,900}?e\\.type!==`collabAgentToolCall`\\|\\|e\\.tool!==`spawnAgent`[\\s\\S]{0,500}?parentConversationId:t'),
    '26.5810 子 agent membership 生产者',
  );
  assertMatches(appMainPath, new RegExp('function ' + v.aggregator + '\\(\\{cachedConversations:e,conversationTurns:t,[^}]+\\}\\)\\{[\\s\\S]{0,900}?=' + v.producer + '\\(t,'), '26.5810 子 agent membership 聚合');
  assertMatches(appMainPath, new RegExp(v.store + '=' + v.storeFactory + '\\([^,]+,\\(e,\\{get:t\\}\\)=>\\{[\\s\\S]{0,2400}?' + v.aggregator + '\\(\\{[\\s\\S]{0,800}?conversationTurns:[^,}]+,[\\s\\S]{0,800}?parentConversationId:'), '26.5810 子 agent membership selector');
  assertMatches(appMainPath, new RegExp(v.store + ' as FT(?:,|\\})'), '26.5810 子 agent membership 导出');
}

function verifyOpenedConversationTitle265818(headerPath) {
  const text = fs.readFileSync(headerPath, 'utf8');
  const scopes = minifiedExactFunctionScopes(text, 'function zn(e){');
  const expected = /function zn\(e\)\{let t=\(0,Wn\.c\)\(64\),\{allowInitialRouteBack:n,className:r,centerContent:i,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l\}=e;let\[,([A-Za-z_$][\w$]*)\]=\(0,In\.useState\)\(0\);\(0,In\.useEffect\)\(\(\)=>\{let e=\(\)=>\1\(e=>e\+1\);return window\.addEventListener\(`codex-local-groups-refresh`,e\),\(\)=>window\.removeEventListener\(`codex-local-groups-refresh`,e\)\},\[\]\),s=o==null\?s:codexLocalGroupsLocalTitle\(\{kind:`local`,conversation:\{id:o\}\}\)\?\?s;/;
  if (scopes.length !== 1 || !text.includes('codexLocalGroupsOpenedTitle265810PatchVersion=1') || !expected.test(scopes[0])) throw new Error(`缺少补丁契约：${headerPath} 26.5818 已打开会话标题刷新`);
}

function verifyHeaderTitleOverride265818(headerPath) {
  const text = fs.readFileSync(headerPath, 'utf8');
  const anchor = 'An=(0,Dn.memo)(function(e){';
  const start = text.split(anchor).length === 2 ? text.indexOf(anchor) : -1;
  const row = start < 0 ? '' : minifiedBlockScope(text, text.indexOf('{', start));
  const kind = minifiedNestedBlock(row, [['switch(n.kind){', 1], ['case`local`:{', 1]]);
  const props = minifiedAnchoredBlock(kind, '(c=(0,Z.jsx)(Te,{', 1);
  const direct = minifiedCodeAtDepth(kind, 1);
  const title = 'threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,):void 0';
  if (!minifiedCodeAtDepth(props, 1).includes(title) || !direct.includes('t[24]!==n.conversation.title?') || !direct.includes('t[24]=n.conversation.title,t[23]=c')) {
    throw new Error(`缺少补丁契约：${headerPath} 26.5818 下拉会话标题`);
  }
}

function verifyExecutionTargetImport265818(headerPath) {
  const text = fs.readFileSync(headerPath, 'utf8');
  const imports = [...text.matchAll(/import\{([^}]+)\}from"\.\/app-initial-[^"]+\.js";/g)]
    .filter((match) => match[1].includes('codexUseExecutionTarget') || match[1].includes('codexLocalGroupsMessengerImport'));
  const bindings = imports.length === 1 ? imports[0][1] : '';
  if (!/(?:^|,)c0 as codexUseExecutionTarget(?:,|$)/.test(bindings)
    || !/(?:^|,)Flt as codexLocalGroupsMessengerImport(?:,|$)/.test(bindings)) {
    throw new Error(`缺少补丁契约：${headerPath} 26.5818 Header semantic imports`);
  }
}

function verifyWatchdog265818(extensionPath) {
  const text = fs.readFileSync(extensionPath, 'utf8');
  const anchor = 'var QP=class{';
  const start = text.split(anchor).length === 2 ? text.indexOf(anchor) : -1;
  const scope = start < 0 ? '' : minifiedBlockScope(text, text.indexOf('{', start));
  const patched = 'this.onTimeout({elapsedMs:Date.now()-e,receivedWebviewMessage:this.receivedWebviewMessage,timeoutMs:12e4})},12e4)';
  if (!scope.includes(patched) || scope.includes('timeoutMs:3e4})},3e4)')) throw new Error(`缺少补丁契约：${extensionPath} 26.5818 QP 看门狗`);
}

function verifyProjectHistory265818(serverPath) {
  const text = fs.readFileSync(serverPath, 'utf8');
  const loads = minifiedExactFunctionScopes(text, 'function codexLocalGroupsLoadProjectConversations265810(e,t){');
  const merges = minifiedExactFunctionScopes(text, 'function codexLocalGroupsMergeProjectConversations265810(e,t,n){');
  const hooks = minifiedExactFunctionScopes(text, 'function NPn(e,t,n){');
  const load = loads.length === 1 ? loads[0] : '', merge = merges.length === 1 ? merges[0] : '', hook = hooks.length === 1 ? hooks[0] : '';
  const query = minifiedNestedBlock(hook, [['HN({', 1], ['queryFn:async()=>{', 1]]);
  const loop = minifiedAnchoredBlock(query, 'for(let r of await e.listAllThreads({modelProviders:null})){', 1);
  const summary = minifiedAnchoredBlock(loop, 'n.push(jk({', 1);
  const isolated = load.includes('codexLocalGroupsProjectHistoryMatch265810(s.cwd,t)&&n.push(')
    && merge.includes('codexLocalGroupsProjectHistoryMatch265810(e?.cwd,n)&&r.set(e.id,e)')
    && loop.includes('!codexLocalGroupsProjectHistoryMatch265810(r.cwd,o))continue')
    && hook.includes('codexLocalGroupsMergeProjectConversations265810(l.data,i.data,o)');
  if (!isolated || !summary.includes('title:' + HISTORY_265818_TITLE_CALL + ',cwd:r.cwd||null')) throw new Error(`缺少补丁契约：${serverPath} 26.5818 project history 隔离与标题`);
}

function verifyPower265818(statsigPath) {
  const text = fs.readFileSync(statsigPath, 'utf8');
  const filter = minifiedFunctionScope(text, 'ogn');
  const menus = minifiedExactFunctionScopes(text, 'function v$(e,t){').filter((scope) => scope.includes('supportedReasoningEfforts'));
  const sliders = minifiedExactFunctionScopes(text, 'function $hn(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){');
  if (menus.length !== 1 || sliders.length !== 1) throw new Error(`缺少补丁契约：${statsigPath} 26.5818 Sol Reasoning menu`);
  const menu = menus[0];
  const direct = minifiedCodeAtDepth(menu, 1);
  const sliderBody = sliders[0].slice(sliders[0].indexOf('){') + 1);
  const slider = minifiedCodeAtDepth(sliderBody, 1);
  const options = 'e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)';
  const max = 'r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`})';
  const ultra = 'r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})';
  if (!slider.startsWith('let r=ogn([...cgn,lgn].filter(') || !filter.includes(options) || !direct.includes('let n=e?.find(e=>e.model===t),r=n==null?X8e.map') || !direct.includes('n.supportedReasoningEfforts.filter(e=>GS(e.reasoningEffort))') || !direct.includes('return t===`gpt-5.6-sol`&&') || !menu.includes(max) || !menu.includes(ultra) || !direct.endsWith(',r')) {
    throw new Error(`缺少补丁契约：${statsigPath} 26.5818 Sol Max Ultra`);
  }
}

function verifyComposerSubagentPanel265818(appMainPath) {
  const text = fs.readFileSync(appMainPath, 'utf8');
  const composer = minifiedFunctionScope(text, 'DXr');
  const body = composer.slice(composer.indexOf('){') + 1);
  const direct = minifiedCodeAtDepth(body, 1);
  const hook = minifiedAnchoredBlock(body, 'JKr({', 1);
  const layout = minifiedAnchoredBlock(body, 'SHn({', 1);
  const panelProps = minifiedAnchoredBlock(body, 'xn?(0,j6.jsx)($4n,{', 4);
  verifySubagentMembershipProducer265818(appMainPath);
  verifySolValidation265818(text, appMainPath);
  verifySolPersistence265818(text, appMainPath);
  if (!minifiedCodeAtDepth(hook, 1).includes('activeConversationId:') || !direct.includes('xn=(at.length>0||Rt)&&!pt&&!vn&&!_t&&!ht')) throw new Error(`缺少补丁契约：${appMainPath} 26.5818 子 agent 面板可见性`);
  if (!minifiedCodeAtDepth(layout, 1).includes('subagentsPanel:xn') || !minifiedCodeAtDepth(panelProps, 1).includes('rows:at')) throw new Error(`缺少补丁契约：${appMainPath} 26.5818 子 agent 面板渲染`);
  const panel = text.slice(text.indexOf('function $4n(e){'), text.indexOf('function ', text.indexOf('function $4n(e){') + 1));
  if (!panel.includes('composer.backgroundSubagents.summary') || !panel.includes('{rows:n,agentCount:r')) throw new Error(`缺少补丁契约：${appMainPath} 26.5818 子 agent 面板摘要`);
}

function verifySubagentMembershipProducer265818(appMainPath) {
  const text = fs.readFileSync(appMainPath, 'utf8');
  if (!subagentMembership265818Holds(text)) throw new Error(`缺少补丁契约：${appMainPath} 26.5818 子 agent membership 链`);
}

function verifySolValidation265818(text, appMainPath) {
  const selector = minifiedFunctionScope(text, 'W7e');
  const expected = 'a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort';
  if (!minifiedCodeAtDepth(selector, 1).includes(expected)) throw new Error(`缺少补丁契约：${appMainPath} 26.5818 Sol reasoning validation`);
}

function verifySolPersistence265818(text, appMainPath) {
  const read = minifiedCodeAtDepth(minifiedFunctionScope(text, 't9e'), 1);
  const write = minifiedFunctionScope(text, 'a9e');
  const setter = minifiedAnchoredBlock(write, 're=async(e,t)=>{', 1);
  const work = minifiedAnchoredBlock(setter, 'try{', 1);
  const direct = minifiedCodeAtDepth(work, 1);
  const readOk = read.includes('o?.modelReasoningEffort??_?.model_reasoning_effort??null:o?.modelReasoningEffort??null');
  const writeOk = work.includes('o.setQueryData(n,n=>n==null?n:Object.assign(structuredClone(n),{model:e,model_reasoning_effort:t}))')
    && direct.includes('o.setQueryData(n,n=>n==null?n:Object.assign(structuredClone(n),));let s=await Vi(a,c).setDefaultModelConfig(e,t,x.profile)');
  if (!readOk || !writeOk) throw new Error(`缺少补丁契约：${appMainPath} 26.5818 Sol reasoning persistence`);
}

function subagentMembership265818Holds(text) {
  const producer = minifiedFunctionScope(text, 'Wzn');
  const activity = minifiedAnchoredBlock(producer, 'if(e.type===`subAgentActivity`){', 2);
  const spawn = minifiedAnchoredBlock(producer, 'if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){', 2);
  const aggregator = minifiedFunctionScope(text, 'Uzn');
  const selectorStart = text.indexOf('Pq=ua($,(e,{get:t})=>{');
  const selector = selectorStart < 0 ? '' : minifiedBlockScope(text, text.indexOf('=>{', selectorStart) + 2);
  const directSelector = minifiedCodeAtDepth(selector, 1);
  const assigned = minifiedAnchoredBlock(selector, '=Uzn({', 1);
  const returned = minifiedAnchoredBlock(selector, 'return Uzn({', 1);
  const selection = assigned || returned;
  const hookScope = minifiedFunctionScope(text, 'JKr');
  const hook = minifiedCodeAtDepth(hookScope, 1);
  const rowCache = minifiedAnchoredBlock(hookScope, 'if(t[0]!==n||t[1]!==i||t[2]!==a){', 1);
  const rows = minifiedCodeAtDepth(rowCache, 1);
  const result = minifiedCodeAtDepth(minifiedAnchoredBlock(hookScope, 'u={', 1), 1);
  const exportStart = text.lastIndexOf('export{');
  const exportBlock = exportStart < 0 ? '' : minifiedBlockScope(text, text.indexOf('{', exportStart));
  const exports = minifiedCodeAtDepth(exportBlock, 1);
  return activity.includes('let r=bs(e.agentThreadId)') && activity.includes('i.set(r,{conversationId:r') && activity.includes('parentConversationId:t')
    && spawn.includes('let e=bs(r)') && spawn.includes('i.has(e)||i.set(e,{conversationId:e') && spawn.includes('parentConversationId:t')
    && minifiedCodeAtDepth(producer, 1).includes('return Array.from(i.values())') && /=Wzn\(t,a,(?:[A-Za-z_$][\w$]*|null),n\)/.test(minifiedCodeAtDepth(aggregator, 1))
    && directSelector.includes('let n=typeof e==`string`?e:e.conversationId') && (directSelector.match(/(?:=|return )Uzn\(\)/g) || []).length === 1
    && minifiedCodeAtDepth(selection, 1).includes('conversationTurns:') && minifiedCodeAtDepth(selection, 1).includes('parentConversationId:n')
    && /(?:^|,)Pq as sw(?:,|$)/.test(exports) && hook.includes('f(Pq,') && rows.includes('parentConversationId===n')
    && rows.includes('.filter(ZKr)') && rows.includes('.filter(YKr)') && result.includes('rows:a,visibleRows:c');
}

module.exports = { exactVerifierBuild, verifyComposerSubagentPanel265803, verifyComposerSubagentPanel265810, verifyComposerSubagentPanel265814, verifyComposerSubagentPanel265818, verifyExecutionTargetImport265818, verifyHeaderTitleOverride265818, verifyMetadata265814, verifyOpenedConversationTitle265803, verifyOpenedConversationTitle265810, verifyOpenedConversationTitle265814, verifyOpenedConversationTitle265818, verifyPower265818, verifyProjectHistory265818, verifySubagentMembershipProducer265818, verifyWatchdog265818 };
