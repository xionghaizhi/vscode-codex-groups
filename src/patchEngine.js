const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { normalizeMetadata } = require('./metadataStore');
const { STALE_PROJECT_STATUS } = require('./extensionLocator');

const EMPTY_METADATA = { version: 1, conversations: {} };
const EXTENSION_METADATA_SYNC_BRANCH = 'if(e.action==="getMetadata"){try{t?.postMessage?.({type:"codex-local-groups",action:"metadataSaved",metadata:r})}catch{}return!0}';
const EXTENSION_VSCODE_ALIAS = 'typeof $g!="undefined"?$g:require("vscode")';
const LEGACY_UNSAFE_SIGNATURES = [
  'workspace.workspaceFolders?.map(a=>a.uri.fsPath).filter(Boolean)??[]',
  'workspace.workspaceFolders?.map(c=>c.uri.fsPath)??[]',
  '"--disable","plugins"',
  '"account-info":async()=>({accountId:null',
  'requestAllThreadList(e)',
  't===`recent`?s:t',
  '!1&&navigator?.',
  '!1&&navigator.',
  'preventAllNetworkTraffic:!0',
];

class CodexPatchEngine {
  constructor(options = {}) {
    this.nodePath = options.nodePath || process.env.NODE_BIN || process.execPath || 'node';
    this.skipSyntaxCheck = options.skipSyntaxCheck === true;
    this.safeMode = options.safeMode === true || options.mode === 'safe' ||
      options.patchMode === 'safe' || process.env.CODEX_LOCAL_GROUPS_PATCH_MODE === 'safe' ||
      process.env.CODEX_LOCAL_GROUPS_PATCH_MODE === 'conservative';
    const provider = String(options.responsesWebsocketFallbackProvider || '');
    this.responsesWebsocketFallbackProvider = /^[A-Za-z0-9_-]+$/.test(provider) ? provider : '';
  }

  plan(target, metadata) {
    normalizeMetadata(metadata, 'metadata');
    const version = String(target.version || '');
    const versionParts = version.split('.');
    const major = Number(versionParts[0]);
    const minor = Number(versionParts[1]);
    const context = {
      errors: [],
      safeMode: this.safeMode,
      codexMinor: minor,
      cwdFilterKey: major === 26 && minor === 721 ? 'cwd' : 'cwds',
      responsesWebsocketFallbackProvider: version === '26.721.41059' ? this.responsesWebsocketFallbackProvider : '',
    };
    if (version && (major !== 26 || !Number.isInteger(minor) || (minor > 721 && minor !== 727 && minor !== 5730 && minor !== 5803 && minor !== 5810))) {
      context.errors.push(`不支持的 Codex 扩展版本：${version}`);
    }
    const changes = [];
    if (this.safeMode) {
      const unsafeBundles = unsafeBundlePaths(target);
      if (unsafeBundles.length) {
        return { changes, errors: context.errors, unsafeBundles };
      }
      planFile(changes, target.extensionJsPath, (text) => patchExtensionSafeHost(text, context));
      planFile(changes, target.headerPath, (text, file) => patchHeader(text, context, file));
      if (major === 26 && (minor === 721 || minor === 727 || minor === 5730 || minor === 5803 || minor === 5810)) {
        const patchUi = minor === 5810 ? patchCodexUi265810 : minor === 5803 ? patchCodexUi265803 : minor === 5730 ? patchCodexUi265730 : minor === 727 ? patchCodexUi26727 : patchCodexUiFeatureGate;
        const patchPower = minor === 5810 ? patchCodexPower265810 : minor === 5803 ? patchCodexPower265803 : minor === 5730 ? patchCodexPower265730 : minor === 727 ? patchCodexPower26727 : patchCodexPowerAndSubagents;
        const patchHistory = minor === 5810 ? patchProjectHistory265810 : minor === 5803 ? patchProjectHistory265803 : minor === 5730 ? patchProjectHistory265730 : minor === 727 ? patchProjectHistory26727 : patchProjectHistory26721;
        if (target.appStatsigPath === target.appMainPath) {
          planFile(changes, target.appMainPath, (text) => {
            let next = patchPower(patchUi(text, context), context);
            if (target.appServerManagerSignalsPath === target.appMainPath) next = patchHistory(next, context);
            return next;
          });
        } else {
          planFile(changes, target.appMainPath, (text) => target.appServerManagerSignalsPath === target.appMainPath
            ? patchHistory(patchUi(text, context), context)
            : patchUi(text, context));
          planFile(changes, target.appStatsigPath, (text) => target.appServerManagerSignalsPath === target.appStatsigPath
            ? patchHistory(patchPower(text, context), context)
            : patchPower(text, context));
        }
        if (target.appServerManagerSignalsPath !== target.appMainPath && target.appServerManagerSignalsPath !== target.appStatsigPath) {
          planFile(changes, target.appServerManagerSignalsPath, (text) => patchHistory(text, context));
        }
      }
      return { changes, errors: context.errors, unsafeBundles };
    }
    planFile(changes, target.extensionJsPath, (text) => patchExtension(text, context));
    planFile(changes, target.sidebarPath, (text) => patchSidebar(text, context));
    planFile(changes, target.sidebarProjectGroupSignalsPath, (text) => patchSidebarProjectGroupSignals(text, context));
    planFile(changes, target.headerPath, (text, file) => patchHeader(text, context, file));
    const appStatsigPath = target.appStatsigPath || target.appMainPath;
    planFile(changes, target.appMainPath, (text) => {
      let next = patchAppMain(text, context);
      if (target.requestPath === target.appMainPath) next = patchRequest(next, context);
      if (target.localTitlePath === target.appMainPath) next = patchLocalTitle(next, context);
      if (appStatsigPath === target.appMainPath) next = patchAppMainStatsigNetwork(next, context);
      return next;
    });
    planFile(changes, target.appServerManagerSignalsPath, (text) => {
      let next = patchAppServerManagerSignals(text, context);
      if (appStatsigPath === target.appServerManagerSignalsPath) next = patchAppMainStatsigNetwork(next, context);
      return next;
    });
    if (appStatsigPath !== target.appMainPath && appStatsigPath !== target.appServerManagerSignalsPath) {
      planFile(changes, appStatsigPath, (text) => patchAppMainStatsigNetwork(text, context));
    }
    if (target.requestPath !== target.appMainPath && target.requestPath !== target.appServerManagerSignalsPath) {
      planFile(changes, target.requestPath, (text) => patchRequest(text, context));
    }
    if (target.localTitlePath !== target.appMainPath && target.localTitlePath !== target.appServerManagerSignalsPath) {
      planFile(changes, target.localTitlePath, (text) => patchLocalTitle(text, context));
    }
    return { changes, errors: context.errors };
  }

  apply(target, metadata) {
    let cleanRestored = [];
    if (this.safeMode) {
      const unsafeBundles = unsafeBundlePaths(target);
      const cleanBackups = unsafeBundles.map((file) => ({ path: file, backupPath: findCleanBackup(file) }));
      const missingBackups = cleanBackups.filter((item) => !item.backupPath).map((item) => item.path);
      if (missingBackups.length) {
        return {
          changes: [],
          errors: [`无法恢复旧版高风险补丁：${missingBackups.join(', ')}`],
          cleanRestored,
          syntax: [],
          idempotent: false,
          restored: false,
        };
      }
      cleanRestored = restoreCleanBackups(cleanBackups);
    }
    const plan = this.plan(target, metadata);
    if (plan.errors.length) {
      return { ...plan, cleanRestored, changed: [], syntax: [], idempotent: false };
    }
    if (plan.changes.length === 0) {
      return { ...plan, cleanRestored, backups: [], syntax: [], idempotent: true, restored: false };
    }
    const backups = plan.changes.map((change) => backupFile(change.path));
    try {
      for (const change of plan.changes) {
        const tmp = `${change.path}.codex-local-groups-${process.pid}-${Date.now()}.tmp`;
        fs.writeFileSync(tmp, change.nextText);
        fs.renameSync(tmp, change.path);
      }
      const syntax = this.runSyntaxChecks(target);
      const nextPlan = this.plan(target, metadata);
      if (nextPlan.errors.length || nextPlan.changes.length) {
        restoreFiles(plan.changes);
        return {
          ...plan,
          cleanRestored,
          backups,
          syntax,
          restored: true,
          idempotent: false,
          errors: [...nextPlan.errors, `幂等检查失败：仍有 ${nextPlan.changes.length} 个变更`],
        };
      }
      return { ...plan, cleanRestored, backups, syntax, idempotent: true, restored: false };
    } catch (error) {
      restoreFiles(plan.changes);
      throw error;
    }
  }

  runSyntaxChecks(target) {
    if (this.skipSyntaxCheck) {
      return [];
    }
    return [
      checkScript(this.nodePath, target.extensionJsPath),
      checkModule(this.nodePath, target.headerPath),
      checkModule(this.nodePath, target.appMainPath),
      target.appStatsigPath && target.appStatsigPath !== target.appMainPath ? checkModule(this.nodePath, target.appStatsigPath) : null,
      target.appServerManagerSignalsPath ? checkModule(this.nodePath, target.appServerManagerSignalsPath) : null,
      target.requestPath ? checkModule(this.nodePath, target.requestPath) : null,
      target.localTitlePath ? checkModule(this.nodePath, target.localTitlePath) : null,
      target.sidebarPath ? checkModule(this.nodePath, target.sidebarPath) : null,
      target.sidebarProjectGroupSignalsPath ? checkModule(this.nodePath, target.sidebarProjectGroupSignalsPath) : null,
    ].filter(Boolean);
  }

  restoreCleanBundles(target) {
    const files = patchedBundlePaths(target);
    const cleanBackups = files.map((file) => ({ path: file, backupPath: findCleanBackup(file) }));
    const missingBackups = cleanBackups.filter((item) => !item.backupPath).map((item) => item.path);
    if (missingBackups.length) {
      throw new Error(`无法恢复已修改 bundle，缺少 clean backup：${missingBackups.join(', ')}`);
    }
    return restoreCleanBackups(cleanBackups);
  }
}

function patchedBundlePaths(target) {
  const markers = ['codexLocalGroups', ...LEGACY_UNSAFE_SIGNATURES];
  return targetBundlePaths(target).filter((file) => {
    if (!fs.existsSync(file)) return false;
    const text = fs.readFileSync(file, 'utf8');
    return markers.some((marker) => text.includes(marker));
  });
}

function unsafeBundlePaths(target) {
  const markers = [
    'codexLocalGroupsHeaderPatchVersion=',
    'codexLocalGroupsHeaderSafePatchVersion=3',
    'codexLocalGroupsHeaderSafePatchVersion=4',
    'codexLocalGroupsRecentPatchVersion=',
    'codexLocalGroupsWebviewPatchVersion=',
    'codexLocalGroupsRequestPatchVersion=',
    'codexLocalGroupsLocalTitlePatchVersion=',
    'codexLocalGroupsSidebarProjectStatusPatchVersion=',
    ...LEGACY_UNSAFE_SIGNATURES,
  ];
  return targetBundlePaths(target).filter((file) => {
    if (!fs.existsSync(file)) return false;
    const text = fs.readFileSync(file, 'utf8');
    return markers.some((marker) => text.includes(marker));
  });
}

function targetBundlePaths(target) {
  return Array.from(new Set([
    target.extensionJsPath,
    target.headerPath,
    target.appMainPath,
    target.appStatsigPath,
    target.appServerManagerSignalsPath,
    target.requestPath,
    target.localTitlePath,
    target.sidebarPath,
    target.sidebarProjectGroupSignalsPath,
  ].filter(Boolean)));
}

function restoreCleanBackup(file, knownBackupPath) {
  const backupPath = knownBackupPath || findCleanBackup(file);
  if (!backupPath) {
    return null;
  }
  const tmp = `${file}.codex-local-groups-restore-${process.pid}-${Date.now()}.tmp`;
  try {
    fs.copyFileSync(backupPath, tmp);
    fs.renameSync(tmp, file);
  } catch (error) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    throw error;
  }
  return { path: file, backupPath };
}

function restoreCleanBackups(items) {
  const snapshots = [];
  const restored = [];
  try {
    for (let index = 0; index < items.length; index += 1) {
      const rollbackPath = `${items[index].path}.codex-local-groups-rollback-${process.pid}-${Date.now()}-${index}.tmp`;
      fs.copyFileSync(items[index].path, rollbackPath);
      snapshots.push({ path: items[index].path, rollbackPath });
    }
    for (const item of items) restored.push(restoreCleanBackup(item.path, item.backupPath));
  } catch (error) {
    let rollbackError = null;
    for (const item of restored.slice().reverse()) {
      const snapshot = snapshots.find((entry) => entry.path === item.path);
      const tmp = `${item.path}.codex-local-groups-rollback-restore-${process.pid}-${Date.now()}.tmp`;
      try {
        fs.copyFileSync(snapshot.rollbackPath, tmp);
        fs.renameSync(tmp, item.path);
      } catch (caught) {
        if (!rollbackError) rollbackError = caught;
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      }
    }
    for (const snapshot of snapshots) if (fs.existsSync(snapshot.rollbackPath)) fs.unlinkSync(snapshot.rollbackPath);
    if (rollbackError) throw new Error(`${error.message}；回滚失败：${rollbackError.message}`);
    throw error;
  }
  for (const snapshot of snapshots) if (fs.existsSync(snapshot.rollbackPath)) fs.unlinkSync(snapshot.rollbackPath);
  return restored;
}

function findCleanBackup(file) {
  const dir = backupDir(file);
  if (!fs.existsSync(dir)) {
    return null;
  }
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith(`${path.basename(file)}.before-codex-local-groups-`) && name.endsWith('.bak'))
    .map((name) => path.join(dir, name))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
    .find((backup) => {
      const text = fs.readFileSync(backup, 'utf8');
      return !text.includes('codexLocalGroups') && !LEGACY_UNSAFE_SIGNATURES.some((signature) => text.includes(signature));
    }) || null;
}

function planFile(changes, file, patch) {
  if (!file || !fs.existsSync(file)) {
    return;
  }
  const oldText = fs.readFileSync(file, 'utf8');
  const nextText = patch(oldText, file);
  if (nextText !== oldText) {
    changes.push({ path: file, oldText, nextText });
  }
}

function restoreFiles(changes) {
  for (const change of changes.slice().reverse()) {
    const tmp = `${change.path}.codex-local-groups-${process.pid}-${Date.now()}.tmp`;
    fs.writeFileSync(tmp, change.oldText);
    fs.renameSync(tmp, change.path);
  }
}

function backupFile(file) {
  const dir = backupDir(file);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 17);
  const base = path.join(dir, `${path.basename(file)}.before-codex-local-groups-${stamp}-${process.pid}`);
  for (let index = 0; index < 1000; index += 1) {
    const target = `${base}${index ? `-${index}` : ''}.bak`;
    try {
      fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
      return target;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  throw new Error(`无法创建唯一备份文件：${file}`);
}

function backupDir(file) {
  return path.basename(file) === 'extension.js'
    ? path.join(path.dirname(path.dirname(file)), '.codex-patches')
    : path.join(path.dirname(path.dirname(path.dirname(file))), '.codex-patches');
}

function checkScript(nodePath, file) {
  assertNodeExists(nodePath);
  const result = childProcess.spawnSync(nodePath, ['--check', file], { encoding: 'utf8' });
  if (result.error && result.status == null) {
    throw new Error(`语法检查启动失败：${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`语法检查失败：${file}\n${result.stderr}`);
  }
  return { file, module: false };
}

function checkModule(nodePath, file) {
  assertNodeExists(nodePath);
  const input = fs.readFileSync(file);
  const result = childProcess.spawnSync(nodePath, ['--input-type=module', '--check'], { input, encoding: 'utf8' });
  if (result.error && result.status == null) {
    throw new Error(`语法检查启动失败：${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`语法检查失败：${file}\n${result.stderr}`);
  }
  return { file, module: true };
}

function patchExtension(text, context) {
  let next = patchExtensionProjectHistory(text, context);
  next = patchExtensionMetadataHelper(next, context);
  next = patchExtensionAliasUsages(next, context);
  next = patchExtensionMessageHandler(next, context);
  next = patchExtensionWebviewTimeout(next, context);
  next = patchExtensionAccountInfo(next, context);
  next = patchExtensionAppServerArgs(next, context);
  next = next.replace(/typeof navigator<"u"&&navigator\?\./g, '!1&&navigator?.');
  next = next.replace(/typeof navigator<"u"&&navigator\./g, '!1&&navigator.');
  return next;
}

function patchExtensionSafeHost(text, context) {
  let next = patchExtensionMetadataHelper(text, context);
  next = patchExtensionMessageHandler(next, context);
  next = patchExtensionWebviewTimeout(next, context);
  next = patchExtensionResponsesWebsocketFallback(next, context);
  return next;
}

function patchExtensionWebviewTimeout(text, context) {
  if (context.codexMinor === 5810) return patchExtensionWebviewTimeout265810(text, context);
  if (context.codexMinor !== 5730 && context.codexMinor !== 5803) return text;
  const current = 'this.onTimeout()},3e4))}dispose(){this.disposed=!0';
  const patched = 'this.onTimeout()},12e4))}dispose(){this.disposed=!0';
  if (text.includes(patched)) return text;
  return replaceOnce(text, current, patched, context, 'extension webview startup timeout');
}

function patchExtensionWebviewTimeout265810(text, context) {
  const current = 'this.onTimeout({elapsedMs:Date.now()-e,receivedWebviewMessage:this.receivedWebviewMessage,timeoutMs:3e4})},3e4)';
  const patched = 'this.onTimeout({elapsedMs:Date.now()-e,receivedWebviewMessage:this.receivedWebviewMessage,timeoutMs:12e4})},12e4)';
  if (text.includes(patched)) {
    if (countMatches(text, current) !== 0 || countMatches(text, patched) !== 1) {
      context.errors.push('extension webview startup timeout 26.5810: 补丁标记不完整');
    }
    return text;
  }
  if (countMatches(text, current) !== 1) {
    context.errors.push('extension webview startup timeout 26.5810: 找不到唯一 jP 看门狗');
    return text;
  }
  const next = replaceOnce(text, current, patched, context, 'extension webview startup timeout 26.5810');
  if (countMatches(next, patched) !== 1 || next.includes(current)) {
    context.errors.push('extension webview startup timeout 26.5810: 补丁后置条件不完整');
  }
  return next;
}

function patchExtensionResponsesWebsocketFallback(text, context) {
  const provider = context.responsesWebsocketFallbackProvider;
  const current = /([A-Za-z_$][\w$]*)\(this\.extensionUri,\["-c","features\.code_mode_host=true","app-server","--analytics-default-enabled"\]\)/;
  const existingPattern = /,"-c","model_providers\.[A-Za-z0-9_-]+\.supports_websockets=false"/g;
  const existing = text.match(existingPattern) || [];
  if (existing.length > 1) {
    context.errors.push(`extension resumed thread websocket fallback: 检测到 ${existing.length} 个 transport 覆盖`);
    return text;
  }
  if (existing.length === 1) {
    if (current.test(text)) {
      context.errors.push('extension resumed thread websocket fallback: 旧 transport 覆盖与原始启动参数并存');
      return text;
    }
    const replacement = provider ? `,"-c","model_providers.${provider}.supports_websockets=false"` : '';
    return text.replace(existingPattern, replacement);
  }
  if (!provider) return text;
  const override = `model_providers.${provider}.supports_websockets=false`;
  return replaceRegexOnce(
    text,
    current,
    `$1(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled","-c","${override}"])`,
    context,
    'extension resumed thread websocket fallback',
  );
}

function patchExtensionAppServerArgs(text, context) {
  const oldText = 'kle(this.extensionUri,"app-server",["--analytics-default-enabled"])';
  const next = 'kle(this.extensionUri,"app-server",["--analytics-default-enabled","--disable","plugins","-c","mcp_oauth_credentials_store=\\"file\\""])';
  if (text.includes('"--disable","plugins"')) {
    return text;
  }
  const current = /([A-Za-z_$][\w$]*)\(this\.extensionUri,\["-c","features\.code_mode_host=true","app-server","--analytics-default-enabled"\]\)/;
  if (current.test(text)) {
    return replaceRegexOnce(text, current, '$1(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled","--disable","plugins","-c","mcp_oauth_credentials_store=\\"file\\""])', context, 'extension app-server api-key precheck fallback current');
  }
  const latest = /([A-Za-z_$][\w$]*)\(this\.extensionUri,"app-server",\["--analytics-default-enabled"\]\)/;
  if (!text.includes(oldText)) {
    return replaceRegexOnce(text, latest, '$1(this.extensionUri,"app-server",["--analytics-default-enabled","--disable","plugins","-c","mcp_oauth_credentials_store=\\"file\\""])', context, 'extension app-server api-key precheck fallback latest');
  }
  return replaceOnce(text, oldText, next, context, 'extension app-server api-key precheck fallback');
}

function patchExtensionAccountInfo(text, context) {
  const next = '"account-info":async()=>({accountId:null,userId:null,plan:null,email:null,computeResidency:null,hasChatGptToken:!1})';
  if (text.includes(next)) {
    return text;
  }
  if (!text.includes('Unable to extract account id and plan from auth token.')) {
    return text;
  }
  const current = /"account-info":async\(\)=>\{let e=await this\.authProvider\.getToken\(\{refreshToken:!1\}\);if\(!e\)return\{accountId:null,userId:null,plan:null,email:null,computeResidency:null(?:,hasChatGptToken:!1)?\};try\{let r=JSON\.parse\(Buffer\.from\(e\.split\("\."\)\[1\],"base64url"\)\.toString\("utf8"\)\),n=r\["https:\/\/api\.openai\.com\/auth"\]\?\?\{\},o=r\["https:\/\/api\.openai\.com\/profile"\]\?\?\{\},i=n\?\.chatgpt_account_id\?\?null,s=n\?\.chatgpt_user_id\?\?null,a=n\?\.chatgpt_plan_type\?\?null,c=n\?\.chatgpt_compute_residency\?\?null,l=o\.email\?\?null;if\(i&&s&&a\)return\{accountId:i,userId:s,plan:a,email:l,computeResidency:c(?:,hasChatGptToken:!0)?\}\}catch\{[A-Za-z_$][\w$]*\(\)\.error\("Unable to extract account id and plan from auth token\."\)\}return\{accountId:null,userId:null,plan:null,email:null,computeResidency:null(?:,hasChatGptToken:!0)?\}\}/;
  if (current.test(text)) {
    return replaceRegexOnce(text, current, next, context, 'extension account info api-key fallback current');
  }
  return replaceOnce(text, extensionAccountInfoOld(), next, context, 'extension account info api-key fallback');
}

function extensionAccountInfoOld() {
  return '"account-info":async()=>{let e=await this.authProvider.getToken({refreshToken:!1});if(!e)return{accountId:null,userId:null,plan:null,email:null,computeResidency:null};try{let r=JSON.parse(Buffer.from(e.split(".")[1],"base64url").toString("utf8")),n=r["https://api.openai.com/auth"]??{},o=r["https://api.openai.com/profile"]??{},i=n?.chatgpt_account_id??null,s=n?.chatgpt_user_id??null,a=n?.chatgpt_plan_type??null,c=n?.chatgpt_compute_residency??null,l=o.email??null;if(i&&s&&a)return{accountId:i,userId:s,plan:a,email:l,computeResidency:c}}catch{X().error("Unable to extract account id and plan from auth token.")}return{accountId:null,userId:null,plan:null,email:null,computeResidency:null}}';
}

function patchExtensionMetadataHelper(text, context) {
  if (text.includes('codexLocalGroupsPatchVersion=17') || text.includes('codexLocalGroupsPatchVersion=16') || text.includes('codexLocalGroupsPatchVersion=15') || text.includes('codexLocalGroupsPatchVersion=14')) {
    return upgradeExtensionHostHelperRuntime(fixInjectedWhitespaceRegex(text), context);
  }
  if (text.includes('codexLocalGroupsPatchVersion=13')) {
    let next = fixInjectedWhitespaceRegex(text).replace('codexLocalGroupsPatchVersion=13', 'codexLocalGroupsPatchVersion=14');
    if (!next.includes('function codexLocalGroupsProjectRootFor')) {
      next = next.replace(
        'function codexLocalGroupsCleanGroupName',
        'function codexLocalGroupsProjectRootFor(e){let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return typeof r=="string"&&r.trim().length>0?codexLocalGroupsCleanProjectRoot(r):null}function codexLocalGroupsCleanGroupName',
      );
    }
    return upgradeExtensionHostHelperRuntime(next, context);
  }
  const helper = buildExtensionHostHelper(context);
  if (text.includes('var kce=require("path"),codexLocalGroupsFs=')) {
    return replaceToMarker(text, 'var kce=require("path"),codexLocalGroupsFs=', 'var xg=', helper, context, 'extension metadata helper upgrade');
  }
  if (text.includes('codexTitleAliasesPath')) {
    return replaceToMarker(text, 'var kce=require("path"),codexTitleAliasesPath=', 'var xg=', helper, context, 'extension metadata helper');
  }
  if (text.includes('var Dle=require("path");W();$t();')) {
    return replaceOnce(text, 'var Dle=require("path");W();$t();', buildExtensionHostHelper(context, 'Dle', 'typeof W=="function"&&W(),typeof $t=="function"&&$t();'), context, 'extension metadata helper');
  }
  if (text.includes('var Xle=require("path");U();Nt();')) {
    return replaceOnce(text, 'var Xle=require("path");U();Nt();', buildExtensionHostHelper(context, 'Xle', 'typeof U=="function"&&U(),typeof Nt=="function"&&Nt();'), context, 'extension metadata helper latest');
  }
  const latestPathAlias = symbolAfter(text, 'var ', '=require("path");U();Nt();');
  if (latestPathAlias) {
    return replaceOnce(text, `var ${latestPathAlias}=require("path");U();Nt();`, buildExtensionHostHelper(context, latestPathAlias, 'typeof U=="function"&&U(),typeof Nt=="function"&&Nt();'), context, 'extension metadata helper latest alias');
  }
  const current = /var ([A-Za-z_$][\w$]*)=require\("path"\);([A-Za-z_$][\w$]*)\(\);([A-Za-z_$][\w$]*)\(\);var ([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(require\("vscode"\)\)/;
  if (current.test(text)) {
    return replaceRegexOnce(text, current, (match, pathName, firstInit, secondInit, vscodeName, vscodeFactory) => `${buildExtensionHostHelper(context, pathName, `typeof ${firstInit}=="function"&&${firstInit}(),typeof ${secondInit}=="function"&&${secondInit}();`)}var ${vscodeName}=${vscodeFactory}(require("vscode"))`, context, 'extension metadata helper current');
  }
  return replaceOnce(text, 'var kce=require("path");$t();', buildExtensionHostHelper(context, 'kce', 'typeof $t=="function"&&$t();'), context, 'extension metadata helper legacy');
}

function buildExtensionHostHelper(context, pathName, init) {
  return upgradeExtensionHostHelperRuntime(extensionHostHelper(pathName, init), context);
}

function upgradeExtensionHostHelperRuntime(text, context) {
  const oldGuard = '(e.action==="promptConversationTitle"||e.action==="promptConversationGroup"||e.action==="promptNewGroup")&&!t';
  const newGuard = '(e.action==="promptConversationTitle"||e.action==="promptConversationGroup"||e.action==="promptNewGroup"||e.action==="getMetadata")&&!t';
  const metadataRead = 'let r=codexLocalGroupsReadMeta();';
  const metadataSync = `${metadataRead}${EXTENSION_METADATA_SYNC_BRANCH}if(e.action==="saveConversationMeta")`;
  let next = text.split(EXTENSION_VSCODE_ALIAS).join('require("vscode")').replace(oldGuard, newGuard);
  next = next.replace('showInputBox({title:e,prompt:e,value:t??""})', 'showInputBox({title:e,prompt:e,value:t??"",ignoreFocusOut:!0})');
  next = next.replace('showQuickPick(l,{title:"设置需求分组",placeHolder:"选择已有分组，或新建分组"})', 'showQuickPick(l,{title:"设置需求分组",placeHolder:"选择已有分组，或新建分组",ignoreFocusOut:!0})');
  if (!next.includes(metadataSync)) {
    next = next.replace(`${metadataRead}if(e.action==="saveConversationMeta")`, metadataSync);
  }
  if (!next.includes(newGuard) || !next.includes(metadataSync)) {
    context.errors.push('extension metadata runtime sync: getMetadata 注入不完整');
    return text;
  }
  next = next.replace(/codexLocalGroupsPatchVersion=(?:14|15|16)/, 'codexLocalGroupsPatchVersion=17');
  if (next.includes('codexLocalGroupsGroupArchived')) {
    return upgradeExtensionHostArchiveConversation(next);
  }
  const oldText = 'function codexLocalGroupsExistingGroups(e){let t=codexLocalGroupsCleanProjectRoot(e),r=codexLocalGroupsReadMeta().conversations??{},n=new Map;for(let o of Object.values(r)){if(!o||typeof o!="object")continue;let i=codexLocalGroupsCleanGroupName(o.group);if(!i)continue;let a=codexLocalGroupsCleanProjectRoot(o.projectRoot);if(t&&a&&a!==t)continue;n.set(i,i)}return Array.from(n.values()).sort((e,t)=>e.localeCompare(t))}';
  const newText = 'function codexLocalGroupsArchivedGroupKey(e,t){return JSON.stringify([codexLocalGroupsCleanProjectRoot(e),codexLocalGroupsCleanGroupName(t)])}function codexLocalGroupsGroupArchived(e,t,r){return!!r.archivedGroups?.[codexLocalGroupsArchivedGroupKey(e,t)]}function codexLocalGroupsExistingGroups(e){let t=codexLocalGroupsCleanProjectRoot(e),r=codexLocalGroupsReadMeta(),n=new Map;for(let o of Object.values(r.conversations??{})){if(!o||typeof o!="object")continue;let i=codexLocalGroupsCleanGroupName(o.group);if(!i)continue;let a=codexLocalGroupsCleanProjectRoot(o.projectRoot);if(t&&a&&a!==t)continue;if(codexLocalGroupsGroupArchived(a,i,r))continue;n.set(i,i)}return Array.from(n.values()).sort((e,t)=>e.localeCompare(t))}';
  next = next.replace(oldText, newText);
  return upgradeExtensionHostArchiveConversation(next);
}

function upgradeExtensionHostArchiveConversation(text) {
  if (text.includes('archiveConversationMeta')) {
    return text;
  }
  const oldText = 'let r=codexLocalGroupsReadMeta();if(e.action==="saveConversationMeta")r=codexLocalGroupsMergeConversation(e);else if(e.action==="setPendingGroup"||e.action==="newConversationInGroup")';
  const newText = 'let r=codexLocalGroupsReadMeta();if(e.action==="saveConversationMeta")r=codexLocalGroupsMergeConversation(e);else if(e.action==="archiveConversationMeta"){let n=String(e.conversationId??"");if(n){r.archivedConversations||(r.archivedConversations={}),r.archivedConversations[n]={archivedAtMs:Date.now()},r.conversations&&delete r.conversations[n]}}else if(e.action==="setPendingGroup"||e.action==="newConversationInGroup")';
  return text.replace(oldText, newText);
}

function patchExtensionAliasUsages(text, context) {
  const replacements = [
    ['s=Cle(n)', 's=Cle(codexTitleAliasFor(r)??n)', 'extension chat item alias label'],
    ['c=s??I$', 'c=codexTitleAliasFor(n.conversationId)??s??I$', 'extension pending tab alias label'],
    ['r.title=npe(s)', 'r.title=npe(codexTitleAliasFor(i)??s)', 'extension panel initial alias title'],
    ['label:s??void 0', 'label:codexTitleAliasFor(i)??s??void 0', 'extension panel pending alias label'],
    ['r.title=npe(l)', 'r.title=npe(codexTitleAliasFor(i)??l)', 'extension panel preview alias title'],
    ['r.set(String(n.id),n.name?.trim()||n.preview)', 'r.set(String(n.id),(codexTitleAliasFor(n.id)??n.name?.trim())||n.preview)', 'extension preview alias map'],
  ];
  let next = text;
  for (const [oldText, newText, label] of replacements) {
    if (oldText === newText) {
      continue;
    }
    if (!next.includes(newText) && next.includes(oldText)) {
      next = replaceOnce(next, oldText, newText, context, label);
    }
  }
  return next;
}

function patchExtensionMessageHandler(text, context) {
  let next = text;
  const capnOldV2 = 'e.onDidReceiveMessage(n=>{let o=a2(n);o!=null&&this.#a(o.message)})';
  const capnNewV2 = 'e.onDidReceiveMessage(n=>{if(codexLocalGroupsHandleWebviewMessage(n))return;let o=a2(n);o!=null&&this.#a(o.message)})';
  const capnOldV1 = 'e.onDidReceiveMessage(n=>{let o=PH(n);o!=null&&this.#a(o.message)})';
  const capnNewV1 = 'e.onDidReceiveMessage(n=>{if(codexLocalGroupsHandleWebviewMessage(n))return;let o=PH(n);o!=null&&this.#a(o.message)})';
  const capnOld5810 = 'e.onDidReceiveMessage(n=>{let o=B8(n);o==null||o.sessionId!==this.#r||this.#a(o.message)})';
  const capnNew5810 = 'e.onDidReceiveMessage(n=>{if(codexLocalGroupsHandleWebviewMessage(n))return;let o=B8(n);o==null||o.sessionId!==this.#r||this.#a(o.message)})';
  if (!next.includes(capnNewV2) && !next.includes(capnNewV1) && !next.includes(capnNew5810)) {
    if (next.includes(capnOldV2)) {
      next = replaceOnce(next, capnOldV2, capnNewV2, context, 'extension capn metadata message handler');
    } else if (next.includes(capnOldV1)) {
      next = replaceOnce(next, capnOldV1, capnNewV1, context, 'extension capn metadata message handler legacy');
    } else if (next.includes(capnOld5810)) {
      next = replaceOnce(next, capnOld5810, capnNew5810, context, 'extension capn metadata message handler 26.5810');
    }
  }
  const webviewOld = 'this.handleMessage(e,a)});';
  const webviewNew = 'if(codexLocalGroupsHandleWebviewMessage(a,e))return;this.handleMessage(e,a)});';
  const currentPatched = /if\(codexLocalGroupsHandleWebviewMessage\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)\)return;this\.handleMessage\(\2,\1\)\}\);/;
  if (!next.includes(webviewNew) && !currentPatched.test(next)) {
    if (next.includes(webviewOld)) {
      next = replaceOnce(next, webviewOld, webviewNew, context, 'extension direct metadata message handler');
    } else {
      const current = /this\.handleMessage\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)\}\);/;
      next = replaceRegexOnce(next, current, (match, webview, message) => `if(codexLocalGroupsHandleWebviewMessage(${message},${webview}))return;${match}`, context, 'extension direct metadata message handler current');
    }
  }
  return next;
}

function patchExtensionProjectHistory(text, context) {
  let next = text;
  if (!next.includes('workspace.workspaceFolders?.map')) {
    next = replaceOnce(next, extensionProviderOld(), extensionProviderNew(text), context, 'extension project history filter');
  }
  if (!next.includes('metadata:c?{workingDirectoryPath:c}')) {
    if (next.includes(extensionItemOld())) {
      next = replaceOnce(next, extensionItemOld(), extensionItemNew(text), context, 'extension chat item cwd metadata');
    } else {
      next = replaceRegexOnce(next, /toChatSessionItem\(e\)\{let\{conversationId:r,preview:n,createdAtMs:o\}=e,i=[A-Za-z_$][\w$]*\(r\),s=[A-Za-z_$][\w$]*\(n\),a=o!=null\?\{startTime:o\}:void 0;return\{id:String\(r\),resource:i,label:s,timing:a\}\}/, extensionItemNew(text), context, 'extension chat item cwd metadata latest');
    }
  }
  if (!next.includes('cwd:e.cwd??codexLocalGroupsProjectRootFor(e.id)')) {
    if (next.includes('modelProvider:e.modelProvider,cwd:e.cwd')) {
      next = replaceOnce(next, 'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider,cwd:e.cwd}}', 'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider,cwd:e.cwd??codexLocalGroupsProjectRootFor(e.id)}}', context, 'extension thread cwd metadata fallback');
    } else {
      next = replaceOnce(next, 'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider}}', 'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider,cwd:e.cwd??codexLocalGroupsProjectRootFor(e.id)}}', context, 'extension thread cwd summary');
    }
  }
  return patchExtensionThreadList(next, context);
}

function extensionProviderOld() {
  return 'async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===HS:c!==HS}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[];for(let{item:c,summary:l}of o)this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c);let s=i.map(c=>this.applyLifecycleToChatSessionItem(c));return Array.from(this.pendingConversations.values()).filter(c=>n(c.modelProvider)).map(c=>this.applyLifecycleToChatSessionItem(c.item)).concat(s)}';
}

function extensionProviderNew(text) {
  const vscodeName = symbolBefore(text, 'onDidChangeChatSessionItemsEmitter=new ', '.EventEmitter;') || 'codexLocalGroupsVscode';
  const providerName = text.includes('c===HS:c!==HS') ? 'HS' : 'IS';
  return `async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===${providerName}:c!==${providerName}}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[],s=${vscodeName}.workspace.workspaceFolders?.map(c=>c.uri.fsPath)??[],a=c=>{c=c.split(String.fromCharCode(92)).join(\`/\`);while(c.endsWith(\`/\`))c=c.slice(0,-1);return c},u=s.map(c=>a(c));for(let{item:c,summary:l}of o){let d=l.cwd,f=d?a(d):null,m=s.length===0||!f||u.some(h=>f===h||f.startsWith(h+"/"));if(!m)continue;this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c)}let c=i.map(l=>this.applyLifecycleToChatSessionItem(l));return Array.from(this.pendingConversations.values()).filter(l=>n(l.modelProvider)).map(l=>this.applyLifecycleToChatSessionItem(l.item)).concat(c)}`;
}

