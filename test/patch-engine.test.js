const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');
const { CodexPatchEngine } = require('../src/patchEngine');
const { resolveNodePath } = require('../scripts/node-path');

const extensionText = [
  'var wl={workspace:{workspaceFolders:[]},EventEmitter:function(){}};',
  'var IS=1,jf=[],wce=`provider`,e$=`Untitled`;class X{onDidChangeChatSessionItemsEmitter=new wl.EventEmitter;}',
  'async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===IS:c!==IS}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[];for(let{item:c,summary:l}of o)this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c);let s=i.map(c=>this.applyLifecycleToChatSessionItem(c));return Array.from(this.pendingConversations.values()).filter(c=>n(c.modelProvider)).map(c=>this.applyLifecycleToChatSessionItem(c.item)).concat(s)}',
  'async provideChatSessionItems(e,r){return(await this.requestThreadList(e)).data.map(o=>{let i=this.toThreadListSummary(o);return{summary:i,item:this.toChatSessionItem(i)}})}',
  'toChatSessionItem(e){let{conversationId:r,preview:n,createdAtMs:o}=e,i=bce(r),s=xce(n),a=o!=null?{startTime:o}:void 0;return{id:String(r),resource:i,label:s,timing:a}}',
  'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider}}',
  'requestThreadList(e){let r=String(this.nextRequestId++),n=new Promise((o,i)=>{this.requestToCallback.set(r,s=>{if(s.error){i(new Error(s.error.message));return}if(s.result==null){i(new Error("No result in response"));return}o(s.result)})});return this.codexAppServer.sendRequest(wce,r,"thread/list",{limit:50,cursor:null,sortKey:"created_at",modelProviders:e?[IS]:null,archived:!1,sourceKinds:jf}),n}',
  's=xce(codexTitleAliasFor(r)??n) c=codexTitleAliasFor(n.conversationId)??s??e$ r.title=tde(codexTitleAliasFor(i)??s) label:codexTitleAliasFor(i)??s??void 0 r.title=tde(codexTitleAliasFor(i)??l) r.set(String(n.id),(codexTitleAliasFor(n.id)??n.name?.trim())||n.preview)',
  'var kce=require("path"),codexTitleAliasesPath="/root/.codex/codex-vscode-conversation-titles.json",codexTitleAliasFs=require("fs");function codexTitleAliasMap(){return{}}function codexTitleAliasFor(e){return null}$t();var xg=1;',
  'var nC=class{constructor(e,r){this.#r=e,this.#e=[e.onDidReceiveMessage(n=>{let o=PH(n);o!=null&&this.#a(o.message)}),r(()=>{this.dispose()})]}};',
  'var Ll=class{async initializeWebview(e,r,n,o){let s=e.onDidReceiveMessage(a=>{if(a.type==="ready"){o?.()}this.handleMessage(e,a)});this.subscriptions.push(s)}};',
].join('');
const headerText = 'codexRecentTaskCurrentRoot import{f as b}from"./vscode-api-a.js";function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows(e,t,n){let r=[],i=new Map;for(let a of e){let o=codexRecentTaskProjectLabel(a),s=i.get(o);s||(s={label:o,items:[]},i.set(o,s),r.push(s)),s.items.push(a)}return r.flatMap((e,r)=>[(0,Q.jsx)(`div`,{className:`px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-medium text-token-input-placeholder-foreground`,children:e.label},`project-${r}-${e.label}`),...e.items.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&t===e.conversation.id,onClose:n},e.key))])}function codexRecentTaskProjectLabel(e){return `No project`}function codexRecentTaskFilter(e,t){return e}function codexRecentConversationFilter(e,t){return e}function codexRecentTaskNormalizePath(e){return e}function codexRecentTaskBasename(e){return e}function codexRecentTaskDateLabel(e){return ``}var qe=Je=(0,$.memo)(function(e){let t=(0,Z.c)(20),{item:n,isActive:r,onClose:i}=e;switch(n.kind){case`local`:{let e;t[3]===n.conversation.updatedAt?e=t[4]:(e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt)),t[3]=n.conversation.updatedAt,t[4]=e);let a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[9]=a):a=t[9],a}}});';
const appMainText = 'P=codexTitleAliasFor(n)?? codexTitleAliasFor(t.conversation.id)?? import{f as gi}from"./vscode-api-a.js";var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}function aE(e){let tt=()=>[{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...O==null||O===`local`?[]:[{id:`change-connection-color`}]];return tt}';
const localTitleText = 'var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}var s=1;';
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
  return {
    extensionDir: dir,
    extensionJsPath: path.join(dir, 'out/extension.js'),
    headerPath: path.join(assets, 'header-a.js'),
    appMainPath: path.join(assets, 'app-main-a.js'),
    localTitlePath: path.join(assets, 'local-title-a.js'),
    sidebarPath: path.join(assets, 'sidebar-a.js'),
  };
}

