const vscode = require('vscode');
const { CodexExtensionLocator } = require('./extensionLocator');
const { ConversationMetadataStore } = require('./metadataStore');
const { CodexPatchEngine } = require('./patchEngine');

let outputChannel;

function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Codex Local Groups');
  context.subscriptions.push(outputChannel);
  registerCommands(context);
  setTimeout(() => {
    applyPatches({ silent: true }).catch((error) => showPatchError(error, true));
  }, 1000);
}

function deactivate() {}

function registerCommands(context) {
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.applyPatches', () => {
    applyPatches({ silent: false }).catch((error) => showPatchError(error, false));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.applyPatchesSilent', () => {
    applyPatches({ silent: true }).catch((error) => showPatchError(error, true));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.openMetadataJson', openMetadataJson));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.reloadWindow', reloadWindow));
  context.subscriptions.push(vscode.commands.registerCommand('codexLocalGroups.resetPendingGroup', resetPendingGroup));
}

async function applyPatches(options = {}) {
  const store = new ConversationMetadataStore();
  const metadata = store.load();
  const target = new CodexExtensionLocator().locate();
  const engine = new CodexPatchEngine({ nodePath: configuredNodePath() });
  const report = engine.apply(target, metadata);
  writeReport(target, report);
  if (report.errors.length) {
    throw new Error(report.errors.join('\n'));
  }
  await showPatchSuccess(report, options.silent === true);
  return report;
}

async function openMetadataJson() {
  const store = new ConversationMetadataStore();
  store.load();
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(store.metadataPath));
  await vscode.window.showTextDocument(document);
}

async function resetPendingGroup() {
  new ConversationMetadataStore().resetPendingGroup();
  await applyPatches({ silent: true });
  const action = await vscode.window.showInformationMessage('Codex Local Groups: pending group 已清空，请 Reload Window 同步当前 Codex UI。', 'Reload Window');
  if (action === 'Reload Window') {
    await reloadWindow();
  }
}

async function reloadWindow() {
  await vscode.commands.executeCommand('workbench.action.reloadWindow');
}

function configuredNodePath() {
  const configValue = vscode.workspace.getConfiguration('codexLocalGroups').get('nodePath');
  return configValue || process.env.NODE_BIN || process.execPath || 'node';
}

function writeReport(target, report) {
  outputChannel.appendLine(`OpenAI Codex 扩展：${target.extensionDir}`);
  for (const change of report.changes) {
    outputChannel.appendLine(`修改：${change.path}`);
  }
  for (const backup of report.backups || []) {
    outputChannel.appendLine(`备份：${backup}`);
  }
  for (const error of report.errors) {
    outputChannel.appendLine(`错误：${error}`);
  }
  outputChannel.appendLine(`幂等检查：${report.idempotent ? '通过' : '未通过或未执行'}`);
}

async function showPatchSuccess(report, silent) {
  if (silent) {
    outputChannel.appendLine(report.changes.length === 0
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
  outputChannel.appendLine(error && error.stack ? error.stack : String(error));
  if (!silent) {
    vscode.window.showErrorMessage(`Codex Local Groups patch 失败：${error.message}`);
  } else {
    vscode.window.showWarningMessage('Codex Local Groups patch 失败，详见输出。');
  }
}

module.exports = { activate, deactivate, applyPatches };
