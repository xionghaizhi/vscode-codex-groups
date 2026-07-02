const { CodexExtensionLocator } = require('../src/extensionLocator');
const { ConversationMetadataStore } = require('../src/metadataStore');
const { CodexPatchEngine } = require('../src/patchEngine');
const { resolveNodePath } = require('./node-path');

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
}

function main() {
  const store = new ConversationMetadataStore();
  const metadata = store.load();
  const target = new CodexExtensionLocator().locate();
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
  const report = engine.apply(target, metadata);

  console.log(`最新扩展目录：${target.extensionDir}`);
  for (const change of report.changes) {
    console.log(`已修改：${change.path}`);
  }
  for (const backup of report.backups || []) {
    console.log(`已备份：${backup}`);
  }
  for (const item of report.syntax || []) {
    console.log(`语法检查通过：${item.file}`);
  }
  console.log(`幂等检查：${report.idempotent ? '通过' : '失败'}`);
  if (report.restored) {
    console.log('已回滚本次写入，保留备份用于手工排查。');
  }
  if (report.errors.length || !report.idempotent) {
    for (const error of report.errors) {
      console.error(`错误：${error}`);
    }
    process.exit(1);
  }
  console.log('补丁检查/恢复完成。请在 VSCode 执行 Developer: Reload Window 或重启窗口。');
}
