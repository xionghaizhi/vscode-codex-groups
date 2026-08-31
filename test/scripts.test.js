const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerTemporaryPath } = require('./test-utils');
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
  verifyComposerSubagentPanel265825,
  verifyExecutionTargetImport265825,
  verifyHeaderTitleOverride265825,
  verifyMetadata265825,
  verifyOpenedConversationTitle265825,
  verifyPower265825,
  verifyProjectHistory265825,
  verifyWatchdog265825,
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
const openedTitle26581841705Header = [
  'var codexLocalGroupsOpenedTitle265810PatchVersion=1;',
  'function zn(e){let t=(0,Wn.c)(64),{allowInitialRouteBack:n,className:r,centerContent:i,desktopDeepLinkConversationId:a,title:o,onBack:c,trailing:l}=e;',
  'let[,codexLocalGroupsSetPageTitleRefresh]=(0,In.useState)(0);',
  '(0,In.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),',
  'o=a==null?o:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:a}})??o;return o}',
].join('');
const dropdownTitle26581841705Header = 'var An=(0,Dn.memo)(function(e){let t=(0,En.c)(25),{item:r,isActive:i,onClose:a,onActiveArchiveStart:o}=e;switch(r.kind){case`local`:{let e,n;return t[17]!==i||t[18]!==r.conversation.hostId||t[19]!==r.conversation.id||t[20]!==o||t[21]!==a||t[22]!==e||t[24]!==r.conversation.title?(n=(0,Z.jsx)(xe,{conversationId:r.conversation.id,hostId:r.conversation.hostId,threadSummary:r.conversation,titleOverride:codexLocalGroupsLocalTitle(r)?(0,Z.jsx)(Z.Fragment,{children:r.conversation.title}):void 0,isActive:i,metaContent:e,onClick:a,onActiveArchiveStart:o}),t[17]=i,t[18]=r.conversation.hostId,t[19]=r.conversation.id,t[20]=o,t[21]=a,t[22]=e,t[24]=r.conversation.title,t[23]=n):n=t[23],n}}});';
const power26581841705Bundle = 'function bCn(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}function pCn(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){let r=bCn((t?[...SCn,CCn]:SCn).filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);if(r.length>=3)return r;let i=bCn(wCn.filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);return i.length>=3?i:[]}function y$(e,t){let n=e?.find(e=>e.model===t),r=n==null?J8e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>dw(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
const historyTitle26581841705Call = '(t=>{let n=vM(String(t.name??``).trim())||String(t.name??``).trim()||null;if(n)return n;let r=$C(String(t.preview??``));if(r==null&&String(t.preview??``).trimStart().startsWith(`<codex_delegation>`))return null;let i=vM(String(r?.input??t.preview??``).trim())||String(r?.input??t.preview??``).trim()||null;return i==null?null:xA(i,60)})(r)';
const projectHistory26581841705StateDbMethod = 'async listRecentThreads({cursor:e,limit:t,background:n=!1,useStateDbOnly:a=this.params.hostId!==PT}){let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:CE,useStateDbOnly:a},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});return{...i,data:i.data.filter(ddt)}}';
const projectHistory26581841705NativeMethod = 'async listRecentThreads({cursor:e,limit:t,background:n=!1}){let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:CE,useStateDbOnly:this.params.hostId!==PT},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});return{...i,data:i.data.filter(ddt)}}';
const projectHistory26581841705StateDbCall = 'e.listRecentThreads({cursor:i,limit:100,background:!0,useStateDbOnly:!0})';
const projectHistory26581841705LoadedMapper = 'bdt({thread:a,hostId:s.hostId,conversationId:s.conversationId,turns:[],threadTitle:s.title,resumeState:`needs_resume`,latestCollaborationMode:{mode:`default`,settings:{reasoning_effort:null,model:``,developer_instructions:null}},workspaceKind:s.workspaceKind,hasUnreadTurn:s.hasUnreadTurn})';
const projectHistory26581841705FallbackMapper = 'bdt({thread:r,hostId:c,conversationId:i,turns:[],threadTitle:' + historyTitle26581841705Call + ',resumeState:`needs_resume`,latestCollaborationMode:{mode:`default`,settings:{reasoning_effort:null,model:``,developer_instructions:null}},workspaceKind:r.workspaceKind??`project`,hasUnreadTurn:r.hasUnreadTurn??!1})';
const projectHistory26581841705Bundle = [
  'var Store=class{async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265810(this,e)}async listArchivedThreads(){}' + projectHistory26581841705StateDbMethod + '};',
  'function bdt({thread:e,hostId:t,conversationId:n,turns:r,threadTitle:i,resumeState:a,latestCollaborationMode:o,workspaceKind:s=`project`,workspaceBrowserRoot:c,projectlessOutputDirectory:l,hasUnreadTurn:u}){return{id:n,cwd:e.cwd}}',
  'async function codexLocalGroupsLoadProjectConversations265810(e,t){let n=[],r=new Set,i=null;do{let a=await e.listRecentThreads({cursor:i,limit:100,background:!0,useStateDbOnly:!0}),o=a.nextCursor;for(let r of a.data){let i=e.threadsById.get(r.id),a=i??r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch265810(s.cwd,t)&&n.push(' + projectHistory26581841705LoadedMapper + ')}o!=null&&r.add(o),i=o}while(i!=null);return n}',
  'function codexLocalGroupsMergeProjectConversations265810(e,t,n){let r=new Map;for(let e of t??[])codexLocalGroupsProjectHistoryMatch265810(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values())}',
  'function qPn(e,t,n){let r=arguments.length>0,i={data:[]},a={getForHostId:()=>e},o=`/project`,s=true,c=`local`,l=IN({queryFn:async()=>{let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!ddt(r)||!codexLocalGroupsProjectHistoryMatch265810(r.cwd,o))continue;n.push(' + projectHistory26581841705FallbackMapper + ')}return n}});return r?s?{...l,data:codexLocalGroupsMergeProjectConversations265810(l.data,i.data,o)}:i}',
].join('');
const subagentMemberships26581841705 = [
  'function F7e({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort;return{model:r?.model,reasoningEffort:a}}',
  'function K7e(){let o={},_=null,T=null,M=T==null?o?.modelReasoningEffort??_?.model_reasoning_effort??null:o?.modelReasoningEffort??null;return M}function X7e(){let w={profile:null},o={setQueryData(){}},n={},a=null,c=null,oe=async(e,t)=>{try{o.setQueryData(n,n=>n==null?n:Object.assign(structuredClone(n),{model:e,model_reasoning_effort:t}));let s=await Ce(a,c).setDefaultModelConfig(e,t,w.profile)}catch{}};return oe}',
  'function GWn(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){if(e.type===`subAgentActivity`){let r=ks(e.agentThreadId),a=n?.get(r);i.set(r,{conversationId:r,parentConversationId:t});continue}if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){let e=ks(r),a=n?.get(e);i.has(e)||i.set(e,{conversationId:e,parentConversationId:t})}}return Array.from(i.values())}',
  'function WWn({cachedConversations:e,conversationTurns:t,getIndexedSubagentItems:n,parentConversationId:a}){let d=GWn(t,a,c,n);return d}',
  'var zX,BX=e((()=>{zX=ti($,(e,{get:t})=>{if(e==null)return[];let n=typeof e==`string`?e:e.conversationId,l=t(store,n),m=[],v=WWn({cachedConversations:m,conversationTurns:l,parentConversationId:n});return v})}));',
  'export{foo as a,zX as DS,bar as z};',
].join('');
const composerSubagentPanel26581841705 = [
  'function Uqr(e){let t={},n=e.activeConversationId,r=e.enabled,i=e.includeMentionItems,a=Bc(zX,r?n:null),o,s;if(t[0]!==n||t[1]!==i||t[2]!==a){let e=e=>e.parentConversationId===n,r=a.filter(e).filter(Kqr);o=i?r:[],s=r.filter(Wqr)}let c=s,l=null,u={rows:a,visibleRows:c,mentionItems:o,firstApproval:l};return u}',
  'function Wqr(e){return e.isCurrentParentTurn}',
  'function Kqr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function yer(e){let{rows:n,agentCount:r}=e,l={formatMessage(){}};if(a){if(b){if(c){let m=l.formatMessage({id:`composer.backgroundSubagents.summary`,defaultMessage:`summary`,description:`summary`},{count:r??n.length});return m}}}return null}',
  'function SZr(){let {rows:st,visibleRows:Vt}=Uqr({activeConversationId:oe,enabled:rt,includeMentionItems:at.ui?.active===!0}),Bt=0,ht=!1,bn=!1,yt=!1,_t=!1,Cn=(st.length>0||Vt)&&!ht&&!bn&&!yt&&!_t;let layout=Iqn({subagentsPanel:Cn});if(a){if(b){if(c){return Cn?(0,A6.jsx)(yer,{agentCount:Math.max(st.length,Bt),rows:st}):null}}}return null}',
].join('');
const semanticImports26581841705Main = 'var Tu={postMessage(){}},U_e=null;function V_e(e){U_e=e}var ku,Au,ju=e((()=>{ku=class e{static getInstance(){return new e}dispatchMessage(e,t){Tu.postMessage({...t,type:e})}deliverMessage(){}dispatchHostMessage(e){this.deliverMessage(e.type,e)}},Au=ku.getInstance(),V_e((e,t)=>{Au.dispatchMessage(e,t)})}));function Bw(e){let f=e,g=!1,h=null,p={},_;return _={activeWorkspaceRoot:f,isActiveWorkspaceRootLoading:g,hostConfig:h,...p},_}export{Au as Jlt,Bw as Z1};';


