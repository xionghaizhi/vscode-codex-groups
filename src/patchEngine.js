const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { normalizeMetadata } = require('./metadataStore');
const { STALE_PROJECT_STATUS } = require('./extensionLocator');

const EMPTY_METADATA = { version: 1, conversations: {} };
const EXTENSION_METADATA_SYNC_BRANCH = 'if(e.action==="getMetadata"){try{t?.postMessage?.({type:"codex-local-groups",action:"metadataSaved",metadata:r})}catch{}return!0}';
const EXTENSION_VSCODE_ALIAS = 'typeof $g!="undefined"?$g:require("vscode")';

class CodexPatchEngine {
  constructor(options = {}) {
    this.nodePath = options.nodePath || process.env.NODE_BIN || process.execPath || 'node';
    this.skipSyntaxCheck = options.skipSyntaxCheck === true;
    this.safeMode = options.safeMode === true || options.mode === 'safe' ||
      options.patchMode === 'safe' || process.env.CODEX_LOCAL_GROUPS_PATCH_MODE === 'safe' ||
      process.env.CODEX_LOCAL_GROUPS_PATCH_MODE === 'conservative';
  }

  plan(target, metadata) {
    normalizeMetadata(metadata, 'metadata');
    const context = { errors: [], safeMode: this.safeMode };
    const changes = [];
    if (this.safeMode) {
      planFile(changes, target.extensionJsPath, (text) => patchExtensionSafeHost(text, context));
      planFile(changes, target.appServerManagerSignalsPath, (text) => patchAppServerManagerSignals(text, context));
      planFile(changes, target.headerPath, (text, file) => patchHeader(text, context, file));
      return { changes, errors: context.errors };
    }
    planFile(changes, target.extensionJsPath, (text) => patchExtension(text, context));
    planFile(changes, target.sidebarPath, (text) => patchSidebar(text, context));
    planFile(changes, target.sidebarProjectGroupSignalsPath, (text) => patchSidebarProjectGroupSignals(text, context));
    planFile(changes, target.headerPath, (text, file) => patchHeader(text, context, file));
    planFile(changes, target.appMainPath, (text) => patchAppMain(text, context));
    planFile(changes, target.appServerManagerSignalsPath, (text) => patchAppServerManagerSignals(text, context));
    planFile(changes, target.requestPath, (text) => patchRequest(text, context));
    planFile(changes, target.localTitlePath, (text) => patchLocalTitle(text, context));
    return { changes, errors: context.errors };
  }

  apply(target, metadata) {
    const plan = this.plan(target, metadata);
    if (plan.errors.length) {
      return { ...plan, changed: [], syntax: [], idempotent: false };
    }
    if (plan.changes.length === 0) {
      return { ...plan, backups: [], syntax: [], idempotent: true, restored: false };
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
          backups,
          syntax,
          restored: true,
          idempotent: false,
          errors: [...nextPlan.errors, `幂等检查失败：仍有 ${nextPlan.changes.length} 个变更`],
        };
      }
      return { ...plan, backups, syntax, idempotent: true, restored: false };
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
      target.appServerManagerSignalsPath ? checkModule(this.nodePath, target.appServerManagerSignalsPath) : null,
      target.requestPath ? checkModule(this.nodePath, target.requestPath) : null,
      checkModule(this.nodePath, target.localTitlePath),
      target.sidebarPath ? checkModule(this.nodePath, target.sidebarPath) : null,
      target.sidebarProjectGroupSignalsPath ? checkModule(this.nodePath, target.sidebarProjectGroupSignalsPath) : null,
    ].filter(Boolean);
  }

  restoreCleanBundles(target) {
    return targetBundlePaths(target).map((file) => restoreCleanBackup(file)).filter(Boolean);
  }
}

function targetBundlePaths(target) {
  return [
    target.extensionJsPath,
    target.headerPath,
    target.appMainPath,
    target.appServerManagerSignalsPath,
    target.requestPath,
    target.localTitlePath,
    target.sidebarPath,
    target.sidebarProjectGroupSignalsPath,
  ].filter(Boolean);
}

function restoreCleanBackup(file) {
  const backupPath = findCleanBackup(file);
  if (!backupPath) {
    return null;
  }
  fs.copyFileSync(backupPath, file);
  return { path: file, backupPath };
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
    .find((backup) => !fs.readFileSync(backup, 'utf8').includes('codexLocalGroups')) || null;
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
  next = patchExtensionAccountInfo(next, context);
  next = patchExtensionAppServerArgs(next, context);
  next = next.replace(/typeof navigator<"u"&&navigator\?\./g, '!1&&navigator?.');
  next = next.replace(/typeof navigator<"u"&&navigator\./g, '!1&&navigator.');
  return next;
}

