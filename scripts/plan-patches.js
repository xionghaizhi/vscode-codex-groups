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
  const metadata = new ConversationMetadataStore().load();
  const target = new CodexExtensionLocator().locate();
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath(), safeMode: true });
  const plan = engine.plan(target, metadata);
  console.log(`最新扩展目录：${target.extensionDir}`);
  console.log(`待修改文件数：${plan.changes.length}`);
  for (const change of plan.changes) {
    console.log(`待修改：${change.path}`);
  }
  for (const error of plan.errors) {
    console.error(`错误：${error}`);
  }
  if (plan.errors.length) {
    process.exit(1);
  }
}
