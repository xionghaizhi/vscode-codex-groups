const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');
const { CodexPatchEngine } = require('../src/patchEngine');
const { resolveNodePath } = require('../scripts/node-path');

const extensionText = [
  'var Il={workspace:{workspaceFolders:[]},EventEmitter:function(){}};',
  'var HS=1,Yf=[],_le=`provider`,I$=`Untitled`;class X{onDidChangeChatSessionItemsEmitter=new Il.EventEmitter;}',
  'async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===HS:c!==HS}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[];for(let{item:c,summary:l}of o)this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c);let s=i.map(c=>this.applyLifecycleToChatSessionItem(c));return Array.from(this.pendingConversations.values()).filter(c=>n(c.modelProvider)).map(c=>this.applyLifecycleToChatSessionItem(c.item)).concat(s)}',
  'async provideChatSessionItems(e,r){return(await this.requestThreadList(e)).data.map(o=>{let i=this.toThreadListSummary(o);return{summary:i,item:this.toChatSessionItem(i)}})}',
  'toChatSessionItem(e){let{conversationId:r,preview:n,createdAtMs:o}=e,i=xle(r),s=Cle(n),a=o!=null?{startTime:o}:void 0;return{id:String(r),resource:i,label:s,timing:a}}',
  'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider}}',
  'requestThreadList(e){let r=String(this.nextRequestId++),n=new Promise((o,i)=>{this.requestToCallback.set(r,s=>{if(s.error){i(new Error(s.error.message));return}if(s.result==null){i(new Error("No result in response"));return}o(s.result)})});return this.codexAppServer.sendRequest(_le,r,"thread/list",{limit:50,cursor:null,sortKey:"created_at",modelProviders:e?[HS]:null,archived:!1,sourceKinds:Yf}),n}',
  's=Cle(codexTitleAliasFor(r)??n) c=codexTitleAliasFor(n.conversationId)??s??I$ r.title=npe(codexTitleAliasFor(i)??s) label:codexTitleAliasFor(i)??s??void 0 r.title=npe(codexTitleAliasFor(i)??l) r.set(String(n.id),(codexTitleAliasFor(n.id)??n.name?.trim())||n.preview)',
  'var Dle=require("path");W();$t();var $g=1;',
  'var nC=class{constructor(e,r){this.#r=e,this.#e=[e.onDidReceiveMessage(n=>{let o=a2(n);o!=null&&this.#a(o.message)}),r(()=>{this.dispose()})]}};',
  'var Ll=class{async initializeWebview(e,r,n,o){let s=e.onDidReceiveMessage(a=>{if(a.type==="ready"){o?.()}this.handleMessage(e,a)});this.subscriptions.push(s)}};',
  'class CodexProcess{startCodexProcess(){let e=kle(this.extensionUri,"app-server",["--analytics-default-enabled"]);return e}}',
].join('');
const headerText = 'codexRecentTaskCurrentRoot import{f as b}from"./vscode-api-a.js";function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows(e,t,n){let r=[],i=new Map;for(let a of e){let o=codexRecentTaskProjectLabel(a),s=i.get(o);s||(s={label:o,items:[]},i.set(o,s),r.push(s)),s.items.push(a)}return r.flatMap((e,r)=>[(0,Q.jsx)(`div`,{className:`px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-medium text-token-input-placeholder-foreground`,children:e.label},`project-${r}-${e.label}`),...e.items.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&t===e.conversation.id,onClose:n},e.key))])}function codexRecentTaskProjectLabel(e){return `No project`}function codexRecentTaskFilter(e,t){return e}function codexRecentConversationFilter(e,t){return e}function codexRecentTaskNormalizePath(e){return e}function codexRecentTaskBasename(e){return e}function codexRecentTaskDateLabel(e){return ``}var qe=Je=(0,$.memo)(function(e){let t=(0,Z.c)(20),{item:n,isActive:r,onClose:i}=e;switch(n.kind){case`local`:{let e;t[3]===n.conversation.updatedAt?e=t[4]:(e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt)),t[3]=n.conversation.updatedAt,t[4]=e);let a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[9]=a):a=t[9],a}}});';
const appMainText = 'P=codexTitleAliasFor(n)?? codexTitleAliasFor(t.conversation.id)?? import{f as gi}from"./vscode-api-a.js";var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}function aE(e){let tt=()=>[{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...O==null||O===`local`?[]:[{id:`change-connection-color`}]];return tt}var YM=`https://ab.chatgpt.com/v1`,XM=`https://ab.chatgpt.com/v1/sdk_exception`,tN={networkConfig:{api:YM,logEventUrl:cM,sdkExceptionUrl:XM,networkOverrideFunc:KM}};';
const localTitleText = 'var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}var s=1;';
const appServerManagerSignalsText = 'async function ug(e,{modelProviders:t,archived:n=!1,sourceKinds:r=D,useStateDbOnly:i=!1}){let a=[],o=async s=>{let c=await e.sendRequest(`thread/list`,{limit:200,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i});a.push(...c.data),c.nextCursor&&await o(c.nextCursor)};return await o(null),a}class Eg{listRecentThreads({cursor:e,limit:t,useStateDbOnly:n=!1}){return this.params.requestClient.sendRequest(`thread/list`,{limit:t,cursor:e,sortKey:this.recentConversationSortKey,modelProviders:null,archived:!1,sourceKinds:D,useStateDbOnly:n})}}';
const requestText = 'var p=class{async makeRequest(o,s,c){let{headers:l,url:u}=this.getRequestTarget(s,c);try{switch(o){case`get`:return(await i.getInstance().get(u,l)).body;case`post`:return(await i.getInstance().post(u,this.getRequestBody(c),l)).body}}catch(i){throw a.warning(`sa_server_request_failed`,{safe:{method:o},sensitive:{error:i,routePattern:s,url:u}}),i}}async safeGet(e,...t){return this.makeRequest(`get`,e,t[0])}async safePost(e,...t){return this.makeRequest(`post`,e,t[0])}};';
const accountInfoText = '"account-info":async()=>{let e=await this.authProvider.getToken({refreshToken:!1});if(!e)return{accountId:null,userId:null,plan:null,email:null,computeResidency:null};try{let r=JSON.parse(Buffer.from(e.split(".")[1],"base64url").toString("utf8")),n=r["https://api.openai.com/auth"]??{},o=r["https://api.openai.com/profile"]??{},i=n?.chatgpt_account_id??null,s=n?.chatgpt_user_id??null,a=n?.chatgpt_plan_type??null,c=n?.chatgpt_compute_residency??null,l=o.email??null;if(i&&s&&a)return{accountId:i,userId:s,plan:a,email:l,computeResidency:c}}catch{X().error("Unable to extract account id and plan from auth token.")}return{accountId:null,userId:null,plan:null,email:null,computeResidency:null}}';
const headerNeedsBasePatchText = 'import{i as useEnv}from"./use-environment-a.js";import{f as customMessenger}from"./vscode-api-a.js";h=ge(),g;let b=i.filter(y),C=Ve(r.data,i,_),A=[];A.map(e=>(0,Q.jsx)(me,{task:e.task,onClose:a},e.key));F.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&p===e.conversation.id,onClose:a},e.key));o=r==null?void 0:(0,Q.jsx)(de,{dateString:new Date(r).toISOString()});case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(me,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e};e=n.conversation.updatedAt==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.updatedAt).toISOString()});o=(0,Q.jsx)(fe,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r});function Ke(e){return e.kind===`remote`}var qe=Je=(0,$.memo)(function(e){let t=(0,Z.c)(20),{item:n,isActive:r,onClose:i}=e;switch(n.kind){case`local`:{let e;t[3]===n.conversation.updatedAt?e=t[4]:(e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt)),t[3]=n.conversation.updatedAt,t[4]=e);let a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[9]=a):a=t[9],a}}});';

