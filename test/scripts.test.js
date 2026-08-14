const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  verifyComposerSubagentPanel265803,
  verifyComposerSubagentPanel265810,
  verifyOpenedConversationTitle265803,
  verifyOpenedConversationTitle265810,
} = require('../scripts/verify-patched-bundles');

const openedTitle265803Header = [
  'var codexLocalGroupsOpenedTitle265803PatchVersion=1;',
  'function Bn(e){let t=(0,Gn.c)(64),{allowInitialRouteBack:n,className:i,centerContent:a,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l}=e;',
  'let[,codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)(0);',
  '(0,In.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),',
  's=o==null?s:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:o}})??s;',
].join('');

const composerSubagentPanel265803 = [
  'import{sS as Up}from`./app-initial.js`;',
  'function Cen(e){let{activeConversationId:n,enabled:r,includeMentionItems:i}=e,a=no(Up,r?n:null),o,s;',
  'let select=e=>e.parentConversationId===n,rw=a.filter(select).filter(Een);',
  'o=i?rw.map(Ten):[],s=rw.filter(wen);let c=s;',
  'return{rows:a,visibleRows:c,mentionItems:o}}',
  'function wen(e){return e.isCurrentParentTurn}',
  'function Een(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function _Rt({rows:e,agentCount:t=e.length}){let u=formatMessage({id:`composer.backgroundSubagents.summary`});return u}var bRt,',
  'let xn=(Xe.length>0||Ft)&&!at;',
  'let layout=xFt({subagentsPanel:xn});',
  'let panel=xn?(0,b8.jsx)(_Rt,{agentCount:Math.max(Xe.length,Pt),canStopAll:Ft,rows:Xe}):null;',
].join('');

const subagentMemberships265803 = [
  'function Xmt({cachedConversations:e,conversationTurns:t,getThreadRuntimeStatusEvidence:n,parentConversationId:r,sourceLinkedThreads:i,threadSummaries:a=[]}){',
  'let o=i==null?null:new Map(i.map(e=>[e.id,e])),l=Zmt(t,r,o).map(e=>e);return l}',
  'function Zmt(e,t,n){let r=new Map;for(let i of e)for(let e of i.items){',
  'if(e.type===`subAgentActivity`){r.set(e.agentThreadId,{parentConversationId:t,showInlineActivity:!0});continue}',
  'if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))r.set(e.receiverThreadIds[0],{parentConversationId:t,showInlineActivity:!1})}return Array.from(r.values())}',
  'XV=Ps(Z,(e,{get:t})=>{let n=t(store,e),a=n.getConversation(e),o=Ti(a);return Xmt({cachedConversations:n.getCachedConversations(),conversationTurns:o,getThreadRuntimeStatusEvidence:null,parentConversationId:e,sourceLinkedThreads:null,threadSummaries:[]}).filter(Boolean)},{isEqual:km});',
  'export{foo as a,XV as sS,bar as z};',
].join('');


const openedTitle265810Header = [
  'var codexLocalGroupsOpenedTitle265810PatchVersion=1;',
  'function Bn(e){let t=(0,Gn.c)(64),{allowInitialRouteBack:r,className:i,centerContent:a,desktopDeepLinkConversationId:s,title:c,onBack:l,trailing:u}=e;',
  'let[,codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)(0);',
  '(0,In.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),',
  'c=s==null?c:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:s}})??c;',
].join('');

const composerSubagentPanel265810 = [
  'function DOr(e){let a=wc(lJ,r?n:null),parent=e=>e.parentConversationId===n,rw=a.filter(parent).filter(AOr),s=rw.filter(OOr),c=s;return{rows:a,visibleRows:c,mentionItems:o,firstApproval:l}}',
  'function OOr(e){return e.isCurrentParentTurn}',
  'function AOr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function xzn(e){let t=(0,Ezn.c)(40),{rows:n,agentCount:r,canStopAll:i,isStopAllDisabled:a,onOpenThread:o,onStopAll:s}=e;return {id:`composer.backgroundSubagents.summary`,rows:n}}',
  'function aNr(){let {rows:Ye,visibleRows:Xe}=DOr({activeConversationId:ie,enabled:Ke,includeMentionItems:!0}),fn=(Xe.length>0||kt)&&!it;dCn({subagentsPanel:fn});return fn?(0,J6.jsx)(xzn,{agentCount:Math.max(Xe.length,Ot),rows:Xe}):null}',
].join('');

