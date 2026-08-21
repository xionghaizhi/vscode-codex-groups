const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  exactVerifierBuild,
  verifyComposerSubagentPanel265803,
  verifyComposerSubagentPanel265810,
  verifyComposerSubagentPanel265814,
  verifyComposerSubagentPanel265818,
  verifyExecutionTargetImport265818,
  verifyHeaderTitleOverride265818,
  verifyMetadata265814,
  verifyOpenedConversationTitle265803,
  verifyOpenedConversationTitle265810,
  verifyOpenedConversationTitle265814,
  verifyOpenedConversationTitle265818,
  verifyPower265818,
  verifyProjectHistory265818,
  verifyWatchdog265818,
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

const composerSubagentPanel26581041047 = [
  'function DOr(e){let a=wc(lJ,r?n:null),parent=e=>e.parentConversationId===n,rw=a.filter(parent).filter(AOr),s=rw.filter(OOr),c=s;return{rows:a,visibleRows:c,mentionItems:o,firstApproval:l}}',
  'function OOr(e){return e.isCurrentParentTurn}',
  'function AOr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function xzn(e){let t=(0,Ezn.c)(40),{rows:n,agentCount:r,canStopAll:i,isStopAllDisabled:a,onOpenThread:o,onStopAll:s}=e;return {id:`composer.backgroundSubagents.summary`,rows:n}}',
  'function aNr(){let {rows:Ye,visibleRows:Xe}=DOr({activeConversationId:ie,enabled:Ke,includeMentionItems:!0}),fn=(Xe.length>0||kt)&&!it;dCn({subagentsPanel:fn});return fn?(0,J6.jsx)(xzn,{agentCount:Math.max(Xe.length,Ot),rows:Xe}):null}',
].join('');

const subagentMemberships26581041047 = [
  'function uyn({cachedConversations:e,conversationTurns:t,parentConversationId:a,sourceLinkedThreads:o}){let i=dyn(t,a,null,null).map(e=>e);return i}',
  'function dyn(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){',
  'if(e.type===`subAgentActivity`){i.set(e.agentThreadId,{parentConversationId:t});continue}',
  'if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))i.set(e.receiverThreadIds[0],{parentConversationId:t})}return Array.from(i.values())}',
  'lJ=Dc($,(e,{get:t})=>{let n=t(store,e);return uyn({cachedConversations:[],conversationTurns:n.turns,parentConversationId:e,sourceLinkedThreads:null}).filter(Boolean)});',
  'export{foo as a,lJ as FT,bar as z};',
].join('');

const composerSubagentPanel26581052044 = [
  'function AOr(e){let a=jc(uJ,r?n:null),parent=e=>e.parentConversationId===n,rw=a.filter(parent).filter(NOr),s=rw.filter(jOr),c=s;return{rows:a,visibleRows:c,mentionItems:o,firstApproval:l}}',
  'function jOr(e){return e.isCurrentParentTurn}',
  'function NOr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function Szn(e){let t=(0,Dzn.c)(40),{rows:n,agentCount:r,canStopAll:i,isStopAllDisabled:a,onOpenThread:o,onStopAll:s}=e;return {id:`composer.backgroundSubagents.summary`,rows:n}}',
  'function cNr(){let {rows:Ye,visibleRows:Xe}=AOr({activeConversationId:ie,enabled:Ke,includeMentionItems:!0}),pn=(Xe.length>0||kt)&&!it;dCn({subagentsPanel:pn});return pn?(0,q6.jsx)(Szn,{agentCount:Math.max(Xe.length,Ot),rows:Xe}):null}',
].join('');

const subagentMemberships26581052044 = [
  'function dyn({cachedConversations:e,conversationTurns:t,parentConversationId:a,sourceLinkedThreads:o}){let i=fyn(t,a,null,null).map(e=>e);return i}',
  'function fyn(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){',
  'if(e.type===`subAgentActivity`){i.set(e.agentThreadId,{parentConversationId:t});continue}',
  'if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))i.set(e.receiverThreadIds[0],{parentConversationId:t})}return Array.from(i.values())}',
  'uJ=Nc($,(e,{get:t})=>{let n=t(store,e);return dyn({cachedConversations:[],conversationTurns:n.turns,parentConversationId:e,sourceLinkedThreads:null}).filter(Boolean)});',
  'export{foo as a,uJ as FT,bar as z};',
].join('');

const openedTitle265814Header = [
  'var codexLocalGroupsOpenedTitle265810PatchVersion=1;',
  'function zn(e){let t=(0,Wn.c)(64),{allowInitialRouteBack:r,className:i,centerContent:a,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l}=e;',
  'let[,codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)(0);',
  '(0,In.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),',
  's=o==null?s:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:o}})??s;',
].join('');

const subagentMemberships265814 = [
  'function SNn(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){',
  'if(e.type===`subAgentActivity`){let r=js(e.agentThreadId),a=n?.get(r);i.set(r,{conversationId:r,parentConversationId:t});continue}',
  'if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){let e=js(r),a=n?.get(e);i.has(e)||i.set(e,{conversationId:e,parentConversationId:t})}}return Array.from(i.values())}',
  'function xNn({cachedConversations:e,conversationTurns:t,getIndexedSubagentItems:n,parentConversationId:a}){let d=SNn(t,a,null,n);return d}',
  'lX=Ri($,(e,{get:t})=>{if(e==null)return[];let n=typeof e==`string`?e:e.conversationId,l=t(store,n);return xNn({cachedConversations:[],conversationTurns:l.turns,getIndexedSubagentItems:null,parentConversationId:n})});',
  'export{foo as a,lX as IC,bar as z};',
].join('');