function createTarget() {
  const dir = tempDir('codex-patch');
  const assets = path.join(dir, 'webview/assets');
  fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(dir, 'out/extension.js'), extensionText);
  fs.writeFileSync(path.join(assets, 'header-a.js'), headerText);
  fs.writeFileSync(path.join(assets, 'app-main-a.js'), appMainText);
  fs.writeFileSync(path.join(assets, 'local-title-a.js'), localTitleText);
  fs.writeFileSync(path.join(assets, 'app-server-manager-signals-a.js'), appServerManagerSignalsText);
  fs.writeFileSync(path.join(assets, 'request-a.js'), requestText);
  return {
    extensionDir: dir,
    extensionJsPath: path.join(dir, 'out/extension.js'),
    headerPath: path.join(assets, 'header-a.js'),
    appMainPath: path.join(assets, 'app-main-a.js'),
    localTitlePath: path.join(assets, 'local-title-a.js'),
    sidebarPath: path.join(assets, 'sidebar-a.js'),
    appServerManagerSignalsPath: path.join(assets, 'app-server-manager-signals-a.js'),
    requestPath: path.join(assets, 'request-a.js'),
  };
}

module.exports = {
  name: 'patch engine',
  tests: [
    {
      name: 'safe mode restores grouped UI actions and skips risky bundles',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } });
        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes.map((change) => change.path), [
          target.extensionJsPath,
          target.appServerManagerSignalsPath,
          target.headerPath,
        ]);

        const extension = plan.changes[0].nextText;
        const appServerManagerSignals = plan.changes[1].nextText;
        const header = plan.changes[2].nextText;
        assert.ok(extension.includes('codexLocalGroupsPatchVersion=14'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(n))return;'));
        assert.ok(!extension.includes('"--disable","plugins"'));
        assert.ok(!extension.includes('requestAllThreadList(e)'));
        assert.ok(extension.includes('c.cwds=s'));
        assert.ok(appServerManagerSignals.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(appServerManagerSignals.includes('cwds:t'));
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=3'));
        assert.ok(header.includes('codexRecentTaskProjectRows'));
        assert.ok(header.includes('需求A'));
        assert.ok(header.includes('codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('codexLocalGroupsStartConversationInGroup'));
        assert.ok(header.includes('var codexLocalGroupsMessenger=b;'));
        assert.ok(header.includes('codexLocalGroupsMessenger.dispatchMessage'));
        assert.ok(header.includes('codex-local-groups-conversation-row relative'));
        assert.ok(header.includes('codexLocalGroupsHistoryLimit=120'));
        assert.ok(header.includes('codexLocalGroupsHistoryRecovered'));
        assert.ok(!header.includes('codexLocalGroupsMetadataOnly'));
        assert.ok(!header.includes('codexLocalGroupsMetadataItems'));
        assert.ok(!header.includes('codexLocalGroupsMetadataRow'));
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        assert.strictEqual(engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } }).changes.length, 0);
      },
    },
    {
      name: 'safe header uses stable messenger reference when alias collides',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.headerPath, headerText.replace('f as b', 'f as a'));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('var codexLocalGroupsMessenger=a;'));
        assert.ok(header.includes('codexLocalGroupsMessenger.dispatchHostMessage'));
        assert.ok(header.includes('codexLocalGroupsMessenger.dispatchMessage'));
        assert.ok(!header.includes('try{a.dispatchHostMessage'));
        assert.ok(!header.includes('try{a.dispatchMessage(`codex-local-groups`'));
      },
    },
    {
      name: 'plans local group patches and is idempotent after applying text changes',
      run() {
        const target = createTarget();
        const metadata = { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        assert.deepStrictEqual(plan.errors, []);
        assert.strictEqual(plan.changes.length, 6);
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const nextPlan = engine.plan(target, metadata);
        assert.deepStrictEqual(nextPlan.errors, []);
        assert.strictEqual(nextPlan.changes.length, 0);
        const extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const header = fs.readFileSync(target.headerPath, 'utf8');
        const appMain = fs.readFileSync(target.appMainPath, 'utf8');
        const appServerManagerSignals = fs.readFileSync(target.appServerManagerSignalsPath, 'utf8');
        const request = fs.readFileSync(target.requestPath, 'utf8');
        assert.ok(extension.includes('codexLocalGroupsPatchVersion=14'));
        assert.ok(extension.includes('codexLocalGroupsSchedulePatch'));
        assert.ok(!extension.includes('codexLocalGroups.applyPatchesSilent'));
        assert.ok(extension.includes('codexLocalGroupsReportAutoPatchUnavailable'));
        assert.ok(extension.includes('codexLocalGroupsProjectRootFor'));
        assert.ok(extension.includes('cwd:e.cwd??codexLocalGroupsProjectRootFor(e.id)'));
        assert.ok(extension.includes('c.cwds=s'));
        assert.ok(!extension.includes('requestAllThreadList(e)'));
        assert.ok(extension.includes('function n(c){return r?c===HS:c!==HS}'));
        assert.ok(!extension.includes('function n(c){return r?c===IS:c!==IS}'));
        assert.ok(extension.includes('promptConversationGroup'));
        assert.ok(extension.includes('showInputBox'));
        assert.ok(extension.includes('showQuickPick'));
        assert.ok(extension.includes('codexLocalGroupsExistingGroups'));
        assert.ok(extension.includes('codexLocalGroupsCleanGroupName'));
        assert.ok(extension.includes('"--disable","plugins"'));
        assert.ok(extension.includes('"mcp_oauth_credentials_store=\\"file\\""'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(n))return;'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(a,e))return;'));
        assert.ok(!extension.includes('JSON.stringify(e,null,2)+"\n"'));
        assert.ok(extension.includes('JSON.stringify(e,null,2)+String.fromCharCode(10)'));
        assert.ok(header.includes('codexLocalGroupsHeaderPatchVersion=36'));
        assert.ok(header.includes('codexLocalGroupsProjectKey'));
        assert.ok(header.includes('codexLocalGroupsConversationProjectRoot'));
        assert.ok(header.includes('codexLocalGroupsHistoryLimit=120'));
        assert.ok(!header.includes('codexLocalGroupsMetadataItems'));
        assert.ok(!header.includes('codexLocalGroupsMetadataOnly'));
        assert.ok(!header.includes('codexLocalGroupsMetadataRow'));
        assert.ok(header.includes('codexLocalGroupsDecoratedItem'));
        assert.ok(header.includes('codexLocalGroupsLocalTitle'));
        assert.ok(header.includes('codexLocalGroupsNormalizeGroupName'));
        assert.ok(header.includes('codexLocalGroupsToggleGroup'));
        assert.ok(header.includes('codexLocalGroupsVisibleItems'));
        assert.ok(header.includes('codex-local-groups-collapsed-v1'));
        assert.ok(header.includes('codex-local-groups-expanded-all-v1'));
        assert.ok(header.includes('aria-expanded'));
        assert.ok(header.includes('"aria-expanded":s'));
        assert.ok(!header.includes('`aria-expanded`:s'));
        assert.ok(header.includes('展开全部'));
        assert.ok(header.includes('收起到最近 5 条'));
        assert.ok(header.includes('titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0'));
        assert.ok(header.includes('e.groups.sort'));
        assert.ok(header.includes('bg-token-list-hover-background'));
        assert.ok(header.includes('text-sm font-semibold'));
        assert.ok(header.includes('#93c5fd'));
        assert.ok(header.includes('borderLeftColor:i.label===`未分组`'));
        assert.ok(!header.includes('overflow-hidden rounded-lg'));
        assert.ok(header.includes('codexLocalGroupsCanUsePendingGroup'));
        assert.ok(header.includes('e.kind!==`local`'));
        assert.ok(header.includes('Date.now()-n<600000'));
        assert.ok(header.includes('t<1e12?t*1e3:t'));
        assert.ok(header.includes('r||s'));
        assert.ok(header.includes('codexLocalGroupsUuidTime'));
        assert.ok(header.includes('codex-local-groups-refresh'));
        assert.ok(header.includes('codexLocalGroupsStoreMeta(r,!0)'));
        assert.ok(header.includes('pendingGroup'));
        assert.ok(header.includes('codexLocalGroupsSetBusy'));
        assert.ok(header.includes('codexLocalGroupsStoreCurrentRoot'));
        assert.ok(header.includes('codex-local-groups-current-root-v1'));
        assert.ok(header.includes('n.textContent===t&&(n.textContent=r)'));
        assert.ok(header.includes('t[20]!==o'));
        assert.ok(header.includes('打开中…'));
        assert.ok(!header.includes('onClose:()=>{b.dispatchHostMessage({type:`navigate-to-route`,path:`/local/'));
        assert.ok(header.includes('t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('startedAtMs'));
        assert.ok(header.includes('codexLocalGroupsPromptNewGroup'));
        assert.ok(header.includes('codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('metadataSaved'));
        assert.ok(!header.includes('codexLocalGroupsRowActions'));
        assert.ok(!header.includes('onContextMenu:e=>{e.preventDefault(),e.stopPropagation(),codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('新建分组并开始会话'));
        assert.ok(header.includes('+ 在此分组新建会话'));
        assert.ok(header.includes('设置标题'));
        assert.ok(header.includes('设置分组'));
        assert.ok(header.includes('codex-local-groups-conversation-row relative'));
        assert.ok(header.includes('codex-local-groups-inline-actions absolute top-1'));
        assert.ok(header.includes('paddingRight:`160px`'));
        assert.ok(!header.includes('paddingRight:`112px`'));
        assert.ok(!header.includes('additionalHoverActionCount:2'));
        assert.ok(header.includes('promptConversationTitle'));
        assert.ok(header.includes('promptConversationGroup'));
        assert.ok(appMain.includes('codexLocalGroupsWebviewPatchVersion=6'));
        assert.ok(appMain.includes('preventAllNetworkTraffic:!0'));
        assert.ok(appMain.includes('...(O==null||O===`local`?[{id:`codex-local-title`'));
        assert.ok(!appMain.includes('...O==null||O===`local`?[{id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-group`'));
        const localTitle = fs.readFileSync(target.localTitlePath, 'utf8');
        assert.ok(localTitle.includes('codexLocalGroupsLocalTitlePatchVersion=6'));
        assert.ok(appServerManagerSignals.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(appServerManagerSignals.includes('codexLocalGroupsRecentThreadListParams'));
        assert.ok(!appServerManagerSignals.includes('codexLocalGroupsRecentInitialMeta'));
        assert.ok(appServerManagerSignals.includes('cwds:t'));
        assert.ok(appServerManagerSignals.includes('{...e,limit:200}'));
        assert.ok(request.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(request.includes('codexLocalGroupsIsDisabledUsageRequest'));
        assert.ok(request.includes('codexLocalGroupsDisabledRequestPath'));
        assert.ok(request.includes('`/ces/v1/rgstr`'));
        assert.ok(request.includes('`/backend-api/plugins/featured`'));
        assert.ok(request.includes('return null'));
      },
    },
    {
      name: 'disables ChatGPT-only prechecks in api-key extension sessions',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const extensionChange = plan.changes.find((item) => item.path === target.extensionJsPath);
        const appMainChange = plan.changes.find((item) => item.path === target.appMainPath);
        assert.ok(extensionChange);
        assert.ok(appMainChange);
        assert.ok(extensionChange.nextText.includes('"--disable","plugins"'));
        assert.ok(extensionChange.nextText.includes('"mcp_oauth_credentials_store=\\"file\\""'));
        assert.ok(appMainChange.nextText.includes('preventAllNetworkTraffic:!0'));
      },
    },
    {
      name: 'patches latest app-main tray menu helper anchor',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appMainPath, [
          'import{f as gi}from"./vscode-api-a.js";',
          'function vj({get:e,threadKeys:t,groups:n,projectlessThreadIds:r,projectlessLabel:i,untitledThreadLabel:a}){let o=Mm(n),s=[];for(let n of t){let t=e(dp,n);if(t==null||t.kind===`pending-worktree`)continue;let c=t.kind===`local`?t.conversation.workspaceKind===`projectless`||r?.includes(t.conversation.id)===!0:r?.includes(t.task.id)===!0;s.push({title:(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a,path:Wu(n),projectLabel:c?i:o.get(n)??(t.kind===`local`?Ba(t.conversation.cwd??``):t.task.task_status_display?.environment_label??``),isProjectless:c})}return s}',
          'qC={networkConfig:{api:HC,logEventUrl:ZS,sdkExceptionUrl:UC,networkOverrideFunc:zC}}',
        ].join(''));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: 'A' } } });
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsWebviewPatchVersion=6'));
        assert.ok(change.nextText.includes('function vj({get:e,threadKeys:t,groups:n'));
        assert.ok(change.nextText.includes('codexTitleAliasFor(t.conversation.id)??t.conversation.title?.trim()'));
        assert.ok(change.nextText.includes('preventAllNetworkTraffic:!0'));
      },
    },
    {
      name: 'discovers renamed app-main tray menu helper by semantics',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appMainPath, [
          'import{f as gi}from"./vscode-api-a.js";',
          'function Qj({get:e,threadKeys:t,groups:n,projectlessThreadIds:r,projectlessLabel:i,untitledThreadLabel:a}){let o=Mm(n),s=[];for(let n of t){let t=e(dp,n);if(t==null||t.kind===`pending-worktree`)continue;let c=t.kind===`local`?t.conversation.workspaceKind===`projectless`||r?.includes(t.conversation.id)===!0:r?.includes(t.task.id)===!0;s.push({title:(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a,path:Wu(n),projectLabel:c?i:o.get(n)??(t.kind===`local`?Ba(t.conversation.cwd??``):t.task.task_status_display?.environment_label??``),isProjectless:c})}return s}',
          'JC={networkConfig:{api:UC,logEventUrl:QS,sdkExceptionUrl:WC,networkOverrideFunc:BC}}',
        ].join(''));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: 'A' } } });
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsWebviewPatchVersion=6'));
        assert.ok(change.nextText.includes('function Qj({get:e,threadKeys:t,groups:n'));
        assert.ok(change.nextText.includes('codexTitleAliasFor(t.conversation.id)??t.conversation.title?.trim()'));
      },
    },
    {
      name: 'does not guess app-main helper when semantic anchor is not unique',
      run() {
        const target = createTarget();
        const helper = 'function Qj({get:e,threadKeys:t,groups:n,projectlessThreadIds:r,projectlessLabel:i,untitledThreadLabel:a}){let o=Mm(n),s=[];for(let n of t){let t=e(dp,n);if(t==null||t.kind===`pending-worktree`)continue;let c=t.kind===`local`?t.conversation.workspaceKind===`projectless`||r?.includes(t.conversation.id)===!0:r?.includes(t.task.id)===!0;s.push({title:(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a,path:Wu(n),projectLabel:c?i:o.get(n)??(t.kind===`local`?Ba(t.conversation.cwd??``):t.task.task_status_display?.environment_label??``),isProjectless:c})}return s}';
        fs.writeFileSync(target.appMainPath, `import{f as gi}from"./vscode-api-a.js";${helper}${helper.replace('function Qj', 'function Rj')}`);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.includes('app-main metadata helper: 找不到 function aE(e){ 注入点'));
      },
    },
    {
      name: 'disables ChatGPT usage requests for api-key auth users',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.requestPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(change.nextText.includes('codexLocalGroupsIsDisabledUsageRequest(s)'));
        assert.ok(change.nextText.includes('new URL(e,`https://chatgpt.com`).pathname'));
        assert.ok(change.nextText.includes('t.startsWith(`/wham/usage`)'));
        assert.ok(change.nextText.includes('t.startsWith(`/ces/v1/rgstr`)'));
        assert.ok(change.nextText.includes('t.startsWith(`/backend-api/plugins/featured`)'));
        assert.ok(change.nextText.includes('return null'));
        assert.ok(change.nextText.indexOf('codexLocalGroupsIsDisabledUsageRequest(s)') < change.nextText.indexOf('i.getInstance().get(u,l)'));
      },
    },
    {
      name: 'disables latest Statsig network config',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appMainPath, appMainText.replace(
          'tN={networkConfig:{api:YM,logEventUrl:cM,sdkExceptionUrl:XM,networkOverrideFunc:KM}}',
          'JC={networkConfig:{api:UC,logEventUrl:QS,sdkExceptionUrl:WC,networkOverrideFunc:BC}}'
        ));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(change);
        assert.ok(change.nextText.includes('JC={networkConfig:{api:UC,logEventUrl:QS,sdkExceptionUrl:WC,networkOverrideFunc:BC,preventAllNetworkTraffic:!0}}'));
      },
    },
    {
      name: 'upgrades existing v1 request precheck helper for api-key fallback',
      run() {
        const target = createTarget();
        const v1Helper = 'var codexLocalGroupsRequestPatchVersion=1;function codexLocalGroupsIsDisabledUsageRequest(e){return typeof e==`string`&&e.startsWith(`/wham/usage`)}';
        const oldRequestStart = 'async makeRequest(o,s,c){let{headers:l,url:u}=this.getRequestTarget(s,c);';
        const patchedRequestStart = 'async makeRequest(o,s,c){if(codexLocalGroupsIsDisabledUsageRequest(s))return null;let{headers:l,url:u}=this.getRequestTarget(s,c);';
        fs.writeFileSync(target.requestPath, requestText.replace('var p=class', `${v1Helper}var p=class`).replace(oldRequestStart, patchedRequestStart));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.requestPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(change.nextText.includes('codexLocalGroupsDisabledRequestPath'));
        assert.ok(change.nextText.includes('new URL(e,`https://chatgpt.com`).pathname'));
        assert.ok(change.nextText.includes('t.startsWith(`/ces/v1/rgstr`)'));
        assert.ok(change.nextText.includes('t.startsWith(`/backend-api/plugins/featured`)'));
        assert.ok(!change.nextText.includes('codexLocalGroupsRequestPatchVersion=1'));
      },
    },
    {
      name: 'returns empty account info without parsing api-key auth token',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.extensionJsPath, `${extensionText}${accountInfoText}`);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('"account-info":async()=>({accountId:null,userId:null,plan:null,email:null,computeResidency:null})'));
        assert.ok(!change.nextText.includes('Unable to extract account id and plan from auth token'));
        assert.ok(!change.nextText.includes('Buffer.from(e.split(".")[1]'));
      },
    },
    {
      name: 'filters webview recent thread requests by the stored current root',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          conversations: {
            a: { group: '需求A', projectRoot: '/home/project/vscode/yuxi' },
            b: { group: '需求B', projectRoot: '/home/project/vscode/liaochen/' },
          },
        };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const change = plan.changes.find((item) => item.path === target.appServerManagerSignalsPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(change.nextText.includes('codexLocalGroupsRecentThreadListParams({limit:t'));
        assert.ok(change.nextText.includes('codexLocalGroupsRecentThreadListParams({limit:200'));
        assert.ok(change.nextText.includes('cwds:t'));
        const script = path.join(target.extensionDir, 'app-server-manager-signals-smoke.js');
        fs.writeFileSync(script, appServerManagerSignalsSmokeScript(change.nextText));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'generates parseable group collapse header helper',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        const start = headerChange.nextText.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = headerChange.nextText.indexOf('function codexRecentTaskProjectLabel', start);
        assert.ok(start >= 0);
        assert.ok(end > start);
        const result = childProcess.spawnSync(resolveNodePath(), ['--input-type=module', '--check'], {
          input: headerChange.nextText.slice(start, end),
          encoding: 'utf8',
        });
        assert.strictEqual(result.status, 0, result.stderr);
      },
    },
    {
      name: 'upgrades v28 inline action padding to avoid right-side overlap',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const oldHeader = fs.readFileSync(target.headerPath, 'utf8')
          .replace(/codexLocalGroupsHeaderPatchVersion=36/g, 'codexLocalGroupsHeaderPatchVersion=28')
          .replace(/paddingRight:`160px`/g, 'paddingRight:`112px`');
        fs.writeFileSync(target.headerPath, oldHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('codexLocalGroupsHeaderPatchVersion=36'));
        assert.ok(headerChange.nextText.includes('paddingRight:`160px`'));
        assert.ok(!headerChange.nextText.includes('paddingRight:`112px`'));
      },
    },
    {
      name: 'keeps latest header project rows on the upstream row component',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const staleHeader = fs.readFileSync(target.headerPath, 'utf8')
          .replace(/codexLocalGroupsHeaderPatchVersion=36/g, 'codexLocalGroupsHeaderPatchVersion=32')
          .replace(/codexRecentTaskProjectRows\(F,p,a,Je\)/g, 'codexRecentTaskProjectRows(F,y,i)')
          .replace(/codexRecentTaskProjectRows\(F,p,a\)/g, 'codexRecentTaskProjectRows(F,y,i)')
          .replace(/function codexRecentTaskProjectRows\(e,t,n,codexLocalGroupsRow\)\{/g, 'function codexRecentTaskProjectRows(e,t,n){')
          .replace(/\(0,Q\.jsx\)\(codexLocalGroupsRow,\{item:o,isActive:o\.kind===`local`&&t===o\.conversation\.id,onClose:n\},o\.key\)/g, '(0,Q.jsx)(Je,{item:o,isActive:o.kind===`local`&&t===o.conversation.id,onClose:n},o.key)')
          + ';codexRecentTaskProjectRows(F,y,i);';
        fs.writeFileSync(target.headerPath, staleHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('codexRecentTaskProjectRows(F,y,i,ot)'));
        assert.ok(headerChange.nextText.includes('function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow)'));
        assert.ok(headerChange.nextText.includes('(0,Q.jsx)(codexLocalGroupsRow,{item:o'));
        assert.ok(!headerChange.nextText.includes('(0,Q.jsx)(Je,{item:o'));
      },
    },
    {
      name: 'defines current root inside latest recent tasks menu',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.headerPath, 'codexRecentTaskCurrentRoot codex-local-groups-inline-actions absolute codexLocalGroupsHeaderPatchVersion=33 function rt(e){let t=(0,Z.c)(33),x=1;let T=codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter($e(n.data,r,ee),codexRecentTaskCurrentRoot),[te,k]=(0,$.useState)(``);t[15]!==y||t[16]!==n||t[17]!==F||t[18]!==M||t[19]!==D.length||t[20]!==i||t[21]!==g||t[31]!==codexLocalGroupsRefresh?t[19]=D.length,t[20]=i,t[21]=g,t[31]=codexLocalGroupsRefresh,t[22]=V:V=t[22];return T}function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow){return []}');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('codexRecentTaskMenuCurrentRoot'));
        assert.ok(headerChange.nextText.includes('function rt(e){let t=(0,Z.c)(35)'));
        assert.ok(headerChange.nextText.includes('t[33]!==codexLocalGroupsRefresh'));
        assert.ok(!headerChange.nextText.includes('codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot)'));
        assert.ok(!headerChange.nextText.includes('t[31]!==codexLocalGroupsRefresh'));
      },
    },
    {
      name: 'upgrades latest header local title cache to react to metadata changes',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const staleTitle = 'let i;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==a||t[8]!==e?(i=(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:codexLocalGroupsLocalTitle(n)??void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=a,t[8]=e,t[9]=i):i=t[9],i';
        const staleHeader = `${fs.readFileSync(target.headerPath, 'utf8')};${staleTitle};`;
        fs.writeFileSync(target.headerPath, staleHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0'));
        assert.ok(headerChange.nextText.includes('t[20]=o,t[9]=i'));
        assert.ok(!headerChange.nextText.includes('titleOverride:codexLocalGroupsLocalTitle(n)??void 0'));
      },
    },
    {
      name: 'patches latest local title signal with local aliases',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.localTitlePath, 'import{t as e,z as t}from"./app-scope.js";import{Pt as r,Rt as i,T as a,mi as o,pi as s}from"./thread-context-inputs.js";var c=t(e,(e,{get:t})=>e==null?null:s({id:e,title:t(r,e),turns:t(a,e)??t(i,e)})),l=t(e,(e,{get:t})=>null);export{l as n,c as t};');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });

        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题' } } });
        const localTitleChange = plan.changes.find((change) => change.path === target.localTitlePath);
        assert.ok(localTitleChange);
        assert.ok(localTitleChange.nextText.includes('codexLocalGroupsLocalTitlePatchVersion=6'));
        assert.ok(localTitleChange.nextText.includes('title:codexTitleAliasFor(e)??t(r,e)'));
      },
    },
    {
      name: 'does not show empty expand-all action when active item fills the limit',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const conversations = {};
        for (let index = 1; index <= 6; index += 1) {
          conversations[`id${index}`] = { group: '需求A', projectRoot: '/p', updatedAtMs: index };
        }
        const plan = engine.plan(target, { version: 1, conversations });
        const rows = runHeaderRows(plan.changes.find((change) => change.path === target.headerPath).nextText, 'id6');
        const rendered = JSON.stringify(rows);
        assert.ok(rendered.includes('id6'));
        assert.ok(!rendered.includes('还有 0 条'));
      },
    },
    {
      name: 'merges duplicate-looking group names in header rows',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const conversations = {};
        for (let index = 1; index <= 6; index += 1) {
          conversations[`id${index}`] = { group: index % 2 ? '需求A' : ' 需求A　', projectRoot: '/p', updatedAtMs: index };
        }
        const plan = engine.plan(target, { version: 1, conversations });
        const rows = runHeaderRows(plan.changes.find((change) => change.path === target.headerPath).nextText, 'id6');
        const groupHeaders = rows.filter((row) => String(row.key || '').startsWith('group-0-') && !String(row.key || '').startsWith('group-more'));
        assert.strictEqual(groupHeaders.length, 1);
        assert.ok(JSON.stringify(rows).includes('▾ 需求A'));
        assert.ok(!JSON.stringify(rows).includes(' 需求A　'));
      },
    },
    {
      name: 'restores opening label after React clears event currentTarget',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const start = header.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = header.indexOf('function codexRecentTaskProjectLabel', start);
        const script = path.join(target.extensionDir, 'header-busy-smoke.js');
        fs.writeFileSync(script, headerBusySmokeScript(header.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'refreshes cached local title override without reload',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          updatedAtMs: 100,
          conversations: {
            abc: { title: '旧标题', group: '需求A', projectRoot: '/p', updatedAtMs: 100 },
          },
        };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const script = path.join(target.extensionDir, 'header-title-refresh-smoke.js');
        fs.writeFileSync(script, headerTitleRefreshSmokeScript(header));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'removes legacy app-main title alias helper after webview helper upgrade',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const patched = fs.readFileSync(target.appMainPath, 'utf8');
        const broken = patched.replace(
          'function aE(e){',
          'var codexTitleAliasMap={};function codexTitleAliasFor(e){return null}function aE(e){',
        );
        fs.writeFileSync(target.appMainPath, broken);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.ok(change);
        assert.strictEqual((change.nextText.match(/function codexTitleAliasFor/g) || []).length, 1);
        assert.ok(!change.nextText.includes('var codexTitleAliasMap={}'));
      },
    },
    {
      name: 'keeps paged thread list filtered by workspace cwd',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.extensionJsPath, extensionText.replace(
          'requestAllThreadList workingDirectoryPath',
          'requestAllThreadList',
        ));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        let extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const start = extension.indexOf('async requestAllThreadList(e){');
        const end = extension.indexOf('s=Cle(codexTitleAliasFor(r)??n)', start);
        const oldThreadList = 'async requestAllThreadList(e){let r=[],n=null;do{let o=await this.requestThreadList(e,n);r.push(...o.data),n=o.nextCursor??null}while(n);return{data:r}}requestThreadList(e,r){let n=String(this.nextRequestId++),o=new Promise((i,s)=>{this.requestToCallback.set(n,a=>{if(a.error){s(new Error(a.error.message));return}if(a.result==null){s(new Error("No result in response"));return}i(a.result)})}),s=Il.workspace.workspaceFolders?.map(a=>a.uri.fsPath).filter(Boolean)??[],c={limit:200,cursor:r,sortKey:"created_at",modelProviders:e?[HS]:null,archived:!1,sourceKinds:Yf};s.length>0&&(c.cwds=s);return this.codexAppServer.sendRequest(_le,n,"thread/list",c),o}';
        extension = extension.slice(0, start) + oldThreadList + extension.slice(end);
        fs.writeFileSync(target.extensionJsPath, extension);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('c.cwds=s'));
      },
    },
    {
      name: 'uses metadata project root when conversation cwd is missing',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          conversations: {
            old1: { title: '旧会话1', group: '需求A', projectRoot: '/p' },
            old2: { title: '旧会话2', group: '需求A', projectRoot: '/p' },
            other: { title: '其它会话', group: '其它', projectRoot: '/other' },
          },
        };
        const items = ['old1', 'old2', 'other'].map((id, index) => ({
          kind: 'local',
          key: id,
          conversation: { id, title: id, createdAt: index + 1, updatedAt: index + 1 },
        }));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const probe = runHeaderRows(header, 'old2', { items, currentRoot: '/p' });
        const rendered = JSON.stringify(probe.rows);
        assert.deepStrictEqual(probe.conversationIds, ['old1', 'old2']);
        assert.ok(rendered.includes('需求A'));
        assert.ok(rendered.includes('old1'));
        assert.ok(rendered.includes('old2'));
        assert.ok(!rendered.includes('other'));
      },
    },
    {
      name: 'recovers current project history rows from metadata with a hard limit',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          conversations: {},
        };
        metadata.conversations.old1 = { title: '旧会话1', group: '需求A', projectRoot: '/p', updatedAtMs: 100 };
        metadata.conversations.old2 = { title: '旧会话2', group: '需求A', projectRoot: '/p', updatedAtMs: 200 };
        metadata.conversations.other = { title: '其它会话', group: '其它', projectRoot: '/other', updatedAtMs: 300 };
        for (let index = 0; index < 130; index += 1) {
          metadata.conversations[`extra${index}`] = { title: `额外${index}`, group: '额外', projectRoot: '/p', updatedAtMs: index };
        }
        const items = [{
          kind: 'local',
          key: 'old2',
          conversation: { id: 'old2', title: '旧会话2', cwd: '/p', createdAt: 2, updatedAt: 2 },
        }];
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const probe = runHeaderRows(header, 'old2', { items, currentRoot: '/p' });
        const rendered = JSON.stringify(probe.rows);
        assert.deepStrictEqual(probe.conversationIds, ['old2']);
        assert.ok(rendered.includes('old2'));
        assert.ok(rendered.includes('old1'));
        assert.ok(rendered.includes('history-row-old1'));
        assert.ok(rendered.includes('history-actions-old1'));
        assert.ok(!rendered.includes('other'));
        assert.ok(!probe.filteredItemIds.includes('extra0'));
        assert.ok(probe.filteredItemIds.includes('extra129'));
        assert.strictEqual(probe.filteredItemIds.length, 121);
      },
    },
    {
      name: 'assigns pending group to new conversation from child or missing project root',
      run() {
        const startedAtMs = Date.now() - 1000;
        const target = createTarget();
        const metadata = {
          version: 1,
          pendingGroup: { projectRoot: '/p', group: '需求A', startedAtMs },
          conversations: {},
        };
        const childItems = [{
          kind: 'local',
          key: 'child',
          conversation: { id: 'child', title: '子目录会话', cwd: '/p/sub', createdAt: startedAtMs, updatedAt: startedAtMs },
        }];
        const missingItems = [{
          kind: 'local',
          key: 'missing',
          conversation: { id: 'missing', title: '无目录会话', createdAt: startedAtMs / 1000, updatedAt: startedAtMs },
        }];
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const childProbe = runHeaderRows(header, 'child', { items: childItems, includeStorage: true });
        const childStored = JSON.parse(childProbe.storage['codex-local-groups-meta-v1']);
        assert.ok(JSON.stringify(childProbe.rows).includes('需求A'));
        assert.strictEqual(childStored.conversations.child.group, '需求A');
        assert.strictEqual(childStored.conversations.child.projectRoot, '/p/sub');
        assert.strictEqual(childStored.pendingGroup, undefined);
        const missingProbe = runHeaderRows(header, 'missing', { items: missingItems, includeStorage: true });
        const missingStored = JSON.parse(missingProbe.storage['codex-local-groups-meta-v1']);
        assert.ok(JSON.stringify(missingProbe.rows).includes('需求A'));
        assert.strictEqual(missingStored.conversations.missing.group, '需求A');
        assert.strictEqual(missingStored.conversations.missing.projectRoot, '/p');
        assert.strictEqual(missingStored.pendingGroup, undefined);
      },
    },
    {
      name: 'removes extension-host navigator checks that break VS Code Node 24',
      run() {
        const target = createTarget();
        fs.appendFileSync(target.extensionJsPath, 'if(typeof navigator<"u"&&navigator?.userAgent?.includes("Cloudflare"))throw new Error("bad");if(typeof navigator<"u"&&navigator.userAgent)throw new Error("bad");');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        assert.ok(change);
        assert.ok(!change.nextText.includes('typeof navigator<"u"&&navigator'));
      },
    },
    {
      name: 'refreshes metadata literals in already patched webview bundles',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }

        const metadata = {
          version: 1,
          updatedAtMs: 200,
          conversations: {
            abc: { title: '更新后标题', group: '更新后分组', projectRoot: '/p', updatedAtMs: 200 },
          },
        };
        const plan = engine.plan(target, metadata);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(plan.changes.some((change) => change.path === target.headerPath));
        assert.ok(plan.changes.some((change) => change.path === target.appMainPath));
        assert.ok(plan.changes.some((change) => change.path === target.localTitlePath));
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }

        assert.ok(fs.readFileSync(target.headerPath, 'utf8').includes('更新后标题'));
        assert.ok(fs.readFileSync(target.appMainPath, 'utf8').includes('更新后标题'));
        assert.ok(fs.readFileSync(target.localTitlePath, 'utf8').includes('更新后标题'));
      },
    },
    {
      name: 'routes webview prompt actions to extension host input boxes',
      async run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const start = extension.indexOf('var Dle=require("path"),codexLocalGroupsFs=');
        const end = extension.indexOf('$t();', start) + '$t();'.length;
        const script = path.join(target.extensionDir, 'extension-host-helper-smoke.js');
        fs.writeFileSync(script, extensionHostSmokeScript(extension.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'prefers file metadata when webview localStorage is older',
      run() {
        const target = createTarget();
        const metadata = { version: 1, updatedAtMs: 200, conversations: { abc: { title: '文件标题', group: '文件分组', projectRoot: '/p', updatedAtMs: 200 } } };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const header = fs.readFileSync(target.headerPath, 'utf8');
        const start = header.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = header.indexOf('function codexRecentTaskProjectRows', start);
        const script = path.join(target.extensionDir, 'header-merge-smoke.js');
        fs.writeFileSync(script, headerMergeSmokeScript(header.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'uses newer conversation metadata per conversation',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          updatedAtMs: 200,
          conversations: {
            fileNew: { title: '文件新标题', group: '文件新分组', projectRoot: '/p', updatedAtMs: 300 },
            localNew: { title: '文件旧标题', group: '文件旧分组', projectRoot: '/p', updatedAtMs: 100 },
          },
        };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const header = fs.readFileSync(target.headerPath, 'utf8');
        const start = header.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = header.indexOf('function codexRecentTaskProjectRows', start);
        const script = path.join(target.extensionDir, 'header-merge-newer-smoke.js');
        fs.writeFileSync(script, headerMergeNewerSmokeScript(header.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'apply creates unique backups and stays idempotent',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const first = engine.apply(target, { version: 1, conversations: { a: { title: 'A' } } });
        assert.deepStrictEqual(first.errors, []);
        assert.strictEqual(first.idempotent, true);
        const second = engine.apply(target, { version: 1, conversations: { a: { title: 'B' } } });
        assert.deepStrictEqual(second.errors, []);
        assert.strictEqual(second.idempotent, true);
        const backups = [...first.backups, ...second.backups];
        assert.strictEqual(new Set(backups).size, backups.length);
        for (const backup of backups) {
          assert.ok(fs.existsSync(backup));
        }
        const third = engine.apply(target, { version: 1, conversations: { a: { title: 'B' } } });
        assert.deepStrictEqual(third.errors, []);
        assert.strictEqual(third.changes.length, 0);
      },
    },
    {
      name: 'restores clean backups even when newer backups are already patched',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.sidebarPath, 'b=t(x,({get:e})=>e(d)??s),');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        engine.apply(target, { version: 1, conversations: { a: { title: 'A' } } });
        engine.apply(target, { version: 1, conversations: { a: { title: 'B' } } });
        assert.ok(fs.readFileSync(target.sidebarPath, 'utf8').includes('t===`recent`?s:t'));

        const restored = engine.restoreCleanBundles(target);

        assert.ok(restored.some((item) => item.path === target.extensionJsPath));
        assert.ok(restored.some((item) => item.path === target.sidebarPath));
        assert.ok(fs.readFileSync(target.sidebarPath, 'utf8').includes('e(d)??s'));
        assert.ok(!fs.readFileSync(target.sidebarPath, 'utf8').includes('t===`recent`?s:t'));
        for (const item of restored) {
          assert.strictEqual(fs.readFileSync(item.path, 'utf8').includes('codexLocalGroups'), false, item.path);
          assert.strictEqual(fs.readFileSync(item.backupPath, 'utf8').includes('codexLocalGroups'), false, item.backupPath);
        }
      },
    },
    {
      name: 'skips syntax checks when bundles are already patched',
      run() {
        const target = createTarget();
        const first = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        first.apply(target, { version: 1, conversations: {} });

        const engine = new CodexPatchEngine({ nodePath: path.join(target.extensionDir, 'missing-node') });
        const report = engine.apply(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(report.errors, []);
        assert.strictEqual(report.changes.length, 0);
        assert.deepStrictEqual(report.syntax, []);
        assert.strictEqual(report.idempotent, true);
      },
    },
    {
      name: 'runs syntax checks successfully',
      run() {
        const target = createTarget();
        for (const file of [target.extensionJsPath, target.headerPath, target.appMainPath, target.appServerManagerSignalsPath, target.requestPath, target.localTitlePath, target.sidebarPath]) {
          fs.writeFileSync(file, 'export{};');
        }
        fs.writeFileSync(target.extensionJsPath, 'const ok = true;\n');
        const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
        const syntax = engine.runSyntaxChecks(target);
        assert.strictEqual(syntax.length, 7);
      },
    },
    {
      name: 'accepts syntax checks that exit zero with a spawn warning',
      run() {
        const target = createTarget();
        for (const file of [target.extensionJsPath, target.headerPath, target.appMainPath, target.appServerManagerSignalsPath, target.requestPath, target.localTitlePath, target.sidebarPath]) {
          fs.writeFileSync(file, 'export{};');
        }
        fs.writeFileSync(target.extensionJsPath, 'const ok = true;\n');
        const originalSpawnSync = childProcess.spawnSync;
        childProcess.spawnSync = () => ({ status: 0, error: new Error('spawnSync node EPERM'), stderr: '' });
        try {
          const syntax = new CodexPatchEngine({ nodePath: process.execPath }).runSyntaxChecks(target);
          assert.strictEqual(syntax.length, 7);
        } finally {
          childProcess.spawnSync = originalSpawnSync;
        }
      },
    },

    {
      name: 'restores changed files when syntax check command is unavailable',
      run() {
        const target = createTarget();
        const before = fs.readFileSync(target.headerPath, 'utf8');
        const engine = new CodexPatchEngine({ nodePath: path.join(target.extensionDir, 'missing-node') });
        assert.throws(() => engine.apply(target, { version: 1, conversations: {} }), /Node 不存在/);
        assert.strictEqual(fs.readFileSync(target.headerPath, 'utf8'), before);
      },
    },
    {
      name: 'uses discovered execution target bundle and vscode messenger alias',
      run() {
        const target = createTarget();
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'use-webview-execution-target-newhash.js'), 'export{};');
        fs.writeFileSync(target.headerPath, headerNeedsBasePatchText);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange.nextText.includes('./use-webview-execution-target-newhash.js'));
        assert.ok(headerChange.nextText.includes('var codexLocalGroupsMessenger=customMessenger;'));
        assert.ok(headerChange.nextText.includes('codexLocalGroupsMessenger.dispatchMessage'));
      },
    },
    {
      name: 'keeps enhancement active without running silent patch from Codex host',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        const start = change.nextText.indexOf('var Dle=require("path"),codexLocalGroupsFs=');
        const end = change.nextText.indexOf('$t();', start) + '$t();'.length;
        const script = extensionHostMissingSilentCommandScript(change.nextText.slice(start, end));
        childProcess.execFileSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
      },
    },
    {
      name: 'stops without writing when upstream bundle anchors are unsupported',
      run() {
        const target = createTarget();
        const beforeAppMain = fs.readFileSync(target.appMainPath, 'utf8');
        fs.writeFileSync(target.appMainPath, beforeAppMain.replace('id:`rename-thread`', 'id:`upstream-renamed`'));
        const unsupportedAppMain = fs.readFileSync(target.appMainPath, 'utf8');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(!plan.changes.some((change) => change.path === target.appMainPath && change.nextText.includes('codex-local-title')));
        const appMainChange = plan.changes.find((change) => change.path === target.appMainPath);
        if (appMainChange) {
          assert.ok(!appMainChange.nextText.includes('id:`codex-local-title`'));
          assert.ok(!appMainChange.nextText.includes('id:`codex-local-group`'));
        }
      },
    },
  ],
};

function extensionHostSmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

(async () => {
  let inputValue = '本地新标题';
  let quickPickMode = 'new';
  const quickPickLabels = [];
  const files = { '/root/.codex/codex-vscode-conversation-meta.json': '{"version":1,"conversations":{"abc":{"title":"旧标题","group":"旧分组","projectRoot":"/p"},"def":{"group":" 旧分组　","projectRoot":"/p"}}}' };
  const posted = [];
  const commands = [];
  const inputTitles = [];
  const infos = [];
  const warnings = [];
  const fsMock = {
    readFileSync(file) { if (!Object.prototype.hasOwnProperty.call(files, file)) throw new Error('ENOENT'); return files[file]; },
    writeFileSync(file, data) { files[file] = String(data); },
    mkdirSync() {},
    openSync() { return 1; },
    fsyncSync() {},
    closeSync() {},
    renameSync(from, to) { files[to] = files[from]; delete files[from]; },
  };
  const vscodeMock = {
    window: {
      showInputBox(options) { inputTitles.push(options.title); return Promise.resolve(inputValue); },
      showQuickPick(items) {
        quickPickLabels.push(items.map((item) => item.label));
        if (quickPickMode === 'existing') return Promise.resolve(items.find((item) => item.group === '旧分组'));
        if (quickPickMode === 'clear') return Promise.resolve(items.find((item) => item.action === 'clear'));
        return Promise.resolve(items.find((item) => item.action === 'new'));
      },
      showInformationMessage(message) { infos.push(message); return Promise.resolve(); },
      showWarningMessage(message) { warnings.push(message); return Promise.resolve(); },
    },
    commands: {
      executeCommand(command) {
        commands.push(command);
        if (command === 'codexLocalGroups.applyPatchesSilent') return Promise.reject(new Error('missing silent patch'));
        return Promise.resolve();
      }
    },
  };
  const context = {
    require(name) { return name === 'fs' ? fsMock : name === 'vscode' ? vscodeMock : require(name); },
    console: { warn() {}, error: console.error, log: console.log },
    process: { pid: 123 },
    setTimeout(callback) { callback(); return 1; },
    $t() {},
  };
  vm.createContext(context);
  vm.runInContext(${JSON.stringify(helper)}, context);
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationTitle', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.title, '本地新标题');
  assert.strictEqual(posted[0].type, 'codex-local-groups');
  assert.strictEqual(posted[0].action, 'metadataSaved');
  assert.strictEqual(posted[0].metadata.conversations.abc.title, '本地新标题');
  await Promise.resolve();
  assert.ok(infos.includes('Codex Local Groups: 已保存。'));
  assert.strictEqual(warnings.length, 0);
  assert.strictEqual(commands.filter((command) => command === 'codexLocalGroups.applyPatchesSilent').length, 0);
  inputValue = '需求B';
  assert.strictEqual(context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }), false);
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.group, '需求B');
  assert.strictEqual(posted[1].metadata.conversations.abc.group, '需求B');
  assert.strictEqual(commands.filter((command) => command === 'codexLocalGroups.applyPatchesSilent').length, 0);
  assert.ok(quickPickLabels[0].includes('旧分组'));
  assert.strictEqual(quickPickLabels[0].filter((label) => label === '旧分组').length, 1);
  quickPickMode = 'existing';
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.group, '旧分组');
  quickPickMode = 'clear';
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.group, undefined);
  inputValue = '需求C';
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptNewGroup', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  const metadata = JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']);
  const lastPost = posted[posted.length - 1];
  assert.strictEqual(lastPost.type, 'codex-local-groups');
  assert.strictEqual(lastPost.action, 'metadataSaved');
  assert.strictEqual(lastPost.metadata.pendingGroup.projectRoot, '/p');
  assert.strictEqual(lastPost.metadata.pendingGroup.group, '需求C');
  assert.strictEqual(lastPost.metadata.pendingGroup.startedAtMs, metadata.pendingGroup.startedAtMs);
  assert.ok(commands.includes('chatgpt.newChat'));
  assert.strictEqual(commands.filter((command) => command === 'codexLocalGroups.applyPatchesSilent').length, 0);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function runHeaderRows(header, activeId, options = {}) {
  const start = header.indexOf('function Ke(e){return e.kind===`remote`}');
  const end = header.indexOf('var qe=Je', start);
  const items = Object.prototype.hasOwnProperty.call(options, 'items') ? options.items : headerRowsItems();
  const currentRoot = Object.prototype.hasOwnProperty.call(options, 'currentRoot') ? options.currentRoot : null;
  const script = `
const vm = require('vm');
function jsx(type, props, key) { return { type, props, key }; }
const storage = {};
const context = {
  Q: { jsx, jsxs: jsx },
  Je: 'Je',
  b: { dispatchMessage() {}, dispatchHostMessage() {} },
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener() {}, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  setTimeout() {},
};
vm.runInNewContext(${JSON.stringify(header.slice(start, end))}, context);
const sourceItems = ${JSON.stringify(items)};
const currentRoot = ${JSON.stringify(currentRoot)};
const filteredItems = currentRoot == null ? sourceItems : context.codexRecentTaskFilter(sourceItems, currentRoot);
const filteredConversations = currentRoot == null ? null : context.codexRecentConversationFilter(sourceItems.map((item) => item.conversation), currentRoot);
const rows = context.codexRecentTaskProjectRows(filteredItems, ${JSON.stringify(activeId)}, () => {});
  console.log(JSON.stringify({
    rows,
    storage,
    filteredItemIds: filteredItems.map((item) => item.conversation.id),
    conversationIds: filteredConversations == null ? null : filteredConversations.map((item) => item.id),
  }));
`;
  const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  if (options.includeStorage) {
    return parsed;
  }
  return currentRoot == null ? parsed.rows : parsed;
}


