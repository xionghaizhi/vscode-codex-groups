const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');
const { CodexPatchEngine } = require('../src/patchEngine');
const { resolveNodePath } = require('../scripts/node-path');

const extensionText = 'requestAllThreadList workingDirectoryPath s=xce(codexTitleAliasFor(r)??n) c=codexTitleAliasFor(n.conversationId)??s??e$ r.title=tde(codexTitleAliasFor(i)??s) label:codexTitleAliasFor(i)??s??void 0 r.title=tde(codexTitleAliasFor(i)??l) r.set(String(n.id),(codexTitleAliasFor(n.id)??n.name?.trim())||n.preview) var kce=require("path"),codexTitleAliasesPath="/root/.codex/codex-vscode-conversation-titles.json",codexTitleAliasFs=require("fs");function codexTitleAliasMap(){return{}}function codexTitleAliasFor(e){return null}$t();var xg=1;var nC=class{constructor(e,r){this.#r=e,this.#e=[e.onDidReceiveMessage(n=>{let o=PH(n);o!=null&&this.#a(o.message)}),r(()=>{this.dispose()})]}};';
const headerText = 'codexRecentTaskCurrentRoot import{f as b}from"./vscode-api-a.js";function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows(e,t,n){let r=[],i=new Map;for(let a of e){let o=codexRecentTaskProjectLabel(a),s=i.get(o);s||(s={label:o,items:[]},i.set(o,s),r.push(s)),s.items.push(a)}return r.flatMap((e,r)=>[(0,Q.jsx)(`div`,{className:`px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-medium text-token-input-placeholder-foreground`,children:e.label},`project-${r}-${e.label}`),...e.items.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&t===e.conversation.id,onClose:n},e.key))])}function codexRecentTaskProjectLabel(e){return `No project`}function codexRecentTaskFilter(e,t){return e}function codexRecentConversationFilter(e,t){return e}function codexRecentTaskNormalizePath(e){return e}function codexRecentTaskBasename(e){return e}function codexRecentTaskDateLabel(e){return ``}var qe=';
const appMainText = 'P=codexTitleAliasFor(n)?? codexTitleAliasFor(t.conversation.id)?? import{f as gi}from"./vscode-api-a.js";var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}function aE(e){let tt=()=>[{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...O==null||O===`local`?[]:[{id:`change-connection-color`}]];return tt}';
const localTitleText = 'var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}var s=1;';
const headerNeedsBasePatchText = 'import{i as useEnv}from"./use-environment-a.js";import{f as customMessenger}from"./vscode-api-a.js";h=ge(),g;let b=i.filter(y),C=Ve(r.data,i,_),A=[];A.map(e=>(0,Q.jsx)(me,{task:e.task,onClose:a},e.key));F.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&p===e.conversation.id,onClose:a},e.key));o=r==null?void 0:(0,Q.jsx)(de,{dateString:new Date(r).toISOString()});case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(me,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e};e=n.conversation.updatedAt==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.updatedAt).toISOString()});o=(0,Q.jsx)(fe,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r});function Ke(e){return e.kind===`remote`}var qe=';

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
        assert.ok(extension.includes('codexLocalGroupsPatchVersion=4'));
        assert.ok(extension.includes('codexLocalGroupsSchedulePatch'));
        assert.ok(extension.includes('codexLocalGroups.applyPatchesSilent'));
        assert.ok(header.includes('codexLocalGroupsHeaderPatchVersion=4'));
        assert.ok(header.includes('codexLocalGroupsProjectKey'));
        assert.ok(header.includes('codexLocalGroupsCanUsePendingGroup'));
        assert.ok(header.includes('e.kind!==`local`'));
        assert.ok(header.includes('Date.now()-n<60000'));
        assert.ok(header.includes('startedAtMs'));
        assert.ok(appMain.includes('codexLocalGroupsWebviewPatchVersion=4'));
        assert.ok(appMain.includes('...O==null||O===`local`?[{id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-group`'));
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
