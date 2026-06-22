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
  const target = new CodexExtensionLocator().locate();
  const metadata = new ConversationMetadataStore().load();
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
  const restored = engine.restoreCleanBundles(target);
  const report = engine.apply(target, metadata);
  console.log(`最新扩展目录：${target.extensionDir}`);
  console.log(`恢复 clean bundle 数：${restored.length}`);
  for (const item of restored) {
    console.log(`恢复：${item.path}`);
  }
  for (const error of report.errors) {
    console.error(`错误：${error}`);
  }
  if (report.errors.length) {
    process.exit(1);
  }
  console.log(`重新应用补丁文件数：${report.changes.length}`);
  console.log(`幂等检查：${report.idempotent ? '通过' : '未通过'}`);
}