function appServerManagerSignalsSmokeScript(text) {
  return `
const assert = require('assert');
const requests = [];
const localStorage = {
  getItem(key) {
    if (key === 'codex-local-groups-current-root-v1') return '/home/project/vscode/yuxi';
    return null;
  },
};
const D = [];
const sendRequest = (method, params) => {
  requests.push({ method, params });
  return Promise.resolve({ data: [], nextCursor: null });
};
${text}
(async () => {
  await ug({ sendRequest, recentConversationsSortKey: 'updated_at' }, { modelProviders: null });
  const store = new Eg();
  store.params = { requestClient: { sendRequest } };
  store.recentConversationSortKey = 'updated_at';
  await store.listRecentThreads({ limit: 50, cursor: null });
  assert.strictEqual(requests.length, 2);
  for (const request of requests) {
    assert.strictEqual(request.method, 'thread/list');
    assert.deepStrictEqual(request.params.cwds, ['/home/project/vscode/yuxi']);
    assert.strictEqual(request.params.limit, 200);
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function headerBusySmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

let scheduled;
const context = {
  b: { dispatchMessage() {}, dispatchHostMessage() {} },
  localStorage: { getItem() { return null; }, setItem() {} },
  window: { addEventListener() {}, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  setTimeout(callback) { scheduled = callback; return 1; },
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(helper)}, context);
const button = { textContent: '设置标题' };
const event = { currentTarget: button };
context.codexLocalGroupsSetBusy(event, '打开中…');
assert.strictEqual(button.textContent, '打开中…');
event.currentTarget = null;
scheduled();
assert.strictEqual(button.textContent, '设置标题');
`;
}