const openedTitle265825Header = [
  'var codexLocalGroupsOpenedTitle265825PatchVersion=1,codexLocalGroupsHeaderSafe265825PatchVersion=2;',
  'function Ln(e){let t=(0,Hn.c)(64),{allowInitialRouteBack:n,className:r,centerContent:i,desktopDeepLinkConversationId:a,title:o,onBack:s,trailing:c}=e;',
  'let[,codexLocalGroupsSetPageTitleRefresh]=(0,Pn.useState)(0);',
  '(0,Pn.useEffect)(()=>{let e=()=>codexLocalGroupsSetPageTitleRefresh(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),',
  'o=a==null?o:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:a}})??o;return(0,Z.jsx)(`div`,{children:o?o:null})}',
].join('');
const projectRowsView265825Header = 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Pn.useState)(0);return(0,Pn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}';
const dropdownTitle265825Header = 'var On=(0,En.memo)(function(e){let t=(0,Tn.c)(24),{item:n,isActive:r,onClose:i,onActiveArchiveStart:a}=e;switch(n.kind){case`local`:{let e,c;return c=(0,Z.jsx)(Ze,{conversationId:n.conversation.id,hostId:n.conversation.hostId,threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),c}}});';
const semanticImports265825Main = 'var Ku={postMessage(){}},ySe,bSe,Yu,Xu,Zu=e((()=>{Yu=class e{static instance=null;static getInstance(){return this.instance??=new e,this.instance}dispatchMessage(e,t){Ku.postMessage({...t,type:e})}deliverMessage(){}dispatchHostMessage(e){this.deliverMessage(e.type,e)}},Xu=Yu.getInstance(),aSe((e,t)=>{Xu.dispatchMessage(e,t)})}));function BS(e){let f=e,g=!1,h=null,p={},_;return _={activeWorkspaceRoot:f,isActiveWorkspaceRootLoading:g,hostConfig:h,...p},_}export{Xu as _pt,BS as w8};';
const metadata265825Host = metadata265814Host.replace('let o=Q9(n)', 'let o=DY(n)') + 'var yP=class{constructor(e){this.onTimeout=e}start(){let e=Date.now();this.timeout=setTimeout(()=>{this.timeout=void 0,this.onTimeout({elapsedMs:Date.now()-e,receivedWebviewMessage:this.receivedWebviewMessage,timeoutMs:12e4})},12e4)}handleStartupPhase(e){e==="renderer_ready"&&this.dispose()}dispose(){}};var SCe=require("node:child_process");var codexHost=0,Cd=class t{async initializeWebview(e,r,n,o){let s=new yP(()=>{});this.registerClientCoordinationForWebview(e,n,s)}createClientCoordinationSession(e,r,n){let o={};return this.registerAppHostSessionForWebview(e,r,o,n)}registerAppHostSessionForWebview(e,r,n,o){return{startup:{reach:a=>o.handleStartupPhase(a)}}}};';
const power265825Bundle = 'function mEn(){}function hEn(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}var gEn,_En,vEn,yEn,PK={};function uEn(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){let r=hEn((t?[..._En,vEn]:_En).filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);if(r.length>=3)return r;let i=hEn(wEn.filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);return i.length>=3?i:[]}function B$(e,t){let n=e?.find(e=>e.model===t),r=n==null?e1e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>$x(e.reasoningEffort));return t===`gpt-5.6-sol`&&(r.some(e=>e.reasoningEffort===`max`)||r.push({description:``,reasoningEffort:`max`}),r.some(e=>e.reasoningEffort===`ultra`)||r.push({description:``,reasoningEffort:`ultra`})),r}';
const historyTitle265825Call = '(t=>{let n=IP(String(t.name??``).trim())||String(t.name??``).trim()||null;if(n)return n;let r=qT(String(t.preview??``));if(r==null&&String(t.preview??``).trimStart().startsWith(`<codex_delegation>`))return null;let i=IP(String(r?.input??t.preview??``).trim())||String(r?.input??t.preview??``).trim()||null;return i==null?null:LP(i,60)})(r)';
const projectHistory265825StateDbMethod = 'async listRecentThreads({cursor:e,limit:t,background:n=!1,useStateDbOnly:a=this.params.hostId!==WD}){let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:RO,useStateDbOnly:a},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});return{...i,data:i.data.filter(Mdt)}}';
const projectHistory265825Bundle = [
  'var codexLocalGroupsProjectHistory265825PatchVersion=1,$Ct=class{async loadThreadHydrationState(){}async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265825(this,e)}async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return HCt({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient)},{modelProviders:e,archived:t,sourceKinds:n})}' + projectHistory265825StateDbMethod + '};',
  'var VP=t((()=>{}));function RCt({thread:e,hostId:t,conversationId:n,turns:r,threadTitle:i,resumeState:a,latestCollaborationMode:o,workspaceKind:s=`project`,workspaceBrowserRoot:c,projectlessOutputDirectory:l,hasUnreadTurn:u}){let{createdAt:d,updatedAt:f,recencyAt:p}=zP(e);return{id:n,cwd:e.cwd}}var zCt={};',
  'async function codexLocalGroupsLoadProjectConversations265825(e,t){let n=[],r=new Set,i=null;do{let a=e.listRecentThreads({cursor:i,limit:100,background:!0,useStateDbOnly:!0}),o=a.nextCursor;for(let r of a.data){let i=e.threadsById.get(r.id),a=i??r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch265825(s.cwd,t)&&n.push(RCt({thread:a,hostId:s.hostId,conversationId:s.conversationId,turns:[],threadTitle:s.title,resumeState:`needs_resume`,latestCollaborationMode:{mode:`default`,settings:{reasoning_effort:null,model:``,developer_instructions:null}},workspaceKind:s.workspaceKind,hasUnreadTurn:s.hasUnreadTurn}))}o!=null&&r.add(o),i=o}while(i!=null);return n}',
  'function codexLocalGroupsMergeProjectConversations265825(e,t,n){let r=new Map;for(let e of t??[])codexLocalGroupsProjectHistoryMatch265825(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values())}',
  'function zun(e,t,n){let r=arguments.length>0,i={data:[]},a={getForHostId:()=>e},o=codexLocalGroupsProjectHistoryPath265825(e),s=n===!0&&!!o,c=`local`,l=pR({enabled:s,queryKey:[`codex-local-groups-project-history-265825-v1`,c,o],queryFn:async()=>{let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!Mdt(r)||!codexLocalGroupsProjectHistoryMatch265825(r.cwd,o))continue;n.push(RCt({thread:r,hostId:c,conversationId:i,turns:[],threadTitle:' + historyTitle265825Call + ',resumeState:`needs_resume`,latestCollaborationMode:{mode:`default`,settings:{reasoning_effort:null,model:``,developer_instructions:null}},workspaceKind:r.workspaceKind??`project`,hasUnreadTurn:r.hasUnreadTurn??!1}))}return n}});return r?s?{...l,data:codexLocalGroupsMergeProjectConversations265825(l.data,i.data,o)}:i}',
].join('');
const subagentMemberships265825 = [
  'function t4e({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort;return{model:r?.model,reasoningEffort:a}}',
  'function f4e(){let o={},_=null,T=null,M=T==null?o?.modelReasoningEffort??_?.model_reasoning_effort??null:o?.modelReasoningEffort??null;return M}',
  'function g4e(){let o={setQueryData(){}},n={},a={profile:null},c=null,l=null,oe=async(e,t,n)=>{try{o.setQueryData(n,n=>n==null?n:Object.assign(structuredClone(n),{model:e,model_reasoning_effort:t}));let s=await fu(c,l).setDefaultModelConfig(e,t,a.profile)}catch{}};return oe}',
  'function jbr(e){return[...e]}',
  'function Mbr(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){if(e.type===`subAgentActivity`){let r=ba(e.agentThreadId),a=n?.get(r);i.set(r,{conversationId:r,parentConversationId:t});continue}if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){let e=ba(r),a=n?.get(e);i.has(e)||i.set(e,{conversationId:e,parentConversationId:t})}}return Array.from(i.values())}',
  'function Nbr(){return null}',
  'function Abr({cachedConversations:e,conversationTurns:t,getIndexedSubagentItems:n,parentConversationId:a}){let d=Mbr(t,a,c,n);return d}',
  'var p4Base=0,p4=Ee($,(e,{get:t})=>{if(e==null)return[];let n=typeof e==`string`?e:e.conversationId,l=t(store,n),m=[],v=Abr({cachedConversations:m,conversationTurns:l,getIndexedSubagentItems:null,parentConversationId:n});return v});export{p4 as Rm};var config={isBackgroundSubagentsEnabled:x=!0};',
].join('');
const composerSubagentPanel265825 = [
  'function gMr(e){let t={},n=e.activeConversationId,r=e.enabled,i=e.includeMentionItems,a=fu(p4,r?n:null),o,s;if(t[0]!==n||t[1]!==i||t[2]!==a){let e=e=>e.parentConversationId===n,r=a.filter(e).filter(yMr);o=i?r:[],s=r.filter(_Mr)}let c=s,l=null,u={rows:a,visibleRows:c,mentionItems:o,firstApproval:l};return u}',
  'function _Mr(e){return e.isCurrentParentTurn}',
  'function vMr(){return null}',
  'function yMr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'var bMr,xMr,SMr={};',
  'function a8n(e){let{rows:n,agentCount:r}=e,l={formatMessage(){}};return l.formatMessage({id:`composer.backgroundSubagents.summary`},{count:r??n.length})}',
  'function uIr(){let {rows:st,visibleRows:mt}=gMr({activeConversationId:oe,enabled:rt,includeMentionItems:at.ui?.active===!0}),qt=!0,Kt=1,St=!1,Dn=!1,Dt=!1,wt=!1,jn=(mt.length>0||qt)&&!St&&!Dn&&!Dt&&!wt;let layout=EHn({portalContent:null,subagentsPanel:jn});return jn?(0,B3.jsx)(a8n,{agentCount:Math.max(mt.length,Kt),canStopAll:qt,rows:mt}):null}',
].join('');
const projectHistory26582551511Bundle = [
  'var codexLocalGroupsProjectHistory265825PatchVersion=1,twt=class{async loadThreadHydrationState(){}async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265825(this,e)}async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return WCt({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient)},{modelProviders:e,archived:t,sourceKinds:n})}async listRecentThreads({cursor:e,limit:t,background:n=!1,useStateDbOnly:a=this.params.hostId!==UD}){let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:LO,useStateDbOnly:a},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});return{...i,data:i.data.filter(Pdt)}}};',
  'var BP=t((()=>{}));function BCt({thread:e,hostId:t,conversationId:n,turns:r,threadTitle:i,resumeState:a,latestCollaborationMode:o,workspaceKind:s=`project`,workspaceBrowserRoot:c,projectlessOutputDirectory:l,hasUnreadTurn:u}){let{createdAt:d,updatedAt:f,recencyAt:p}=RP(e);return{id:n,cwd:e.cwd}}var VCt={};',
  'async function codexLocalGroupsLoadProjectConversations265825(e,t){let n=[],r=new Set,i=null;do{let a=e.listRecentThreads({cursor:i,limit:100,background:!0,useStateDbOnly:!0}),o=a.nextCursor;for(let r of a.data){let i=e.threadsById.get(r.id),a=i??r,s=e.getThreadSummaryFromThread(a);e.shouldSurfaceThreadSummary(s)&&codexLocalGroupsProjectHistoryMatch265825(s.cwd,t)&&n.push(BCt({thread:a,hostId:s.hostId,conversationId:s.conversationId,turns:[],threadTitle:s.title,resumeState:`needs_resume`,latestCollaborationMode:{mode:`default`,settings:{reasoning_effort:null,model:``,developer_instructions:null}},workspaceKind:s.workspaceKind,hasUnreadTurn:s.hasUnreadTurn}))}o!=null&&r.add(o),i=o}while(i!=null);return n}',
  'function codexLocalGroupsMergeProjectConversations265825(e,t,n){let r=new Map;for(let e of t??[])codexLocalGroupsProjectHistoryMatch265825(e?.cwd,n)&&r.set(e.id,e);return Array.from(r.values())}',
  'function Vun(e,t,n){let r=arguments.length>0,i={data:[]},a={getForHostId:()=>e},o=codexLocalGroupsProjectHistoryPath265825(e),s=n===!0&&!!o,c=`local`,l=fR({enabled:s,queryKey:[`codex-local-groups-project-history-265825-v1`,c,o],queryFn:async()=>{let n=[];for(let r of await e.listAllThreads({modelProviders:null})){if(!Pdt(r)||!codexLocalGroupsProjectHistoryMatch265825(r.cwd,o))continue;n.push(BCt({thread:r,hostId:c,conversationId:i,turns:[],threadTitle:zCt(r,FP),resumeState:`needs_resume`,latestCollaborationMode:{mode:`default`,settings:{reasoning_effort:null,model:``,developer_instructions:null}},workspaceKind:r.workspaceKind??`project`,hasUnreadTurn:r.hasUnreadTurn??!1}))}return n}});return r?s?{...l,data:codexLocalGroupsMergeProjectConversations265825(l.data,i.data,o)}:i}',
].join('');
const subagentMemberships26582551511 = [
  'function Z2e({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort;return{model:r?.model,reasoningEffort:a}}',
  'function f4e(e,t){let P={settings:{reasoning_effort:null}},R=P?.settings.reasoning_effort??null,o={setQueryData(){}},i={},a=null,c=null,C={profile:null},oe=async(e,t)=>{o.setQueryData(i,n=>n==null?n:Object.assign(structuredClone(n),{model:e,model_reasoning_effort:t}));return Gu(a,c).setDefaultModelConfig(e,t,C.profile)};return{R,oe}}',
  'function Mbr({cachedConversations:e,conversationTurns:t,getIndexedSubagentItems:n,parentConversationId:i}){let d=Pbr(t,i,null,n).map(e=>e),f=Fbr({cachedConversationById:new Map,hasSubAgentActivity:d.length>0,parentConversationId:i,parentMemberships:d,sourceLinkedThreadsById:null,threadSummaryById:new Map});return[...d,...f]}',
  'function Nbr(e){return[...e]}function Pbr(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){if(e.type===`subAgentActivity`){let r=le(e.agentThreadId);i.set(r,{conversationId:r,parentConversationId:t});continue}if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){let e=le(r);i.has(e)||i.set(e,{conversationId:e,parentConversationId:t})}}return Array.from(i.values())}',
  'function Fbr(){return[]}var p4Base=0,p4=zo($,(e,{get:t})=>{if(e==null)return[];let n=typeof e===`string`?e:e.conversationId,l=t(store,n);return Mbr({cachedConversations:[],conversationTurns:l,parentConversationId:n})});export{p4 as Rm};',
].join('');
const composerSubagentPanel26582551511 = [
  'function vMr(e){let t={},n=e.activeConversationId,r=e.enabled,i=e.includeMentionItems,a=Qs(p4,r?n:null),o,s;if(t[0]!==n){let e=e=>e.parentConversationId===n,u=a.filter(e).filter(xMr);o=i?u:[],s=u.filter(yMr)}return{rows:a,visibleRows:s,mentionItems:o}}',
  'function yMr(e){return e.isCurrentParentTurn}function xMr(e){return e.canInteract&&e.displayName.trim().length>0}',
  'function s8n(e){let{rows:n,agentCount:r}=e,l={formatMessage(){}};return l.formatMessage({id:`composer.backgroundSubagents.summary`},{count:r??n.length})}',
  'function fIr({animateRadius:e}){let{rows:pt,visibleRows:qt}=vMr({activeConversationId:oe,enabled:rt,includeMentionItems:!0}),Kt=0,xt=!1,Dn=!1,Et=!1,Ct=!1,jn=(pt.length>0||qt)&&!xt&&!Dn&&!Et&&!Ct;let layout=tHn({subagentsPanel:jn});return jn?(0,B3.jsx)(s8n,{agentCount:Math.max(pt.length,Kt),canStopAll:qt,rows:pt}):null}',
].join('');

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
        assert.ok(verify.includes('codexLocalGroupsPower265810PatchVersion=2'));
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
        assert.strictEqual(exactVerifierBuild('26.5818.41705', '26.5818', { 31338: {}, 41705: {} }), '41705');
        assert.throws(() => exactVerifierBuild('26.5818.31338.1', '26.5818', { 31338: {} }), /不支持的 Codex 26\.5818 build/);
        assert.throws(() => exactVerifierBuild('26.5818.41705.1', '26.5818', { 31338: {}, 41705: {} }), /不支持的 Codex 26\.5818 build/);
      },
    },
    {
      name: 'verifies the exact 26.5825.32147 scoped contracts',
      run() {
        const header = writeHeader(openedTitle265825Header + projectRowsView265825Header + dropdownTitle265825Header + metadata265814Header + 'import{zx as M}from"./app-initial-DOdr0yAB.js";import{_pt as codexLocalGroupsMessengerImport,w8 as codexUseExecutionTarget}from"./app-initial-DraLrsJK.js";');
        const host = writeBundle(metadata265825Host, 'extension.js');
        const main = writeBundle(semanticImports265825Main + subagentMemberships265825 + composerSubagentPanel265825, 'app-main.js');
        assert.strictEqual(exactVerifierBuild('26.5825.32147', '26.5825', { 32147: {} }), '32147');
        assert.doesNotThrow(() => verifyOpenedConversationTitle265825(header));
        assert.doesNotThrow(() => verifyHeaderTitleOverride265825(header));
        assert.doesNotThrow(() => verifyExecutionTargetImport265825(header, main));
        assert.doesNotThrow(() => verifyMetadata265825(host, header));
        assert.doesNotThrow(() => verifyWatchdog265825(host));
        assert.doesNotThrow(() => verifyPower265825(writeBundle(power265825Bundle, 'power.js')));
        assert.doesNotThrow(() => verifyProjectHistory265825(writeBundle(projectHistory265825Bundle, 'server.js')));
        assert.doesNotThrow(() => verifyComposerSubagentPanel265825(main));
      },
    },
    {
      name: 'verifies the complete 26.5825.51511 scoped contracts',
      run() {
        const mainText = semanticImports265825Main
          .replaceAll('Yu', 'nd').replaceAll('Xu', 'rd').replaceAll('Zu', 'id')
          .replaceAll('aSe', 'tSe').replaceAll('BS', 'KS')
          + subagentMemberships26582551511 + composerSubagentPanel26582551511;
        const headerText = openedTitle265825Header + projectRowsView265825Header + dropdownTitle265825Header + metadata265814Header
          + 'import{zx as M}from"./app-initial-DzcK9AhZ.js";import{_pt as codexLocalGroupsMessengerImport,w8 as codexUseExecutionTarget}from"./app-initial-yrsrisSW.js";';
        const hostText = metadata265825Host.replaceAll('DY', 'NY').replaceAll('SCe', 'wCe');
        const powerText = power265825Bundle.replaceAll('mEn', 'mJ').replaceAll('hEn', 'Nwn')
          .replaceAll('_En', 'Fwn').replaceAll('vEn', 'Iwn').replaceAll('yEn', 'Lwn')
          .replaceAll('uEn', 'Own').replaceAll('$x', 'gS').replaceAll('e1e', 'z$e')
          .replaceAll('gEn', 'Pwn').replaceAll('PK', 'vJ');
        assert.strictEqual(exactVerifierBuild('26.5825.51511', '26.5825', { 32147: {}, 51511: {} }), '51511');
        assert.throws(() => exactVerifierBuild('26.5825.51511.1', '26.5825', { 32147: {}, 51511: {} }), /不支持的 Codex 26\.5825 build/);
        const header = writeHeader(headerText);
        const main = writeBundle(mainText, 'app-main-51511.js');
        assert.doesNotThrow(() => verifyOpenedConversationTitle265825(header, '51511'));
        assert.doesNotThrow(() => verifyHeaderTitleOverride265825(header, '51511'));
        assert.doesNotThrow(() => verifyExecutionTargetImport265825(header, main, '51511'));
        assert.doesNotThrow(() => verifyMetadata265825(writeBundle(hostText, 'extension-51511.js'), header, '51511'));
        assert.doesNotThrow(() => verifyWatchdog265825(writeBundle(hostText, 'watchdog-51511.js'), '51511'));
        assert.doesNotThrow(() => verifyPower265825(writeBundle(powerText, 'power-51511.js'), '51511'));
        assert.doesNotThrow(() => verifyProjectHistory265825(writeBundle(projectHistory26582551511Bundle, 'server-51511.js'), '51511'));
        assert.doesNotThrow(() => verifyComposerSubagentPanel265825(main, '51511'));
      },
    },
    {
      name: 'rejects 26.5825.51511 title history subagent Sol and Power decoys',
      run() {
        const wrongRuntime = openedTitle265825Header + projectRowsView265825Header.replaceAll('(0,Pn.', '(0,$.') + dropdownTitle265825Header;
        assert.throws(() => verifyHeaderTitleOverride265825(writeHeader(wrongRuntime), '51511'), /下拉会话标题/);
        const wrongRequest = projectHistory26582551511Bundle.replace('return WCt(', 'return HCt(') + 'function WCt(){return`decoy`}';
        assert.throws(() => verifyProjectHistory265825(writeBundle(wrongRequest, 'server-51511.js'), '51511'), /state DB/);
        const wrongMapper = projectHistory26582551511Bundle.replace('let{createdAt:d,updatedAt:f,recencyAt:p}=RP(e)', 'let{createdAt:d,updatedAt:f,recencyAt:p}=zP(e)') + 'function nested(){return`RP(e)`}';
        assert.throws(() => verifyProjectHistory265825(writeBundle(wrongMapper, 'server-51511.js'), '51511'), /mapper/);
        const wrongVisibility = projectHistory26582551511Bundle.replace('if(!Pdt(r)||', 'if(!Mdt(r)||') + 'function Pdt(){return!0}';
        assert.throws(() => verifyProjectHistory265825(writeBundle(wrongVisibility, 'server-51511.js'), '51511'), /state DB/);
        const base = subagentMemberships26582551511 + composerSubagentPanel26582551511;
        const persistence = base.replace('settings.reasoning_effort??null', 'settings.broken??null') + 'function nested(){return`settings.reasoning_effort??null`}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(persistence, 'main-51511.js'), '51511'), /Sol reasoning persistence/);
        const producer = base.replace('e.type===`subAgentActivity`', 'e.type===`brokenActivity`') + 'function nested(){return`subAgentActivity`}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(producer, 'main-51511.js'), '51511'), /membership/);
        const panel = base.replace('jn=(pt.length>0||qt)&&!xt&&!Dn&&!Et&&!Ct', 'jn=!1') + 'function FakePanel(){let jn=(pt.length>0||qt)&&!xt&&!Dn&&!Et&&!Ct;return jn?(0,B3.jsx)(s8n,{rows:pt}):null}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(panel, 'main-51511.js'), '51511'), /membership 或面板/);
        const power = power265825Bundle.replaceAll('mEn', 'mJ').replaceAll('hEn', 'Nwn')
          .replaceAll('_En', 'Fwn').replaceAll('vEn', 'Iwn').replaceAll('yEn', 'Lwn')
          .replaceAll('uEn', 'Own').replaceAll('$x', 'gS').replaceAll('e1e', 'z$e')
          .replaceAll('gEn', 'Pwn').replaceAll('PK', 'vJ')
          .replace('(t?[...Fwn,Iwn]:Fwn)', '[...Fwn,Iwn]');
        assert.throws(() => verifyPower265825(writeBundle(power, 'power-51511.js'), '51511'), /Sol Max Ultra/);
      },
    },
    {
      name: 'rejects 26.5825.32147 scoped strings nested later duplicates and fake panels',
      run() {
        assert.throws(() => exactVerifierBuild('26.5825.32147.1', '26.5825', { 32147: {} }), /不支持的 Codex 26\.5825 build/);
        assert.throws(() => exactVerifierBuild('26.5825.99999', '26.5825', { 32147: {} }), /不支持的 Codex 26\.5825 build/);
        const title = openedTitle265825Header.replace('o=a==null?o:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:a}})??o', 'o=`broken`') + 'function later(){return`o=a==null?o:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:a}})??o`}';
        assert.throws(() => verifyOpenedConversationTitle265825(writeHeader(title)), /已打开会话标题/);
        const duplicateTitle = openedTitle265825Header + openedTitle265825Header;
        assert.throws(() => verifyOpenedConversationTitle265825(writeHeader(duplicateTitle)), /已打开会话标题/);
        const dropdown = openedTitle265825Header + projectRowsView265825Header + dropdownTitle265825Header.replace('titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0', 'titleOverride:void 0') + 'function nested(){return(0,Z.jsx)(Ze,{threadSummary:n.conversation,titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0})}';
        assert.throws(() => verifyHeaderTitleOverride265825(writeHeader(dropdown)), /下拉会话标题/);
        const wrongRuntime = openedTitle265825Header + projectRowsView265825Header.replaceAll('(0,Pn.', '(0,$.') + dropdownTitle265825Header;
        assert.throws(() => verifyHeaderTitleOverride265825(writeHeader(wrongRuntime)), /下拉会话标题/);
        const header = writeHeader('import{zx as M}from"./app-initial-DOdr0yAB.js";import{bad as codexLocalGroupsMessengerImport,w8 as codexUseExecutionTarget}from"./app-initial-DraLrsJK.js";');
        const main = writeBundle(semanticImports265825Main, 'app-main.js');
        assert.throws(() => verifyExecutionTargetImport265825(header, main), /semantic imports/);
        const driftedMain = semanticImports265825Main.replace('Xu as _pt', 'Xu as broken') + 'function nested(){return`Xu as _pt`}';
        const goodHeader = writeHeader('import{zx as M}from"./app-initial-DOdr0yAB.js";import{_pt as codexLocalGroupsMessengerImport,w8 as codexUseExecutionTarget}from"./app-initial-DraLrsJK.js";');
        assert.throws(() => verifyExecutionTargetImport265825(goodHeader, writeBundle(driftedMain, 'app-main.js')), /semantic imports/);
        const brokenMessenger = semanticImports265825Main.replace('Xu=Yu.getInstance()', 'Xu=null') + 'function later(){let Xu=Yu.getInstance();return`Xu=Yu.getInstance()`}';
        assert.throws(() => verifyExecutionTargetImport265825(goodHeader, writeBundle(brokenMessenger, 'app-main.js')), /semantic imports/);
        const emptyRelay = semanticImports265825Main.replace('aSe((e,t)=>{Xu.dispatchMessage(e,t)})', 'aSe((e,t)=>{})') + 'function wrapper(){0;aSe((e,t)=>{Xu.dispatchMessage(e,t)})}';
        assert.throws(() => verifyExecutionTargetImport265825(goodHeader, writeBundle(emptyRelay, 'app-main.js')), /semantic imports/);
        const brokenMetadata = metadata265825Host.replace('e.action==="promptNewGroup"', 'e.action==="brokenNewGroup"');
        assert.throws(() => verifyMetadata265825(writeBundle(brokenMetadata, 'extension.js'), writeHeader(metadata265814Header)), /Metadata Host/);
        const watchdog = metadata265825Host.replace('timeoutMs:12e4})},12e4)', 'timeoutMs:3e4})},3e4)');
        assert.throws(() => verifyWatchdog265825(writeBundle(watchdog, 'extension.js')), /看门狗/);
        const rawReady = metadata265825Host.replace('e==="renderer_ready"&&this.dispose()', 'String(e).includes(`renderer_ready`)');
        assert.throws(() => verifyWatchdog265825(writeBundle(rawReady, 'extension.js')), /renderer_ready/);
        const unreachableStartup = metadata265825Host.replace(
          'return{startup:{reach:a=>o.handleStartupPhase(a)}}',
          'if(!1){let x={startup:{reach:a=>o.handleStartupPhase(a)}}}return{brokenStartup:{reach:a=>o.handleStartupPhase(a)}}',
        );
        assert.throws(() => verifyWatchdog265825(writeBundle(unreachableStartup, 'extension.js')), /看门狗/);
        const forcedSlider = power265825Bundle.replace('(t?[..._En,vEn]:_En)', '[..._En,vEn]');
        assert.throws(() => verifyPower265825(writeBundle(forcedSlider, 'power.js')), /Sol Max Ultra/);
        const staticMax = power265825Bundle + 'var decoy={id:`gpt-5.6-sol:max`,model:`gpt-5.6-sol`,reasoningEffort:`max`}';
        assert.throws(() => verifyPower265825(writeBundle(staticMax, 'power.js')), /Sol Max Ultra/);
        const weakMenu = power265825Bundle.replace('r.some(e=>e.reasoningEffort===`ultra`)||r.push', 'r.some(e=>e.reasoningEffort===`ultra`)||brokenPush');
        assert.throws(() => verifyPower265825(writeBundle(weakMenu, 'power.js')), /Sol Max Ultra/);
        const powerStart = power265825Bundle.indexOf('function hEn(e,t){');
        const powerEnd = power265825Bundle.indexOf('function uEn(', powerStart);
        const powerChunk = power265825Bundle.slice(powerStart, powerEnd);
        const nestedPower = power265825Bundle.slice(0, powerStart) + power265825Bundle.slice(powerEnd) + `function wrapper(){0;${powerChunk}}`;
        assert.throws(() => verifyPower265825(writeBundle(nestedPower, 'power.js')), /Sol Max Ultra/);
        const noStateDb = projectHistory265825Bundle.replace('sourceKinds:RO,useStateDbOnly:a', 'sourceKinds:RO,useStateDbOnly:!1');
        assert.throws(() => verifyProjectHistory265825(writeBundle(noStateDb, 'server.js')), /state DB/);
        const nativeHost = projectHistory265825Bundle.replace('useStateDbOnly:a=this.params.hostId!==WD', 'useStateDbOnly:a=this.params.hostId!==broken');
        assert.throws(() => verifyProjectHistory265825(writeBundle(nativeHost, 'server.js')), /state DB/);
        const wrongRequest = projectHistory265825Bundle.replace('return HCt(', 'return $Ct(') + 'function HCt(){return`decoy`}';
        assert.throws(() => verifyProjectHistory265825(writeBundle(wrongRequest, 'server.js')), /state DB/);
        const brokenMapper = projectHistory265825Bundle.replace('thread:a,hostId:s.hostId', 'thread:s,hostId:s.hostId');
        assert.throws(() => verifyProjectHistory265825(writeBundle(brokenMapper, 'server.js')), /mapper/);
        const brokenProducer = projectHistory265825Bundle.replace('workspaceBrowserRoot:c,projectlessOutputDirectory:l,hasUnreadTurn:u', 'workspaceBrowserRoot:c,hasUnreadTurn:u') + 'function nested(){return`function RCt({thread:e,hostId:t,conversationId:n,turns:r,threadTitle:i,resumeState:a,latestCollaborationMode:o,workspaceKind:s=\\`project\\`,workspaceBrowserRoot:c,projectlessOutputDirectory:l,hasUnreadTurn:u}){`}' + 'var fake=`let{createdAt:d,updatedAt:f,recencyAt:p}=zP(e);cwd:e.cwd`';
        assert.throws(() => verifyProjectHistory265825(writeBundle(brokenProducer, 'server.js')), /mapper/);
        const mapperStart = projectHistory265825Bundle.indexOf('function RCt(');
        const mapperEnd = projectHistory265825Bundle.indexOf('async function codexLocalGroupsLoadProjectConversations265825', mapperStart);
        const mapperChunk = projectHistory265825Bundle.slice(mapperStart, mapperEnd);
        const nestedMapper = projectHistory265825Bundle.slice(0, mapperStart) + projectHistory265825Bundle.slice(mapperEnd) + `function wrapper(){0;${mapperChunk}}`;
        assert.throws(() => verifyProjectHistory265825(writeBundle(nestedMapper, 'server.js')), /mapper/);
        const fakeStoreClass = projectHistory265825Bundle.replace('$Ct=class{', 'brokenStore=class{') + 'var fake=`$Ct=class{async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations265825(this,e)}}`';
        assert.throws(() => verifyProjectHistory265825(writeBundle(fakeStoreClass, 'server.js')), /state DB/);
        const fakeStore = projectHistory265825Bundle.replace(projectHistory265825StateDbMethod, projectHistory265825StateDbMethod.replace('useStateDbOnly:a', 'useStateDbOnly:!1')) + 'class FakePanel{' + projectHistory265825StateDbMethod + '}';
        assert.throws(() => verifyProjectHistory265825(writeBundle(fakeStore, 'server.js')), /state DB/);
        const base = subagentMemberships265825 + composerSubagentPanel265825;
        const validation = base.replace('r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)', 'r?.model===`broken`') + 'function nested(){function t4e(){return`gpt-5.6-sol`}}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(validation, 'app-main.js')), /Sol reasoning validation/);
        const producer = base.replace('e.type===`subAgentActivity`', 'e.type===`brokenActivity`') + 'function nested(){function Mbr(){return`subAgentActivity`}}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(producer, 'app-main.js')), /membership/);
        const selector = base.replace('p4=Ee(', 'p4=broken(') + 'function later(){let p4=Ee($,(e,{get:t})=>Abr({conversationTurns:t(store,e)}));return p4}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(selector, 'app-main.js')), /membership/);
        const panel = base.replace('jn=(mt.length>0||qt)&&!St&&!Dn&&!Dt&&!wt', 'jn=!1') + 'function FakePanel(){let jn=(mt.length>0||qt)&&!St&&!Dn&&!Dt&&!wt;return jn?(0,B3.jsx)(a8n,{rows:mt}):null}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(panel, 'app-main.js')), /子 agent membership 或面板/);
        const titleTemplate = openedTitle265825Header.replace('function Ln', 'function brokenLn') + 'var decoy="function Ln(e){let t=(0,Hn.c)(64),{desktopDeepLinkConversationId:a,title:o}=e;o=a==null?o:codexLocalGroupsLocalTitle({kind:`local`,conversation:{id:a}})??o;return(0,Z.jsx)(`div`,{children:o?o:null})}"';
        assert.throws(() => verifyOpenedConversationTitle265825(writeHeader(titleTemplate)), /已打开会话标题/);
        const onlyTemplateMbr = base.replace('function Mbr', 'function brokenMbr') + 'var decoy="function Mbr(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){if(e.type===`subAgentActivity`){let r=ba(e.agentThreadId),a=n?.get(r);i.set(r,{conversationId:r,parentConversationId:t});continue}if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){let e=ba(r),a=n?.get(e);i.has(e)||i.set(e,{conversationId:e,parentConversationId:t})}}return Array.from(i.values())}"';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(onlyTemplateMbr, 'app-main.js')), /membership/);
        const nestedMbr = base.replace('function Mbr', 'function brokenMbr') + 'function wrapper(){function Mbr(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){if(e.type===`subAgentActivity`){let r=ba(e.agentThreadId),a=n?.get(r);i.set(r,{conversationId:r,parentConversationId:t});continue}if(!(e.type!==`collabAgentToolCall`||e.tool!==`spawnAgent`))for(let r of e.receiverThreadIds){let e=ba(r),a=n?.get(e);i.has(e)||i.set(e,{conversationId:e,parentConversationId:t})}}return Array.from(i.values())}}';
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(nestedMbr, 'app-main.js')), /membership/);
        const membershipStart = base.indexOf('function Mbr(e,t,n,r){');
        const membershipEnd = base.indexOf('function Abr(', membershipStart);
        const membershipChunk = base.slice(membershipStart, membershipEnd);
        const nestedMemberships = base.slice(0, membershipStart) + base.slice(membershipEnd) + `function wrapper(){0;${membershipChunk}}`;
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(nestedMemberships, 'app-main.js')), /membership/);
        const passiveFilter = base.replace('function yMr(e){return e.canInteract&&e.displayName.trim().length>0}', 'function yMr(e){return!0}');
        assert.throws(() => verifyComposerSubagentPanel265825(writeBundle(passiveFilter, 'app-main.js')), /membership/);
        const onlyTemplatePower = power265825Bundle.replace('function hEn', 'function brokenHEn') + 'var decoy="function hEn(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}"';
        assert.throws(() => verifyPower265825(writeBundle(onlyTemplatePower, 'power.js')), /Sol Max Ultra/);
        const wrongModel = power265825Bundle.replace('return t===`gpt-5.6-sol`&&', 'return t===`gpt-5.6-terra`&&');
        assert.throws(() => verifyPower265825(writeBundle(wrongModel, 'power.js')), /Sol Max Ultra/);
        const onlyTemplateMapper = projectHistory265825Bundle.replace('function RCt', 'function brokenRCt') + 'var decoy="function RCt({thread:e,hostId:t,conversationId:n,turns:r,threadTitle:i,resumeState:a,latestCollaborationMode:o,workspaceKind:s=`project`,workspaceBrowserRoot:c,projectlessOutputDirectory:l,hasUnreadTurn:u}){let{createdAt:d,updatedAt:f,recencyAt:p}=zP(e);return{id:n,cwd:e.cwd}}var zCt="';
        assert.throws(() => verifyProjectHistory265825(writeBundle(onlyTemplateMapper, 'server.js')), /mapper/);
      },
    },
    {
      name: 'verifies the exact 26.5818.41705 scoped contracts',
      run() {
        assert.doesNotThrow(() => verifyOpenedConversationTitle265818(writeHeader(openedTitle26581841705Header), '41705'));
        assert.doesNotThrow(() => verifyHeaderTitleOverride265818(writeHeader(dropdownTitle26581841705Header), '41705'));
        assert.doesNotThrow(() => verifyExecutionTargetImport265818(writeHeader('import{Jlt as codexLocalGroupsMessengerImport,Z1 as codexUseExecutionTarget}from"./app-initial-main.js";'), writeBundle(semanticImports26581841705Main, 'app-main.js'), '41705'));
        assert.doesNotThrow(() => verifyProjectHistory265818(writeBundle(projectHistory26581841705Bundle, 'server.js'), '41705'));
        assert.doesNotThrow(() => verifyPower265818(writeBundle(power26581841705Bundle, 'power.js'), '41705'));
        assert.doesNotThrow(() => verifyComposerSubagentPanel265818(writeBundle(subagentMemberships26581841705 + composerSubagentPanel26581841705, 'app-main.js'), '41705'));
      },
    },
    {
      name: 'rejects 26.5818.41705 scoped decoys',
      run() {
        const title = dropdownTitle26581841705Header.replace('titleOverride:codexLocalGroupsLocalTitle(r)?(0,Z.jsx)(Z.Fragment,{children:r.conversation.title}):void 0', 'titleOverride:void 0') + 'function nested(){let n=(0,Z.jsx)(xe,{threadSummary:r.conversation,titleOverride:codexLocalGroupsLocalTitle(r)?(0,Z.jsx)(Z.Fragment,{children:r.conversation.title}):void 0});return n}';
        assert.throws(() => verifyHeaderTitleOverride265818(writeHeader(title), '41705'), /下拉会话标题/);
        const forcedSlider = power26581841705Bundle.replace('(t?[...SCn,CCn]:SCn)', '[...SCn,CCn]');
        assert.throws(() => verifyPower265818(writeBundle(forcedSlider, 'power.js'), '41705'), /Sol Max Ultra/);
        const forcedTail = power26581841705Bundle.replace('if(r.length>=3)return r;', 'r.push({reasoningEffort:`max`});if(r.length>=3)return r;');
        assert.throws(() => verifyPower265818(writeBundle(forcedTail, 'power.js'), '41705'), /Sol Max Ultra/);
        const sliderDecoy = forcedSlider + 'function nested(){' + power26581841705Bundle.slice(power26581841705Bundle.indexOf('function pCn'), power26581841705Bundle.indexOf('function y$')) + '}';
        assert.throws(() => verifyPower265818(writeBundle(sliderDecoy, 'power.js'), '41705'), /Sol Reasoning menu/);
        const forcedFilter = power26581841705Bundle.replace('return e.flatMap((e,n)=>t?.some(', 'return e.flatMap((e,n)=>e.model===`gpt-5.6-sol`&&(e.reasoningEffort===`max`||e.reasoningEffort===`ultra`)||t?.some(');
        assert.throws(() => verifyPower265818(writeBundle(forcedFilter, 'power.js'), '41705'), /Sol Max Ultra/);
        const staticMax = power26581841705Bundle + 'var decoy={id:`gpt-5.6-sol:max`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`max`}';
        assert.throws(() => verifyPower265818(writeBundle(staticMax, 'power.js'), '41705'), /Sol Max Ultra/);
        const slowHistory = projectHistory26581841705Bundle.replace('background:!0,useStateDbOnly:!0', 'background:!0');
        assert.throws(() => verifyProjectHistory265818(writeBundle(slowHistory, 'server.js'), '41705'), /state DB/);
        const nativeHistory = projectHistory26581841705Bundle.replace('useStateDbOnly:a}', 'useStateDbOnly:this.params.hostId!==PT}');
        assert.throws(() => verifyProjectHistory265818(writeBundle(nativeHistory, 'server.js'), '41705'), /state DB/);
        const methodDecoy = projectHistory26581841705Bundle.replace('sourceKinds:CE,useStateDbOnly:a}', 'sourceKinds:CE,useStateDbOnly:!1}') + '/*' + projectHistory26581841705StateDbMethod + '*/';
        assert.throws(() => verifyProjectHistory265818(writeBundle(methodDecoy, 'server.js'), '41705'), /state DB/);
        const callDecoy = projectHistory26581841705Bundle.replace(projectHistory26581841705StateDbCall, 'e.listRecentThreads({cursor:i,limit:100,background:!0}),fake=`' + projectHistory26581841705StateDbCall + '`');
        assert.throws(() => verifyProjectHistory265818(writeBundle(callDecoy, 'server.js'), '41705'), /state DB/);
        const classDecoy = projectHistory26581841705Bundle.replace(projectHistory26581841705StateDbMethod, projectHistory26581841705NativeMethod) + 'class FakeStateDbDecoy{' + projectHistory26581841705StateDbMethod + '}';
        assert.throws(() => verifyProjectHistory265818(writeBundle(classDecoy, 'server.js'), '41705'), /state DB/);
        const loadedMapper = projectHistory26581841705Bundle.replace('thread:a,hostId:s.hostId', 'thread:s,hostId:s.hostId');
        assert.throws(() => verifyProjectHistory265818(writeBundle(loadedMapper, 'server.js'), '41705'), /mapper/);
        const fallbackMapper = projectHistory26581841705Bundle.replace('thread:r,hostId:c', 'thread:broken,hostId:c');
        assert.throws(() => verifyProjectHistory265818(writeBundle(fallbackMapper, 'server.js'), '41705'), /mapper/);
        const producerMapper = projectHistory26581841705Bundle.replace('function bdt({thread:e,hostId:t', 'function bdt({summary:e,hostId:t');
        assert.throws(() => verifyProjectHistory265818(writeBundle(producerMapper, 'server.js'), '41705'), /mapper/);
        const fakeProducer = 'function fakeMapper(){function bdt({thread:e,hostId:t,conversationId:n,turns:r,threadTitle:i,resumeState:a,latestCollaborationMode:o,workspaceKind:s=`project`}){return e}}';
        assert.throws(() => verifyProjectHistory265818(writeBundle(producerMapper + fakeProducer, 'server.js'), '41705'), /mapper/);
        const base = subagentMemberships26581841705 + composerSubagentPanel26581841705;
        const validation = base.replace('r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)', 'r?.model===`broken`') + 'function nested(){function F7e({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort;return a}}';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(validation, 'app-main.js'), '41705'), /Sol reasoning validation/);
        const producer = base.replace('e.type===`subAgentActivity`', 'e.type===`brokenActivity`') + 'function nested(){function GWn(e,t,n,r){let i=new Map;for(let[a,o]of e.entries())for(let e of r?.(t,o,a)??o.items){if(e.type===`subAgentActivity`){let r=ks(e.agentThreadId);i.set(r,{conversationId:r,parentConversationId:t})}return Array.from(i.values())}}';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(producer, 'app-main.js'), '41705'), /membership/);
        const internalProducer = base.replace('}}return Array.from(i.values())}function WWn', '}}function fake(){return Array.from(i.values())}return []}function WWn');
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(internalProducer, 'app-main.js'), '41705'), /membership/);
        const selector = base.replace('zX=ti($,(e,{get:t})=>{', 'zX=broken($,(e,{get:t})=>{') + 'function nestedSelector(){let zX=ti($,(e,{get:t})=>{let n=typeof e==`string`?e:e.conversationId,l=t(store,n),m=[],v=WWn({cachedConversations:m,conversationTurns:l,parentConversationId:n});return v})}';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(selector, 'app-main.js'), '41705'), /membership/);
        const aggregator = base.replace('GWn(t,a,c,n)', 'broken(t,a,c,n)') + 'function nestedAggregator(){return GWn(t,a,c,n)}';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(aggregator, 'app-main.js'), '41705'), /membership/);
        const panel = base.replace('Cn=(st.length>0||Vt)&&!ht&&!bn&&!yt&&!_t', 'Cn=!1') + 'function nested(){function SZr(){let Cn=(st.length>0||Vt)&&!ht&&!bn&&!yt&&!_t;return Cn?(0,A6.jsx)(yer,{rows:st}):null}}';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(panel, 'app-main.js'), '41705'), /子 agent 面板/);
        const internalPanel = base.replace('Cn=(st.length>0||Vt)&&!ht&&!bn&&!yt&&!_t', 'Cn=!1').replace('function SZr(){', 'function SZr(){function fake(){let Cn=(st.length>0||Vt)&&!ht&&!bn&&!yt&&!_t;Uqr({activeConversationId:oe,enabled:rt,includeMentionItems:at.ui?.active===!0});Iqn({subagentsPanel:Cn});if(a){if(b){if(c){return Cn?(0,A6.jsx)(yer,{agentCount:Math.max(st.length,Bt),rows:st}):null}}}}');
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(internalPanel, 'app-main.js'), '41705'), /子 agent 面板/);
        const summary = base.replace('id:`composer.backgroundSubagents.summary`', 'id:`broken.summary`') + 'function nestedSummary(){return`m=l.formatMessage({id:\\`composer.backgroundSubagents.summary\\``}';
        assert.throws(() => verifyComposerSubagentPanel265818(writeBundle(summary, 'app-main.js'), '41705'), /子 agent 面板/);
      },
    },
    {
      name: 'rejects 26.5818.41705 Header imports when Main semantic exports drift',
      run() {
        const header = writeHeader('import{Jlt as codexLocalGroupsMessengerImport,Z1 as codexUseExecutionTarget}from"./app-initial-main.js";');
        const main = writeBundle(semanticImports26581841705Main, 'app-main.js');
        assert.doesNotThrow(() => verifyExecutionTargetImport265818(header, main, '41705'));
        const wrongHeader = writeHeader('import{Jlt as codexLocalGroupsMessengerImport,AZ1 as codexUseExecutionTarget}from"./app-initial-main.js";');
        assert.throws(() => verifyExecutionTargetImport265818(wrongHeader, main, '41705'), /semantic imports/);
        const drifted = semanticImports26581841705Main.replace('Au as Jlt', 'Au as broken') + 'function nested(){return`Au as Jlt`}';
        assert.throws(() => verifyExecutionTargetImport265818(header, writeBundle(drifted, 'app-main.js'), '41705'), /semantic imports/);
        const messenger = semanticImports26581841705Main.replace('Au=ku.getInstance()', 'Au=null') + 'function nested(){let Au=ku.getInstance();Au.dispatchMessage(`native`,{});Au.dispatchHostMessage({type:`native`});return`Au=ku.getInstance(),V_e((e,t)=>{Au.dispatchMessage(e,t)})`}';
        assert.throws(() => verifyExecutionTargetImport265818(header, writeBundle(messenger, 'app-main.js'), '41705'), /semantic imports/);
        const message = semanticImports26581841705Main.replace('Tu.postMessage({...t,type:e})', 'let decoy=`Tu.postMessage({...t,type:e})`');
        assert.throws(() => verifyExecutionTargetImport265818(header, writeBundle(message, 'app-main.js'), '41705'), /semantic imports/);
        const target = semanticImports26581841705Main.replace('isActiveWorkspaceRootLoading:g', 'isBroken:g') + 'function nested(){function Bw(e){return{activeWorkspaceRoot:f,isActiveWorkspaceRootLoading:g,hostConfig:h,...p}}}';
        assert.throws(() => verifyExecutionTargetImport265818(header, writeBundle(target, 'app-main.js'), '41705'), /semantic imports/);
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
  const dir = registerTemporaryPath(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-groups-verify-')));
  const bundlePath = path.join(dir, filename);
  fs.writeFileSync(bundlePath, text);
  return bundlePath;
}
