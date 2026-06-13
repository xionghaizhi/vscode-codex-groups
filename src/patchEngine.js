const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { normalizeMetadata } = require('./metadataStore');

class CodexPatchEngine {
  constructor(options = {}) {
    this.nodePath = options.nodePath || process.env.NODE_BIN || process.execPath || 'node';
    this.skipSyntaxCheck = options.skipSyntaxCheck === true;
  }

  plan(target, metadata) {
    const normalized = normalizeMetadata(metadata, 'metadata');
    const context = { metadata: normalized, errors: [] };
    const changes = [];
    planFile(changes, target.extensionJsPath, (text) => patchExtension(text, context));
    planFile(changes, target.sidebarPath, (text) => patchSidebar(text, context));
    planFile(changes, target.headerPath, (text, file) => patchHeader(text, context, file));
    planFile(changes, target.appMainPath, (text) => patchAppMain(text, context));
    planFile(changes, target.localTitlePath, (text) => patchLocalTitle(text, context));
    return { changes, errors: context.errors };
  }

  apply(target, metadata) {
    const plan = this.plan(target, metadata);
    if (plan.errors.length) {
      return { ...plan, changed: [], syntax: [], idempotent: false };
    }
    const backups = plan.changes.map((change) => backupFile(change.path));
    try {
      for (const change of plan.changes) {
        fs.writeFileSync(change.path, change.nextText);
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
      checkModule(this.nodePath, target.localTitlePath),
      target.sidebarPath ? checkModule(this.nodePath, target.sidebarPath) : null,
    ].filter(Boolean);
  }
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
    fs.writeFileSync(change.path, change.oldText);
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
  if (result.error) {
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
  if (result.error) {
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
  return next;
}

function patchExtensionMetadataHelper(text, context) {
  if (text.includes('codexLocalGroupsPatchVersion=4')) {
    return text;
  }
  const helper = extensionHostHelper();
  if (text.includes('var kce=require("path"),codexLocalGroupsFs=')) {
    return replaceToMarker(text, 'var kce=require("path"),codexLocalGroupsFs=', 'var xg=', helper, context, 'extension metadata helper upgrade');
  }
  if (text.includes('codexTitleAliasesPath')) {
    return replaceToMarker(text, 'var kce=require("path"),codexTitleAliasesPath=', 'var xg=', helper, context, 'extension metadata helper');
  }
  return replaceOnce(text, 'var kce=require("path");$t();', helper, context, 'extension metadata helper');
}

function patchExtensionAliasUsages(text, context) {
  const replacements = [
    ['s=xce(n)', 's=xce(codexTitleAliasFor(r)??n)', 'extension chat item alias label'],
    ['c=s??e$', 'c=codexTitleAliasFor(n.conversationId)??s??e$', 'extension pending tab alias label'],
    ['r.title=tde(s)', 'r.title=tde(codexTitleAliasFor(i)??s)', 'extension panel initial alias title'],
    ['label:s??void 0', 'label:codexTitleAliasFor(i)??s??void 0', 'extension panel pending alias label'],
    ['r.title=tde(l)', 'r.title=tde(codexTitleAliasFor(i)??l)', 'extension panel preview alias title'],
    ['r.set(String(n.id),n.name?.trim()||n.preview)', 'r.set(String(n.id),(codexTitleAliasFor(n.id)??n.name?.trim())||n.preview)', 'extension preview alias map'],
  ];
  let next = text;
  for (const [oldText, newText, label] of replacements) {
    if (!next.includes(newText)) {
      next = replaceOnce(next, oldText, newText, context, label);
    }
  }
  return next;
}

function patchExtensionMessageHandler(text, context) {
  const oldText = 'e.onDidReceiveMessage(n=>{let o=PH(n);o!=null&&this.#a(o.message)})';
  const newText = 'e.onDidReceiveMessage(n=>{if(codexLocalGroupsHandleWebviewMessage(n))return;let o=PH(n);o!=null&&this.#a(o.message)})';
  if (text.includes(newText)) {
    return text;
  }
  return replaceOnce(text, oldText, newText, context, 'extension webview metadata message handler');
}

function patchExtensionProjectHistory(text, context) {
  if (text.includes('requestAllThreadList') && text.includes('workingDirectoryPath')) {
    return text;
  }
  let next = text;
  next = replaceOnce(next, extensionProviderOld(), extensionProviderNew(text), context, 'extension project history filter');
  next = replaceOnce(next, 'async provideChatSessionItems(e,r){return(await this.requestThreadList(e)).data.map(o=>{let i=this.toThreadListSummary(o);return{summary:i,item:this.toChatSessionItem(i)}})}', 'async provideChatSessionItems(e,r){return(await this.requestAllThreadList(e)).data.map(o=>{let i=this.toThreadListSummary(o);return{summary:i,item:this.toChatSessionItem(i)}})}', context, 'extension load all history');
  next = replaceOnce(next, extensionItemOld(), extensionItemNew(text), context, 'extension chat item cwd metadata');
  next = replaceOnce(next, 'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider}}', 'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider,cwd:e.cwd}}', context, 'extension thread cwd summary');
  return replaceOnce(next, extensionThreadListOld(), extensionThreadListNew(), context, 'extension paged thread list');
}

function extensionProviderOld() {
  return 'async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===IS:c!==IS}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[];for(let{item:c,summary:l}of o)this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c);let s=i.map(c=>this.applyLifecycleToChatSessionItem(c));return Array.from(this.pendingConversations.values()).filter(c=>n(c.modelProvider)).map(c=>this.applyLifecycleToChatSessionItem(c.item)).concat(s)}';
}

function extensionProviderNew(text) {
  const vscodeName = symbolBefore(text, 'onDidChangeChatSessionItemsEmitter=new ', '.EventEmitter;') || 'wl';
  return `async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===IS:c!==IS}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[],s=${vscodeName}.workspace.workspaceFolders?.map(c=>c.uri.fsPath)??[],a=c=>c.replace(/\\/g,\`/\`).replace(/\/+$/,\`\`),u=s.map(c=>a(c));for(let{item:c,summary:l}of o){let d=l.cwd,f=d?a(d):null,m=s.length===0||!f||u.some(h=>f===h||f.startsWith(h+"/"));if(!m)continue;this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c)}let c=i.map(l=>this.applyLifecycleToChatSessionItem(l));return Array.from(this.pendingConversations.values()).filter(l=>n(l.modelProvider)).map(l=>this.applyLifecycleToChatSessionItem(l.item)).concat(c)}`;
}

function extensionItemOld() {
  return 'toChatSessionItem(e){let{conversationId:r,preview:n,createdAtMs:o}=e,i=bce(r),s=xce(n),a=o!=null?{startTime:o}:void 0;return{id:String(r),resource:i,label:s,timing:a}}';
}

function extensionItemNew(text) {
  const pathName = symbolAfter(text, 'var ', '=require("path");') || 'kce';
  return `toChatSessionItem(e){let{conversationId:r,preview:n,createdAtMs:o,cwd:c}=e,i=bce(r),s=xce(codexTitleAliasFor(r)??n),a=o!=null?{startTime:o}:void 0,l=c?${pathName}.basename(c):void 0;return{id:String(r),resource:i,label:s,timing:a,description:l?l:void 0,tooltip:c?\`${'${s}'}\\n${'${c}'}\`:void 0,metadata:c?{workingDirectoryPath:c}:void 0}}`;
}

function extensionThreadListOld() {
  return 'requestThreadList(e){let r=String(this.nextRequestId++),n=new Promise((o,i)=>{this.requestToCallback.set(r,s=>{if(s.error){i(new Error(s.error.message));return}if(s.result==null){i(new Error("No result in response"));return}o(s.result)})});return this.codexAppServer.sendRequest(wce,r,"thread/list",{limit:50,cursor:null,sortKey:"created_at",modelProviders:e?[IS]:null,archived:!1,sourceKinds:jf}),n}';
}

function extensionThreadListNew() {
  return 'async requestAllThreadList(e){let r=[],n=null;do{let o=await this.requestThreadList(e,n);r.push(...o.data),n=o.nextCursor??null}while(n);return{data:r}}requestThreadList(e,r){let n=String(this.nextRequestId++),o=new Promise((i,s)=>{this.requestToCallback.set(n,a=>{if(a.error){s(new Error(a.error.message));return}if(a.result==null){s(new Error("No result in response"));return}i(a.result)})});return this.codexAppServer.sendRequest(wce,n,"thread/list",{limit:200,cursor:r,sortKey:"created_at",modelProviders:e?[IS]:null,archived:!1,sourceKinds:jf}),o}';
}

function patchSidebar(text, context) {
  if (text.includes('t===`recent`?s:t')) {
    return text;
  }
  return replaceRegexOnce(text, /b=t\(([^,]+),\(\{get:e\}\)=>e\(d\)\?\?s\),/, 'b=t($1,({get:e})=>{let t=e(d)??s;return t===`recent`?s:t}),', context, 'sidebar organize mode');
}

function patchHeader(text, context, file) {
  let next = patchHeaderBase(text, context, file);
  next = patchHeaderMetadataLiteral(next, context);
  if (next.includes('codexLocalGroupsHeaderPatchVersion=4')) {
    return next;
  }
  return patchHeaderGroupHelper(next, context);
}

function patchHeaderBase(text, context, file) {
  if (text.includes('codexRecentTaskCurrentRoot')) {
    return text;
  }
  let next = addExecutionTargetImport(text, context, file);
  next = replaceOnce(next, 'h=ge(),g;', 'h=ge(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,g;', context, 'header execution target state');
  next = replaceOnce(next, 'let b=i.filter(y),C=Ve(r.data,i,_),', 'let b=codexRecentConversationFilter(i.filter(y),codexRecentTaskCurrentRoot),C=codexRecentTaskFilter(Ve(r.data,i,_),codexRecentTaskCurrentRoot),', context, 'header current project filter');
  next = replaceOnce(next, 'A.map(e=>(0,Q.jsx)(me,{task:e.task,onClose:a},e.key))', 'A.map(e=>(0,Q.jsx)(me,{task:e.task,onClose:a,metaContent:e.at?codexRecentTaskDateLabel(new Date(e.at)):void 0},e.key))', context, 'header cloud tab date');
  next = replaceOnce(next, 'F.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&p===e.conversation.id,onClose:a},e.key))', 'codexRecentTaskProjectRows(F,p,a)', context, 'header project rows');
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
  next = replaceOnce(next, 'o=r==null?void 0:(0,Q.jsx)(de,{dateString:new Date(r).toISOString()})', 'o=r==null?void 0:codexRecentTaskDateLabel(new Date(r))', context, 'header local tab date');
  next = replaceOnce(next, 'case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(me,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}', 'case`remote`:return(0,Q.jsx)(me,{task:n.task,onClose:i,metaContent:n.at?codexRecentTaskDateLabel(new Date(n.at)):void 0});', context, 'header grouped remote date');
  next = replaceOnce(next, 'e=n.conversation.updatedAt==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.updatedAt).toISOString()})', 'e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt))', context, 'header grouped local date');
  return replaceOnce(next, 'o=(0,Q.jsx)(fe,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r})', 'o=(0,Q.jsx)(fe,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r,metaContent:codexRecentTaskDateLabel(new Date(n.pendingWorktree.createdAt))})', context, 'header pending worktree date');
}

function patchHeaderMetadataLiteral(text, context) {
  return replaceMetadataLiteral(text, context.metadata, 'var codexLocalGroupsInitialMeta=', ';function codexLocalGroupsReadMeta');
}

function patchHeaderGroupHelper(text, context) {
  const messenger = findVscodeMessengerAlias(text) || 'b';
  const currentStart = 'function Ke(e){return e.kind===`remote`}var codexLocalGroupsInitialMeta=';
  const previousStart = 'function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows';
  const upgraded = replaceToMarker(text, currentStart, 'var qe=', headerHelper(context.metadata, messenger));
  if (upgraded) {
    return upgraded;
  }
  const previous = replaceToMarker(text, previousStart, 'var qe=', headerHelper(context.metadata, messenger));
  if (previous) {
    return previous;
  }
  return replaceOnce(text, 'function Ke(e){return e.kind===`remote`}var qe=', `${headerHelper(context.metadata, messenger)}var qe=`, context, 'header local groups helper');
}

function patchAppMain(text, context) {
  let next = patchAppMainMetadataLiteral(text, context);
  next = patchAppMainHelper(next, context);
  next = patchAppMainAliasUsage(next, context);
  next = patchAppMainContextMenu(next, context);
  return next;
}

function patchAppMainMetadataLiteral(text, context) {
  return replaceMetadataLiteral(text, context.metadata, 'var codexLocalGroupsInitialMeta=', ';function codexLocalGroupsReadMeta');
}

function patchAppMainHelper(text, context) {
  if (text.includes('codexLocalGroupsWebviewPatchVersion=4')) {
    return text;
  }
  const messenger = findVscodeMessengerAlias(text) || 'gi';
  if (text.includes('var codexLocalGroupsInitialMeta=')) {
    return replaceBlock(text, 'var codexLocalGroupsInitialMeta=', 'function aE(e){', `${webviewHelper(context.metadata, messenger)}function aE(e){`, context, 'app-main metadata helper upgrade');
  }
  return replaceBlock(text, 'var codexTitleAliasMap=', 'function aE(e){', `${webviewHelper(context.metadata, messenger)}function aE(e){`, context, 'app-main metadata helper');
}

function patchAppMainAliasUsage(text, context) {
  let next = text;
  if (!next.includes('P=codexTitleAliasFor(n)??')) {
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
  const oldItems = '{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},{id:`codex-local-title`,message:`设置本地标题`,onSelect:()=>{codexLocalGroupsPromptTitle(n,P,we??``)}},{id:`codex-local-group`,message:`设置需求分组`,onSelect:()=>{codexLocalGroupsPromptGroup(n,we??``)}},...O==null||O===`local`?[]:';
  const items = '{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...O==null||O===`local`?[{id:`codex-local-title`,message:`设置本地标题`,onSelect:()=>{codexLocalGroupsPromptTitle(n,P,we??``)}},{id:`codex-local-group`,message:`设置需求分组`,onSelect:()=>{codexLocalGroupsPromptGroup(n,we??``)}}]:[],...O==null||O===`local`?[]:';
  if (text.includes(items)) {
    return text;
  }
  if (text.includes(oldItems)) {
    return replaceOnce(text, oldItems, items, context, 'app-main local groups context menu upgrade');
  }
  return replaceOnce(text, oldText, items, context, 'app-main local groups context menu');
}

function patchLocalTitle(text, context) {
  let next = replaceMetadataLiteral(text, context.metadata, 'var codexLocalGroupsInitialMeta=', ';function codexLocalGroupsReadMeta');
  if (next.includes('codexLocalGroupsLocalTitlePatchVersion=4')) {
    return next;
  }
  if (next.includes('var codexLocalGroupsInitialMeta=')) {
    return replaceBlock(next, 'var codexLocalGroupsInitialMeta=', 'var s=', `${localTitleHelper(context.metadata)}var s=`, context, 'local title metadata helper upgrade');
  }
  return replaceBlock(next, 'var codexTitleAliasMap=', 'var s=', `${localTitleHelper(context.metadata)}var s=`, context, 'local title metadata helper');
}

function replaceMetadataLiteral(text, metadata, start, end) {
  if (!text.includes(start)) {
    return text;
  }
  const from = text.indexOf(start) + start.length;
  const to = text.indexOf(end, from);
  if (to < 0) {
    return text;
  }
  const semicolon = text.indexOf(';', from);
  const literalEnd = semicolon >= 0 && semicolon < to ? semicolon : to;
  return `${text.slice(0, from)}${metadataLiteral(metadata)}${text.slice(literalEnd)}`;
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
  const match = text.match(/import\{([^}]+)\}from"\.\/vscode-api-[^"]+\.js";/);
  if (!match) {
    return null;
  }
  const alias = match[1].match(/(?:^|,)f as ([A-Za-z_$][\w$]*)/);
  return alias ? alias[1] : null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function metadataLiteral(metadata) {
  return JSON.stringify(normalizeMetadata(metadata, 'metadata'));
}

function extensionHostHelper() {
  return 'var kce=require("path"),codexLocalGroupsFs=require("fs"),codexLocalGroupsPatchVersion=4,codexLocalGroupsMetaPath="/root/.codex/codex-vscode-conversation-meta.json",codexLocalGroupsOldTitlesPath="/root/.codex/codex-vscode-conversation-titles.json",codexLocalGroupsPatchTimer=null;function codexLocalGroupsReportError(e,t){let r=typeof xg!="undefined"?xg:require("vscode"),n=t&&t.message?t.message:String(t);console.error(e,n,t);r.window?.showWarningMessage?.("Codex Local Groups: "+e+" 失败："+n)}function codexLocalGroupsSchedulePatch(e){codexLocalGroupsPatchTimer||(codexLocalGroupsPatchTimer=setTimeout(()=>{codexLocalGroupsPatchTimer=null,e.commands.executeCommand("codexLocalGroups.applyPatchesSilent").then(()=>{},t=>codexLocalGroupsReportError("自动 patch",t))},500))}function codexLocalGroupsEmptyMeta(){return{version:1,conversations:{},migrations:{oldTitlesImported:!0}}}function codexLocalGroupsReadJson(e,t){try{let r=JSON.parse(codexLocalGroupsFs.readFileSync(e,"utf8"));return r&&typeof r=="object"&&!Array.isArray(r)?r:t}catch{return t}}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsReadJson(codexLocalGroupsMetaPath,null);if(!e){let t=codexLocalGroupsReadJson(codexLocalGroupsOldTitlesPath,{}),r={version:1,conversations:{},migrations:{oldTitlesImported:!0}};for(let[n,o]of Object.entries(t))typeof o=="string"&&o.trim()&&(r.conversations[String(n)]={title:o.trim()});return r}return e.conversations&&typeof e.conversations=="object"?e:codexLocalGroupsEmptyMeta()}function codexTitleAliasFor(e){let r=codexLocalGroupsReadMeta().conversations?.[String(e)]?.title;return typeof r=="string"&&r.trim().length>0?r.trim():null}function codexLocalGroupsWriteFile(e,t){let r=e+"."+process.pid+"."+Date.now()+".tmp";codexLocalGroupsFs.writeFileSync(r,t);let n=codexLocalGroupsFs.openSync(r,"r");try{codexLocalGroupsFs.fsyncSync(n)}finally{codexLocalGroupsFs.closeSync(n)}codexLocalGroupsFs.renameSync(r,e)}function codexLocalGroupsWriteMeta(e){e.version=1,e.updatedAtMs=Date.now(),e.migrations||(e.migrations={oldTitlesImported:!0}),codexLocalGroupsFs.mkdirSync(kce.dirname(codexLocalGroupsMetaPath),{recursive:!0});codexLocalGroupsWriteFile(codexLocalGroupsMetaPath,JSON.stringify(e,null,2)+"\\n")}function codexLocalGroupsMergeConversation(e){let r=codexLocalGroupsReadMeta();r.version=1,r.conversations&&typeof r.conversations=="object"||(r.conversations={});let n=String(e.conversationId??"");if(!n)return r;let o=r.conversations[n]&&typeof r.conversations[n]=="object"?r.conversations[n]:{};typeof e.title=="string"?(e.title.trim()?o.title=e.title.trim():delete o.title):0;typeof e.group=="string"?(e.group.trim()?o.group=e.group.trim():delete o.group):0;typeof e.projectRoot=="string"&&e.projectRoot.trim()&&(o.projectRoot=e.projectRoot.trim());o.updatedAtMs=Date.now(),r.conversations[n]=o;return r}function codexLocalGroupsHandleWebviewMessage(e){try{if(!e||e.type!=="codex-local-groups")return!1;let r=codexLocalGroupsReadMeta();if(e.action==="saveConversationMeta")r=codexLocalGroupsMergeConversation(e);else if(e.action==="setPendingGroup"||e.action==="newConversationInGroup"){let n=String(e.projectRoot??"").trim(),o=String(e.group??"").trim();n&&o?r.pendingGroup={projectRoot:n,group:o,startedAtMs:Number(e.startedAtMs)||Date.now()}:delete r.pendingGroup}else if(e.action==="resetPendingGroup")delete r.pendingGroup;else return!0;codexLocalGroupsWriteMeta(r);let n=typeof xg!="undefined"?xg:require("vscode");codexLocalGroupsSchedulePatch(n);e.action==="newConversationInGroup"&&n.commands.executeCommand("chatgpt.newChat").then(()=>{},t=>codexLocalGroupsReportError("新建 Codex 会话",t));return!0}catch(t){codexLocalGroupsReportError("metadata 保存",t);return!0}}$t();';
}

function webviewHelper(metadata, messenger) {
  return `var codexLocalGroupsInitialMeta=${metadataLiteral(metadata)};var codexLocalGroupsWebviewPatchVersion=4;function codexLocalGroupsMergeMeta(e,t){let n={version:1,updatedAtMs:Math.max(e.updatedAtMs??0,t.updatedAtMs??0),conversations:{...(e.conversations??{})},pendingGroup:(t.updatedAtMs??0)>(e.updatedAtMs??0)?t.pendingGroup:e.pendingGroup,migrations:e.migrations};for(let[r,i]of Object.entries(t.conversations??{})){let a=n.conversations[r];n.conversations[r]=!a||(i.updatedAtMs??0)>=(a.updatedAtMs??0)?i:a}return n}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsInitialMeta;try{let t=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`null\`);t&&typeof t==\`object\`&&!Array.isArray(t)&&(e=codexLocalGroupsMergeMeta(e,t))}catch{}return e&&typeof e==\`object\`?e:{version:1,conversations:{}}}function codexLocalGroupsStoreMeta(e){try{e.updatedAtMs=Date.now(),localStorage.setItem(\`codex-local-groups-meta-v1\`,JSON.stringify(e))}catch{}}function codexTitleAliasFor(e){let t=codexLocalGroupsReadMeta().conversations?.[String(e)]?.title;return typeof t==\`string\`&&t.trim().length>0?t.trim():null}function codexLocalGroupsSaveConversationMeta(e,t,n,r){let i=codexLocalGroupsReadMeta();i.conversations||(i.conversations={});let a=i.conversations[String(e)]??{};t!=null&&(t.trim()?a.title=t.trim():delete a.title),n!=null&&(n.trim()?a.group=n.trim():delete a.group),r&&r.trim()&&(a.projectRoot=r.trim()),a.updatedAtMs=Date.now(),i.conversations[String(e)]=a,codexLocalGroupsStoreMeta(i);try{${messenger}.dispatchMessage(\`codex-local-groups\`,{action:\`saveConversationMeta\`,conversationId:String(e),title:a.title??\`\`,group:a.group??\`\`,projectRoot:a.projectRoot??\`\`})}catch{}}function codexLocalGroupsPromptTitle(e,t,n){let r=prompt(\`设置本地标题\`,t??\`\`);r!=null&&(codexLocalGroupsSaveConversationMeta(e,r,null,n),setTimeout(()=>location.reload(),50))}function codexLocalGroupsPromptGroup(e,t){let n=codexLocalGroupsReadMeta().conversations?.[String(e)]?.group??\`\`,r=prompt(\`设置需求分组\`,n);r!=null&&(codexLocalGroupsSaveConversationMeta(e,null,r,t),setTimeout(()=>location.reload(),50))}`;
}

function localTitleHelper(metadata) {
  return `var codexLocalGroupsInitialMeta=${metadataLiteral(metadata)};var codexLocalGroupsLocalTitlePatchVersion=4;function codexLocalGroupsMergeMeta(e,t){let n={version:1,updatedAtMs:Math.max(e.updatedAtMs??0,t.updatedAtMs??0),conversations:{...(e.conversations??{})},pendingGroup:(t.updatedAtMs??0)>(e.updatedAtMs??0)?t.pendingGroup:e.pendingGroup,migrations:e.migrations};for(let[r,i]of Object.entries(t.conversations??{})){let a=n.conversations[r];n.conversations[r]=!a||(i.updatedAtMs??0)>=(a.updatedAtMs??0)?i:a}return n}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsInitialMeta;try{let t=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`null\`);t&&typeof t==\`object\`&&!Array.isArray(t)&&(e=codexLocalGroupsMergeMeta(e,t))}catch{}return e&&typeof e==\`object\`?e:{version:1,conversations:{}}}function codexTitleAliasFor(e){let t=codexLocalGroupsReadMeta().conversations?.[String(e)]?.title;return typeof t==\`string\`&&t.trim().length>0?t.trim():null}`;
}

function headerHelper(metadata, messenger) {
  return `function Ke(e){return e.kind===\`remote\`}var codexLocalGroupsInitialMeta=${metadataLiteral(metadata)};var codexLocalGroupsHeaderPatchVersion=4;function codexLocalGroupsMergeMeta(e,t){let n={version:1,updatedAtMs:Math.max(e.updatedAtMs??0,t.updatedAtMs??0),conversations:{...(e.conversations??{})},pendingGroup:(t.updatedAtMs??0)>(e.updatedAtMs??0)?t.pendingGroup:e.pendingGroup,migrations:e.migrations};for(let[r,i]of Object.entries(t.conversations??{})){let a=n.conversations[r];n.conversations[r]=!a||(i.updatedAtMs??0)>=(a.updatedAtMs??0)?i:a}return n}function codexLocalGroupsReadMeta(){let e=codexLocalGroupsInitialMeta;try{let t=JSON.parse(localStorage.getItem(\`codex-local-groups-meta-v1\`)??\`null\`);t&&typeof t==\`object\`&&!Array.isArray(t)&&(e=codexLocalGroupsMergeMeta(e,t))}catch{}return e&&typeof e==\`object\`?e:{version:1,conversations:{}}}function codexLocalGroupsStoreMeta(e){try{e.updatedAtMs=Date.now(),localStorage.setItem(\`codex-local-groups-meta-v1\`,JSON.stringify(e))}catch{}}function codexLocalGroupsProjectRoot(e){return e.kind===\`local\`?e.conversation.cwd:e.kind===\`pending-worktree\`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:\`\`}function codexLocalGroupsProjectLabel(e){let t=codexLocalGroupsProjectRoot(e);return e.kind===\`remote\`?e.task.task_status_display?.environment_label?.trim()||\`Cloud\`:codexRecentTaskBasename(t)||\`No project\`}function codexLocalGroupsProjectKey(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return t||\`${'${e.kind}'}:${'${codexLocalGroupsProjectLabel(e)}'}\`}function codexLocalGroupsConversationId(e){return e.kind===\`local\`?e.conversation.id:e.kind===\`remote\`?e.task.id:e.pendingWorktree.id}function codexLocalGroupsProjectMatches(e,t){let n=codexRecentTaskNormalizePath(e),r=codexRecentTaskNormalizePath(t);return!!n&&!!r&&n===r}function codexLocalGroupsItemCreatedAt(e){return e.kind===\`local\`?e.conversation.createdAt??0:0}function codexLocalGroupsCanUsePendingGroup(e,t){let n=Number(t.startedAtMs);if(!Number.isFinite(n)||e.kind!==\`local\`)return!1;let r=Number(codexLocalGroupsItemCreatedAt(e));return Number.isFinite(r)&&r>=n&&Date.now()-n<60000}function codexLocalGroupsGroupLabel(e){if(e.kind!==\`local\`)return\`未分组\`;let t=codexLocalGroupsReadMeta(),n=codexLocalGroupsConversationId(e),r=codexLocalGroupsProjectRoot(e),i=t.conversations?.[String(n)];if(i?.group)return i.group;let a=t.pendingGroup;if(a?.group&&codexLocalGroupsProjectMatches(r,a.projectRoot)&&codexLocalGroupsCanUsePendingGroup(e,a)){codexLocalGroupsSaveConversationGroup(n,a.group,r,t);return a.group}return\`未分组\`}function codexLocalGroupsSaveConversationGroup(e,t,n,r){r.conversations||(r.conversations={}),r.conversations[String(e)]={...(r.conversations[String(e)]??{}),group:t,projectRoot:n,updatedAtMs:Date.now()},delete r.pendingGroup,codexLocalGroupsStoreMeta(r);try{${messenger}.dispatchMessage(\`codex-local-groups\`,{action:\`saveConversationMeta\`,conversationId:String(e),group:t,projectRoot:n});${messenger}.dispatchMessage(\`codex-local-groups\`,{action:\`resetPendingGroup\`})}catch{}}function codexLocalGroupsStartConversationInGroup(e,t){let n=codexLocalGroupsReadMeta();n.pendingGroup={projectRoot:e,group:t,startedAtMs:Date.now()},codexLocalGroupsStoreMeta(n);try{${messenger}.dispatchMessage(\`codex-local-groups\`,{action:\`newConversationInGroup\`,projectRoot:e,group:t,startedAtMs:n.pendingGroup.startedAtMs})}catch{}}function codexRecentTaskProjectRows(e,t,n){let r=[],i=new Map;for(let a of e){let o=codexLocalGroupsProjectKey(a),s=codexLocalGroupsProjectLabel(a),d=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(a)),c=i.get(o);c||(c={label:s,projectRoot:d,groups:[],groupMap:new Map},i.set(o,c),r.push(c));let l=codexLocalGroupsGroupLabel(a),u=c.groupMap.get(l);u||(u={label:l,items:[]},c.groupMap.set(l,u),c.groups.push(u)),u.items.push(a)}return r.flatMap((e,r)=>[(0,Q.jsx)(\`div\`,{className:\`px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-semibold text-token-foreground\`,children:e.label},\`project-${'${r}'}-${'${e.label}'}\`),...e.groups.flatMap((i,a)=>[(0,Q.jsxs)(\`div\`,{className:\`flex items-center justify-between px-[var(--padding-row-x)] pt-1 pb-1 pl-6 text-xs font-medium text-token-input-placeholder-foreground\`,children:[(0,Q.jsx)(\`span\`,{children:i.label}),e.projectRoot?(0,Q.jsx)(\`button\`,{type:\`button\`,className:\`rounded px-1 text-xs hover:bg-token-list-hover-background\`,title:\`新建会话\`,onClick:t=>{t.stopPropagation(),codexLocalGroupsStartConversationInGroup(e.projectRoot,i.label)},children:\`+\`}):null]},\`group-${'${r}'}-${'${a}'}-${'${i.label}'}\`),...i.items.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===\`local\`&&t===e.conversation.id,onClose:n},e.key))])])}function codexRecentTaskProjectLabel(e){return codexLocalGroupsProjectLabel(e)}function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);if(!n)return e;return e.filter(e=>{let t=e.kind===\`local\`?e.conversation.cwd:e.kind===\`pending-worktree\`?e.pendingWorktree.sourceWorkspaceRoot??e.pendingWorktree.worktreeWorkspaceRoot??e.pendingWorktree.worktreeGitRoot:null,r=codexRecentTaskNormalizePath(t);return r===n||r.startsWith(n+\`/\`)})}function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);if(!n)return e;return e.filter(e=>{let t=codexRecentTaskNormalizePath(e.cwd);return t===n||t.startsWith(n+\`/\`)})}function codexRecentTaskNormalizePath(e){if(typeof e!==\`string\`)return\`\`;return e.replace(/\\\\/g,\`/\`).replace(/\\/+$/,\`\`)}function codexRecentTaskBasename(e){let t=codexRecentTaskNormalizePath(e);if(!t)return\`\`;let n=t.split(\`/\`).filter(Boolean);return n[n.length-1]??\`\`}function codexRecentTaskDateLabel(e){if(!Number.isFinite(e.getTime()))return\`\`;let t=new Date,n=String(e.getHours()).padStart(2,\`0\`),r=String(e.getMinutes()).padStart(2,\`0\`);if(e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()&&e.getDate()===t.getDate())return\`${'${n}'}:${'${r}'}\`;let i=String(e.getMonth()+1).padStart(2,\`0\`),a=String(e.getDate()).padStart(2,\`0\`);return\`${'${e.getFullYear()}'}-${'${i}'}-${'${a}'} ${'${n}'}:${'${r}'}\`}`;
}

module.exports = { CodexPatchEngine };