function patchExtensionSafeHost(text, context) {
  let next = patchExtensionMetadataHelper(text, context);
  next = patchExtensionMessageHandler(next, context);
  next = patchExtensionThreadList(next, context);
  next = next.replace(/typeof navigator<"u"&&navigator\?\./g, '!1&&navigator?.');
  next = next.replace(/typeof navigator<"u"&&navigator\./g, '!1&&navigator.');
  return next;
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
  const next = '"account-info":async()=>({accountId:null,userId:null,plan:null,email:null,computeResidency:null})';
  if (text.includes(next)) {
    return text;
  }
  if (!text.includes('Unable to extract account id and plan from auth token.')) {
    return text;
  }
  const current = /"account-info":async\(\)=>\{let e=await this\.authProvider\.getToken\(\{refreshToken:!1\}\);if\(!e\)return\{accountId:null,userId:null,plan:null,email:null,computeResidency:null\};try\{let r=JSON\.parse\(Buffer\.from\(e\.split\("\."\)\[1\],"base64url"\)\.toString\("utf8"\)\),n=r\["https:\/\/api\.openai\.com\/auth"\]\?\?\{\},o=r\["https:\/\/api\.openai\.com\/profile"\]\?\?\{\},i=n\?\.chatgpt_account_id\?\?null,s=n\?\.chatgpt_user_id\?\?null,a=n\?\.chatgpt_plan_type\?\?null,c=n\?\.chatgpt_compute_residency\?\?null,l=o\.email\?\?null;if\(i&&s&&a\)return\{accountId:i,userId:s,plan:a,email:l,computeResidency:c\}\}catch\{[A-Za-z_$][\w$]*\(\)\.error\("Unable to extract account id and plan from auth token\."\)\}return\{accountId:null,userId:null,plan:null,email:null,computeResidency:null\}\}/;
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
  if (!next.includes(capnNewV2) && !next.includes(capnNewV1)) {
    if (next.includes(capnOldV2)) {
      next = replaceOnce(next, capnOldV2, capnNewV2, context, 'extension capn metadata message handler');
    } else if (next.includes(capnOldV1)) {
      next = replaceOnce(next, capnOldV1, capnNewV1, context, 'extension capn metadata message handler legacy');
    }
  }
  const webviewOld = 'this.handleMessage(e,a)});';
  const webviewNew = 'if(codexLocalGroupsHandleWebviewMessage(a,e))return;this.handleMessage(e,a)});';
  if (!next.includes(webviewNew)) {
    next = replaceOnce(next, webviewOld, webviewNew, context, 'extension direct metadata message handler');
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
  return `async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===${providerName}:c!==${providerName}}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[],s=${vscodeName}.workspace.workspaceFolders?.map(c=>c.uri.fsPath)??[],a=c=>c.replace(/\\/g,\`/\`).replace(/\/+$/,\`\`),u=s.map(c=>a(c));for(let{item:c,summary:l}of o){let d=l.cwd,f=d?a(d):null,m=s.length===0||!f||u.some(h=>f===h||f.startsWith(h+"/"));if(!m)continue;this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c)}let c=i.map(l=>this.applyLifecycleToChatSessionItem(l));return Array.from(this.pendingConversations.values()).filter(l=>n(l.modelProvider)).map(l=>this.applyLifecycleToChatSessionItem(l.item)).concat(c)}`;
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
  const next = extensionThreadListNew(text);
  const paged = extensionThreadListPagedRegex();
  if (paged.test(text)) {
    return replaceRegexOnce(text, extensionThreadListPagedRegex(), () => next, context, 'extension thread list current workspace filter');
  }
  if (text.includes('c.cwds=s')) {
    return text;
  }
  const old = extensionThreadListOld();
  if (text.includes(old)) {
    return replaceOnce(text, old, next, context, 'extension paged thread list');
  }
  const latest = /requestThreadList\(e\)\{let r=String\(this\.nextRequestId\+\+\),n=new Promise\(\(o,i\)=>\{this\.requestToCallback\.set\(r,s=>\{if\(s\.error\)\{i\(new Error\(s\.error\.message\)\);return\}if\(s\.result==null\)\{i\(new Error\("No result in response"\)\);return\}o\(s\.result\)\}\)\}\);return this\.codexAppServer\.sendRequest\(([A-Za-z_$][\w$]*),r,"thread\/list",\{limit:50,cursor:null,sortKey:"created_at",modelProviders:e\?\[([A-Za-z_$][\w$]*)\]:null,archived:!1,sourceKinds:([A-Za-z_$][\w$]*)(?:,useStateDbOnly:!0)?\}\),n\}/;
  return replaceRegexOnce(text, latest, () => next, context, 'extension paged thread list latest');
}

function extensionThreadListNew(text) {
  const vscodeName = symbolBefore(text, 'onDidChangeChatSessionItemsEmitter=new ', '.EventEmitter;') || 'wl';
  const requestProvider = symbolBefore(text, 'this.codexAppServer.sendRequest(', ',n,"thread/list"') ||
    symbolBefore(text, 'this.codexAppServer.sendRequest(', ',r,"thread/list"') ||
    '_le';
  const modelProvider = symbolBefore(text, 'modelProviders:e?[', ']:null') || 'HS';
  const sourceKindsMatch = text.match(/archived:!1,sourceKinds:([A-Za-z_$][\w$]*)[});]/);
  const sourceKinds = sourceKindsMatch ? sourceKindsMatch[1] : 'Yf';
  const stateDbOnly = /sourceKinds:[A-Za-z_$][\w$]*,useStateDbOnly:!0/.test(text) ? ',useStateDbOnly:!0' : '';
  return `requestThreadList(e,r=null){let n=String(this.nextRequestId++),o=new Promise((i,s)=>{this.requestToCallback.set(n,a=>{if(a.error){s(new Error(a.error.message));return}if(a.result==null){s(new Error("No result in response"));return}i(a.result)})}),s=${vscodeName}.workspace.workspaceFolders?.map(a=>a.uri.fsPath).filter(Boolean)??[],c={limit:200,cursor:r,sortKey:"created_at",modelProviders:e?[${modelProvider}]:null,archived:!1,sourceKinds:${sourceKinds}${stateDbOnly}};s.length>0&&(c.cwds=s);return this.codexAppServer.sendRequest(${requestProvider},n,"thread/list",c),o}`;
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
  let next = text;
  if (!findVscodeMessengerAlias(next)) {
    const vscodeImport = next.match(/import\{[^}]+\}from"(\.\/vscode-api-[^"]+\.js)";/);
    if (!vscodeImport) {
      context.errors.push('header: 找不到 vscode-api import 插入点');
    } else {
      const importText = `import{f as codexLocalGroupsMessengerImport}from"${vscodeImport[1]}";`;
      next = `${next.slice(0, vscodeImport.index + vscodeImport[0].length)}${importText}${next.slice(vscodeImport.index + vscodeImport[0].length)}`;
    }
  }
  if (next.includes('defaultMessage:`Search recent chats`') && next.includes('function at(e){return e.kind===`remote`}')) {
    return patchHeader26715(next, context, file);
  }
  next = patchHeaderBase(next, context, file);
  if (context.safeMode) {
    next = patchHeaderRefreshHook(next, context);
    next = patchHeaderMetadataLiteral(next);
    return patchHeaderGroupHelper(next, context);
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
  next = next.replace('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[60vh] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  return replaceOnce(next, 'ee.map(e=>(0,Q.jsx)(st,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&_===e.conversation.id,onClose:i,onActiveArchiveStart:u},e.key))', 'codexRecentTaskProjectRows(ee,_,i,st,u)', context, 'header 26.715 project rows');
}

