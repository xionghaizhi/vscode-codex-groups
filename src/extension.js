const vscode = require('vscode');
const { CodexExtensionLocator } = require('./extensionLocator');
const { ConversationMetadataStore, normalizeMetadata } = require('./metadataStore');
const { CodexPatchEngine } = require('./patchEngine');

let outputChannel;
let patchDisabled = false;
let incompatibleMessage = '';

function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Codex Local Groups');
  context.subscriptions.push(outputChannel);
  registerCommands(context);
  scheduleStartupPatchCheck();
}

function deactivate() {}

function scheduleStartupPatchCheck() {
  if (!vscode.extensions.getExtension('openai.chatgpt')) {
    return;
  }
  // 启动阶段只规划，不直接写 bundle，避免多窗口并发导致 Codex 白屏。
  setTimeout(() => {
    runStartupPatchCheck().catch((error) => ensureOutputChannel().appendLine(errorStackOrText(error)));
  }, 1000);
}

async function runStartupPatchCheck(options = {}) {
  const store = options.store || new ConversationMetadataStore();
  let plan;
  try {
    const metadata = readMetadataOnly(store);
    const target = (options.locator || new CodexExtensionLocator()).locate();
    const engine = options.engine || new CodexPatchEngine({ nodePath: configuredNodePath() });
    plan = engine.plan(target, metadata);
  } catch (error) {
    if (isVersionMismatchError(error)) disablePatchDueToIncompatibility(error);
    else throw error;
    return { changes: [], errors: [errorText(error)] };
  }
  if (plan.errors.length) {
    const error = new Error(plan.errors.map(errorText).join('\n'));
    if (isVersionMismatchError(error)) disablePatchDueToIncompatibility(error);
    return plan;
  }
  if (plan.changes.length === 0) return plan;
  const action = await vscode.window.showInformationMessage('Codex Local Groups: 检测到 Codex 更新覆盖了本地补丁。可一键修复，完成后将 Reload Window。', '修复并 Reload', 'Show Output');
  if (action === '修复并 Reload') {
    await (options.applyPatches || applyPatches)({ silent: true });
    await (options.reloadWindow || reloadWindow)();
  } else if (action === 'Show Output') {
    ensureOutputChannel().show();
  }
  return plan;
}

function registerCommands(context) {
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.applyPatches', () => {
    applyPatches({ silent: false }).catch((error) => showPatchError(error, false));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.applyPatchesSilent', () => {
    if (patchDisabled) {
      showIncompatibleNotification();
      return;
    }
    applyPatches({ silent: true }).catch((error) => showPatchError(error, true));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.checkStatus', () => {
    checkStatus().catch((error) => showCommandError('状态检查', error));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.manageGroups', () => {
    manageGroups().catch((error) => showCommandError('管理分组', error));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.openMetadataJson', openMetadataJson));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.reloadWindow', reloadWindow));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.repairCodexUi', () => {
    repairCodexUi().catch((error) => showCommandError('修复 Codex UI', error));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.restoreCodexUi', () => {
    restoreCodexUi().catch((error) => showCommandError('恢复 Codex UI', error));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.resetPendingGroup', resetPendingGroup));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.searchConversations', () => {
    searchConversations().catch((error) => showCommandError('搜索会话', error));
  }));
}

async function applyPatches(options = {}) {
  if (patchDisabled && options.silent === true) {
    ensureOutputChannel().appendLine(`跳过静默 patch：${incompatibleMessage || '版本不兼容'}`);
    return { changes: [], errors: [], idempotent: true, skipped: true };
  }
  const store = new ConversationMetadataStore();
  const metadata = store.load();
  let target;
  try {
    target = new CodexExtensionLocator().locate();
  } catch (locateError) {
    if (isVersionMismatchError(locateError)) {
      disablePatchDueToIncompatibility(locateError);
    }
    throw locateError;
  }
  const engine = new CodexPatchEngine({ nodePath: configuredNodePath() });
  const report = engine.apply(target, metadata);
  writeReport(target, report);
  if (report.errors.length) {
    const errorText = report.errors.join('\n');
    if (isVersionMismatchError({ message: errorText })) {
      disablePatchDueToIncompatibility({ message: errorText });
    }
    throw new Error(errorText);
  }
  await showPatchSuccess(report, options.silent === true);
  return report;
}

