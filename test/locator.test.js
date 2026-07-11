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
