const fs = require('fs');
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
  assertContains(target.extensionJsPath, 'codexLocalGroupsPatchVersion=14');
  assertContains(target.extensionJsPath, 'c.cwds=s');
  assertContains(target.headerPath, 'codexLocalGroupsHeaderSafePatchVersion=3');
  assertContains(target.headerPath, 'codexLocalGroupsHistoryLimit=120');
  assertContains(target.headerPath, 'codexLocalGroupsHistoryRecovered');
  assertContains(target.appServerManagerSignalsPath, 'codexLocalGroupsRecentPatchVersion=3');
  assertContains(target.appServerManagerSignalsPath, 'cwds:t');
  for (const file of safeBundlePaths(target)) {
    assertNotContains(file, 'requestAllThreadList(e)');
    assertNotContains(file, '"--disable","plugins"');
    assertNotContains(file, 'codexLocalGroupsMetadataOnly');
    assertNotContains(file, 'codexLocalGroupsMetadataItems');
    assertNotContains(file, 'codexLocalGroupsMetadataRow');
  }
  const engine = new CodexPatchEngine({ nodePath: resolveNodePath(), safeMode: true });
  for (const item of engine.runSyntaxChecks(target)) {
    console.log(`语法检查通过：${item.file}`);
  }
  const yuxi = yuxiMetadataSummary();
  if (yuxi.total < 90 || yuxi.grouped < 90 || yuxi.yuxiGroups !== 3 || yuxi.qingpi < 3) {
    throw new Error(`yuxi metadata 统计异常：${JSON.stringify(yuxi)}`);
  }
  console.log(`metadata 检查通过：total=${yuxi.total} grouped=${yuxi.grouped} yuxiGroups=${yuxi.yuxiGroups} 青啤=${yuxi.qingpi}`);
  console.log(`安全补丁标记检查通过：${target.extensionDir}`);
}

function safeBundlePaths(target) {
  return [
    target.extensionJsPath,
    target.headerPath,
    target.appServerManagerSignalsPath,
    target.appMainPath,
    target.requestPath,
    target.localTitlePath,
  ].filter(Boolean);
}

function assertContains(file, marker) {
  if (!fs.readFileSync(file, 'utf8').includes(marker)) {
    throw new Error(`缺少补丁标记：${file} ${marker}`);
  }
}

function assertNotContains(file, marker) {
  if (fs.readFileSync(file, 'utf8').includes(marker)) {
    throw new Error(`存在不应出现的补丁标记：${file} ${marker}`);
  }
}

function yuxiMetadataSummary() {
  const metadata = JSON.parse(fs.readFileSync('/root/.codex/codex-vscode-conversation-meta.json', 'utf8'));
  const entries = Object.entries(metadata.conversations || {});
  const groups = new Map();
  for (const [, value] of entries) {
    const root = normalizePath(value.projectRoot);
    if (root !== '/home/project/vscode/yuxi' && !root.startsWith('/home/project/vscode/yuxi/')) {
      continue;
    }
    const group = String(value.group || '未分组').trim() || '未分组';
    groups.set(group, (groups.get(group) || 0) + 1);
  }
  return {
    total: entries.length,
    grouped: entries.filter(([, value]) => String(value.group || '').trim()).length,
    yuxiGroups: groups.size,
    qingpi: groups.get('青啤') || 0,
  };
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/\/+$/, '');
}
