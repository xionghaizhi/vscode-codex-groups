const fs = require('fs');
const path = require('path');

const DEFAULT_EXTENSIONS_ROOT = '/root/.vscode-server/extensions';
const STALE_PROJECT_STATUS = /function ([A-Za-z_$][\w$]*)\(\{hasInProgressSideChat:([A-Za-z_$][\w$]*),isResponseInProgress:([A-Za-z_$][\w$]*),latestTurnHasSystemError:([A-Za-z_$][\w$]*),resumeState:([A-Za-z_$][\w$]*),threadRuntimeStatus:([A-Za-z_$][\w$]*)\}\)\{return \2\?`loading`:\6\?\.type===`systemError`\?`error`:\6\?\.type===`active`\?`loading`:\5===`needs_resume`\?`idle`:\4\?`error`:\3===!0\?`loading`:`idle`\}/;

class CodexExtensionLocator {
  constructor(options = {}) {
    this.extensionsRoot = options.extensionsRoot || DEFAULT_EXTENSIONS_ROOT;
  }

  locate() {
    const extensionDir = this.latestExtensionDir();
    const version = packageVersion(extensionDir);
    const assetsDir = path.join(extensionDir, 'webview/assets');
    const appMainPath = findOptionalBundle(assetsDir, 'app-main-*.js', isAppMainBundle) ||
      findBundle(assetsDir, 'app-initial-*.js', isAppMainBundle);
    const appServerManagerSignalsPath = findOptionalBundle(assetsDir, 'app-server-manager-signals-*.js', isAppServerManagerSignalsBundle) ||
      findBundle(assetsDir, 'app-initial-*.js', isAppServerManagerSignalsBundle);
    const requestPath = findOptionalBundle(assetsDir, 'request-*.js', isRequestBundle) ||
      findBundle(assetsDir, 'app-initial-*.js', isRequestBundle);
    const localTitlePath = findOptionalBundle(assetsDir, 'local-conversation-title-signals-*.js', () => true) ||
      findOptionalBundle(assetsDir, 'app-initial-*.js', isLocalTitleBundle);
    const appStatsigPath = findOptionalBundle(assetsDir, 'app-main-*.js', isStatsigConfigBundle) ||
      findOptionalBundle(assetsDir, 'app-initial-*.js', isStatsigConfigBundle) ||
      appMainPath;
    return {
      extensionDir,
      version,
      packageJsonPath: path.join(extensionDir, 'package.json'),
      extensionJsPath: path.join(extensionDir, 'out/extension.js'),
      headerPath: findBundle(assetsDir, 'header-*.js', isHeaderBundle),
      appMainPath,
      appStatsigPath,
      appServerManagerSignalsPath,
      requestPath,
      sidebarPath: findOptionalBundle(assetsDir, 'sidebar-signals-*.js', () => true),
      sidebarProjectGroupSignalsPath: findOptionalBundle(assetsDir, 'sidebar-project-group-signals-*.js', isSidebarProjectStatusBundle) ||
        findOptionalBundle(assetsDir, 'open-project-setup-dialog-*.js', isSidebarProjectStatusBundle),
      localTitlePath,
    };
  }

  latestExtensionDir() {
    if (!fs.existsSync(this.extensionsRoot)) {
      throw new Error(`未找到 VSCode 扩展目录：${this.extensionsRoot}`);
    }
    const dirs = fs.readdirSync(this.extensionsRoot)
      .filter((name) => name.startsWith('openai.chatgpt-'))
      .map((name) => path.join(this.extensionsRoot, name))
      .filter((dir) => fs.statSync(dir).isDirectory());
    if (dirs.length === 0) {
      throw new Error(`未找到 ${this.extensionsRoot}/openai.chatgpt-* 扩展目录`);
    }
    return dirs
      .map((dir) => ({
        dir,
        version: packageVersion(dir),
        mtimeMs: fs.statSync(dir).mtimeMs,
      }))
      .sort(compareExtensionCandidate)[0].dir;
  }
}

function compareExtensionCandidate(a, b) {
  const versionOrder = compareVersions(b.version, a.version);
  if (versionOrder !== 0) {
    return versionOrder;
  }
  return b.mtimeMs - a.mtimeMs;
}

function packageVersion(dir) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return typeof data.version === 'string' ? data.version : '';
  } catch (error) {
    return '';
  }
}

function compareVersions(a, b) {
  const left = versionNumbers(a);
  const right = versionNumbers(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function versionNumbers(version) {
  return String(version).split('.').map((part) => Number(part)).filter((part) => Number.isFinite(part));
}

function findBundle(dir, pattern, predicate) {
  const prefix = pattern.split('*')[0];
  const suffix = pattern.split('*')[1];
  const matches = fs.readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => path.join(dir, name))
    .filter((file) => predicate(fs.readFileSync(file, 'utf8')));
  if (matches.length !== 1) {
    throw new Error(`无法唯一定位 ${prefix}*.js，候选数量：${matches.length}`);
  }
  return matches[0];
}

function findOptionalBundle(dir, pattern, predicate) {
  const prefix = pattern.split('*')[0];
  const suffix = pattern.split('*')[1];
  const matches = fs.readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => path.join(dir, name))
    .filter((file) => predicate(fs.readFileSync(file, 'utf8')));
  if (matches.length > 1) {
    throw new Error(`无法唯一定位 ${prefix}*.js，候选数量：${matches.length}`);
  }
  return matches[0] || null;
}

function isHeaderBundle(text) {
  return text.includes('recentTasksMenu') &&
    (text.includes('Search recent tasks') || text.includes('Search recent chats'));
}

function isAppMainBundle(text) {
  return text.includes('untitledThreadLabel') && text.includes('conversation.title');
}

function isStatsigConfigBundle(text) {
  return text.includes('networkConfig:{api:') && text.includes('sdkExceptionUrl:');
}

function isAppServerManagerSignalsBundle(text) {
  return text.includes('recentConversationsSortKey') && text.includes('thread/list');
}

function isRequestBundle(text) {
  return text.includes('safeGet') && text.includes('makeRequest') && text.includes('OAI-Language');
}

function isLocalTitleBundle(text) {
  return (text.includes('title:t(') || text.includes('title:codexTitleAliasFor(e)??t(')) && text.includes('turns:t(');
}

function isSidebarProjectStatusBundle(text) {
  return text.includes('codexLocalGroupsSidebarProjectStatusPatchVersion=1') || STALE_PROJECT_STATUS.test(text);
}

module.exports = { CodexExtensionLocator, DEFAULT_EXTENSIONS_ROOT, STALE_PROJECT_STATUS };