async function repairCodexUi(options = {}) {
  const target = (options.locator || new CodexExtensionLocator()).locate();
  const store = options.store || new ConversationMetadataStore();
  const metadata = store.load();
  const engine = options.engine || new CodexPatchEngine({ nodePath: configuredNodePath() });
  const restored = engine.restoreCleanBundles(target);
  const report = engine.apply(target, metadata);
  writeReport(target, report);
  if (report.errors.length) {
    throw new Error(report.errors.join('\n'));
  }
  const action = await vscode.window.showInformationMessage(
    `Codex Local Groups: Repair 已完成，已恢复 ${restored.length} 个 clean bundle 并重新应用补丁。`,
    'Reload Window',
    'Show Output'
  );
  if (action === 'Reload Window') {
    await reloadWindow();
  } else if (action === 'Show Output') {
    ensureOutputChannel().show();
  }
  return { restored, report };
}

async function restoreCodexUi(options = {}) {
  const target = (options.locator || new CodexExtensionLocator()).locate();
  const engine = options.engine || new CodexPatchEngine({ nodePath: configuredNodePath() });
  const restored = engine.restoreCleanBundles(target);
  const channel = ensureOutputChannel();
  channel.appendLine(`OpenAI Codex 扩展：${target.extensionDir}`);
  for (const item of restored) {
    channel.appendLine(`恢复 clean bundle：${item.path}`);
  }
  const action = await vscode.window.showInformationMessage(
    `Codex Local Groups: 已恢复 ${restored.length} 个 clean bundle，不再重新应用补丁。`,
    'Reload Window',
    'Show Output'
  );
  if (action === 'Reload Window') {
    await reloadWindow();
  } else if (action === 'Show Output') {
    ensureOutputChannel().show();
  }
  return { restored };
}

async function openMetadataJson() {
  const store = new ConversationMetadataStore();
  store.load();
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(store.metadataPath));
  await vscode.window.showTextDocument(document);
}

async function resetPendingGroup() {
  new ConversationMetadataStore().resetPendingGroup();
  const action = await vscode.window.showInformationMessage('Codex Local Groups: pending group 已清空，请 Reload Window 同步当前 Codex UI。', 'Reload Window');
  if (action === 'Reload Window') {
    await reloadWindow();
  }
}

async function checkStatus(options = {}) {
  if (patchDisabled) {
    const lines = [
      '--- Codex Local Groups Status ---',
      'Patch 状态：已禁用（Codex 扩展版本不兼容）',
      `不兼容原因：${incompatibleMessage || '未知'}`,
    ];
    writeStatusLines(lines);
    showIncompatibleNotification();
    return;
  }
  const store = options.store || new ConversationMetadataStore();
  let metadata = { version: 1, conversations: {} };
  let target = null;
  let plan = null;
  let error = null;
  try {
    metadata = readMetadataOnly(store);
    target = (options.locator || new CodexExtensionLocator()).locate();
    const engine = options.engine || new CodexPatchEngine({ nodePath: configuredNodePath() });
    plan = engine.plan(target, metadata);
  } catch (caught) {
    error = caught;
  }
  const lines = buildStatusLines({ target, plan, metadata, metadataPath: store.metadataPath, error });
  writeStatusLines(lines);
  const action = await vscode.window.showInformationMessage(statusMessage(plan, error), 'Apply Patches', 'Reload Window', 'Show Output');
  if (action === 'Apply Patches') {
    try {
      await (options.applyPatches || applyPatches)({ silent: false });
    } catch (caught) {
      showPatchError(caught, false);
    }
  } else if (action === 'Reload Window') {
    await reloadWindow();
  } else if (action === 'Show Output') {
    ensureOutputChannel().show();
  }
}