function patchHeader26715Dates(text) {
  let next = text.replace('s=r==null?void 0:(0,Q.jsx)(_e,{dateString:new Date(r).toISOString()})', 's=r==null?void 0:codexRecentTaskDateLabel(new Date(r))');
  next = next.replace('case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(Se,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}', 'case`remote`:return(0,Q.jsx)(Se,{task:n.task,onClose:i,metaContent:n.at?codexRecentTaskDateLabel(new Date(n.at)):void 0});');
  return next.replace('e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:(0,Q.jsx)(_e,{dateString:new Date(n.conversation.recencyAt??n.conversation.updatedAt).toISOString()})', 'e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.recencyAt??n.conversation.updatedAt))');
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
  next = next.replace('className:`flex max-h-[900px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[60vh] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
  next = next.replace('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[60vh] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`');
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
  if (text.includes('codexUseExecutionTarget')) {
    return text;
  }
  const match = text.match(/import\{i as [A-Za-z_$][\w$]*\}from"\.\/use-environment-[^"]+\.js";/);
  if (!match) {
    context.errors.push('header: 找不到 use-environment import 插入点');
    return text;
  }
  const assetName = findAsset(path.dirname(file), 'use-webview-execution-target-', '.js', context);
  if (!assetName) {
    return text;
  }
  const importText = `import{n as codexUseExecutionTarget}from"./${assetName}";`;
  return `${text.slice(0, match.index + match[0].length)}${importText}${text.slice(match.index + match[0].length)}`;
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
  const helper = (kindFnName) => addBoundedHeaderHistoryRows(stripHeaderMetadataRows(context.safeMode
    ? safeHeaderHelper(EMPTY_METADATA, messenger, kindFnName)
    : patchHeaderPendingItems(headerHelper(EMPTY_METADATA, messenger, kindFnName))), messenger);
  const currentStartV2 = 'function it(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const previousStartV2 = 'function it(e){return e.kind===`remote`}function codexRecentTaskProjectRows';
  const currentStartV1 = 'function Ke(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const previousStartV1 = 'function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows';
  const currentStartV3 = 'function at(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const previousStartV3 = 'function at(e){return e.kind===`remote`}function codexRecentTaskProjectRows';
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
  if (text.includes('function it(e){return e.kind===`remote`}var at=')) {
    return replaceOnce(text, 'function it(e){return e.kind===`remote`}var at=', `${helper('it')}var at=`, context, 'header local groups helper');
  }
  if (text.includes('function it(e){return e.kind===`remote`}var qe=')) {
    return replaceOnce(text, 'function it(e){return e.kind===`remote`}var qe=', `${helper('it')}var qe=`, context, 'header local groups helper alt');
  }
  if (text.includes('function at(e){return e.kind===`remote`}var ot=')) {
    return replaceOnce(text, 'function at(e){return e.kind===`remote`}var ot=', `${helper('at')}var ot=`, context, 'header local groups helper latest');
  }
  return replaceOnce(text, 'function Ke(e){return e.kind===`remote`}var qe=', `${helper('Ke')}var qe=`, context, 'header local groups helper legacy');
}

function patchAppMain(text, context) {
  let next = patchAppMainMetadataLiteral(text);
  next = patchAppMainHelper(next, context);
  next = patchAppMainAliasUsage(next, context);
  next = patchAppMainContextMenu(next, context);
  next = patchAppMainStatsigNetwork(next, context);
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

function patchAppServerManagerSignals(text, context) {
  let next = text.replace(/var codexLocalGroupsRecentInitialMeta=[\s\S]*?;var codexLocalGroupsRecentPatchVersion=2;/, '');
  next = next.replace(/var codexLocalGroupsRecentPatchVersion=2;function codexLocalGroupsRecentCleanRoot[\s\S]*?function codexLocalGroupsRecentThreadListParams\(e\)\{return typeof e\.limit===`number`&&e\.limit<200\?\{\.\.\.e,limit:200\}:e\}/, appServerManagerSignalsHelper());
  next = next.replace(/var codexLocalGroupsRecentPatchVersion=2;function codexLocalGroupsRecentThreadListParams\(e\)\{return typeof e\.limit===`number`&&e\.limit<200\?\{\.\.\.e,limit:200\}:e\}/g, appServerManagerSignalsHelper());
  if (next.includes('codexLocalGroupsRecentPatchVersion=1')) {
    next = next.replace(/var codexLocalGroupsRecentInitialMeta=[\s\S]*?function codexLocalGroupsRecentThreadListParams\(e\)\{let t=codexLocalGroupsRecentProjectRoots\(\);return t\.length\?\(e=\{\.\.\.e,cwds:t\},typeof e\.limit===`number`&&e\.limit<200&&\(e\.limit=200\),e\):e\}/g, appServerManagerSignalsHelper());
  }
  if (next.includes('codexLocalGroupsRecentPatchVersion=3') && !next.includes('function codexLocalGroupsMarkArchivedConversation')) {
    next = next.replace('var codexLocalGroupsRecentPatchVersion=3;', appServerManagerArchiveHelper());
  }
  if (!next.includes('codexLocalGroupsRecentPatchVersion=3')) {
    if (text.includes('async function ug(')) {
      next = replaceOnce(next, 'async function ug(', `${appServerManagerSignalsHelper()}async function ug(`, context, 'app-server-manager recent helper');
    } else if (text.includes('async function Sg(')) {
      next = replaceOnce(next, 'async function Sg(', `${appServerManagerSignalsHelper()}async function Sg(`, context, 'app-server-manager recent helper legacy');
    } else if (text.includes('async function bb(')) {
      next = replaceOnce(next, 'async function bb(', `${appServerManagerSignalsHelper()}async function bb(`, context, 'app-server-manager recent helper current');
    } else if (text.includes('async function Gk(')) {
      next = replaceOnce(next, 'async function Gk(', `${appServerManagerSignalsHelper()}async function Gk(`, context, 'app-server-manager recent helper 26.715');
    } else {
      const current = /async function ([A-Za-z_$][\w$]*)\(e,\{modelProviders:t,archived:n=!1,sourceKinds:r=[A-Za-z_$][\w$]*,useStateDbOnly:i=!1\}\)\{let a=\[\],o=async s=>/;
      if (!current.test(text)) {
        context.errors.push('app-server-manager recent helper: 找不到注入点');
        return text;
      }
      next = replaceRegexOnce(next, current, (match) => `${appServerManagerSignalsHelper()}${match}`, context, 'app-server-manager recent helper latest');
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
  const archiveOld = 'e.removeConversationFromCache(t),e.dispatchMessageFromView(`thread-archived`,{hostId:e.hostId,conversationId:t,cwd:n})';
  const archiveNew = 'codexLocalGroupsMarkArchivedConversation(t),e.removeConversationFromCache(t),e.dispatchMessageFromView(`thread-archived`,{hostId:e.hostId,conversationId:t,cwd:n})';
  if (!next.includes(archiveNew) && next.includes(archiveOld)) {
    next = replaceOnce(next, archiveOld, archiveNew, context, 'app-server-manager local archive tombstone');
  }
  if (!next.includes(pageNewV2) && !next.includes(pageNewV1)) {
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
    } else {
      next = replaceRegexOnce(next, /var ([A-Za-z_$][\w$]*)=class\{/, `${v2Helper}var $1=class{`, context, 'request usage helper current');
    }
  }
  const oldText = 'async makeRequest(o,s,c){let{headers:l,url:u}=this.getRequestTarget(s,c);';
  const newText = 'async makeRequest(o,s,c){if(codexLocalGroupsIsDisabledUsageRequest(s))return null;let{headers:l,url:u}=this.getRequestTarget(s,c);';
  if (!next.includes(newText)) {
    next = replaceOnce(next, oldText, newText, context, 'request disable wham usage');
  }
  return next;
}

function patchLocalTitle(text, context) {
  let next = replaceMetadataLiteral(text, EMPTY_METADATA, 'var codexLocalGroupsInitialMeta=');
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
  return text;
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

function appServerManagerSignalsHelper() {
  return `${appServerManagerArchiveHelper()}function codexLocalGroupsRecentCleanRoot(e){return String(e??\`\`).replace(/\\\\/g,\`/\`).replace(/\\/+$/,\`\`).trim()}function codexLocalGroupsRecentProjectRoots(){try{let e=codexLocalGroupsRecentCleanRoot(localStorage.getItem(\`codex-local-groups-current-root-v1\`));return e?[e]:[]}catch{return[]}}function codexLocalGroupsRecentThreadListParams(e){let t=codexLocalGroupsRecentProjectRoots(),n=typeof e.limit===\`number\`&&e.limit<200?{...e,limit:200}:e;return t.length?{...n,cwds:t}:n}`;
}

function appServerManagerArchiveHelper() {
  return `var codexLocalGroupsRecentPatchVersion=3;function codexLocalGroupsMarkArchivedConversation(e){try{let t=String(e??\`\`);if(!t)return;let n=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`{}\`);n&&typeof n==\`object\`&&!Array.isArray(n)||(n={version:1,conversations:{}}),n.version=1,n.conversations&&delete n.conversations[t],n.archivedConversations||(n.archivedConversations={}),n.archivedConversations[t]={archivedAtMs:Date.now()},n.updatedAtMs=Date.now(),localStorage.setItem(\`codex-local-groups-meta-v1\`,JSON.stringify(n)),window.dispatchEvent(new Event(\`codex-local-groups-refresh\`))}catch{}}`;
}

function localTitleHelper(metadata) {
  return `var codexLocalGroupsInitialMeta=${metadataLiteral(metadata)};var codexLocalGroupsLocalTitlePatchVersion=6;${metadataMergeSnippet()}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsInitialMeta;try{let t=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`null\`);t&&typeof t==\`object\`&&!Array.isArray(t)&&(e=codexLocalGroupsMergeMeta(e,t))}catch{}return e&&typeof e==\`object\`?e:{version:1,conversations:{}}}function codexTitleAliasFor(e){let t=codexLocalGroupsReadMeta().conversations?.[String(e)]?.title;return typeof t==\`string\`&&t.trim().length>0?t.trim():null}`;
}

function safeHeaderHelper(metadata, messenger, kindFnName) {
  return patchHeaderPendingItems(headerHelper(metadata, messenger, kindFnName))
    .replace('var codexLocalGroupsHeaderPatchVersion=39;', 'var codexLocalGroupsHeaderSafePatchVersion=4;');
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