function extensionItemOld() {
  return 'toChatSessionItem(e){let{conversationId:r,preview:n,createdAtMs:o}=e,i=xle(r),s=Cle(n),a=o!=null?{startTime:o}:void 0;return{id:String(r),resource:i,label:s,timing:a}}';
}

function extensionItemNew(text) {
  const pathName = extensionPathAlias(text);
  const names = text.match(/toChatSessionItem\(e\)\{let\{conversationId:r,preview:n,createdAtMs:o\}=e,i=([A-Za-z_$][\w$]*)\(r\),s=([A-Za-z_$][\w$]*)\(n\),a=o!=null\?\{startTime:o\}:void 0;return\{id:String\(r\),resource:i,label:s,timing:a\}\}/);
  const resourceName = names ? names[1] : 'xle';
  const labelName = names ? names[2] : 'Cle';
  return `toChatSessionItem(e){let{conversationId:r,preview:n,createdAtMs:o,cwd:c}=e,i=${resourceName}(r),s=${labelName}(codexTitleAliasFor(r)??n),a=o!=null?{startTime:o}:void 0,l=c?${pathName}.basename(c):void 0;return{id:String(r),resource:i,label:s,timing:a,description:l?l:void 0,tooltip:c?\`${'${s}'}\\n${'${c}'}\`:void 0,metadata:c?{workingDirectoryPath:c}:void 0}}`;
}

function extensionPathAlias(text) {
  const latest = symbolAfter(text, 'var ', '=require("path");U();Nt();');
  if (latest) {
    return latest;
  }
  return symbolAfter(text, 'var ', '=require("path");') || 'kce';
}

function extensionThreadListOld() {
  return 'requestThreadList(e){let r=String(this.nextRequestId++),n=new Promise((o,i)=>{this.requestToCallback.set(r,s=>{if(s.error){i(new Error(s.error.message));return}if(s.result==null){i(new Error("No result in response"));return}o(s.result)})});return this.codexAppServer.sendRequest(_le,r,"thread/list",{limit:50,cursor:null,sortKey:"created_at",modelProviders:e?[HS]:null,archived:!1,sourceKinds:Yf}),n}';
}

function patchExtensionThreadList(text, context) {
  const next = extensionThreadListNew(text, context.cwdFilterKey);
  const paged = extensionThreadListPagedRegex();
  if (paged.test(text)) {
    return replaceRegexOnce(text, extensionThreadListPagedRegex(), () => next, context, 'extension thread list current workspace filter');
  }
  const currentFilter = `c.${context.cwdFilterKey}=s`;
  const oldFilter = context.cwdFilterKey === 'cwd' ? 'c.cwds=s' : 'c.cwd=s';
  if (text.includes(currentFilter)) {
    return text.replace('c={limit:200,cursor:r,sortKey:"created_at",modelProviders:e?[', 'c={limit:50,cursor:r,sortKey:"created_at",modelProviders:e?[');
  }
  if (text.includes(oldFilter)) {
    return text.replace(oldFilter, currentFilter)
      .replace('c={limit:200,cursor:r,sortKey:"created_at",modelProviders:e?[', 'c={limit:50,cursor:r,sortKey:"created_at",modelProviders:e?[');
  }
  const old = extensionThreadListOld();
  if (text.includes(old)) {
    return replaceOnce(text, old, next, context, 'extension paged thread list');
  }
  const latest = /requestThreadList\(e\)\{let r=String\(this\.nextRequestId\+\+\),n=new Promise\(\(o,i\)=>\{this\.requestToCallback\.set\(r,s=>\{if\(s\.error\)\{i\(new Error\(s\.error\.message\)\);return\}if\(s\.result==null\)\{i\(new Error\("No result in response"\)\);return\}o\(s\.result\)\}\)\}\);return this\.codexAppServer\.sendRequest\(([A-Za-z_$][\w$]*),r,"thread\/list",\{limit:50,cursor:null,sortKey:"created_at",modelProviders:e\?\[([A-Za-z_$][\w$]*)\]:null,archived:!1,sourceKinds:([A-Za-z_$][\w$]*)(?:,useStateDbOnly:!0)?\}\),n\}/;
  return replaceRegexOnce(text, latest, () => next, context, 'extension paged thread list latest');
}

function extensionThreadListNew(text, cwdFilterKey = 'cwds') {
  const vscodeName = symbolBefore(text, 'onDidChangeChatSessionItemsEmitter=new ', '.EventEmitter;') || 'wl';
  const requestProvider = symbolBefore(text, 'this.codexAppServer.sendRequest(', ',n,"thread/list"') ||
    symbolBefore(text, 'this.codexAppServer.sendRequest(', ',r,"thread/list"') ||
    '_le';
  const modelProvider = symbolBefore(text, 'modelProviders:e?[', ']:null') || 'HS';
  const sourceKindsMatch = text.match(/archived:!1,sourceKinds:([A-Za-z_$][\w$]*)[});]/);
  const sourceKinds = sourceKindsMatch ? sourceKindsMatch[1] : 'Yf';
  const stateDbOnly = /sourceKinds:[A-Za-z_$][\w$]*,useStateDbOnly:!0/.test(text) ? ',useStateDbOnly:!0' : '';
  return `requestThreadList(e,r=null){let n=String(this.nextRequestId++),o=new Promise((i,s)=>{this.requestToCallback.set(n,a=>{if(a.error){s(new Error(a.error.message));return}if(a.result==null){s(new Error("No result in response"));return}i(a.result)})}),s=${vscodeName}.workspace.workspaceFolders?.map(a=>a.uri.fsPath).filter(Boolean)??[],c={limit:50,cursor:r,sortKey:"created_at",modelProviders:e?[${modelProvider}]:null,archived:!1,sourceKinds:${sourceKinds}${stateDbOnly}};s.length>0&&(c.${cwdFilterKey}=s);return this.codexAppServer.sendRequest(${requestProvider},n,"thread/list",c),o}`;
}

