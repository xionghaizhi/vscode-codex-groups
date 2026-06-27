const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const { ConversationMetadataStore } = require('../src/metadataStore');
const { tempDir, writeJson } = require('./test-utils');

function loadExtension(vscode) {
  const extensionPath = path.join(__dirname, '../src/extension.js');
  delete require.cache[require.resolve(extensionPath)];
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') {
      return vscode;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(extensionPath);
  } finally {
    Module._load = originalLoad;
  }
}

function vscodeMock() {
  const calls = { infos: [], quickPicks: [], warnings: [], opened: [], commands: [], output: [] };
  return {
    calls,
    window: {
      createOutputChannel() {
        return {
          appendLine(line) { calls.output.push(line); },
          show() { calls.outputShown = true; },
          dispose() {},
        };
      },
      showInformationMessage(message, ...actions) {
        calls.infos.push({ message, actions });
        return Promise.resolve(calls.nextInfoAction);
      },
      showInputBox(options) {
        calls.inputBox = options;
        return Promise.resolve(calls.nextInput);
      },
      showWarningMessage(message, ...actions) {
        calls.warnings.push({ message, actions });
        return Promise.resolve(calls.nextWarningAction);
      },
      showQuickPick(items, options) {
        calls.quickPicks.push({ items, options });
        if (calls.nextQuickPicks && calls.nextQuickPicks.length) {
          const picker = calls.nextQuickPicks.shift();
          return Promise.resolve(typeof picker === 'function' ? picker(items, options) : picker);
        }
        return Promise.resolve(calls.nextQuickPick || items[0]);
      },
    },
    commands: {
      executeCommand(command, ...args) {
        calls.commands.push({ command, args });
        return Promise.resolve();
      },
      registerCommand(command) {
        calls.commands.push({ registered: command });
        return { dispose() {} };
      },
    },
    env: {
      openExternal(uri) {
        calls.opened.push(String(uri));
        return Promise.resolve(calls.openExternalResult !== false);
      },
    },
    Uri: {
      parse(value) { return { toString: () => value }; },
      file(value) { return { fsPath: value }; },
    },
    workspace: {
      getConfiguration() { return { get() { return ''; } }; },
      openTextDocument() { return Promise.resolve({}); },
    },
  };
}

const metadata = {
  version: 1,
  conversations: {
    abc: { title: '财务对账', group: '财务', projectRoot: '/p/a', updatedAtMs: 3000 },
    def: { group: '支付', projectRoot: '/p/b', updatedAtMs: 1000 },
    ghi: { title: '未归组', projectRoot: '/p/c', updatedAtMs: 2000 },
  },
};

const manageMetadata = {
  version: 1,
  conversations: {
    a1: { title: '对账1', group: '财务', projectRoot: '/p/a', updatedAtMs: 3000 },
    a2: { title: '对账2', group: ' 财务　', projectRoot: '/p/a/', updatedAtMs: 2000 },
    a3: { title: '支付1', group: '支付', projectRoot: '/p/a', updatedAtMs: 1000 },
    b1: { title: '银行1', group: '银行', projectRoot: '/p/b', updatedAtMs: 4000 },
    b2: { title: '对账B', group: '财务', projectRoot: '/p/b', updatedAtMs: 5000 },
  },
};

