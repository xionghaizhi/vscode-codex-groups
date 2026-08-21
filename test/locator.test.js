const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');
const { CodexExtensionLocator } = require('../src/extensionLocator');

function createExtension(root, name, mtime, version = '1.0.0') {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'webview/assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ name: 'chatgpt', version })}\n`);
  fs.writeFileSync(path.join(dir, 'out/extension.js'), 'console.log("extension")\n');
  fs.writeFileSync(path.join(dir, 'webview/assets/header-a.js'), 'recentTasksMenu Search recent tasks');
  fs.writeFileSync(path.join(dir, 'webview/assets/app-main-a.js'), 'untitledThreadLabel conversation.title function aE(e){}');
  fs.writeFileSync(path.join(dir, 'webview/assets/app-server-manager-signals-a.js'), 'recentConversationsSortKey thread/list');
  fs.writeFileSync(path.join(dir, 'webview/assets/request-a.js'), 'safeGet safePost makeRequest OAI-Language');
  fs.writeFileSync(path.join(dir, 'webview/assets/sidebar-signals-a.js'), 'sidebar');
  fs.writeFileSync(path.join(dir, 'webview/assets/open-project-setup-dialog-a.js'), 'function rn({hasInProgressSideChat:a,isResponseInProgress:b,latestTurnHasSystemError:c,resumeState:d,threadRuntimeStatus:f}){return a?`loading`:f?.type===`systemError`?`error`:f?.type===`active`?`loading`:d===`needs_resume`?`idle`:c?`error`:b===!0?`loading`:`idle`}');
  fs.writeFileSync(path.join(dir, 'webview/assets/local-conversation-title-signals-a.js'), 'title');
  fs.utimesSync(dir, mtime, mtime);
  return dir;
}