const composerSubagentPanel265814 = [
  'function zBr(e){let n=e.activeConversationId,a=sl(lX,n),o,s;let parent=e=>e.parentConversationId===n,rw=a.filter(parent).filter(HBr);o=e.includeMentionItems?rw.map(VBr):[],s=rw.filter(BBr);let c=s;return{rows:a,visibleRows:c,mentionItems:o}}',
  'function BBr(e){return e.isCurrentParentTurn}',
  'function HBr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function RQn(e){let{rows:n,agentCount:r}=e;return{id:`composer.backgroundSubagents.summary`,rows:n,agentCount:r}}',
  'function vWr(){let {rows:nt,visibleRows:rt}=zBr({activeConversationId:ae,enabled:$e,includeMentionItems:tt.ui?.active===!0}),It=!1,dt=!1,hn=!1,ht=!1,pt=!1,yn=(rt.length>0||It)&&!dt&&!hn&&!ht&&!pt;let layout=QFn({subagentsPanel:yn});if(a){if(b){if(c){return yn?(0,I6.jsx)(RQn,{agentCount:Math.max(rt.length,Ft),rows:rt}):null}}}return null}',
].join('');

const metadata265814Header = [
  'var codexLocalGroupsMessenger=codexLocalGroupsMessengerImport;',
  'function codexLocalGroupsPromptTitle(e,t,n){try{codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`promptConversationTitle`,conversationId:e,title:t,projectRoot:n})}catch{}}',
  'function codexLocalGroupsPromptGroup(e,t){try{codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`promptConversationGroup`,conversationId:e,projectRoot:t})}catch{}}',
  'function codexLocalGroupsPromptNewGroup(e){try{codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`promptNewGroup`,projectRoot:e})}catch{}}',
  'function codexLocalGroupsStartConversationInGroup(e,t){try{codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`setPendingGroup`,projectRoot:e,group:t}),codexLocalGroupsMessenger.dispatchHostMessage({type:`new-chat`})}catch{}}',
  'window.addEventListener(`message`,e=>{let t=e.data;t?.type===`codex-local-groups`&&t.action===`metadataSaved`&&t.metadata&&codexLocalGroupsStoreMeta(t.metadata)})',
].join('');

const metadata265814Host = [
  'function codexLocalGroupsSavePromptGroup(e,t,r,n,o){let i={};try{n?.postMessage?.({type:"codex-local-groups",action:"metadataSaved",metadata:i})}catch{}}',
  'function codexLocalGroupsPromptGroupPick(e,t,r,n){return n}',
  'function codexLocalGroupsPromptConversation(e,t){let r="id",o=e.action==="promptConversationTitle";if(!o){codexLocalGroupsPromptGroupPick(r,"","",t);return}let i="title";codexLocalGroupsInputBox("设置本地标题",i,(i,a)=>{let s={};try{t?.postMessage?.({type:"codex-local-groups",action:"metadataSaved",metadata:s})}catch{}})}',
  'function codexLocalGroupsPromptNewGroup(e,t){codexLocalGroupsInputBox("新建需求分组","",(n,o)=>{let s={};try{t?.postMessage?.({type:"codex-local-groups",action:"metadataSaved",metadata:s})}catch{}})}',
  'function codexLocalGroupsHandleWebviewMessage(e,t){try{',
  'if(e.action==="promptConversationTitle"||e.action==="promptConversationGroup"){codexLocalGroupsPromptConversation(e,t);return!0}',
  'if(e.action==="promptNewGroup"){codexLocalGroupsPromptNewGroup(e,t);return!0}',
  'let r={};if(e.action==="getMetadata"){try{t?.postMessage?.({type:"codex-local-groups",action:"metadataSaved",metadata:r})}catch{}return!0}',
  'if(e.action==="save"){}else if(e.action==="setPendingGroup"||e.action==="newConversationInGroup"){}return!0}catch(t){return!0}}',
  'e.onDidReceiveMessage(n=>{if(codexLocalGroupsHandleWebviewMessage(n))return;let o=Q9(n)});',
  'e.onDidReceiveMessage(c=>{if(codexLocalGroupsHandleWebviewMessage(c,e))return;this.handleMessage(e,c)});',
].join('');


const openedTitle265818Header = [
  'var codexLocalGroupsOpenedTitle265810PatchVersion=1;',
  'function zn(e){let t=(0,Wn.c)(64),{allowInitialRouteBack:n,className:r,centerContent:i,desktopDeepLinkConversationId:o,title:s,onBack:c,trailing:l}=e;',
  'let[,codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)(0);',
  '(0,In.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),',
  's=o==null?s:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:o}})??s;return s}',
].join('');