function headerTitleRefreshSmokeScript(header) {
  const helperStart = header.indexOf('function Ke(e){return e.kind===`remote`}');
  const helperEnd = header.indexOf('function codexRecentTaskProjectLabel', helperStart);
  const jeStart = header.indexOf('var qe=Je', helperEnd);
  const jeEnd = header.indexOf('});', jeStart) + '});'.length;
  return `
const assert = require('assert');
const vm = require('vm');

const storage = {};
const cache = [];
function close() {}
function jsx(type, props, key) { return { type, props, key }; }
const context = {
  Q: { jsx, jsxs: jsx },
  $: { memo(fn) { return fn; } },
  Z: { c() { return cache; } },
  J() { return { cancelPendingWorktree() {} }; },
  pe: 'pe',
  me: 'me',
  fe: 'fe',
  b: { dispatchHostMessage() {} },
  codexRecentTaskDateLabel() { return '14:30'; },
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener() {}, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  Date,
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(header.slice(helperStart, helperEnd) + header.slice(jeStart, jeEnd))}, context);
const item = { kind: 'local', key: 'abc', conversation: { id: 'abc', title: '原始标题', cwd: '/p', updatedAt: 1 } };
const first = context.Je({ item, isActive: false, onClose: close });
assert.strictEqual(first.props.titleOverride.props.children, '旧标题');
context.codexLocalGroupsStoreMeta({
  version: 1,
  updatedAtMs: 300,
  conversations: {
    abc: { title: '新标题', group: '需求A', projectRoot: '/p', updatedAtMs: 300 }
  }
});
const second = context.Je({ item, isActive: false, onClose: close });
assert.strictEqual(second.props.titleOverride.props.children, '新标题');
`;
}