module.exports = {
  name: 'extension locator',
  tests: [
    {
      name: 'selects latest openai chatgpt extension by package version',
      run() {
        const root = tempDir('codex-locator');
        createExtension(root, 'openai.chatgpt-2-linux-x64', new Date('2026-02-01T00:00:00Z'), '26.1.0');
        const latest = createExtension(root, 'openai.chatgpt-1-linux-x64', new Date('2026-01-01T00:00:00Z'), '26.2.0');
        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.strictEqual(target.extensionDir, latest);
        assert.strictEqual(target.version, '26.2.0');
        assert.ok(target.headerPath.endsWith('header-a.js'));
        assert.ok(target.appMainPath.endsWith('app-main-a.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-server-manager-signals-a.js'));
        assert.ok(target.requestPath.endsWith('request-a.js'));
        assert.ok(target.sidebarProjectGroupSignalsPath.endsWith('open-project-setup-dialog-a.js'));
      },
    },
    {
      name: 'uses mtime when package versions tie',
      run() {
        const root = tempDir('codex-locator-mtime');
        createExtension(root, 'openai.chatgpt-1-linux-x64', new Date('2026-01-01T00:00:00Z'), '26.1.0');
        const latest = createExtension(root, 'openai.chatgpt-2-linux-x64', new Date('2026-02-01T00:00:00Z'), '26.1.0');
        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.strictEqual(target.extensionDir, latest);
      },
    },
    {
      name: 'uses the active registry entry after Codex is rolled back',
      run() {
        const root = tempDir('codex-locator-active');
        const stable = createExtension(root, 'openai.chatgpt-26727-linux-x64', new Date('2026-08-01T00:00:00Z'), '26.727.40816');
        createExtension(root, 'openai.chatgpt-265730-linux-x64', new Date('2026-08-06T00:00:00Z'), '26.5730.61639');
        fs.writeFileSync(path.join(root, 'extensions.json'), JSON.stringify([{
          identifier: { id: 'openai.chatgpt' },
          version: '26.727.40816',
          relativeLocation: path.basename(stable),
        }]));

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.strictEqual(target.extensionDir, stable);
        assert.strictEqual(target.version, '26.727.40816');
      },
    },
    {
      name: 'locates Codex 26.715 bundles without scanning unrelated assets',
      run() {
        const root = tempDir('codex-locator-26715');
        const dir = createExtension(root, 'openai.chatgpt-1-linux-x64', new Date(), '26.715.31925');
        const assets = path.join(dir, 'webview/assets');
        fs.writeFileSync(path.join(assets, 'header-a.js'), 'recentTasksMenu Search recent chats');
        fs.writeFileSync(path.join(assets, 'header-icon.js'), 'export{};');
        fs.writeFileSync(path.join(assets, 'sidebar-project-group-signals-a.js'), 'project groups only');
        fs.unlinkSync(path.join(assets, 'open-project-setup-dialog-a.js'));

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.headerPath.endsWith('header-a.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-server-manager-signals-a.js'));
        assert.strictEqual(target.sidebarProjectGroupSignalsPath, null);
      },
    },
    {
      name: 'locates split Codex 26.721 app-initial bundles',
      run() {
        const root = tempDir('codex-locator-26721');
        const dir = createExtension(root, 'openai.chatgpt-1-linux-x64', new Date(), '26.721.41059');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) {
          fs.unlinkSync(path.join(assets, name));
        }
        fs.writeFileSync(path.join(assets, 'app-main-shell.js'), 'entry only');
        fs.writeFileSync(path.join(assets, 'app-initial-view.js'), 'untitledThreadLabel conversation.title safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e)');
        fs.writeFileSync(path.join(assets, 'app-initial-server.js'), 'recentConversationsSortKey thread/list networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m,networkOverrideFunc:n}');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.appMainPath.endsWith('app-initial-view.js'));
        assert.ok(target.requestPath.endsWith('app-initial-view.js'));
        assert.ok(target.localTitlePath.endsWith('app-initial-view.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-server.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-server.js'));
        assert.strictEqual(target.sidebarPath, null);
      },
    },
    {
      name: 'locates split Codex 26.727 app-initial bundles',
      run() {
        const root = tempDir('codex-locator-26727');
        const dir = createExtension(root, 'openai.chatgpt-1-linux-x64', new Date(), '26.727.40816');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) fs.unlinkSync(path.join(assets, name));
        fs.writeFileSync(path.join(assets, 'app-initial-main.js'), 'untitledThreadLabel conversation.title safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e)');
        fs.writeFileSync(path.join(assets, 'app-initial-server.js'), 'recentConversationsSortKey thread/list networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m,networkOverrideFunc:n}');
        fs.writeFileSync(path.join(assets, 'app-initial-other.js'), 'unrelated bundle');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.appMainPath.endsWith('app-initial-main.js'));
        assert.ok(target.requestPath.endsWith('app-initial-main.js'));
        assert.ok(target.localTitlePath.endsWith('app-initial-main.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-server.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-server.js'));
        assert.strictEqual(target.sidebarPath, null);
      },
    },
    {
      name: 'locates Codex 26.5730 app-main after untitled label moves to another bundle',
      run() {
        const root = tempDir('codex-locator-265730');
        const dir = createExtension(root, 'openai.chatgpt-1-linux-x64', new Date(), '26.5730.61639');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) fs.unlinkSync(path.join(assets, name));
        fs.writeFileSync(path.join(assets, 'app-initial-ui.js'), 'conversation.title safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e) supportedReasoningEfforts defaultReasoningEffort');
        fs.writeFileSync(path.join(assets, 'app-initial-server.js'), 'untitledThreadLabel recentConversationsSortKey thread/list networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m,networkOverrideFunc:n}');
        fs.writeFileSync(path.join(assets, 'app-initial-other.js'), 'unrelated bundle');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.appMainPath.endsWith('app-initial-ui.js'));
        assert.ok(target.requestPath.endsWith('app-initial-ui.js'));
        assert.ok(target.localTitlePath.endsWith('app-initial-ui.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-server.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-server.js'));
      },
    },
    {
      name: 'locates Codex 26.5803.61601 split bundles with an unrelated app-initial bundle',
      run() {
        const root = tempDir('codex-locator-265803');
        const dir = createExtension(root, 'openai.chatgpt-1', new Date(), '26.5803.61601');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) fs.unlinkSync(path.join(assets, name));
        fs.renameSync(path.join(assets, 'header-a.js'), path.join(assets, 'header-C4MbtUfx.js'));
        fs.writeFileSync(path.join(assets, 'app-initial-BOIVXb2k.js'), 'conversation.title safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e) supportedReasoningEfforts defaultReasoningEffort');
        fs.writeFileSync(path.join(assets, 'app-initial-4D0dCZ-d.js'), 'recentConversationsSortKey thread/list networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m,networkOverrideFunc:n}');
        fs.writeFileSync(path.join(assets, 'app-initial-B8I9YTld.js'), 'supportedReasoningEfforts only');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.headerPath.endsWith('header-C4MbtUfx.js'));
        assert.ok(target.appMainPath.endsWith('app-initial-BOIVXb2k.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-4D0dCZ-d.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-4D0dCZ-d.js'));
      },
    },
    {
      name: 'locates Codex 26.5810.41047 split app-main/statsig and server bundles',
      run() {
        const root = tempDir('codex-locator-265810');
        const dir = createExtension(root, 'openai.chatgpt-1', new Date(), '26.5810.41047');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) fs.unlinkSync(path.join(assets, name));
        fs.renameSync(path.join(assets, 'header-a.js'), path.join(assets, 'header-DPGKK91L.js'));
        fs.writeFileSync(path.join(assets, 'app-initial-CuO8rPSL.js'), 'conversation.title untitledThreadLabel networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m} supportedReasoningEfforts defaultReasoningEffort safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e)');
        fs.writeFileSync(path.join(assets, 'app-initial-DLJA_f9P.js'), 'recentConversationsSortKey thread/list');
        fs.writeFileSync(path.join(assets, 'app-initial-other.js'), 'supportedReasoningEfforts only');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.headerPath.endsWith('header-DPGKK91L.js'));
        assert.ok(target.appMainPath.endsWith('app-initial-CuO8rPSL.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-CuO8rPSL.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-DLJA_f9P.js'));
      },
    },
    {
      name: 'locates Codex 26.5810.52044 merged main/statsig/request and split server bundles',
      run() {
        const root = tempDir('codex-locator-265810-52044');
        const dir = createExtension(root, 'openai.chatgpt-1', new Date(), '26.5810.52044');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) fs.unlinkSync(path.join(assets, name));
        fs.renameSync(path.join(assets, 'header-a.js'), path.join(assets, 'header-CSBoBpDg.js'));
        fs.writeFileSync(path.join(assets, 'app-initial-BYsFXcPC.js'), 'conversation.title untitledThreadLabel supportedReasoningEfforts defaultReasoningEffort networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m} safeGet makeRequest OAI-Language');
        fs.writeFileSync(path.join(assets, 'app-initial-CireNHNv.js'), 'recentConversationsSortKey thread/list supportedReasoningEfforts defaultReasoningEffort safeGet');
        fs.writeFileSync(path.join(assets, 'app-initial-unrelated.js'), 'supportedReasoningEfforts only');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.headerPath.endsWith('header-CSBoBpDg.js'));
        assert.ok(target.appMainPath.endsWith('app-initial-BYsFXcPC.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-BYsFXcPC.js'));
        assert.ok(target.requestPath.endsWith('app-initial-BYsFXcPC.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-CireNHNv.js'));
        assert.strictEqual(target.localTitlePath, null);
      },
    },
    {
      name: 'locates Codex 26.5814.41407 exact release bundles',
      run() {
        const root = tempDir('codex-locator-265814');
        const dir = createExtension(root, 'openai.chatgpt-26.5814.41407', new Date(), '26.5814.41407');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) fs.unlinkSync(path.join(assets, name));
        fs.renameSync(path.join(assets, 'header-a.js'), path.join(assets, 'header-BdmTQpqZ.js'));
        fs.writeFileSync(path.join(assets, 'app-initial-B2gWpz-T.js'), 'conversation.title untitledThreadLabel supportedReasoningEfforts defaultReasoningEffort networkConfig:{api:j,sdkExceptionUrl:m} safeGet makeRequest OAI-Language');
        fs.writeFileSync(path.join(assets, 'app-initial-XTPxJJJs.js'), 'recentConversationsSortKey thread/list');
        fs.writeFileSync(path.join(assets, 'app-initial-unrelated.js'), 'supportedReasoningEfforts only');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.headerPath.endsWith('header-BdmTQpqZ.js'));
        assert.ok(target.appMainPath.endsWith('app-initial-B2gWpz-T.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-B2gWpz-T.js'));
        assert.ok(target.requestPath.endsWith('app-initial-B2gWpz-T.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-XTPxJJJs.js'));
        assert.strictEqual(target.localTitlePath, null);
      },
    },
    {
      name: 'locates Codex 26.5818.31338 exact release bundles',
      run() {
        const root = tempDir('codex-locator-265818');
        const dir = createExtension(root, 'openai.chatgpt-26.5818.31338', new Date(), '26.5818.31338');
        const assets = path.join(dir, 'webview/assets');
        for (const name of ['app-main-a.js', 'app-server-manager-signals-a.js', 'request-a.js', 'sidebar-signals-a.js', 'local-conversation-title-signals-a.js']) fs.unlinkSync(path.join(assets, name));
        fs.renameSync(path.join(assets, 'header-a.js'), path.join(assets, 'header-D92QSxKa.js'));
        fs.writeFileSync(path.join(assets, 'app-initial-CYlXrWdX.js'), 'conversation.title untitledThreadLabel supportedReasoningEfforts defaultReasoningEffort networkConfig:{api:j,sdkExceptionUrl:m} safeGet makeRequest OAI-Language');
        fs.writeFileSync(path.join(assets, 'app-initial-D5LtbkHB.js'), 'recentConversationsSortKey thread/list');
        fs.writeFileSync(path.join(assets, 'app-initial-unrelated.js'), 'supportedReasoningEfforts only');
        fs.writeFileSync(path.join(assets, 'header-BAxM_yA-.js'), 'not a header stub');

        const target = new CodexExtensionLocator({ extensionsRoot: root }).locate();
        assert.ok(target.headerPath.endsWith('header-D92QSxKa.js'));
        assert.ok(target.appMainPath.endsWith('app-initial-CYlXrWdX.js'));
        assert.ok(target.appStatsigPath.endsWith('app-initial-CYlXrWdX.js'));
        assert.ok(target.requestPath.endsWith('app-initial-CYlXrWdX.js'));
        assert.ok(target.appServerManagerSignalsPath.endsWith('app-initial-D5LtbkHB.js'));
        assert.strictEqual(target.localTitlePath, null);
      },
    },
    {
      name: 'fails when header bundle cannot be uniquely identified',
      run() {
        const root = tempDir('codex-locator-missing');
        const dir = createExtension(root, 'openai.chatgpt-1-linux-x64', new Date());
        fs.unlinkSync(path.join(dir, 'webview/assets/header-a.js'));
        assert.throws(() => new CodexExtensionLocator({ extensionsRoot: root }).locate(), /无法唯一定位 header/);
      },
    },
  ],
};