const dropdownTitle265818Header = 'var An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),{item:n,isActive:r,onClose:i,onActiveArchiveStart:a}=e;switch(n.kind){case`local`:{let e=null,c;return t[17]!==r||t[18]!==n.conversation.hostId||t[19]!==n.conversation.id||t[20]!==a||t[21]!==i||t[22]!==e||t[24]!==n.conversation.title?(c=(0,Z.jsx)(Te,{conversationId:n.conversation.id,hostId:n.conversation.hostId,threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.hostId,t[19]=n.conversation.id,t[20]=a,t[21]=i,t[22]=e,t[24]=n.conversation.title,t[23]=c):c=t[23],c}}});';
const watchdog265818Host = 'var QP=class{constructor(e){this.onTimeout=e}start(){let e=Date.now();this.timeout=setTimeout(()=>{this.timeout=void 0,this.onTimeout({elapsedMs:Date.now()-e,receivedWebviewMessage:this.receivedWebviewMessage,timeoutMs:12e4})},12e4)}};';
const power265818Bundle = 'function ogn(e,t){return e.flatMap((e,n)=>e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)||t?.some(t=>t.model===e.model)?[{...e,powerSettingIndex:n}]:[])}function $hn(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){let r=ogn([...cgn,lgn].filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);return r}function v$(e,t){let n=e?.find(e=>e.model===t),r=n==null?X8e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>GS(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
const historyTitle265818Call = '(t=>{let n=$j(String(t.name??``).trim())||String(t.name??``).trim()||null;if(n)return n;let r=sw(String(t.preview??``));if(r==null&&String(t.preview??``).trimStart().startsWith(`<codex_delegation>`))return null;let i=$j(String(r?.input??t.preview??``).trim())||String(r?.input??t.preview??``).trim()||null;return i==null?null:sA(i,60)})(r)';
const projectHistory265818Bundle = [
  'function codexLocalGroupsLoadProjectConversations265810(e,t){let n=[];for(let r of []){let s={cwd:r.cwd};codexLocalGroupsProjectHistoryMatch265810(s.cwd,t)&&n.push(s)}return n}',
  'function codexLocalGroupsMergeProjectConversations265810(e,t,n){let r=new Map;for(let e of t??[])codexLocalGroupsProjectHistoryMatch265810(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values())}',
  'function NPn(e,t,n){let r=arguments.length>0,i={data:[]},a={getForHostId:()=>e},o=`/project`,s=true,c=`local`,l=HN({queryFn:async()=>{let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!udt(r)||!codexLocalGroupsProjectHistoryMatch265810(r.cwd,o))continue;n.push(jk({title:' + historyTitle265818Call + ',cwd:r.cwd||null}))}return n}});return r?s?{...l,data:codexLocalGroupsMergeProjectConversations265810(l.data,i.data,o)}:i}',
].join('');

const subagentMemberships265818 = [
  'function W7e({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort;return{model:r?.model,reasoningEffort:a}}',
  'function t9e(){let o={},_=null,T=null,M=T==null?o?.modelReasoningEffort??_?.model_reasoning_effort??null:o?.modelReasoningEffort??null;return M}function a9e(){let x={profile:null},o={setQueryData(){}},n={},a=null,c=null,re=async(e,t)=>{try{o.setQueryData(n,n=>n==null?n:Object.assign(structuredClone(n),{model:e,model_reasoning_effort:t}));let s=await Vi(a,c).setDefaultModelConfig(e,t,x.profile)}catch{}};return re}',
  'function Wzn(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){',
  'if(e.type===`subAgentActivity`){let r=bs(e.agentThreadId),a=n?.get(r);i.set(r,{conversationId:r,parentConversationId:t});continue}',
  'if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){let e=bs(r),a=n?.get(e);i.has(e)||i.set(e,{conversationId:e,parentConversationId:t})}}return Array.from(i.values())}',
  'function Uzn({cachedConversations:e,conversationTurns:t,getIndexedSubagentItems:n,parentConversationId:a}){let d=Wzn(t,a,null,n);return d}',
  'Pq=ua($,(e,{get:t})=>{if(e==null)return[];let n=typeof e==`string`?e:e.conversationId,l=t(store,n),b=Uzn({cachedConversations:[],conversationTurns:l.turns,getIndexedSubagentItems:null,parentConversationId:n});return b});',
  'export{foo as a,Pq as sw,bar as z};',
].join('');

const composerSubagentPanel265818 = [
  'function JKr(e){let t=(0,QKr.c)(12),{activeConversationId:n,enabled:r,includeMentionItems:i}=e,a=f(Pq,r?n:null),o,s;if(t[0]!==n||t[1]!==i||t[2]!==a){let e;t[5]===n?e=t[6]:(e=e=>e.parentConversationId===n,t[5]=n,t[6]=e);let rw=a.filter(e).filter(ZKr);o=i?rw.map(XKr):[],s=rw.filter(YKr),t[0]=n,t[1]=i,t[2]=a,t[3]=o,t[4]=s}else o=t[3],s=t[4];let c=s,u={rows:a,visibleRows:c,mentionItems:o};return u}',
  'function YKr(e){return e.isCurrentParentTurn}',
  'function ZKr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function $4n(e){let{rows:n,agentCount:r}=e;return{id:`composer.backgroundSubagents.summary`,rows:n,agentCount:r}}',
  'function DXr(){let {rows:nt,visibleRows:at}=JKr({activeConversationId:ae,enabled:$e,includeMentionItems:tt.ui?.active===!0}),Rt=!1,pt=!1,vn=!1,_t=!1,ht=!1,xn=(at.length>0||Rt)&&!pt&&!vn&&!_t&&!ht;let layout=SHn({subagentsPanel:xn});if(a){if(b){if(c){return xn?(0,j6.jsx)($4n,{agentCount:Math.max(at.length,Lt),rows:at}):null}}}return null}',
].join('');

const metadata265818Host = metadata265814Host.replace('let o=Q9(n)', 'let o=nY(n)');