module.exports = {
  name: 'patch engine',
  tests: [
    {
      name: 'plans local group patches and is idempotent after applying text changes',
      run() {
        const target = createTarget();
        const metadata = { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        assert.deepStrictEqual(plan.errors, []);
        assert.strictEqual(plan.changes.length, 4);
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const nextPlan = engine.plan(target, metadata);
        assert.deepStrictEqual(nextPlan.errors, []);
        assert.strictEqual(nextPlan.changes.length, 0);
        const extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const header = fs.readFileSync(target.headerPath, 'utf8');
        const appMain = fs.readFileSync(target.appMainPath, 'utf8');
        assert.ok(extension.includes('codexLocalGroupsPatchVersion=8'));
        assert.ok(extension.includes('codexLocalGroupsSchedulePatch'));
        assert.ok(extension.includes('codexLocalGroups.applyPatchesSilent'));
        assert.ok(extension.includes('c.cwds=s'));
        assert.ok(extension.includes('promptConversationGroup'));
        assert.ok(extension.includes('showInputBox'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(n))return;'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(a,e))return;'));
        assert.ok(!extension.includes('JSON.stringify(e,null,2)+"\n"'));
        assert.ok(extension.includes('JSON.stringify(e,null,2)+String.fromCharCode(10)'));
        assert.ok(header.includes('codexLocalGroupsHeaderPatchVersion=21'));
        assert.ok(header.includes('codexLocalGroupsProjectKey'));
        assert.ok(header.includes('codexLocalGroupsDecoratedItem'));
        assert.ok(header.includes('codexLocalGroupsLocalTitle'));
        assert.ok(header.includes('titleOverride:codexLocalGroupsLocalTitle(n)??void 0'));
        assert.ok(header.includes('e.groups.sort'));
        assert.ok(header.includes('bg-token-list-hover-background'));
        assert.ok(header.includes('text-sm font-semibold'));
        assert.ok(header.includes('#93c5fd'));
        assert.ok(header.includes('borderLeftColor:i.label===`未分组`'));
        assert.ok(!header.includes('overflow-hidden rounded-lg'));
        assert.ok(header.includes('codexLocalGroupsCanUsePendingGroup'));
        assert.ok(header.includes('e.kind!==`local`'));
        assert.ok(header.includes('Date.now()-n<600000'));
        assert.ok(header.includes('codexLocalGroupsUuidTime'));
        assert.ok(header.includes('codex-local-groups-refresh'));
        assert.ok(header.includes('codexLocalGroupsStoreMeta(r,!0)'));
        assert.ok(header.includes('pendingGroup'));
        assert.ok(header.includes('codexLocalGroupsSetBusy'));
        assert.ok(header.includes('打开中…'));
        assert.ok(header.includes('dispatchHostMessage({type:`navigate-to-route`,path:`/local/'));
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
        assert.ok(header.includes('promptConversationTitle'));
        assert.ok(header.includes('promptConversationGroup'));
        assert.ok(appMain.includes('codexLocalGroupsWebviewPatchVersion=6'));
        assert.ok(appMain.includes('...(O==null||O===`local`?[{id:`codex-local-title`'));
        assert.ok(!appMain.includes('...O==null||O===`local`?[{id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-group`'));
        const localTitle = fs.readFileSync(target.localTitlePath, 'utf8');
        assert.ok(localTitle.includes('codexLocalGroupsLocalTitlePatchVersion=6'));
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
      name: 'upgrades existing paged thread list with cwd filters',
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
        const end = extension.indexOf('s=xce(codexTitleAliasFor(r)??n)', start);
        const oldThreadList = 'async requestAllThreadList(e){let r=[],n=null;do{let o=await this.requestThreadList(e,n);r.push(...o.data),n=o.nextCursor??null}while(n);return{data:r}}requestThreadList(e,r){let n=String(this.nextRequestId++),o=new Promise((i,s)=>{this.requestToCallback.set(n,a=>{if(a.error){s(new Error(a.error.message));return}if(a.result==null){s(new Error("No result in response"));return}i(a.result)})});return this.codexAppServer.sendRequest(wce,n,"thread/list",{limit:200,cursor:r,sortKey:"created_at",modelProviders:e?[IS]:null,archived:!1,sourceKinds:jf}),o}';
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
        const start = extension.indexOf('var kce=require("path"),codexLocalGroupsFs=');
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
        for (const file of [target.extensionJsPath, target.headerPath, target.appMainPath, target.localTitlePath, target.sidebarPath]) {
          fs.writeFileSync(file, 'export{};');
        }
        fs.writeFileSync(target.extensionJsPath, 'const ok = true;\n');
        const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
        const syntax = engine.runSyntaxChecks(target);
        assert.strictEqual(syntax.length, 5);
      },
    },
    {
      name: 'accepts syntax checks that exit zero with a spawn warning',
      run() {
        const target = createTarget();
        for (const file of [target.extensionJsPath, target.headerPath, target.appMainPath, target.localTitlePath, target.sidebarPath]) {
          fs.writeFileSync(file, 'export{};');
        }
        fs.writeFileSync(target.extensionJsPath, 'const ok = true;\n');
        const originalSpawnSync = childProcess.spawnSync;
        childProcess.spawnSync = () => ({ status: 0, error: new Error('spawnSync node EPERM'), stderr: '' });
        try {
          const syntax = new CodexPatchEngine({ nodePath: process.execPath }).runSyntaxChecks(target);
          assert.strictEqual(syntax.length, 5);
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
        assert.ok(headerChange.nextText.includes('customMessenger.dispatchMessage'));
      },
    },
    {
      name: 'stops without writing when upstream bundle anchors are unsupported',
      run() {
        const target = createTarget();
        const beforeExtension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const beforeAppMain = fs.readFileSync(target.appMainPath, 'utf8');
        fs.writeFileSync(target.appMainPath, beforeAppMain.replace('id:`rename-thread`', 'id:`upstream-renamed`'));
        const unsupportedAppMain = fs.readFileSync(target.appMainPath, 'utf8');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.some((error) => error.includes('app-main local groups context menu')));
        const result = engine.apply(target, { version: 1, conversations: {} });
        assert.ok(result.errors.some((error) => error.includes('app-main local groups context menu')));
        assert.strictEqual(fs.readFileSync(target.extensionJsPath, 'utf8'), beforeExtension);
        assert.strictEqual(fs.readFileSync(target.appMainPath, 'utf8'), unsupportedAppMain);
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
  const files = { '/root/.codex/codex-vscode-conversation-meta.json': '{"version":1,"conversations":{"abc":{"title":"旧标题","group":"旧分组","projectRoot":"/p"}}}' };
  const posted = [];
  const commands = [];
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
      showInputBox() { return Promise.resolve(inputValue); },
      showInformationMessage() { return Promise.resolve(); },
      showWarningMessage() {},
    },
    commands: { executeCommand(command) { commands.push(command); return Promise.resolve(); } },
  };
  const context = {
    require(name) { return name === 'fs' ? fsMock : name === 'vscode' ? vscodeMock : require(name); },
    console,
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
  inputValue = '需求B';
  assert.strictEqual(context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }), false);
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.group, '需求B');
  assert.strictEqual(posted[1].metadata.conversations.abc.group, '需求B');
  inputValue = '需求C';
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptNewGroup', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  const metadata = JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']);
  assert.strictEqual(posted[2].type, 'codex-local-groups');
  assert.strictEqual(posted[2].action, 'metadataSaved');
  assert.strictEqual(posted[2].metadata.pendingGroup.projectRoot, '/p');
  assert.strictEqual(posted[2].metadata.pendingGroup.group, '需求C');
  assert.strictEqual(posted[2].metadata.pendingGroup.startedAtMs, metadata.pendingGroup.startedAtMs);
  assert.ok(commands.includes('chatgpt.newChat'));
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
  localStorage: {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener() {}, dispatchEvent() {} },
  Date,
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(helper)}, context);
assert.strictEqual(context.codexLocalGroupsReadMeta().conversations.abc.group, '文件分组');
assert.strictEqual(context.codexLocalGroupsDecoratedItem({ kind: 'local', conversation: { id: 'abc', title: '原始标题' }, key: 'abc' }).conversation.title, '文件标题');
Date.now = () => 1781350796000;
assert.strictEqual(context.codexLocalGroupsItemCreatedAt({ kind: 'local', conversation: { id: '019ec0c8-07f9-7b80-944e-63aa3273a37f' } }), 1781350795257);
assert.strictEqual(context.codexLocalGroupsCanUsePendingGroup({ kind: 'local', conversation: { id: '019ec0c8-07f9-7b80-944e-63aa3273a37f' } }, { startedAtMs: 1781350789497 }), true);
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
