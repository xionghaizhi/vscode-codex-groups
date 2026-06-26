const { CodexExtensionLocator } = require('../src/extensionLocator');
const { CodexPatchEngine } = require('../src/patchEngine');
const { resolveNodePath } = require('./node-path');

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
}

function main() {
  const target = new CodexExtensionLocator().locate();
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
  const restored = engine.restoreCleanBundles(target);
  console.log(`最新扩展目录：${target.extensionDir}`);
  console.log(`恢复 clean bundle 数：${restored.length}`);
  for (const item of restored) {
    console.log(`恢复：${item.path}`);
  }
  console.log('已恢复原始 Codex UI。请在 VSCode 执行 Developer: Reload Window 或重启窗口。');
}