function headerRowsItems() {
  return [1, 2, 3, 4, 5, 6].map((index) => ({
    kind: 'local',
    key: `id${index}`,
    conversation: { id: `id${index}`, cwd: '/p', title: `会话${index}`, createdAt: index, updatedAt: index },
  }));
}


function extensionHostMissingSilentCommandScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

(async () => {
  const files = { '/root/.codex/codex-vscode-conversation-meta.json': '{"version":1,"conversations":{}}' };
  const warnings = [];
  const commands = [];
  let autoPatchAttempts = 0;
  const fsMock = {
    readFileSync(file) { if (!Object.prototype.hasOwnProperty.call(files, file)) throw new Error('ENOENT'); return files[file]; },
    writeFileSync(file, data) { files[file] = String(data); },
    mkdirSync() {},
    openSync() { return 1; },
    fsyncSync() {},
    closeSync() {},
    renameSync(from, to) { files[to] = files[from]; delete files[from]; },
  };
  const vscodeMock = {
    window: { showWarningMessage(message) { warnings.push(message); return Promise.resolve(); } },
    commands: {
      executeCommand(command) {
        commands.push(command);
        if (command === 'codexLocalGroups.applyPatchesSilent') {
          autoPatchAttempts += 1;
          return Promise.reject(new Error("command 'codexLocalGroups.applyPatchesSilent' not found"));
        }
        return Promise.resolve();
      },
    },
  };
  const context = {
    require(name) { return name === 'fs' ? fsMock : name === 'vscode' ? vscodeMock : require(name); },
    console: { warn() {}, error: console.error, log: console.log },
    process: { pid: 123 },
    setTimeout(callback) { callback(); return 0; },
    $t() {},
  };
  vm.createContext(context);
  vm.runInContext(${JSON.stringify(helper)}, context);
  const message = { type: 'codex-local-groups', action: 'newConversationInGroup', projectRoot: '/p', group: '需求A' };
  context.codexLocalGroupsHandleWebviewMessage(message);
  await Promise.resolve();
  context.codexLocalGroupsHandleWebviewMessage(message);
  await Promise.resolve();
  assert.strictEqual(autoPatchAttempts, 0);
  assert.strictEqual(warnings.length, 0);
  assert.strictEqual(commands.filter((command) => command === 'chatgpt.newChat').length, 2);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function headerMergeSmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

const storage = {
  'codex-local-groups-meta-v1': JSON.stringify({
    version: 1,
    updatedAtMs: 100,
    conversations: {
      abc: { title: '本地旧标题', group: '本地旧分组', projectRoot: '/p', updatedAtMs: 100 }
    }
  })
};
const context = {
  b: { dispatchMessage() {}, dispatchHostMessage() {} },
  localStorage: {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener() {}, dispatchEvent() {} },
  Date,
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(helper)}, context);
context.codexRecentTaskNormalizePath = (value) => typeof value === 'string' ? value.replace(/\\\\/g, '/').replace(/\\/+$/, '') : '';
assert.strictEqual(context.codexLocalGroupsReadMeta().conversations.abc.group, '文件分组');
assert.strictEqual(context.codexLocalGroupsDecoratedItem({ kind: 'local', conversation: { id: 'abc', title: '原始标题' }, key: 'abc' }).conversation.title, '文件标题');
Date.now = () => 1781350796000;
assert.strictEqual(context.codexLocalGroupsItemCreatedAt({ kind: 'local', conversation: { id: 'seconds', createdAt: 1781350795 } }), 1781350795000);
assert.strictEqual(context.codexLocalGroupsItemCreatedAt({ kind: 'local', conversation: { id: '019ec0c8-07f9-7b80-944e-63aa3273a37f' } }), 1781350795257);
assert.strictEqual(context.codexLocalGroupsCanUsePendingGroup({ kind: 'local', conversation: { id: '019ec0c8-07f9-7b80-944e-63aa3273a37f' } }, { startedAtMs: 1781350789497 }), true);
assert.strictEqual(context.codexLocalGroupsProjectMatches('/p/sub', '/p'), true);
assert.strictEqual(context.codexLocalGroupsProjectMatches('/p2', '/p'), false);
`;
}

function headerMergeNewerSmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

const storage = {
  'codex-local-groups-meta-v1': JSON.stringify({
    version: 1,
    updatedAtMs: 300,
    conversations: {
      fileNew: { title: '本地旧标题', group: '本地旧分组', projectRoot: '/p', updatedAtMs: 100 },
      localNew: { title: '本地新标题', group: '本地新分组', projectRoot: '/p', updatedAtMs: 300 }
    }
  })
};
const context = {
  b: { dispatchMessage() {}, dispatchHostMessage() {} },
  localStorage: {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener() {}, dispatchEvent() {} },
  Date,
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(helper)}, context);
const metadata = context.codexLocalGroupsReadMeta();
assert.strictEqual(metadata.conversations.fileNew.title, '文件新标题');
assert.strictEqual(metadata.conversations.fileNew.group, '文件新分组');
assert.strictEqual(metadata.conversations.localNew.title, '本地新标题');
assert.strictEqual(metadata.conversations.localNew.group, '本地新分组');
assert.strictEqual(context.codexLocalGroupsDecoratedItem({ kind: 'local', conversation: { id: 'localNew', title: '原始标题' }, key: 'localNew' }).conversation.title, '本地新标题');
`;
}