const SCRIPTS_265810_VARIANTS = [
  {
    build: '41047',
    memberships: subagentMemberships26581041047,
    panel: composerSubagentPanel26581041047,
    selectorDrifts: [
      ['return uyn({cachedConversations:[],conversationTurns:n.turns,parentConversationId:e,sourceLinkedThreads:null}).filter(Boolean)', 'return [].filter(Boolean)'],
      ['lJ as FT', 'lJ as broken'],
    ],
    composerDrifts: [
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
    ],
  },
  {
    build: '52044',
    memberships: subagentMemberships26581052044,
    panel: composerSubagentPanel26581052044,
    selectorDrifts: [
      ['return dyn({cachedConversations:[],conversationTurns:n.turns,parentConversationId:e,sourceLinkedThreads:null}).filter(Boolean)', 'return [].filter(Boolean)'],
      ['uJ as FT', 'uJ as broken'],
    ],
    composerDrifts: [
      ['jc(uJ,r?n:null)', 'jc(broken,r?n:null)'],
      ['.filter(NOr)', '.filter(Boolean)'],
      ['.filter(jOr)', '.filter(Boolean)'],
      ['visibleRows:c', 'visibleRows:[]'],
      ['return e.canInteract&&e.displayName.trim().length>0', 'return e.displayName.trim().length>0'],
      ['return e.isCurrentParentTurn', 'return !0'],
      ['pn=(Xe.length>0||kt)&&!it', 'pn=kt'],
      ['subagentsPanel:pn', 'subagentsPanel:!1'],
      ['rows:Xe', 'rows:[]'],
      ['composer.backgroundSubagents.summary', 'composer.backgroundSubagents.broken'],
    ],
  },
];

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
    ...SCRIPTS_265810_VARIANTS.flatMap((v) => [
      {
        name: `verifies the 26.5810.${v.build} composer subagent panel contract`,
        run() {
          const appMainPath = writeBundle(v.memberships + v.panel, 'app-main.js');
          assert.doesNotThrow(() => verifyComposerSubagentPanel265810(appMainPath, v.build));
        },
      },
      {
        name: `fails closed when the 26.5810.${v.build} subagent membership producer drifts`,
        run() {
          const appMainPath = writeBundle(
            v.memberships.replace('e.type===`subAgentActivity`', 'e.type===`broken`') + v.panel,
            'app-main.js',
          );
          assert.throws(() => verifyComposerSubagentPanel265810(appMainPath, v.build), /membership 生产者/);
        },
      },
      {
        name: `fails closed when the 26.5810.${v.build} V1 spawnAgent parent binding drifts`,
        run() {
          const appMainPath = writeBundle(
            v.memberships.replace('e.tool!==`spawnAgent`))i.set(e.receiverThreadIds[0],{parentConversationId:t}', 'e.tool!==`spawnAgent`))i.set(e.receiverThreadIds[0],{parentConversationId:other}') + v.panel,
            'app-main.js',
          );
          assert.throws(() => verifyComposerSubagentPanel265810(appMainPath, v.build), /membership 生产者/);
        },
      },
      {
        name: `fails closed when the 26.5810.${v.build} selector or export drifts`,
        run() {
          for (const [before, after] of v.selectorDrifts) {
            const appMainPath = writeBundle(v.memberships.replace(before, after) + v.panel, 'app-main.js');
            assert.throws(() => verifyComposerSubagentPanel265810(appMainPath, v.build), /membership /);
          }
        },
      },
      {
        name: `fails closed when the 26.5810.${v.build} composer consumer chain or panel summary drifts`,
        run() {
          for (const [before, after] of v.composerDrifts) {
            const appMainPath = writeBundle(v.memberships + v.panel.replace(before, after), 'app-main.js');
            assert.throws(() => verifyComposerSubagentPanel265810(appMainPath, v.build), /缺少补丁契约/);
          }
        },
      },
      {
        name: `fails closed when the 26.5810.${v.build} summary is moved out of the panel`,
        run() {
          const moved = v.panel
            .replace('return {id:`composer.backgroundSubagents.summary`,rows:n}', 'return {id:`missing`,rows:n}')
            + 'function other(){return `composer.backgroundSubagents.summary`}';
          const appMainPath = writeBundle(v.memberships + moved, 'app-main.js');
          assert.throws(() => verifyComposerSubagentPanel265810(appMainPath, v.build), /面板摘要/);
        },
      },
    ]),
    {
      name: 'verifies the 26.5814 opened conversation title contract',
      run() {
        const headerPath = writeHeader(openedTitle265814Header);
        assert.doesNotThrow(() => verifyOpenedConversationTitle265814(headerPath));
      },
    },
    {
      name: 'verifies the 26.5814 metadata entry contracts',
      run() {
        const extensionPath = writeBundle(metadata265814Host, 'extension.js');
        const headerPath = writeHeader(metadata265814Header);
        assert.doesNotThrow(() => verifyMetadata265814(extensionPath, headerPath));
      },
    },
    {
      name: 'fails closed when the 26.5814 metadata entry contracts drift',
      run() {
        const drifts = ['promptConversationTitle', 'promptConversationGroup', 'promptNewGroup', 'setPendingGroup', 'new-chat', 'metadataSaved'];
        for (const marker of drifts) {
          const extensionPath = writeBundle(metadata265814Host.replace(marker, 'broken'), 'extension.js');
          const headerPath = writeHeader(metadata265814Header.replace(marker, 'broken'));
          assert.throws(() => verifyMetadata265814(extensionPath, headerPath), /缺少补丁/, marker);
        }
        for (const marker of ['Q9(n)', 'this.handleMessage(e,c)']) {
          const extensionPath = writeBundle(metadata265814Host.replace(marker, 'broken'), 'extension.js');
          const headerPath = writeHeader(metadata265814Header);
          assert.throws(() => verifyMetadata265814(extensionPath, headerPath), /缺少补丁/);
        }
      },
    },
    {
      name: 'rejects 26.5814 metadata entry decoys outside their function scopes',
      run() {
        for (const action of ['promptConversationTitle', 'promptConversationGroup', 'promptNewGroup', 'setPendingGroup']) {
          const header = metadata265814Header.replace('action:`' + action + '`', 'action:`broken`') + `function laterMetadataDecoy(){return{action:\`${action}\`}}`;
          assert.throws(() => verifyMetadata265814(writeBundle(metadata265814Host, 'extension.js'), writeHeader(header)), /缺少补丁/);
        }
        for (const callback of ['action:"metadataSaved",metadata:i', 'action:"metadataSaved",metadata:s']) {
          const host = metadata265814Host.replace(callback, 'action:"broken",metadata:null') + `function laterHostDecoy(){return{${callback}}}`;
          assert.throws(() => verifyMetadata265814(writeBundle(host, 'extension.js'), writeHeader(metadata265814Header)), /缺少补丁/);
        }
        for (const callback of ['if(codexLocalGroupsHandleWebviewMessage(n))return;let o=Q9(n)', 'if(codexLocalGroupsHandleWebviewMessage(c,e))return;this.handleMessage(e,c)']) {
          const host = metadata265814Host.replace(callback, 'brokenHostCallback') + `function laterHostDecoy(){${callback}}`;
          assert.throws(() => verifyMetadata265814(writeBundle(host, 'extension.js'), writeHeader(metadata265814Header)), /缺少补丁/);
        }
      },
    },
    {
      name: 'rejects 26.5814 nested and same-try metadata decoys',
      run() {
        const brokenHeader = metadata265814Header.replace('action:`promptConversationTitle`', 'action:`broken`');
        const nestedHeader = brokenHeader.replace('function codexLocalGroupsPromptTitle(e,t,n){', 'function codexLocalGroupsPromptTitle(e,t,n){function nested(){try{codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`promptConversationTitle`})}catch{}}');
        const sameTryHeader = brokenHeader.replace('function codexLocalGroupsPromptTitle(e,t,n){try{', 'function codexLocalGroupsPromptTitle(e,t,n){try{({action:`promptConversationTitle`});');
        for (const header of [nestedHeader, sameTryHeader]) {
          assert.throws(() => verifyMetadata265814(writeBundle(metadata265814Host, 'extension.js'), writeHeader(header)), /缺少补丁/);
        }
        const brokenHost = metadata265814Host.replace('action:"metadataSaved",metadata:i', 'action:"broken",metadata:null');
        const nestedHost = brokenHost.replace('function codexLocalGroupsSavePromptGroup(e,t,r,n,o){', 'function codexLocalGroupsSavePromptGroup(e,t,r,n,o){function nested(){try{n?.postMessage?.({action:"metadataSaved",metadata:i})}catch{}}');
        const sameTryHost = brokenHost.replace('n?.postMessage?.({', '({action:"metadataSaved",metadata:i});n?.postMessage?.({');
        for (const host of [nestedHost, sameTryHost]) {
          assert.throws(() => verifyMetadata265814(writeBundle(host, 'extension.js'), writeHeader(metadata265814Header)), /缺少补丁/);
        }
      },
    },
    {
      name: 'fails closed when the 26.5814 opened conversation title contract drifts',
      run() {
        const drifts = ['codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)', 'In.useEffect', 'addEventListener(`codex-local-groups-refresh`', 'removeEventListener(`codex-local-groups-refresh`', 'conversation:{id:o}'];
        for (const marker of drifts) {
          const headerPath = writeHeader(openedTitle265814Header.replace(marker, 'broken'));
          assert.throws(() => verifyOpenedConversationTitle265814(headerPath), /缺少补丁/);
        }
      },
    },
    {
      name: 'verifies the 26.5814 composer subagent panel contract',
      run() {
        const appMainPath = writeBundle(subagentMemberships265814 + composerSubagentPanel265814, 'app-main.js');
        assert.doesNotThrow(() => verifyComposerSubagentPanel265814(appMainPath));
      },
    },
    {
      name: 'fails closed when the 26.5814 membership chain drifts',
      run() {
        const drifts = [
          ['e.type===`subAgentActivity`', 'e.type===`broken`'],
          ['js(e.agentThreadId)', 'e.agentThreadId'],
          ['i.set(r,{conversationId:r', 'i.set(r,{conversationId:broken'],
          ['let e=js(r)', 'let e=r'],
          ['i.set(e,{conversationId:e', 'i.set(e,{conversationId:broken'],
          ['e:e.conversationId', 'e:broken'],
          ['parentConversationId:n', 'parentConversationId:broken'],
          ['lX as IC', 'lX as broken'],
        ];
        for (const [before, after] of drifts) {
          const appMainPath = writeBundle(
            subagentMemberships265814.replace(before, after) + composerSubagentPanel265814,
            'app-main.js',
          );
          assert.throws(() => verifyComposerSubagentPanel265814(appMainPath), /membership /);
        }
      },
    },
    {
      name: 'fails closed when the 26.5814 composer consumer or panel drifts',
      run() {
        const drifts = [
          ['sl(lX,n)', 'sl(broken,n)'],
          ['.filter(HBr)', '.filter(Boolean)'],
          ['.filter(BBr)', '.filter(Boolean)'],
          ['visibleRows:c', 'visibleRows:[]'],
          ['return e.canInteract&&e.displayName.trim().length>0', 'return e.displayName.trim().length>0'],
          ['return e.isCurrentParentTurn', 'return !0'],
          ['yn=(rt.length>0||It)', 'yn=It'],
          ['&&!dt', ''],
          ['&&!hn', ''],
          ['&&!ht', ''],
          ['&&!pt', ''],
          ['subagentsPanel:yn', 'subagentsPanel:!1'],
          ['rows:rt', 'rows:[]'],
          ['composer.backgroundSubagents.summary', 'composer.backgroundSubagents.broken'],
        ];
        for (const [before, after] of drifts) {
          const appMainPath = writeBundle(
            subagentMemberships265814 + composerSubagentPanel265814.replace(before, after),
            'app-main.js',
          );
          assert.throws(() => verifyComposerSubagentPanel265814(appMainPath), /缺少补丁契约/);
        }
      },
    },
    {
      name: 'rejects a broken 26.5814 composer gate despite a later function decoy',
      run() {
        const decoy = 'function laterComposerDecoy(){let yn=(rt.length>0||It)&&!dt&&!hn&&!ht&&!pt;return QFn({subagentsPanel:yn}),yn?(0,I6.jsx)(RQn,{rows:rt}):null}';
        const panel = composerSubagentPanel265814.replace('yn=(rt.length>0||It)&&!dt&&!hn&&!ht&&!pt', 'yn=!1') + decoy;
        const appMainPath = writeBundle(subagentMemberships265814 + panel, 'app-main.js');
        assert.throws(() => verifyComposerSubagentPanel265814(appMainPath), /面板可见性/);
      },
    },
    {
      name: 'rejects broken 26.5814 composer contracts hidden by nested decoys',
      run() {
        const decoy = 'function nestedComposerDecoy(){let yn=(rt.length>0||It)&&!dt&&!hn&&!ht&&!pt;zBr({activeConversationId:ae});QFn({subagentsPanel:yn});if(a){if(b){if(c){return yn?(0,I6.jsx)(RQn,{rows:rt}):null}}}}';
        const gate = composerSubagentPanel265814.replace('yn=(rt.length>0||It)&&!dt&&!hn&&!ht&&!pt', 'yn=!1').replace('function vWr(){', 'function vWr(){' + decoy);
        const activeId = composerSubagentPanel265814.replace('activeConversationId:ae', 'brokenActiveConversationId:ae').replace('function vWr(){', 'function vWr(){function nested(){activeConversationId:ae}');
        for (const panel of [gate, activeId]) {
          const appMainPath = writeBundle(subagentMemberships265814 + panel, 'app-main.js');
          assert.throws(() => verifyComposerSubagentPanel265814(appMainPath), /面板/);
        }
      },
    },
    {
      name: 'verifies the 26.5818 opened conversation title contract',
      run() {
        const headerPath = writeHeader(openedTitle265818Header);
        assert.doesNotThrow(() => verifyOpenedConversationTitle265818(headerPath));
      },
    },
    {
      name: 'rejects a suffixed Codex 26.5818 verifier version',
      run() {
        assert.strictEqual(exactVerifierBuild('26.5818.31338', '26.5818', { 31338: {} }), '31338');
        assert.throws(() => exactVerifierBuild('26.5818.31338.1', '26.5818', { 31338: {} }), /不支持的 Codex 26\.5818 build/);
      },
    },
    {
      name: 'rejects 26.5818 title consumers hidden by later or string decoys',
      run() {
        assert.doesNotThrow(() => verifyHeaderTitleOverride265818(writeHeader(dropdownTitle265818Header)));
        assert.throws(() => verifyHeaderTitleOverride265818(writeHeader(dropdownTitle265818Header + dropdownTitle265818Header)), /下拉会话标题/);
        const opened = openedTitle265818Header.replace('s=o==null?s:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:o}})??s;', 's=`broken`;') + openedTitle265818Header.slice(openedTitle265818Header.indexOf('function zn'));
        assert.throws(() => verifyOpenedConversationTitle265818(writeHeader(opened)), /标题刷新/);
        const dropdown = dropdownTitle265818Header.replace('titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0', 'titleOverride:void 0') + 'var titleDecoy=`titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0`;';
        assert.throws(() => verifyHeaderTitleOverride265818(writeHeader(dropdown)), /下拉会话标题/);
      },
    },
    {
      name: 'rejects a wrong 26.5818 execution target import alias',
      run() {
        const header = 'import{foo as a,Flt as codexLocalGroupsMessengerImport,c0 as codexUseExecutionTarget,bar as z}from"./app-initial-main.js";';
        assert.doesNotThrow(() => verifyExecutionTargetImport265818(writeHeader(header)));
        assert.throws(() => verifyExecutionTargetImport265818(writeHeader(header.replace('c0 as codexUseExecutionTarget', 'U$ as codexUseExecutionTarget'))), /Header semantic imports/);
        const wrong = header.replace('Flt as codexLocalGroupsMessengerImport', 'Vst as codexLocalGroupsMessengerImport');
        const decoys = ['var decoy=`Flt as codexLocalGroupsMessengerImport`;', 'function later(){return`Flt as codexLocalGroupsMessengerImport`}', 'function outer(){function nested(){return`Flt as codexLocalGroupsMessengerImport`}}'];
        for (const decoy of decoys) assert.throws(() => verifyExecutionTargetImport265818(writeHeader(wrong + decoy)), /Header semantic imports/);
      },
    },
    {
      name: 'rejects 26.5818 watchdog history and power string decoys',
      run() {
        assert.doesNotThrow(() => verifyWatchdog265818(writeBundle(watchdog265818Host, 'extension.js')));
        assert.throws(() => verifyWatchdog265818(writeBundle(watchdog265818Host + watchdog265818Host, 'extension.js')), /QP 看门狗/);
        assert.doesNotThrow(() => verifyProjectHistory265818(writeBundle(projectHistory265818Bundle, 'server.js')));
        assert.doesNotThrow(() => verifyPower265818(writeBundle(power265818Bundle, 'power.js')));
        const watchdog = watchdog265818Host.replaceAll('12e4', '99e4') + 'var watchdogDecoy=`timeoutMs:12e4})},12e4)`;';
        assert.throws(() => verifyWatchdog265818(writeBundle(watchdog, 'extension.js')), /QP 看门狗/);
        for (const replacement of ['title:null', 'title:wRt(r,AF)']) {
          const history = projectHistory265818Bundle.replace('title:' + historyTitle265818Call, replacement) + 'var historyDecoy=`' + historyTitle265818Call + '`;';
          assert.throws(() => verifyProjectHistory265818(writeBundle(history, 'server.js')), /project history 隔离与标题/);
        }
        const power = power265818Bundle.replace('return t===`gpt-5.6-sol`&&', 'return t===`broken-model`&&') + 'var powerDecoy=`return t===gpt-5.6-sol`';
        assert.throws(() => verifyPower265818(writeBundle(power, 'power.js')), /Sol Max Ultra/);
      },
    },
    {
      name: 'rejects 26.5818 Power slider consumer decoys',
      run() {
        const expected = 'ogn([...cgn,lgn].filter';
        const broken = power265818Bundle.replace(expected, 'ogn([...cgn].filter');
        const decoys = ['var decoy=`' + expected + '`;', 'function later(){return`' + expected + '`}', 'function outer(){function nested(){return`' + expected + '`}}'];
        for (const decoy of decoys) assert.throws(() => verifyPower265818(writeBundle(broken + decoy, 'power.js')), /Sol Max Ultra/);
      },
    },
    {
      name: 'rejects 26.5818 history isolation string decoys',
      run() {
        const isolation = [
          ['codexLocalGroupsProjectHistoryMatch265810(s.cwd,t)&&n.push(', 'true&&n.push('],
          ['codexLocalGroupsProjectHistoryMatch265810(e?.cwd,n)&&r.set(e.id,e)', 'true&&r.set(e.id,e)'],
          ['!codexLocalGroupsProjectHistoryMatch265810(r.cwd,o))continue', '!1)continue'],
          ['codexLocalGroupsMergeProjectConversations265810(l.data,i.data,o)', 'l.data'],
        ];
        for (const [expected, broken] of isolation) {
          const history = projectHistory265818Bundle.replace(expected, broken) + 'var historyIsolationDecoy=`' + expected + '`;';
          assert.throws(() => verifyProjectHistory265818(writeBundle(history, 'server.js')), /project history 隔离与标题/);
        }
      },
    },
    {
      name: 'verifies the 26.5818 metadata entry contracts',
      run() {
        const extensionPath = writeBundle(metadata265818Host, 'extension.js');
        const headerPath = writeHeader(metadata265814Header);
        assert.doesNotThrow(() => verifyMetadata265814(extensionPath, headerPath, 'nY'));
      },
    },
    {
      name: 'rejects 26.5818 metadata entry decoys outside their function scopes',
      run() {
        for (const action of ['promptConversationTitle', 'promptConversationGroup', 'promptNewGroup', 'setPendingGroup']) {
          const header = metadata265814Header.replace('action:`' + action + '`', 'action:`broken`') + `function laterMetadataDecoy(){return{action:\`${action}\`}}`;
          assert.throws(() => verifyMetadata265814(writeBundle(metadata265818Host, 'extension.js'), writeHeader(header), 'nY'), /缺少补丁/);
        }
        const host = metadata265818Host.replace('action:"metadataSaved",metadata:i', 'action:"broken",metadata:null') + 'function laterHostDecoy(){return{action:"metadataSaved",metadata:i}}';
        assert.throws(() => verifyMetadata265814(writeBundle(host, 'extension.js'), writeHeader(metadata265814Header), 'nY'), /缺少补丁/);
      },
    },
    {
      name: 'rejects 26.5818 nested and same-try metadata decoys',
      run() {
        const brokenHeader = metadata265814Header.replace('action:`promptConversationTitle`', 'action:`broken`');
        assert.throws(() => verifyMetadata265814(writeBundle(metadata265818Host, 'extension.js'), writeHeader(brokenHeader + 'function nested(){function inner(){return{action:`promptConversationTitle`}}}'), 'nY'), /缺少补丁/);
        assert.throws(() => verifyMetadata265814(writeBundle(metadata265818Host, 'extension.js'), writeHeader(brokenHeader + 'try{const decoy={action:`promptConversationTitle`}}catch{}'), 'nY'), /缺少补丁/);
      },
    },
    {
      name: 'verifies the 26.5818 composer subagent panel contract',
      run() {
        const appMainPath = writeBundle(subagentMemberships265818 + composerSubagentPanel265818, 'app-main.js');
        assert.doesNotThrow(() => verifyComposerSubagentPanel265818(appMainPath));
      },
    },
    {
      name: 'rejects a broken 26.5818 Sol validation hidden by a string decoy',
      run() {
        const expected = 'r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)';
        const base = subagentMemberships265818 + composerSubagentPanel265818;
        const validation = base.replace(expected, 'r?.model===`broken-model`&&(t===`max`||t===`ultra`)') + 'var validationDecoy=`' + expected + '`;';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(validation, 'app-main.js')), /Sol reasoning validation/);
        const read = 'o?.modelReasoningEffort??_?.model_reasoning_effort??null:o?.modelReasoningEffort??null';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(base.replace(read, 'o?.brokenReasoningEffort??null') + 'var readDecoy=`' + read + '`;', 'app-main.js')), /Sol reasoning persistence/);
        const write = 'o.setQueryData(n,n=>n==null?n:Object.assign(structuredClone(n),{model:e,model_reasoning_effort:t}))';
        const broken = base.replace(write, 'o.setQueryData(n,n=>n)') + 'function laterPersistence(){let re=async(e,t)=>{' + write + '}}';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(broken, 'app-main.js')), /Sol reasoning persistence/);
        const nested = base.replace(write, 'o.setQueryData(n,n=>n)').replace('re=async(e,t)=>{try{', 're=async(e,t)=>{try{if(false){' + write + '}');
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(nested, 'app-main.js')), /Sol reasoning persistence/);
      },
    },
    {
      name: 'fails closed when the 26.5818 membership chain drifts',
      run() {
        const drifts = [
          ['e.type===`subAgentActivity`', 'e.type===`brokenActivity`'],
          ['e.tool!==`spawnAgent`', 'e.tool!==`brokenSpawn`'],
          ['Pq as sw', 'Pq as broken'],
          ['parentConversationId:n', 'parentConversationId:other'],
        ];
        for (const [before, after] of drifts) {
          const appMainPath = writeBundle(subagentMemberships265818.replace(before, after) + composerSubagentPanel265818, 'app-main.js');
          assert.throws(() => verifyComposerSubagentPanel265818(appMainPath), /membership /);
        }
      },
    },
    {
      name: 'rejects 26.5818 membership scopes hidden by nested or string decoys',
      run() {
        const main = subagentMemberships265818 + composerSubagentPanel265818;
        const producer = main.slice(main.indexOf('function Wzn'), main.indexOf('function Uzn'));
        const aggregator = main.slice(main.indexOf('function Uzn'), main.indexOf('Pq=ua'));
        const selector = main.slice(main.indexOf('Pq=ua'), main.indexOf('export{'));
        const hook = main.slice(main.indexOf('function JKr'), main.indexOf('function YKr'));
        const drifts = [
          main.replace('e.type===`subAgentActivity`', 'e.type===`brokenActivity`').replace('function DXr(){', 'function DXr(){function nestedProducer(){' + producer + '}'),
          main.replace('let d=Wzn(t,a,null,n)', 'let d=broken(t,a,null,n)').replace('function DXr(){', 'function DXr(){function nestedAggregator(){' + aggregator + '}'),
          main.replace('b=Uzn({', 'b=broken({').replace('function DXr(){', 'function DXr(){function nestedSelector(){' + selector + '}'),
          main.replace('Pq as sw', 'Pq as broken') + 'var exportDecoy=`Pq as sw,`;',
          main.replace('parentConversationId===n', 'parentConversationId===other').replace('function DXr(){', 'function DXr(){function nestedHook(){' + hook + '}'),
        ];
        for (const drift of drifts) {
          const appMainPath = writeBundle(drift, 'app-main.js');
          assert.throws(() => verifyComposerSubagentPanel265818(appMainPath), /membership|面板行筛选/);
        }
      },
    },
    {
      name: 'rejects a broken 26.5818 composer gate despite a later function decoy',
      run() {
        const decoy = 'function laterComposerDecoy(){let xn=(at.length>0||Rt)&&!pt&&!vn&&!_t&&!ht;return SHn({subagentsPanel:xn}),xn?(0,j6.jsx)($4n,{rows:at}):null}';
        const panel = composerSubagentPanel265818.replace('xn=(at.length>0||Rt)&&!pt&&!vn&&!_t&&!ht', 'xn=!1') + decoy;
        const appMainPath = writeBundle(subagentMemberships265818 + panel, 'app-main.js');
        assert.throws(() => verifyComposerSubagentPanel265818(appMainPath), /面板可见性/);
      },
    },
    {
      name: 'rejects broken 26.5818 composer contracts hidden by nested decoys',
      run() {
        const decoy = 'function nestedComposerDecoy(){let xn=(at.length>0||Rt)&&!pt&&!vn&&!_t&&!ht;JKr({activeConversationId:ae});SHn({subagentsPanel:xn});if(a){if(b){if(c){return xn?(0,j6.jsx)($4n,{rows:at}):null}}}}';
        const gate = composerSubagentPanel265818.replace('xn=(at.length>0||Rt)&&!pt&&!vn&&!_t&&!ht', 'xn=!1').replace('function DXr(){', 'function DXr(){' + decoy);
        const activeId = composerSubagentPanel265818.replace('activeConversationId:ae', 'brokenActiveConversationId:ae').replace('function DXr(){', 'function DXr(){function nested(){activeConversationId:ae}');
        for (const panel of [gate, activeId]) {
          const appMainPath = writeBundle(subagentMemberships265818 + panel, 'app-main.js');
          assert.throws(() => verifyComposerSubagentPanel265818(appMainPath), /面板/);
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