function extensionThreadListPagedRegex() {
  return /async requestAllThreadList\(e\)\{let r=\[\],n=null;do\{let o=await this\.requestThreadList\(e,n\);[\s\S]{0,900}?return this\.codexAppServer\.sendRequest\([A-Za-z_$][\w$]*,n,"thread\/list",[A-Za-z_$][\w$]*\),o\}/;
}

function patchSidebar(text, context) {
  if (text.includes('t===`recent`?s:t')) {
    return text;
  }
  if (text.match(/b=t\(([^,]+),\(\{get:e\}\)=>e\(d\)\?\?s\),/)) {
    return replaceRegexOnce(text, /b=t\(([^,]+),\(\{get:e\}\)=>e\(d\)\?\?s\),/, 'b=t($1,({get:e})=>{let t=e(d)??s;return t===`recent`?s:t}),', context, 'sidebar organize mode');
  }
  const current = /([A-Za-z_$][\w$]*)=t\(([A-Za-z_$][\w$]*),\(\{get:e\}\)=>e\(([A-Za-z_$][\w$]*)\)\?\?s\)/;
  if (!current.test(text)) {
    return text;
  }
  return replaceRegexOnce(text, current, '$1=t($2,({get:e})=>{let t=e($3)??s;return t===`recent`?s:t})', context, 'sidebar organize mode current');
}

function patchSidebarProjectGroupSignals(text, context) {
  if (text.includes('codexLocalGroupsSidebarProjectStatusPatchVersion=1')) {
    return text;
  }
  const match = text.match(STALE_PROJECT_STATUS);
  if (!match) {
    context.errors.push('sidebar project group status: 找不到 loading 状态判定插入点');
    return text;
  }
  const [oldText, name, sideChat, response, systemError, resume, runtime] = match;
  const fixed = `function ${name}({hasInProgressSideChat:${sideChat},isResponseInProgress:${response},latestTurnHasSystemError:${systemError},resumeState:${resume},threadRuntimeStatus:${runtime}}){return ${sideChat}?\`loading\`:${runtime}?.type===\`systemError\`?\`error\`:${runtime}?.type===\`active\`?\`loading\`:${runtime}?.type===\`idle\`||${runtime}?.type===\`notLoaded\`?\`idle\`:${resume}===\`needs_resume\`?\`idle\`:${systemError}?\`error\`:${response}===!0?\`loading\`:\`idle\`}`;
  const next = `var codexLocalGroupsSidebarProjectStatusPatchVersion=1;${fixed}`;
  return replaceOnce(text, oldText, next, context, 'sidebar project group stale loading status');
}

function patchHeader(text, context, file) {
  const errorCount = context.errors.length;
  let next = addVscodeMessengerImport(text, context, file);
  if (context.errors.length > errorCount) return text;
  if (context.safeMode && context.codexMinor === 5810 && next.includes('codexLocalGroupsHeaderSafe265810PatchVersion=1')) {
    if (!safeHeader265810PostconditionsHold(next)) context.errors.push('header 26.5810: 补丁标记不完整');
    return patchOpenedConversationTitle265810(patchHeaderMetadataLiteral(next), context);
  }
  if (context.safeMode && context.codexMinor === 5810 && next.includes('function Sn(e){return e.kind===`remote`}')) {
    return patchSafeHeader265810(next, context, file);
  }
  if (context.safeMode && context.codexMinor === 5803 && next.includes('codexLocalGroupsHeaderSafe265803PatchVersion=1')) {
    if (!safeHeader265803PostconditionsHold(next)) context.errors.push('header 26.5803: 补丁标记不完整');
    return patchOpenedConversationTitle265803(patchHeaderMetadataLiteral(next), context);
  }
  if (context.safeMode && context.codexMinor === 5803 && next.includes('function Sn(e){return e.kind===`remote`}')) {
    return patchSafeHeader265803(next, context, file);
  }
  if (context.safeMode && context.codexMinor === 5730 && next.includes('codexLocalGroupsHeaderSafePatchVersion=16')) {
    if (!safeHeader265730PostconditionsHold(next)) context.errors.push('header 26.5730: 补丁标记不完整');
    return patchHeaderMetadataLiteral(next);
  }
  if (context.safeMode && context.codexMinor === 5730 && next.includes('function Sn(e){return e.kind===`remote`}')) {
    return patchSafeHeader265730(next, context, file);
  }
  if (context.safeMode && context.codexMinor === 727 && next.includes('codexLocalGroupsHeaderSafePatchVersion=15')) {
    if (!safeHeader26727PostconditionsHold(next)) context.errors.push('header 26.727: 补丁标记不完整');
    return patchHeaderMetadataLiteral(next);
  }
  if (context.safeMode && context.codexMinor === 727 && next.includes('function zn(e){return e.kind===`remote`}')) {
    return patchSafeHeader26727(next, context, file);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=14')) {
    if (!safeHeader26721PostconditionsHold(next)) context.errors.push('header 26.721 local title override: 补丁标记不完整');
    return patchHeaderMetadataLiteral(next);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=13')) {
    if (!safeHeader26721PostconditionsHold(next, 13)) {
      context.errors.push('header 26.721 local title refresh: 补丁标记不完整');
      return patchHeaderMetadataLiteral(next);
    }
    return finishSafeHeader26721(patchHeaderMetadataLiteral(next), context);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=12')) {
    if (!safeHeader26721PostconditionsHold(next, 12)) {
      context.errors.push('header 26.721 current project history: 补丁标记不完整');
      return patchHeaderMetadataLiteral(next);
    }
    return finishSafeHeader26721(patchHeaderMetadataLiteral(next), context);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=11')) {
    if (!safeHeader26721PostconditionsHold(next, 11)) {
      context.errors.push('header 26.721 project row limit: 补丁标记不完整');
      return patchHeaderMetadataLiteral(next);
    }
    return finishSafeHeader26721(patchHeaderGroupHelper(patchHeaderMetadataLiteral(next), context), context);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=10')) {
    if (!safeHeader26721PostconditionsHold(next, 10)) {
      context.errors.push('header 26.721 safe history, height and project row limit: 补丁标记不完整');
      return patchHeaderMetadataLiteral(next);
    }
    next = patchSafeHeader26721ThreadSummary(patchSafeHeader26721ProjectScope(patchHeaderMetadataLiteral(next), context, file), context);
    return finishSafeHeader26721(patchHeaderGroupHelper(next, context), context);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=9')) {
    if (!safeHeader26721PostconditionsHold(next, 9)) {
      context.errors.push('header 26.721 safe history, height and group row limit: 补丁标记不完整');
      return patchHeaderMetadataLiteral(next);
    }
    next = patchSafeHeader26721ThreadSummary(patchSafeHeader26721ProjectScope(patchHeaderMetadataLiteral(next), context, file), context);
    next = patchHeaderGroupHelper(next, context);
    return finishSafeHeader26721(next, context);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=8')) {
    if (!safeHeader26721PostconditionsHold(next, 8)) {
      context.errors.push('header 26.721 safe history and height: 补丁标记不完整');
      return patchHeaderMetadataLiteral(next);
    }
    next = patchSafeHeader26721ThreadSummary(patchSafeHeader26721ProjectScope(patchHeaderMetadataLiteral(next), context, file), context);
    next = patchSafeHeaderProjectRowsView(next, context);
    return finishSafeHeader26721(patchHeaderGroupHelper(next, context), context);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=7')) {
    return patchSafeHeader26721HistoryAndHeight(patchHeaderMetadataLiteral(next), context, file);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=6') && next.includes('function Bn(e){return e.kind===`remote`}')) {
    return patchSafeHeader26721HistoryAndHeight(patchHeaderMetadataLiteral(next), context, file);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=6')) {
    next = patchHeaderGroupHelper(patchHeaderMetadataLiteral(next), context);
    return patchSafeHeaderProjectRowsView(next, context);
  }
  if (context.safeMode && next.includes('codexLocalGroupsHeaderSafePatchVersion=5') && next.includes('function Bn(e){return e.kind===`remote`}')) {
    next = patchHeaderMetadataLiteral(next);
    return patchSafeHeader26721HistoryAndHeight(patchHeaderGroupHelper(next, context), context, file);
  }
  if (next.includes('defaultMessage:`Search recent chats`') && next.includes('function Bn(e){return e.kind===`remote`}')) {
    if (context.safeMode) {
      next = replaceOnce(next, 'F.map(e=>(0,Z.jsx)(Jn,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&b===e.conversation.id,onClose:i,onActiveArchiveStart:p},e.key))', 'codexRecentTaskProjectRows(F,b,i,Jn,p)', context, 'header 26.721 safe project rows');
      next = patchHeaderMetadataLiteral(next);
      return patchSafeHeader26721HistoryAndHeight(patchHeaderGroupHelper(next, context), context, file);
    }
    return patchHeader26721(next, context, file);
  }
  if (next.includes('defaultMessage:`Search recent chats`') && next.includes('function at(e){return e.kind===`remote`}')) {
    if (context.safeMode) {
      next = replaceOnce(next, 'ee.map(e=>(0,Q.jsx)(st,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&_===e.conversation.id,onClose:i,onActiveArchiveStart:u},e.key))', 'codexRecentTaskProjectRows(ee,_,i,st,u)', context, 'header 26.715 safe project rows');
      next = patchHeaderMetadataLiteral(next);
      return patchSafeHeaderProjectRowsView(patchHeaderGroupHelper(next, context), context);
    }
    return patchHeader26715(next, context, file);
  }
  next = patchHeaderBase(next, context, file);
  if (context.safeMode) {
    next = patchHeaderMetadataLiteral(next);
    return patchSafeHeaderProjectRowsView(patchHeaderGroupHelper(next, context), context);
  }
  next = patchHeaderRecentMenuRoot(next, context);
  next = patchHeaderMetadataLiteral(next);
  next = patchHeaderRowActions(next, context);
  next = patchHeaderRefreshHook(next, context);
  if (next.includes('codexLocalGroupsHeaderPatchVersion=39') && next.includes('action:`getMetadata`') && next.includes('dispatchHostMessage({type:`new-chat`})') && next.includes('metadata-actions-') && next.includes('r||s') && next.includes('t<1e12?t*1e3:t')) {
    return next;
  }
  return patchHeaderGroupHelper(next, context);
}

function patchSafeHeader26721HistoryAndHeight(text, context, file) {
  let next = patchSafeHeader26721ThreadSummary(patchSafeHeader26721ProjectScope(text, context, file), context);
  next = patchSafeHeader26721MenuLayout(next, context);
  next = patchSafeHeaderProjectRowsView(next, context);
  next = patchHeaderGroupHelper(next, context);
  return finishSafeHeader26721(next, context);
}

function patchSafeHeader26727(text, context, file) {
  let next = addExecutionTargetImport(text, context, file);
  const rows = 'te.map(e=>(0,Z.jsx)(qn,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&v===e.conversation.id,onClose:i,onActiveArchiveStart:f},e.key))';
  next = replaceOnce(next, rows, 'codexRecentTaskProjectRows(te,v,i,qn,f)', context, 'header 26.727 project rows');
  next = patchHeaderGroupHelper(patchHeaderMetadataLiteral(next), context);
  next = patchSafeHeader26727ProjectScope(next, context);
  next = patchSafeHeader26727ThreadSummary(next, context);
  next = patchSafeHeader26721MenuLayout(next, context);
  next = patchSafeHeaderProjectRowsView(next, context);
  return finishSafeHeader26727(next, context);
}

function patchSafeHeader265803(text, context, file) {
  let next = addExecutionTargetImport(text, context, file);
  const rows = 'N.map(e=>(0,Z.jsx)(An,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&_===e.conversation.id,onClose:a,onActiveArchiveStart:d},e.key))';
  next = replaceOnce(next, rows, 'codexRecentTaskProjectRows(N,_,a,An,d)', context, 'header 26.5803 project rows');
  next = patchHeaderGroupHelper(patchHeaderMetadataLiteral(next), context);
  next = patchSafeHeader265803ProjectScope(next, context);
  next = patchSafeHeader265803ThreadSummary(next, context);
  next = patchSafeHeader265803MenuLayout(next, context);
  next = patchSafeHeaderProjectRowsView(next, context);
  return finishSafeHeader265803(next, context);
}

function patchSafeHeader265803ProjectScope(text, context) {
  const parent = 'l=ie(),{authMethod:u}=te(),d=B(),f=se(Ln),p=se(Rn),{data:m}=r(),h=Ve(),';
  const scopedParent = 'l=ie(),codexRecentHistoryTarget=codexUseExecutionTarget(),codexRecentHistoryRoot=codexRecentHistoryTarget.activeWorkspaceRoot??null,codexRecentHistoryRootReady=!codexRecentHistoryTarget.isActiveWorkspaceRootLoading,{authMethod:u}=te(),d=B(),f=se(Ln),p=se(Rn),{data:m}=r(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady),h=Ve(),';
  let next = replaceOnce(text, parent, scopedParent, context, 'header 26.5803 project history source');
  const target = 'l=s===void 0||s,u=ie(),d=Se(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null,codexRecentTaskRootReady=!codexRecentTaskTarget.isActiveWorkspaceRootLoading,{authMethod:f}=te(),';
  next = replaceOnce(next, 'l=s===void 0||s,u=ie(),d=Se(),{authMethod:f}=te(),', target, context, 'header 26.5803 execution target');
  const rows = 'let C=codexRecentTaskRootReady?codexRecentConversationFilter(i.filter(S),codexRecentTaskCurrentRoot):[],T=codexRecentTaskRootReady?codexRecentTaskFilter(hn(r.data,i,x),codexRecentTaskCurrentRoot):[],';
  return replaceOnce(next, 'let C=i.filter(S),T=hn(r.data,i,x),', rows, context, 'header 26.5803 current project filter');
}

function patchSafeHeader265803ThreadSummary(text, context) {
  const original = '(0,Z.jsx)(Be,{conversationId:n.conversation.id,hostId:n.conversation.hostId,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  const patched = '(0,Z.jsx)(Be,{conversationId:n.conversation.id,hostId:n.conversation.hostId,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  return replaceOnce(text, original, patched, context, 'header 26.5803 project history row summary');
}

function patchSafeHeader265803MenuLayout(text, context) {
  const outer = 'className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  const fixedOuter = 'className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  let next = replaceOnce(text, outer, fixedOuter, context, 'header 26.5803 safe container height');
  next = replaceOnce(next, 'vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1', 'vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1', context, 'header 26.5803 safe scroll height');
  return replaceOnce(next, 'contentClassName:`!pb-0 mt-[9px]`,triggerButton:J', 'contentClassName:`!pb-0 mt-[9px]`,contentStyle:{height:`600px`,overflow:`hidden`},triggerButton:J', context, 'header 26.5803 safe menu height');
}

function patchSafeHeader265730(text, context, file) {
  let next = addExecutionTargetImport(text, context, file);
  const rows = 'P.map(e=>(0,Z.jsx)(An,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&v===e.conversation.id,onClose:a,onActiveArchiveStart:f},e.key))';
  next = replaceOnce(next, rows, 'codexRecentTaskProjectRows(P,v,a,An,f)', context, 'header 26.5730 project rows');
  next = patchHeaderGroupHelper(patchHeaderMetadataLiteral(next), context);
  next = patchSafeHeader265730ProjectScope(next, context);
  next = patchSafeHeader265730ThreadSummary(next, context);
  next = patchSafeHeader265730MenuLayout(next, context);
  next = patchSafeHeaderProjectRowsView(next, context);
  return finishSafeHeader265730(next, context);
}

function patchSafeHeader265730ProjectScope(text, context) {
  const parent = 'o=ie(),{authMethod:s}=b(),c=se(),l=le(Ln),u=le(Rn),{data:d}=p(),f=Be(),';
  const scopedParent = 'o=ie(),codexRecentHistoryTarget=codexUseExecutionTarget(),codexRecentHistoryRoot=codexRecentHistoryTarget.activeWorkspaceRoot??null,codexRecentHistoryRootReady=!codexRecentHistoryTarget.isActiveWorkspaceRootLoading,{authMethod:s}=b(),c=se(),l=le(Ln),u=le(Rn),{data:d}=p(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady),f=Be(),';
  let next = replaceOnce(text, parent, scopedParent, context, 'header 26.5730 project history source');
  const target = 'd=ie(),f=Re(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null,codexRecentTaskRootReady=!codexRecentTaskTarget.isActiveWorkspaceRootLoading,{authMethod:p}=b(),';
  next = replaceOnce(next, 'd=ie(),f=Re(),{authMethod:p}=b(),', target, context, 'header 26.5730 execution target');
  const rows = 'let T=codexRecentTaskRootReady?codexRecentConversationFilter(i.filter(w),codexRecentTaskCurrentRoot):[],E=codexRecentTaskRootReady?codexRecentTaskFilter(hn(r.data,i,C),codexRecentTaskCurrentRoot):[],';
  return replaceOnce(next, 'let T=i.filter(w),E=hn(r.data,i,C),', rows, context, 'header 26.5730 current project filter');
}

function patchSafeHeader265730ThreadSummary(text, context) {
  const original = '(0,Z.jsx)(Oe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  const patched = '(0,Z.jsx)(Oe,{conversationId:n.conversation.id,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  return replaceOnce(text, original, patched, context, 'header 26.5730 project history row summary');
}

function patchSafeHeader265730MenuLayout(text, context) {
  const outer = 'className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  const fixedOuter = 'className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  let next = replaceOnce(text, outer, fixedOuter, context, 'header 26.5730 safe container height');
  next = replaceOnce(next, 'vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1', 'vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1', context, 'header 26.5730 safe scroll height');
  next = replaceOnce(next, 'contentClassName:`!pb-0 mt-[9px]`,triggerButton:K', 'contentClassName:`!pb-0 mt-[9px]`,contentStyle:{height:`600px`,overflow:`hidden`},triggerButton:K', context, 'header 26.5730 safe menu height');
  return next.replace('codexLocalGroupsHeaderSafePatchVersion=6', 'codexLocalGroupsHeaderSafePatchVersion=8');
}

function patchSafeHeader26727ProjectScope(text, context) {
  const parent = 's=be(),{authMethod:c}=re(),u=fe(),d=oe(er),{data:f}=v(),p=wt(),';
  const scopedParent = 's=be(),{authMethod:c}=re(),u=fe(),d=oe(er),codexRecentHistoryTarget=codexUseExecutionTarget(),codexRecentHistoryRoot=codexRecentHistoryTarget.activeWorkspaceRoot??null,codexRecentHistoryRootReady=!codexRecentHistoryTarget.isActiveWorkspaceRootLoading,{data:f}=v(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady),p=wt(),';
  let next = replaceOnce(text, parent, scopedParent, context, 'header 26.727 project history source');
  const target = 'd=be(),f=gt(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null,codexRecentTaskRootReady=!codexRecentTaskTarget.isActiveWorkspaceRootLoading,{authMethod:p}=re(),';
  next = replaceOnce(next, 'd=be(),f=gt(),{authMethod:p}=re(),', target, context, 'header 26.727 execution target');
  const rows = 'let T=codexRecentTaskRootReady?codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot):[],E=codexRecentTaskRootReady?codexRecentTaskFilter(Mn(n.data,r,S),codexRecentTaskCurrentRoot):[],';
  return replaceOnce(next, 'let T=r.filter(w),E=Mn(n.data,r,S),', rows, context, 'header 26.727 current project filter');
}

function patchSafeHeader26727ThreadSummary(text, context) {
  const original = '(0,Z.jsx)(nt,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  const patched = '(0,Z.jsx)(nt,{conversationId:n.conversation.id,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  return replaceOnce(text, original, patched, context, 'header 26.727 project history row summary');
}

function patchSafeHeaderProjectRowsView(text, context) {
  const rows = [
    ['codexRecentTaskProjectRows(F,b,i,Jn,p)', '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:b,onClose:i,row:Jn,onActiveArchiveStart:p})'],
    ['codexRecentTaskProjectRows(ee,_,i,st,u)', '(0,Q.jsx)(codexLocalGroupsProjectRowsView,{items:ee,activeId:_,onClose:i,row:st,onActiveArchiveStart:u})'],
    ['codexRecentTaskProjectRows(F,y,i,ot)', '(0,Q.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:y,onClose:i,row:ot})'],
    ['codexRecentTaskProjectRows(I,_,i,st)', '(0,Q.jsx)(codexLocalGroupsProjectRowsView,{items:I,activeId:_,onClose:i,row:st})'],
    ['codexRecentTaskProjectRows(R,g,i,ot)', '(0,Q.jsx)(codexLocalGroupsProjectRowsView,{items:R,activeId:g,onClose:i,row:ot})'],
    ['codexRecentTaskProjectRows(F,p,a,Je)', '(0,Q.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:p,onClose:a,row:Je})'],
    ['codexRecentTaskProjectRows(te,v,i,qn,f)', '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:te,activeId:v,onClose:i,row:qn,onActiveArchiveStart:f})'],
    ['codexRecentTaskProjectRows(P,v,a,An,f)', '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:P,activeId:v,onClose:a,row:An,onActiveArchiveStart:f})'],
    ['codexRecentTaskProjectRows(N,_,a,An,d)', '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:N,activeId:_,onClose:a,row:An,onActiveArchiveStart:d})'],
    ['codexRecentTaskProjectRows(F,y,i,An,u)', '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:y,onClose:i,row:An,onActiveArchiveStart:u})'],
  ];
  const row = rows.find(([direct]) => text.includes(direct));
  return row ? replaceOnce(text, row[0], row[1], context, 'header safe project rows view') : text;
}

function patchSafeHeader26721ProjectScope(text, context, file) {
  let next = addExecutionTargetImport(text, context, file);
  const parent = 'o=_e(),{authMethod:s}=m(),c=fe(),l=ye(tr),{data:d}=ee(),';
  const scopedParent = 'o=_e(),codexRecentHistoryTarget=codexUseExecutionTarget(),codexRecentHistoryRoot=codexRecentHistoryTarget.activeWorkspaceRoot??null,codexRecentHistoryRootReady=!codexRecentHistoryTarget.isActiveWorkspaceRootLoading,{authMethod:s}=m(),c=fe(),l=ye(tr),{data:d}=ee(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady),';
  next = replaceOnce(next, parent, scopedParent, context, 'header 26.721 project history source');
  const previousTarget = 'd=_e(),p=At(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,';
  const target = 'd=_e(),p=At(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null,codexRecentTaskRootReady=!codexRecentTaskTarget.isActiveWorkspaceRootLoading,';
  next = next.includes(previousTarget) ? next.replace(previousTarget, target) : replaceOnce(next, 'd=_e(),p=At(),', target, context, 'header 26.721 execution target');
  const scopedRows = 'let E=codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter(Nn(n.data,r,w),codexRecentTaskCurrentRoot),';
  const originalRows = next.includes(scopedRows) ? scopedRows : 'let E=r.filter(T),D=Nn(n.data,r,w),';
  const rows = 'let E=codexRecentTaskRootReady?codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot):[],D=codexRecentTaskRootReady?codexRecentTaskFilter(Nn(n.data,r,w),codexRecentTaskCurrentRoot):[],';
  return replaceOnce(next, originalRows, rows, context, 'header 26.721 current project filter');
}

function patchSafeHeader26721ThreadSummary(text, context) {
  const original = '(0,Z.jsx)(Fe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  const patched = '(0,Z.jsx)(Fe,{conversationId:n.conversation.id,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  return replaceOnce(text, original, patched, context, 'header 26.721 project history row summary');
}

function patchSafeHeader26721MenuLayout(text, context) {
  const original = 'className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  const v7 = 'className:`flex w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`,style:{maxHeight:`600px`}';
  const patched = 'className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  let next = replaceOnce(text, text.includes(v7) ? v7 : original, patched, context, 'header 26.721 safe container height');
  next = replaceOnce(next, 'vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1', 'vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1', context, 'header 26.721 safe scroll height');
  const trigger = context.codexMinor === 727 ? 'W' : 'ie';
  next = replaceOnce(next, `contentClassName:\`!pb-0 mt-[9px]\`,triggerButton:${trigger}`, `contentClassName:\`!pb-0 mt-[9px]\`,contentStyle:{height:\`600px\`,overflow:\`hidden\`},triggerButton:${trigger}`, context, 'header safe menu height');
  return next.replace(/codexLocalGroupsHeaderSafePatchVersion=[567]/, 'codexLocalGroupsHeaderSafePatchVersion=8');
}

function finishSafeHeader26721(text, context) {
  const row = '(l=(0,Z.jsx)(Fe,{conversationId:n.conversation.id,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.id,t[19]=a,t[20]=i,t[21]=e,t[22]=l):l=t[22],l';
  const current = 't[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e?';
  const fixed = 't[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e||t[23]!==n.conversation.title?';
  let next = text;
  if (!next.includes('codexLocalGroupsHeaderSafePatchVersion=13')) {
    next = replaceOnce(next, current + row, fixed + row.replace('t[21]=e,t[22]=l', 't[21]=e,t[23]=n.conversation.title,t[22]=l'), context, 'header 26.721 local title cache');
    next = replaceOnce(next, 'Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(23),', 'Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(24),', context, 'header 26.721 local row cache size');
    next = next.replace(/codexLocalGroupsHeaderSafePatchVersion=(?:6|11|12)/, 'codexLocalGroupsHeaderSafePatchVersion=13');
  }
  const cached = fixed + row.replace('t[21]=e,t[22]=l', 't[21]=e,t[23]=n.conversation.title,t[22]=l');
  const overridden = cached.replace('threadSummary:n.conversation,', 'threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,');
  next = replaceOnce(next, cached, overridden, context, 'header 26.721 local title override');
  next = next.replace('codexLocalGroupsHeaderSafePatchVersion=13', 'codexLocalGroupsHeaderSafePatchVersion=14');
  if (!safeHeader26721PostconditionsHold(next)) context.errors.push('header 26.721 safe history, height, group row limit and title override: 补丁后置条件不完整');
  return next;
}

function finishSafeHeader26727(text, context) {
  const current = 't[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e?';
  const row = '(l=(0,Z.jsx)(nt,{conversationId:n.conversation.id,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.id,t[19]=a,t[20]=i,t[21]=e,t[22]=l):l=t[22],l';
  const fixed = 't[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e||t[23]!==n.conversation.title?';
  const nextRow = row.replace('threadSummary:n.conversation,', 'threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,').replace('t[21]=e,t[22]=l', 't[21]=e,t[23]=n.conversation.title,t[22]=l');
  let next = replaceOnce(text, current + row, fixed + nextRow, context, 'header 26.727 local title row');
  next = replaceOnce(next, 'qn=(0,Wn.memo)(function(e){let t=(0,Un.c)(23),', 'qn=(0,Wn.memo)(function(e){let t=(0,Un.c)(24),', context, 'header 26.727 local row cache size');
  next = next.replace(/codexLocalGroupsHeaderSafePatchVersion=(?:6|8)/, 'codexLocalGroupsHeaderSafePatchVersion=15');
  if (!safeHeader26727PostconditionsHold(next)) context.errors.push('header 26.727: 补丁后置条件不完整');
  return next;
}

function finishSafeHeader265803(text, context) {
  const current = 't[17]!==r||t[18]!==n.conversation.hostId||t[19]!==n.conversation.id||t[20]!==a||t[21]!==i||t[22]!==e?';
  const row = '(c=(0,Z.jsx)(Be,{conversationId:n.conversation.id,hostId:n.conversation.hostId,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.hostId,t[19]=n.conversation.id,t[20]=a,t[21]=i,t[22]=e,t[23]=c):c=t[23],c';
  const fixed = 't[17]!==r||t[18]!==n.conversation.hostId||t[19]!==n.conversation.id||t[20]!==a||t[21]!==i||t[22]!==e||t[24]!==n.conversation.title?';
  const nextRow = row.replace('threadSummary:n.conversation,', 'threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,').replace('t[22]=e,t[23]=c', 't[22]=e,t[24]=n.conversation.title,t[23]=c');
  let next = replaceOnce(text, current + row, fixed + nextRow, context, 'header 26.5803 local title row');
  next = replaceOnce(next, 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(24),', 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),', context, 'header 26.5803 local row cache size');
  next = next.replace(/codexLocalGroupsHeaderSafePatchVersion=(?:6|8)/, 'codexLocalGroupsHeaderSafe265803PatchVersion=1');
  if (!safeHeader265803PostconditionsHold(next)) context.errors.push('header 26.5803: 补丁后置条件不完整');
  return patchOpenedConversationTitle265803(next, context);
}

function patchOpenedConversationTitle265803(text, context) {
  if (text.includes('codexLocalGroupsOpenedTitle265803PatchVersion=1')) {
    if (!openedConversationTitle265803PostconditionsHold(text)) context.errors.push('header 26.5803: 补丁标记不完整');
    return text;
  }
  const original = 'function Bn(e){let t=(0,Gn.c)(64),{allowInitialRouteBack:n,className:i,centerContent:a,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l}=e,u=';
  const refresh = 'let[,codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)(0);(0,In.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),s=o==null?s:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:o}})??s;';
  const patched = `var codexLocalGroupsOpenedTitle265803PatchVersion=1;${original.replace('=e,u=', '=e;')}${refresh}let u=`;
  const next = replaceOnce(text, original, patched, context, 'header 26.5803 opened conversation title');
  if (!openedConversationTitle265803PostconditionsHold(next)) context.errors.push('header 26.5803 opened conversation title: 补丁后置条件不完整');
  return next;
}

function openedConversationTitle265803PostconditionsHold(text) {
  const contract = /var codexLocalGroupsOpenedTitle265803PatchVersion=1;function Bn\(e\)\{let t=\(0,Gn\.c\)\(64\),\{allowInitialRouteBack:n,className:i,centerContent:a,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l\}=e;let\[,([A-Za-z_$][\w$]*)\]=\(0,In\.useState\)\(0\);\(0,In\.useEffect\)\(\(\)=>\{let e=\(\)=>\1\(e=>e\+1\);return window\.addEventListener\(`codex-local-groups-refresh`,e\),\(\)=>window\.removeEventListener\(`codex-local-groups-refresh`,e\)\},\[\]\),s=o==null\?s:codexLocalGroupsLocalTitle\(\{kind:`local`,conversation:\{id:o\}\}\)\?\?s;/;
  return countMatches(text, 'codexLocalGroupsOpenedTitle265803PatchVersion=1') === 1
    && contract.test(text);
}


function patchSafeHeader265810(text, context, file) {
  let next = addExecutionTargetImport(text, context, file);
  const rows = 'F.map(e=>(0,Z.jsx)(An,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&y===e.conversation.id,onClose:i,onActiveArchiveStart:u},e.key))';
  next = replaceOnce(next, rows, 'codexRecentTaskProjectRows(F,y,i,An,u)', context, 'header 26.5810 project rows');
  next = patchHeaderGroupHelper(patchHeaderMetadataLiteral(next), context);
  next = patchSafeHeader265810ProjectScope(next, context);
  next = patchSafeHeader265810ThreadSummary(next, context);
  next = patchSafeHeader265810MenuLayout(next, context);
  next = patchSafeHeaderProjectRowsView(next, context);
  return finishSafeHeader265810(next, context);
}

function patchSafeHeader265810ProjectScope(text, context) {
  const parent = 'c=g(),{authMethod:l}=m(),u=n(),d=E(Ln),f=E(Rn),{data:p}=j(),h=ke(),';
  const scopedParent = 'c=g(),codexRecentHistoryTarget=codexUseExecutionTarget(),codexRecentHistoryRoot=codexRecentHistoryTarget.activeWorkspaceRoot??null,codexRecentHistoryRootReady=!codexRecentHistoryTarget.isActiveWorkspaceRootLoading,{authMethod:l}=m(),u=n(),d=E(Ln),f=E(Rn),{data:p}=j(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady),h=ke(),';
  let next = replaceOnce(text, parent, scopedParent, context, 'header 26.5810 project history source');
  const target = 'c=o===void 0||o,l=g(),u=Ce(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null,codexRecentTaskRootReady=!codexRecentTaskTarget.isActiveWorkspaceRootLoading,{authMethod:d}=m(),';
  next = replaceOnce(next, 'c=o===void 0||o,l=g(),u=Ce(),{authMethod:d}=m(),', target, context, 'header 26.5810 execution target');
  const rows = 'let E=codexRecentTaskRootReady?codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot):[],D=codexRecentTaskRootReady?codexRecentTaskFilter(hn(n.data,r,w),codexRecentTaskCurrentRoot):[],';
  return replaceOnce(next, 'let E=r.filter(T),D=hn(n.data,r,w),', rows, context, 'header 26.5810 current project filter');
}

function patchSafeHeader265810ThreadSummary(text, context) {
  const original = '(0,Z.jsx)(pt,{conversationId:n.conversation.id,hostId:n.conversation.hostId,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  const patched = '(0,Z.jsx)(pt,{conversationId:n.conversation.id,hostId:n.conversation.hostId,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})';
  return replaceOnce(text, original, patched, context, 'header 26.5810 project history row summary');
}

function patchSafeHeader265810MenuLayout(text, context) {
  const outer = 'className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  const fixedOuter = 'className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  let next = replaceOnce(text, outer, fixedOuter, context, 'header 26.5810 safe container height');
  next = replaceOnce(next, 'vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1', 'vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1', context, 'header 26.5810 safe scroll height');
  return replaceOnce(next, 'contentClassName:`!pb-0 mt-[9px]`,triggerButton:oe', 'contentClassName:`!pb-0 mt-[9px]`,contentStyle:{height:`600px`,overflow:`hidden`},triggerButton:oe', context, 'header 26.5810 safe menu height');
}

function finishSafeHeader265810(text, context) {
  const current = 't[17]!==r||t[18]!==n.conversation.hostId||t[19]!==n.conversation.id||t[20]!==a||t[21]!==i||t[22]!==e?';
  const row = '(c=(0,Z.jsx)(pt,{conversationId:n.conversation.id,hostId:n.conversation.hostId,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.hostId,t[19]=n.conversation.id,t[20]=a,t[21]=i,t[22]=e,t[23]=c):c=t[23],c';
  const fixed = 't[17]!==r||t[18]!==n.conversation.hostId||t[19]!==n.conversation.id||t[20]!==a||t[21]!==i||t[22]!==e||t[24]!==n.conversation.title?';
  const nextRow = row.replace('threadSummary:n.conversation,', 'threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,').replace('t[22]=e,t[23]=c', 't[22]=e,t[24]=n.conversation.title,t[23]=c');
  let next = replaceOnce(text, current + row, fixed + nextRow, context, 'header 26.5810 local title row');
  next = replaceOnce(next, 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(24),', 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),', context, 'header 26.5810 local row cache size');
  next = next.replace(/codexLocalGroupsHeaderSafePatchVersion=(?:6|8)/, 'codexLocalGroupsHeaderSafe265810PatchVersion=1');
  if (!safeHeader265810PostconditionsHold(next)) context.errors.push('header 26.5810: 补丁后置条件不完整');
  return patchOpenedConversationTitle265810(next, context);
}

function patchOpenedConversationTitle265810(text, context) {
  if (text.includes('codexLocalGroupsOpenedTitle265810PatchVersion=1')) {
    if (!openedConversationTitle265810PostconditionsHold(text)) context.errors.push('header 26.5810: 补丁标记不完整');
    return text;
  }
  const original = 'function Bn(e){let t=(0,Gn.c)(64),{allowInitialRouteBack:r,className:i,centerContent:a,desktopDeepLinkConversationId:s,title:c,onBack:l,trailing:u}=e,d=';
  const refresh = 'let[,codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)(0);(0,In.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),c=s==null?c:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:s}})??c;';
  const patched = `var codexLocalGroupsOpenedTitle265810PatchVersion=1;${original.replace('=e,d=', '=e;')}${refresh}let d=`;
  const next = replaceOnce(text, original, patched, context, 'header 26.5810 opened conversation title');
  if (!openedConversationTitle265810PostconditionsHold(next)) context.errors.push('header 26.5810 opened conversation title: 补丁后置条件不完整');
  return next;
}

function openedConversationTitle265810PostconditionsHold(text) {
  const contract = /var codexLocalGroupsOpenedTitle265810PatchVersion=1;function Bn\(e\)\{let t=\(0,Gn\.c\)\(64\),\{allowInitialRouteBack:r,className:i,centerContent:a,desktopDeepLinkConversationId:s,title:c,onBack:l,trailing:u\}=e;let\[,([A-Za-z_$][\w$]*)\]=\(0,In\.useState\)\(0\);\(0,In\.useEffect\)\(\(\)=>\{let e=\(\)=>\1\(e=>e\+1\);return window\.addEventListener\(`codex-local-groups-refresh`,e\),\(\)=>window\.removeEventListener\(`codex-local-groups-refresh`,e\)\},\[\]\),c=s==null\?c:codexLocalGroupsLocalTitle\(\{kind:`local`,conversation:\{id:s\}\}\)\?\?c;/;
  return countMatches(text, 'codexLocalGroupsOpenedTitle265810PatchVersion=1') === 1
    && contract.test(text);
}

function safeHeader265810PostconditionsHold(text) {
  const view = 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Dn.useState)(0);return(0,Dn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}';
  return countMatches(text, 'codexLocalGroupsHeaderSafe265810PatchVersion=1') === 1
    && text.includes('{data:p}=j(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)')
    && text.includes('let E=codexRecentTaskRootReady?codexRecentConversationFilter')
    && text.includes('D=codexRecentTaskRootReady?codexRecentTaskFilter')
    && text.includes('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:y,onClose:i,row:An,onActiveArchiveStart:u})')
    && text.includes(view) && text.includes('An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),')
    && text.includes('hostId:n.conversation.hostId,threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)')
    && text.includes('t[24]!==n.conversation.title') && text.includes('t[24]=n.conversation.title')
    && text.includes('contentStyle:{height:`600px`,overflow:`hidden`}')
    && text.includes('vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1')
    && text.includes('function codexLocalGroupsGroupLimit') && text.includes('codex-local-groups-visible-counts-v1')
    && text.includes('codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))')
    && text.includes('className:`sticky top-0 z-10 bg-token-dropdown-background')
    && text.includes('function codexLocalGroupsScopeProjectRoot(e)')
    && !text.includes('codex-local-groups-current-root-v1') && !text.includes('project-more-');
}

function safeHeader265803PostconditionsHold(text) {
  const view = 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Dn.useState)(0);return(0,Dn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}';
  return countMatches(text, 'codexLocalGroupsHeaderSafe265803PatchVersion=1') === 1
    && text.includes('{data:m}=r(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)')
    && text.includes('let C=codexRecentTaskRootReady?codexRecentConversationFilter')
    && text.includes('T=codexRecentTaskRootReady?codexRecentTaskFilter')
    && text.includes('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:N,activeId:_,onClose:a,row:An,onActiveArchiveStart:d})')
    && text.includes(view) && text.includes('An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),')
    && text.includes('hostId:n.conversation.hostId,threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)')
    && text.includes('t[24]!==n.conversation.title') && text.includes('t[24]=n.conversation.title')
    && text.includes('contentStyle:{height:`600px`,overflow:`hidden`}')
    && text.includes('vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1')
    && text.includes('function codexLocalGroupsGroupLimit') && text.includes('codex-local-groups-visible-counts-v1')
    && text.includes('codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))')
    && text.includes('className:`sticky top-0 z-10 bg-token-dropdown-background')
    && text.includes('function codexLocalGroupsScopeProjectRoot(e)')
    && !text.includes('codex-local-groups-current-root-v1') && !text.includes('project-more-');
}

function finishSafeHeader265730(text, context) {
  const current = 't[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e?';
  const row = '(c=(0,Z.jsx)(Oe,{conversationId:n.conversation.id,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.id,t[19]=a,t[20]=i,t[21]=e,t[22]=c):c=t[22],c';
  const fixed = 't[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e||t[23]!==n.conversation.title?';
  const nextRow = row.replace('threadSummary:n.conversation,', 'threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,').replace('t[21]=e,t[22]=c', 't[21]=e,t[23]=n.conversation.title,t[22]=c');
  let next = replaceOnce(text, current + row, fixed + nextRow, context, 'header 26.5730 local title row');
  next = replaceOnce(next, 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(23),', 'An=(0,Dn.memo)(function(e){let t=(0,En.c)(24),', context, 'header 26.5730 local row cache size');
  next = next.replace(/codexLocalGroupsHeaderSafePatchVersion=(?:6|8)/, 'codexLocalGroupsHeaderSafePatchVersion=16');
  if (!safeHeader265730PostconditionsHold(next)) context.errors.push('header 26.5730: 补丁后置条件不完整');
  return next;
}

function safeHeader265730PostconditionsHold(text) {
  const view = 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Dn.useState)(0);return(0,Dn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}';
  return countMatches(text, 'codexLocalGroupsHeaderSafePatchVersion=16') === 1
    && text.includes('{data:d}=p(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)')
    && text.includes('let T=codexRecentTaskRootReady?codexRecentConversationFilter')
    && text.includes('E=codexRecentTaskRootReady?codexRecentTaskFilter')
    && text.includes('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:P,activeId:v,onClose:a,row:An,onActiveArchiveStart:f})')
    && text.includes(view) && text.includes('An=(0,Dn.memo)(function(e){let t=(0,En.c)(24),')
    && text.includes('threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)')
    && text.includes('t[23]!==n.conversation.title') && text.includes('t[23]=n.conversation.title')
    && text.includes('contentStyle:{height:`600px`,overflow:`hidden`}')
    && text.includes('vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1')
    && text.includes('function codexLocalGroupsGroupLimit') && text.includes('codex-local-groups-visible-counts-v1')
    && text.includes('codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))')
    && text.includes('className:`sticky top-0 z-10 bg-token-dropdown-background')
    && text.includes('function codexLocalGroupsScopeProjectRoot(e)')
    && !text.includes('codex-local-groups-current-root-v1') && !text.includes('project-more-');
}

function safeHeader26727PostconditionsHold(text) {
  const view = 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Wn.useState)(0);return(0,Wn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}';
  return countMatches(text, 'codexLocalGroupsHeaderSafePatchVersion=15') === 1
    && text.includes('{data:f}=v(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)')
    && text.includes('let T=codexRecentTaskRootReady?codexRecentConversationFilter')
    && text.includes('E=codexRecentTaskRootReady?codexRecentTaskFilter')
    && text.includes('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:te,activeId:v,onClose:i,row:qn,onActiveArchiveStart:f})')
    && text.includes(view) && text.includes('qn=(0,Wn.memo)(function(e){let t=(0,Un.c)(24),')
    && text.includes('threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)')
    && text.includes('t[23]!==n.conversation.title') && text.includes('t[23]=n.conversation.title')
    && text.includes('contentStyle:{height:`600px`,overflow:`hidden`}')
    && text.includes('vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1')
    && text.includes('function codexLocalGroupsGroupLimit') && text.includes('codex-local-groups-visible-counts-v1')
    && text.includes('codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))')
    && text.includes('className:`sticky top-0 z-10 bg-token-dropdown-background')
    && text.includes('function codexLocalGroupsScopeProjectRoot(e)')
    && !text.includes('codex-local-groups-current-root-v1') && !text.includes('project-more-');
}

function safeHeader26721PostconditionsHold(text, version = 14) {
  const outer = 'className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`';
  const scroll = 'vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1';
  const menu = 'contentClassName:`!pb-0 mt-[9px]`,contentStyle:{height:`600px`,overflow:`hidden`},triggerButton:ie';
  const limited = 'function codexLocalGroupsVisibleItems(e,t,n,r){if(codexLocalGroupsGroupShowAll(t,n))return e;let i=e.slice(0,5),a=e.find(e=>codexLocalGroupsItemIsActive(e,r));return a&&!i.includes(a)&&i.push(a),i}';
  const viewCall = '(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:b,onClose:i,row:Jn,onActiveArchiveStart:p})';
  const viewDefinition = 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Gn.useState)(0);return(0,Gn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}';
  const viewValid = version === 8
    ? countMatches(text, 'codexRecentTaskProjectRows(F,b,i,Jn,p)') === 1 && !text.includes('codexLocalGroupsProjectRowsView')
    : countMatches(text, viewCall) === 1 && countMatches(text, viewDefinition) === 1;
  const rowsValid = version === 8
    ? countMatches(text, 'function codexLocalGroupsVisibleItems(e,t,n,r){return e}') === 1 && !text.includes('group-more-')
    : version === 9
      ? countMatches(text, limited) === 1 && countMatches(text, 'group-more-') === 1 && text.includes('function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(n)return n;let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return codexRecentTaskNormalizePath(r)}') && text.includes('function codexLocalGroupsProjectKey(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return t||`${e.kind}:${codexLocalGroupsProjectLabel(e)}`}') && text.includes('function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow,codexLocalGroupsArchiveStart){let r=[],i=new Map;for(let a of e){let o=codexLocalGroupsProjectKey(a),s=codexLocalGroupsProjectLabel(a),d=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(a)),c=i.get(o);') && text.includes('function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}') && text.includes('function codexLocalGroupsGroupShowAll(e,t){let n=codexLocalGroupsReadJsonState(`codex-local-groups-expanded-all-v2`);return n[codexLocalGroupsGroupKey(e,t)]===!0}') && text.includes('function codexLocalGroupsSetGroupShowAll(e,t,n){let r=codexLocalGroupsReadJsonState(`codex-local-groups-expanded-all-v2`);r[codexLocalGroupsGroupKey(e,t)]=n,codexLocalGroupsWriteJsonState(`codex-local-groups-expanded-all-v2`,r)}') && text.includes('function codexLocalGroupsWriteJsonState(e,t){try{localStorage.setItem(e,JSON.stringify(t)),window.dispatchEvent(new Event(`codex-local-groups-refresh`))}catch{}}') && text.includes('s&&h?(0,Z.jsx)(`button`') && text.includes('onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetGroupShowAll(e.projectRoot,i.label,!d)}') && text.includes('收起到最近 5 条')
    : version >= 12
        ? countMatches(text, 'group-more-') === 1 && !text.includes('project-more-') && !text.includes('codex-local-groups-expanded-projects-v1') && text.includes('function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(n)return n;let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return codexRecentTaskNormalizePath(r)}') && text.includes('function codexLocalGroupsProjectKey(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return t||`${e.kind}:${codexLocalGroupsProjectLabel(e)}`}') && text.includes('function codexLocalGroupsItemIsActive(e,t){return e.kind===`local`&&e.conversation!=null&&t===e.conversation.id}') && text.includes('function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}') && text.includes('function codexLocalGroupsGroupLimit(e,t){let n=Number(codexLocalGroupsReadJsonState(`codex-local-groups-visible-counts-v1`)[codexLocalGroupsGroupKey(e,t)]);return Number.isFinite(n)&&n>=5?Math.floor(n):5}') && text.includes('function codexLocalGroupsSetGroupLimit(e,t,n){let r=codexLocalGroupsReadJsonState(`codex-local-groups-visible-counts-v1`);r[codexLocalGroupsGroupKey(e,t)]=Math.max(5,Math.floor(Number(n)||5)),codexLocalGroupsWriteJsonState(`codex-local-groups-visible-counts-v1`,r)}') && text.includes('function codexLocalGroupsVisibleItems(e,t,n,r){let i=e.slice(0,codexLocalGroupsGroupLimit(t,n)),a=e.find(e=>codexLocalGroupsItemIsActive(e,r));return a&&!i.includes(a)&&i.push(a),i}') && text.includes('function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow,codexLocalGroupsArchiveStart){let r=[],i=new Map;for(let a of e){let o=codexLocalGroupsProjectKey(a),s=codexLocalGroupsProjectLabel(a),d=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(a)),c=i.get(o);') && text.includes('c={label:s,projectRoot:d,groups:[],groupMap:new Map}') && text.includes('u.items.push(a)') && text.includes('let s=codexLocalGroupsGroupExpanded(e.projectRoot,i.label,i,t),d=codexLocalGroupsGroupLimit(e.projectRoot,i.label),u=s?codexLocalGroupsVisibleItems(i.items,e.projectRoot,i.label,t):[],c=Math.max(0,i.items.length-u.length),l=d>5,h=d>15;return[') && text.includes('s&&(h||l||c>0)?(0,Z.jsxs)(`div`') && text.includes('codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))') && text.includes('收起到最近 15 条') && text.includes('收起到最近 5 条') && text.includes('展开更多') && text.includes('className:`sticky top-0 z-10 bg-token-dropdown-background px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-semibold text-token-foreground`')
        : !text.includes('codexLocalGroupsVisibleItems') && !text.includes('group-more-') && !text.includes('codex-local-groups-expanded-all-v2') && countMatches(text, 'project-more-') === 1 && text.includes('function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(n)return n;let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return codexRecentTaskNormalizePath(r)}') && text.includes('function codexLocalGroupsProjectKey(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return t||`${e.kind}:${codexLocalGroupsProjectLabel(e)}`}') && text.includes('function codexLocalGroupsItemIsActive(e,t){return e.kind===`local`&&e.conversation!=null&&t===e.conversation.id}') && text.includes('function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}') && text.includes('c={key:o,label:s,projectRoot:d,items:[],groups:[],groupMap:new Map}') && text.includes('u.items.push(a),c.items.push(a)') && text.includes('for(let a of e){let o=codexLocalGroupsProjectKey(a)') && text.includes('let v=e.items,y=codexLocalGroupsProjectShowAll(e.key),b=y?v:v.slice(0,5),x=v.find(e=>codexLocalGroupsItemIsActive(e,t));x&&!b.includes(x)&&b.push(x);let w=new Set(b),E=v.length-b.length;') && text.includes('u=s?i.items.filter(e=>w.has(e)):[];if(!y&&u.length===0&&i.items.length>0)return[];') && text.includes('function codexLocalGroupsProjectShowAll(e){let t=codexLocalGroupsReadJsonState(`codex-local-groups-expanded-projects-v1`);return t[String(e)]===!0}') && text.includes('function codexLocalGroupsSetProjectShowAll(e,t){let n=codexLocalGroupsReadJsonState(`codex-local-groups-expanded-projects-v1`);n[String(e)]=t,codexLocalGroupsWriteJsonState(`codex-local-groups-expanded-projects-v1`,n)}') && text.includes('function codexLocalGroupsWriteJsonState(e,t){try{localStorage.setItem(e,JSON.stringify(t)),window.dispatchEvent(new Event(`codex-local-groups-refresh`))}catch{}}') && text.includes('E>0||y?(0,Z.jsx)(`button`') && text.includes('onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetProjectShowAll(e.key,!y)}') && text.includes('className:`sticky top-0 z-10 bg-token-dropdown-background px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-semibold text-token-foreground`') && text.includes('收起到最近 5 条');
  const currentProjectRows = 'let E=codexRecentTaskRootReady?codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot):[],D=codexRecentTaskRootReady?codexRecentTaskFilter(Nn(n.data,r,w),codexRecentTaskCurrentRoot):[],';
  const currentProjectFilter = 'function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsSetCurrentProjectRoot(n);if(!n)return[];return e.filter(e=>{let t=codexRecentTaskNormalizePath(codexLocalGroupsScopeProjectRoot(e));return t===n||t.startsWith(n+`/`)})}';
  const currentConversationFilter = 'function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsSetCurrentProjectRoot(n);if(!n)return[];return e.filter(e=>{if(!e)return!1;let t=codexRecentTaskNormalizePath(e.cwd);return t===n||t.startsWith(n+`/`)})}';
  const historyValid = version >= 11
    ? countMatches(text, currentProjectRows) === 1 && countMatches(text, currentProjectFilter) === 1 && countMatches(text, currentConversationFilter) === 1 && text.includes('{data:d}=ee(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)') && text.includes('codexRecentTaskRootReady=!codexRecentTaskTarget.isActiveWorkspaceRootLoading') && text.includes('function codexLocalGroupsSetCurrentProjectRoot(e){codexLocalGroupsCurrentProjectRoot=codexRecentTaskNormalizePath(e)}') && text.includes('function codexLocalGroupsScopeProjectRoot(e)') && text.includes('threadSummary:n.conversation') && !text.includes('codex-local-groups-current-root-v1')
    : countMatches(text, 'let E=r.filter(T),D=Nn(n.data,r,w),') === 1 && countMatches(text, 'function codexRecentTaskFilter(e,t){return e}') === 1 && countMatches(text, 'function codexRecentConversationFilter(e,t){return e}') === 1 && !text.includes('codexRecentTaskCurrentRoot') && !text.includes('codexUseExecutionTarget');
  const titleV13 = text.includes('Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(24),') && text.includes('t[23]!==n.conversation.title') && text.includes('t[23]=n.conversation.title');
  const titleV14 = text.includes('Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(24),') && text.includes('titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0') && text.includes('t[23]!==n.conversation.title') && text.includes('t[23]=n.conversation.title');
  const titleValid = version < 13 ? true : version === 13 ? titleV13 : titleV14;
  return countMatches(text, `codexLocalGroupsHeaderSafePatchVersion=${version}`) === 1
    && countMatches(text, outer) === 1
    && countMatches(text, scroll) === 1
    && countMatches(text, menu) === 1
    && historyValid
    && titleValid
    && viewValid
    && rowsValid
    && !text.includes('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`')
    && !text.includes('style:{maxHeight:`600px`}')
    && !text.includes('vertical-scroll-fade-mask flex max-h-[60vh]');
}

function patchHeader26715(text, context, file) {
  let next = addExecutionTargetImport(text, context, file);
  if (next.includes('codexLocalGroupsHeaderPatchVersion=39')) {
    return patchHeaderMetadataLiteral(upgradeHeaderHelperRuntime(next));
  }
  next = patchHeader26715RecentMenu(next, context);
  next = patchHeader26715Dates(next);
  next = patchHeaderMetadataLiteral(next);
  return patchHeaderGroupHelper(next, context);
}

function patchHeader26715RecentMenu(text, context) {
  let next = replaceOnce(text, 'function it(e){let t=(0,Z.c)(34),', 'function it(e){let t=(0,Z.c)(35),', context, 'header 26.715 cache slots');
  next = replaceOnce(next, 'l=x(),u=he(),', 'l=x(),u=he(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,', context, 'header 26.715 execution target');
  next = replaceOnce(next, 'let D=r.filter(T),O=et(n.data,r,w),', 'let D=codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot),O=codexRecentTaskFilter(et(n.data,r,w),codexRecentTaskCurrentRoot),', context, 'header 26.715 project filter');
  next = replaceOnce(next, '[k,M]=(0,$.useState)(``),N=(0,$.useDeferredValue)(k).trim().toLowerCase()', '[k,M]=(0,$.useState)(``),[codexLocalGroupsRefresh,codexLocalGroupsSetRefresh]=(0,$.useState)(0),codexLocalGroupsRefreshEffect=(0,$.useEffect)(()=>{let e=()=>codexLocalGroupsSetRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),N=(0,$.useDeferredValue)(k).trim().toLowerCase()', context, 'header 26.715 metadata refresh state');
  next = replaceOnce(next, 't[15]!==_||t[16]!==n||t[17]!==ee||t[18]!==P||t[19]!==O.length||t[20]!==i||t[21]!==g||t[22]!==u?', 't[15]!==_||t[16]!==n||t[17]!==ee||t[18]!==P||t[19]!==O.length||t[20]!==i||t[21]!==g||t[22]!==u||t[34]!==codexLocalGroupsRefresh?', context, 'header 26.715 metadata refresh dependency');
  next = replaceOnce(next, 't[20]=i,t[21]=g,t[22]=u,t[23]=U)', 't[20]=i,t[21]=g,t[22]=u,t[34]=codexLocalGroupsRefresh,t[23]=U)', context, 'header 26.715 metadata refresh cache');
  next = next.replace('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[480px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  return replaceOnce(next, 'ee.map(e=>(0,Q.jsx)(st,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&_===e.conversation.id,onClose:i,onActiveArchiveStart:u},e.key))', 'codexRecentTaskProjectRows(ee,_,i,st,u)', context, 'header 26.715 project rows');
}

function patchHeader26715Dates(text) {
  let next = text.replace('s=r==null?void 0:(0,Q.jsx)(_e,{dateString:new Date(r).toISOString()})', 's=r==null?void 0:codexRecentTaskDateLabel(new Date(r))');
  next = next.replace('case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(Se,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}', 'case`remote`:return(0,Q.jsx)(Se,{task:n.task,onClose:i,metaContent:n.at?codexRecentTaskDateLabel(new Date(n.at)):void 0});');
  return next.replace('e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:(0,Q.jsx)(_e,{dateString:new Date(n.conversation.recencyAt??n.conversation.updatedAt).toISOString()})', 'e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.recencyAt??n.conversation.updatedAt))');
}

function patchHeader26721(text, context, file) {
  let next = addExecutionTargetImport(text, context, file);
  if (next.includes('codexLocalGroupsHeaderPatchVersion=39')) {
    return patchHeaderMetadataLiteral(upgradeHeaderHelperRuntime(next));
  }
  next = replaceOnce(next, 'function zn(e){let t=(0,Wn.c)(34),', 'function zn(e){let t=(0,Wn.c)(35),', context, 'header 26.721 cache slots');
  next = replaceOnce(next, 'd=_e(),p=At(),', 'd=_e(),p=At(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,', context, 'header 26.721 execution target');
  next = replaceOnce(next, 'let E=r.filter(T),D=Nn(n.data,r,w),', 'let E=codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter(Nn(n.data,r,w),codexRecentTaskCurrentRoot),', context, 'header 26.721 project filter');
  next = replaceOnce(next, '[O,k]=(0,Gn.useState)(``),A=(0,Gn.useDeferredValue)(O).trim().toLowerCase()', '[O,k]=(0,Gn.useState)(``),[codexLocalGroupsRefresh,codexLocalGroupsSetRefresh]=(0,Gn.useState)(0),codexLocalGroupsRefreshEffect=(0,Gn.useEffect)(()=>{let e=()=>codexLocalGroupsSetRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),A=(0,Gn.useDeferredValue)(O).trim().toLowerCase()', context, 'header 26.721 metadata refresh state');
  next = replaceOnce(next, 't[15]!==b||t[16]!==n||t[17]!==F||t[18]!==j||t[19]!==D.length||t[20]!==i||t[21]!==y||t[22]!==p?', 't[15]!==b||t[16]!==n||t[17]!==F||t[18]!==j||t[19]!==D.length||t[20]!==i||t[21]!==y||t[22]!==p||t[34]!==codexLocalGroupsRefresh?', context, 'header 26.721 metadata refresh dependency');
  next = replaceOnce(next, 't[20]=i,t[21]=y,t[22]=p,t[23]=B)', 't[20]=i,t[21]=y,t[22]=p,t[34]=codexLocalGroupsRefresh,t[23]=B)', context, 'header 26.721 metadata refresh cache');
  next = next.replace('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[480px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  next = replaceOnce(next, 'F.map(e=>(0,Z.jsx)(Jn,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&b===e.conversation.id,onClose:i,onActiveArchiveStart:p},e.key))', 'codexRecentTaskProjectRows(F,b,i,Jn,p)', context, 'header 26.721 project rows');
  next = next.replace('s=r==null?void 0:(0,Z.jsx)(c,{dateString:new Date(r).toISOString()})', 's=r==null?void 0:codexRecentTaskDateLabel(new Date(r))');
  next = patchHeaderMetadataLiteral(next);
  return patchHeaderGroupHelper(next, context);
}

function patchCodexUiFeatureGate(text, context) {
  const gate = '1221508807';
  const gateCount = text.split(gate).length - 1;
  const hasPowerAnchors = text.includes('function KNt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={})');
  if (text.includes('codexLocalGroupsCodexUiFeatureGatePatchVersion=2')) {
    if (!hasCodexUiFeaturePostconditions(text, true)) context.errors.push('Codex UI feature gate: 补丁标记不完整');
    return text;
  }
  if (text.includes('codexLocalGroupsCodexUiFeatureGatePatchVersion=1')) {
    if (!hasCodexUiFeaturePostconditions(text, false)) { context.errors.push('Codex UI feature gate: v1 补丁标记不完整'); return text; }
    let next = patchCodexReasoningState(text, context);
    return replaceOnce(next, 'codexLocalGroupsCodexUiFeatureGatePatchVersion=1', 'codexLocalGroupsCodexUiFeatureGatePatchVersion=2', context, 'Codex UI marker v2');
  }
  const expectedGateCount = hasPowerAnchors ? 8 : 3;
  if (gateCount !== expectedGateCount) {
    context.errors.push(`Codex UI feature gate: 期望 ${expectedGateCount} 处开关，实际 ${gateCount} 处`);
    return text;
  }
  let next = replaceOnce(text, 'function bR(){return Bm(`1221508807`)}', 'var codexLocalGroupsCodexUiFeatureGatePatchVersion=2;function bR(){return!0}', context, 'Codex UI feature gate');
  next = replaceOnce(next, 'let h=t(mp,`1221508807`),g=m.getHostId();', 'let h=!0,g=m.getHostId();', context, 'subagent discovery feature gate');
  next = replaceOnce(next, 'let r=t(mp,`1221508807`);r&&t(Dkt,n.getHostId());', 'let r=!0;r&&t(Dkt,n.getHostId());', context, 'subagent topology feature gate');
  next = patchCodexReasoningState(next, context);
  if (next.split(gate).length - 1 !== expectedGateCount - 3) context.errors.push('Codex UI feature gate: 替换后仍有未知开关');
  return next;
}

function hasCodexUiFeaturePostconditions(text, includePersistence) {
  const hasPowerAnchors = text.includes('function KNt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={})');
  const residualGateCount = hasPowerAnchors && !text.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=') ? 5 : 0;
  const core = text.includes('function bR(){return!0}') && text.includes('let h=!0,g=m.getHostId();') && text.includes('let r=!0;r&&t(Dkt,n.getHostId());') && text.split('1221508807').length - 1 === residualGateCount;
  const state = text.includes('a[0]==="default"&&i===`ultra`&&t!==`gpt-5.6-sol`') && text.includes('w=C===`gpt-5.6-sol`?m?.model_reasoning_effort??null:') && text.includes('r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)');
  return core && (!includePersistence || state);
}

function patchCodexReasoningState(text, context) {
  const original = 'if(a[0]==="default"&&i===`ultra`){let e=r.getQueryData(lT(o,p))?.model_reasoning_effort??null;s=e===`ultra`?null:e}';
  const patched = 'if(a[0]==="default"&&i===`ultra`&&t!==`gpt-5.6-sol`){let e=r.getQueryData(lT(o,p))?.model_reasoning_effort??null;s=e===`ultra`?null:e}';
  let next = replaceOnce(text, original, patched, context, '5.6 Sol Ultra write');
  next = replaceOnce(next, 'C=m?.model??null,w=m?.model_reasoning_effort===`ultra`?null:m?.model_reasoning_effort??null,T;', 'C=m?.model??null,w=C===`gpt-5.6-sol`?m?.model_reasoning_effort??null:m?.model_reasoning_effort===`ultra`?null:m?.model_reasoning_effort??null,T;', context, '5.6 Sol Ultra read');
  return replaceOnce(next, 'a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort', 'a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort', context, '5.6 Sol Max Ultra validation');
}

function patchCodexPowerAndSubagents(text, context) {
  const gate = '1221508807';
  const gateCount = text.split(gate).length - 1;
  if (text.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=2')) {
    if (!hasCodexPowerPostconditions(text, true)) context.errors.push('Codex power/subagent: 补丁标记不完整');
    return text;
  }
  if (text.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=1')) {
    if (!hasCodexPowerPostconditions(text, false)) { context.errors.push('Codex power/subagent: v1 补丁标记不完整'); return text; }
    let next = patchCodexReasoningMenu(text, context);
    return replaceOnce(next, 'codexLocalGroupsPowerAndSubagentsPatchVersion=1', 'codexLocalGroupsPowerAndSubagentsPatchVersion=2', context, 'power marker v2');
  }
  if (gateCount !== 5) { context.errors.push(`Codex power/subagent: 期望 5 处开关，实际 ${gateCount} 处`); return text; }
  let next = replaceOnce(text, 'function KNt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={})', 'var codexLocalGroupsPowerAndSubagentsPatchVersion=2;function KNt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={})', context, 'power picker marker');
  next = replaceOnce(next, '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],QNt=', '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`},{id:`gpt-5.6-sol:max`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`max`}],QNt=', context, '5.6 Sol Max option');
  next = replaceOnce(next, 'function XNt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', 'function XNt(e,t){return e.flatMap((e,n)=>e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)||t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', context, '5.6 Sol power support');
  next = replaceOnce(next, 'XNt((t?[...XW,QNt]:XW).filter', 'XNt([...XW,QNt].filter', context, '5.6 Sol Ultra option');
  const scopeGate = 'this.scope!=null&&Wc(this.scope,`1221508807`)&&', scopeGateCount = next.split(scopeGate).length - 1;
  if (scopeGateCount !== 2) {
    context.errors.push(`subagent scope feature gate: 期望 2 处匹配，实际 ${scopeGateCount} 处`);
    return text;
  }
  next = next.split(scopeGate).join('this.scope!=null&&');
  next = replaceOnce(next, 'if(!t(zc,`1221508807`))return $Ze;', '', context, 'subagent list feature gate');
  next = replaceOnce(next, 'isBackgroundSubagentsEnabled:Wc(e,`1221508807`)', 'isBackgroundSubagentsEnabled:!0', context, 'background subagent feature gate');
  next = replaceOnce(next, 'u=rs(zc,`1221508807`),d;', 'u=!0,d;', context, 'subagent panel feature gate');
  next = patchCodexReasoningMenu(next, context);
  if (next.includes(gate)) context.errors.push('Codex power/subagent: 替换后仍有未知开关');
  return next;
}

function hasCodexPowerPostconditions(text, includeReasoningMenu) {
  const core = text.includes('gpt-5.6-sol:max') && text.includes('gpt-5.6-sol:ultra') && text.includes('e.reasoningEffort===`max`||e.reasoningEffort===`ultra`') && text.includes('XNt([...XW,QNt].filter') && text.includes('this.scope!=null&&rke(') && text.includes('this.scope!=null&&ike(') && text.includes('=>{t(gKe);let n=t(jS,e);') && text.includes('isBackgroundSubagentsEnabled:!0') && text.includes('u=!0,d;') && !text.includes('1221508807');
  return core && (!includeReasoningMenu || text.includes('t===`gpt-5.6-sol`&&(') && text.includes('r.some(e=>e.reasoningEffort===`max`)') && text.includes('r.some(e=>e.reasoningEffort===`ultra`)'));
}

function patchCodexReasoningMenu(text, context) {
  const original = 'function XZ(e,t){let n=e?.find(e=>e.model===t);return n==null?K6e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>vA(e.reasoningEffort))}';
  const patched = 'function XZ(e,t){let n=e?.find(e=>e.model===t),r=n==null?K6e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>vA(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
  return replaceOnce(text, original, patched, context, '5.6 Sol Reasoning menu');
}

function patchCodexUi26727(text, context) {
  const marker = 'codexLocalGroupsCodexUi26727PatchVersion=3';
  const original = 'a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort';
  const patched = 'a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort';
  if (text.includes(marker)) {
    if (!codexUi26727PostconditionsHold(text)) context.errors.push('Codex UI 26.727: 补丁标记不完整');
    return text;
  }
  let next = replaceOnce(text, original, patched, context, 'Codex UI 26.727 Sol Max Ultra validation');
  next = replaceOnce(next, 'function BVe({userSavedModelString:', `var ${marker};function BVe({userSavedModelString:`, context, 'Codex UI 26.727 marker');
  if (!codexUi26727PostconditionsHold(next)) context.errors.push('Codex UI 26.727: 补丁后置条件不完整');
  return next;
}

function codexUi26727PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsCodexUi26727PatchVersion=3') === 1
    && text.includes('i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)')
    && text.includes('isBackgroundSubagentsEnabled:o=!0')
    && text.includes('type:`subagent-activity`')
    && text.includes('w=m?.model_reasoning_effort??null')
    && text.includes('model_reasoning_effort:t')
    && !text.includes('1221508807');
}

function patchCodexPower26727(text, context) {
  const marker = 'codexLocalGroupsPower26727PatchVersion=3';
  if (text.includes(marker)) {
    if (!codexPower26727PostconditionsHold(text)) context.errors.push('Codex power 26.727: 补丁标记不完整');
    return text;
  }
  const xhigh = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],VUt=';
  const max = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`},{id:`gpt-5.6-sol:max`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`max`}],VUt=';
  let next = replaceOnce(text, xhigh, max, context, 'Codex power 26.727 Sol Max option');
  next = replaceOnce(next, 'function zUt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', 'function zUt(e,t){return e.flatMap((e,n)=>e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)||t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', context, 'Codex power 26.727 Sol support');
  next = replaceOnce(next, 'zUt((t?[...yG,VUt]:yG).filter', 'zUt([...yG,VUt].filter', context, 'Codex power 26.727 Sol Ultra option');
  next = patchCodexReasoningMenu26727(next, context);
  next = replaceOnce(next, 'function FUt(e,{includeUltraInSlider:', `var ${marker};function FUt(e,{includeUltraInSlider:`, context, 'Codex power 26.727 marker');
  if (!codexPower26727PostconditionsHold(next)) context.errors.push('Codex power 26.727: 补丁后置条件不完整');
  return next;
}

function patchCodexReasoningMenu26727(text, context) {
  const original = 'function MQ(e,t){let n=e?.find(e=>e.model===t);return n==null?Qnt.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>Uk(e.reasoningEffort))}';
  const patched = 'function MQ(e,t){let n=e?.find(e=>e.model===t),r=n==null?Qnt.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>Uk(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
  return replaceOnce(text, original, patched, context, 'Codex Reasoning menu 26.727');
}

function codexPower26727PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsPower26727PatchVersion=3') === 1
    && text.includes('gpt-5.6-sol:max') && text.includes('gpt-5.6-sol:ultra')
    && text.includes('e.reasoningEffort===`max`||e.reasoningEffort===`ultra`')
    && text.includes('zUt([...yG,VUt].filter')
    && text.includes('r.some(e=>e.reasoningEffort===`max`)')
    && text.includes('r.some(e=>e.reasoningEffort===`ultra`)')
    && text.includes('isBackgroundSubagentsEnabled:!0')
    && text.includes('subagentsPanel') && !text.includes('1221508807');
}

function patchCodexUi265803(text, context) {
  const marker = 'codexLocalGroupsCodexUi265803PatchVersion=1';
  const original = 'a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort';
  const patched = 'a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort';
  if (text.includes(marker)) {
    if (!codexUi265803PostconditionsHold(text)) context.errors.push('Codex UI 26.5803: 补丁标记不完整');
    return text;
  }
  let next = replaceOnce(text, original, patched, context, 'Codex UI 26.5803 Sol Max Ultra validation');
  next = replaceRegexOnce(next, /function [A-Za-z_$][\w$]*\(\{userSavedModelString:/, (match) => `var ${marker};${match}`, context, 'Codex UI 26.5803 marker');
  if (!codexUi265803PostconditionsHold(next)) context.errors.push('Codex UI 26.5803: 补丁后置条件不完整');
  return next;
}

function codexUi265803PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsCodexUi265803PatchVersion=1') === 1
    && text.includes('i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)')
    && text.includes('isBackgroundSubagentsEnabled:o=!0')
    && /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6000}?case`collabAgentToolCall`:\{if\(![A-Za-z_$][\w$]*\|\|\1\.tool===`wait`\)break;let ([A-Za-z_$][\w$]*)=\{type:`multi-agent-action`,id:\1\.id(?:,[^{}]{0,500})?\};[A-Za-z_$][\w$]*\.push\(\2\);break\}/.test(text)
    && /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6500}?case`subAgentActivity`:if\(![A-Za-z_$][\w$]*\)break;[A-Za-z_$][\w$]*\.push\(\{type:`subagent-activity`,id:\1\.id(?:,[^{}]{0,300})?\}\);break;?/.test(text)
    && /function Zmt\(e,t,[A-Za-z_$][\w$]*\)\{[\s\S]{0,1800}?e\.type===`subAgentActivity`[\s\S]{0,700}?parentConversationId:t[\s\S]{0,900}?e\.type!==`collabAgentToolCall`\|\|e\.tool!==`spawnAgent`[\s\S]{0,700}?parentConversationId:t/.test(text)
    && /function Xmt\(\{cachedConversations:e,conversationTurns:t,[^}]+\}\)\{[\s\S]{0,700}?=Zmt\(t,r,o\)\.map/.test(text)
    && /XV=(?:Fs|Ps)\([^,]+,\(e,\{get:t\}\)=>\{[\s\S]{0,1400}?return Xmt\(\{[\s\S]{0,500}?conversationTurns:[^,}]+,[\s\S]{0,300}?parentConversationId:e[\s\S]{0,500}?\}\)\.filter\(/.test(text)
    && /XV as sS(?:,|\})/.test(text)
    && text.includes('model_reasoning_effort??null')
    && text.includes('model_reasoning_effort:t')
    && !text.includes('1221508807');
}

function patchCodexPower265803(text, context) {
  const marker = 'codexLocalGroupsPower265803PatchVersion=1';
  if (text.includes(marker)) {
    if (!codexPower265803PostconditionsHold(text)) context.errors.push('Codex power 26.5803: 补丁标记不完整');
    return text;
  }
  const xhigh = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],BOt=';
  const max = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`},{id:`gpt-5.6-sol:max`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`max`}],BOt=';
  let next = replaceOnce(text, xhigh, max, context, 'Codex power 26.5803 Sol Max option');
  next = replaceOnce(next, 'function ROt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', 'function ROt(e,t){return e.flatMap((e,n)=>e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)||t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', context, 'Codex power 26.5803 Sol support');
  next = replaceOnce(next, 'ROt((t?[...JK,BOt]:JK).filter', 'ROt([...JK,BOt].filter', context, 'Codex power 26.5803 Sol Ultra option');
  next = patchCodexReasoningMenu265803(next, context);
  next = replaceOnce(next, 'function POt(e,{includeUltraInSlider:', `var ${marker};function POt(e,{includeUltraInSlider:`, context, 'Codex power 26.5803 marker');
  if (!codexPower265803PostconditionsHold(next)) context.errors.push('Codex power 26.5803: 补丁后置条件不完整');
  return next;
}

function patchCodexReasoningMenu265803(text, context) {
  const original = 'function zZ(e,t){let n=e?.find(e=>e.model===t);return n==null?YXe.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>gD(e.reasoningEffort))}';
  const patched = 'function zZ(e,t){let n=e?.find(e=>e.model===t),r=n==null?YXe.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>gD(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
  return replaceOnce(text, original, patched, context, 'Codex Reasoning menu 26.5803');
}

function codexPower265803PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsPower265803PatchVersion=1') === 1
    && text.includes('gpt-5.6-sol:max') && text.includes('gpt-5.6-sol:ultra')
    && text.includes('e.reasoningEffort===`max`||e.reasoningEffort===`ultra`')
    && text.includes('ROt([...JK,BOt].filter')
    && text.includes('r.some(e=>e.reasoningEffort===`max`)')
    && text.includes('r.some(e=>e.reasoningEffort===`ultra`)')
    && text.includes('isBackgroundSubagentsEnabled:!0')
    && /sS as Up(?:,|\})/.test(text)
    && /function Cen\(e\)\{[\s\S]{0,800}?=no\(Up,[^)]*\)[\s\S]{0,1200}?e=>e\.parentConversationId===n[\s\S]{0,500}?a\.filter\(e\)\.filter\(Een\)[\s\S]{0,500}?r\.filter\(wen\)[\s\S]{0,900}?visibleRows:/.test(text)
    && /function ([A-Za-z_$][\w$]*)\(e\)\{return e\.isCurrentParentTurn\}/.test(text)
    && /function ([A-Za-z_$][\w$]*)\(e\)\{return e\.canInteract&&e\.displayName\.trim\(\)\.length>0\}/.test(text)
    && /xn=\(Xe\.length>0\|\|Ft\)&&[^,;]+[\s\S]{0,40000}?subagentsPanel:xn/.test(text)
    && composerSubagentPanel265803PostconditionsHold(text)
    && !text.includes('1221508807');
}

function patchCodexUi265810(text, context) {
  const marker = 'codexLocalGroupsCodexUi265810PatchVersion=1';
  const original = 'a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort';
  const patched = 'a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort';
  if (text.includes(marker)) {
    if (!codexUi265810PostconditionsHold(text)) context.errors.push('Codex UI 26.5810: 补丁标记不完整');
    return text;
  }
  let next = replaceOnce(text, original, patched, context, 'Codex UI 26.5810 Sol Max Ultra validation');
  next = replaceRegexOnce(next, /function [A-Za-z_$][\w$]*\(\{userSavedModelString:/, (match) => `var ${marker};${match}`, context, 'Codex UI 26.5810 marker');
  if (!codexUi265810PostconditionsHold(next)) context.errors.push('Codex UI 26.5810: 补丁后置条件不完整');
  return next;
}

function xznSummary265810Holds(text) {
  const start = text.indexOf('function xzn(e){');
  if (start < 0) return false;
  const next = text.indexOf('function ', start + 1);
  const body = next < 0 ? text.slice(start) : text.slice(start, next);
  return body.includes('composer.backgroundSubagents.summary') && body.includes('{rows:n,agentCount:r');
}

function codexUi265810PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsCodexUi265810PatchVersion=1') === 1
    && text.includes('i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)')
    && /isBackgroundSubagentsEnabled:[A-Za-z_$][\w$]*=!0/.test(text)
    && /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6000}?case`collabAgentToolCall`:\{if\(![A-Za-z_$][\w$]*\|\|\1\.tool===`wait`\)break;let ([A-Za-z_$][\w$]*)=\{type:`multi-agent-action`,id:\1\.id(?:,[^{}]{0,500})?\};[A-Za-z_$][\w$]*\.push\(\2\);break\}/.test(text)
    && /switch\((?:[^{}]{0,240},)?([A-Za-z_$][\w$]*)\.type\)\{[\s\S]{0,6500}?case`subAgentActivity`:if\(![A-Za-z_$][\w$]*\)break;[A-Za-z_$][\w$]*\.push\(\{type:`subagent-activity`,id:\1\.id(?:,[^{}]{0,300})?\}\);break;?/.test(text)
    && /function dyn\(e,t,[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\)\{[\s\S]{0,1800}?e\.type===`subAgentActivity`[\s\S]{0,500}?parentConversationId:t[\s\S]{0,900}?e\.type!==`collabAgentToolCall`\|\|e\.tool!==`spawnAgent`[\s\S]{0,500}?parentConversationId:t/.test(text)
    && /function uyn\(\{cachedConversations:e,conversationTurns:t,[^}]+\}\)\{[\s\S]{0,900}?=dyn\(t,/.test(text)
    && /lJ=Dc\([^,]+,\(e,\{get:t\}\)=>\{[\s\S]{0,2400}?uyn\(\{[\s\S]{0,800}?conversationTurns:[^,}]+,[\s\S]{0,800}?parentConversationId:/.test(text)
    && /lJ as FT(?:,|\})/.test(text)
    && /function DOr\(e\)\{[\s\S]{0,900}?wc\(lJ,/.test(text)
    && /function DOr\(e\)\{[\s\S]{0,1600}?parentConversationId===n[\s\S]{0,400}?\.filter\(AOr\)[\s\S]{0,400}?\.filter\(OOr\)[\s\S]{0,900}?visibleRows:c/.test(text)
    && /function AOr\(e\)\{return e\.canInteract&&e\.displayName\.trim\(\)\.length>0\}/.test(text)
    && /function OOr\(e\)\{return e\.isCurrentParentTurn\}/.test(text)
    && /function aNr[\s\S]{0,20000}?DOr\(\{activeConversationId:/.test(text)
    && /function aNr[\s\S]{0,40000}?fn=\(Xe\.length>0\|\|kt\)/.test(text)
    && /function aNr[\s\S]{0,50000}?subagentsPanel:fn/.test(text)
    && /function aNr[\s\S]{0,80000}?fn\?\(0,J6\.jsx\)\(xzn,[\s\S]{0,400}?rows:Xe/.test(text)
    && xznSummary265810Holds(text)
    && text.includes('model_reasoning_effort??null')
    && text.includes('model_reasoning_effort:t')
    && !text.includes('1221508807');
}

function patchCodexPower265810(text, context) {
  const marker = 'codexLocalGroupsPower265810PatchVersion=1';
  if (text.includes(marker)) {
    if (!codexPower265810PostconditionsHold(text)) context.errors.push('Codex power 26.5810: 补丁标记不完整');
    return text;
  }
  const xhigh = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],Lon=';
  const max = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`},{id:`gpt-5.6-sol:max`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`max`}],Lon=';
  let next = replaceOnce(text, xhigh, max, context, 'Codex power 26.5810 Sol Max option');
  next = replaceOnce(next, 'function Pon(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', 'function Pon(e,t){return e.flatMap((e,n)=>e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)||t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', context, 'Codex power 26.5810 Sol support');
  next = replaceOnce(next, 'Pon((t?[...Ion,Lon]:Ion).filter', 'Pon([...Ion,Lon].filter', context, 'Codex power 26.5810 Sol Ultra option');
  next = patchCodexReasoningMenu265810(next, context);
  next = replaceOnce(next, 'function kon(e,{includeUltraInSlider:', `var ${marker};function kon(e,{includeUltraInSlider:`, context, 'Codex power 26.5810 marker');
  if (!codexPower265810PostconditionsHold(next)) context.errors.push('Codex power 26.5810: 补丁后置条件不完整');
  return next;
}

function patchCodexReasoningMenu265810(text, context) {
  const original = 'function u$(e,t){let n=e?.find(e=>e.model===t);return n==null?e4e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>wC(e.reasoningEffort))}';
  const patched = 'function u$(e,t){let n=e?.find(e=>e.model===t),r=n==null?e4e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>wC(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
  return replaceOnce(text, original, patched, context, 'Codex Reasoning menu 26.5810');
}

function codexPower265810PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsPower265810PatchVersion=1') === 1
    && text.includes('gpt-5.6-sol:max')
    && text.includes('gpt-5.6-sol:ultra')
    && countMatches(text, '{id:`gpt-5.6-sol:ultra`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`ultra`}') === 1
    && text.includes('e.reasoningEffort===`max`||e.reasoningEffort===`ultra`')
    && text.includes('Pon([...Ion,Lon].filter')
    && text.includes('r.some(e=>e.reasoningEffort===`max`)')
    && text.includes('r.some(e=>e.reasoningEffort===`ultra`)')
    && !text.includes('Pon((t?[...Ion,Lon]:Ion).filter');
}


function composerSubagentPanel265803PostconditionsHold(text) {
  const render = /xn\?(?:\(0,[A-Za-z_$][\w$]*\.jsx\)|jsx)\(_Rt,\{agentCount:Math\.max\(Xe\.length,Pt\)[\s\S]{0,500}?rows:Xe\}\):null/.test(text);
  if (!render) return false;
  const start = text.indexOf('function _Rt({rows:');
  if (start < 0) return false;
  const end = text.indexOf('function ', start + 10);
  const panel = text.slice(start, end < 0 ? text.length : end);
  return panel.includes('composer.backgroundSubagents.summary');
}

function patchCodexUi265730(text, context) {
  const marker = 'codexLocalGroupsCodexUi265730PatchVersion=1';
  const original = 'a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort';
  const patched = 'a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort';
  if (text.includes(marker)) {
    if (!codexUi265730PostconditionsHold(text)) context.errors.push('Codex UI 26.5730: 补丁标记不完整');
    return text;
  }
  let next = replaceOnce(text, original, patched, context, 'Codex UI 26.5730 Sol Max Ultra validation');
  next = replaceOnce(next, 'function IRe({userSavedModelString:', `var ${marker};function IRe({userSavedModelString:`, context, 'Codex UI 26.5730 marker');
  if (!codexUi265730PostconditionsHold(next)) context.errors.push('Codex UI 26.5730: 补丁后置条件不完整');
  return next;
}

function codexUi265730PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsCodexUi265730PatchVersion=1') === 1
    && text.includes('i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)')
    && text.includes('isBackgroundSubagentsEnabled:o=!0')
    && text.includes('type:`subagent-activity`')
    && text.includes('model_reasoning_effort??null')
    && text.includes('model_reasoning_effort:t')
    && !text.includes('1221508807');
}

function patchCodexPower265730(text, context) {
  const marker = 'codexLocalGroupsPower265730PatchVersion=1';
  if (text.includes(marker)) {
    if (!codexPower265730PostconditionsHold(text)) context.errors.push('Codex power 26.5730: 补丁标记不完整');
    return text;
  }
  const xhigh = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],bOt=';
  const max = '{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`},{id:`gpt-5.6-sol:max`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`max`}],bOt=';
  let next = replaceOnce(text, xhigh, max, context, 'Codex power 26.5730 Sol Max option');
  next = replaceOnce(next, 'function vOt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', 'function vOt(e,t){return e.flatMap((e,n)=>e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)||t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}', context, 'Codex power 26.5730 Sol support');
  next = replaceOnce(next, 'vOt((t?[...Dq,bOt]:Dq).filter', 'vOt([...Dq,bOt].filter', context, 'Codex power 26.5730 Sol Ultra option');
  next = patchCodexReasoningMenu265730(next, context);
  next = replaceOnce(next, 'function mOt(e,{includeUltraInSlider:', `var ${marker};function mOt(e,{includeUltraInSlider:`, context, 'Codex power 26.5730 marker');
  if (!codexPower265730PostconditionsHold(next)) context.errors.push('Codex power 26.5730: 补丁后置条件不完整');
  return next;
}

function patchCodexReasoningMenu265730(text, context) {
  const original = 'function cQ(e,t){let n=e?.find(e=>e.model===t);return n==null?pYe.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>JD(e.reasoningEffort))}';
  const patched = 'function cQ(e,t){let n=e?.find(e=>e.model===t),r=n==null?pYe.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>JD(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
  return replaceOnce(text, original, patched, context, 'Codex Reasoning menu 26.5730');
}

function codexPower265730PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsPower265730PatchVersion=1') === 1
    && text.includes('gpt-5.6-sol:max') && text.includes('gpt-5.6-sol:ultra')
    && text.includes('e.reasoningEffort===`max`||e.reasoningEffort===`ultra`')
    && text.includes('vOt([...Dq,bOt].filter')
    && text.includes('r.some(e=>e.reasoningEffort===`max`)')
    && text.includes('r.some(e=>e.reasoningEffort===`ultra`)')
    && text.includes('isBackgroundSubagentsEnabled:!0')
    && text.includes('subagentsPanel') && !text.includes('1221508807');
}

function patchHeaderRefreshHook(text, context) {
  let next = text.replace('function rt(e){let t=(0,Z.c)(33),', 'function rt(e){let t=(0,Z.c)(35),');
  next = next.replace('function it(e){let t=(0,Z.c)(33),', 'function it(e){let t=(0,Z.c)(35),');
  const stateAnchorV2 = '[te,k]=(0,$.useState)(``),j=(0,$.useDeferredValue)(te)';
  const stateAnchorV1 = '[w,T]=(0,$.useState)(``),D=(0,$.useDeferredValue)(w)';
  const stateAnchorV3 = '[A,j]=(0,$.useState)(``),N=(0,$.useDeferredValue)(A)';
  const stateAnchorV4 = '[O,j]=(0,$.useState)(``),M=(0,$.useDeferredValue)(O)';
  if (!next.includes('codexLocalGroupsRefresh')) {
    if (next.includes(stateAnchorV2)) {
      next = replaceOnce(next, stateAnchorV2, '[te,k]=(0,$.useState)(``),[codexLocalGroupsRefresh,codexLocalGroupsSetRefresh]=(0,$.useState)(0),codexLocalGroupsRefreshEffect=(0,$.useEffect)(()=>{let e=()=>codexLocalGroupsSetRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),j=(0,$.useDeferredValue)(te)', context, 'header metadata refresh state');
    } else if (next.includes(stateAnchorV1)) {
      next = replaceOnce(next, stateAnchorV1, '[w,T]=(0,$.useState)(``),[codexLocalGroupsRefresh,codexLocalGroupsSetRefresh]=(0,$.useState)(0),codexLocalGroupsRefreshEffect=(0,$.useEffect)(()=>{let e=()=>codexLocalGroupsSetRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),D=(0,$.useDeferredValue)(w)', context, 'header metadata refresh state legacy');
    } else if (next.includes(stateAnchorV3)) {
      next = replaceOnce(next, stateAnchorV3, '[A,j]=(0,$.useState)(``),[codexLocalGroupsRefresh,codexLocalGroupsSetRefresh]=(0,$.useState)(0),codexLocalGroupsRefreshEffect=(0,$.useEffect)(()=>{let e=()=>codexLocalGroupsSetRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),N=(0,$.useDeferredValue)(A)', context, 'header metadata refresh state latest');
    } else if (next.includes(stateAnchorV4)) {
      next = replaceOnce(next, stateAnchorV4, '[O,j]=(0,$.useState)(``),[codexLocalGroupsRefresh,codexLocalGroupsSetRefresh]=(0,$.useState)(0),codexLocalGroupsRefreshEffect=(0,$.useEffect)(()=>{let e=()=>codexLocalGroupsSetRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),M=(0,$.useDeferredValue)(O)', context, 'header metadata refresh state current');
    }
  }
  const depAnchorV2 = 't[15]!==y||t[16]!==n||t[17]!==F||t[18]!==M||t[19]!==D.length||t[20]!==i||t[21]!==g?';
  const depAnchorV1 = 't[13]!==p||t[14]!==r||t[15]!==u||t[16]!==F||t[17]!==O||t[18]!==C.length||t[19]!==a?';
  const depAnchorV3 = 't[15]!==_||t[16]!==n||t[17]!==I||t[18]!==P||t[19]!==O.length||t[20]!==i||t[21]!==h?';
  const depAnchorV4 = 't[15]!==g||t[16]!==n||t[17]!==R||t[18]!==N||t[19]!==D.length||t[20]!==i||t[21]!==h?';
  next = next.replace(/t\[31\]!==codexLocalGroupsRefresh/g, 't[33]!==codexLocalGroupsRefresh');
  next = next.replace(/t\[31\]=codexLocalGroupsRefresh/g, 't[33]=codexLocalGroupsRefresh');
  if (!next.includes('t[33]!==codexLocalGroupsRefresh')) {
    if (next.includes(depAnchorV2)) {
      next = replaceOnce(next, depAnchorV2, 't[15]!==y||t[16]!==n||t[17]!==F||t[18]!==M||t[19]!==D.length||t[20]!==i||t[21]!==g||t[33]!==codexLocalGroupsRefresh?', context, 'header metadata refresh dependency');
      next = replaceOnce(next, 't[19]=D.length,t[20]=i,t[21]=g,t[22]=V)', 't[19]=D.length,t[20]=i,t[21]=g,t[33]=codexLocalGroupsRefresh,t[22]=V)', context, 'header metadata refresh cache');
    } else if (next.includes(depAnchorV1)) {
      next = replaceOnce(next, depAnchorV1, 't[13]!==p||t[14]!==r||t[15]!==u||t[16]!==F||t[17]!==O||t[18]!==C.length||t[19]!==a||t[33]!==codexLocalGroupsRefresh?', context, 'header metadata refresh dependency legacy');
      next = replaceOnce(next, 't[18]=C.length,t[19]=a,t[20]=U)', 't[18]=C.length,t[19]=a,t[33]=codexLocalGroupsRefresh,t[20]=U)', context, 'header metadata refresh cache legacy');
    } else if (next.includes(depAnchorV3)) {
      next = replaceOnce(next, depAnchorV3, 't[15]!==_||t[16]!==n||t[17]!==I||t[18]!==P||t[19]!==O.length||t[20]!==i||t[21]!==h||t[33]!==codexLocalGroupsRefresh?', context, 'header metadata refresh dependency latest');
      next = replaceOnce(next, 't[20]=i,t[21]=h,t[22]=U)', 't[20]=i,t[21]=h,t[33]=codexLocalGroupsRefresh,t[22]=U)', context, 'header metadata refresh cache latest');
    } else if (next.includes(depAnchorV4)) {
      next = replaceOnce(next, depAnchorV4, 't[15]!==g||t[16]!==n||t[17]!==R||t[18]!==N||t[19]!==D.length||t[20]!==i||t[21]!==h||t[33]!==codexLocalGroupsRefresh?', context, 'header metadata refresh dependency current');
      next = replaceOnce(next, 't[19]=D.length,t[20]=i,t[21]=h,t[22]=U)', 't[19]=D.length,t[20]=i,t[21]=h,t[33]=codexLocalGroupsRefresh,t[22]=U)', context, 'header metadata refresh cache current');
    }
  }
  next = upgradeHeaderHelperRuntime(next);
  next = next.replace(/codexLocalGroupsHeaderPatchVersion=(?:1[789]|2[0-9]|3[0-8])/g, 'codexLocalGroupsHeaderPatchVersion=39');
  return next;
}

function patchHeaderRecentMenuRoot(text, context) {
  let next = text.replace('function rt(e){let t=(0,Z.c)(33),', 'function rt(e){let t=(0,Z.c)(35),');
  if (next.includes('codexRecentTaskMenuCurrentRoot')) {
    return next;
  }
  const menuRoot = 'let codexRecentTaskMenuTarget=codexUseExecutionTarget(),codexRecentTaskMenuCurrentRoot=codexRecentTaskMenuTarget.activeWorkspaceRoot??codexRecentTaskMenuTarget.cwd??null,';
  const currentV2 = 'let T=codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter($e(n.data,r,ee),codexRecentTaskCurrentRoot),';
  const fixedV2 = `${menuRoot}T=codexRecentConversationFilter(r.filter(w),codexRecentTaskMenuCurrentRoot),D=codexRecentTaskFilter($e(n.data,r,ee),codexRecentTaskMenuCurrentRoot),`;
  if (next.includes(currentV2)) {
    return replaceOnce(next, currentV2, fixedV2, context, 'header recent menu current root');
  }
  const currentV1 = 'let b=codexRecentConversationFilter(i.filter(y),codexRecentTaskCurrentRoot),C=codexRecentTaskFilter(Ve(r.data,i,_),codexRecentTaskCurrentRoot),';
  const fixedV1 = `${menuRoot}b=codexRecentConversationFilter(i.filter(y),codexRecentTaskMenuCurrentRoot),C=codexRecentTaskFilter(Ve(r.data,i,_),codexRecentTaskMenuCurrentRoot),`;
  if (next.includes(currentV1)) {
    return replaceOnce(next, currentV1, fixedV1, context, 'header recent menu current root legacy');
  }
  const currentV3 = 'let E=codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot),O=codexRecentTaskFilter(et(n.data,r,C),codexRecentTaskCurrentRoot),';
  const fixedV3 = `${menuRoot}E=codexRecentConversationFilter(r.filter(T),codexRecentTaskMenuCurrentRoot),O=codexRecentTaskFilter(et(n.data,r,C),codexRecentTaskMenuCurrentRoot),`;
  if (next.includes(currentV3)) {
    return replaceOnce(next, currentV3, fixedV3, context, 'header recent menu current root latest');
  }
  return next;
}

function upgradeHeaderHelperRuntime(text) {
  let next = patchHeaderPendingItems(fixInjectedWhitespaceRegex(text));
  next = next.replace('function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow){', 'function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow,codexLocalGroupsArchiveStart){');
  next = next.replace(/\(0,Q\.jsx\)\(codexLocalGroupsRow,\{item:o,isActive:([^,]+),onClose:n\},o\.key\)/g, '(0,Q.jsx)(codexLocalGroupsRow,{item:o,isActive:$1,onClose:n,onActiveArchiveStart:codexLocalGroupsArchiveStart},o.key)');
  next = next.replace('codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`newConversationInGroup`,projectRoot:e,group:t,startedAtMs:n.pendingGroup.startedAtMs})', 'codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`setPendingGroup`,projectRoot:e,group:t,startedAtMs:n.pendingGroup.startedAtMs}),codexLocalGroupsMessenger.dispatchHostMessage({type:`new-chat`})');
  const oldSync = 'try{window.__codexLocalGroupsHostListener||(window.__codexLocalGroupsHostListener=!0,window.addEventListener(`message`,e=>{let t=e.data;t?.type===`codex-local-groups`&&t.action===`metadataSaved`&&t.metadata&&typeof t.metadata===`object`&&codexLocalGroupsStoreMeta(t.metadata)}))}catch{}';
  if (!next.includes('action:`getMetadata`') && next.includes(oldSync)) {
    next = next.replace(oldSync, webviewMetadataSync('codexLocalGroupsMessenger'));
  }
  next = next.replace(/function codexLocalGroupsStoreMeta\(e\)\{try\{e\.updatedAtMs=Date\.now\(\),localStorage\.setItem\(`codex-local-groups-meta-v1`,JSON\.stringify\(e\)\)\}catch\{\}\}/g, 'function codexLocalGroupsStoreMeta(e){try{e.updatedAtMs=Date.now(),localStorage.setItem(`codex-local-groups-meta-v1`,JSON.stringify(e)),window.dispatchEvent(new Event(`codex-local-groups-refresh`))}catch{}}');
  const rootStoreAnchor = 'function codexLocalGroupsStoreMeta(e,t){try{e.updatedAtMs=Date.now(),localStorage.setItem(`codex-local-groups-meta-v1`,JSON.stringify(e)),t||window.dispatchEvent(new Event(`codex-local-groups-refresh`))}catch{}}function codexLocalGroupsProjectRoot';
  if (!next.includes('codexLocalGroupsStoreCurrentRoot') && next.includes(rootStoreAnchor)) {
    next = next.replace(rootStoreAnchor, 'function codexLocalGroupsStoreMeta(e,t){try{e.updatedAtMs=Date.now(),localStorage.setItem(`codex-local-groups-meta-v1`,JSON.stringify(e)),t||window.dispatchEvent(new Event(`codex-local-groups-refresh`))}catch{}}function codexLocalGroupsStoreCurrentRoot(e){try{e&&localStorage.setItem(`codex-local-groups-current-root-v1`,e)}catch{}}function codexLocalGroupsProjectRoot');
  }
  const oldProjectRoot = 'function codexLocalGroupsProjectRoot(e){return e.kind===`local`?e.conversation.cwd:e.kind===`pending-worktree`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:``}';
  const newProjectRoot = 'function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(n)return n;let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return codexRecentTaskNormalizePath(r)}function codexLocalGroupsProjectRoot(e){return e.kind===`local`?e.conversation?codexLocalGroupsConversationProjectRoot(e.conversation.id,e.conversation.cwd):e.pendingWorktree?.sourceWorkspaceRoot??e.pendingWorktree?.worktreeWorkspaceRoot??e.pendingWorktree?.worktreeGitRoot??``:e.kind===`pending-worktree`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:``}';
  if (!next.includes('function codexLocalGroupsConversationProjectRoot')) {
    next = next.replace(oldProjectRoot, newProjectRoot);
  }
  next = next.replace('function codexLocalGroupsProjectMatches(e,t){let n=codexRecentTaskNormalizePath(e),r=codexRecentTaskNormalizePath(t);return!!n&&!!r&&n===r}', 'function codexLocalGroupsProjectMatches(e,t){let n=codexRecentTaskNormalizePath(e),r=codexRecentTaskNormalizePath(t);return!!n&&!!r&&(n===r||n.startsWith(r+`/`)||r.startsWith(n+`/`))}');
  next = next.replace('function codexLocalGroupsItemCreatedAt(e){if(e.kind!==`local`)return 0;let t=Number(e.conversation.createdAt??0);return Number.isFinite(t)&&t>0?t:codexLocalGroupsUuidTime(e.conversation.id)}', 'function codexLocalGroupsItemCreatedAt(e){if(e.kind!==`local`)return 0;let t=Number(e.conversation?.createdAt??e.pendingWorktree?.createdAt??0);if(Number.isFinite(t)&&t>0)return t<1e12?t*1e3:t;return codexLocalGroupsUuidTime(e.conversation?.id??e.pendingWorktree?.clientThreadId??e.pendingWorktree?.id)}');
  if (!next.includes('function codexLocalGroupsArchivedGroupKey')) {
    next = next.replace('function codexLocalGroupsNormalizeGroupName(e){let t=String(e??``);try{t=t.normalize(`NFC`)}catch{}return t.replace(/[\\s\\u3000]+/g,` `).trim()}function codexLocalGroupsGroupLabel', 'function codexLocalGroupsNormalizeGroupName(e){let t=String(e??``);try{t=t.normalize(`NFC`)}catch{}return t.replace(/[\\s\\u3000]+/g,` `).trim()}function codexLocalGroupsArchivedGroupKey(e,t){return JSON.stringify([codexRecentTaskNormalizePath(e),codexLocalGroupsNormalizeGroupName(t)])}function codexLocalGroupsGroupArchived(e,t,n){return!!n.archivedGroups?.[codexLocalGroupsArchivedGroupKey(e,t)]}function codexLocalGroupsGroupLabel');
  }
  next = next.replace('if(i?.group)return codexLocalGroupsNormalizeGroupName(i.group)||`未分组`;', 'if(i?.group){let a=codexLocalGroupsNormalizeGroupName(i.group);if(a&&!codexLocalGroupsGroupArchived(r,a,t))return a}');
  next = next.replace('if(o&&codexLocalGroupsProjectMatches(r,a.projectRoot)&&codexLocalGroupsCanUsePendingGroup(e,a)){codexLocalGroupsSaveConversationGroup(n,o,r,t);return o}', 'let s=codexRecentTaskNormalizePath(a?.projectRoot);if(o&&!codexLocalGroupsGroupArchived(s,o,t)&&codexLocalGroupsCanUsePendingGroup(e,a)&&(codexLocalGroupsProjectMatches(r,s)||!r&&s)){codexLocalGroupsSaveConversationGroup(n,o,r||s,t);return o}');
  next = next.replace('if(o&&codexLocalGroupsCanUsePendingGroup(e,a)&&(codexLocalGroupsProjectMatches(r,s)||!r&&s)){codexLocalGroupsSaveConversationGroup(n,o,r||s,t);return o}', 'if(o&&!codexLocalGroupsGroupArchived(s,o,t)&&codexLocalGroupsCanUsePendingGroup(e,a)&&(codexLocalGroupsProjectMatches(r,s)||!r&&s)){codexLocalGroupsSaveConversationGroup(n,o,r||s,t);return o}');
  const metadataItems = 'function codexLocalGroupsMetadataItems(e){let t=codexLocalGroupsReadMeta().conversations??{},n=new Set(e.filter(e=>e?.kind===`local`).map(e=>String(e.conversation?.id??``))),r=e.slice();for(let[i,a]of Object.entries(t)){if(n.has(String(i))||codexLocalGroupsReadMeta().archivedConversations?.[String(i)])continue;let o=codexRecentTaskNormalizePath(a?.projectRoot);if(!o)continue;let s=typeof a.title===`string`&&a.title.trim()?a.title.trim():String(i),d=Number(a.updatedAtMs??0);r.push({kind:`local`,key:String(i),codexLocalGroupsMetadataOnly:!0,conversation:{id:String(i),title:s,cwd:o,createdAt:d,updatedAt:d}})}return r}';
  const messenger = findVscodeMessengerAlias(text) || 'b';
  const metadataRow = metadataRowSnippet(messenger);
  next = upgradeMetadataMergeSnippet(next);
  if (next.includes('var codexLocalGroupsInitialMeta=') && !next.includes('function codexLocalGroupsMetadataItems')) {
    next = next.replace('function codexRecentTaskProjectRows', `${metadataItems}function codexRecentTaskProjectRows`);
  }
  next = next.replace('r.push({kind:`local`,key:String(i),conversation:{id:String(i),title:s,cwd:o,createdAt:d,updatedAt:d}})', 'r.push({kind:`local`,key:String(i),codexLocalGroupsMetadataOnly:!0,conversation:{id:String(i),title:s,cwd:o,createdAt:d,updatedAt:d}})');
  if (next.includes('var codexLocalGroupsInitialMeta=') && !next.includes('function codexLocalGroupsMetadataRow')) {
    next = next.replace('function codexRecentTaskProjectRows', `${metadataRow}function codexRecentTaskProjectRows`);
  }
  if (next.includes('function codexLocalGroupsMetadataRow') && !next.includes('metadata-actions-')) {
    next = next.replace(/function codexLocalGroupsMetadataRow\(e,t,n\)\{let r=codexLocalGroupsLocalTitle\(e\)\?\?e\.conversation\.title\?\?String\(e\.conversation\.id\)[\s\S]*?\},`metadata-row-`\+e\.key\)\}/, metadataRow);
  }
  next = next.replace(/function codexLocalGroupsItemCreatedAt\(e\)\{return e\.kind===`local`\?e\.conversation\.createdAt\?\?0:0\}function codexLocalGroupsCanUsePendingGroup\(e,t\)\{let n=Number\(t\.startedAtMs\);if\(!Number\.isFinite\(n\)\|\|e\.kind!==`local`\)return!1;let r=Number\(codexLocalGroupsItemCreatedAt\(e\)\);return Number\.isFinite\(r\)&&r>=n&&Date\.now\(\)-n<60000\}/g, 'function codexLocalGroupsUuidTime(e){let t=String(e??``).replace(/-/g,``).slice(0,12),n=parseInt(t,16);return Number.isFinite(n)&&n>0?n:0}function codexLocalGroupsItemCreatedAt(e){if(e.kind!==`local`)return 0;let t=Number(e.conversation?.createdAt??e.pendingWorktree?.createdAt??0);if(Number.isFinite(t)&&t>0)return t<1e12?t*1e3:t;return codexLocalGroupsUuidTime(e.conversation?.id??e.pendingWorktree?.clientThreadId??e.pendingWorktree?.id)}function codexLocalGroupsCanUsePendingGroup(e,t){let n=Number(t.startedAtMs);if(!Number.isFinite(n)||e.kind!==`local`)return!1;let r=Number(codexLocalGroupsItemCreatedAt(e));return Number.isFinite(r)&&r>=n-30000&&r<=n+600000&&Date.now()-n<600000}');
  const staleBusy = 'function codexLocalGroupsSetBusy(e,t){try{let n=String(e.currentTarget.textContent||``);e.currentTarget.textContent=t,setTimeout(()=>{e.currentTarget&&(e.currentTarget.textContent=n)},1200)}catch{}}';
  const fixedBusy = 'function codexLocalGroupsArchiveConversation(e){let t=String(e??``);if(!t)return;let n=codexLocalGroupsReadMeta();n.archivedConversations||(n.archivedConversations={}),n.archivedConversations[t]={archivedAtMs:Date.now()},n.conversations&&delete n.conversations[t],codexLocalGroupsStoreMeta(n);try{codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`archiveConversationMeta`,conversationId:t})}catch{}}function codexLocalGroupsSetBusy(e,t){try{let n=e.currentTarget,r=String(n.textContent||``);n.textContent=t,setTimeout(()=>{n.textContent===t&&(n.textContent=r)},1200)}catch{}}';
  next = next.replace(staleBusy, fixedBusy);
  if (!next.includes('function codexLocalGroupsArchiveConversation')) {
    next = next.replace('function codexLocalGroupsSetBusy(e,t){try{let n=e.currentTarget,r=String(n.textContent||``);n.textContent=t,setTimeout(()=>{n.textContent===t&&(n.textContent=r)},1200)}catch{}}', fixedBusy);
  }
  if (!next.includes('function codexLocalGroupsSetBusy')) next = next.replace(/function codexLocalGroupsPromptTitle/, `${fixedBusy}function codexLocalGroupsPromptTitle`);
  const staleTitleCache = 'let a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,titleOverride:codexLocalGroupsLocalTitle(n)??void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[9]=a):a=t[9],a';
  const v25TitleCache = 'let o=codexLocalGroupsLocalTitle(n)??void 0,a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e||t[20]!==o?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,titleOverride:o}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[20]=o,t[9]=a):a=t[9],a';
  const fixedTitleCache = 'let o=codexLocalGroupsLocalTitle(n),a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e||t[20]!==o?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[20]=o,t[9]=a):a=t[9],a';
  const staleTitleCacheV2 = 'let a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==a||t[8]!==e?(a=(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:codexLocalGroupsLocalTitle(n)??void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=a,t[8]=e,t[9]=a):a=t[9],a';
  const v25TitleCacheV2 = 'let o=codexLocalGroupsLocalTitle(n)??void 0,a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==a||t[8]!==e||t[20]!==o?(a=(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:o}),t[5]=r,t[6]=n.conversation.id,t[7]=a,t[8]=e,t[20]=o,t[9]=a):a=t[9],a';
  const fixedTitleCacheV2 = 'let o=codexLocalGroupsLocalTitle(n),a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==a||t[8]!==e||t[20]!==o?(a=(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=a,t[8]=e,t[20]=o,t[9]=a):a=t[9],a';
  const latestStaleTitleCacheV2 = 'let i;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==a||t[8]!==e?(i=(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:codexLocalGroupsLocalTitle(n)??void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=a,t[8]=e,t[9]=i):i=t[9],i';
  const latestFixedTitleCacheV2 = 'let o=codexLocalGroupsLocalTitle(n),i;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==a||t[8]!==e||t[20]!==o?(i=(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=a,t[8]=e,t[20]=o,t[9]=i):i=t[9],i';
  next = next.replace(staleTitleCache, fixedTitleCache);
  next = next.replace(v25TitleCache, fixedTitleCache);
  next = next.replace(staleTitleCacheV2, fixedTitleCacheV2);
  next = next.replace(v25TitleCacheV2, fixedTitleCacheV2);
  next = next.replace(latestStaleTitleCacheV2, latestFixedTitleCacheV2);
  next = next.replace('Je=(0,$.memo)(function(e){let t=(0,Z.c)(20),', 'Je=(0,$.memo)(function(e){let t=(0,Z.c)(21),');
  next = next.replace('ot=(0,$.memo)(function(e){let t=(0,Z.c)(20),', 'ot=(0,$.memo)(function(e){let t=(0,Z.c)(21),');
  next = next.replace(/onClick:t=>\{t\.stopPropagation\(\),codexLocalGroupsPromptNewGroup\(e\.projectRoot\)\}/g, 'onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsPromptNewGroup(e.projectRoot)}');
  next = next.replace(/onClick:t=>\{t\.stopPropagation\(\),codexLocalGroupsStartConversationInGroup\(e\.projectRoot,i\.label\)\}/g, 'onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsStartConversationInGroup(e.projectRoot,i.label)}');
  next = next.replace(/onClick:t=>\{t\.stopPropagation\(\),codexLocalGroupsPromptTitle\(o\.conversation\.id,codexLocalGroupsLocalTitle\(o\)\?\?o\.conversation\.title\?\?``,o\.conversation\.cwd\?\?``\)\}/g, 'onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptTitle(o.conversation.id,codexLocalGroupsLocalTitle(o)??o.conversation.title??``,codexLocalGroupsProjectRoot(o)??``)}');
  next = next.replace(/onClick:t=>\{t\.stopPropagation\(\),codexLocalGroupsPromptGroup\(o\.conversation\.id,o\.conversation\.cwd\?\?``\)\}/g, 'onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptGroup(o.conversation.id,codexLocalGroupsProjectRoot(o)??``)}');
  next = next.replace(/delete r\.pendingGroup,codexLocalGroupsStoreMeta\(r\);try\{/g, 'delete r.pendingGroup,codexLocalGroupsStoreMeta(r,!0);try{');
  if (!next.includes('e.groupMap.has(f.group)')) next = next.replace(/for\(let e of r\)e\.groups\.sort\(\(e,t\)=>e\.label===`未分组`\?1:t\.label===`未分组`\?-1:e\.label\.localeCompare\(t\.label\)\);return r\.flatMap/g, 'let m=codexLocalGroupsReadMeta(),f=m.pendingGroup;if(f?.group&&f?.projectRoot)for(let e of r)codexLocalGroupsProjectMatches(e.projectRoot,f.projectRoot)&&!codexLocalGroupsGroupArchived(e.projectRoot,f.group,m)&&!e.groupMap.has(f.group)&&(e.groupMap.set(f.group,{label:f.group,items:[]}),e.groups.push(e.groupMap.get(f.group)));for(let e of r)e.groups.sort((e,t)=>e.label===`未分组`?1:t.label===`未分组`?-1:e.label.localeCompare(t.label));return r.flatMap');
  next = next.replace('let f=codexLocalGroupsReadMeta().pendingGroup;if(f?.group&&f?.projectRoot)for(let e of r)codexLocalGroupsProjectMatches(e.projectRoot,f.projectRoot)&&!e.groupMap.has(f.group)&&(e.groupMap.set(f.group,{label:f.group,items:[]}),e.groups.push(e.groupMap.get(f.group)));', 'let m=codexLocalGroupsReadMeta(),f=m.pendingGroup;if(f?.group&&f?.projectRoot)for(let e of r)codexLocalGroupsProjectMatches(e.projectRoot,f.projectRoot)&&!codexLocalGroupsGroupArchived(e.projectRoot,f.group,m)&&!e.groupMap.has(f.group)&&(e.groupMap.set(f.group,{label:f.group,items:[]}),e.groups.push(e.groupMap.get(f.group)));');
  next = next.replace(/t\.preventDefault\(\),t\.stopPropagation\(\),codexLocalGroupsPromptTitle/g, 't.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptTitle');
  next = next.replace(/t\.preventDefault\(\),t\.stopPropagation\(\),codexLocalGroupsPromptGroup/g, 't.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptGroup');
  next = next.replace(/codexLocalGroupsPromptTitle\(o\.conversation\.id,codexLocalGroupsLocalTitle\(o\)\?\?o\.conversation\.title\?\?``,o\.conversation\.cwd\?\?``\)/g, 'codexLocalGroupsPromptTitle(o.conversation.id,codexLocalGroupsLocalTitle(o)??o.conversation.title??``,codexLocalGroupsProjectRoot(o)??``)');
  next = next.replace(/codexLocalGroupsPromptGroup\(o\.conversation\.id,o\.conversation\.cwd\?\?``\)/g, 'codexLocalGroupsPromptGroup(o.conversation.id,codexLocalGroupsProjectRoot(o)??``)');
  next = next.replace('className:`flex max-h-[900px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[480px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  next = next.replace('className:`flex max-h-[60vh] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[480px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  next = next.replace('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[480px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  next = next.replace(/paddingRight:`(?:112|160)px`/g, 'paddingRight:`240px`');
  next = next.replace('function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);if(!n)return e;', 'function codexRecentTaskFilter(e,t){e=codexLocalGroupsMetadataItems(e);let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);if(!n)return e;');
  next = next.replace('function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);', 'function codexRecentTaskFilter(e,t){e=codexLocalGroupsMetadataItems(e);let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);');
  next = next.replace('function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);if(!n)return e;', 'function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);if(!n)return e;');
  next = next.replace('let t=e.kind===`local`?e.conversation.cwd:e.kind===`pending-worktree`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:null,r=codexRecentTaskNormalizePath(t);return r===n||r.startsWith(n+`/`)', 'let t=codexLocalGroupsProjectRoot(e),r=codexRecentTaskNormalizePath(t);return r===n||r.startsWith(n+`/`)');
  next = next.replace('let t=codexRecentTaskNormalizePath(e.cwd);return t===n||t.startsWith(n+`/`)', 'let t=codexLocalGroupsConversationProjectRoot(e.id,e.cwd);return t===n||t.startsWith(n+`/`)');
  next = next.replace(/onClose:\(\)=>\{b\.dispatchHostMessage\(\{type:`navigate-to-route`,path:`\/local\/`\+o\.conversation\.id\}\),n\(\)\},o\.key\)/g, 'onClose:n},o.key)');
  next = next.replace(/onClose:\(\)=>\{b\.dispatchHostMessage\(\{type:`navigate-to-route`,path:`\/local\/\$\{o\.conversation\.id\}`\}\),n\(\)\},o\.key\)/g, 'onClose:n},o.key)');
  next = next.replace(/codexRecentTaskProjectRows\(F,y,i\)(?!,)/g, 'codexRecentTaskProjectRows(F,y,i,ot)');
  next = next.replace(/codexRecentTaskProjectRows\(F,p,a\)(?!,)/g, 'codexRecentTaskProjectRows(F,p,a,Je)');
  next = next.replace(/function codexRecentTaskProjectRows\(e,t,n\)\{/g, 'function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow){');
  next = next.replace(/\(0,Q\.jsx\)\(Je,\{item:o,isActive:o\.kind===`local`&&t===o\.conversation\.id,onClose:n\},o\.key\)/g, '(0,Q.jsx)(codexLocalGroupsRow,{item:o,isActive:o.kind===`local`&&t===o.conversation.id,onClose:n},o.key)');
  next = next.replace('...(s?u.map(e=>{let o=codexLocalGroupsDecoratedItem(e),p=', '...(s?u.map(e=>{if(e.codexLocalGroupsMetadataOnly)return codexLocalGroupsMetadataRow(e,t,n);let o=codexLocalGroupsDecoratedItem(e),p=');
  return addBoundedHeaderHistoryRows(stripHeaderMetadataRows(next), messenger);
}

function fixInjectedWhitespaceRegex(text) {
  return text.replace(/\[s\u3000\]\+\/g/g, '[\\s\\u3000]+/g');
}

function patchHeaderRowActions(text, context) {
  const newText = '(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a})';
  const titleText = '(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:codexLocalGroupsLocalTitle(n)??void 0})';
  const v25TitleText = '(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:o})';
  const fixedTitleText = '(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0})';
  const contextText = '(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,onContextMenu:e=>{e.preventDefault(),e.stopPropagation(),codexLocalGroupsPromptGroup(n.conversation.id,n.conversation.cwd??``)}})';
  const badText = '(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,additionalHoverActionCount:2,renderActions:()=>codexLocalGroupsRowActions(n.conversation.id,n.conversation.title??``,n.conversation.cwd??``),onContextMenu:e=>{e.preventDefault(),e.stopPropagation(),codexLocalGroupsPromptGroup(n.conversation.id,n.conversation.cwd??``)}})';
  const legacyNewText = '(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i})';
  const legacyTitleText = '(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,titleOverride:codexLocalGroupsLocalTitle(n)??void 0})';
  const legacyV25TitleText = '(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,titleOverride:o})';
  const legacyFixedTitleText = '(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0})';
  const legacyContextText = '(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onContextMenu:e=>{e.preventDefault(),e.stopPropagation(),codexLocalGroupsPromptGroup(n.conversation.id,n.conversation.cwd??``)}})';
  const legacyBadText = '(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,additionalHoverActionCount:2,renderActions:()=>codexLocalGroupsRowActions(n.conversation.id,n.conversation.title??``,n.conversation.cwd??``),onContextMenu:e=>{e.preventDefault(),e.stopPropagation(),codexLocalGroupsPromptGroup(n.conversation.id,n.conversation.cwd??``)}})';
  if (text.includes(titleText) || text.includes(v25TitleText) || text.includes(fixedTitleText) ||
      text.includes(legacyTitleText) || text.includes(legacyV25TitleText) || text.includes(legacyFixedTitleText)) {
    return text;
  }
  if (text.includes(newText)) {
    return replaceOnce(text, newText, titleText, context, 'header local conversation title override');
  }
  if (text.includes(contextText)) {
    return replaceOnce(text, contextText, titleText, context, 'header local conversation context menu cleanup');
  }
  if (text.includes(badText)) {
    return replaceOnce(text, badText, titleText, context, 'header local conversation row actions cleanup');
  }
  if (text.includes(legacyNewText)) {
    return replaceOnce(text, legacyNewText, legacyTitleText, context, 'header local conversation title override legacy');
  }
  if (text.includes(legacyContextText)) {
    return replaceOnce(text, legacyContextText, legacyTitleText, context, 'header local conversation context menu cleanup legacy');
  }
  if (text.includes(legacyBadText)) {
    return replaceOnce(text, legacyBadText, legacyTitleText, context, 'header local conversation row actions cleanup legacy');
  }
  return text;
}

function patchHeaderBase(text, context, file) {
  if (context.safeMode) {
    const rows = [
      ['F.map(e=>(0,Q.jsx)(ot,{item:e,isActive:e.kind===`local`&&y===e.conversation.id,onClose:i},e.key))', 'codexRecentTaskProjectRows(F,y,i,ot)'],
      ['I.map(e=>(0,Q.jsx)(st,{item:e,isActive:e.kind===`local`&&_===e.conversation.id,onClose:i},e.key))', 'codexRecentTaskProjectRows(I,_,i,st)'],
      ['R.map(e=>(0,Q.jsx)(ot,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&g===e.conversation.id,onClose:i},e.key))', 'codexRecentTaskProjectRows(R,g,i,ot)'],
      ['F.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&p===e.conversation.id,onClose:a},e.key))', 'codexRecentTaskProjectRows(F,p,a,Je)'],
    ];
    const row = rows.find(([oldText]) => text.includes(oldText));
    return row ? replaceOnce(text, row[0], row[1], context, 'header safe project rows') : text;
  }
  if (text.includes('codexRecentTaskCurrentRoot')) {
    return text;
  }
  let next = addExecutionTargetImport(text, context, file);
  const execTargetInsert = 'd=re(),{data:f,isLoading:p,isError:m,refetch:h}=A(),g;';
  const execTargetReplacement = 'd=re(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,{data:f,isLoading:p,isError:m,refetch:h}=A(),g;';
  if (next.includes(execTargetInsert)) {
    next = replaceOnce(next, execTargetInsert, execTargetReplacement, context, 'header execution target state');
  } else if (next.includes('l=v(),{authMethod:u}=D(),')) {
    next = replaceOnce(next, 'l=v(),{authMethod:u}=D(),', 'l=v(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,{authMethod:u}=D(),', context, 'header execution target state latest');
  } else if (next.includes('l=x(),{authMethod:u}=I(),[d,f]=v(nt),')) {
    next = replaceOnce(next, 'l=x(),{authMethod:u}=I(),[d,f]=v(nt),', 'l=x(),{authMethod:u}=I(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,[d,f]=v(nt),', context, 'header execution target state current');
  } else {
    next = replaceOnce(next, 'h=ge(),g;', 'h=ge(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,g;', context, 'header execution target state legacy');
  }
  const filterInsert = 'let T=r.filter(w),D=$e(n.data,r,ee),';
  const filterReplacement = 'let T=codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter($e(n.data,r,ee),codexRecentTaskCurrentRoot),';
  if (next.includes(filterInsert)) {
    next = replaceOnce(next, filterInsert, filterReplacement, context, 'header current project filter');
  } else if (next.includes('let E=r.filter(T),O=et(n.data,r,C),')) {
    next = replaceOnce(next, 'let E=r.filter(T),O=et(n.data,r,C),', 'let E=codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot),O=codexRecentTaskFilter(et(n.data,r,C),codexRecentTaskCurrentRoot),', context, 'header current project filter latest');
  } else if (next.includes('let T=r.filter(w),D=$e(n.data,r,C),')) {
    next = replaceOnce(next, 'let T=r.filter(w),D=$e(n.data,r,C),', 'let T=codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter($e(n.data,r,C),codexRecentTaskCurrentRoot),', context, 'header current project filter current');
  } else {
    next = replaceOnce(next, 'let b=i.filter(y),C=Ve(r.data,i,_),', 'let b=codexRecentConversationFilter(i.filter(y),codexRecentTaskCurrentRoot),C=codexRecentTaskFilter(Ve(r.data,i,_),codexRecentTaskCurrentRoot),', context, 'header current project filter legacy');
  }
  const cloudTabInsert = 'N.map(e=>(0,Q.jsx)(ue,{task:e.task,onClose:i},e.key))';
  const cloudTabReplacement = 'N.map(e=>(0,Q.jsx)(ue,{task:e.task,onClose:i,metaContent:e.at?codexRecentTaskDateLabel(new Date(e.at)):void 0},e.key))';
  if (next.includes(cloudTabInsert)) {
    next = replaceOnce(next, cloudTabInsert, cloudTabReplacement, context, 'header cloud tab date');
  } else if (next.includes('F.map(e=>(0,Q.jsx)(_e,{task:e.task,onClose:i},e.key))')) {
    next = replaceOnce(next, 'F.map(e=>(0,Q.jsx)(_e,{task:e.task,onClose:i},e.key))', 'F.map(e=>(0,Q.jsx)(_e,{task:e.task,onClose:i,metaContent:e.at?codexRecentTaskDateLabel(new Date(e.at)):void 0},e.key))', context, 'header cloud tab date latest');
  } else if (next.includes('F.map(e=>(0,Q.jsx)(ve,{task:e.task,onClose:i},e.key))')) {
    next = replaceOnce(next, 'F.map(e=>(0,Q.jsx)(ve,{task:e.task,onClose:i},e.key))', 'F.map(e=>(0,Q.jsx)(ve,{task:e.task,onClose:i,metaContent:e.at?codexRecentTaskDateLabel(new Date(e.at)):void 0},e.key))', context, 'header cloud tab date current');
  } else {
    next = replaceOnce(next, 'A.map(e=>(0,Q.jsx)(me,{task:e.task,onClose:a},e.key))', 'A.map(e=>(0,Q.jsx)(me,{task:e.task,onClose:a,metaContent:e.at?codexRecentTaskDateLabel(new Date(e.at)):void 0},e.key))', context, 'header cloud tab date legacy');
  }
  const projectRowsInsert = 'F.map(e=>(0,Q.jsx)(ot,{item:e,isActive:e.kind===`local`&&y===e.conversation.id,onClose:i},e.key))';
  const projectRowsReplacement = 'codexRecentTaskProjectRows(F,y,i,ot)';
  if (next.includes(projectRowsInsert)) {
    next = replaceOnce(next, projectRowsInsert, projectRowsReplacement, context, 'header project rows');
  } else if (next.includes('I.map(e=>(0,Q.jsx)(st,{item:e,isActive:e.kind===`local`&&_===e.conversation.id,onClose:i},e.key))')) {
    next = replaceOnce(next, 'I.map(e=>(0,Q.jsx)(st,{item:e,isActive:e.kind===`local`&&_===e.conversation.id,onClose:i},e.key))', 'codexRecentTaskProjectRows(I,_,i,st)', context, 'header project rows latest');
  } else if (next.includes('R.map(e=>(0,Q.jsx)(ot,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&g===e.conversation.id,onClose:i},e.key))')) {
    next = replaceOnce(next, 'R.map(e=>(0,Q.jsx)(ot,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&g===e.conversation.id,onClose:i},e.key))', 'codexRecentTaskProjectRows(R,g,i,ot)', context, 'header project rows current');
  } else {
    next = replaceOnce(next, 'F.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&p===e.conversation.id,onClose:a},e.key))', 'codexRecentTaskProjectRows(F,p,a,Je)', context, 'header project rows legacy');
  }
  next = replaceHeaderDates(next, context);
  return next;
}

function addExecutionTargetImport(text, context, file) {
  if (text.includes('codexUseExecutionTarget')) return text;
  const appImports = matchingAppInitialImports(text, file, (appText) => findExecutionTargetExports(appText).length > 0);
  if (appImports.length > 1) {
    context.errors.push(`header: execution target Hook 候选模块数量为 ${appImports.length}`);
    return text;
  }
  if (appImports.length === 1) {
    const appImport = appImports[0];
    const exports = findExecutionTargetExports(appImport.moduleText);
    if (exports.length !== 1) {
      context.errors.push(`header: execution target Hook 导出数量为 ${exports.length}`);
      return text;
    }
    const binding = `${exports[0]} as codexUseExecutionTarget`;
    const importText = appImport.importText.replace('}from', `,${binding}}from`);
    return replaceOnce(text, appImport.importText, importText, context, 'header execution target import current');
  }
  const match = text.match(/import\{i as [A-Za-z_$][\w$]*\}from"\.\/use-environment-[^"]+\.js";/);
  if (!match) {
    context.errors.push('header: 找不到 use-environment import 插入点');
    return text;
  }
  const assetName = findAsset(path.dirname(file), 'use-webview-execution-target-', '.js', context);
  if (!assetName) return text;
  const importText = `import{n as codexUseExecutionTarget}from"./${assetName}";`;
  return `${text.slice(0, match.index + match[0].length)}${importText}${text.slice(match.index + match[0].length)}`;
}

function addVscodeMessengerImport(text, context, file) {
  const candidates = matchingAppInitialImports(text, file, (appText) => findVscodeMessengerExports(appText).length > 0);
  if (candidates.length > 1) { context.errors.push(`header: VS Code messenger 候选模块数量为 ${candidates.length}`); return text; }
  if (candidates.length === 1) {
    const exports = findVscodeMessengerExports(candidates[0].moduleText);
    if (exports.length !== 1) { context.errors.push(`header: VS Code messenger 导出数量为 ${exports.length}`); return text; }
    const binding = `${exports[0]} as codexLocalGroupsMessengerImport`;
    const current = candidates[0].importText;
    const nextImport = current.includes(' as codexLocalGroupsMessengerImport')
      ? current.replace(/([,{])[A-Za-z_$][\w$]* as codexLocalGroupsMessengerImport(?=[,}])/, (_, prefix) => `${prefix}${binding}`)
      : current.replace('}from', `,${binding}}from`);
    return nextImport === current ? text : replaceOnce(text, current, nextImport, context, 'header messenger import current');
  }
  if (context.codexMinor === 727) { context.errors.push('header: app-initial 未导出 VS Code messenger'); return text; }
  if (findVscodeMessengerAlias(text)) return text;
  const vscodeImport = text.match(/import\{[^}]+\}from"(\.\/vscode-api-[^"]+\.js)";/);
  const legacy = matchingAppInitialImports(text, file, (appText) => /(?:^|[,{}])(?:[A-Za-z_$][\w$]* as )?qQ(?=[,}])/.test(appText.slice(appText.lastIndexOf('export{'))));
  if (legacy.length > 1) { context.errors.push(`header: qQ messenger 候选模块数量为 ${legacy.length}`); return text; }
  if (legacy.length === 1) return replaceOnce(text, legacy[0].importText, legacy[0].importText.replace('}from', ',qQ as codexLocalGroupsMessengerImport}from'), context, 'header messenger import legacy');
  if (!vscodeImport) { context.errors.push(/import\{[^}]+\}from"\.\/app-initial-[^"]+\.js";/.test(text) ? 'header: app-initial 未导出 qQ messenger' : 'header: 找不到 vscode-api import 插入点'); return text; }
  const importText = `import{f as codexLocalGroupsMessengerImport}from"${vscodeImport[1]}";`;
  return `${text.slice(0, vscodeImport.index + vscodeImport[0].length)}${importText}${text.slice(vscodeImport.index + vscodeImport[0].length)}`;
}

function findVscodeMessengerExports(text) {
  const exportStart = text.lastIndexOf('export{');
  if (exportStart < 0) return [];
  const locals = new Set();
  const singletons = text.matchAll(/(?:^|[^\w$])([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*\.getInstance\(\)/g);
  for (const match of singletons) {
    const local = match[1];
    if (text.includes(`${local}.dispatchMessage(`) && text.includes(`${local}.dispatchHostMessage(`)) locals.add(local);
  }
  const exports = [];
  const entries = text.slice(exportStart).matchAll(/(?:^|[,{}])([A-Za-z_$][\w$]*) as ([A-Za-z_$][\w$]*)(?=[,}])/g);
  for (const entry of entries) if (locals.has(entry[1])) exports.push(entry[2]);
  return exports;
}

function findExecutionTargetExports(text) {
  const hooks = new Set();
  const pattern = /function ([A-Za-z_$][\w$]*)\([A-Za-z_$][\w$]*\)\{(?:(?!function )[\s\S]){0,1800}?isActiveWorkspaceRootLoading:/g;
  for (const hook of text.matchAll(pattern)) hooks.add(hook[1]);
  if (hooks.size === 0) return [];
  const exportStart = text.indexOf('export{');
  if (exportStart < 0) return [];
  const exports = [];
  const entries = text.slice(exportStart).matchAll(/(?:^|[,{}])([A-Za-z_$][\w$]*) as ([A-Za-z_$][\w$]*)(?=[,}])/g);
  for (const entry of entries) if (hooks.has(entry[1])) exports.push(entry[2]);
  return exports;
}

function matchingAppInitialImports(text, file, predicate) {
  if (!file) return [];
  const dir = path.dirname(file);
  return [...text.matchAll(/import\{[^}]+\}from"(\.\/app-initial-[^"]+\.js)";/g)]
    .map((match) => {
      const modulePath = path.join(dir, match[1].slice(2));
      const moduleText = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
      return { importText: match[0], moduleText };
    })
    .filter((candidate) => candidate.moduleText && predicate(candidate.moduleText));
}

function replaceHeaderDates(text, context) {
  let next = text;
  if (next.includes('o=r==null?void 0:(0,Q.jsx)(ce,{dateString:new Date(r).toISOString()})')) {
    next = replaceOnce(next, 'o=r==null?void 0:(0,Q.jsx)(ce,{dateString:new Date(r).toISOString()})', 'o=r==null?void 0:codexRecentTaskDateLabel(new Date(r))', context, 'header local tab date');
  } else if (next.includes('o=r==null?void 0:(0,Q.jsx)(fe,{dateString:new Date(r).toISOString()})')) {
    next = replaceOnce(next, 'o=r==null?void 0:(0,Q.jsx)(fe,{dateString:new Date(r).toISOString()})', 'o=r==null?void 0:codexRecentTaskDateLabel(new Date(r))', context, 'header local tab date latest');
  } else {
    next = replaceOnce(next, 'o=r==null?void 0:(0,Q.jsx)(de,{dateString:new Date(r).toISOString()})', 'o=r==null?void 0:codexRecentTaskDateLabel(new Date(r))', context, 'header local tab date legacy');
  }
  if (next.includes('case`remote`:{let e;return t[0]!==n.task||t[1]!==a?(e=(0,Q.jsx)(ue,{task:n.task,onClose:a}),t[0]=n.task,t[1]=a,t[2]=e):e=t[2],e}')) {
    next = replaceOnce(next, 'case`remote`:{let e;return t[0]!==n.task||t[1]!==a?(e=(0,Q.jsx)(ue,{task:n.task,onClose:a}),t[0]=n.task,t[1]=a,t[2]=e):e=t[2],e}', 'case`remote`:return(0,Q.jsx)(ue,{task:n.task,onClose:a,metaContent:n.at?codexRecentTaskDateLabel(new Date(n.at)):void 0});', context, 'header grouped remote date');
  } else if (next.includes('case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(_e,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}')) {
    next = replaceOnce(next, 'case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(_e,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}', 'case`remote`:return(0,Q.jsx)(_e,{task:n.task,onClose:i,metaContent:n.at?codexRecentTaskDateLabel(new Date(n.at)):void 0});', context, 'header grouped remote date latest');
  } else if (next.includes('case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(ve,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}')) {
    next = replaceOnce(next, 'case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(ve,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}', 'case`remote`:return(0,Q.jsx)(ve,{task:n.task,onClose:i,metaContent:n.at?codexRecentTaskDateLabel(new Date(n.at)):void 0});', context, 'header grouped remote date current');
  } else {
    next = replaceOnce(next, 'case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(me,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}', 'case`remote`:return(0,Q.jsx)(me,{task:n.task,onClose:i,metaContent:n.at?codexRecentTaskDateLabel(new Date(n.at)):void 0});', context, 'header grouped remote date legacy');
  }
  if (next.includes('e=n.conversation.updatedAt==null?void 0:(0,Q.jsx)(ce,{dateString:new Date(n.conversation.updatedAt).toISOString()})')) {
    next = replaceOnce(next, 'e=n.conversation.updatedAt==null?void 0:(0,Q.jsx)(ce,{dateString:new Date(n.conversation.updatedAt).toISOString()})', 'e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt))', context, 'header grouped local date');
  } else if (next.includes('e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:(0,Q.jsx)(fe,{dateString:new Date(n.conversation.recencyAt??n.conversation.updatedAt).toISOString()})')) {
    next = replaceOnce(next, 'e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:(0,Q.jsx)(fe,{dateString:new Date(n.conversation.recencyAt??n.conversation.updatedAt).toISOString()})', 'e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.recencyAt??n.conversation.updatedAt))', context, 'header grouped local date latest');
  } else if (next.includes('e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.recencyAt??n.conversation.updatedAt).toISOString()})')) {
    next = replaceOnce(next, 'e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.recencyAt??n.conversation.updatedAt).toISOString()})', 'e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.recencyAt??n.conversation.updatedAt))', context, 'header grouped local date current');
  } else {
    next = replaceOnce(next, 'e=n.conversation.updatedAt==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.updatedAt).toISOString()})', 'e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt))', context, 'header grouped local date legacy');
  }
  if (next.includes('s=(0,Q.jsx)(le,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})')) {
    next = replaceOnce(next, 's=(0,Q.jsx)(le,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})', 's=(0,Q.jsx)(le,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r,metaContent:codexRecentTaskDateLabel(new Date(n.pendingWorktree.createdAt))})', context, 'header pending worktree date');
  } else if (next.includes('s=(0,Q.jsx)(ge,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})')) {
    next = replaceOnce(next, 's=(0,Q.jsx)(ge,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})', 's=(0,Q.jsx)(ge,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r,metaContent:codexRecentTaskDateLabel(new Date(n.pendingWorktree.createdAt))})', context, 'header pending worktree date latest');
  } else if (next.includes('s=(0,Q.jsx)(be,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})')) {
    next = replaceOnce(next, 's=(0,Q.jsx)(be,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})', 's=(0,Q.jsx)(be,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r,metaContent:codexRecentTaskDateLabel(new Date(n.pendingWorktree.createdAt))})', context, 'header pending worktree date current');
  } else {
    next = replaceOnce(next, 'o=(0,Q.jsx)(fe,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})', 'o=(0,Q.jsx)(fe,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r,metaContent:codexRecentTaskDateLabel(new Date(n.pendingWorktree.createdAt))})', context, 'header pending worktree date legacy');
  }
  return next;
}

function patchHeaderMetadataLiteral(text) {
  return replaceMetadataLiteral(text, EMPTY_METADATA, 'var codexLocalGroupsInitialMeta=');
}

function patchHeaderGroupHelper(text, context) {
  const messenger = findVscodeMessengerAlias(text) || 'b';
  const jsxRuntime = text.includes('function Bn(e){return e.kind===`remote`}') || text.includes('function zn(e){return e.kind===`remote`}') ? 'Z' : 'Q';
  const helperText = (kindFnName) => context.safeMode
    ? safeHeaderHelper(EMPTY_METADATA, messenger, kindFnName)
    : addBoundedHeaderHistoryRows(stripHeaderMetadataRows(patchHeaderPendingItems(headerHelper(EMPTY_METADATA, messenger, kindFnName))), messenger);
  const helper = (kindFnName) => helperText(kindFnName)
    .replace(/\(0,Q\.jsx\)/g, `(0,${jsxRuntime}.jsx)`)
    .replace(/\(0,Q\.jsxs\)/g, `(0,${jsxRuntime}.jsxs)`);
  const currentStartV2 = 'function it(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const previousStartV2 = 'function it(e){return e.kind===`remote`}function codexRecentTaskProjectRows';
  const currentStartV1 = 'function Ke(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const previousStartV1 = 'function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows';
  const currentStartV3 = 'function at(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const previousStartV3 = 'function at(e){return e.kind===`remote`}function codexRecentTaskProjectRows';
  const currentStartV4 = 'function Bn(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const currentStartV5 = 'function zn(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const upgraded = replaceToMarker(text, currentStartV2, 'var at=', helper('it'));
  if (upgraded) {
    return upgraded;
  }
  const previous = replaceToMarker(text, previousStartV2, 'var at=', helper('it'));
  if (previous) {
    return previous;
  }
  const upgradedV1 = replaceToMarker(text, currentStartV1, 'var qe=', helper('Ke'));
  if (upgradedV1) {
    return upgradedV1;
  }
  const previousV1 = replaceToMarker(text, previousStartV1, 'var qe=', helper('Ke'));
  if (previousV1) {
    return previousV1;
  }
  const upgradedV3 = replaceToMarker(text, currentStartV3, 'var ot=', helper('at'));
  if (upgradedV3) {
    return upgradedV3;
  }
  const previousV3 = replaceToMarker(text, previousStartV3, 'var ot=', helper('at'));
  if (previousV3) {
    return previousV3;
  }
  const upgradedV4 = replaceToMarker(text, currentStartV4, 'function Vn', helper('Bn'));
  if (upgradedV4) {
    return upgradedV4;
  }
  const upgradedV5 = replaceToMarker(text, currentStartV5, 'function Bn', helper('zn'));
  if (upgradedV5) {
    return upgradedV5;
  }
  if (text.includes('function it(e){return e.kind===`remote`}var at=')) {
    return replaceOnce(text, 'function it(e){return e.kind===`remote`}var at=', `${helper('it')}var at=`, context, 'header local groups helper');
  }
  if (text.includes('function it(e){return e.kind===`remote`}var qe=')) {
    return replaceOnce(text, 'function it(e){return e.kind===`remote`}var qe=', `${helper('it')}var qe=`, context, 'header local groups helper alt');
  }
  if (text.includes('function at(e){return e.kind===`remote`}var ot=')) {
    return replaceOnce(text, 'function at(e){return e.kind===`remote`}var ot=', `${helper('at')}var ot=`, context, 'header local groups helper latest');
  }
  if (text.includes('function Bn(e){return e.kind===`remote`}function Vn')) {
    return replaceOnce(text, 'function Bn(e){return e.kind===`remote`}function Vn', `${helper('Bn')}function Vn`, context, 'header local groups helper 26.721');
  }
  if (text.includes('function zn(e){return e.kind===`remote`}function Bn')) {
    return replaceOnce(text, 'function zn(e){return e.kind===`remote`}function Bn', `${helper('zn')}function Bn`, context, 'header local groups helper 26.727');
  }
  if (text.includes('function Sn(e){return e.kind===`remote`}function Cn')) {
    return replaceOnce(text, 'function Sn(e){return e.kind===`remote`}function Cn', `${helper('Sn')}function Cn`, context, 'header local groups helper 26.5730');
  }
  return replaceOnce(text, 'function Ke(e){return e.kind===`remote`}var qe=', `${helper('Ke')}var qe=`, context, 'header local groups helper legacy');
}

function patchAppMain(text, context) {
  let next = patchAppMainMetadataLiteral(text);
  next = patchAppMainHelper(next, context);
  next = patchAppMainAliasUsage(next, context);
  next = patchAppMainContextMenu(next, context);
  return next;
}

function patchAppMainMetadataLiteral(text) {
  return replaceMetadataLiteral(text, EMPTY_METADATA, 'var codexLocalGroupsInitialMeta=');
}

function patchAppMainHelper(text, context) {
  let next = text;
  if (next.includes('codexLocalGroupsWebviewPatchVersion=7')) {
    next = upgradeMetadataMergeSnippet(next);
    return removeLegacyAppMainAliasHelper(next, context);
  }
  const messenger = findVscodeMessengerAlias(text) || 'gi';
  const anchor = appMainHelperAnchor(text);
  if (!anchor) {
    context.errors.push('app-main metadata helper: 找不到 function aE(e){ 注入点');
    return text;
  }
  if (text.includes('var codexLocalGroupsInitialMeta=')) {
    next = replaceBlock(text, 'var codexLocalGroupsInitialMeta=', anchor, `${webviewHelper(EMPTY_METADATA, messenger)}${anchor}`, context, 'app-main metadata helper upgrade');
    return removeLegacyAppMainAliasHelper(next, context);
  }
  if (text.includes('var codexTitleAliasMap=')) {
    return replaceBlock(text, 'var codexTitleAliasMap=', anchor, `${webviewHelper(EMPTY_METADATA, messenger)}${anchor}`, context, 'app-main metadata helper');
  }
  return replaceOnce(text, anchor, `${webviewHelper(EMPTY_METADATA, messenger)}${anchor}`, context, 'app-main metadata helper inject');
}

function appMainHelperAnchor(text) {
  for (const anchor of ['function aE(e){', 'function aE(){']) {
    if (text.includes(anchor)) {
      return anchor;
    }
  }
  const regex = /function [A-Za-z_$][\w$]*\(\{[^{}]{0,400}\}\)\{/g;
  const matches = [...text.matchAll(regex)].filter((match) => {
    const snippet = text.slice(match.index, match.index + 1000);
    return match[0].includes('get:') &&
      match[0].includes('threadKeys:') &&
      match[0].includes('groups:') &&
      match[0].includes('projectlessThreadIds:') &&
      match[0].includes('projectlessLabel:') &&
      match[0].includes('untitledThreadLabel:') &&
      (snippet.includes('pending-worktree') || snippet.includes('conversation==null')) &&
      snippet.includes('conversation.title?.trim()') &&
      snippet.includes('task.title?.trim()') &&
      snippet.includes('projectLabel');
  });
  return matches.length === 1 ? matches[0][0] : '';
}

function removeLegacyAppMainAliasHelper(text, context) {
  if (!text.includes('codexLocalGroupsWebviewPatchVersion=7') || !text.includes('var codexTitleAliasMap=')) {
    return text;
  }
  const end = appMainHelperAnchor(text);
  if (!end) {
    return text;
  }
  return replaceBlock(text, 'var codexTitleAliasMap=', end, end, context, 'legacy app-main alias helper cleanup');
}

function patchAppMainAliasUsage(text, context) {
  let next = text;
  if (!next.includes('P=codexTitleAliasFor(n)??') && next.includes('P=K(Sl,n)??y?.title')) {
    next = replaceOnce(next, 'P=K(Sl,n)??y?.title', 'P=codexTitleAliasFor(n)??K(Sl,n)??y?.title', context, 'app-main row alias title');
  }
  if (!next.includes('codexTitleAliasFor(t.conversation.id)??')) {
    const oldText = '(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a';
    const newText = '(t.kind===`local`?codexTitleAliasFor(t.conversation.id)??t.conversation.title?.trim():t.task.title?.trim())||a';
    next = replaceOnce(next, oldText, newText, context, 'app-main search alias title');
  }
  return next;
}

function patchAppMainContextMenu(text, context) {
  const oldText = '{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...O==null||O===`local`?[]:';
  if (!text.includes(oldText) && !text.includes('codex-local-title')) {
    return text;
  }
  const oldItems = '{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},{id:`codex-local-title`,message:`设置本地标题`,onSelect:()=>{codexLocalGroupsPromptTitle(n,P,we??``)}},{id:`codex-local-group`,message:`设置需求分组`,onSelect:()=>{codexLocalGroupsPromptGroup(n,we??``)}},...O==null||O===`local`?[]:';
  const previousItems = '{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...O==null||O===`local`?[{id:`codex-local-title`,message:`设置本地标题`,onSelect:()=>{codexLocalGroupsPromptTitle(n,P,we??``)}},{id:`codex-local-group`,message:`设置需求分组`,onSelect:()=>{codexLocalGroupsPromptGroup(n,we??``)}}]:[],...O==null||O===`local`?[]:';
  const items = '{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...(O==null||O===`local`?[{id:`codex-local-title`,message:`设置本地标题`,onSelect:()=>{codexLocalGroupsPromptTitle(n,P,we??``)}},{id:`codex-local-group`,message:`设置需求分组`,onSelect:()=>{codexLocalGroupsPromptGroup(n,we??``)}}]:[]),...O==null||O===`local`?[]:';
  if (text.includes(items)) {
    return text;
  }
  if (text.includes(previousItems)) {
    return replaceOnce(text, previousItems, items, context, 'app-main local groups context menu syntax cleanup');
  }
  if (text.includes(oldItems)) {
    return replaceOnce(text, oldItems, items, context, 'app-main local groups context menu upgrade');
  }
  if (text.includes(oldText)) {
    return replaceOnce(text, oldText, items, context, 'app-main local groups context menu');
  }
  return text;
}

function patchAppMainStatsigNetwork(text, context) {
  if (text.includes('preventAllNetworkTraffic:!0')) {
    return text;
  }
  const oldText = 'tN={networkConfig:{api:YM,logEventUrl:cM,sdkExceptionUrl:XM,networkOverrideFunc:KM}}';
  const next = 'tN={networkConfig:{api:YM,logEventUrl:cM,sdkExceptionUrl:XM,networkOverrideFunc:KM,preventAllNetworkTraffic:!0}}';
  if (text.includes(next) || !text.includes(oldText)) {
    const latest = 'qC={networkConfig:{api:HC,logEventUrl:ZS,sdkExceptionUrl:UC,networkOverrideFunc:zC}}';
    const latestNext = 'qC={networkConfig:{api:HC,logEventUrl:ZS,sdkExceptionUrl:UC,networkOverrideFunc:zC,preventAllNetworkTraffic:!0}}';
    if (!text.includes(latest)) {
      const current = /([A-Za-z_$][\w$]*)=\{networkConfig:\{api:([A-Za-z_$][\w$]*),logEventUrl:([A-Za-z_$][\w$]*),sdkExceptionUrl:([A-Za-z_$][\w$]*),networkOverrideFunc:([A-Za-z_$][\w$]*)\}\}/;
      return replaceRegexOnce(text, current, '$1={networkConfig:{api:$2,logEventUrl:$3,sdkExceptionUrl:$4,networkOverrideFunc:$5,preventAllNetworkTraffic:!0}}', context, 'app-main statsig no network current');
    }
    return replaceOnce(text, latest, latestNext, context, 'app-main statsig no network latest');
  }
  return replaceOnce(text, oldText, next, context, 'app-main statsig no network');
}

function patchProjectHistory26721(text, context) {
  if (text.includes('codexLocalGroupsProjectHistoryPatchVersion=4')) {
    if (!projectHistory26721PostconditionsHold(text)) context.errors.push('26.721 project history: 补丁标记不完整');
    return text;
  }
  if (/codexLocalGroupsProjectHistoryPatchVersion=[123]/.test(text)) {
    let next = text.replace(/codexLocalGroupsProjectHistoryPatchVersion=[123]/, 'codexLocalGroupsProjectHistoryPatchVersion=4');
    next = next.replace('c=t??a.getDefault().getHostId()', 'c=t??a.getDefault()?.getHostId()??`local`');
    next = next.replace(/codex-local-groups-project-history-v[123]/, 'codex-local-groups-project-history-v4');
    next = next.replace('J3e([e.addAnyConversationMetaCallback(t),e.addThreadArchivedListener(t),e.addThreadUnarchivedListener(t),e.addThreadDeletedListener(t)])', 'J3e([typeof e.addAnyConversationMetaCallback===`function`?e.addAnyConversationMetaCallback(t):()=>{},typeof e.addThreadArchivedListener===`function`?e.addThreadArchivedListener(t):()=>{},typeof e.addThreadUnarchivedListener===`function`?e.addThreadUnarchivedListener(t):()=>{},typeof e.addThreadDeletedListener===`function`?e.addThreadDeletedListener(t):()=>{}])');
    next = next.replace('queryFn:async()=>{let e=a.getForHostId(c);return e==null?[]:e.listProjectConversations(o)}', projectHistory26721Query());
    if (!projectHistory26721PostconditionsHold(next)) context.errors.push('26.721 project history: 旧版升级后置条件不完整');
    return next;
  }
  const hook = 'function e6e(){return t6e(`recent-conversations`)}';
  const store = 'async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return fFe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads()';
  const manager = 'async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads()';
  if (countMatches(text, hook) !== 1 || countMatches(text, store) !== 1 || countMatches(text, manager) !== 1) {
    context.errors.push('26.721 project history: 找不到唯一原生注入点');
    return text;
  }
  let next = text.replace(store, store.replace('async listArchivedThreads()', 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations(this,e)}async listArchivedThreads()'));
  next = next.replace(manager, manager.replace('async listArchivedThreads()', 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}async listArchivedThreads()'));
  next = next.replace(hook, projectHistory26721Helper());
  if (!projectHistory26721PostconditionsHold(next)) context.errors.push('26.721 project history: 补丁后置条件不完整');
  return next;
}

function projectHistory26721Helper() {
  return 'var codexLocalGroupsProjectHistoryPatchVersion=4;function codexLocalGroupsProjectHistoryPath(e){return typeof e==`string`?e.replace(/\\\\/g,`/`).replace(/\\/+$/,``):``}function codexLocalGroupsProjectHistoryMatch(e,t){let n=codexLocalGroupsProjectHistoryPath(e);return!!n&&(n===t||n.startsWith(t+`/`))}async function codexLocalGroupsLoadProjectConversations(e,t){t=codexLocalGroupsProjectHistoryPath(t);let n=[],r=new Set,i=null;do{let a=await e.listRecentThreads({cursor:i,limit:100,background:!0}),o=a.nextCursor;if(o!=null&&r.has(o))throw Error(`App Server repeated a thread list cursor`);for(let r of a.data){let i=e.threadsById.get(r.id),a=i!=null&&oy(i).updatedAt>oy(r).updatedAt?i:r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch(s.cwd,t)&&n.push(fh(s))}o!=null&&r.add(o),i=o}while(i!=null);return n}function codexLocalGroupsMergeProjectConversations(e,t,n){let r=new Map;for(let t of e??[])r.set(t.id,t);for(let e of t??[])codexLocalGroupsProjectHistoryMatch(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values()).sort((e,t)=>(t.recencyAt??t.updatedAt??0)-(e.recencyAt??e.updatedAt??0))}function e6e(e,t,n){let r=arguments.length>0,i=t6e(`recent-conversations`),a=Xk(),o=codexLocalGroupsProjectHistoryPath(e),s=n===!0&&!!o,c=t??a.getDefault()?.getHostId()??`local`,l=Wr({enabled:s,queryKey:[`codex-local-groups-project-history-v4`,c,o],staleTime:3e4,' + projectHistory26721Query() + '}),u=l.refetch;(0,nA.useEffect)(()=>{if(!s)return;let e=null,t=()=>{e!=null&&clearTimeout(e),e=setTimeout(()=>{u()},100)},n=Y3e({appServerRegistry:a,onStoreChange:t,subscribeToManager:(e,t)=>e.getHostId()===c?J3e([typeof e.addAnyConversationMetaCallback===`function`?e.addAnyConversationMetaCallback(t):()=>{},typeof e.addThreadArchivedListener===`function`?e.addThreadArchivedListener(t):()=>{},typeof e.addThreadUnarchivedListener===`function`?e.addThreadUnarchivedListener(t):()=>{},typeof e.addThreadDeletedListener===`function`?e.addThreadDeletedListener(t):()=>{}]):()=>{}});return()=>{e!=null&&clearTimeout(e),n()}},[a,c,o,s,u]);return r?s?{...l,data:l.isError&&l.data==null?[]:codexLocalGroupsMergeProjectConversations(l.data,i.data,o)}:{...l,data:[]}:i}';
}

function projectHistory26721Query() {
  return 'queryFn:async()=>{let e=a.getForHostId(c);if(e==null)return[];if(typeof e.listProjectConversations===`function`)return e.listProjectConversations(o);if(typeof e.listAllThreads!==`function`)return[];let t=new Map;for(let n of typeof e.getRecentConversations===`function`?e.getRecentConversations():[])t.set(n.id,n);let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!py(r)||!codexLocalGroupsProjectHistoryMatch(r.cwd,o))continue;let i=go(r.id),a=t.get(i);if(a!=null){n.push(a);continue}let{createdAt:s,updatedAt:l,recencyAt:u}=oy(r);n.push(fh({conversationId:i,hostId:c,createdAt:s,updatedAt:l,recencyAt:u,title:bFe(r),cwd:r.cwd||null,gitInfo:r.gitInfo,historyMode:r.historyMode,modelProvider:r.modelProvider,parentThreadId:r.parentThreadId,mode:r.mode,threadStartKind:r.threadStartKind,source:r.source,threadSource:r.threadSource,threadRuntimeStatus:r.status}))}return n}';
}

function projectHistory26721PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsProjectHistoryPatchVersion=4') === 1
    && countMatches(text, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations(this,e)}') === 1
    && countMatches(text, 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}') === 1
    && countMatches(text, 'function e6e(e,t,n)') === 1
    && countMatches(text, 'c=t??a.getDefault()?.getHostId()??`local`') === 1
    && countMatches(text, 'codex-local-groups-project-history-v4') === 1
    && countMatches(text, 'function e6e(){return t6e(`recent-conversations`)}') === 0
    && countMatches(text, 'App Server repeated a thread list cursor') >= 1
    && text.includes('typeof e.addAnyConversationMetaCallback===`function`')
    && text.includes('typeof e.addThreadArchivedListener===`function`')
    && text.includes('typeof e.addThreadUnarchivedListener===`function`')
    && text.includes('typeof e.addThreadDeletedListener===`function`')
    && text.includes('typeof e.listProjectConversations===`function`')
    && text.includes('typeof e.listAllThreads!==`function`')
    && text.includes('l.isError&&l.data==null?[]')
    && !text.includes('Number.MAX_SAFE_INTEGER');
}

function patchProjectHistory26727(text, context) {
  if (text.includes('codexLocalGroupsProjectHistory26727PatchVersion=5')) {
    if (!projectHistory26727PostconditionsHold(text)) context.errors.push('26.727 project history: 补丁标记不完整');
    return text;
  }
  const hook = 'function Xtt(){return Ztt(`recent-conversations`)}';
  const store = 'async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return OBe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads()';
  const manager = 'async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads()';
  if (countMatches(text, hook) !== 1 || countMatches(text, store) !== 1 || countMatches(text, manager) !== 1) {
    context.errors.push('26.727 project history: 找不到唯一原生注入点');
    return text;
  }
  let next = text.replace(store, store.replace('async listArchivedThreads()', 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations26727(this,e)}async listArchivedThreads()'));
  next = next.replace(manager, manager.replace('async listArchivedThreads()', 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}async listArchivedThreads()'));
  next = next.replace(hook, projectHistory26727Helper());
  if (!projectHistory26727PostconditionsHold(next)) context.errors.push('26.727 project history: 补丁后置条件不完整');
  return next;
}

function projectHistory26727Helper() {
  return 'var codexLocalGroupsProjectHistory26727PatchVersion=5;function codexLocalGroupsProjectHistoryPath26727(e){return typeof e==`string`?e.replace(/\\\\/g,`/`).replace(/\\/+$/,``):``}function codexLocalGroupsProjectHistoryMatch26727(e,t){let n=codexLocalGroupsProjectHistoryPath26727(e);return!!n&&(n===t||n.startsWith(t+`/`))}async function codexLocalGroupsLoadProjectConversations26727(e,t){t=codexLocalGroupsProjectHistoryPath26727(t);let n=[],r=new Set,i=null;do{let a=await e.listRecentThreads({cursor:i,limit:100,background:!0}),o=a.nextCursor;if(o!=null&&r.has(o))throw Error(`App Server repeated a thread list cursor`);for(let r of a.data){let i=e.threadsById.get(r.id),a=i!=null&&Fy(i).updatedAt>Fy(r).updatedAt?i:r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch26727(s.cwd,t)&&n.push(Eh(s))}o!=null&&r.add(o),i=o}while(i!=null);return n}function codexLocalGroupsMergeProjectConversations26727(e,t,n){let r=new Map;for(let t of e??[])r.set(t.id,t);for(let e of t??[])codexLocalGroupsProjectHistoryMatch26727(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values()).sort((e,t)=>(t.recencyAt??t.updatedAt??0)-(e.recencyAt??e.updatedAt??0))}function Xtt(e,t,n){let r=arguments.length>0,i=Ztt(`recent-conversations`),a=mk(),o=codexLocalGroupsProjectHistoryPath26727(e),s=n===!0&&!!o,c=t??a.getDefault()?.getHostId()??`local`,l=Fi({enabled:s,queryKey:[`codex-local-groups-project-history-26727-v5`,c,o],staleTime:3e4,' + projectHistory26727Query() + '}),u=l.refetch;(0,bk.useEffect)(()=>{if(!s)return;let e=null,t=()=>{e!=null&&clearTimeout(e),e=setTimeout(()=>{u()},100)},n=Gtt({appServerRegistry:a,onStoreChange:t,subscribeToManager:(e,n)=>e.getHostId()===c?Wtt([typeof e.addAnyConversationMetaCallback===`function`?e.addAnyConversationMetaCallback(n):()=>{},typeof e.addThreadArchivedListener===`function`?e.addThreadArchivedListener(n):()=>{},typeof e.addThreadUnarchivedListener===`function`?e.addThreadUnarchivedListener(n):()=>{},typeof e.addThreadDeletedListener===`function`?e.addThreadDeletedListener(n):()=>{}]):()=>{}});return()=>{e!=null&&clearTimeout(e),n()}},[a,c,o,s,u]);return r?s?{...l,data:l.isError&&l.data==null?[]:codexLocalGroupsMergeProjectConversations26727(l.data,i.data,o)}:{...l,data:[]}:i}';
}

function projectHistory26727Query() {
  return 'queryFn:async()=>{let e=a.getForHostId(c);if(e==null)return[];if(typeof e.listProjectConversations===`function`)return e.listProjectConversations(o);if(typeof e.listAllThreads!==`function`)return[];let t=new Map;for(let n of typeof e.getRecentConversations===`function`?e.getRecentConversations():[])t.set(n.id,n);let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!Uy(r)||!codexLocalGroupsProjectHistoryMatch26727(r.cwd,o))continue;let i=Ko(r.id),a=t.get(i);if(a!=null){n.push(a);continue}let{createdAt:s,updatedAt:l,recencyAt:u}=Fy(r);n.push(Eh({conversationId:i,hostId:c,createdAt:s,updatedAt:l,recencyAt:u,title:IBe(r),cwd:r.cwd||null,gitInfo:r.gitInfo,historyMode:r.historyMode,modelProvider:r.modelProvider,parentThreadId:r.parentThreadId,mode:r.mode,threadStartKind:r.threadStartKind,source:r.source,threadSource:r.threadSource,threadRuntimeStatus:r.status}))}return n}';
}

function projectHistory26727PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsProjectHistory26727PatchVersion=5') === 1
    && countMatches(text, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations26727(this,e)}') === 1
    && countMatches(text, 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}') === 1
    && countMatches(text, 'function Xtt(e,t,n)') === 1
    && countMatches(text, 'function Xtt(){return Ztt(`recent-conversations`)}') === 0
    && countMatches(text, 'codex-local-groups-project-history-26727-v5') === 1
    && text.includes('c=t??a.getDefault()?.getHostId()??`local`')
    && text.includes('App Server repeated a thread list cursor')
    && text.includes('typeof e.addAnyConversationMetaCallback===`function`')
    && text.includes('typeof e.listProjectConversations===`function`')
    && text.includes('typeof e.listAllThreads!==`function`')
    && text.includes('l.isError&&l.data==null?[]')
    && !text.includes('Number.MAX_SAFE_INTEGER');
}

function patchProjectHistory265803(text, context) {
  const marker = 'codexLocalGroupsProjectHistory265803PatchVersion=1';
  if (text.includes(marker)) {
    if (!projectHistory265803PostconditionsHold(text)) context.errors.push('26.5803 project history: 补丁标记不完整');
    return text;
  }
  const hook = 'function _Xe(){return vXe(`recent-conversations`)}';
  const store = 'async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return GIe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads()';
  const manager = 'async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads()';
  if (countMatches(text, hook) !== 1 || countMatches(text, store) !== 1 || countMatches(text, manager) !== 1) {
    context.errors.push('26.5803 project history: 找不到唯一原生注入点');
    return text;
  }
  let next = text.replace(store, store.replace('async listArchivedThreads()', 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265803(this,e)}async listArchivedThreads()'));
  next = next.replace(manager, manager.replace('async listArchivedThreads()', 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}async listArchivedThreads()'));
  next = next.replace(hook, projectHistory265803Helper());
  if (!projectHistory265803PostconditionsHold(next)) context.errors.push('26.5803 project history: 补丁后置条件不完整');
  return next;
}

function projectHistory265803Helper() {
  return 'var codexLocalGroupsProjectHistory265803PatchVersion=1;function codexLocalGroupsProjectHistoryPath265803(e){return typeof e==`string`?e.replace(/\\\\/g,`/`).replace(/\\/+$/,``):``}function codexLocalGroupsProjectHistoryMatch265803(e,t){let n=codexLocalGroupsProjectHistoryPath265803(e);return!!n&&(n===t||n.startsWith(t+`/`))}async function codexLocalGroupsLoadProjectConversations265803(e,t){t=codexLocalGroupsProjectHistoryPath265803(t);let n=[],r=new Set,i=null;do{let a=await e.listRecentThreads({cursor:i,limit:100,background:!0}),o=a.nextCursor;if(o!=null&&r.has(o))throw Error(`App Server repeated a thread list cursor`);for(let r of a.data){let i=e.threadsById.get(r.id),a=i!=null&&Ob(i).updatedAt>Ob(r).updatedAt?i:r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch265803(s.cwd,t)&&n.push(Mh(s))}o!=null&&r.add(o),i=o}while(i!=null);return n}function codexLocalGroupsMergeProjectConversations265803(e,t,n){let r=new Map;for(let t of e??[])r.set(t.id,t);for(let e of t??[])codexLocalGroupsProjectHistoryMatch265803(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values()).sort((e,t)=>(t.recencyAt??t.updatedAt??0)-(e.recencyAt??e.updatedAt??0))}function _Xe(e,t,n){let r=arguments.length>0,i=vXe(`recent-conversations`),a=KE(),o=codexLocalGroupsProjectHistoryPath265803(e),s=n===!0&&!!o,c=t??a.getDefault()?.getHostId()??`local`,l=Gr({enabled:s,queryKey:[`codex-local-groups-project-history-265803-v1`,c,o],staleTime:3e4,' + projectHistory265803Query() + '}),u=l.refetch;(0,QE.useEffect)(()=>{if(!s)return;let e=null,t=()=>{e!=null&&clearTimeout(e),e=setTimeout(()=>{u()},100)},n=fXe({appServerRegistry:a,onStoreChange:t,subscribeToManager:(e,n)=>e.getHostId()===c?dXe([typeof e.addAnyConversationMetaCallback===`function`?e.addAnyConversationMetaCallback(n):()=>{},typeof e.addThreadArchivedListener===`function`?e.addThreadArchivedListener(n):()=>{},typeof e.addThreadUnarchivedListener===`function`?e.addThreadUnarchivedListener(n):()=>{},typeof e.addThreadDeletedListener===`function`?e.addThreadDeletedListener(n):()=>{}]):()=>{}});return()=>{e!=null&&clearTimeout(e),n()}},[a,c,o,s,u]);return r?s?{...l,data:l.isError&&l.data==null?[]:codexLocalGroupsMergeProjectConversations265803(l.data,i.data,o)}:{...l,data:[]}:i}';
}

function projectHistory265803Query() {
  return 'queryFn:async()=>{let e=a.getForHostId(c);if(e==null)return[];if(typeof e.listProjectConversations===`function`)return e.listProjectConversations(o);if(typeof e.listAllThreads!==`function`)return[];let t=new Map;for(let n of typeof e.getRecentConversations===`function`?e.getRecentConversations():[])t.set(n.id,n);let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!Ib(r)||!codexLocalGroupsProjectHistoryMatch265803(r.cwd,o))continue;let i=vr(r.id),a=t.get(i);if(a!=null){n.push(a);continue}let{createdAt:s,updatedAt:l,recencyAt:u}=Ob(r);n.push(Mh({conversationId:i,hostId:c,createdAt:s,updatedAt:l,recencyAt:u,title:$Ie(r,Fb),cwd:r.cwd||null,gitInfo:r.gitInfo,historyMode:r.historyMode,modelProvider:r.modelProvider,parentThreadId:r.parentThreadId,mode:r.mode,threadStartKind:r.threadStartKind,source:r.source,threadSource:r.threadSource,threadRuntimeStatus:r.status}))}return n}';
}

function projectHistory265803PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsProjectHistory265803PatchVersion=1') === 1
    && countMatches(text, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265803(this,e)}') === 1
    && countMatches(text, 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}') === 1
    && countMatches(text, 'function _Xe(e,t,n)') === 1
    && countMatches(text, 'function _Xe(){return vXe(`recent-conversations`)}') === 0
    && countMatches(text, 'codex-local-groups-project-history-265803-v1') === 1
    && text.includes('c=t??a.getDefault()?.getHostId()??`local`')
    && text.includes('App Server repeated a thread list cursor')
    && text.includes('typeof e.addAnyConversationMetaCallback===`function`')
    && text.includes('typeof e.listProjectConversations===`function`')
    && text.includes('typeof e.listAllThreads!==`function`')
    && text.includes('l.isError&&l.data==null?[]')
    && !text.includes('Number.MAX_SAFE_INTEGER');
}

function patchProjectHistory265810(text, context) {
  const marker = 'codexLocalGroupsProjectHistory265810PatchVersion=1';
  if (text.includes(marker)) {
    if (!projectHistory265810PostconditionsHold(text)) context.errors.push('26.5810 project history: 补丁标记不完整');
    return text;
  }
  const hook = 'function Ron(){return Bon(`recent-conversations`)}';
  const store = 'async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return aRt({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads()';
  const manager = 'async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads()';
  if (countMatches(text, hook) !== 1 || countMatches(text, store) !== 1 || countMatches(text, manager) !== 1) {
    context.errors.push('26.5810 project history: 找不到唯一原生注入点');
    return text;
  }
  let next = text.replace(store, store.replace('async listArchivedThreads()', 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265810(this,e)}async listArchivedThreads()'));
  next = next.replace(manager, manager.replace('async listArchivedThreads()', 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}async listArchivedThreads()'));
  next = next.replace(hook, projectHistory265810Helper());
  if (!projectHistory265810PostconditionsHold(next)) context.errors.push('26.5810 project history: 补丁后置条件不完整');
  return next;
}

function projectHistory265810Helper() {
  return 'var codexLocalGroupsProjectHistory265810PatchVersion=1;function codexLocalGroupsProjectHistoryPath265810(e){return typeof e==`string`?e.replace(/\\\\/g,`/`).replace(/\\/+$/,``):``}function codexLocalGroupsProjectHistoryMatch265810(e,t){let n=codexLocalGroupsProjectHistoryPath265810(e);return!!n&&(n===t||n.startsWith(t+`/`))}async function codexLocalGroupsLoadProjectConversations265810(e,t){t=codexLocalGroupsProjectHistoryPath265810(t);let n=[],r=new Set,i=null;do{let a=await e.listRecentThreads({cursor:i,limit:100,background:!0}),o=a.nextCursor;if(o!=null&&r.has(o))throw Error(`App Server repeated a thread list cursor`);for(let r of a.data){let i=e.threadsById.get(r.id),a=i!=null&&IF(i).updatedAt>IF(r).updatedAt?i:r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch265810(s.cwd,t)&&n.push(Lk(s))}o!=null&&r.add(o),i=o}while(i!=null);return n}function codexLocalGroupsMergeProjectConversations265810(e,t,n){let r=new Map;for(let t of e??[])r.set(t.id,t);for(let e of t??[])codexLocalGroupsProjectHistoryMatch265810(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values()).sort((e,t)=>(t.recencyAt??t.updatedAt??0)-(e.recencyAt??e.updatedAt??0))}function Ron(e,t,n){let r=arguments.length>0,i=Bon(`recent-conversations`),a=eH(),o=codexLocalGroupsProjectHistoryPath265810(e),s=n===!0&&!!o,c=t??a.getDefault()?.getHostId()??`local`,l=YO({enabled:s,queryKey:[`codex-local-groups-project-history-265810-v1`,c,o],staleTime:3e4,' + projectHistory265810Query() + '}),u=l.refetch;(0,nH.useEffect)(()=>{if(!s)return;let e=null,t=()=>{e!=null&&clearTimeout(e),e=setTimeout(()=>{u()},100)},n=kon({appServerRegistry:a,onStoreChange:t,subscribeToManager:(e,n)=>e.getHostId()===c?Oon([typeof e.addAnyConversationMetaCallback===`function`?e.addAnyConversationMetaCallback(n):()=>{},typeof e.addThreadArchivedListener===`function`?e.addThreadArchivedListener(n):()=>{},typeof e.addThreadUnarchivedListener===`function`?e.addThreadUnarchivedListener(n):()=>{},typeof e.addThreadDeletedListener===`function`?e.addThreadDeletedListener(n):()=>{}]):()=>{}});return()=>{e!=null&&clearTimeout(e),n()}},[a,c,o,s,u]);return r?s?{...l,data:l.isError&&l.data==null?[]:codexLocalGroupsMergeProjectConversations265810(l.data,i.data,o)}:{...l,data:[]}:i}';
}

function projectHistory265810Query() {
  return 'queryFn:async()=>{let e=a.getForHostId(c);if(e==null)return[];if(typeof e.listProjectConversations===`function`)return e.listProjectConversations(o);if(typeof e.listAllThreads!==`function`)return[];let t=new Map;for(let n of typeof e.getRecentConversations===`function`?e.getRecentConversations():[])t.set(n.id,n);let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!zF(r)||!codexLocalGroupsProjectHistoryMatch265810(r.cwd,o))continue;let i=r.id,a=t.get(i);if(a!=null){n.push(a);continue}let{createdAt:s,updatedAt:l,recencyAt:u}=IF(r);n.push(Lk({conversationId:i,hostId:c,createdAt:s,updatedAt:l,recencyAt:u,title:pRt(r,BF),cwd:r.cwd||null,gitInfo:r.gitInfo,historyMode:r.historyMode,modelProvider:r.modelProvider,parentThreadId:r.parentThreadId,mode:r.mode,threadStartKind:r.threadStartKind,source:r.source,threadSource:r.threadSource,threadRuntimeStatus:r.status}))}return n}';
}

function projectHistory265810PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsProjectHistory265810PatchVersion=1') === 1
    && countMatches(text, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265810(this,e)}') === 1
    && countMatches(text, 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}') === 1
    && countMatches(text, 'function Ron(e,t,n)') === 1
    && countMatches(text, 'function Ron(){return Bon(`recent-conversations`)}') === 0
    && countMatches(text, 'codex-local-groups-project-history-265810-v1') === 1
    && text.includes('c=t??a.getDefault()?.getHostId()??`local`')
    && text.includes('App Server repeated a thread list cursor')
    && text.includes('typeof e.addAnyConversationMetaCallback===`function`')
    && text.includes('typeof e.listProjectConversations===`function`')
    && text.includes('typeof e.listAllThreads!==`function`')
    && text.includes('l.isError&&l.data==null?[]')
    && !text.includes('Number.MAX_SAFE_INTEGER');
}


function patchProjectHistory265730(text, context) {
  const marker = 'codexLocalGroupsProjectHistory265730PatchVersion=1';
  if (text.includes(marker)) {
    if (!projectHistory265730PostconditionsHold(text)) context.errors.push('26.5730 project history: 补丁标记不完整');
    return text;
  }
  const hook = 'function FJe(){return IJe(`recent-conversations`)}';
  const store = 'async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return vIe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads()';
  const manager = 'async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads()';
  if (countMatches(text, hook) !== 1 || countMatches(text, store) !== 1 || countMatches(text, manager) !== 1) {
    context.errors.push('26.5730 project history: 找不到唯一原生注入点');
    return text;
  }
  let next = text.replace(store, store.replace('async listArchivedThreads()', 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265730(this,e)}async listArchivedThreads()'));
  next = next.replace(manager, manager.replace('async listArchivedThreads()', 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}async listArchivedThreads()'));
  next = next.replace(hook, projectHistory265730Helper());
  if (!projectHistory265730PostconditionsHold(next)) context.errors.push('26.5730 project history: 补丁后置条件不完整');
  return next;
}

function projectHistory265730Helper() {
  return 'var codexLocalGroupsProjectHistory265730PatchVersion=1;function codexLocalGroupsProjectHistoryPath265730(e){return typeof e==`string`?e.replace(/\\\\/g,`/`).replace(/\\/+$/,``):``}function codexLocalGroupsProjectHistoryMatch265730(e,t){let n=codexLocalGroupsProjectHistoryPath265730(e);return!!n&&(n===t||n.startsWith(t+`/`))}async function codexLocalGroupsLoadProjectConversations265730(e,t){t=codexLocalGroupsProjectHistoryPath265730(t);let n=[],r=new Set,i=null;do{let a=await e.listRecentThreads({cursor:i,limit:100,background:!0}),o=a.nextCursor;if(o!=null&&r.has(o))throw Error(`App Server repeated a thread list cursor`);for(let r of a.data){let i=e.threadsById.get(r.id),a=i!=null&&gb(i).updatedAt>gb(r).updatedAt?i:r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch265730(s.cwd,t)&&n.push(Eh(s))}o!=null&&r.add(o),i=o}while(i!=null);return n}function codexLocalGroupsMergeProjectConversations265730(e,t,n){let r=new Map;for(let t of e??[])r.set(t.id,t);for(let e of t??[])codexLocalGroupsProjectHistoryMatch265730(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values()).sort((e,t)=>(t.recencyAt??t.updatedAt??0)-(e.recencyAt??e.updatedAt??0))}function FJe(e,t,n){let r=arguments.length>0,i=IJe(`recent-conversations`),a=wD(),o=codexLocalGroupsProjectHistoryPath265730(e),s=n===!0&&!!o,c=t??a.getDefault()?.getHostId()??`local`,l=na({enabled:s,queryKey:[`codex-local-groups-project-history-265730-v1`,c,o],staleTime:3e4,' + projectHistory265730Query() + '}),u=l.refetch;(0,AD.useEffect)(()=>{if(!s)return;let e=null,t=()=>{e!=null&&clearTimeout(e),e=setTimeout(()=>{u()},100)},n=AJe({appServerRegistry:a,onStoreChange:t,subscribeToManager:(e,n)=>e.getHostId()===c?kJe([typeof e.addAnyConversationMetaCallback===`function`?e.addAnyConversationMetaCallback(n):()=>{},typeof e.addThreadArchivedListener===`function`?e.addThreadArchivedListener(n):()=>{},typeof e.addThreadUnarchivedListener===`function`?e.addThreadUnarchivedListener(n):()=>{},typeof e.addThreadDeletedListener===`function`?e.addThreadDeletedListener(n):()=>{}]):()=>{}});return()=>{e!=null&&clearTimeout(e),n()}},[a,c,o,s,u]);return r?s?{...l,data:l.isError&&l.data==null?[]:codexLocalGroupsMergeProjectConversations265730(l.data,i.data,o)}:{...l,data:[]}:i}';
}

function projectHistory265730Query() {
  return 'queryFn:async()=>{let e=a.getForHostId(c);if(e==null)return[];if(typeof e.listProjectConversations===`function`)return e.listProjectConversations(o);if(typeof e.listAllThreads!==`function`)return[];let t=new Map;for(let n of typeof e.getRecentConversations===`function`?e.getRecentConversations():[])t.set(n.id,n);let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!DIe(r)||!codexLocalGroupsProjectHistoryMatch265730(r.cwd,o))continue;let i=vt(r.id),a=t.get(i);if(a!=null){n.push(a);continue}let{createdAt:s,updatedAt:l,recencyAt:u}=gb(r);n.push(Eh({conversationId:i,hostId:c,createdAt:s,updatedAt:l,recencyAt:u,title:EIe(r),cwd:r.cwd||null,gitInfo:r.gitInfo,historyMode:r.historyMode,modelProvider:r.modelProvider,parentThreadId:r.parentThreadId,mode:r.mode,threadStartKind:r.threadStartKind,source:r.source,threadSource:r.threadSource,threadRuntimeStatus:r.status}))}return n}';
}

function projectHistory265730PostconditionsHold(text) {
  return countMatches(text, 'codexLocalGroupsProjectHistory265730PatchVersion=1') === 1
    && countMatches(text, 'async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265730(this,e)}') === 1
    && countMatches(text, 'async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}') === 1
    && countMatches(text, 'function FJe(e,t,n)') === 1
    && countMatches(text, 'function FJe(){return IJe(`recent-conversations`)}') === 0
    && countMatches(text, 'codex-local-groups-project-history-265730-v1') === 1
    && text.includes('c=t??a.getDefault()?.getHostId()??`local`')
    && text.includes('App Server repeated a thread list cursor')
    && text.includes('typeof e.addAnyConversationMetaCallback===`function`')
    && text.includes('typeof e.listProjectConversations===`function`')
    && text.includes('typeof e.listAllThreads!==`function`')
    && text.includes('l.isError&&l.data==null?[]')
    && !text.includes('Number.MAX_SAFE_INTEGER');
}

function patchAppServerManagerSignals(text, context) {
  let next = text.replace(/var codexLocalGroupsRecentInitialMeta=[\s\S]*?;var codexLocalGroupsRecentPatchVersion=2;/, '');
  const currentFilter = `return t.length?{...e,${context.cwdFilterKey}:t}:e`;
  const oldFilter = context.cwdFilterKey === 'cwd' ? 'return t.length?{...e,cwds:t}:e' : 'return t.length?{...e,cwd:t}:e';
  next = next.replace(oldFilter, currentFilter);
  next = next.replace('function codexLocalGroupsRecentThreadListParams(e){let t=codexLocalGroupsRecentProjectRoots(),n=typeof e.limit===`number`&&e.limit<200?{...e,limit:200}:e;return t.length?{...n,cwds:t}:n}', `function codexLocalGroupsRecentThreadListParams(e){let t=codexLocalGroupsRecentProjectRoots();return t.length?{...e,${context.cwdFilterKey}:t}:e}`);
  next = next.replace(/var codexLocalGroupsRecentPatchVersion=2;function codexLocalGroupsRecentCleanRoot[\s\S]*?function codexLocalGroupsRecentThreadListParams\(e\)\{return typeof e\.limit===`number`&&e\.limit<200\?\{\.\.\.e,limit:200\}:e\}/, appServerManagerSignalsHelper(context.cwdFilterKey));
  next = next.replace(/var codexLocalGroupsRecentPatchVersion=2;function codexLocalGroupsRecentThreadListParams\(e\)\{return typeof e\.limit===`number`&&e\.limit<200\?\{\.\.\.e,limit:200\}:e\}/g, appServerManagerSignalsHelper(context.cwdFilterKey));
  if (next.includes('codexLocalGroupsRecentPatchVersion=1')) {
    next = next.replace(/var codexLocalGroupsRecentInitialMeta=[\s\S]*?function codexLocalGroupsRecentThreadListParams\(e\)\{let t=codexLocalGroupsRecentProjectRoots\(\);return t\.length\?\(e=\{\.\.\.e,cwds:t\},typeof e\.limit===`number`&&e\.limit<200&&\(e\.limit=200\),e\):e\}/g, appServerManagerSignalsHelper(context.cwdFilterKey));
  }
  if (next.includes('codexLocalGroupsRecentPatchVersion=3') && !next.includes('function codexLocalGroupsMarkArchivedConversation')) {
    next = next.replace('var codexLocalGroupsRecentPatchVersion=3;', appServerManagerArchiveHelper());
  }
  if (!next.includes('codexLocalGroupsRecentPatchVersion=3')) {
    if (text.includes('async function ug(')) {
      next = replaceOnce(next, 'async function ug(', `${appServerManagerSignalsHelper(context.cwdFilterKey)}async function ug(`, context, 'app-server-manager recent helper');
    } else if (text.includes('async function Sg(')) {
      next = replaceOnce(next, 'async function Sg(', `${appServerManagerSignalsHelper(context.cwdFilterKey)}async function Sg(`, context, 'app-server-manager recent helper legacy');
    } else if (text.includes('async function bb(')) {
      next = replaceOnce(next, 'async function bb(', `${appServerManagerSignalsHelper(context.cwdFilterKey)}async function bb(`, context, 'app-server-manager recent helper current');
    } else if (text.includes('async function Gk(')) {
      next = replaceOnce(next, 'async function Gk(', `${appServerManagerSignalsHelper(context.cwdFilterKey)}async function Gk(`, context, 'app-server-manager recent helper 26.715');
    } else {
      const current = /async function ([A-Za-z_$][\w$]*)\(e,\{modelProviders:t,archived:n=!1,sourceKinds:r=[A-Za-z_$][\w$]*,useStateDbOnly:i=!1\}\)\{let a=\[\],o=async s=>/;
      const currentStateDbOnly = /async function ([A-Za-z_$][\w$]*)\(e,\{modelProviders:t,archived:n=!1,sourceKinds:r=[A-Za-z_$][\w$]*\}\)\{let i=\[\],a=async o=>/;
      if (current.test(text)) {
        next = replaceRegexOnce(next, current, (match) => `${appServerManagerSignalsHelper(context.cwdFilterKey)}${match}`, context, 'app-server-manager recent helper latest');
      } else if (currentStateDbOnly.test(text)) {
        next = replaceRegexOnce(next, currentStateDbOnly, (match) => `${appServerManagerSignalsHelper(context.cwdFilterKey)}${match}`, context, 'app-server-manager recent helper 26.721');
      } else {
        context.errors.push('app-server-manager recent helper: 找不到注入点');
        return text;
      }
    }
  }
  const allOldV2 = 'e.sendRequest(`thread/list`,{limit:200,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i})';
  const allNewV2 = 'e.sendRequest(`thread/list`,codexLocalGroupsRecentThreadListParams({limit:200,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i}))';
  const allOldV1 = 'e.sendRequest(`thread/list`,{limit:200,cursor:o,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n})';
  const allNewV1 = 'e.sendRequest(`thread/list`,codexLocalGroupsRecentThreadListParams({limit:200,cursor:o,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n}))';
  const allOldCurrent = 'let c={limit:200,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i},l=await e.sendRequest(`thread/list`,c);';
  const allNewCurrent = 'let c=codexLocalGroupsRecentThreadListParams({limit:200,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i}),l=await e.sendRequest(`thread/list`,c);';
  const allOldLatest = 'let c={limit:100,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i},l=await e.sendRequest(`thread/list`,c,{priority:`background`,source:`thread_list`});';
  const allNewLatest = 'let c=codexLocalGroupsRecentThreadListParams({limit:100,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i}),l=await e.sendRequest(`thread/list`,c,{priority:`background`,source:`thread_list`});';
  const allOld26715 = 'let s={limit:100,cursor:o,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:!0},c=await e.sendRequest(`thread/list`,s,{priority:`background`,source:`thread_list`});';
  const allNew26715 = 'let s=codexLocalGroupsRecentThreadListParams({limit:100,cursor:o,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:!0}),c=await e.sendRequest(`thread/list`,s,{priority:`background`,source:`thread_list`});';
  next = next.replace(allOldV2, allNewV2).replace(allOldV1, allNewV1);
  next = next.replace(allOldCurrent, allNewCurrent);
  next = next.replace(allOldLatest, allNewLatest);
  next = next.replace(allOld26715, allNew26715);
  const pageOldV2 = 'this.params.requestClient.sendRequest(`thread/list`,{limit:t,cursor:e,sortKey:this.recentConversationSortKey,modelProviders:null,archived:!1,sourceKinds:D,useStateDbOnly:n})';
  const pageNewV2 = 'this.params.requestClient.sendRequest(`thread/list`,codexLocalGroupsRecentThreadListParams({limit:t,cursor:e,sortKey:this.recentConversationSortKey,modelProviders:null,archived:!1,sourceKinds:D,useStateDbOnly:n}))';
  const pageOldV1 = 'this.params.requestClient.sendRequest(`thread/list`,{limit:t,cursor:e,sortKey:this.recentConversationSortKey,modelProviders:null,archived:!1,sourceKinds:te,useStateDbOnly:n})';
  const pageNewV1 = 'this.params.requestClient.sendRequest(`thread/list`,codexLocalGroupsRecentThreadListParams({limit:t,cursor:e,sortKey:this.recentConversationSortKey,modelProviders:null,archived:!1,sourceKinds:te,useStateDbOnly:n}))';
  const pageOldCurrent = 'let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:c,useStateDbOnly:n};return this.params.requestClient.sendRequest(`thread/list`,r)';
  const pageNewCurrent = 'let r=codexLocalGroupsRecentThreadListParams({limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:c,useStateDbOnly:n});return this.params.requestClient.sendRequest(`thread/list`,r)';
  const pageOldLatest = 'let i={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:p,useStateDbOnly:n},a=await this.params.requestClient.sendRequest(`thread/list`,i,r?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});';
  const pageNewLatest = 'let i=codexLocalGroupsRecentThreadListParams({limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:p,useStateDbOnly:n}),a=await this.params.requestClient.sendRequest(`thread/list`,i,r?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});';
  const pageOld26715 = 'let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:h,useStateDbOnly:!0},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});';
  const pageNew26715 = 'let r=codexLocalGroupsRecentThreadListParams({limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:h,useStateDbOnly:!0}),i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});';
  const pageOld26721 = 'let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:te,useStateDbOnly:!0},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});';
  const pageNew26721 = 'let r=codexLocalGroupsRecentThreadListParams({limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:te,useStateDbOnly:!0}),i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});';
  const archiveOld = 'e.removeConversationFromCache(t),e.dispatchMessageFromView(`thread-archived`,{hostId:e.hostId,conversationId:t,cwd:n})';
  const archiveNew = 'codexLocalGroupsMarkArchivedConversation(t),e.removeConversationFromCache(t),e.dispatchMessageFromView(`thread-archived`,{hostId:e.hostId,conversationId:t,cwd:n})';
  const archiveOld26721 = 'e.removeConversationFromCache(t),e.broadcastThreadArchived({hostId:e.hostId,conversationId:t,cwd:n})';
  const archiveNew26721 = 'codexLocalGroupsMarkArchivedConversation(t),e.removeConversationFromCache(t),e.broadcastThreadArchived({hostId:e.hostId,conversationId:t,cwd:n})';
  if (!next.includes(archiveNew) && next.includes(archiveOld)) {
    next = replaceOnce(next, archiveOld, archiveNew, context, 'app-server-manager local archive tombstone');
  }
  if (!next.includes(archiveNew26721) && next.includes(archiveOld26721)) {
    next = replaceOnce(next, archiveOld26721, archiveNew26721, context, 'app-server-manager local archive tombstone current');
  }
  if (!next.includes(pageNewV2) && !next.includes(pageNewV1) && !next.includes(pageNew26721)) {
    if (next.includes(pageOldV2)) {
      next = replaceOnce(next, pageOldV2, pageNewV2, context, 'app-server-manager paged recent limit');
    } else if (next.includes(pageOldV1)) {
      next = replaceOnce(next, pageOldV1, pageNewV1, context, 'app-server-manager paged recent limit legacy');
    } else if (next.includes(pageOldCurrent)) {
      next = replaceOnce(next, pageOldCurrent, pageNewCurrent, context, 'app-server-manager paged recent limit current');
    } else if (next.includes(pageOldLatest)) {
      next = replaceOnce(next, pageOldLatest, pageNewLatest, context, 'app-server-manager paged recent limit latest');
    } else if (next.includes(pageOld26715)) {
      next = replaceOnce(next, pageOld26715, pageNew26715, context, 'app-server-manager paged recent limit 26.715');
    } else if (next.includes(pageOld26721)) {
      next = replaceOnce(next, pageOld26721, pageNew26721, context, 'app-server-manager paged recent limit 26.721');
    }
  }
  return next;
}


function patchRequest(text, context) {
  let next = text;
  const v1Helper = 'var codexLocalGroupsRequestPatchVersion=1;function codexLocalGroupsIsDisabledUsageRequest(e){return typeof e==`string`&&e.startsWith(`/wham/usage`)}';
  const v2Helper = [
    'var codexLocalGroupsRequestPatchVersion=2;',
    'function codexLocalGroupsDisabledRequestPath(e){if(typeof e!=`string`)return ``;try{return new URL(e,`https://chatgpt.com`).pathname}catch{return e.split(`?`)[0]}}',
    'function codexLocalGroupsIsDisabledUsageRequest(e){let t=codexLocalGroupsDisabledRequestPath(e);return t.startsWith(`/wham/usage`)||t.startsWith(`/ces/v1/rgstr`)||t.startsWith(`/backend-api/plugins/featured`)}',
  ].join('');
  if (next.includes(v1Helper)) {
    next = replaceOnce(next, v1Helper, v2Helper, context, 'request usage helper upgrade');
  }
  if (!next.includes('codexLocalGroupsRequestPatchVersion=2')) {
    if (next.includes('var p=class')) {
      next = replaceOnce(next, 'var p=class', `${v2Helper}var p=class`, context, 'request usage helper');
    } else if (next.includes('var XCe,pm,mm,hm=')) {
      next = replaceOnce(next, 'var XCe,pm,mm,hm=', `${v2Helper}var XCe,pm,mm,hm=`, context, 'request usage helper 26.721');
    } else if (/[A-Za-z_$][\w$]*=class\{defaults;constructor\(e=\{\}\)\{this\.defaults=e\}getRequestTarget/.test(next)) {
      next = replaceRegexOnce(next, /([A-Za-z_$][\w$]*)=class\{defaults;constructor\(e=\{\}\)\{this\.defaults=e\}getRequestTarget/, `${v2Helper}$1=class{defaults;constructor(e={}){this.defaults=e}getRequestTarget`, context, 'request usage helper current');
    } else {
      next = replaceRegexOnce(next, /var ([A-Za-z_$][\w$]*)=class\{/, `${v2Helper}var $1=class{`, context, 'request usage helper current');
    }
  }
  const oldText = 'async makeRequest(o,s,c){let{headers:l,url:u}=this.getRequestTarget(s,c);';
  const newText = 'async makeRequest(o,s,c){if(codexLocalGroupsIsDisabledUsageRequest(s))return null;let{headers:l,url:u}=this.getRequestTarget(s,c);';
  if (!next.includes(newText) && !/async makeRequest\([^)]*\)\{if\(codexLocalGroupsIsDisabledUsageRequest\(/.test(next)) {
    if (next.includes(oldText)) {
      next = replaceOnce(next, oldText, newText, context, 'request disable wham usage');
    } else {
      next = replaceRegexOnce(next, /async makeRequest\(([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*),([A-Za-z_$][\w$]*)\)\{let\{headers:([A-Za-z_$][\w$]*),url:([A-Za-z_$][\w$]*)\}=this\.getRequestTarget\(\2,\3\);/, 'async makeRequest($1,$2,$3){if(codexLocalGroupsIsDisabledUsageRequest($2))return null;let{headers:$4,url:$5}=this.getRequestTarget($2,$3);', context, 'request disable wham usage current');
    }
  }
  return next;
}

function patchLocalTitle(text, context) {
  let next = replaceMetadataLiteral(text, EMPTY_METADATA, 'var codexLocalGroupsInitialMeta=');
  if (next.includes('codexLocalGroupsWebviewPatchVersion=7')) {
    return patchLocalTitleCurrentUsage(next, context);
  }
  if (next.includes('codexLocalGroupsLocalTitlePatchVersion=6')) {
    return upgradeMetadataMergeSnippet(next);
  }
  if (next.includes('var codexLocalGroupsInitialMeta=')) {
    return replaceBlock(next, 'var codexLocalGroupsInitialMeta=', 'var s=', `${localTitleHelper(EMPTY_METADATA)}var s=`, context, 'local title metadata helper upgrade');
  }
  if (next.includes('var codexTitleAliasMap=')) {
    return replaceBlock(next, 'var codexTitleAliasMap=', 'var s=', `${localTitleHelper(EMPTY_METADATA)}var s=`, context, 'local title metadata helper');
  }
  if (next.includes('var c=t(') && next.includes('title:t(r,e)')) {
    next = replaceOnce(next, 'var c=t(', `${localTitleHelper(EMPTY_METADATA)}var c=t(`, context, 'local title metadata helper latest');
    return replaceOnce(next, 'title:t(r,e)', 'title:codexTitleAliasFor(e)??t(r,e)', context, 'local title alias usage latest');
  }
  if (next.includes('var c=e(t,') && !next.includes('title:codexTitleAliasFor(e)??')) {
    next = replaceOnce(next, 'var c=e(t,', `${localTitleHelper(EMPTY_METADATA)}var c=e(t,`, context, 'local title metadata helper latest v2');
    return replaceRegexOnce(next, /title:t\(([A-Za-z_$][\w$]*),e\)/, 'title:codexTitleAliasFor(e)??t($1,e)', context, 'local title alias usage latest v2');
  }
  if (next.includes('title:t(') && next.includes('turns:t(')) {
    next = replaceRegexOnce(next, /([A-Za-z_$][\w$]*)=Ko\(Q,\(e,\{get:t\}\)=>e==null\?null:/, `${localTitleHelper(EMPTY_METADATA)}$1=Ko(Q,(e,{get:t})=>e==null?null:`, context, 'local title metadata helper current');
    return patchLocalTitleCurrentUsage(next, context);
  }
  return text;
}

function patchLocalTitleCurrentUsage(text, context) {
  if (text.includes('title:codexTitleAliasFor(e)??t(')) {
    return text;
  }
  return replaceRegexOnce(text, /ETe\(\{id:e,title:t\(([A-Za-z_$][\w$]*),e\),turns:t\(/, 'ETe({id:e,title:codexTitleAliasFor(e)??t($1,e),turns:t(', context, 'local title alias usage current');
}

function replaceMetadataLiteral(text, metadata, start) {
  const markerIndex = text.indexOf(start);
  if (markerIndex < 0) return text;
  const from = markerIndex + start.length;
  const jsonStart = text.indexOf('{', from);
  if (jsonStart < 0) return text;
  let depth = 0, inString = false, escaped = false;
  for (let index = jsonStart; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      } else if (char === '\\') {
        escaped = true;
        continue;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return `${text.slice(0, from)}${metadataLiteral(metadata)}${text.slice(index + 1)}`;
    }
  }
  return text;
}

function replaceToMarker(text, start, endMarker, replacement, context, label) {
  const startCount = countMatches(text, start);
  if (startCount !== 1) {
    if (context) {
      context.errors.push(`${label}: 起始标记期望 1 处匹配，实际 ${startCount} 处`);
      return text;
    }
    return null;
  }
  const from = text.indexOf(start);
  const endCount = countMatches(text.slice(from + start.length), endMarker);
  if (endCount !== 1) {
    if (context) {
      context.errors.push(`${label}: 结束标记期望 1 处匹配，实际 ${endCount} 处`);
      return text;
    }
    return null;
  }
  const to = text.indexOf(endMarker, from);
  return `${text.slice(0, from)}${replacement}${text.slice(to)}`;
}

function replaceOnce(text, oldText, newText, context, label) {
  const count = countMatches(text, oldText);
  if (count !== 1) {
    context.errors.push(`${label}: 期望 1 处匹配，实际 ${count} 处`);
    return text;
  }
  return text.replace(oldText, newText);
}

function replaceRegexOnce(text, regex, replacement, context, label) {
  const count = countRegexMatches(text, regex);
  if (count !== 1) {
    context.errors.push(`${label}: 期望 1 处匹配，实际 ${count} 处`);
    return text;
  }
  return text.replace(regex, replacement);
}

function replaceBlock(text, start, end, replacement, context, label) {
  const startCount = countMatches(text, start);
  if (startCount !== 1) {
    context.errors.push(`${label}: 起始标记期望 1 处匹配，实际 ${startCount} 处`);
    return text;
  }
  const from = text.indexOf(start);
  if (from < 0) {
    context.errors.push(`${label}: 找不到起始标记`);
    return text;
  }
  const endCount = countMatches(text.slice(from + start.length), end);
  if (endCount !== 1) {
    context.errors.push(`${label}: 结束标记期望 1 处匹配，实际 ${endCount} 处`);
    return text;
  }
  const to = text.indexOf(end, from);
  if (to < 0) {
    context.errors.push(`${label}: 找不到结束标记`);
    return text;
  }
  return `${text.slice(0, from)}${replacement}${text.slice(to + end.length)}`;
}

function countMatches(text, value) {
  return value ? text.split(value).length - 1 : 0;
}

function countRegexMatches(text, regex) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const matcher = new RegExp(regex.source, flags);
  let count = 0;
  let match;
  while ((match = matcher.exec(text)) !== null) {
    count += 1;
    if (match[0] === '') {
      matcher.lastIndex += 1;
    }
  }
  return count;
}

function symbolBefore(text, start, end) {
  const from = text.indexOf(start);
  if (from < 0) {
    return null;
  }
  const to = text.indexOf(end, from + start.length);
  return to < 0 ? null : text.slice(from + start.length, to);
}

function symbolAfter(text, start, end) {
  const pattern = new RegExp(`${escapeRegex(start)}([A-Za-z_$][\\w$]*)${escapeRegex(end)}`);
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function assertNodeExists(nodePath) {
  if (nodePath !== 'node' && !fs.existsSync(nodePath)) {
    throw new Error(`Node 不存在：${nodePath}`);
  }
}

function findAsset(dir, prefix, suffix, context) {
  const matches = fs.readdirSync(dir).filter((name) => name.startsWith(prefix) && name.endsWith(suffix));
  if (matches.length !== 1) {
    context.errors.push(`无法唯一定位 ${prefix}*${suffix}，候选数量：${matches.length}`);
    return null;
  }
  return matches[0];
}

function findVscodeMessengerAlias(text) {
  if (text.includes(' as codexLocalGroupsMessengerImport')) {
    return 'codexLocalGroupsMessengerImport';
  }
  const imports = text.matchAll(/import\{([^}]+)\}from"\.\/vscode-api-[^"]+\.js";/g);
  for (const match of imports) {
    const alias = match[1].match(/(?:^|,)f as ([A-Za-z_$][\w$]*)/);
    if (alias) {
      return alias[1];
    }
  }
  return null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function metadataLiteral(metadata) {
  return JSON.stringify(normalizeMetadata(metadata, 'metadata'));
}

function metadataMergeOldSnippet() {
  return 'function codexLocalGroupsMergeMeta(e,t){let n={version:1,updatedAtMs:Math.max(e.updatedAtMs??0,t.updatedAtMs??0),conversations:{...(e.conversations??{})},pendingGroup:e.pendingGroup,migrations:e.migrations},r=(t.updatedAtMs??0)>(e.updatedAtMs??0);r&&(n.pendingGroup=t.pendingGroup);for(let[i,a]of Object.entries(t.conversations??{})){let o=n.conversations[i];n.conversations[i]=!o||(a.updatedAtMs??0)>(o.updatedAtMs??0)?a:o}return n}';
}

function metadataMergePreviousSnippet() {
  return 'function codexLocalGroupsMergeMeta(e,t){let n={version:1,updatedAtMs:Math.max(e.updatedAtMs??0,t.updatedAtMs??0),conversations:{...(e.conversations??{})},pendingGroup:e.pendingGroup,migrations:e.migrations},r=(t.updatedAtMs??0)>(e.updatedAtMs??0);r&&(n.pendingGroup=t.pendingGroup);for(let[i,a]of Object.entries(t.conversations??{})){let o=n.conversations[i];n.conversations[i]=!o||(a.updatedAtMs??0)>(o.updatedAtMs??0)?{...(o??{}),...a,title:a.title??o?.title}:o}return n}';
}

function metadataMergeSnippet() {
  return 'function codexLocalGroupsMergeMeta(e,t){let n={version:1,updatedAtMs:Math.max(e.updatedAtMs??0,t.updatedAtMs??0),conversations:{...(e.conversations??{})},archivedGroups:{...(e.archivedGroups??{})},archivedConversations:{...(e.archivedConversations??{})},pendingGroup:e.pendingGroup,migrations:e.migrations},r=(t.updatedAtMs??0)>(e.updatedAtMs??0);r&&(n.pendingGroup=t.pendingGroup);for(let[i,a]of Object.entries(t.archivedGroups??{})){let o=n.archivedGroups[i];n.archivedGroups[i]=!o||(a.archivedAtMs??0)>(o.archivedAtMs??0)?a:o}for(let[i,a]of Object.entries(t.archivedConversations??{})){let o=n.archivedConversations[i];n.archivedConversations[i]=!o||(a.archivedAtMs??0)>(o.archivedAtMs??0)?a:o,delete n.conversations[i]}for(let[i,a]of Object.entries(t.conversations??{})){if(n.archivedConversations[i])continue;let o=n.conversations[i];n.conversations[i]=!o||(a.updatedAtMs??0)>(o.updatedAtMs??0)?{...(o??{}),...a,title:a.title??o?.title}:o}return n}';
}

function upgradeMetadataMergeSnippet(text) {
  return text.replace(metadataMergeOldSnippet(), metadataMergeSnippet())
    .replace(metadataMergePreviousSnippet(), metadataMergeSnippet());
}

function metadataRowSnippet(messenger) {
  return `function codexLocalGroupsMetadataRow(e,t,n){let r=codexLocalGroupsLocalTitle(e)??e.conversation.title??String(e.conversation.id),i=e.conversation.updatedAt?codexRecentTaskDateLabel(new Date(e.conversation.updatedAt)):\`\`,a=t===e.conversation.id,o=codexLocalGroupsProjectRoot(e)??\`\`;return(0,Q.jsxs)(\`div\`,{className:\`codex-local-groups-conversation-row relative\`,style:{paddingRight:\`240px\`},children:[(0,Q.jsxs)(\`button\`,{type:\`button\`,className:\`mx-[var(--padding-row-x)] flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-token-list-hover-background\`+(a?\` bg-token-list-hover-background\`:\`\`),title:r,onClick:s=>{s.preventDefault(),s.stopPropagation();try{codexLocalGroupsMessenger.dispatchHostMessage({type:\`navigate-to-route\`,path:\`/local/\`+e.conversation.id})}catch{}n()},children:[(0,Q.jsx)(\`span\`,{className:\`min-w-0 truncate\`,children:r}),(0,Q.jsx)(\`span\`,{className:\`shrink-0 text-xs text-token-input-placeholder-foreground\`,children:i})]},\`metadata-row-\`+e.key),(0,Q.jsxs)(\`div\`,{className:\`codex-local-groups-inline-actions absolute top-1 z-20 flex shrink-0 gap-1 text-xs text-token-input-placeholder-foreground\`,style:{right:\`var(--padding-row-x)\`},children:[(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`rounded px-2 py-0.5 hover:bg-token-list-hover-background hover:text-token-foreground\`,title:\`设置本地标题\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,\`打开中…\`),codexLocalGroupsPromptTitle(e.conversation.id,r,o)},children:\`设置标题\`}),(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`rounded px-2 py-0.5 hover:bg-token-list-hover-background hover:text-token-foreground\`,title:\`设置需求分组\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,\`打开中…\`),codexLocalGroupsPromptGroup(e.conversation.id,o)},children:\`设置分组\`}),(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`rounded px-2 py-0.5 hover:bg-token-list-hover-background hover:text-token-foreground\`,title:\`归档这条本地补充会话\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,\`已归档\`),codexLocalGroupsArchiveConversation(e.conversation.id)},children:\`归档\`})]})]},\`metadata-actions-\`+e.key)}`;
}

function extensionHostHelper(pathName = 'Dle', init = 'typeof $t=="function"&&$t();') {
  return `var ${pathName}=require(\"path\"),codexLocalGroupsFs=require(\"fs\"),codexLocalGroupsPatchVersion=17,codexLocalGroupsMetaPath=\"/root/.codex/codex-vscode-conversation-meta.json\",codexLocalGroupsOldTitlesPath=\"/root/.codex/codex-vscode-conversation-titles.json\",codexLocalGroupsPatchTimer=null,codexLocalGroupsAutoPatchWarned=!1;function codexLocalGroupsReportError(e,t){let r=require(\"vscode\"),n=t&&t.message?t.message:String(t);console.error(e,n,t);r.window?.showWarningMessage?.(\"Codex Local Groups: \"+e+\" 失败：\"+n)}function codexLocalGroupsReportAutoPatchUnavailable(e){if(codexLocalGroupsAutoPatchWarned)return;codexLocalGroupsAutoPatchWarned=!0;let r=e&&e.message?String(e.message):String(e);console.warn("Codex Local Groups 自动 patch 暂不可用",r,e)}function codexLocalGroupsSchedulePatch(e){return!1}function codexLocalGroupsEmptyMeta(){return{version:1,conversations:{},migrations:{oldTitlesImported:!0}}}function codexLocalGroupsReadJson(e,t){try{let r=JSON.parse(codexLocalGroupsFs.readFileSync(e,\"utf8\"));return r&&typeof r==\"object\"&&!Array.isArray(r)?r:t}catch{return t}}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsReadJson(codexLocalGroupsMetaPath,null);if(!e){let t=codexLocalGroupsReadJson(codexLocalGroupsOldTitlesPath,{}),r={version:1,conversations:{},migrations:{oldTitlesImported:!0}};for(let[n,o]of Object.entries(t))typeof o==\"string\"&&o.trim()&&(r.conversations[String(n)]={title:o.trim()});return r}return e.conversations&&typeof e.conversations==\"object\"?e:codexLocalGroupsEmptyMeta()}function codexTitleAliasFor(e){let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.title;return typeof r==\"string\"&&r.trim().length>0?r.trim():null}function codexLocalGroupsProjectRootFor(e){let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return typeof r==\"string\"&&r.trim().length>0?codexLocalGroupsCleanProjectRoot(r):null}function codexLocalGroupsCleanGroupName(e){let t=String(e??\"\");try{t=t.normalize(\"NFC\")}catch{}return t.replace(/[\\s\\u3000]+/g,\" \").trim()}function codexLocalGroupsCleanProjectRoot(e){return String(e??\"\").replace(/\\\\/g,\"/\").replace(/\\/+$/,\"\").trim()}function codexLocalGroupsArchivedGroupKey(e,t){return JSON.stringify([codexLocalGroupsCleanProjectRoot(e),codexLocalGroupsCleanGroupName(t)])}function codexLocalGroupsGroupArchived(e,t,r){return!!r.archivedGroups?.[codexLocalGroupsArchivedGroupKey(e,t)]}function codexLocalGroupsExistingGroups(e){let t=codexLocalGroupsCleanProjectRoot(e),r=codexLocalGroupsReadMeta(),n=new Map;for(let o of Object.values(r.conversations??{})){if(!o||typeof o!=\"object\")continue;let i=codexLocalGroupsCleanGroupName(o.group);if(!i)continue;let a=codexLocalGroupsCleanProjectRoot(o.projectRoot);if(t&&a&&a!==t)continue;if(codexLocalGroupsGroupArchived(a,i,r))continue;n.set(i,i)}return Array.from(n.values()).sort((e,t)=>e.localeCompare(t))}function codexLocalGroupsWriteFile(e,t){let r=e+\".\"+process.pid+\".\"+Date.now()+\".tmp\";codexLocalGroupsFs.writeFileSync(r,t);let n=codexLocalGroupsFs.openSync(r,\"r\");try{codexLocalGroupsFs.fsyncSync(n)}finally{codexLocalGroupsFs.closeSync(n)}codexLocalGroupsFs.renameSync(r,e)}function codexLocalGroupsWriteMeta(e){e.version=1,e.updatedAtMs=Date.now(),e.migrations||(e.migrations={oldTitlesImported:!0}),codexLocalGroupsFs.mkdirSync(${pathName}.dirname(codexLocalGroupsMetaPath),{recursive:!0});codexLocalGroupsWriteFile(codexLocalGroupsMetaPath,JSON.stringify(e,null,2)+String.fromCharCode(10))}function codexLocalGroupsMergeConversation(e){let r=codexLocalGroupsReadMeta();r.version=1,r.conversations&&typeof r.conversations==\"object\"||(r.conversations={});let n=String(e.conversationId??\"\");if(!n)return r;let o=r.conversations[n]&&typeof r.conversations[n]==\"object\"?r.conversations[n]:{};typeof e.title==\"string\"?(e.title.trim()?o.title=e.title.trim():delete o.title):0;typeof e.group==\"string\"?(e.group=codexLocalGroupsCleanGroupName(e.group),e.group?o.group=e.group:delete o.group):0;typeof e.projectRoot==\"string\"&&(e.projectRoot=codexLocalGroupsCleanProjectRoot(e.projectRoot),e.projectRoot&&(o.projectRoot=e.projectRoot));o.updatedAtMs=Date.now(),r.conversations[n]=o;return r}function codexLocalGroupsInputBox(e,t,r){let n=require(\"vscode\");n.window.showInputBox({title:e,prompt:e,value:t??\"\",ignoreFocusOut:!0}).then(o=>{o!=null&&r(o,n)},o=>codexLocalGroupsReportError(e,o))}function codexLocalGroupsAfterSave(e){e.window.showInformationMessage(\"Codex Local Groups: 已保存。\")}function codexLocalGroupsSavePromptGroup(e,t,r,n,o){let i=codexLocalGroupsMergeConversation({conversationId:e,projectRoot:t,group:r});codexLocalGroupsWriteMeta(i);try{n?.postMessage?.({type:\"codex-local-groups\",action:\"metadataSaved\",metadata:i})}catch{}codexLocalGroupsAfterSave(o)}function codexLocalGroupsPromptGroupPick(e,t,r,n){let o=require(\"vscode\"),i=codexLocalGroupsCleanProjectRoot(t),a=codexLocalGroupsCleanGroupName(r),s=()=>codexLocalGroupsInputBox(\"新建需求分组\",a,(r,o)=>{let s=codexLocalGroupsCleanGroupName(r);s&&codexLocalGroupsSavePromptGroup(e,i,s,n,o)}),c=codexLocalGroupsExistingGroups(i);if(!c.length){s();return}let l=c.map(e=>({label:e,group:e,description:e===a?\"当前分组\":\"\"}));l.push({label:\"新建分组...\",action:\"new\"}),l.push({label:\"清除分组，归入未分组\",action:\"clear\"}),o.window.showQuickPick(l,{title:\"设置需求分组\",placeHolder:\"选择已有分组，或新建分组\",ignoreFocusOut:!0}).then(r=>{if(!r)return;if(r.action===\"new\"){s();return}if(r.action===\"clear\"){codexLocalGroupsSavePromptGroup(e,i,\"\",n,o);return}codexLocalGroupsSavePromptGroup(e,i,r.group,n,o)},e=>codexLocalGroupsReportError(\"设置需求分组\",e))}function codexLocalGroupsPromptConversation(e,t){let r=String(e.conversationId??\"\");if(!r)return;let n=codexLocalGroupsReadMeta().conversations?.[r]??{},o=e.action===\"promptConversationTitle\";if(!o){codexLocalGroupsPromptGroupPick(r,String(e.projectRoot??\"\"),typeof n.group==\"string\"?n.group:\"\",t);return}let i=typeof n.title==\"string\"?n.title:String(e.title??\"\");codexLocalGroupsInputBox(\"设置本地标题\",i,(i,a)=>{let s=codexLocalGroupsMergeConversation({conversationId:r,projectRoot:String(e.projectRoot??\"\"),title:i});codexLocalGroupsWriteMeta(s);try{t?.postMessage?.({type:\"codex-local-groups\",action:\"metadataSaved\",metadata:s})}catch{}codexLocalGroupsAfterSave(a)})}function codexLocalGroupsPromptNewGroup(e,t){let r=codexLocalGroupsCleanProjectRoot(e.projectRoot);if(!r)return;codexLocalGroupsInputBox(\"新建需求分组\",\"\",(n,o)=>{let i=codexLocalGroupsCleanGroupName(n);if(!i)return;let a=Date.now(),s=codexLocalGroupsReadMeta();s.pendingGroup={projectRoot:r,group:i,startedAtMs:a};codexLocalGroupsWriteMeta(s);try{t?.postMessage?.({type:\"codex-local-groups\",action:\"metadataSaved\",metadata:s})}catch{}codexLocalGroupsSchedulePatch(o);setTimeout(()=>{o.commands.executeCommand(\"chatgpt.newChat\").then(()=>{},c=>codexLocalGroupsReportError(\"新建 Codex 会话\",c))},50)})}function codexLocalGroupsHandleWebviewMessage(e,t){try{if(!e||e.type!==\"codex-local-groups\")return!1;if((e.action===\"promptConversationTitle\"||e.action===\"promptConversationGroup\"||e.action===\"promptNewGroup\"||e.action===\"getMetadata\")&&!t)return!1;if(e.action===\"promptConversationTitle\"||e.action===\"promptConversationGroup\"){codexLocalGroupsPromptConversation(e,t);return!0}if(e.action===\"promptNewGroup\"){codexLocalGroupsPromptNewGroup(e,t);return!0}let r=codexLocalGroupsReadMeta();if(e.action===\"getMetadata\"){try{t?.postMessage?.({type:\"codex-local-groups\",action:\"metadataSaved\",metadata:r})}catch{}return!0}if(e.action===\"saveConversationMeta\")r=codexLocalGroupsMergeConversation(e);else if(e.action===\"archiveConversationMeta\"){let n=String(e.conversationId??\"\");if(n){r.archivedConversations||(r.archivedConversations={}),r.archivedConversations[n]={archivedAtMs:Date.now()},r.conversations&&delete r.conversations[n]}}else if(e.action===\"setPendingGroup\"||e.action===\"newConversationInGroup\"){let n=codexLocalGroupsCleanProjectRoot(e.projectRoot),o=codexLocalGroupsCleanGroupName(e.group);n&&o?r.pendingGroup={projectRoot:n,group:o,startedAtMs:Number(e.startedAtMs)||Date.now()}:delete r.pendingGroup}else if(e.action===\"resetPendingGroup\")delete r.pendingGroup;else return!0;codexLocalGroupsWriteMeta(r);let n=require(\"vscode\");codexLocalGroupsSchedulePatch(n);e.action===\"newConversationInGroup\"&&n.commands.executeCommand(\"chatgpt.newChat\").then(()=>{},t=>codexLocalGroupsReportError(\"新建 Codex 会话\",t));return!0}catch(t){codexLocalGroupsReportError(\"metadata 保存\",t);return!0}}${init}`;
}

function webviewHelper(metadata, messenger) {
  return `var codexLocalGroupsInitialMeta=${metadataLiteral(metadata)};var codexLocalGroupsWebviewPatchVersion=7;var codexLocalGroupsMessenger=${messenger};${metadataMergeSnippet()}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsInitialMeta;try{let t=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`null\`);t&&typeof t==\`object\`&&!Array.isArray(t)&&(e=codexLocalGroupsMergeMeta(e,t))}catch{}return e&&typeof e==\`object\`?e:{version:1,conversations:{}}}function codexLocalGroupsStoreMeta(e,t){try{e.updatedAtMs=Date.now(),localStorage.setItem(\`codex-local-groups-meta-v1\`,JSON.stringify(e)),t||window.dispatchEvent(new Event(\`codex-local-groups-refresh\`))}catch{}}function codexTitleAliasFor(e){let t=codexLocalGroupsReadMeta().conversations?.[String(e)]?.title;return typeof t==\`string\`&&t.trim().length>0?t.trim():null}function codexLocalGroupsSaveConversationMeta(e,t,n,r){let i=codexLocalGroupsReadMeta();i.conversations||(i.conversations={});let a=i.conversations[String(e)]??{};t!=null&&(t.trim()?a.title=t.trim():delete a.title),n!=null&&(n.trim()?a.group=n.trim():delete a.group),r&&r.trim()&&(a.projectRoot=r.trim()),a.updatedAtMs=Date.now(),i.conversations[String(e)]=a,codexLocalGroupsStoreMeta(i);try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`saveConversationMeta\`,conversationId:String(e),title:a.title??\`\`,group:a.group??\`\`,projectRoot:a.projectRoot??\`\`})}catch{}}function codexLocalGroupsArchiveConversation(e){let t=String(e??\`\`);if(!t)return;let n=codexLocalGroupsReadMeta();n.archivedConversations||(n.archivedConversations={}),n.archivedConversations[t]={archivedAtMs:Date.now()},n.conversations&&delete n.conversations[t],codexLocalGroupsStoreMeta(n);try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`archiveConversationMeta\`,conversationId:t})}catch{}}function codexLocalGroupsSetBusy(e,t){try{let n=String(e.currentTarget.textContent||\`\`);e.currentTarget.textContent=t,setTimeout(()=>{e.currentTarget&&(e.currentTarget.textContent=n)},1200)}catch{}}function codexLocalGroupsPromptTitle(e,t,n){try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`promptConversationTitle\`,conversationId:String(e),title:t??\`\`,projectRoot:n??\`\`})}catch{}}function codexLocalGroupsPromptGroup(e,t){try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`promptConversationGroup\`,conversationId:String(e),projectRoot:t??\`\`})}catch{}}${webviewMetadataSync(messenger)}`;
}

function webviewMetadataSync(messenger) {
  return `try{window.__codexLocalGroupsHostListener||(window.__codexLocalGroupsHostListener=!0,window.addEventListener(\`message\`,e=>{let t=e.data;t?.type===\`codex-local-groups\`&&t.action===\`metadataSaved\`&&t.metadata&&typeof t.metadata===\`object\`&&codexLocalGroupsStoreMeta(codexLocalGroupsMergeMeta(t.metadata,codexLocalGroupsReadMeta()))}));window.__codexLocalGroupsMetadataRequested||(${messenger}.dispatchMessage(\`codex-local-groups\`,{action:\`getMetadata\`}),window.__codexLocalGroupsMetadataRequested=!0)}catch{}`;
}

function appServerManagerSignalsHelper(cwdFilterKey = 'cwds') {
  return `${appServerManagerArchiveHelper()}function codexLocalGroupsRecentCleanRoot(e){return String(e??\`\`).replace(/\\\\/g,\`/\`).replace(/\\/+$/,\`\`).trim()}function codexLocalGroupsRecentProjectRoots(){try{let e=codexLocalGroupsRecentCleanRoot(localStorage.getItem(\`codex-local-groups-current-root-v1\`));return e?[e]:[]}catch{return[]}}function codexLocalGroupsRecentThreadListParams(e){let t=codexLocalGroupsRecentProjectRoots();return t.length?{...e,${cwdFilterKey}:t}:e}`;
}

function appServerManagerArchiveHelper() {
  return `var codexLocalGroupsRecentPatchVersion=3;function codexLocalGroupsMarkArchivedConversation(e){try{let t=String(e??\`\`);if(!t)return;let n=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`{}\`);n&&typeof n==\`object\`&&!Array.isArray(n)||(n={version:1,conversations:{}}),n.version=1,n.conversations&&delete n.conversations[t],n.archivedConversations||(n.archivedConversations={}),n.archivedConversations[t]={archivedAtMs:Date.now()},n.updatedAtMs=Date.now(),localStorage.setItem(\`codex-local-groups-meta-v1\`,JSON.stringify(n)),window.dispatchEvent(new Event(\`codex-local-groups-refresh\`))}catch{}}`;
}

function localTitleHelper(metadata) {
  return `var codexLocalGroupsInitialMeta=${metadataLiteral(metadata)};var codexLocalGroupsLocalTitlePatchVersion=6;${metadataMergeSnippet()}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsInitialMeta;try{let t=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`null\`);t&&typeof t==\`object\`&&!Array.isArray(t)&&(e=codexLocalGroupsMergeMeta(e,t))}catch{}return e&&typeof e==\`object\`?e:{version:1,conversations:{}}}function codexTitleAliasFor(e){let t=codexLocalGroupsReadMeta().conversations?.[String(e)]?.title;return typeof t==\`string\`&&t.trim().length>0?t.trim():null}`;
}

function safeHeaderHelper(metadata, messenger, kindFnName) {
  let next = stripHeaderMetadataRows(patchHeaderPendingItems(headerHelper(metadata, messenger, kindFnName)));
  const reactRuntime = kindFnName === 'Bn' ? 'Gn' : kindFnName === 'zn' ? 'Wn' : kindFnName === 'Sn' ? 'Dn' : '$';
  next = next.replace('var codexLocalGroupsHeaderPatchVersion=39;', 'var codexLocalGroupsHeaderSafePatchVersion=6;');
  next = next.replace(/codex-local-groups-collapsed-v1/g, 'codex-local-groups-collapsed-v2');
  next = next.replace(/codex-local-groups-expanded-all-v1/g, 'codex-local-groups-expanded-all-v2');
  next = next.replace('function codexLocalGroupsGroupExpanded(e,t,n,r){if(codexLocalGroupsGroupHasActive(n,r))return!0;let i=codexLocalGroupsReadJsonState(`codex-local-groups-collapsed-v2`),a=codexLocalGroupsGroupKey(e,t);return Object.prototype.hasOwnProperty.call(i,a)?!i[a]:!1}', 'function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}');
  next = next.replace('role:`button`,tabIndex:0,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s)},onKeyDown:t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s))},children:[', 'children:[');
  next = next.replace('(0,Q.jsx)(`button`,{type:`button`,className:`min-w-0 flex-1 truncate text-left`,title:s?`折叠分组`:`展开分组`,"aria-expanded":s,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s)},children:(s?`▾`:`▸`)+` `+i.label})', '(0,Q.jsx)(`span`,{className:`min-w-0 flex-1 truncate`,children:i.label})');
  next = next.replace('function codexLocalGroupsGroupShowAll(e,t){let n=codexLocalGroupsReadJsonState(`codex-local-groups-expanded-all-v2`);return n[codexLocalGroupsGroupKey(e,t)]===!0}function codexLocalGroupsSetGroupShowAll(e,t,n){let r=codexLocalGroupsReadJsonState(`codex-local-groups-expanded-all-v2`);r[codexLocalGroupsGroupKey(e,t)]=n,codexLocalGroupsWriteJsonState(`codex-local-groups-expanded-all-v2`,r)}', 'function codexLocalGroupsGroupLimit(e,t){let n=Number(codexLocalGroupsReadJsonState(`codex-local-groups-visible-counts-v1`)[codexLocalGroupsGroupKey(e,t)]);return Number.isFinite(n)&&n>=5?Math.floor(n):5}function codexLocalGroupsSetGroupLimit(e,t,n){let r=codexLocalGroupsReadJsonState(`codex-local-groups-visible-counts-v1`);r[codexLocalGroupsGroupKey(e,t)]=Math.max(5,Math.floor(Number(n)||5)),codexLocalGroupsWriteJsonState(`codex-local-groups-visible-counts-v1`,r)}');
  next = next.replace('function codexLocalGroupsVisibleItems(e,t,n,r){if(codexLocalGroupsGroupShowAll(t,n))return e;let i=e.slice(0,5),a=e.find(e=>codexLocalGroupsItemIsActive(e,r));return a&&!i.includes(a)&&i.push(a),i}', 'function codexLocalGroupsVisibleItems(e,t,n,r){let i=e.slice(0,codexLocalGroupsGroupLimit(t,n)),a=e.find(e=>codexLocalGroupsItemIsActive(e,r));return a&&!i.includes(a)&&i.push(a),i}');
  next = next.replace('let s=codexLocalGroupsGroupExpanded(e.projectRoot,i.label,i,t),d=codexLocalGroupsGroupShowAll(e.projectRoot,i.label),u=s?codexLocalGroupsVisibleItems(i.items,e.projectRoot,i.label,t):[],c=i.items.length-u.length,l=i.items.length>5,h=d?l:c>0;return[', 'let s=codexLocalGroupsGroupExpanded(e.projectRoot,i.label,i,t),d=codexLocalGroupsGroupLimit(e.projectRoot,i.label),u=s?codexLocalGroupsVisibleItems(i.items,e.projectRoot,i.label,t):[],c=Math.max(0,i.items.length-u.length),l=d>5,h=d>15;return[');
  next = next.replace(/,s&&h\?\(0,Q\.jsx\)\(`button`,\{[\s\S]*?\},`group-more-`\+r\+`-`\+a\+`-`\+i\.label\):null/, ',s&&(h||l||c>0)?(0,Q.jsxs)(`div`,{className:`mx-[var(--padding-row-x)] mb-1 flex flex-wrap gap-1`,children:[h?(0,Q.jsx)(`button`,{type:`button`,className:`rounded-md px-3 py-1 text-left text-xs text-token-input-placeholder-foreground hover:bg-token-list-hover-background hover:text-token-foreground`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,15)},children:`收起到最近 15 条`}):null,l?(0,Q.jsx)(`button`,{type:`button`,className:`rounded-md px-3 py-1 text-left text-xs text-token-input-placeholder-foreground hover:bg-token-list-hover-background hover:text-token-foreground`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,5)},children:`收起到最近 5 条`}):null,c>0?(0,Q.jsx)(`button`,{type:`button`,className:`rounded-md px-3 py-1 text-left text-xs text-token-input-placeholder-foreground hover:bg-token-list-hover-background hover:text-token-foreground`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))},children:`还有 `+c+` 条，展开更多`}):null].filter(Boolean)},`group-more-`+r+`-`+a+`-`+i.label):null');
  next = next.replace('className:`px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-semibold text-token-foreground`', 'className:`sticky top-0 z-10 bg-token-dropdown-background px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-semibold text-token-foreground`');
  next = next.replace('function codexRecentTaskProjectRows', `function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,${reactRuntime}.useState)(0);return(0,${reactRuntime}.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(\`codex-local-groups-refresh\`,e),()=>window.removeEventListener(\`codex-local-groups-refresh\`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}function codexRecentTaskProjectRows`);
  next = next.replace('function codexLocalGroupsStoreCurrentRoot(e){try{e&&localStorage.setItem(`codex-local-groups-current-root-v1`,e)}catch{}}', 'var codexLocalGroupsCurrentProjectRoot=``;function codexLocalGroupsSetCurrentProjectRoot(e){codexLocalGroupsCurrentProjectRoot=codexRecentTaskNormalizePath(e)}');
  const projectRoot = 'function codexLocalGroupsProjectRoot(e){return e.kind===`local`?e.conversation?codexLocalGroupsConversationProjectRoot(e.conversation.id,e.conversation.cwd):e.pendingWorktree?.sourceWorkspaceRoot??e.pendingWorktree?.worktreeWorkspaceRoot??e.pendingWorktree?.worktreeGitRoot??``:e.kind===`pending-worktree`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:``}';
  const scopedProjectRoot = projectRoot.replace('function codexLocalGroupsProjectRoot(e){return ', 'function codexLocalGroupsRawProjectRoot(e){return ') + 'function codexLocalGroupsProjectRoot(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsRawProjectRoot(e)),n=codexLocalGroupsCurrentProjectRoot;return n&&(t===n||t.startsWith(n+`/`))?n:t}function codexLocalGroupsScopeProjectRoot(e){return e.kind===`local`?e.conversation?e.conversation.cwd??``:e.pendingWorktree?.sourceWorkspaceRoot??e.pendingWorktree?.worktreeWorkspaceRoot??e.pendingWorktree?.worktreeGitRoot??``:e.kind===`pending-worktree`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:``}';
  next = next.replace(projectRoot, scopedProjectRoot);
  next = next.replace('function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);if(!n)return e;return e.filter(e=>{let t=codexLocalGroupsProjectRoot(e),r=codexRecentTaskNormalizePath(t);return r===n||r.startsWith(n+`/`)})}', 'function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsSetCurrentProjectRoot(n);if(!n)return[];return e.filter(e=>{let t=codexRecentTaskNormalizePath(codexLocalGroupsScopeProjectRoot(e));return t===n||t.startsWith(n+`/`)})}');
  return next.replace('function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);if(!n)return e;return e.filter(e=>{let t=codexLocalGroupsConversationProjectRoot(e.id,e.cwd);return t===n||t.startsWith(n+`/`)})}', 'function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsSetCurrentProjectRoot(n);if(!n)return[];return e.filter(e=>{if(!e)return!1;let t=codexRecentTaskNormalizePath(e.cwd);return t===n||t.startsWith(n+`/`)})}');
}

function patchHeaderPendingItems(text) {
  let next = text.replace('function codexLocalGroupsProjectRoot(e){return e.kind===`local`?codexLocalGroupsConversationProjectRoot(e.conversation.id,e.conversation.cwd):e.kind===`pending-worktree`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:``}', 'function codexLocalGroupsProjectRoot(e){return e.kind===`local`?e.conversation?codexLocalGroupsConversationProjectRoot(e.conversation.id,e.conversation.cwd):e.pendingWorktree?.sourceWorkspaceRoot??e.pendingWorktree?.worktreeWorkspaceRoot??e.pendingWorktree?.worktreeGitRoot??``:e.kind===`pending-worktree`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:``}');
  next = next.replace('function codexLocalGroupsConversationId(e){return e.kind===`local`?e.conversation.id:e.kind===`remote`?e.task.id:e.pendingWorktree.id}', 'function codexLocalGroupsConversationId(e){return e.kind===`local`?e.conversation?.id??e.pendingWorktree?.clientThreadId??e.pendingWorktree?.id:e.kind===`remote`?e.task.id:e.pendingWorktree.id}');
  next = next.replace('function codexLocalGroupsLocalTitle(e){if(e.kind!==`local`)return null;', 'function codexLocalGroupsLocalTitle(e){if(e.kind!==`local`||!e.conversation)return null;');
  next = next.replace('function codexLocalGroupsItemCreatedAt(e){if(e.kind!==`local`)return 0;let t=Number(e.conversation.createdAt??0);if(Number.isFinite(t)&&t>0)return t<1e12?t*1e3:t;return codexLocalGroupsUuidTime(e.conversation.id)}', 'function codexLocalGroupsItemCreatedAt(e){if(e.kind!==`local`)return 0;let t=Number(e.conversation?.createdAt??e.pendingWorktree?.createdAt??0);if(Number.isFinite(t)&&t>0)return t<1e12?t*1e3:t;return codexLocalGroupsUuidTime(e.conversation?.id??e.pendingWorktree?.clientThreadId??e.pendingWorktree?.id)}');
  next = next.replace('function codexLocalGroupsItemIsActive(e,t){return e.kind===`local`&&t===e.conversation.id}', 'function codexLocalGroupsItemIsActive(e,t){return e.kind===`local`&&e.conversation!=null&&t===e.conversation.id}');
  next = next.replace('isActive:o.kind===`local`&&t===o.conversation.id', 'isActive:o.kind===`local`&&o.conversation!=null&&t===o.conversation.id');
  return next.replace('return o.kind!==`local`?p:', 'return o.kind!==`local`||o.conversation==null?p:');
}

function stripHeaderMetadataRows(text) {
  let next = text.replace(/function codexLocalGroupsMetadataItems\(e(?:,t)?\)\{[\s\S]*?\}function codexLocalGroupsMetadataRow/, 'function codexLocalGroupsMetadataRow');
  next = next.replace(/function codexLocalGroupsMetadataRow\(e,t,n\)\{[\s\S]*?\},`metadata-actions-`\+e\.key\)\}/, '');
  next = next.replace(/function codexLocalGroupsMetadataItems\(e(?:,t)?\)\{[\s\S]*?\}function codexRecentTaskProjectRows/, 'function codexRecentTaskProjectRows');
  next = next.replace(/if\(e\.codexLocalGroupsMetadataOnly\)return codexLocalGroupsMetadataRow\(e,t,n\);/g, '');
  next = next.replace(/e=codexLocalGroupsMetadataItems\(e\);let n=/g, 'let n=');
  next = next.replace(/let n=codexRecentTaskNormalizePath\(t\);e=codexLocalGroupsMetadataItems\(e,n\);/g, 'let n=codexRecentTaskNormalizePath(t);');
  return next;
}

function addBoundedHeaderHistoryRows(text, messenger) {
  if (!text.includes('var codexLocalGroupsInitialMeta=') || text.includes('codexLocalGroupsHistoryLimit=120')) {
    return text;
  }
  const row = metadataRowSnippet(messenger)
    .replace('function codexLocalGroupsMetadataRow', 'function codexLocalGroupsHistoryRow')
    .replace(/metadata-row-/g, 'history-row-')
    .replace(/metadata-actions-/g, 'history-actions-');
  const items = 'var codexLocalGroupsHistoryLimit=120;function codexLocalGroupsHistoryItems(e,t){t=codexRecentTaskNormalizePath(t);if(!t)return e;let m=codexLocalGroupsReadMeta(),n=new Set(e.filter(e=>e?.kind===`local`).map(e=>String(e.conversation?.id??``))),r=[];for(let[i,a]of Object.entries(m.conversations??{})){if(n.has(String(i))||m.archivedConversations?.[String(i)])continue;let o=codexRecentTaskNormalizePath(a?.projectRoot);if(!(o===t||o.startsWith(t+`/`)))continue;let s=typeof a.title===`string`&&a.title.trim()?a.title.trim():String(i),d=Number(a.updatedAtMs??0);r.push({kind:`local`,key:String(i),codexLocalGroupsHistoryRecovered:!0,conversation:{id:String(i),title:s,cwd:o,createdAt:d,updatedAt:d}})}return r.sort((e,t)=>(t.conversation.updatedAt??0)-(e.conversation.updatedAt??0)),e.concat(r.slice(0,codexLocalGroupsHistoryLimit))}';
  let next = text.replace('function codexRecentTaskProjectRows', `${items}${row}function codexRecentTaskProjectRows`);
  next = next.replace('function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);', 'function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);e=codexLocalGroupsHistoryItems(e,n);');
  next = next.replace('...(s?u.map(e=>{let o=codexLocalGroupsDecoratedItem(e),p=', '...(s?u.map(e=>{if(e.codexLocalGroupsHistoryRecovered)return codexLocalGroupsHistoryRow(e,t,n);let o=codexLocalGroupsDecoratedItem(e),p=');
  return next;
}

function headerHelper(metadata, messenger, kindFnName) {
  const fnName = kindFnName || 'Ke';
  const metadataRow = metadataRowSnippet(messenger);
  return `function ${fnName}(e){return e.kind===\`remote\`}var codexLocalGroupsInitialMeta=${metadataLiteral(metadata)};var codexLocalGroupsHeaderPatchVersion=39;var codexLocalGroupsMessenger=${messenger};${metadataMergeSnippet()}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsInitialMeta;try{let t=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`null\`);t&&typeof t==\`object\`&&!Array.isArray(t)&&(e=codexLocalGroupsMergeMeta(e,t))}catch{}return e&&typeof e==\`object\`?e:{version:1,conversations:{}}}function codexLocalGroupsStoreMeta(e,t){try{e.updatedAtMs=Date.now(),localStorage.setItem(\`codex-local-groups-meta-v1\`,JSON.stringify(e)),t||window.dispatchEvent(new Event(\`codex-local-groups-refresh\`))}catch{}}function codexLocalGroupsStoreCurrentRoot(e){try{e&&localStorage.setItem(\`codex-local-groups-current-root-v1\`,e)}catch{}}function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(n)return n;let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.projectRoot;return codexRecentTaskNormalizePath(r)}function codexLocalGroupsProjectRoot(e){return e.kind===\`local\`?codexLocalGroupsConversationProjectRoot(e.conversation.id,e.conversation.cwd):e.kind===\`pending-worktree\`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:\`\`}function codexLocalGroupsProjectLabel(e){let t=codexLocalGroupsProjectRoot(e);return e.kind===\`remote\`?e.task.task_status_display?.environment_label?.trim()||\`Cloud\`:codexRecentTaskBasename(t)||\`No project\`}function codexLocalGroupsProjectKey(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return t||\`${'${e.kind}'}:${'${codexLocalGroupsProjectLabel(e)}'}\`}function codexLocalGroupsConversationId(e){return e.kind===\`local\`?e.conversation.id:e.kind===\`remote\`?e.task.id:e.pendingWorktree.id}function codexLocalGroupsLocalTitle(e){if(e.kind!==\`local\`)return null;let t=codexLocalGroupsReadMeta().conversations?.[String(e.conversation.id)]?.title;return typeof t===\`string\`&&t.trim()?t.trim():null}function codexLocalGroupsDecoratedItem(e){let t=codexLocalGroupsLocalTitle(e);return t?{...e,conversation:{...e.conversation,title:t}}:e}function codexLocalGroupsProjectMatches(e,t){let n=codexRecentTaskNormalizePath(e),r=codexRecentTaskNormalizePath(t);return!!n&&!!r&&(n===r||n.startsWith(r+\`/\`)||r.startsWith(n+\`/\`))}function codexLocalGroupsUuidTime(e){let t=String(e??\`\`).replace(/-/g,\`\`).slice(0,12),n=parseInt(t,16);return Number.isFinite(n)&&n>0?n:0}function codexLocalGroupsItemCreatedAt(e){if(e.kind!==\`local\`)return 0;let t=Number(e.conversation.createdAt??0);if(Number.isFinite(t)&&t>0)return t<1e12?t*1e3:t;return codexLocalGroupsUuidTime(e.conversation.id)}function codexLocalGroupsCanUsePendingGroup(e,t){let n=Number(t.startedAtMs);if(!Number.isFinite(n)||e.kind!==\`local\`)return!1;let r=Number(codexLocalGroupsItemCreatedAt(e));return Number.isFinite(r)&&r>=n-30000&&r<=n+600000&&Date.now()-n<600000}function codexLocalGroupsNormalizeGroupName(e){let t=String(e??\`\`);try{t=t.normalize(\`NFC\`)}catch{}return t.replace(/[\\s\\u3000]+/g,\` \`).trim()}function codexLocalGroupsArchivedGroupKey(e,t){return JSON.stringify([codexRecentTaskNormalizePath(e),codexLocalGroupsNormalizeGroupName(t)])}function codexLocalGroupsGroupArchived(e,t,n){return!!n.archivedGroups?.[codexLocalGroupsArchivedGroupKey(e,t)]}function codexLocalGroupsGroupLabel(e){if(e.kind!==\`local\`)return\`未分组\`;let t=codexLocalGroupsReadMeta(),n=codexLocalGroupsConversationId(e),r=codexLocalGroupsProjectRoot(e),i=t.conversations?.[String(n)];if(i?.group){let a=codexLocalGroupsNormalizeGroupName(i.group);if(a&&!codexLocalGroupsGroupArchived(r,a,t))return a}let a=t.pendingGroup,o=codexLocalGroupsNormalizeGroupName(a?.group);let s=codexRecentTaskNormalizePath(a?.projectRoot);if(o&&!codexLocalGroupsGroupArchived(s,o,t)&&codexLocalGroupsCanUsePendingGroup(e,a)&&(codexLocalGroupsProjectMatches(r,s)||!r&&s)){codexLocalGroupsSaveConversationGroup(n,o,r||s,t);return o}return\`未分组\`}function codexLocalGroupsSaveConversationGroup(e,t,n,r){t=codexLocalGroupsNormalizeGroupName(t);if(!t)return;r.conversations||(r.conversations={}),r.conversations[String(e)]={...(r.conversations[String(e)]??{}),group:t,projectRoot:n,updatedAtMs:Date.now()},delete r.pendingGroup,codexLocalGroupsStoreMeta(r,!0);try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`saveConversationMeta\`,conversationId:String(e),group:t,projectRoot:n});codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`resetPendingGroup\`})}catch{}}function codexLocalGroupsStartConversationInGroup(e,t){t=codexLocalGroupsNormalizeGroupName(t);if(!t)return;let n=codexLocalGroupsReadMeta();n.pendingGroup={projectRoot:e,group:t,startedAtMs:Date.now()},codexLocalGroupsStoreMeta(n);try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`setPendingGroup\`,projectRoot:e,group:t,startedAtMs:n.pendingGroup.startedAtMs}),codexLocalGroupsMessenger.dispatchHostMessage({type:\`new-chat\`})}catch{}}function codexLocalGroupsSaveConversationMeta(e,t,n,r){let i=codexLocalGroupsReadMeta();i.conversations||(i.conversations={});let a=i.conversations[String(e)]??{};t!=null&&(t.trim()?a.title=t.trim():delete a.title),n!=null&&(n=codexLocalGroupsNormalizeGroupName(n),n?a.group=n:delete a.group),r&&r.trim()&&(a.projectRoot=r.trim()),a.updatedAtMs=Date.now(),i.conversations[String(e)]=a,codexLocalGroupsStoreMeta(i);try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`saveConversationMeta\`,conversationId:String(e),title:a.title??\`\`,group:a.group??\`\`,projectRoot:a.projectRoot??\`\`})}catch{}}function codexLocalGroupsArchiveConversation(e){let t=String(e??\`\`);if(!t)return;let n=codexLocalGroupsReadMeta();n.archivedConversations||(n.archivedConversations={}),n.archivedConversations[t]={archivedAtMs:Date.now()},n.conversations&&delete n.conversations[t],codexLocalGroupsStoreMeta(n);try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`archiveConversationMeta\`,conversationId:t})}catch{}}function codexLocalGroupsSetBusy(e,t){try{let n=e.currentTarget,r=String(n.textContent||\`\`);n.textContent=t,setTimeout(()=>{n.textContent===t&&(n.textContent=r)},1200)}catch{}}function codexLocalGroupsPromptTitle(e,t,n){try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`promptConversationTitle\`,conversationId:String(e),title:t??\`\`,projectRoot:n??\`\`})}catch{}}function codexLocalGroupsPromptGroup(e,t){try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`promptConversationGroup\`,conversationId:String(e),projectRoot:t??\`\`})}catch{}}function codexLocalGroupsPromptNewGroup(e){try{codexLocalGroupsMessenger.dispatchMessage(\`codex-local-groups\`,{action:\`promptNewGroup\`,projectRoot:e})}catch{}}${webviewMetadataSync(messenger)}function codexLocalGroupsGroupKey(e,t){return codexRecentTaskNormalizePath(e)+\`::\`+String(t??\`\`)}function codexLocalGroupsReadJsonState(e){try{let t=JSON.parse(localStorage.getItem(e)??\`{}\`);return t&&typeof t===\`object\`&&!Array.isArray(t)?t:{}}catch{return{}}}function codexLocalGroupsWriteJsonState(e,t){try{localStorage.setItem(e,JSON.stringify(t)),window.dispatchEvent(new Event(\`codex-local-groups-refresh\`))}catch{}}function codexLocalGroupsItemIsActive(e,t){return e.kind===\`local\`&&t===e.conversation.id}function codexLocalGroupsGroupHasActive(e,t){return e.items.some(e=>codexLocalGroupsItemIsActive(e,t))}function codexLocalGroupsGroupExpanded(e,t,n,r){if(codexLocalGroupsGroupHasActive(n,r))return!0;let i=codexLocalGroupsReadJsonState(\`codex-local-groups-collapsed-v1\`),a=codexLocalGroupsGroupKey(e,t);return Object.prototype.hasOwnProperty.call(i,a)?!i[a]:!1}function codexLocalGroupsToggleGroup(e,t,n){let r=codexLocalGroupsReadJsonState(\`codex-local-groups-collapsed-v1\`);r[codexLocalGroupsGroupKey(e,t)]=n,codexLocalGroupsWriteJsonState(\`codex-local-groups-collapsed-v1\`,r)}function codexLocalGroupsGroupShowAll(e,t){let n=codexLocalGroupsReadJsonState(\`codex-local-groups-expanded-all-v1\`);return n[codexLocalGroupsGroupKey(e,t)]===!0}function codexLocalGroupsSetGroupShowAll(e,t,n){let r=codexLocalGroupsReadJsonState(\`codex-local-groups-expanded-all-v1\`);r[codexLocalGroupsGroupKey(e,t)]=n,codexLocalGroupsWriteJsonState(\`codex-local-groups-expanded-all-v1\`,r)}function codexLocalGroupsVisibleItems(e,t,n,r){if(codexLocalGroupsGroupShowAll(t,n))return e;let i=e.slice(0,5),a=e.find(e=>codexLocalGroupsItemIsActive(e,r));return a&&!i.includes(a)&&i.push(a),i}function codexLocalGroupsMetadataItems(e){let t=codexLocalGroupsReadMeta().conversations??{},n=new Set(e.filter(e=>e?.kind===\`local\`).map(e=>String(e.conversation?.id??\`\`))),r=e.slice();for(let[i,a]of Object.entries(t)){if(n.has(String(i))||codexLocalGroupsReadMeta().archivedConversations?.[String(i)])continue;let o=codexRecentTaskNormalizePath(a?.projectRoot);if(!o)continue;let s=typeof a.title===\`string\`&&a.title.trim()?a.title.trim():String(i),d=Number(a.updatedAtMs??0);r.push({kind:\`local\`,key:String(i),codexLocalGroupsMetadataOnly:!0,conversation:{id:String(i),title:s,cwd:o,createdAt:d,updatedAt:d}})}return r}${metadataRow}function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow,codexLocalGroupsArchiveStart){let r=[],i=new Map;for(let a of e){let o=codexLocalGroupsProjectKey(a),s=codexLocalGroupsProjectLabel(a),d=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(a)),c=i.get(o);c||(c={label:s,projectRoot:d,groups:[],groupMap:new Map},i.set(o,c),r.push(c));let l=codexLocalGroupsGroupLabel(a),u=c.groupMap.get(l);u||(u={label:l,items:[]},c.groupMap.set(l,u),c.groups.push(u)),u.items.push(a)}let m=codexLocalGroupsReadMeta(),f=m.pendingGroup;if(f?.group&&f?.projectRoot)for(let e of r)codexLocalGroupsProjectMatches(e.projectRoot,f.projectRoot)&&!codexLocalGroupsGroupArchived(e.projectRoot,f.group,m)&&!e.groupMap.has(f.group)&&(e.groupMap.set(f.group,{label:f.group,items:[]}),e.groups.push(e.groupMap.get(f.group)));for(let e of r)e.groups.sort((e,t)=>e.label===\`未分组\`?1:t.label===\`未分组\`?-1:e.label.localeCompare(t.label));return r.flatMap((e,r)=>[(0,Q.jsx)(\`div\`,{className:\`px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-semibold text-token-foreground\`,children:e.label},\`project-\`+r+\`-\`+e.label),e.projectRoot?(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`mx-[var(--padding-row-x)] mb-1 rounded-md border border-token-border-light px-3 py-1.5 text-left text-xs font-medium text-token-foreground hover:bg-token-list-hover-background\`,title:\`新建分组并开始会话\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsPromptNewGroup(e.projectRoot)},children:\`+ 新建分组并开始会话\`},\`project-new-group-\`+r+\`-\`+e.label):null,...e.groups.flatMap((i,a)=>{let s=codexLocalGroupsGroupExpanded(e.projectRoot,i.label,i,t),d=codexLocalGroupsGroupShowAll(e.projectRoot,i.label),u=s?codexLocalGroupsVisibleItems(i.items,e.projectRoot,i.label,t):[],c=i.items.length-u.length,l=i.items.length>5,h=d?l:c>0;return[(0,Q.jsxs)(\`div\`,{className:\`mx-[var(--padding-row-x)] mt-2 mb-1 flex items-center justify-between gap-2 rounded-md border-l-4 border-token-border-light bg-token-list-hover-background px-3 py-1.5 text-sm font-semibold\`,style:{borderLeftColor:i.label===\`未分组\`?\`rgba(148,163,184,.65)\`:\`rgba(96,165,250,.95)\`,background:i.label===\`未分组\`?\`rgba(148,163,184,.08)\`:\`rgba(96,165,250,.12)\`,color:i.label===\`未分组\`?\`#9ca3af\`:\`#93c5fd\`},role:\`button\`,tabIndex:0,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s)},onKeyDown:t=>{(t.key===\`Enter\`||t.key===\` \`)&&(t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s))},children:[(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`min-w-0 flex-1 truncate text-left\`,title:s?\`折叠分组\`:\`展开分组\`,"aria-expanded":s,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s)},children:(s?\`▾\`:\`▸\`)+\` \`+i.label}),(0,Q.jsx)(\`span\`,{className:\`shrink-0 rounded-full border border-token-border-light px-2 py-0.5 text-xs\`,children:i.items.length}),e.projectRoot?(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`shrink-0 rounded-md border border-token-border-light px-2.5 py-1 text-xs font-medium text-token-foreground hover:bg-token-list-hover-background\`,title:\`在此分组新建会话\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsStartConversationInGroup(e.projectRoot,i.label)},children:\`+ 在此分组新建会话\`}):null]},\`group-\`+r+\`-\`+a+\`-\`+i.label),...(s?u.map(e=>{if(e.codexLocalGroupsMetadataOnly)return codexLocalGroupsMetadataRow(e,t,n);let o=codexLocalGroupsDecoratedItem(e),p=(0,Q.jsx)(codexLocalGroupsRow,{item:o,isActive:o.kind===\`local\`&&t===o.conversation.id,onClose:n,onActiveArchiveStart:codexLocalGroupsArchiveStart},o.key);return o.kind!==\`local\`?p:(0,Q.jsxs)(\`div\`,{className:\`codex-local-groups-conversation-row relative\`,style:{paddingRight:\`240px\`},children:[p,(0,Q.jsxs)(\`div\`,{className:\`codex-local-groups-inline-actions absolute top-1 z-20 flex shrink-0 gap-1 text-xs text-token-input-placeholder-foreground\`,style:{right:\`var(--padding-row-x)\`},children:[(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`rounded px-2 py-0.5 hover:bg-token-list-hover-background hover:text-token-foreground\`,title:\`设置本地标题\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,\`打开中…\`),codexLocalGroupsPromptTitle(o.conversation.id,codexLocalGroupsLocalTitle(o)??o.conversation.title??\`\`,codexLocalGroupsProjectRoot(o)??\`\`)},children:\`设置标题\`}),(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`rounded px-2 py-0.5 hover:bg-token-list-hover-background hover:text-token-foreground\`,title:\`设置需求分组\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,\`打开中…\`),codexLocalGroupsPromptGroup(o.conversation.id,codexLocalGroupsProjectRoot(o)??\`\`)},children:\`设置分组\`})]})]},\`conversation-actions-\`+o.key)}):[]),s&&h?(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`mx-[var(--padding-row-x)] mb-1 rounded-md px-3 py-1 text-left text-xs text-token-input-placeholder-foreground hover:bg-token-list-hover-background hover:text-token-foreground\`,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetGroupShowAll(e.projectRoot,i.label,!d)},children:d?\`收起到最近 5 条\`:\`还有 \`+c+\` 条，展开全部\`},\`group-more-\`+r+\`-\`+a+\`-\`+i.label):null].filter(Boolean)})])}function codexRecentTaskProjectLabel(e){return codexLocalGroupsProjectLabel(e)}function codexRecentTaskFilter(e,t){e=codexLocalGroupsMetadataItems(e);let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);if(!n)return e;return e.filter(e=>{let t=codexLocalGroupsProjectRoot(e),r=codexRecentTaskNormalizePath(t);return r===n||r.startsWith(n+\`/\`)})}function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);codexLocalGroupsStoreCurrentRoot(n);if(!n)return e;return e.filter(e=>{let t=codexLocalGroupsConversationProjectRoot(e.id,e.cwd);return t===n||t.startsWith(n+\`/\`)})}function codexRecentTaskNormalizePath(e){if(typeof e!==\`string\`)return\`\`;return e.replace(/\\\\/g,\`/\`).replace(/\\/+$/,\`\`)}function codexRecentTaskBasename(e){let t=codexRecentTaskNormalizePath(e);if(!t)return\`\`;let n=t.split(\`/\`).filter(Boolean);return n[n.length-1]??\`\`}function codexRecentTaskDateLabel(e){if(!Number.isFinite(e.getTime()))return\`\`;let t=new Date,n=String(e.getHours()).padStart(2,\`0\`),r=String(e.getMinutes()).padStart(2,\`0\`);if(e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()&&e.getDate()===t.getDate())return\`${'${n}'}:${'${r}'}\`;let i=String(e.getMonth()+1).padStart(2,\`0\`),a=String(e.getDate()).padStart(2,\`0\`);return\`${'${e.getFullYear()}'}-${'${i}'}-${'${a}'} ${'${n}'}:${'${r}'}\`}`;
}

module.exports = { CodexPatchEngine };