async function searchConversations(options = {}) {
  const store = options.store || new ConversationMetadataStore();
  const items = conversationQuickPickItems(readMetadataOnly(store));
  if (items.length === 0) {
    await vscode.window.showInformationMessage('Codex Local Groups: 暂无可搜索会话。');
    return;
  }
  const selected = await vscode.window.showQuickPick(items, {
    title: 'Search Codex Conversations',
    placeHolder: '输入标题、分组、项目路径或会话 ID 搜索',
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (selected) {
    await openCodexConversation(selected.conversationId);
  }
}

async function manageGroups(options = {}) {
  const store = options.store || new ConversationMetadataStore();
  const metadata = readMetadataOnly(store);
  const groups = groupQuickPickItems(metadata);
  if (groups.length === 0) {
    await vscode.window.showInformationMessage('Codex Local Groups: 暂无可管理分组。');
    return;
  }
  const group = await vscode.window.showQuickPick(groups, manageGroupsPickOptions());
  if (!group) {
    return;
  }
  const action = await vscode.window.showQuickPick(manageGroupActions(group), {
    title: `管理分组：${groupContextText(group)}`,
  });
  if (!action) {
    return;
  }
  await runManageGroupAction(action.action, store, metadata, group);
}

async function reloadWindow() {
  await vscode.commands.executeCommand('workbench.action.reloadWindow');
}

function configuredNodePath() {
  const configValue = vscode.workspace.getConfiguration('codexLocalGroups').get('nodePath');
  return configValue || process.env.NODE_BIN || process.execPath || 'node';
}

function writeReport(target, report) {
  ensureOutputChannel().appendLine(`OpenAI Codex 扩展：${target.extensionDir}`);
  for (const change of report.changes) {
    ensureOutputChannel().appendLine(`修改：${change.path}`);
  }
  for (const backup of report.backups || []) {
    ensureOutputChannel().appendLine(`备份：${backup}`);
  }
  for (const error of report.errors) {
    ensureOutputChannel().appendLine(`错误：${error}`);
  }
  ensureOutputChannel().appendLine(`幂等检查：${report.idempotent ? '通过' : '未通过或未执行'}`);
}

async function showPatchSuccess(report, silent) {
  if (silent) {
    ensureOutputChannel().appendLine(report.changes.length === 0
      ? '静默 patch：补丁已是最新。'
      : '静默 patch：补丁已应用。');
    return;
  }
  const message = report.changes.length === 0
    ? 'Codex Local Groups: 补丁已是最新。'
    : 'Codex Local Groups: 补丁已应用，请 Reload Window 生效。';
  const action = await vscode.window.showInformationMessage(message, 'Reload Window', 'Show Output');
  if (action === 'Reload Window') {
    await reloadWindow();
  } else if (action === 'Show Output') {
    outputChannel.show();
  }
}

function showPatchError(error, silent) {
  ensureOutputChannel().appendLine(errorStackOrText(error));
  if (patchDisabled) {
    if (!silent) {
      showIncompatibleNotification();
    }
    return;
  }
  if (!silent) {
    vscode.window.showErrorMessage(`Codex Local Groups patch 失败：${errorText(error)}`);
  } else {
    vscode.window.showWarningMessage('Codex Local Groups patch 失败，详见输出。');
  }
}

function isVersionMismatchError(error) {
  const text = errorText(error);
  if (text.includes('未找到') && text.includes('扩展目录')) {
    return true;
  }
  if (text.includes('无法唯一定位')) {
    return true;
  }
  if (text.includes('期望 1 处匹配，实际 0 处')) {
    return true;
  }
  if (text.includes('找不到') && text.includes('注入点')) {
    return true;
  }
  if (text.includes('找不到') && text.includes('起始标记')) {
    return true;
  }
  if (text.includes('找不到') && text.includes('结束标记')) {
    return true;
  }
  return false;
}

function disablePatchDueToIncompatibility(error) {
  if (patchDisabled) {
    return;
  }
  patchDisabled = true;
  incompatibleMessage = errorText(error);
  ensureOutputChannel().appendLine('Codex Local Groups: 检测到 Codex 扩展版本不兼容，本次 patch 未应用。');
  ensureOutputChannel().appendLine(`不兼容原因：${incompatibleMessage}`);
  showIncompatibleNotification();
}

async function showIncompatibleNotification() {
  const action = await vscode.window.showWarningMessage(
    'Codex Local Groups: 当前 Codex 扩展版本不兼容，补丁未应用。Local Groups 功能可能不可用，建议禁用本扩展或等待更新。',
    '禁用扩展',
    '查看输出'
  );
  if (action === '禁用扩展') {
    vscode.commands.executeCommand('workbench.view.extensions');
    setTimeout(() => {
      vscode.commands.executeCommand('workbench.extensions.search', '@builtin false local.vscode-codex-groups');
    }, 500);
  } else if (action === '查看输出') {
    ensureOutputChannel().show();
  }
}

function buildStatusLines({ target, plan, metadata, metadataPath, error }) {
  const stats = metadataStats(metadata);
  const lines = [
    `OpenAI Codex 扩展：${target ? target.extensionDir : '未定位'}`,
    `Codex 版本：${codexPackageVersion(target && target.packageJsonPath)}`,
    `Patch 状态：${patchStatusText(plan, error)}`,
    `会话数量：${stats.total}`,
    `已分组：${stats.grouped}`,
    `未分组：${stats.ungrouped}`,
    `Metadata：${metadataPath || '未知'}`,
  ];
  if (error) {
    lines.push(`错误：${errorText(error)}`);
  }
  for (const item of (plan && plan.errors) || []) {
    lines.push(`错误：${errorText(item)}`);
  }
  return lines;
}

function conversationQuickPickItems(metadata) {
  return Object.entries(metadata.conversations || {}).filter(([id]) => !conversationIsArchived(metadata, id)).map(([id, item]) => {
    const title = cleanText(item.title) || `会话 ${id}`;
    const group = cleanText(item.group) || '未分组';
    const projectRoot = cleanText(item.projectRoot) || '未知项目';
    const updatedAtMs = Number(item.updatedAtMs) || 0;
    return { label: title, description: `${group} · ${id}`, detail: `${projectRoot}${formatTime(updatedAtMs)}`, conversationId: String(id), updatedAtMs };
  }).sort((left, right) => right.updatedAtMs - left.updatedAtMs || left.label.localeCompare(right.label));
}

function groupQuickPickItems(metadata) {
  const groups = new Map();
  for (const item of Object.values(metadata.conversations || {})) {
    const group = cleanGroupName(item.group);
    if (!group) {
      continue;
    }
    const projectRoot = cleanProjectRoot(item.projectRoot);
    const key = JSON.stringify([projectRoot, group]);
    const current = groups.get(key) || { group, projectRoot, count: 0, updatedAtMs: 0 };
    current.count += 1;
    current.updatedAtMs = Math.max(current.updatedAtMs, Number(item.updatedAtMs) || 0);
    groups.set(key, current);
  }
  return Array.from(groups.values()).filter((item) => !groupIsArchived(metadata, item)).sort(compareGroupItems).map(groupQuickPickItem);
}

function metadataStats(metadata) {
  const conversations = Object.values(metadata.conversations || {});
  const grouped = conversations.filter((item) => cleanText(item.group)).length;
  return { total: conversations.length, grouped, ungrouped: conversations.length - grouped };
}

function codexPackageVersion(packageJsonPath) {
  try {
    return JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8')).version || '未知';
  } catch (error) {
    return '未知';
  }
}

function patchStatusText(plan, error) {
  if (error) {
    return '检查失败';
  }
  if (plan && plan.errors && plan.errors.length) {
    return `存在错误（${plan.errors.length} 个）`;
  }
  if (plan && plan.changes && plan.changes.length) {
    return `需要应用补丁（${plan.changes.length} 个文件）`;
  }
  return '已是最新';
}

function statusMessage(plan, error) {
  if (error || (plan && plan.errors && plan.errors.length)) {
    return 'Codex Local Groups: 状态检查失败，详见输出。';
  }
  return plan && plan.changes && plan.changes.length
    ? 'Codex Local Groups: 需要应用补丁。'
    : 'Codex Local Groups: 状态正常，补丁已是最新。';
}

function writeStatusLines(lines) {
  const channel = ensureOutputChannel();
  channel.appendLine('--- Codex Local Groups Status ---');
  for (const line of lines) {
    channel.appendLine(line);
  }
}

function ensureOutputChannel() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Codex Local Groups');
  }
  return outputChannel;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanGroupName(value) {
  let text = String(value == null ? '' : value);
  try {
    text = text.normalize('NFC');
  } catch (error) {}
  return text.replace(/[\s\u3000]+/g, ' ').trim();
}

function cleanProjectRoot(value) {
  return String(value == null ? '' : value).replace(/\\/g, '/').replace(/\/+$/, '').trim();
}

function formatTime(updatedAtMs) {
  return Number.isFinite(updatedAtMs) && updatedAtMs > 0
    ? ` · ${new Date(updatedAtMs).toISOString()}`
    : '';
}

async function openCodexConversation(conversationId) {
  const path = encodeURIComponent(String(conversationId));
  const opened = await vscode.env.openExternal(vscode.Uri.parse(`vscode://openai.chatgpt/local/${path}`));
  if (!opened) {
    await vscode.window.showWarningMessage('Codex Local Groups: 无法打开会话，请确认 OpenAI Codex 扩展已启用。');
  }
  return opened;
}

function showCommandError(action, error) {
  ensureOutputChannel().appendLine(errorStackOrText(error));
  vscode.window.showErrorMessage(`Codex Local Groups ${action}失败：${errorText(error)}`);
}

function manageGroupsPickOptions() {
  return {
    title: 'Manage Codex Groups',
    placeHolder: '选择分组，可按分组名或项目路径搜索',
    matchOnDescription: true,
    matchOnDetail: true,
  };
}

function manageGroupActions(group) {
  return [
    { label: '重命名分组', action: 'rename', description: `更新 ${group.count} 个会话标签` },
    { label: '合并到已有分组', action: 'merge', description: '仅当前同项目内', detail: '选择目标后需要再次确认' },
    { label: '归档分组', action: 'archive', description: `隐藏 ${group.count} 个会话的本地分组`, detail: '不归档 Codex 会话，不修改会话标签' },
    { label: '清空分组，移入未分组', action: 'clear', description: `影响 ${group.count} 个会话`, detail: '只移除分组标签，不删除会话' },
    { label: '查看该分组会话', action: 'view', description: `${group.count} 个会话`, detail: '只读，不修改 metadata' },
  ];
}

async function runManageGroupAction(action, store, metadata, group) {
  if (action === 'rename') {
    await renameManagedGroup(store, metadata, group);
  } else if (action === 'merge') {
    await mergeManagedGroup(store, metadata, group);
  } else if (action === 'archive') {
    await archiveManagedGroup(store, group);
  } else if (action === 'clear') {
    await clearManagedGroup(store, group);
  } else if (action === 'view') {
    await viewManagedGroup(metadata, group);
  }
}

async function archiveManagedGroup(store, group) {
  const message = `确认归档本地分组“${group.group}”？项目：${groupProjectText(group)}。只隐藏本地分组，不归档 Codex 会话，不修改会话分组标签；此操作没有撤销。`;
  const action = await vscode.window.showWarningMessage(message, '归档分组');
  if (action === '归档分组') {
    await writeArchivedGroup(store, group);
  }
}

async function renameManagedGroup(store, metadata, group) {
  const input = await vscode.window.showInputBox({
    title: `重命名分组：${groupContextText(group)}`,
    prompt: `输入新的分组名称；将更新 ${group.count} 个会话。`,
    value: group.group,
  });
  const nextGroup = cleanGroupName(input);
  if (input == null) {
    return;
  }
  if (!nextGroup) {
    await vscode.window.showWarningMessage('Codex Local Groups: 分组名称不能为空。');
    return;
  }
  if (managedGroupExists(metadata, group, nextGroup)) {
    if (!group.projectRoot) {
      await vscode.window.showInformationMessage('Codex Local Groups: 项目路径未知，无法确认同项目，不能合并。');
      return;
    }
    if (!await confirmRenameMerge(group, nextGroup)) {
      return;
    }
  }
  await writeManagedGroup(store, group, nextGroup);
}

async function mergeManagedGroup(store, metadata, group) {
  if (!group.projectRoot) {
    await vscode.window.showInformationMessage('Codex Local Groups: 项目路径未知，无法确认同项目，不能合并。');
    return;
  }
  const targets = groupQuickPickItems(metadata).filter((item) => item.projectRoot === group.projectRoot && item.group !== group.group);
  if (targets.length === 0) {
    await vscode.window.showInformationMessage('Codex Local Groups: 当前项目没有可合并的其他分组。');
    return;
  }
  const target = await vscode.window.showQuickPick(targets, {
    title: `合并分组：${groupContextText(group)}`,
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (target) {
    const confirmed = await confirmMergeGroup(group, target.group);
    if (confirmed) {
      await writeManagedGroup(store, group, target.group);
    }
  }
}

async function clearManagedGroup(store, group) {
  const message = `确认将“${group.group}”下 ${group.count} 个会话移入未分组？项目：${groupProjectText(group)}。只移除分组标签，不删除会话；此操作没有撤销。`;
  const action = await vscode.window.showWarningMessage(message, '清空分组');
  if (action === '清空分组') {
    await writeManagedGroup(store, group, '');
  }
}

async function confirmRenameMerge(group, nextGroup) {
  const message = `“${nextGroup}”已存在。确认将“${group.group}”下 ${group.count} 个会话合并到该分组？项目：${groupProjectText(group)}。只修改分组标签，不删除会话；此操作没有撤销。`;
  const action = await vscode.window.showWarningMessage(message, '合并分组');
  return action === '合并分组';
}

async function confirmMergeGroup(group, nextGroup) {
  const message = `确认将“${group.group}”下 ${group.count} 个会话合并到“${nextGroup}”？项目：${groupProjectText(group)}。只修改分组标签，不删除会话；此操作没有撤销。`;
  const action = await vscode.window.showWarningMessage(message, '合并分组');
  return action === '合并分组';
}

async function viewManagedGroup(metadata, group) {
  const items = conversationQuickPickItems(conversationsInGroup(metadata, group));
  const selected = await vscode.window.showQuickPick(items, {
    title: `查看分组：${groupContextText(group)}`,
    placeHolder: '选择会话打开；查看只读，不修改分组',
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (selected) {
    await openCodexConversation(selected.conversationId);
  }
}

async function writeManagedGroup(store, group, nextGroup) {
  const metadata = store.load();
  const result = updateManagedGroup(metadata, group, nextGroup);
  if (result.count === 0) {
    await vscode.window.showInformationMessage('Codex Local Groups: 没有需要更新的会话。');
    return;
  }
  store.write(result.metadata);
  const context = groupContextText({ ...group, count: result.count });
  const action = await vscode.window.showInformationMessage(
    `Codex Local Groups: 已更新 ${context}。如 Codex UI 未同步，请 Reload Window。`,
    'Reload Window',
    'Show Output'
  );
  if (action === 'Reload Window') {
    await reloadWindow();
  } else if (action === 'Show Output') {
    ensureOutputChannel().show();
  }
}

async function writeArchivedGroup(store, group) {
  const metadata = store.load();
  metadata.archivedGroups = { ...(metadata.archivedGroups || {}) };
  metadata.archivedGroups[archivedGroupKey(group)] = {
    projectRoot: group.projectRoot,
    group: group.group,
    archivedAtMs: Date.now(),
  };
  store.write(metadata);
  const action = await vscode.window.showInformationMessage(
    `Codex Local Groups: 已归档本地分组 ${groupContextText(group)}。不会归档 Codex 会话。如 Codex UI 未同步，请 Reload Window。`,
    'Reload Window',
    'Show Output'
  );
  if (action === 'Reload Window') {
    await reloadWindow();
  } else if (action === 'Show Output') {
    ensureOutputChannel().show();
  }
}

function updateManagedGroup(metadata, group, nextGroup) {
  const updated = JSON.parse(JSON.stringify(metadata));
  let count = 0;
  for (const item of Object.values(updated.conversations || {})) {
    if (!conversationInGroup(item, group)) {
      continue;
    }
    nextGroup ? item.group = nextGroup : delete item.group;
    item.updatedAtMs = Date.now();
    count += 1;
  }
  return { metadata: updated, count };
}

function conversationsInGroup(metadata, group) {
  const conversations = {};
  for (const [id, item] of Object.entries(metadata.conversations || {})) {
    if (conversationInGroup(item, group)) {
      conversations[id] = item;
    }
  }
  return { version: 1, conversations };
}

function conversationInGroup(item, group) {
  return cleanGroupName(item.group) === group.group && cleanProjectRoot(item.projectRoot) === group.projectRoot;
}

function managedGroupExists(metadata, group, nextGroup) {
  if (nextGroup === group.group) {
    return false;
  }
  return groupQuickPickItems(metadata).some((item) => item.projectRoot === group.projectRoot && item.group === nextGroup);
}

function groupIsArchived(metadata, group) {
  return Boolean(metadata.archivedGroups && metadata.archivedGroups[archivedGroupKey(group)]);
}

function conversationIsArchived(metadata, id) {
  return Boolean(metadata.archivedConversations && metadata.archivedConversations[String(id)]);
}

function archivedGroupKey(group) {
  return JSON.stringify([cleanProjectRoot(group.projectRoot), cleanGroupName(group.group)]);
}

function compareGroupItems(left, right) {
  const projectOrder = left.projectRoot.localeCompare(right.projectRoot);
  return projectOrder || left.group.localeCompare(right.group);
}

function groupContextText(group) {
  return `${group.group} · ${group.count} 个会话 · ${groupProjectText(group)}`;
}

function groupProjectText(group) {
  return group.projectRoot || '未知项目';
}

function groupQuickPickItem(item) {
  const project = groupProjectText(item);
  return { ...item, label: item.group, description: `${item.count} 个会话 · ${project}`, detail: project };
}

function readMetadataOnly(store) {
  if (typeof store.readMetadataFile !== 'function') {
    return store.load();
  }
  const data = store.readMetadataFile();
  return data ? normalizeMetadata(data, store.metadataPath || 'metadata') : { version: 1, conversations: {} };
}

function errorText(error) {
  if (error && typeof error === 'object' && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  try {
    return String(error);
  } catch (caught) {
    return '[unknown error]';
  }
}

function errorStackOrText(error) {
  return error && typeof error === 'object' && typeof error.stack === 'string'
    ? error.stack
    : errorText(error);
}

module.exports = {
  activate,
  deactivate,
  applyPatches,
  repairCodexUi,
  restoreCodexUi,
  runStartupPatchCheck,
  checkStatus,
  searchConversations,
  manageGroups,
  buildStatusLines,
  conversationQuickPickItems,
  groupQuickPickItems,
  errorText,
};