const subagentMemberships265810 = [
  'function uyn({cachedConversations:e,conversationTurns:t,parentConversationId:a,sourceLinkedThreads:o}){let i=dyn(t,a,null,null).map(e=>e);return i}',
  'function dyn(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){',
  'if(e.type===`subAgentActivity`){i.set(e.agentThreadId,{parentConversationId:t});continue}',
  'if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))i.set(e.receiverThreadIds[0],{parentConversationId:t})}return Array.from(i.values())}',
  'lJ=Dc($,(e,{get:t})=>{let n=t(store,e);return uyn({cachedConversations:[],conversationTurns:n.turns,parentConversationId:e,sourceLinkedThreads:null}).filter(Boolean)});',
  'export{foo as a,lJ as FT,bar as z};',
].join('');

module.exports = {
  name: 'scripts',
  tests: [
    {
      name: 'patch scripts default to native-history safe mode',
      run() {
        for (const file of ['scripts/plan-patches.js', 'scripts/apply-patches.js', 'scripts/repair-codex-ui.js', 'scripts/verify-patched-bundles.js', 'src/extension.js']) {
          const text = fs.readFileSync(file, 'utf8');
          assert.ok(text.includes('safeMode: true'), file);
        }
        const verify = fs.readFileSync('scripts/verify-patched-bundles.js', 'utf8');
        assert.ok(verify.includes('is265730 ? 16 : is26727 ? 15 : 14'));
        assert.ok(verify.includes('codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistoryPatchVersion=4'));
        assert.ok(verify.includes('codexLocalGroupsGroupLimit'));
        assert.ok(verify.includes('codex-local-groups-visible-counts-v1'));
        assert.ok(verify.includes('group-more-'));
        assert.ok(verify.includes('收起到最近 15 条'));
        assert.ok(verify.includes('展开更多'));
        assert.ok(verify.includes('sticky top-0 z-10 bg-token-dropdown-background'));
        assert.ok(verify.includes('codexLocalGroupsProjectRowsView'));
        assert.ok(verify.includes('contentStyle:{height:`600px`,overflow:`hidden`}'));
        assert.ok(verify.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=2'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistory26727PatchVersion=5'));
        assert.ok(verify.includes('codexLocalGroupsCodexUi26727PatchVersion=3'));
        assert.ok(verify.includes('codexLocalGroupsPower26727PatchVersion=3'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistory265730PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsCodexUi265730PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsPower265730PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsHeaderSafe265803PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsOpenedTitle265803PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistory265803PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsCodexUi265803PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsPower265803PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsHeaderSafe265810PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsOpenedTitle265810PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsProjectHistory265810PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsCodexUi265810PatchVersion=1'));
        assert.ok(verify.includes('codexLocalGroupsPower265810PatchVersion=1'));
        assert.ok(verify.includes('timeoutMs:12e4})},12e4)'));
        assert.ok(verify.includes('collabAgentToolCall'));
        assert.ok(verify.includes('multi-agent-action'));
        assert.ok(verify.includes('subAgentActivity'));
        assert.ok(verify.includes('this.onTimeout()},12e4))'));
        assert.ok(verify.includes('codexLocalGroupsHandleWebviewMessage(c,e)'));
        assert.ok(verify.includes('CODEX_EXTENSIONS_ROOT'));
        assert.ok(verify.includes('var codexLocalGroupsInitialMeta='));
        assert.ok(!verify.includes('yuxiMetadataSummary'));
      },
    },
    {
      name: 'verifies the 26.5803 opened conversation title contract',
      run() {
        const headerPath = writeHeader(openedTitle265803Header);
        assert.doesNotThrow(() => verifyOpenedConversationTitle265803(headerPath));
      },
    },
    {
      name: 'fails closed when the 26.5803 opened conversation title contract drifts',
      run() {
        const drifts = [
          ['codexLocalGroupsOpenedTitle265803PatchVersion=1', 'codexLocalGroupsOpenedTitle265803PatchVersion=0'],
          ['window.addEventListener(`codex-local-groups-refresh`,e)', 'window.addEventListener(`broken`,e)'],
          ['window.removeEventListener(`codex-local-groups-refresh`,e)', 'window.removeEventListener(`broken`,e)'],
          ['s=o==null?s:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:o}})??s', 's=s'],
        ];
        for (const [before, after] of drifts) {
          const headerPath = writeHeader(openedTitle265803Header.replace(before, after));
          assert.throws(() => verifyOpenedConversationTitle265803(headerPath), /缺少补丁/);
        }
      },
    },
    {
      name: 'verifies the 26.5803 composer subagent panel contract',
      run() {
        const appMainPath = writeBundle(subagentMemberships265803, 'app-main.js');
        const appServerPath = writeBundle(composerSubagentPanel265803, 'app-server.js');
        assert.doesNotThrow(() => verifyComposerSubagentPanel265803(appMainPath, appServerPath));
      },
    },
    {
      name: 'verifies the older 26.5803 Fs subagent membership selector',
      run() {
        const appMainPath = writeBundle(subagentMemberships265803.replace('XV=Ps(Z,', 'XV=Fs(Z,'), 'app-main.js');
        const appServerPath = writeBundle(composerSubagentPanel265803, 'app-server.js');
        assert.doesNotThrow(() => verifyComposerSubagentPanel265803(appMainPath, appServerPath));
      },
    },
    {
      name: 'fails closed when the 26.5803 subagent membership producer drifts',
      run() {
        const appMainPath = writeBundle(subagentMemberships265803.replace('e.type===`subAgentActivity`', 'e.type===`broken`'), 'app-main.js');
        const appServerPath = writeBundle(composerSubagentPanel265803, 'app-server.js');
        assert.throws(() => verifyComposerSubagentPanel265803(appMainPath, appServerPath), /membership 生产者/);
      },
    },
    {
      name: 'fails closed when the 26.5803 subagent membership selector drifts',
      run() {
        const appMainPath = writeBundle(subagentMemberships265803.replace('XV=Ps(Z,', 'XV=Ps(Broken,'), 'app-main.js');
        const appServerPath = writeBundle(composerSubagentPanel265803, 'app-server.js');
        assert.throws(() => verifyComposerSubagentPanel265803(appMainPath, appServerPath), /membership selector/);
      },
    },
    {
      name: 'fails closed when the 26.5803 subagent membership export drifts',
      run() {
        const appMainPath = writeBundle(subagentMemberships265803.replace('XV as sS', 'XV as broken'), 'app-main.js');
        const appServerPath = writeBundle(composerSubagentPanel265803, 'app-server.js');
        assert.throws(() => verifyComposerSubagentPanel265803(appMainPath, appServerPath), /membership 导出/);
      },
    },
    {
      name: 'fails closed when the 26.5803 composer subagent panel contract drifts',
      run() {
        const appMainPath = writeBundle(subagentMemberships265803, 'app-main.js');
        const drifts = [
          ['sS as Up', 'sS as Broken'],
          ['e=>e.parentConversationId===n', 'e=>e.parentConversationId!==n'],
          ['.filter(Een)', '.filter(Boolean)'],
          ['s=rw.filter(wen)', 's=rw'],
          ['visibleRows:c', 'visibleRows:[]'],
          ['return e.isCurrentParentTurn', 'return true'],
          ['return e.canInteract&&', 'return '],
          ['xn=(Xe.length>0||Ft)', 'xn=Ft'],
          ['subagentsPanel:xn', 'subagentsPanel:false'],
          ['rows:Xe', 'rows:[]'],
          ['composer.backgroundSubagents.summary', 'composer.backgroundSubagents.broken'],
          [')(\u005fRt,{agentCount:', ')(FakePanel,{agentCount:'],
        ];
        for (const [before, after] of drifts) {
          const appServerPath = writeBundle(composerSubagentPanel265803.replace(before, after), 'app-server.js');
          assert.throws(() => verifyComposerSubagentPanel265803(appMainPath, appServerPath), /缺少补丁契约/);
        }
      },
    },
    {
      name: 'verifies the 26.5810 opened conversation title contract',
      run() {
        const headerPath = writeHeader(openedTitle265810Header);
        assert.doesNotThrow(() => verifyOpenedConversationTitle265810(headerPath));
      },
    },
    {
      name: 'fails closed when the 26.5810 opened conversation title contract drifts',
      run() {
        const headerPath = writeHeader(openedTitle265810Header.replace(
          'c=s==null?c:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:s}})??c;',
          'c=s;',
        ));
        assert.throws(() => verifyOpenedConversationTitle265810(headerPath), /缺少补丁/);
      },
    },
    {
      name: 'verifies the 26.5810 composer subagent panel contract',
      run() {
        const appMainPath = writeBundle(subagentMemberships265810 + composerSubagentPanel265810, 'app-main.js');
        assert.doesNotThrow(() => verifyComposerSubagentPanel265810(appMainPath));
      },
    },
    {
      name: 'fails closed when the 26.5810 subagent membership producer drifts',
      run() {
        const appMainPath = writeBundle(
          subagentMemberships265810.replace('e.type===`subAgentActivity`', 'e.type===`broken`') + composerSubagentPanel265810,
          'app-main.js',
        );
        assert.throws(() => verifyComposerSubagentPanel265810(appMainPath), /membership 生产者/);
      },
    },
    {
      name: 'fails closed when the 26.5810 V1 spawnAgent parent binding drifts',
      run() {
        const appMainPath = writeBundle(
          subagentMemberships265810.replace('e.tool!==`spawnAgent`))i.set(e.receiverThreadIds[0],{parentConversationId:t}', 'e.tool!==`spawnAgent`))i.set(e.receiverThreadIds[0],{parentConversationId:other}') + composerSubagentPanel265810,
          'app-main.js',
        );
        assert.throws(() => verifyComposerSubagentPanel265810(appMainPath), /membership 生产者/);
      },
    },
    {
      name: 'fails closed when the 26.5810 selector or export drifts',
      run() {
        const drifts = [
          ['return uyn({cachedConversations:[],conversationTurns:n.turns,parentConversationId:e,sourceLinkedThreads:null}).filter(Boolean)', 'return [].filter(Boolean)'],
          ['lJ as FT', 'lJ as broken'],
        ];
        for (const [before, after] of drifts) {
          const appMainPath = writeBundle(subagentMemberships265810.replace(before, after) + composerSubagentPanel265810, 'app-main.js');
          assert.throws(() => verifyComposerSubagentPanel265810(appMainPath), /membership /);
        }
      },
    },
    {
      name: 'fails closed when the 26.5810 composer consumer chain or xzn summary drifts',
      run() {
        const drifts = [
          ['wc(lJ,r?n:null)', 'wc(broken,r?n:null)'],
          ['.filter(AOr)', '.filter(Boolean)'],
          ['.filter(OOr)', '.filter(Boolean)'],
          ['visibleRows:c', 'visibleRows:[]'],
          ['return e.canInteract&&e.displayName.trim().length>0', 'return e.displayName.trim().length>0'],
          ['return e.isCurrentParentTurn', 'return !0'],
          ['fn=(Xe.length>0||kt)&&!it', 'fn=kt'],
          ['subagentsPanel:fn', 'subagentsPanel:!1'],
          ['rows:Xe', 'rows:[]'],
          ['composer.backgroundSubagents.summary', 'composer.backgroundSubagents.broken'],
        ];
        for (const [before, after] of drifts) {
          const appMainPath = writeBundle(subagentMemberships265810 + composerSubagentPanel265810.replace(before, after), 'app-main.js');
          assert.throws(() => verifyComposerSubagentPanel265810(appMainPath), /缺少补丁契约/);
        }
      },
    },
    {
      name: 'fails closed when the 26.5810 summary is moved out of xzn',
      run() {
        const moved = composerSubagentPanel265810
          .replace('return {id:`composer.backgroundSubagents.summary`,rows:n}', 'return {id:`missing`,rows:n}')
          + 'function other(){return `composer.backgroundSubagents.summary`}';
        const appMainPath = writeBundle(subagentMemberships265810 + moved, 'app-main.js');
        assert.throws(() => verifyComposerSubagentPanel265810(appMainPath), /面板摘要/);
      },
    },
  ],
};

function writeHeader(text) {
  return writeBundle(text, 'header.js');
}

function writeBundle(text, filename) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-groups-verify-'));
  const bundlePath = path.join(dir, filename);
  fs.writeFileSync(bundlePath, text);
  return bundlePath;
}