module.exports = {
  name: 'extension commands',
  tests: [
    {
      name: 'activates without scheduling startup patch',
      run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const timers = [];
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = (fn, delay) => {
          timers.push({ fn, delay });
          return 1;
        };
        try {
          extension.activate({ subscriptions: [] });
        } finally {
          global.setTimeout = originalSetTimeout;
        }
        assert.strictEqual(timers.length, 0);
        assert.ok(vscode.calls.commands.some((item) => item.registered === 'codexLocalGroups.applyPatches'));
      },
    },
    {
      name: 'startup auto patch prompts reload only when it changed bundles',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = () => 1;
        try {
          extension.activate({ subscriptions: [] });
        } finally {
          global.setTimeout = originalSetTimeout;
        }
        vscode.calls.nextInfoAction = 'Reload Window';
        const report = await extension.runStartupAutoPatch({
          applyPatches() {
            return Promise.resolve({ changes: [{ path: '/codex/out/extension.js' }], errors: [], idempotent: true });
          },
        });
        assert.strictEqual(report.changes.length, 1);
        assert.ok(vscode.calls.infos[0].message.includes('已自动适配新版 Codex'));
        assert.ok(vscode.calls.commands.some((item) => item.command === 'workbench.action.reloadWindow'));
      },
    },
    {
      name: 'startup auto patch stays quiet when bundles are current',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = () => 1;
        try {
          extension.activate({ subscriptions: [] });
        } finally {
          global.setTimeout = originalSetTimeout;
        }
        await extension.runStartupAutoPatch({
          applyPatches() {
            return Promise.resolve({ changes: [], errors: [], idempotent: true });
          },
        });
        assert.strictEqual(vscode.calls.infos.length, 0);
      },
    },
    {
      name: 'builds status lines with patch and metadata counts',
      run() {
        const dir = tempDir('codex-status');
        const packageJsonPath = path.join(dir, 'package.json');
        fs.writeFileSync(packageJsonPath, JSON.stringify({ version: '26.1.2' }));
        const extension = loadExtension(vscodeMock());
        const lines = extension.buildStatusLines({
          target: { extensionDir: dir, packageJsonPath },
          plan: { changes: [], errors: [] },
          metadata,
          metadataPath: '/tmp/codex-meta.json',
        });
        assert.ok(lines.includes(`OpenAI Codex 扩展：${dir}`));
        assert.ok(lines.includes('Codex 版本：26.1.2'));
        assert.ok(lines.includes('Patch 状态：已是最新'));
        assert.ok(lines.includes('会话数量：3'));
        assert.ok(lines.includes('已分组：2'));
        assert.ok(lines.includes('未分组：1'));
        assert.ok(lines.includes('Metadata：/tmp/codex-meta.json'));
      },
    },
    {
      name: 'shows patch-needed status when plan has changes',
      run() {
        const extension = loadExtension(vscodeMock());
        const lines = extension.buildStatusLines({
          target: { extensionDir: '/codex', packageJsonPath: '/missing/package.json' },
          plan: { changes: [{ path: '/codex/out/extension.js' }], errors: [] },
          metadata,
          metadataPath: '/tmp/codex-meta.json',
        });
        assert.ok(lines.includes('Codex 版本：未知'));
        assert.ok(lines.includes('Patch 状态：需要应用补丁（1 个文件）'));
      },
    },
    {
      name: 'prints plan errors in status lines',
      run() {
        const extension = loadExtension(vscodeMock());
        const lines = extension.buildStatusLines({
          target: { extensionDir: '/codex', packageJsonPath: '/missing/package.json' },
          plan: { changes: [], errors: ['header anchor missing', 'app bundle unsupported'] },
          metadata,
          metadataPath: '/tmp/codex-meta.json',
        });
        assert.ok(lines.includes('Patch 状态：存在错误（2 个）'));
        assert.ok(lines.includes('错误：header anchor missing'));
        assert.ok(lines.includes('错误：app bundle unsupported'));
      },
    },
    {
      name: 'builds searchable quick pick items sorted by recent update',
      run() {
        const extension = loadExtension(vscodeMock());
        const items = extension.conversationQuickPickItems(metadata);
        assert.deepStrictEqual(items.map((item) => item.conversationId), ['abc', 'ghi', 'def']);
        assert.strictEqual(items[0].label, '财务对账');
        assert.ok(items[0].description.includes('财务'));
        assert.ok(items[0].detail.includes('/p/a'));
        assert.ok(items[2].label.includes('def'));
      },
    },
    {
      name: 'builds managed group items with duplicate names merged',
      run() {
        const extension = loadExtension(vscodeMock());
        const items = extension.groupQuickPickItems(manageMetadata);
        const finance = items.find((item) => item.group === '财务' && item.projectRoot === '/p/a');
        assert.ok(finance);
        assert.strictEqual(finance.count, 2);
        assert.ok(finance.description.includes('2 个会话'));
        assert.ok(finance.detail.includes('/p/a'));
      },
    },
    {
      name: 'keeps managed group tuple distinct when joined key would collide',
      run() {
        const extension = loadExtension(vscodeMock());
        const items = extension.groupQuickPickItems({
          version: 1,
          conversations: {
            left: { group: 'b::c', projectRoot: '/p/a', updatedAtMs: 1000 },
            right: { group: 'c', projectRoot: '/p/a::b', updatedAtMs: 2000 },
          },
        });
        assert.strictEqual(items.length, 2);
        assert.ok(items.find((item) => item.group === 'b::c' && item.projectRoot === '/p/a'));
        assert.ok(items.find((item) => item.group === 'c' && item.projectRoot === '/p/a::b'));
      },
    },
    {
      name: 'opens selected conversation through Codex deeplink',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        await extension.searchConversations({ store: { load() { return metadata; } } });
        assert.strictEqual(vscode.calls.quickPicks[0].options.title, 'Search Codex Conversations');
        assert.strictEqual(vscode.calls.quickPicks[0].options.matchOnDescription, true);
        assert.strictEqual(vscode.calls.quickPicks[0].options.matchOnDetail, true);
        assert.strictEqual(vscode.calls.opened[0], 'vscode://openai.chatgpt/local/abc');
      },
    },
    {
      name: 'warns when selected conversation deeplink cannot open',
      async run() {
        const vscode = vscodeMock();
        vscode.calls.openExternalResult = false;
        const extension = loadExtension(vscode);
        await extension.searchConversations({ store: { load() { return metadata; } } });
        assert.ok(vscode.calls.warnings[0].message.includes('无法打开会话'));
      },
    },
    {
      name: 'reads metadata without writing during status and search',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        let loadCalls = 0;
        const store = {
          metadataPath: '/tmp/meta.json',
          readMetadataFile() { return metadata; },
          load() { loadCalls += 1; throw new Error('load should not run'); },
        };
        await extension.searchConversations({ store });
        await extension.checkStatus({
          store,
          locator: { locate() { return { extensionDir: '/codex', packageJsonPath: '/missing/package.json' }; } },
          engine: { plan() { return { changes: [], errors: [] }; } },
        });
        assert.strictEqual(loadCalls, 0);
      },
    },
    {
      name: 'shows status and supports apply patches action',
      async run() {
        const vscode = vscodeMock();
        vscode.calls.nextInfoAction = 'Apply Patches';
        const extension = loadExtension(vscode);
        let applied = false;
        await extension.checkStatus({
          store: { metadataPath: '/tmp/meta.json', load() { return metadata; } },
          locator: { locate() { return { extensionDir: '/codex', packageJsonPath: '/missing/package.json' }; } },
          engine: { plan() { return { changes: [], errors: [] }; } },
          applyPatches() { applied = true; return Promise.resolve(); },
        });
        assert.ok(vscode.calls.infos[0].message.includes('状态正常'));
        assert.strictEqual(applied, true);
      },
    },
    {
      name: 'renames selected group conversations',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        let written;
        let patched = false;
        vscode.calls.nextInput = '财务归档';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '财务'),
          (items) => items.find((item) => item.action === 'rename'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write(data) { written = data; return data; } },
          applyPatches() { patched = true; return Promise.resolve(); },
        });
        assert.strictEqual(written.conversations.a1.group, '财务归档');
        assert.strictEqual(written.conversations.a2.group, '财务归档');
        assert.strictEqual(written.conversations.a3.group, '支付');
        assert.strictEqual(written.conversations.b2.group, '财务');
        assert.strictEqual(patched, false);
        assert.ok(vscode.calls.inputBox.title.includes('/p/a'));
        assert.ok(vscode.calls.inputBox.prompt.includes('2 个会话'));
        assert.ok(vscode.calls.infos[0].message.includes('/p/a'));
      },
    },
    {
      name: 'renames selected group into existing group in same project',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        let written;
        vscode.calls.nextWarningAction = '合并分组';
        vscode.calls.nextInput = '财务';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '支付' && item.projectRoot === '/p/a'),
          (items) => items.find((item) => item.action === 'rename'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write(data) { written = data; return data; } },
          applyPatches() { return Promise.resolve(); },
        });
        assert.strictEqual(written.conversations.a3.group, '财务');
        assert.strictEqual(written.conversations.b2.group, '财务');
        assert.ok(vscode.calls.warnings[0].message.includes('财务'));
        assert.ok(vscode.calls.warnings[0].message.includes('已存在'));
        assert.ok(vscode.calls.warnings[0].message.includes('/p/a'));
        assert.ok(vscode.calls.warnings[0].message.includes('不删除会话'));
      },
    },
    {
      name: 'cancels rename into existing managed group without writing',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        let wrote = false;
        vscode.calls.nextInput = '财务';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '支付' && item.projectRoot === '/p/a'),
          (items) => items.find((item) => item.action === 'rename'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write() { wrote = true; } },
          applyPatches() { throw new Error('should not patch'); },
        });
        assert.strictEqual(wrote, false);
      },
    },
    {
      name: 'does not write when managed group selection is canceled',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        vscode.calls.nextQuickPicks = [undefined];
        let wrote = false;
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write() { wrote = true; } },
          applyPatches() { throw new Error('should not patch'); },
        });
        assert.strictEqual(wrote, false);
      },
    },
    {
      name: 'warns and skips blank managed group rename',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        vscode.calls.nextInput = '   ';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '财务' && item.projectRoot === '/p/a'),
          (items) => items.find((item) => item.action === 'rename'),
        ];
        let wrote = false;
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write() { wrote = true; } },
          applyPatches() { throw new Error('should not patch'); },
        });
        assert.strictEqual(wrote, false);
        assert.ok(vscode.calls.warnings[0].message.includes('不能为空'));
      },
    },
    {
      name: 'shows project context while clearing managed group',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '财务' && item.projectRoot === '/p/a'),
          (items) => items.find((item) => item.action === 'clear'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write() { throw new Error('should not write'); } },
          applyPatches() { throw new Error('should not patch'); },
        });
        assert.ok(vscode.calls.quickPicks[0].options.placeHolder.includes('项目路径'));
        assert.ok(vscode.calls.quickPicks[1].options.title.includes('/p/a'));
        assert.ok(vscode.calls.quickPicks[1].options.title.includes('2 个会话'));
        assert.ok(vscode.calls.quickPicks[1].items.find((item) => item.action === 'merge').description.includes('同项目'));
        assert.ok(vscode.calls.quickPicks[1].items.find((item) => item.action === 'clear').detail.includes('不删除'));
        assert.ok(vscode.calls.quickPicks[1].items.find((item) => item.action === 'view').detail.includes('只读'));
        assert.ok(vscode.calls.warnings[0].message.includes('/p/a'));
        assert.ok(vscode.calls.warnings[0].message.includes('不删除会话'));
        assert.ok(vscode.calls.warnings[0].message.includes('没有撤销'));
      },
    },
    {
      name: 'merges selected group into another group in same project',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        let written;
        vscode.calls.nextWarningAction = '合并分组';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '支付'),
          (items) => items.find((item) => item.action === 'merge'),
          (items) => items.find((item) => item.group === '财务'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write(data) { written = data; return data; } },
          applyPatches() { return Promise.resolve(); },
        });
        assert.strictEqual(written.conversations.a3.group, '财务');
        assert.strictEqual(written.conversations.b1.group, '银行');
        assert.ok(vscode.calls.warnings[0].message.includes('支付'));
        assert.ok(vscode.calls.warnings[0].message.includes('财务'));
        assert.ok(vscode.calls.warnings[0].message.includes('/p/a'));
      },
    },
    {
      name: 'clears selected group after confirmation',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        let written;
        vscode.calls.nextWarningAction = '清空分组';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '银行'),
          (items) => items.find((item) => item.action === 'clear'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write(data) { written = data; return data; } },
          applyPatches() { return Promise.resolve(); },
        });
        assert.ok(written.conversations.b1);
        assert.strictEqual(written.conversations.b1.group, undefined);
        assert.strictEqual(written.conversations.b1.title, '银行1');
        assert.strictEqual(written.conversations.b1.projectRoot, '/p/b');
        assert.strictEqual(Object.keys(written.conversations).length, Object.keys(manageMetadata.conversations).length);
        assert.strictEqual(written.conversations.a1.group, '财务');
      },
    },
    {
      name: 'blocks merging managed groups when project path is unknown',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const unknownProject = {
          version: 1,
          conversations: {
            one: { title: '一', group: 'A', updatedAtMs: 1000 },
            two: { title: '二', group: 'B', updatedAtMs: 2000 },
          },
        };
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === 'A'),
          (items) => items.find((item) => item.action === 'merge'),
        ];
        await extension.manageGroups({
          store: { load() { return unknownProject; }, write() { throw new Error('should not write'); } },
          applyPatches() { throw new Error('should not patch'); },
        });
        assert.ok(vscode.calls.infos[0].message.includes('项目路径未知'));
      },
    },
    {
      name: 'blocks renaming unknown-project group into existing group',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const unknownProject = {
          version: 1,
          conversations: {
            one: { title: '一', group: 'A', updatedAtMs: 1000 },
            two: { title: '二', group: 'B', updatedAtMs: 2000 },
          },
        };
        let wrote = false;
        vscode.calls.nextInput = 'B';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === 'A'),
          (items) => items.find((item) => item.action === 'rename'),
        ];
        await extension.manageGroups({
          store: { load() { return unknownProject; }, write() { wrote = true; } },
          applyPatches() { throw new Error('should not patch'); },
        });
        assert.strictEqual(wrote, false);
        assert.ok(vscode.calls.infos[0].message.includes('项目路径未知'));
      },
    },
    {
      name: 'informs when merge has no same-project target',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const oneGroup = {
          version: 1,
          conversations: {
            only: { title: '孤立', group: '孤立分组', projectRoot: '/p/only', updatedAtMs: 1000 },
          },
        };
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '孤立分组'),
          (items) => items.find((item) => item.action === 'merge'),
        ];
        await extension.manageGroups({
          store: { load() { return oneGroup; }, write() { throw new Error('should not write'); } },
          applyPatches() { throw new Error('should not patch'); },
        });
        assert.ok(vscode.calls.infos[0].message.includes('没有可合并'));
      },
    },
    {
      name: 'views conversations in selected group',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '财务'),
          (items) => items.find((item) => item.action === 'view'),
          (items) => items.find((item) => item.conversationId === 'a2'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write() { throw new Error('view should not write'); } },
          applyPatches() { throw new Error('view should not patch'); },
        });
        assert.strictEqual(vscode.calls.opened[0], 'vscode://openai.chatgpt/local/a2');
        assert.ok(vscode.calls.quickPicks[2].options.title.includes('/p/a'));
        assert.ok(vscode.calls.quickPicks[2].options.placeHolder.includes('只读'));
      },
    },
    {
      name: 'views managed group without migrating or writing metadata',
      async run() {
        const dir = tempDir('codex-manage-view');
        const metadataPath = path.join(dir, 'meta.json');
        writeJson(metadataPath, {
          version: 1,
          conversations: {
            a1: { title: '对账1', group: '财务', projectRoot: '/p/a', updatedAtMs: 1000 },
          },
        });
        const before = fs.readFileSync(metadataPath, 'utf8');
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '财务'),
          (items) => items.find((item) => item.action === 'view'),
          (items) => items.find((item) => item.conversationId === 'a1'),
        ];
        await extension.manageGroups({
          store: new ConversationMetadataStore({
            metadataPath,
            oldTitlesPath: path.join(dir, 'old-titles.json'),
          }),
        });
        assert.strictEqual(fs.readFileSync(metadataPath, 'utf8'), before);
        assert.strictEqual(vscode.calls.opened[0], 'vscode://openai.chatgpt/local/a1');
      },
    },
    {
      name: 'keeps metadata update without automatic silent patch during managed group write',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        let written;
        const patchCalls = [];
        vscode.calls.nextInfoAction = 'Apply Patches';
        vscode.calls.nextInput = '财务归档';
        vscode.calls.nextQuickPicks = [
          (items) => items.find((item) => item.group === '财务' && item.projectRoot === '/p/a'),
          (items) => items.find((item) => item.action === 'rename'),
        ];
        await extension.manageGroups({
          store: { load() { return manageMetadata; }, write(data) { written = data; return data; } },
          applyPatches(options) {
            patchCalls.push(options);
            return Promise.resolve();
          },
        });
        assert.strictEqual(written.conversations.a1.group, '财务归档');
        assert.ok(vscode.calls.infos[0].message.includes('已更新'));
        assert.ok(vscode.calls.infos[0].message.includes('/p/a'));
        assert.ok(vscode.calls.infos[0].actions.includes('Reload Window'));
        assert.ok(vscode.calls.infos[0].actions.includes('Apply Patches'));
        assert.deepStrictEqual(patchCalls.map((item) => item.silent), [false]);
      },
    },
    {
      name: 'repairs Codex UI by restoring clean bundles before applying patches',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const calls = [];
        const target = { extensionDir: '/codex', packageJsonPath: '/codex/package.json' };
        const report = { changes: [], errors: [], backups: [], syntax: [], idempotent: true };
        vscode.calls.nextInfoAction = 'Reload Window';
        const result = await extension.repairCodexUi({
          locator: { locate() { calls.push('locate'); return target; } },
          store: { load() { calls.push('load'); return metadata; } },
          engine: {
            restoreCleanBundles(value) { calls.push(`restore:${value.extensionDir}`); return [{ path: '/codex/out/extension.js', backupPath: '/backup/extension.js' }]; },
            apply(value, data) { calls.push(`apply:${value.extensionDir}:${Object.keys(data.conversations).length}`); return report; },
          },
        });
        assert.deepStrictEqual(calls, ['locate', 'load', 'restore:/codex', 'apply:/codex:3']);
        assert.strictEqual(result.restored.length, 1);
        assert.strictEqual(result.report, report);
        assert.ok(vscode.calls.infos[0].message.includes('Repair 已完成'));
        assert.ok(vscode.calls.commands.some((item) => item.command === 'workbench.action.reloadWindow'));
      },
    },
    {
      name: 'restores Codex UI without reapplying local group patches',
      async run() {
        const vscode = vscodeMock();
        const extension = loadExtension(vscode);
        const calls = [];
        const target = { extensionDir: '/codex', packageJsonPath: '/codex/package.json' };
        vscode.calls.nextInfoAction = 'Reload Window';
        const result = await extension.restoreCodexUi({
          locator: { locate() { calls.push('locate'); return target; } },
          engine: {
            restoreCleanBundles(value) { calls.push(`restore:${value.extensionDir}`); return [{ path: '/codex/out/extension.js', backupPath: '/backup/extension.js' }]; },
            apply() { throw new Error('should not apply patches'); },
          },
        });
        assert.deepStrictEqual(calls, ['locate', 'restore:/codex']);
        assert.strictEqual(result.restored.length, 1);
        assert.ok(vscode.calls.infos[0].message.includes('已恢复 1 个 clean bundle'));
        assert.ok(vscode.calls.commands.some((item) => item.command === 'workbench.action.reloadWindow'));
      },
    },
    {
      name: 'formats unknown thrown values safely',
      run() {
        const extension = loadExtension(vscodeMock());
        assert.strictEqual(extension.errorText(null), 'null');
        assert.strictEqual(extension.errorText('boom'), 'boom');
        assert.strictEqual(extension.errorText({ message: 'bad' }), 'bad');
        assert.strictEqual(extension.errorText(Object.create(null)), '[unknown error]');
      },
    },
  ],
};
