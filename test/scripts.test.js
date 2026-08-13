const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  verifyComposerSubagentPanel265803,
  verifyOpenedConversationTitle265803,
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
