const fs = require('fs');
const path = require('path');

const DEFAULT_EXTENSIONS_ROOT = '/root/.vscode-server/extensions';

class CodexExtensionLocator {
  constructor(options = {}) {
    this.extensionsRoot = options.extensionsRoot || DEFAULT_EXTENSIONS_ROOT;
  }

  locate() {
    const extensionDir = this.latestExtensionDir();
    const assetsDir = path.join(extensionDir, 'webview/assets');
    return {
      extensionDir,
      packageJsonPath: path.join(extensionDir, 'package.json'),
      extensionJsPath: path.join(extensionDir, 'out/extension.js'),
      headerPath: findBundle(assetsDir, 'header-*.js', isHeaderBundle),
      appMainPath: findBundle(assetsDir, 'app-main-*.js', isAppMainBundle),
      appServerManagerSignalsPath: findBundle(assetsDir, 'thread-context-inputs-*.js', isThreadContextInputsBundle),
      sidebarPath: findBundle(assetsDir, 'sidebar-signals-*.js', () => true),
      localTitlePath: findBundle(assetsDir, 'local-conversation-title-signals-*.js', () => true),
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

function isHeaderBundle(text) {
  return text.includes('recentTasksMenu') && text.includes('Search recent tasks');
}

function isAppMainBundle(text) {
  return text.includes('untitledThreadLabel') && text.includes('conversation.title');
}

function isThreadContextInputsBundle(text) {
  return text.includes('recentConversationsSortKey') && text.includes('thread/list');
}

function isAppServerManagerSignalsBundle(text) {
  return text.includes('refresh-recent-conversations-for-host') && text.includes('thread/list');
}

module.exports = { CodexExtensionLocator, DEFAULT_EXTENSIONS_ROOT };
