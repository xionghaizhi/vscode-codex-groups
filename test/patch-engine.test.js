const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./test-utils');
const { CodexPatchEngine } = require('../src/patchEngine');
const { resolveNodePath } = require('../scripts/node-path');

const extensionText = [
  'var Il={workspace:{workspaceFolders:[]},EventEmitter:function(){}};',
  'var HS=1,Yf=[],_le=`provider`,I$=`Untitled`;class X{onDidChangeChatSessionItemsEmitter=new Il.EventEmitter;}',
  'async provideChatSessionItems(e){let r=this.modelProxyManager.isUserUsingCopilotInference();function n(c){return r?c===HS:c!==HS}let o=await this.conversationLoader.provideChatSessionItems(r,e),i=[];for(let{item:c,summary:l}of o)this.pendingConversations.delete(c.id),this.modelProviderByConversationId.set(c.id,l.modelProvider),n(l.modelProvider)&&i.push(c);let s=i.map(c=>this.applyLifecycleToChatSessionItem(c));return Array.from(this.pendingConversations.values()).filter(c=>n(c.modelProvider)).map(c=>this.applyLifecycleToChatSessionItem(c.item)).concat(s)}',
  'async provideChatSessionItems(e,r){return(await this.requestThreadList(e)).data.map(o=>{let i=this.toThreadListSummary(o);return{summary:i,item:this.toChatSessionItem(i)}})}',
  'toChatSessionItem(e){let{conversationId:r,preview:n,createdAtMs:o}=e,i=xle(r),s=Cle(n),a=o!=null?{startTime:o}:void 0;return{id:String(r),resource:i,label:s,timing:a}}',
  'toThreadListSummary(e){let r=Number(e.createdAt)*1e3,n=Number.isFinite(r)?r:null;return{conversationId:e.id,preview:e.name?.trim()||e.preview,createdAtMs:n,modelProvider:e.modelProvider}}',
  'requestThreadList(e){let r=String(this.nextRequestId++),n=new Promise((o,i)=>{this.requestToCallback.set(r,s=>{if(s.error){i(new Error(s.error.message));return}if(s.result==null){i(new Error("No result in response"));return}o(s.result)})});return this.codexAppServer.sendRequest(_le,r,"thread/list",{limit:50,cursor:null,sortKey:"created_at",modelProviders:e?[HS]:null,archived:!1,sourceKinds:Yf}),n}',
  's=Cle(codexTitleAliasFor(r)??n) c=codexTitleAliasFor(n.conversationId)??s??I$ r.title=npe(codexTitleAliasFor(i)??s) label:codexTitleAliasFor(i)??s??void 0 r.title=npe(codexTitleAliasFor(i)??l) r.set(String(n.id),(codexTitleAliasFor(n.id)??n.name?.trim())||n.preview)',
  'var Dle=require("path");W();$t();var $g=1;',
  'var nC=class{constructor(e,r){this.#r=e,this.#e=[e.onDidReceiveMessage(n=>{let o=a2(n);o!=null&&this.#a(o.message)}),r(()=>{this.dispose()})]}};',
  'var Ll=class{async initializeWebview(e,r,n,o){let s=e.onDidReceiveMessage(a=>{if(a.type==="ready"){o?.()}this.handleMessage(e,a)});this.subscriptions.push(s)}};',
  'class CodexProcess{startCodexProcess(){let e=kle(this.extensionUri,"app-server",["--analytics-default-enabled"]);return e}}',
].join('');
const headerText = 'codexRecentTaskCurrentRoot import{f as b}from"./vscode-api-a.js";function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows(e,t,n){let r=[],i=new Map;for(let a of e){let o=codexRecentTaskProjectLabel(a),s=i.get(o);s||(s={label:o,items:[]},i.set(o,s),r.push(s)),s.items.push(a)}return r.flatMap((e,r)=>[(0,Q.jsx)(`div`,{className:`px-[var(--padding-row-x)] pt-2 pb-1 text-xs font-medium text-token-input-placeholder-foreground`,children:e.label},`project-${r}-${e.label}`),...e.items.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&t===e.conversation.id,onClose:n},e.key))])}function codexRecentTaskProjectLabel(e){return `No project`}function codexRecentTaskFilter(e,t){return e}function codexRecentConversationFilter(e,t){return e}function codexRecentTaskNormalizePath(e){return e}function codexRecentTaskBasename(e){return e}function codexRecentTaskDateLabel(e){return ``}var qe=Je=(0,$.memo)(function(e){let t=(0,Z.c)(20),{item:n,isActive:r,onClose:i}=e;switch(n.kind){case`local`:{let e;t[3]===n.conversation.updatedAt?e=t[4]:(e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt)),t[3]=n.conversation.updatedAt,t[4]=e);let a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[9]=a):a=t[9],a}}});';
const appMainText = 'P=codexTitleAliasFor(n)?? codexTitleAliasFor(t.conversation.id)?? import{f as gi}from"./vscode-api-a.js";var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}function aE(e){let tt=()=>[{id:`rename-thread`,message:i_.renameThread,onSelect:Ye},...O==null||O===`local`?[]:[{id:`change-connection-color`}]];return tt}var YM=`https://ab.chatgpt.com/v1`,XM=`https://ab.chatgpt.com/v1/sdk_exception`,tN={networkConfig:{api:YM,logEventUrl:cM,sdkExceptionUrl:XM,networkOverrideFunc:KM}};';
const localTitleText = 'var codexTitleAliasMap={};function codexTitleAliasFor(e){let t=codexTitleAliasMap[String(e)];return typeof t==`string`&&t.trim().length>0?t.trim():null}var s=1;';
const appServerManagerSignalsText = 'async function ug(e,{modelProviders:t,archived:n=!1,sourceKinds:r=D,useStateDbOnly:i=!1}){let a=[],o=async s=>{let c=await e.sendRequest(`thread/list`,{limit:200,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i});a.push(...c.data),c.nextCursor&&await o(c.nextCursor)};return await o(null),a}async function fg(e,t,n){e.removeConversationFromCache(t),e.dispatchMessageFromView(`thread-archived`,{hostId:e.hostId,conversationId:t,cwd:n})}class Eg{listRecentThreads({cursor:e,limit:t,useStateDbOnly:n=!1}){return this.params.requestClient.sendRequest(`thread/list`,{limit:t,cursor:e,sortKey:this.recentConversationSortKey,modelProviders:null,archived:!1,sourceKinds:D,useStateDbOnly:n})}}';
const sidebarProjectGroupSignalsText = 'function ze({hasInProgressSideChat:a,isResponseInProgress:b,latestTurnHasSystemError:c,resumeState:d,threadRuntimeStatus:f}){return a?`loading`:f?.type===`systemError`?`error`:f?.type===`active`?`loading`:d===`needs_resume`?`idle`:c?`error`:b===!0?`loading`:`idle`}';
const requestText = 'var p=class{async makeRequest(o,s,c){let{headers:l,url:u}=this.getRequestTarget(s,c);try{switch(o){case`get`:return(await i.getInstance().get(u,l)).body;case`post`:return(await i.getInstance().post(u,this.getRequestBody(c),l)).body}}catch(i){throw a.warning(`sa_server_request_failed`,{safe:{method:o},sensitive:{error:i,routePattern:s,url:u}}),i}}async safeGet(e,...t){return this.makeRequest(`get`,e,t[0])}async safePost(e,...t){return this.makeRequest(`post`,e,t[0])}};';
const accountInfoText = '"account-info":async()=>{let e=await this.authProvider.getToken({refreshToken:!1});if(!e)return{accountId:null,userId:null,plan:null,email:null,computeResidency:null};try{let r=JSON.parse(Buffer.from(e.split(".")[1],"base64url").toString("utf8")),n=r["https://api.openai.com/auth"]??{},o=r["https://api.openai.com/profile"]??{},i=n?.chatgpt_account_id??null,s=n?.chatgpt_user_id??null,a=n?.chatgpt_plan_type??null,c=n?.chatgpt_compute_residency??null,l=o.email??null;if(i&&s&&a)return{accountId:i,userId:s,plan:a,email:l,computeResidency:c}}catch{X().error("Unable to extract account id and plan from auth token.")}return{accountId:null,userId:null,plan:null,email:null,computeResidency:null}}';
const headerNeedsBasePatchText = 'import{i as useEnv}from"./use-environment-a.js";import{f as customMessenger}from"./vscode-api-a.js";h=ge(),g;let b=i.filter(y),C=Ve(r.data,i,_),A=[];A.map(e=>(0,Q.jsx)(me,{task:e.task,onClose:a},e.key));F.map(e=>(0,Q.jsx)(Je,{item:e,isActive:e.kind===`local`&&p===e.conversation.id,onClose:a},e.key));o=r==null?void 0:(0,Q.jsx)(de,{dateString:new Date(r).toISOString()});case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(me,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e};e=n.conversation.updatedAt==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.updatedAt).toISOString()});o=(0,Q.jsx)(fe,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r});function Ke(e){return e.kind===`remote`}var qe=Je=(0,$.memo)(function(e){let t=(0,Z.c)(20),{item:n,isActive:r,onClose:i}=e;switch(n.kind){case`local`:{let e;t[3]===n.conversation.updatedAt?e=t[4]:(e=n.conversation.updatedAt==null?void 0:codexRecentTaskDateLabel(new Date(n.conversation.updatedAt)),t[3]=n.conversation.updatedAt,t[4]=e);let a;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==i||t[8]!==e?(a=(0,Q.jsx)(pe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i}),t[5]=r,t[6]=n.conversation.id,t[7]=i,t[8]=e,t[9]=a):a=t[9],a}}});';
const header26715Text = [
  'import{i as ee}from"./use-environment-current.js";import{c as i,ga as a}from"./vscode-api-current.js";',
  'function it(e){let t=(0,Z.c)(34),{cloudtasksQuery:n,localConversations:r,onClose:i,autoFocusSearch:a,showFilters:o}=e,s=a===void 0?!1:a,c=o===void 0?!0:o,l=x(),u=he(),{authMethod:f}=L(),[p,m]=v(rt),[h]=v(He),g=c?p:`recent`,_=E(`/local/:conversationId`)?.params?.conversationId??null,{data:y}=te(),S=me(),C;t[0]!==h||t[1]!==c||t[2]!==y?(C=null,t[0]=h,t[1]=c,t[2]=y,t[3]=C):C=t[3];let w=C,T=e=>e;let D=r.filter(T),O=et(n.data,r,w),[k,M]=(0,$.useState)(``),N=(0,$.useDeferredValue)(k).trim().toLowerCase(),P=N.length>0,F=O.filter(at),I=P?F:F,R=P?D:D,ee=P?O:O,U;t[15]!==_||t[16]!==n||t[17]!==ee||t[18]!==P||t[19]!==O.length||t[20]!==i||t[21]!==g||t[22]!==u?(U=g===`recent`&&ee.map(e=>(0,Q.jsx)(st,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&_===e.conversation.id,onClose:i,onActiveArchiveStart:u},e.key)),t[15]=_,t[16]=n,t[17]=ee,t[18]=P,t[19]=O.length,t[20]=i,t[21]=g,t[22]=u,t[23]=U):U=t[23];return U}',
  'const recentMenuHeight={className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`};',
  'var messages={search:{id:`codex.recentTasksMenu.search`,defaultMessage:`Search recent chats`}};',
  'function at(e){return e.kind===`remote`}var ot=(0,$.memo)(function(){});',
].join('');
const header26721Text = [
  'import{A as Q}from"./app-initial-C7Xd-izh.js";import{x as y}from"./app-initial-DZH_C2c-.js";',
  'function Xn(){let o=_e(),{authMethod:s}=m(),c=fe(),l=ye(tr),{data:d}=ee(),f=Me();return d}',
  'function zn(e){let t=(0,Wn.c)(34),d=_e(),p=At(),r=e.localConversations,n=e.cloudtasksQuery,w=null,b=null,i=null,y=null;let E=r.filter(T),D=Nn(n.data,r,w),[O,k]=(0,Gn.useState)(``),A=(0,Gn.useDeferredValue)(O).trim().toLowerCase(),F=D,j=null,B;t[15]!==b||t[16]!==n||t[17]!==F||t[18]!==j||t[19]!==D.length||t[20]!==i||t[21]!==y||t[22]!==p?(B=F.map(e=>(0,Z.jsx)(Jn,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&b===e.conversation.id,onClose:i,onActiveArchiveStart:p},e.key)),t[20]=i,t[21]=y,t[22]=p,t[23]=B):B=t[23];return B}',
  'const recentMenuHeight={className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`};',
  'var messages={search:{defaultMessage:`Search recent chats`}};function Bn(e){return e.kind===`remote`}function Vn(){}',
  'var date=s=r==null?void 0:(0,Z.jsx)(c,{dateString:new Date(r).toISOString()});',
  'var Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(23),{item:n,isActive:r,onClose:i,onActiveArchiveStart:a}=e;switch(n.kind){case`local`:{let e=null,l;return t[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e?(l=(0,Z.jsx)(Fe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.id,t[19]=a,t[20]=i,t[21]=e,t[22]=l):l=t[22],l}}});',
  'const nativeScrollHeight={className:`vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1`},unrelatedHeight={className:`max-h-[300px]`};',
  'const nativeMenu=(0,Z.jsx)(N,{contentClassName:`!pb-0 mt-[9px]`,triggerButton:ie,open:p,onOpenChange:h,children:G});',
].join('');
const split26721AppMainText = 'import{f as gi}from"./vscode-api-a.js";function U9({get:e,threadKeys:t,groups:n,projectlessThreadIds:r,projectlessLabel:i,untitledThreadLabel:a}){for(let n of t){let t=e(qC,n);if(t==null||t.kind===`local`&&t.conversation==null)continue;s.push({title:(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a,path:dC(n),projectLabel:i})}return s}HS=Ko(Q,(e,{get:t})=>e==null?null:ETe({id:e,title:t(Bi,e),turns:t(Ote,e)??t(Qoe,e)}));var XCe,pm,mm,hm=e((()=>{XCe=`X-OpenAI-Codex-Client-Version`,pm=class{defaults;constructor(e={}){this.defaults=e}getRequestTarget(e,t){return{headers:{},url:e}}getRequestBody(e){return e&&`requestBody`in e?JSON.stringify(e.requestBody):void 0}async makeRequest(e,t,n){let{headers:r,url:i}=this.getRequestTarget(t,n);return null}async safeGet(e){return this.makeRequest(`get`,e)}}}))';
const split26721AppServerText = 'var n7={networkConfig:{api:jkn,logEventUrl:K5,sdkExceptionUrl:Mkn,networkOverrideFunc:Zye}};async function fFe(e,{modelProviders:t,archived:n=!1,sourceKinds:r=te}){let i=[],a=async o=>{let s={limit:100,cursor:o,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:!0},c=await e.sendRequest(`thread/list`,s,{priority:`background`,source:`thread_list`});i.push(...c.data),c.nextCursor&&await a(c.nextCursor)};return await a(null),i}class Store{fetchedRecentConversations=!1;recentConversationSortKey=`recency_at`;async runRecentConversationRefresh(e,t){let n=e!==this.recentConversationSortKey;this.recentConversationSortKey=e;let r=this.params.getHistoryLimit?.()??50;if(r===0)return;let i=(t===`expanded`||n)&&r>50,a=i?r:50,o=performance.now(),s=await this.listRecentThreads({limit:i?Math.min(a,100):a,cursor:null,background:i});if(s.data.length<a&&s.nextCursor!=null){let e=[...s.data],t=new Set,n=s.nextCursor;for(;e.length<a&&n!=null&&!t.has(n);){t.add(n);let r=await this.listRecentThreads({limit:Math.min(a-e.length,100),cursor:n,background:i});e.push(...r.data.slice(0,a-e.length)),n=r.nextCursor}s={...s,data:e,nextCursor:n}}this.fetchedRecentConversations=!0;let c=s.data;if(i){let e=c;c=e.slice(0,50)}return c}async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return fFe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads(){return this.listAllThreads({modelProviders:null,archived:!0})}getThreadSummaryFromThread(e){return{conversationId:e.id,hostId:`local`,createdAt:e.createdAt,updatedAt:e.updatedAt,recencyAt:e.recencyAt,title:e.title,cwd:e.cwd}}async listRecentThreads({cursor:e,limit:t,background:n=!1}){let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:te,useStateDbOnly:!0},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});return i}}class Manager{getHostId(){return`local`}async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads(){return this.threadStore.listArchivedThreads()}addAnyConversationMetaCallback(){return()=>{}}}function e6e(){return t6e(`recent-conversations`)}function zGe(e,t){return e&&t?0:e?500:50}async function fg(e,t,n){e.removeConversationFromCache(t),e.broadcastThreadArchived({hostId:e.hostId,conversationId:t,cwd:n}).catch(()=>{})}';
const split26721FeatureGateText = 'function nT(e,t){return e?.find(e=>e.model===t)}function EHe({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=e?nT(n?.models,e):n?.defaultModel??nT(n?.models,`gpt-5.5`),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort;return{model:r?r.model:e??`gpt-5.5`,reasoningEffort:a??t??n?.defaultModel?.defaultReasoningEffort??`medium`,profile:null,isLoading:!1}}function normalizeReasoningConfig(m){let C=m?.model??null,w=m?.model_reasoning_effort===`ultra`?null:m?.model_reasoning_effort??null,T;return{model:C,reasoningEffort:w}}function persistReasoningEffort(t,i,a,r,lT,o,p,Vne,n,N){let s=i;if(a[0]==="default"&&i===`ultra`){let e=r.getQueryData(lT(o,p))?.model_reasoning_effort??null;s=e===`ultra`?null:e}return Vne(n,a,{model:t,reasoningEffort:s},()=>N(t,s))}function bR(){return Bm(`1221508807`)}function featureWatch(t,m,n){let h=t(mp,`1221508807`),g=m.getHostId();let r=t(mp,`1221508807`);r&&t(Dkt,n.getHostId());return h||g||r}';
const split26721PowerText = 'var K6e=[`minimal`,`low`,`medium`,`high`,`xhigh`,`max`];function vA(e){return e===`low`||e===`medium`||e===`high`||e===`xhigh`||e===`max`||e===`ultra`}function XZ(e,t){let n=e?.find(e=>e.model===t);return n==null?K6e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>vA(e.reasoningEffort))}function KNt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){let r=XNt((t?[...XW,QNt]:XW).filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);if(r.length>=3)return r;let i=XNt($Nt.filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);return i.length>=3?i:[]}function XNt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}var XW=[{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],QNt={id:`gpt-5.6-sol:ultra`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`ultra`},$Nt=[{id:`gpt-5.6-terra:low`,model:`gpt-5.6-terra`,modelLabel:`5.6 Terra`,reasoningEffort:`low`},{id:`gpt-5.6-terra:medium`,model:`gpt-5.6-terra`,modelLabel:`5.6 Terra`,reasoningEffort:`medium`},{id:`gpt-5.6-terra:high`,model:`gpt-5.6-terra`,modelLabel:`5.6 Terra`,reasoningEffort:`high`}];class FeatureStore{done(e){return this.scope!=null&&Wc(this.scope,`1221508807`)&&rke(this.a,this.b).has(e)}activity(e){this.scope!=null&&Wc(this.scope,`1221508807`)&&ike(e)&&this.subagentTopology.discover(e)}}var $Ze=new Set,eQe=H($,(e,{get:t})=>{if(!t(zc,`1221508807`))return $Ze;t(gKe);let n=t(jS,e);return n==null?$Ze:rke(t(zS,e),n.getCachedConversations())});function sRt(e,t){return QLt(e,{isBackgroundSubagentsEnabled:Wc(e,`1221508807`),sourceConversationId:t})}function subagentPanel(){let u=rs(zc,`1221508807`),d;return u}';
const header26727Text = [
  'import{A as Q}from"./app-initial-server26727.js";import{x as y}from"./app-initial-main26727.js";',
  'function Yn(){let s=be(),{authMethod:c}=re(),u=fe(),d=oe(er),{data:f}=v(),p=wt(),x=null;return f}',
  'function Rn(e){let d=be(),f=gt(),{authMethod:p}=re(),r=e.localConversations,n=e.cloudtasksQuery,S=null,v=null,i=null;let T=r.filter(w),E=Mn(n.data,r,S),te=E;return te.map(e=>(0,Z.jsx)(qn,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&v===e.conversation.id,onClose:i,onActiveArchiveStart:f},e.key))}',
  'const recentMenuHeight={className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`};',
  'var messages={recentTasksMenu:1,search:{defaultMessage:`Search recent chats`}};function zn(e){return e.kind===`remote`}function Bn(){}',
  'var qn=(0,Wn.memo)(function(e){let t=(0,Un.c)(23),{item:n,isActive:r,onClose:i,onActiveArchiveStart:a}=e;switch(n.kind){case`local`:{let e=null,l;return t[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e?(l=(0,Z.jsx)(nt,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.id,t[19]=a,t[20]=i,t[21]=e,t[22]=l):l=t[22],l}}});',
  'const nativeScrollHeight={className:`vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1`};',
  'const nativeMenu=(0,Z.jsx)(N,{contentClassName:`!pb-0 mt-[9px]`,triggerButton:W,open:p,onOpenChange:h,children:G});',
].join('');
const split26727AppMainText = 'function KB(e){return{activeWorkspaceRoot:`/project`,isActiveWorkspaceRootLoading:!1}}class VsCodeMessenger{static getInstance(){return new VsCodeMessenger}dispatchMessage(){}dispatchHostMessage(){}}var N0=VsCodeMessenger.getInstance(),qQ={phase:`inactive`};function useMessenger(){N0.dispatchMessage(`native`,{}),N0.dispatchHostMessage({type:`native`})}function BVe({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort;return{model:r?.model,reasoningEffort:a}}function nativeState(m,t){let{isBackgroundSubagentsEnabled:o=!0}={},w=m?.model_reasoning_effort??null,n={model_reasoning_effort:t};return{isBackgroundSubagentsEnabled:o,type:`subagent-activity`,w,n}}var app=`untitledThreadLabel conversation.title safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e)`;export{KB as KB,N0 as N0,qQ as qQ};';
const split26727AppServerText = 'var stats=`networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m,networkOverrideFunc:n}`;class Store{async loadThreadHydrationState(){}async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return OBe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads(){return[]}async listRecentThreads(){return{data:[],nextCursor:null}}}class Manager{async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads(){return this.threadStore.listArchivedThreads()}}function Xtt(){return Ztt(`recent-conversations`)}function MQ(e,t){let n=e?.find(e=>e.model===t);return n==null?Qnt.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>Uk(e.reasoningEffort))}function FUt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){let r=zUt((t?[...yG,VUt]:yG).filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);return r}function zUt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}var yG=[{id:`gpt-5.6-terra:low`,model:`gpt-5.6-terra`,modelLabel:`5.6 Terra`,reasoningEffort:`low`},{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],VUt={id:`gpt-5.6-sol:ultra`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`ultra`};var subagents={isBackgroundSubagentsEnabled:!0,subagentsPanel:!0};var recentConversationsSortKey=1,threadList=`thread/list`;export{Store as Store};';
const header265730Text = [
  'import{SD as p}from"./app-initial-server265730.js";import{N$ as m,wB as x}from"./app-initial-main265730.js";',
  'function Mn(e){let o=ie(),{authMethod:s}=b(),c=se(),l=le(Ln),u=le(Rn),{data:d}=p(),f=Be(),h=null;return d}',
  'function xn(e){let t=(0,En.c)(34),r=e.cloudtasksQuery,i=e.localConversations,a=e.onClose,d=ie(),f=Re(),{authMethod:p}=b(),C=null,w=e=>!0,v=null;let T=i.filter(w),E=hn(r.data,i,C),P=E,z=P.map(e=>(0,Z.jsx)(An,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&v===e.conversation.id,onClose:a,onActiveArchiveStart:f},e.key));let B=(0,Z.jsx)(s.Section,{className:`vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1`,children:z});return(0,Z.jsx)(`div`,{className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`,children:B})}',
  'var messages={recentTasksMenu:1,search:{defaultMessage:`Search recent chats`}};function Sn(e){return e.kind===`remote`}function Cn(){}',
  'var An=(0,Dn.memo)(function(e){let t=(0,En.c)(23),{item:n,isActive:r,onClose:i,onActiveArchiveStart:a}=e;switch(n.kind){case`local`:{let e=null,c;return t[17]!==r||t[18]!==n.conversation.id||t[19]!==a||t[20]!==i||t[21]!==e?(c=(0,Z.jsx)(Oe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.id,t[19]=a,t[20]=i,t[21]=e,t[22]=c):c=t[22],c}}});',
  'const nativeMenu=(0,Q.jsx)(m,{contentClassName:`!pb-0 mt-[9px]`,triggerButton:K,open:h,onOpenChange:g,children:q});',
].join('');
const split265730AppMainText = 'class Messenger{static getInstance(){return new Messenger}dispatchMessage(){}dispatchHostMessage(){}}var pu=Messenger.getInstance();function useMessenger(){pu.dispatchMessage(`native`,{}),pu.dispatchHostMessage({type:`native`})}function XS(e){return{activeWorkspaceRoot:`/project`,isActiveWorkspaceRootLoading:!1}}function IRe({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort;return{model:r?.model,reasoningEffort:a}}function nativeState(m,t){let{isBackgroundSubagentsEnabled:o=!0}={},w=m?.model_reasoning_effort??null,n={model_reasoning_effort:t};return{isBackgroundSubagentsEnabled:o,type:`subagent-activity`,w,n}}var app=`conversation.title supportedReasoningEfforts defaultReasoningEffort safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e)`;export{pu as N$,XS as wB};';
const split265730AppServerText = 'var stats=`networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m,networkOverrideFunc:n}`;class Store{async loadThreadHydrationState(){}async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return vIe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads(){return[]}async listRecentThreads(){return{data:[],nextCursor:null}}}class Manager{async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads(){return this.threadStore.listArchivedThreads()}}function FJe(){return IJe(`recent-conversations`)}function cQ(e,t){let n=e?.find(e=>e.model===t);return n==null?pYe.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>JD(e.reasoningEffort))}function mOt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){let r=vOt((t?[...Dq,bOt]:Dq).filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);return r}function vOt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}var Dq=[{id:`gpt-5.6-terra:low`,model:`gpt-5.6-terra`,modelLabel:`5.6 Terra`,reasoningEffort:`low`},{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],bOt={id:`gpt-5.6-sol:ultra`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`ultra`};var subagents={isBackgroundSubagentsEnabled:!0,subagentsPanel:!0};var recentConversationsSortKey=1,threadList=`thread/list`;export{Store as Store};';
const webviewTimeout265730Text = 'var JP=class{constructor(e){this.onTimeout=e}timeout;disposed=!1;start(){this.disposed||this.timeout!=null||(this.timeout=setTimeout(()=>{this.timeout=void 0,this.onTimeout()},3e4))}dispose(){this.disposed=!0,this.timeout!=null&&(clearTimeout(this.timeout),this.timeout=void 0)}};';
const header265803Text = [
  'import{$D as r}from"./app-initial-server265803.js";import{$1 as m,LV as x}from"./app-initial-main265803.js";',
  'function Mn(e){let l=ie(),{authMethod:u}=te(),d=B(),f=se(Ln),p=se(Rn),{data:m}=r(),h=Ve(),g=null;return m}',
  'function xn(e){let t=(0,En.c)(34),r=e.cloudtasksQuery,i=e.localConversations,a=e.onClose,s=e.showFilters,l=s===void 0||s,u=ie(),d=Se(),{authMethod:f}=te(),S=e=>!0,_=null,x=null;let C=i.filter(S),T=hn(r.data,i,x),N=T,B=N.map(e=>(0,Z.jsx)(An,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&_===e.conversation.id,onClose:a,onActiveArchiveStart:d},e.key)),V=(0,Z.jsxs)(I.Section,{className:`vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1`,children:[B]});return(0,Z.jsxs)(`div`,{className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`,children:[V]})}',
  'var messages={recentTasksMenu:1,search:{defaultMessage:`Search recent chats`}};function Sn(e){return e.kind===`remote`}function Cn(){}',
  'var An=(0,Dn.memo)(function(e){let t=(0,En.c)(24),{item:n,isActive:r,onClose:i,onActiveArchiveStart:a}=e;switch(n.kind){case`local`:{let e=null,c;return t[17]!==r||t[18]!==n.conversation.hostId||t[19]!==n.conversation.id||t[20]!==a||t[21]!==i||t[22]!==e?(c=(0,Z.jsx)(Be,{conversationId:n.conversation.id,hostId:n.conversation.hostId,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a}),t[17]=r,t[18]=n.conversation.hostId,t[19]=n.conversation.id,t[20]=a,t[21]=i,t[22]=e,t[23]=c):c=t[23],c}}});',
  'const nativeMenu=(0,Q.jsx)(m,{contentClassName:`!pb-0 mt-[9px]`,triggerButton:J,open:g,onOpenChange:_,children:ce});',
].join('');
const split265803AppMainText = 'class Messenger{static getInstance(){return new Messenger}dispatchMessage(){}dispatchHostMessage(){}}var pu=Messenger.getInstance();function useMessenger(){pu.dispatchMessage(`native`,{}),pu.dispatchHostMessage({type:`native`})}function cC(e){return{activeWorkspaceRoot:`/project`,isActiveWorkspaceRootLoading:!1}}function tBe({userSavedModelString:e,userSavedReasoningEffort:t,listModelsData:n}){let r=n?.models?.find(n=>n.model===e),i=r?.supportedReasoningEfforts?.map(e=>e.reasoningEffort),a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort;return{model:r?.model,reasoningEffort:a}}function nativeState(m,t){let{isBackgroundSubagentsEnabled:o=!0}={},w=m?.model_reasoning_effort??null,n={model_reasoning_effort:t};return{isBackgroundSubagentsEnabled:o,type:`subagent-activity`,w,n}}var app=`conversation.title supportedReasoningEfforts defaultReasoningEffort safeGet makeRequest OAI-Language title:t(Bi,e) turns:t(Ote,e)`;export{pu as $1,cC as LV};';
const split265803AppServerText = 'var stats=`networkConfig:{api:j,logEventUrl:k,sdkExceptionUrl:m,networkOverrideFunc:n}`;function Ob(e){return{createdAt:e.createdAt??0,updatedAt:e.updatedAt??0,recencyAt:e.recencyAt??null}}function Mh(e){return{id:e.conversationId??e.id,cwd:e.cwd}}function Ib(){return!0}function $Ie(e){return e.name??null}function Fb(e){return e}function vr(e){return e}class Store{async loadThreadHydrationState(){}async listAllThreads({modelProviders:e,archived:t=!1,sourceKinds:n}){return GIe({sendRequest:this.params.requestClient.sendRequest.bind(this.params.requestClient),recentConversationsSortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey)},{modelProviders:e,archived:t,sourceKinds:n})}async listArchivedThreads(){return[]}async listRecentThreads(){return{data:[],nextCursor:null}}}class Manager{async listAllThreads({modelProviders:e,archived:t=!1}){return this.threadStore.listAllThreads({modelProviders:e,archived:t})}async listArchivedThreads(){return this.threadStore.listArchivedThreads()}}function _Xe(){return vXe(`recent-conversations`)}function zZ(e,t){let n=e?.find(e=>e.model===t);return n==null?YXe.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>gD(e.reasoningEffort))}function POt(e,{includeUltraInSlider:t=!1,removeXHigh:n=!1}={}){let r=ROt((t?[...JK,BOt]:JK).filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);if(r.length>=3)return r;let i=ROt(VOt.filter(({reasoningEffort:e})=>!n||e!==`xhigh`),e);return i.length>=3?i:[]}function ROt(e,t){return e.flatMap((e,n)=>t?.some(t=>t.model===e.model&&t.supportedReasoningEfforts.some(({reasoningEffort:t})=>t===e.reasoningEffort))?[{...e,powerSettingIndex:n}]:[])}var YXe=[],JK=[{id:`gpt-5.6-terra:low`,model:`gpt-5.6-terra`,modelLabel:`5.6 Terra`,reasoningEffort:`low`},{id:`gpt-5.6-sol:xhigh`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`xhigh`}],BOt={id:`gpt-5.6-sol:ultra`,model:`gpt-5.6-sol`,modelLabel:`5.6 Sol`,reasoningEffort:`ultra`},VOt=[];var subagents={isBackgroundSubagentsEnabled:!0,subagentsPanel:!0};var recentConversationsSortKey=1,threadList=`thread/list`;export{_Xe as $D};';

function createTarget() {
  const dir = tempDir('codex-patch');
  const assets = path.join(dir, 'webview/assets');
  fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(dir, 'out/extension.js'), extensionText);
  fs.writeFileSync(path.join(assets, 'header-a.js'), headerText);
  fs.writeFileSync(path.join(assets, 'app-main-a.js'), appMainText);
  fs.writeFileSync(path.join(assets, 'local-title-a.js'), localTitleText);
  fs.writeFileSync(path.join(assets, 'app-server-manager-signals-a.js'), appServerManagerSignalsText);
  fs.writeFileSync(path.join(assets, 'sidebar-project-group-signals-a.js'), sidebarProjectGroupSignalsText);
  fs.writeFileSync(path.join(assets, 'request-a.js'), requestText);
  return {
    extensionDir: dir,
    extensionJsPath: path.join(dir, 'out/extension.js'),
    headerPath: path.join(assets, 'header-a.js'),
    appMainPath: path.join(assets, 'app-main-a.js'),
    localTitlePath: path.join(assets, 'local-title-a.js'),
    sidebarPath: path.join(assets, 'sidebar-a.js'),
    sidebarProjectGroupSignalsPath: path.join(assets, 'sidebar-project-group-signals-a.js'),
    appServerManagerSignalsPath: path.join(assets, 'app-server-manager-signals-a.js'),
    requestPath: path.join(assets, 'request-a.js'),
  };
}

function configure26721Features(target) {
  fs.appendFileSync(target.appMainPath, split26721FeatureGateText);
  target.appStatsigPath = target.appServerManagerSignalsPath;
  if (!fs.readFileSync(target.appStatsigPath, 'utf8').includes('function e6e()')) {
    fs.writeFileSync(target.appStatsigPath, split26721AppServerText);
  }
  fs.appendFileSync(target.appStatsigPath, split26721PowerText);
}

function configure26727Features(target) {
  const assets = path.dirname(target.headerPath);
  target.version = '26.727.40816';
  target.appStatsigPath = target.appServerManagerSignalsPath;
  fs.writeFileSync(target.headerPath, header26727Text);
  fs.writeFileSync(target.appMainPath, split26727AppMainText);
  fs.writeFileSync(target.appServerManagerSignalsPath, split26727AppServerText);
  fs.writeFileSync(path.join(assets, 'app-initial-main26727.js'), split26727AppMainText);
  fs.writeFileSync(path.join(assets, 'app-initial-server26727.js'), split26727AppServerText);
}

function configure265730Features(target) {
  const assets = path.dirname(target.headerPath);
  target.version = '26.5730.61639';
  target.appStatsigPath = target.appServerManagerSignalsPath;
  fs.writeFileSync(target.extensionJsPath, extensionText
    .replace('e.onDidReceiveMessage(n=>{let o=a2(n);o!=null&&this.#a(o.message)})', 'e.onDidReceiveMessage(n=>{let o=O9(n);o==null||o.sessionId!==this.#r||this.#a(o.message)})')
    .replace('e.onDidReceiveMessage(a=>{if(a.type==="ready"){o?.()}this.handleMessage(e,a)})', 'e.onDidReceiveMessage(c=>{if(c.type==="ready"){o?.()}this.handleMessage(e,c)})') + webviewTimeout265730Text);
  fs.writeFileSync(target.headerPath, header265730Text);
  fs.writeFileSync(target.appMainPath, split265730AppMainText);
  fs.writeFileSync(target.appServerManagerSignalsPath, split265730AppServerText);
  fs.writeFileSync(path.join(assets, 'app-initial-main265730.js'), split265730AppMainText);
  fs.writeFileSync(path.join(assets, 'app-initial-server265730.js'), split265730AppServerText);
}

function configure265803Features(target) {
  const assets = path.dirname(target.headerPath);
  target.version = '26.5803.41515';
  target.appStatsigPath = target.appServerManagerSignalsPath;
  fs.writeFileSync(target.extensionJsPath, extensionText.replace('e.onDidReceiveMessage(a=>{if(a.type==="ready"){o?.()}this.handleMessage(e,a)})', 'e.onDidReceiveMessage(c=>{if(c.type==="ready"){o?.()}this.handleMessage(e,c)})') + webviewTimeout265730Text);
  fs.writeFileSync(target.headerPath, header265803Text);
  fs.writeFileSync(target.appMainPath, split265803AppMainText);
  fs.writeFileSync(target.appServerManagerSignalsPath, split265803AppServerText);
  fs.writeFileSync(path.join(assets, 'app-initial-main265803.js'), split265803AppMainText);
  fs.writeFileSync(path.join(assets, 'app-initial-server265803.js'), split265803AppServerText);
}

function restoreSafe26721Layout(text) {
  return text
    .replace('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:b,onClose:i,row:Jn,onActiveArchiveStart:p})', 'codexRecentTaskProjectRows(F,b,i,Jn,p)')
    .replace(',contentStyle:{height:`600px`,overflow:`hidden`}', '')
    .replace('className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`', 'className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`')
    .replace('vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1', 'vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1');
}

function restoreSafe26721TitleOverride(text) {
  const override = 'titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0,';
  return text.replace(override, '');
}

function restoreSafe26721NativeHistory(text) {
  return restoreSafe26721TitleOverride(text)
    .replace('o=_e(),codexRecentHistoryTarget=codexUseExecutionTarget(),codexRecentHistoryRoot=codexRecentHistoryTarget.activeWorkspaceRoot??null,codexRecentHistoryRootReady=!codexRecentHistoryTarget.isActiveWorkspaceRootLoading,{authMethod:s}=m(),c=fe(),l=ye(tr),{data:d}=ee(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady),', 'o=_e(),{authMethod:s}=m(),c=fe(),l=ye(tr),{data:d}=ee(),')
    .replace('d=_e(),p=At(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null,codexRecentTaskRootReady=!codexRecentTaskTarget.isActiveWorkspaceRootLoading,', 'd=_e(),p=At(),')
    .replace('let E=codexRecentTaskRootReady?codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot):[],D=codexRecentTaskRootReady?codexRecentTaskFilter(Nn(n.data,r,w),codexRecentTaskCurrentRoot):[],', 'let E=r.filter(T),D=Nn(n.data,r,w),')
    .replace(',eR as codexUseExecutionTarget}from"./app-initial-DZH_C2c-.js"', '}from"./app-initial-DZH_C2c-.js"')
    .replace(/function codexRecentTaskFilter\(e,t\)\{[\s\S]*?\}function codexRecentConversationFilter/, 'function codexRecentTaskFilter(e,t){return e}function codexRecentConversationFilter')
    .replace(/function codexRecentConversationFilter\(e,t\)\{[\s\S]*?\}function codexRecentTaskNormalizePath/, 'function codexRecentConversationFilter(e,t){return e}function codexRecentTaskNormalizePath')
    .replace('(0,Wn.c)(24)', '(0,Wn.c)(23)')
    .replace('||t[23]!==n.conversation.title', '')
    .replace('t[21]=e,t[23]=n.conversation.title,t[22]=l', 't[21]=e,t[22]=l')
    .replace('(0,Z.jsx)(Fe,{conversationId:n.conversation.id,threadSummary:n.conversation,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})', '(0,Z.jsx)(Fe,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i,onActiveArchiveStart:a})');
}

module.exports = {
  name: 'patch engine',
  tests: [
    {
      name: 'safe mode restores grouped UI actions and skips risky bundles',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } });
        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes.map((change) => change.path), [
          target.extensionJsPath,
          target.headerPath,
        ]);

        const extension = plan.changes[0].nextText;
        const header = plan.changes[1].nextText;
        assert.ok(extension.includes('codexLocalGroupsPatchVersion=17'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(n))return;'));
        assert.ok(!extension.includes('"--disable","plugins"'));
        assert.ok(!extension.includes('requestAllThreadList(e)'));
        assert.ok(!extension.includes('c.cwd=s'));
        assert.ok(!extension.includes('c.cwds=s'));
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=6'));
        assert.ok(header.includes('codexRecentTaskProjectRows'));
        assert.ok(!header.includes('需求A'));
        assert.ok(header.includes('action:`getMetadata`'));
        assert.ok(header.includes('codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('codexLocalGroupsStartConversationInGroup'));
        assert.ok(header.includes('var codexLocalGroupsMessenger=b;'));
        assert.ok(header.includes('codexLocalGroupsMessenger.dispatchMessage'));
        assert.ok(header.includes('dispatchHostMessage({type:`new-chat`})'));
        assert.ok(header.includes('codex-local-groups-conversation-row relative'));
        assert.ok(!header.includes('codexLocalGroupsHistoryLimit=120'));
        assert.ok(!header.includes('codexLocalGroupsHistoryRecovered'));
        assert.ok(!header.includes('role:`button`'));
        assert.ok(!header.includes('tabIndex:0'));
        assert.ok(!header.includes('"aria-expanded":s'));
        assert.ok(header.includes('function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}'));
        assert.ok(header.includes('codex-local-groups-visible-counts-v1'));
        assert.ok(header.includes('group-more-'));
        assert.ok(header.includes('还有 `+c+` 条，展开更多'));
        assert.ok(header.includes('收起到最近 15 条'));
        assert.ok(header.includes('收起到最近 5 条'));
        assert.ok(header.includes('sticky top-0 z-10 bg-token-dropdown-background'));
        assert.ok(!header.includes('codexLocalGroupsMetadataOnly'));
        assert.ok(!header.includes('codexLocalGroupsMetadataItems'));
        assert.ok(!header.includes('codexLocalGroupsMetadataRow'));
        assert.ok(!header.includes('codexLocalGroupsHistoryRow'));
        assert.ok(!header.includes('history-row-'));
        assert.ok(header.includes('function codexLocalGroupsScopeProjectRoot(e)'));
        assert.ok(!header.includes('codex-local-groups-current-root-v1'));
        assert.ok(header.includes('codexLocalGroupsVisibleItems'));
        assert.ok(!header.includes('project-more-'));
        assert.ok(!header.includes('codex-local-groups-expanded-projects-v1'));
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        assert.strictEqual(engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } }).changes.length, 0);
      },
    },
    {
      name: 'adapts Codex 26.727 split bundles with project history and Sol Max Ultra',
      run() {
        const target = createTarget();
        configure26727Features(target);
        const engine = new CodexPatchEngine({ nodePath: resolveNodePath(), skipSyntaxCheck: true, safeMode: true, responsesWebsocketFallbackProvider: 'newapi' });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes.map((change) => change.path), [target.extensionJsPath, target.headerPath, target.appMainPath, target.appServerManagerSignalsPath]);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const main = plan.changes.find((change) => change.path === target.appMainPath).nextText;
        const server = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=15'));
        assert.ok(header.includes('N0 as codexLocalGroupsMessengerImport'));
        assert.ok(!header.includes('qQ as codexLocalGroupsMessengerImport'));
        assert.ok(header.includes('codexRecentTaskRootReady?codexRecentConversationFilter'));
        assert.ok(header.includes('contentStyle:{height:`600px`,overflow:`hidden`}'));
        assert.ok(header.includes('(0,Wn.useState)(0)'));
        assert.ok(main.includes('codexLocalGroupsCodexUi26727PatchVersion=3'));
        assert.ok(server.includes('codexLocalGroupsProjectHistory26727PatchVersion=5'));
        assert.ok(server.includes('codexLocalGroupsPower26727PatchVersion=3'));
        assert.ok(!plan.changes.find((change) => change.path === target.extensionJsPath).nextText.includes('supports_websockets=false'));
        const mainScript = `${main.replace(/export\{[^}]+\};?/, '')};let models=[{model:'gpt-5.6-sol',supportedReasoningEfforts:[{reasoningEffort:'high'}],defaultReasoningEffort:'high'},{model:'gpt-5.6-terra',supportedReasoningEfforts:[{reasoningEffort:'high'}],defaultReasoningEffort:'high'}];console.log(JSON.stringify({sol:BVe({userSavedModelString:'gpt-5.6-sol',userSavedReasoningEffort:'max',listModelsData:{models}}).reasoningEffort,terra:BVe({userSavedModelString:'gpt-5.6-terra',userSavedReasoningEffort:'max',listModelsData:{models}}).reasoningEffort}))`;
        const mainResult = childProcess.spawnSync(resolveNodePath(), ['-e', mainScript], { encoding: 'utf8' });
        assert.strictEqual(mainResult.status, 0, mainResult.stderr);
        assert.deepStrictEqual(JSON.parse(mainResult.stdout), { sol: 'max', terra: 'high' });
        const serverScript = `function Uk(){return true}function Fy(e){return{updatedAt:e.updatedAt??0}}function Eh(e){return{id:e.conversationId??e.id,cwd:e.cwd}}var Qnt=[];${server.replace(/export\{[^}]+\};?/, '')};(async()=>{let efforts=value=>value.map(reasoningEffort=>({description:'',reasoningEffort})),models=[{model:'gpt-5.6-sol',supportedReasoningEfforts:efforts(['xhigh'])},{model:'gpt-5.6-terra',supportedReasoningEfforts:efforts(['low'])}],pages={first:{data:[{id:'root',cwd:'/project',updatedAt:3},{id:'other',cwd:'/project2',updatedAt:2}],nextCursor:'next'},next:{data:[{id:'child',cwd:'/project/sub',updatedAt:1}],nextCursor:null}},store={threadsById:new Map,listRecentThreads:({cursor})=>Promise.resolve(cursor==null?pages.first:pages.next),getThreadSummaryFromThread:e=>({conversationId:e.id,cwd:e.cwd,updatedAt:e.updatedAt}),shouldSurfaceThreadSummary:()=>true},project=await codexLocalGroupsLoadProjectConversations26727(store,'/project');console.log(JSON.stringify({power:FUt(models).map(e=>e.reasoningEffort),sol:MQ(models,'gpt-5.6-sol').map(e=>e.reasoningEffort),terra:MQ(models,'gpt-5.6-terra').map(e=>e.reasoningEffort),project:project.map(e=>e.id)}))})()`;
        const serverResult = childProcess.spawnSync(resolveNodePath(), ['-e', serverScript], { encoding: 'utf8' });
        assert.strictEqual(serverResult.status, 0, serverResult.stderr);
        assert.deepStrictEqual(JSON.parse(serverResult.stdout), { power: ['low', 'xhigh', 'max', 'ultra'], sol: ['xhigh', 'max', 'ultra'], terra: ['low'], project: ['root', 'child'] });
        assert.deepStrictEqual(run26727HeaderActions(header), {
          dispatched: [
            { channel: 'codex-local-groups', message: { action: 'promptConversationTitle', conversationId: 'abc', title: '标题', projectRoot: '/project' } },
            { channel: 'codex-local-groups', message: { action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/project' } },
            { channel: 'codex-local-groups', message: { action: 'setPendingGroup', projectRoot: '/project', group: '需求A', startedAtMs: 123 } },
          ],
          hostMessages: [{ type: 'new-chat' }],
        });
        for (const change of plan.changes) fs.writeFileSync(change.path, change.nextText);
        assert.deepStrictEqual(engine.plan(target, { version: 1, conversations: {} }), { changes: [], errors: [], unsafeBundles: [] });
        const badHeader = fs.readFileSync(target.headerPath, 'utf8').replace('N0 as codexLocalGroupsMessengerImport', 'qQ as codexLocalGroupsMessengerImport');
        fs.writeFileSync(target.headerPath, badHeader);
        const repair = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(repair.errors, []);
        assert.deepStrictEqual(repair.changes.map((change) => change.path), [target.headerPath]);
        assert.ok(repair.changes[0].nextText.includes('N0 as codexLocalGroupsMessengerImport'));
      },
    },
    {
      name: 'adapts Codex 26.5730 split bundles without losing metadata actions',
      run() {
        const target = createTarget();
        configure265730Features(target);
        const engine = new CodexPatchEngine({ nodePath: resolveNodePath(), skipSyntaxCheck: true, safeMode: true, responsesWebsocketFallbackProvider: 'newapi' });
        const plan = engine.plan(target, { version: 1, conversations: {} });

        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes.map((change) => change.path), [target.extensionJsPath, target.headerPath, target.appMainPath, target.appServerManagerSignalsPath]);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const main = plan.changes.find((change) => change.path === target.appMainPath).nextText;
        const server = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(extension.includes('codexLocalGroupsHandleWebviewMessage(c,e)'));
        assert.ok(extension.includes('this.onTimeout()},12e4))'));
        assert.ok(!extension.includes('this.onTimeout()},3e4))'));
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=16'));
        assert.ok(header.includes('N$ as codexLocalGroupsMessengerImport'));
        assert.ok(header.includes('wB as codexUseExecutionTarget'));
        assert.ok(header.includes('codexRecentTaskRootReady?codexRecentConversationFilter'));
        assert.ok(header.includes('contentStyle:{height:`600px`,overflow:`hidden`}'));
        assert.ok(header.includes('(0,Dn.useState)(0)'));
        assert.ok(main.includes('codexLocalGroupsCodexUi265730PatchVersion=1'));
        assert.ok(server.includes('codexLocalGroupsProjectHistory265730PatchVersion=1'));
        assert.ok(server.includes('codexLocalGroupsPower265730PatchVersion=1'));
        assert.ok(!extension.includes('supports_websockets=false'));
        const mainScript = `${main.replace(/export\{[^}]+\};?/, '')};let models=[{model:'gpt-5.6-sol',supportedReasoningEfforts:[{reasoningEffort:'high'}],defaultReasoningEffort:'high'},{model:'gpt-5.6-terra',supportedReasoningEfforts:[{reasoningEffort:'high'}],defaultReasoningEffort:'high'}];console.log(JSON.stringify({sol:IRe({userSavedModelString:'gpt-5.6-sol',userSavedReasoningEffort:'max',listModelsData:{models}}).reasoningEffort,terra:IRe({userSavedModelString:'gpt-5.6-terra',userSavedReasoningEffort:'max',listModelsData:{models}}).reasoningEffort}))`;
        const mainResult = childProcess.spawnSync(resolveNodePath(), ['-e', mainScript], { encoding: 'utf8' });
        assert.strictEqual(mainResult.status, 0, mainResult.stderr);
        assert.deepStrictEqual(JSON.parse(mainResult.stdout), { sol: 'max', terra: 'high' });
        const serverScript = `function JD(){return true}function gb(e){return{updatedAt:e.updatedAt??0}}function Eh(e){return{id:e.conversationId??e.id,cwd:e.cwd}}var pYe=[];${server.replace(/export\{[^}]+\};?/, '')};(async()=>{let efforts=value=>value.map(reasoningEffort=>({description:'',reasoningEffort})),models=[{model:'gpt-5.6-sol',supportedReasoningEfforts:efforts(['xhigh'])},{model:'gpt-5.6-terra',supportedReasoningEfforts:efforts(['low'])}],pages={first:{data:[{id:'root',cwd:'/project',updatedAt:3},{id:'other',cwd:'/project2',updatedAt:2}],nextCursor:'next'},next:{data:[{id:'child',cwd:'/project/sub',updatedAt:1}],nextCursor:null}},store={threadsById:new Map,listRecentThreads:({cursor})=>Promise.resolve(cursor==null?pages.first:pages.next),getThreadSummaryFromThread:e=>({conversationId:e.id,cwd:e.cwd,updatedAt:e.updatedAt}),shouldSurfaceThreadSummary:()=>true},project=await codexLocalGroupsLoadProjectConversations265730(store,'/project');console.log(JSON.stringify({power:mOt(models).map(e=>e.reasoningEffort),sol:cQ(models,'gpt-5.6-sol').map(e=>e.reasoningEffort),terra:cQ(models,'gpt-5.6-terra').map(e=>e.reasoningEffort),project:project.map(e=>e.id)}))})()`;
        const serverResult = childProcess.spawnSync(resolveNodePath(), ['-e', serverScript], { encoding: 'utf8' });
        assert.strictEqual(serverResult.status, 0, serverResult.stderr);
        assert.deepStrictEqual(JSON.parse(serverResult.stdout), { power: ['low', 'xhigh', 'max', 'ultra'], sol: ['xhigh', 'max', 'ultra'], terra: ['low'], project: ['root', 'child'] });
        assert.deepStrictEqual(run265730HeaderActions(header), {
          dispatched: [
            { channel: 'codex-local-groups', message: { action: 'promptConversationTitle', conversationId: 'abc', title: '标题', projectRoot: '/project' } },
            { channel: 'codex-local-groups', message: { action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/project' } },
            { channel: 'codex-local-groups', message: { action: 'setPendingGroup', projectRoot: '/project', group: '需求A', startedAtMs: 123 } },
          ],
          hostMessages: [{ type: 'new-chat' }],
        });
        const items = Array.from({ length: 40 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, cwd: '/project' } }));
        const metadata = { version: 1, conversations: Object.fromEntries(items.map((item, index) => [item.conversation.id, { group: index < 20 ? '需求A' : '需求B', projectRoot: '/project' }])) };
        const rows = runHeaderRows(header, 'id40', { items, metadata, currentRoot: '/project', includeStorage: true, toggleMore: true });
        assert.strictEqual((JSON.stringify(rows.rows).match(/"type":"CodexRow"/g) || []).length, 11);
        assert.strictEqual((JSON.stringify(rows.expandedRows).match(/"type":"CodexRow"/g) || []).length, 21);
        assert.strictEqual((JSON.stringify(rows.collapsedRows).match(/"type":"CodexRow"/g) || []).length, 11);
        assert.ok(JSON.stringify(rows.rows).includes('还有 14 条，展开更多'));
        for (const change of plan.changes) fs.writeFileSync(change.path, change.nextText);
        assert.deepStrictEqual(engine.plan(target, { version: 1, conversations: {} }), { changes: [], errors: [], unsafeBundles: [] });
      },
    },
    {
      name: 'adapts Codex 26.5803 filters without losing local group contracts',
      run() {
        const target = createTarget();
        configure265803Features(target);
        const engine = new CodexPatchEngine({ nodePath: resolveNodePath(), skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes.map((change) => change.path), [target.extensionJsPath, target.headerPath, target.appMainPath, target.appServerManagerSignalsPath]);
        const result = Object.fromEntries(plan.changes.map((change) => [change.path, change.nextText]));
        const extension = result[target.extensionJsPath], header = result[target.headerPath], main = result[target.appMainPath], server = result[target.appServerManagerSignalsPath];
        for (const marker of ['codexLocalGroupsHeaderSafe265803PatchVersion=1', '$1 as codexLocalGroupsMessengerImport', 'LV as codexUseExecutionTarget', 'contentStyle:{height:`600px`,overflow:`hidden`}']) assert.ok(header.includes(marker), marker);
        for (const marker of ['codexLocalGroupsProjectHistory265803PatchVersion=1', 'codexLocalGroupsPower265803PatchVersion=1']) assert.ok(server.includes(marker), marker);
        assert.ok(main.includes('codexLocalGroupsCodexUi265803PatchVersion=1'));
        assert.ok(extension.includes('codexLocalGroupsHandleWebviewMessage(c,e)'));
        assert.ok(extension.includes('this.onTimeout()},12e4))'));
        assert.deepStrictEqual(run265730HeaderActions(header), {
          dispatched: [
            { channel: 'codex-local-groups', message: { action: 'promptConversationTitle', conversationId: 'abc', title: '标题', projectRoot: '/project' } },
            { channel: 'codex-local-groups', message: { action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/project' } },
            { channel: 'codex-local-groups', message: { action: 'setPendingGroup', projectRoot: '/project', group: '需求A', startedAtMs: 123 } },
          ],
          hostMessages: [{ type: 'new-chat' }],
        });
        const items = Array.from({ length: 40 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, hostId: 'local', cwd: '/project' } }));
        const metadata = { version: 1, conversations: Object.fromEntries(items.map((item, index) => [item.conversation.id, { group: index < 20 ? '需求A' : '需求B', projectRoot: '/project' }])) };
        const rows = runHeaderRows(header, 'id40', { items, metadata, currentRoot: '/project', includeStorage: true, toggleMore: true });
        assert.deepStrictEqual([rows.rows, rows.expandedRows, rows.collapsedRows].map(value => (JSON.stringify(value).match(/"type":"CodexRow"/g) || []).length), [11, 21, 11]);
        for (const change of plan.changes) fs.writeFileSync(change.path, change.nextText);
        assert.deepStrictEqual(engine.plan(target, { version: 1, conversations: {} }), { changes: [], errors: [], unsafeBundles: [] });
      },
    },
    {
      name: 'executes Codex 26.5803 project history and Sol contracts',
      run() {
        const target = createTarget();
        configure265803Features(target);
        const plan = new CodexPatchEngine({ nodePath: resolveNodePath(), skipSyntaxCheck: true, safeMode: true }).plan(target, { version: 1, conversations: {} });
        const bundles = Object.fromEntries(plan.changes.map((change) => [change.path, change.nextText]));
        const main = bundles[target.appMainPath].replace(/export\{[^}]+\};?/, '');
        const mainScript = `${main};let models=[{model:'gpt-5.6-sol',supportedReasoningEfforts:[{reasoningEffort:'high'}],defaultReasoningEffort:'high'},{model:'gpt-5.6-terra',supportedReasoningEfforts:[{reasoningEffort:'high'}],defaultReasoningEffort:'high'}];console.log(JSON.stringify({sol:tBe({userSavedModelString:'gpt-5.6-sol',userSavedReasoningEffort:'max',listModelsData:{models}}).reasoningEffort,terra:tBe({userSavedModelString:'gpt-5.6-terra',userSavedReasoningEffort:'max',listModelsData:{models}}).reasoningEffort}))`;
        const mainResult = childProcess.spawnSync(resolveNodePath(), ['-e', mainScript], { encoding: 'utf8' });
        assert.strictEqual(mainResult.status, 0, mainResult.stderr);
        assert.deepStrictEqual(JSON.parse(mainResult.stdout), { sol: 'max', terra: 'high' });
        const server = bundles[target.appServerManagerSignalsPath].replace(/export\{[^}]+\};?/, '');
        const serverScript = `function gD(){return true}${server};(async()=>{let efforts=value=>value.map(reasoningEffort=>({description:'',reasoningEffort})),models=[{model:'gpt-5.6-sol',supportedReasoningEfforts:efforts(['xhigh'])},{model:'gpt-5.6-terra',supportedReasoningEfforts:efforts(['low'])}],pages={first:{data:[{id:'root',cwd:'/project',updatedAt:3},{id:'other',cwd:'/project2',updatedAt:2}],nextCursor:'next'},next:{data:[{id:'child',cwd:'/project/sub',updatedAt:1}],nextCursor:null}},store={threadsById:new Map,listRecentThreads:({cursor})=>Promise.resolve(cursor==null?pages.first:pages.next),getThreadSummaryFromThread:e=>({conversationId:e.id,cwd:e.cwd,updatedAt:e.updatedAt}),shouldSurfaceThreadSummary:()=>true},project=await codexLocalGroupsLoadProjectConversations265803(store,'/project');console.log(JSON.stringify({power:POt(models).map(e=>e.reasoningEffort),sol:zZ(models,'gpt-5.6-sol').map(e=>e.reasoningEffort),terra:zZ(models,'gpt-5.6-terra').map(e=>e.reasoningEffort),project:project.map(e=>e.id)}))})()`;
        const serverResult = childProcess.spawnSync(resolveNodePath(), ['-e', serverScript], { encoding: 'utf8' });
        assert.strictEqual(serverResult.status, 0, serverResult.stderr);
        assert.deepStrictEqual(JSON.parse(serverResult.stdout), { power: ['low', 'xhigh', 'max', 'ultra'], sol: ['xhigh', 'max', 'ultra'], terra: ['low'], project: ['root', 'child'] });
      },
    },
    {
      name: 'disables Responses WebSocket for a custom provider on affected Codex',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.headerPath, header26721Text);
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        fs.writeFileSync(path.join(path.dirname(target.headerPath), 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/xixian`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        const current = fs.readFileSync(target.extensionJsPath, 'utf8').replace(
          'kle(this.extensionUri,"app-server",["--analytics-default-enabled"])',
          'Cde(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled"])',
        );
        fs.writeFileSync(target.extensionJsPath, current);
        const engine = new CodexPatchEngine({
          nodePath: process.execPath,
          skipSyntaxCheck: true,
          safeMode: true,
          responsesWebsocketFallbackProvider: 'newapi',
        });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(extension.includes('"-c","model_providers.newapi.supports_websockets=false"'));
        assert.ok(!extension.includes('"--disable","plugins"'));
        for (const change of plan.changes) fs.writeFileSync(change.path, change.nextText);
        assert.strictEqual(engine.plan(target, { version: 1, conversations: {} }).changes.length, 0);
      },
    },
    {
      name: 'does not add the WebSocket fallback outside the affected version',
      run() {
        const target = createTarget();
        target.version = '26.720.1';
        const engine = new CodexPatchEngine({
          nodePath: process.execPath,
          skipSyntaxCheck: true,
          safeMode: true,
          responsesWebsocketFallbackProvider: 'newapi',
        });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(!extension.includes('supports_websockets=false'));
      },
    },
    {
      name: 'updates the Responses WebSocket fallback when the provider changes',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.headerPath, header26721Text);
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        fs.writeFileSync(path.join(path.dirname(target.headerPath), 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/xixian`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        const current = fs.readFileSync(target.extensionJsPath, 'utf8').replace('kle(this.extensionUri,"app-server",["--analytics-default-enabled"])', 'Cde(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled"])');
        fs.writeFileSync(target.extensionJsPath, current);
        const first = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true, responsesWebsocketFallbackProvider: 'oldapi' });
        for (const change of first.plan(target, { version: 1, conversations: {} }).changes) fs.writeFileSync(change.path, change.nextText);
        const next = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true, responsesWebsocketFallbackProvider: 'newapi' });
        const plan = next.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(extension.includes('model_providers.newapi.supports_websockets=false'));
        assert.ok(!extension.includes('model_providers.oldapi.supports_websockets=false'));
      },
    },
    {
      name: 'removes a stale Responses WebSocket fallback without a custom provider',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.headerPath, header26721Text);
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        fs.writeFileSync(path.join(path.dirname(target.headerPath), 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/xixian`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        const current = fs.readFileSync(target.extensionJsPath, 'utf8').replace('kle(this.extensionUri,"app-server",["--analytics-default-enabled"])', 'Cde(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled","-c","model_providers.oldapi.supports_websockets=false"])');
        fs.writeFileSync(target.extensionJsPath, current);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(!extension.includes('supports_websockets=false'));
        assert.ok(extension.includes('Cde(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled"])'));
      },
    },
    {
      name: 'fails closed for duplicate Responses WebSocket fallbacks',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        const duplicate = 'Cde(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled","-c","model_providers.oldapi.supports_websockets=false","-c","model_providers.newapi.supports_websockets=false"])';
        const current = fs.readFileSync(target.extensionJsPath, 'utf8').replace('kle(this.extensionUri,"app-server",["--analytics-default-enabled"])', duplicate);
        fs.writeFileSync(target.extensionJsPath, current);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true, responsesWebsocketFallbackProvider: 'newapi' });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.includes('extension resumed thread websocket fallback: 检测到 2 个 transport 覆盖'));
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(extension.includes('model_providers.oldapi.supports_websockets=false'));
        assert.ok(extension.includes('model_providers.newapi.supports_websockets=false'));
      },
    },
    {
      name: 'patches split Codex 26.721 app-initial bundles once per file',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appMainPath, split26721AppMainText);
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        target.requestPath = target.appMainPath;
        target.localTitlePath = target.appMainPath;
        target.appStatsigPath = target.appServerManagerSignalsPath;
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });

        assert.deepStrictEqual(plan.errors, []);
        assert.strictEqual(plan.changes.filter((change) => change.path === target.appMainPath).length, 1);
        assert.strictEqual(plan.changes.filter((change) => change.path === target.appServerManagerSignalsPath).length, 1);
        const appMain = plan.changes.find((change) => change.path === target.appMainPath).nextText;
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(appMain.includes('codexLocalGroupsWebviewPatchVersion=7'));
        assert.ok(appMain.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(appMain.includes('title:codexTitleAliasFor(e)??t(Bi,e)'));
        assert.ok(appServer.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(appServer.includes('preventAllNetworkTraffic:!0'));
        assert.ok(appServer.includes('codexLocalGroupsRecentThreadListParams({limit:t'));
        assert.ok(appServer.includes('codexLocalGroupsMarkArchivedConversation(t)'));
      },
    },
    {
      name: 'uses the Codex 26.721 cwd thread-list filter field',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(extension.includes('c.cwd=s'));
        assert.ok(!extension.includes('c.cwds=s'));
        assert.ok(appServer.includes('return t.length?{...e,cwd:t}:e'));
        assert.ok(!appServer.includes('return t.length?{...e,cwds:t}:e'));
      },
    },
    {
      name: 'preserves native history when grouping recent threads',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.appServerManagerSignalsPath);
        const text = change ? change.nextText : fs.readFileSync(target.appServerManagerSignalsPath, 'utf8');
        const helperStart = text.indexOf('var codexLocalGroupsRecentPatchVersion');
        const runtimeStart = helperStart >= 0 ? helperStart : text.indexOf('async function fFe');
        const featureStart = text.indexOf('var codexLocalGroupsPowerAndSubagentsPatchVersion', runtimeStart);
        const runtimeText = text.slice(runtimeStart, featureStart < 0 ? undefined : featureStart);
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', nativeHistorySmokeScript(runtimeText)], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'loads isolated project history without expanding the shared recent store',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(appServer.includes('codexLocalGroupsProjectHistoryPatchVersion=4'));
        assert.ok(appServer.includes('async listProjectConversations(e){await this.loadThreadHydrationState();return codexLocalGroupsLoadProjectConversations(this,e)}'));
        assert.ok(appServer.includes('async listProjectConversations(e){return this.threadStore.listProjectConversations(e)}'));
        assert.ok(appServer.includes('function e6e(e,t,n)'));
        assert.ok(appServer.includes('typeof e.addThreadArchivedListener===`function`'));
        assert.ok(appServer.includes('typeof e.addThreadUnarchivedListener===`function`'));
        assert.ok(appServer.includes('typeof e.addThreadDeletedListener===`function`'));
        assert.ok(appServer.includes('l.isError&&l.data==null?[]'));
        assert.ok(!appServer.includes('Number.MAX_SAFE_INTEGER'));
        assert.ok(appServer.includes('c=e.slice(0,50)'));
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', projectHistoryPaginationSmokeScript(appServer)], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'keeps project history hook safe before the default app server is ready',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        const start = appServer.indexOf('function e6e(e,t,n)');
        const end = appServer.indexOf('function zGe(', start);
        const hook = appServer.slice(start, end);
        const script = `const vm=require('vm'),context={t6e:()=>({data:[]}),Xk:()=>({getDefault:()=>null}),Wr:()=>({data:[],refetch(){}}),nA:{useEffect(){}},Y3e:()=>()=>{},J3e:()=>()=>{},codexLocalGroupsProjectHistoryPath:e=>e,codexLocalGroupsMergeProjectConversations:()=>[]};vm.createContext(context);vm.runInContext(${JSON.stringify(hook)},context);context.e6e('/p',void 0,!1);`;
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'keeps project history safe when a registered manager lacks thread lifecycle listeners',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        const start = appServer.indexOf('function e6e(e,t,n)');
        const end = appServer.indexOf('function zGe(', start);
        const hook = appServer.slice(start, end);
        const script = `const vm=require('vm'),manager={getHostId:()=>\`local\`,addAnyConversationMetaCallback:()=>()=>{}},registry={getDefault:()=>manager,getForHostId:()=>manager},context={t6e:()=>({data:[]}),Xk:()=>registry,Wr:()=>({data:[],refetch(){}}),nA:{useEffect:e=>e()},Y3e:({subscribeToManager})=>subscribeToManager(manager,()=>{}),J3e:e=>()=>{for(const t of e)t()},codexLocalGroupsProjectHistoryPath:e=>e,codexLocalGroupsMergeProjectConversations:()=>[]};vm.createContext(context);vm.runInContext(${JSON.stringify(hook)},context);context.e6e('/p',void 0,!0);`;
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'loads project history through a proxy manager without the patched worker method',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        const start = appServer.indexOf('function e6e(e,t,n)');
        const end = appServer.indexOf('function zGe(', start);
        const hook = appServer.slice(start, end);
        const script = `const assert=require('assert'),vm=require('vm');let query;const manager={getHostId:()=>\`local\`,getRecentConversations:()=>[],listAllThreads:async()=>[{id:'one',cwd:'/p',name:'One',preview:'',createdAt:1,updatedAt:2,recencyAt:2}],addAnyConversationMetaCallback:()=>()=>{}},registry={getDefault:()=>manager,getForHostId:()=>manager},context={t6e:()=>({data:[]}),Xk:()=>registry,Wr:e=>(query=e,{data:[],refetch(){}}),nA:{useEffect:e=>e()},Y3e:({subscribeToManager})=>subscribeToManager(manager,()=>{}),J3e:e=>()=>{for(const t of e)t()},codexLocalGroupsProjectHistoryPath:e=>e,codexLocalGroupsProjectHistoryMatch:(e,t)=>e===t,codexLocalGroupsMergeProjectConversations:()=>[],go:e=>e,py:()=>!0,oy:e=>({createdAt:e.createdAt,updatedAt:e.updatedAt,recencyAt:e.recencyAt}),bFe:e=>e.name,fh:e=>({id:e.conversationId,cwd:e.cwd,title:e.title})};vm.createContext(context);vm.runInContext(${JSON.stringify(hook)},context);context.e6e('/p',void 0,!0);query.queryFn().then(e=>assert.strictEqual(JSON.stringify(e),JSON.stringify([{id:'one',cwd:'/p',title:'One'}]))).catch(e=>{console.error(e.stack);process.exit(1)});`;
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'upgrades the crashing project history v1 hook in place',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const current = engine.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        const legacy = current.replace('ProjectHistoryPatchVersion=4', 'ProjectHistoryPatchVersion=1')
          .replace('a.getDefault()?.getHostId()??`local`', 'a.getDefault().getHostId()')
          .replace('project-history-v4', 'project-history-v1')
          .replace('typeof e.addAnyConversationMetaCallback===`function`?e.addAnyConversationMetaCallback(t):()=>{}', 'e.addAnyConversationMetaCallback(t)')
          .replace('typeof e.addThreadArchivedListener===`function`?e.addThreadArchivedListener(t):()=>{}', 'e.addThreadArchivedListener(t)')
          .replace('typeof e.addThreadUnarchivedListener===`function`?e.addThreadUnarchivedListener(t):()=>{}', 'e.addThreadUnarchivedListener(t)')
          .replace('typeof e.addThreadDeletedListener===`function`?e.addThreadDeletedListener(t):()=>{}', 'e.addThreadDeletedListener(t)');
        fs.writeFileSync(target.appServerManagerSignalsPath, legacy);
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const upgraded = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(upgraded.includes('ProjectHistoryPatchVersion=4'));
        assert.ok(upgraded.includes('a.getDefault()?.getHostId()??`local`'));
        assert.ok(upgraded.includes('typeof e.addThreadArchivedListener===`function`'));
      },
    },
    {
      name: 'upgrades the crashing project history v2 hook in place',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const current = engine.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        const legacy = current.replace('ProjectHistoryPatchVersion=4', 'ProjectHistoryPatchVersion=2').replace('project-history-v4', 'project-history-v2').replace(/typeof e\.(add\w+)===`function`\?e\.\1\(t\):\(\)=>\{\}/g, 'e.$1(t)');
        fs.writeFileSync(target.appServerManagerSignalsPath, legacy);
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const upgraded = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(upgraded.includes('ProjectHistoryPatchVersion=4'));
        assert.ok(upgraded.includes('typeof e.addThreadArchivedListener===`function`'));
      },
    },
    {
      name: 'upgrades the empty project history v3 proxy query in place',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const current = engine.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        const oldQuery = /queryFn:async\(\)=>\{let e=a\.getForHostId\(c\);if\(e==null\)return\[\];if\(typeof e\.listProjectConversations[\s\S]*?return n\}/;
        const legacy = current.replace('ProjectHistoryPatchVersion=4', 'ProjectHistoryPatchVersion=3').replace('project-history-v4', 'project-history-v3').replace(oldQuery, 'queryFn:async()=>{let e=a.getForHostId(c);return e==null?[]:e.listProjectConversations(o)}');
        fs.writeFileSync(target.appServerManagerSignalsPath, legacy);
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const upgraded = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(upgraded.includes('ProjectHistoryPatchVersion=4'));
        assert.ok(upgraded.includes('typeof e.listAllThreads!==`function`'));
      },
    },
    {
      name: 'enables Codex 26.721 subagents and 5.6 Sol Max Ultra options',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const featureGate = plan.changes.find((change) => change.path === target.appMainPath).nextText;
        const powerPicker = plan.changes.find((change) => change.path === target.appStatsigPath).nextText;
        assert.ok(featureGate.includes('codexLocalGroupsCodexUiFeatureGatePatchVersion=2'));
        assert.ok(featureGate.includes('function bR(){return!0}'));
        assert.ok(featureGate.includes('let h=!0,g=m.getHostId();'));
        assert.ok(featureGate.includes('let r=!0;r&&t(Dkt,n.getHostId());'));
        assert.ok(!featureGate.includes('1221508807'));
        assert.ok(powerPicker.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=2'));
        assert.ok(powerPicker.includes('gpt-5.6-sol:max'));
        assert.ok(powerPicker.includes('gpt-5.6-sol:ultra'));
        assert.ok(powerPicker.includes('XNt([...XW,QNt].filter'));
        assert.ok(powerPicker.includes('isBackgroundSubagentsEnabled:!0'));
        assert.ok(powerPicker.includes('u=!0,d;'));
        assert.ok(!powerPicker.includes('1221508807'));
        const runtime = powerPicker.slice(powerPicker.indexOf('var codexLocalGroupsPowerAndSubagentsPatchVersion=2'), powerPicker.indexOf('class FeatureStore'));
        const script = `${runtime}let sol=[{model:'gpt-5.6-sol',supportedReasoningEfforts:['low','medium','high','xhigh'].map(reasoningEffort=>({reasoningEffort}))}],terra=[{model:'gpt-5.6-terra',supportedReasoningEfforts:['low','medium','high'].map(reasoningEffort=>({reasoningEffort}))}];console.log(JSON.stringify({sol:KNt(sol).map(option=>option.reasoningEffort),terra:KNt(terra).map(option=>option.reasoningEffort)}))`;
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, result.stderr);
        assert.deepStrictEqual(JSON.parse(result.stdout), { sol: ['xhigh', 'max', 'ultra'], terra: ['low', 'medium', 'high'] });
      },
    },
    {
      name: 'shows Max and Ultra in the actual 5.6 Sol Reasoning menu',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const power = plan.changes.find((change) => change.path === target.appStatsigPath).nextText;
        const start = power.indexOf('var K6e=');
        const end = power.indexOf('function KNt', start);
        const script = `${power.slice(start, end)}let efforts=value=>value.map(reasoningEffort=>({description:'',reasoningEffort})),models=[{model:'gpt-5.6-sol',supportedReasoningEfforts:efforts(['low','medium','high','xhigh'])},{model:'gpt-5.6-terra',supportedReasoningEfforts:efforts(['low','medium','high','xhigh'])}],full=[{model:'gpt-5.6-sol',supportedReasoningEfforts:efforts(['low','medium','high','xhigh','max','ultra'])}];console.log(JSON.stringify({sol:XZ(models,'gpt-5.6-sol').map(option=>option.reasoningEffort),existing:XZ(full,'gpt-5.6-sol').map(option=>option.reasoningEffort),missingSol:XZ(models.slice(1),'gpt-5.6-sol').map(option=>option.reasoningEffort),terra:XZ(models,'gpt-5.6-terra').map(option=>option.reasoningEffort),custom:XZ(models,'custom').map(option=>option.reasoningEffort)}))`;
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, result.stderr);
        assert.deepStrictEqual(JSON.parse(result.stdout), {
          sol: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          existing: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          missingSol: ['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          terra: ['low', 'medium', 'high', 'xhigh'],
          custom: ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
        });
      },
    },
    {
      name: 'keeps 5.6 Sol Ultra through the model settings persistence path',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const feature = plan.changes.find((change) => change.path === target.appMainPath).nextText;
        const runtime = feature.slice(feature.indexOf('function nT'), feature.indexOf('function bR'));
        const script = `${runtime}let run=(model,effort)=>{let saved=persistReasoningEffort(model,effort,['default'],{getQueryData:()=>({model_reasoning_effort:'low'})},()=>'',null,null,(_client,_target,value)=>({model:value.model,model_reasoning_effort:value.reasoningEffort}),null,()=>{}),config=normalizeReasoningConfig(saved),listed={models:[{model,supportedReasoningEfforts:['low','high'].map(reasoningEffort=>({reasoningEffort})),defaultReasoningEffort:'low'}]};return EHe({userSavedModelString:config.model,userSavedReasoningEffort:config.reasoningEffort,listModelsData:listed}).reasoningEffort};console.log(JSON.stringify({solUltra:run('gpt-5.6-sol','ultra'),solMax:run('gpt-5.6-sol','max'),solHigh:run('gpt-5.6-sol','high'),terraUltra:run('gpt-5.6-terra','ultra'),terraMax:run('gpt-5.6-terra','max')}))`;
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, result.stderr);
        assert.deepStrictEqual(JSON.parse(result.stdout), { solUltra: 'ultra', solMax: 'max', solHigh: 'high', terraUltra: 'low', terraMax: 'low' });
      },
    },
    {
      name: 'upgrades the live Codex UI v1 patch to Ultra persistence v2',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        const appMain = fs.readFileSync(target.appMainPath, 'utf8')
          .replace('codexLocalGroupsCodexUiFeatureGatePatchVersion=2', 'codexLocalGroupsCodexUiFeatureGatePatchVersion=1')
          .replace('&&t!==`gpt-5.6-sol`', '')
          .replace('w=C===`gpt-5.6-sol`?m?.model_reasoning_effort??null:m?.model_reasoning_effort===`ultra`?null:', 'w=m?.model_reasoning_effort===`ultra`?null:')
          .replace('a=t!=null&&i!=null&&(i.includes(t)||r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`))?t:r?.defaultReasoningEffort', 'a=t!=null&&i!=null&&i.includes(t)?t:r?.defaultReasoningEffort');
        fs.writeFileSync(target.appMainPath, appMain);
        const upgrade = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(upgrade.errors, []);
        assert.deepStrictEqual(upgrade.changes.map((change) => change.path), [target.appMainPath]);
        assert.ok(upgrade.changes[0].nextText.includes('codexLocalGroupsCodexUiFeatureGatePatchVersion=2'));
        assert.ok(upgrade.changes[0].nextText.includes('i===`ultra`&&t!==`gpt-5.6-sol`'));
        assert.ok(upgrade.changes[0].nextText.includes('r?.model===`gpt-5.6-sol`&&(t===`max`||t===`ultra`)'));
        fs.writeFileSync(target.appMainPath, upgrade.changes[0].nextText);
        assert.deepStrictEqual(engine.plan(target, { version: 1, conversations: {} }).changes, []);
      },
    },
    {
      name: 'upgrades the live power v1 patch to the actual Reasoning menu v2 patch',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        const power = fs.readFileSync(target.appStatsigPath, 'utf8');
        const start = power.indexOf('function XZ(e,t)');
        const end = power.indexOf('function KNt', start);
        const original = 'function XZ(e,t){let n=e?.find(e=>e.model===t);return n==null?K6e.map(e=>({description:``,reasoningEffort:e})):n.supportedReasoningEfforts.filter(e=>vA(e.reasoningEffort))}';
        const v1 = `${power.slice(0, start)}${original}var codexLocalGroupsPowerAndSubagentsPatchVersion=1;${power.slice(end)}`;
        fs.writeFileSync(target.appStatsigPath, v1);
        const upgrade = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(upgrade.errors, []);
        assert.deepStrictEqual(upgrade.changes.map((change) => change.path), [target.appStatsigPath]);
        assert.ok(upgrade.changes[0].nextText.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=2'));
        assert.ok(upgrade.changes[0].nextText.includes('r.some(e=>e.reasoningEffort===`ultra`)'));
        fs.writeFileSync(target.appStatsigPath, upgrade.changes[0].nextText);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(second.errors, []);
        assert.deepStrictEqual(second.changes, []);
      },
    },
    {
      name: 'patches Codex 26.721 feature gates when both anchor groups share one bundle',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        fs.appendFileSync(target.appMainPath, split26721FeatureGateText + split26721PowerText);
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        target.appStatsigPath = target.appMainPath;
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const changes = plan.changes.filter((change) => change.path === target.appMainPath);
        assert.strictEqual(changes.length, 1);
        assert.ok(changes[0].nextText.includes('codexLocalGroupsCodexUiFeatureGatePatchVersion=2'));
        assert.ok(changes[0].nextText.includes('codexLocalGroupsPowerAndSubagentsPatchVersion=2'));
        assert.ok(!changes[0].nextText.includes('1221508807'));
        for (const change of plan.changes) fs.writeFileSync(change.path, change.nextText);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(second.errors, []);
        assert.strictEqual(second.changes.length, 0);
      },
    },
    {
      name: 'fails closed for partial Codex 26.721 feature markers',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        fs.writeFileSync(target.appMainPath, `var codexLocalGroupsCodexUiFeatureGatePatchVersion=1;${fs.readFileSync(target.appMainPath, 'utf8')}`);
        fs.writeFileSync(target.appStatsigPath, `var codexLocalGroupsPowerAndSubagentsPatchVersion=1;${fs.readFileSync(target.appStatsigPath, 'utf8')}`);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.includes('Codex UI feature gate: v1 补丁标记不完整'));
        assert.ok(plan.errors.includes('Codex power/subagent: v1 补丁标记不完整'));
      },
    },
    {
      name: 'fails closed when the Codex UI v2 marker loses Sol Ultra persistence',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        const appMain = fs.readFileSync(target.appMainPath, 'utf8').replace('&&t!==`gpt-5.6-sol`', '');
        fs.writeFileSync(target.appMainPath, appMain);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(second.errors.includes('Codex UI feature gate: 补丁标记不完整'));
        assert.ok(!second.changes.some((change) => change.path === target.appMainPath));
      },
    },
    {
      name: 'fails closed when a completed power marker lost subagent postconditions',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        const power = fs.readFileSync(target.appStatsigPath, 'utf8')
          .replace('this.scope!=null&&rke(', '!1&&rke(')
          .replace('=>{t(gKe);let n=t(jS,e);', '=>{if(!1)return $Ze;t(gKe);let n=t(jS,e);');
        fs.writeFileSync(target.appStatsigPath, power);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(second.errors.includes('Codex power/subagent: 补丁标记不完整'));
        assert.ok(!second.changes.some((change) => change.path === target.appStatsigPath));
      },
    },
    {
      name: 'fails closed when a completed power marker lost the Sol menu scope',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        const power = fs.readFileSync(target.appStatsigPath, 'utf8').replace('t===`gpt-5.6-sol`&&(', '!0&&(');
        fs.writeFileSync(target.appStatsigPath, power);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(second.errors.includes('Codex power/subagent: 补丁标记不完整'));
        assert.ok(!second.changes.some((change) => change.path === target.appStatsigPath));
      },
    },
    {
      name: 'fails closed when Codex 26.721 adds unknown feature-gate consumers',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        fs.appendFileSync(target.appMainPath, 'const futureUiGate=Bm(`1221508807`);');
        fs.appendFileSync(target.appStatsigPath, 'const futurePowerGate=Wc(zc,`1221508807`);');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.includes('Codex UI feature gate: 期望 3 处开关，实际 4 处'));
        assert.ok(plan.errors.includes('Codex power/subagent: 期望 5 处开关，实际 6 处'));
      },
    },
    {
      name: 'safe grouped rows keep only the current project',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const items = [
          { kind: 'local', key: 'root', conversation: { id: 'root', cwd: '/xixian', title: 'root' } },
          { kind: 'local', key: 'child', conversation: { id: 'child', cwd: '/xixian/admin-service', title: 'child' } },
          { kind: 'local', key: 'missing', conversation: { id: 'missing', title: 'missing' } },
          { kind: 'local', key: 'other', conversation: { id: 'other', cwd: '/other', title: 'other' } },
          { kind: 'local', key: 'pending', conversation: null, pendingWorktree: { id: 'pending', sourceWorkspaceRoot: '/xixian' } },
        ];
        const probe = runHeaderRows(header, 'root', { items, currentRoot: '/xixian', includeStorage: true });
        assert.deepStrictEqual(probe.filteredItemIds, ['root', 'child', 'pending']);
        assert.ok(!Object.prototype.hasOwnProperty.call(probe.storage, 'codex-local-groups-current-root-v1'));
        for (const key of ['root', 'child', 'pending']) assert.ok(JSON.stringify(probe.rows).includes(key));
        for (const key of ['missing', 'other']) assert.ok(!JSON.stringify(probe.rows).includes(key));
      },
    },
    {
      name: 'safe grouped rows render five of 2000 conversations by default',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const items = Array.from({ length: 2000 }, (_, index) => ({
          kind: 'local',
          key: `id${index + 1}`,
          conversation: { id: `id${index + 1}`, cwd: '/p', title: `会话${index + 1}` },
        }));
        const probe = runHeaderRows(header, null, { items, currentRoot: '/p', includeStorage: true });
        const rendered = JSON.stringify(probe.rows);
        assert.strictEqual(probe.filteredItemIds.length, 2000);
        assert.strictEqual((rendered.match(/"type":"CodexRow"/g) || []).length, 5);
        assert.ok(rendered.includes('还有 1995 条，展开更多'));
      },
    },
    {
      name: 'safe groups render five rows each across one project',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const header = engine.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.headerPath).nextText;
        const items = Array.from({ length: 41 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, cwd: '/xixian' } }));
        const metadata = { version: 1, conversations: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`id${index + 1}`, { group: '液位阀门联锁', projectRoot: '/xixian' }])) };
        const probe = runHeaderRows(header, null, { items, metadata, includeStorage: true });
        const rendered = JSON.stringify(probe.rows);
        assert.strictEqual((rendered.match(/"type":"CodexRow"/g) || []).length, 10);
        assert.ok(rendered.includes('还有 5 条，展开更多'));
        assert.ok(rendered.includes('还有 26 条，展开更多'));
        assert.ok(rendered.includes('id5'));
        assert.ok(rendered.includes('id15'));
        assert.ok(!rendered.includes('id10'));
      },
    },
    {
      name: 'safe group more expands by ten and collapses with group UI state only',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const items = Array.from({ length: 8 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, cwd: '/p' } }));
        const metadataText = JSON.stringify({ version: 1, conversations: { keep: { title: '保留' } } });
        const legacyText = JSON.stringify({ '/p::未分组': true });
        const probe = runHeaderRows(header, null, { items, currentRoot: '/p', includeStorage: true, toggleMore: true, storage: { 'codex-local-groups-meta-v1': metadataText, 'codex-local-groups-expanded-all-v1': legacyText, 'codex-local-groups-expanded-all-v2': legacyText } });
        assert.strictEqual((JSON.stringify(probe.rows).match(/"type":"CodexRow"/g) || []).length, 5);
        assert.strictEqual((JSON.stringify(probe.expandedRows).match(/"type":"CodexRow"/g) || []).length, 8);
        assert.strictEqual((JSON.stringify(probe.collapsedRows).match(/"type":"CodexRow"/g) || []).length, 5);
        assert.ok(JSON.stringify(probe.expandedRows).includes('收起到最近 5 条'));
        assert.strictEqual(probe.storage['codex-local-groups-meta-v1'], metadataText);
        assert.strictEqual(probe.storage['codex-local-groups-expanded-all-v1'], legacyText);
        assert.strictEqual(probe.storage['codex-local-groups-expanded-all-v2'], legacyText);
        assert.strictEqual(JSON.parse(probe.storage['codex-local-groups-visible-counts-v1'])['/p::未分组'], 5);
        assert.strictEqual(probe.storage['codex-local-groups-expanded-projects-v1'], undefined);
      },
    },
    {
      name: 'safe group offers fifteen, five, and more controls independently',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const header = engine.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.headerPath).nextText;
        const items = Array.from({ length: 30 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, cwd: '/p' } }));
        const storage = { 'codex-local-groups-visible-counts-v1': JSON.stringify({ '/p::未分组': 25 }) };
        const probe = runHeaderRows(header, null, { items, currentRoot: '/p', includeStorage: true, storage });
        const rendered = JSON.stringify(probe.rows);
        assert.strictEqual((rendered.match(/"type":"CodexRow"/g) || []).length, 25);
        assert.ok(rendered.includes('收起到最近 15 条'));
        assert.ok(rendered.includes('收起到最近 5 条'));
        assert.ok(rendered.includes('还有 5 条，展开更多'));
      },
    },
    {
      name: 'safe group keeps an active item outside the first five visible',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const header = engine.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.headerPath).nextText;
        const items = Array.from({ length: 2000 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, cwd: '/p' } }));
        const probe = runHeaderRows(header, 'id2000', { items, currentRoot: '/p', includeStorage: true });
        const rendered = JSON.stringify(probe.rows);
        assert.strictEqual((rendered.match(/"type":"CodexRow"/g) || []).length, 6);
        assert.ok(rendered.includes('id2000'));
        assert.ok(rendered.includes('还有 1994 条，展开更多'));
      },
    },
    {
      name: 'safe group does not duplicate an active item inside the first five',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const header = engine.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.headerPath).nextText;
        const items = Array.from({ length: 8 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, cwd: '/p' } }));
        const probe = runHeaderRows(header, 'id2', { items, currentRoot: '/p', includeStorage: true });
        const rendered = JSON.stringify(probe.rows);
        assert.strictEqual((rendered.match(/"type":"CodexRow"/g) || []).length, 5);
        assert.ok(rendered.includes('还有 3 条，展开更多'));
      },
    },
    {
      name: 'current safe view caps each group and expands one group by ten immediately',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const items = Array.from({ length: 2000 }, (_, index) => ({ kind: 'local', key: `id${index + 1}`, conversation: { id: `id${index + 1}`, cwd: '/wms' } }));
        const legacy = JSON.stringify({ '/wms::未分组': true });
        const metadata = JSON.stringify({ version: 1, conversations: { id2: { group: '液位阀门联锁', projectRoot: '/wms' }, id1999: { group: '液位阀门联锁', projectRoot: '/wms' } } });
        const storage = { 'codex-local-groups-meta-v1': metadata, 'codex-local-groups-expanded-all-v1': legacy, 'codex-local-groups-expanded-all-v2': legacy };
        const probe = run26721HeaderRows(header, items, '/wms', { activeId: 'id2000', toggleMore: true, storage });
        assert.deepStrictEqual(probe.defaultIds.slice().sort(), ['id1', 'id2', 'id3', 'id4', 'id5', 'id6', 'id1999', 'id2000'].sort());
        assert.strictEqual(probe.expandedIds.length, 18);
        assert.deepStrictEqual(probe.collapsedIds, probe.defaultIds);
        assert.strictEqual(probe.stateUpdates, 2);
        assert.strictEqual(JSON.parse(probe.storage['codex-local-groups-visible-counts-v1'])['/wms::未分组'], 5);
      },
    },
    {
      name: 'current safe view excludes other projects and merges child cwd into the workspace project',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const items = [
          { kind: 'local', key: 'wms-1', conversation: { id: 'wms-1', cwd: '/work/WMS' } },
          { kind: 'local', key: 'wms-child', conversation: { id: 'wms-child', cwd: '/work/WMS/service' } },
          { kind: 'local', key: 'missing', conversation: { id: 'missing' } },
          { kind: 'local', key: 'yuxi-1', conversation: { id: 'yuxi-1', cwd: '/work/yuxi' } },
        ];
        const probe = run26721HeaderRows(header, items, '/work/WMS', { includeProjects: true });
        assert.deepStrictEqual(probe.ids, ['wms-1', 'wms-child']);
        assert.deepStrictEqual(probe.projectLabels, ['WMS']);
        const loading = run26721HeaderRows(header, items, '/work/WMS', { includeProjects: true, rootLoading: true });
        assert.deepStrictEqual(loading, { ids: [], projectLabels: [] });
      },
    },
    {
      name: 'generates parseable workspace history filter code',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        const start = extension.indexOf('async provideChatSessionItems(e){');
        const end = extension.indexOf('async provideChatSessionItems(e,r)', start);
        const method = extension.slice(start, end);
        const result = childProcess.spawnSync(resolveNodePath(), ['--check', '-'], {
          input: `class Probe{${method}}`,
          encoding: 'utf8',
        });
        assert.strictEqual(result.status, 0, result.stderr);
      },
    },
    {
      name: 'safe apply removes legacy request and history filters first',
      run() {
        const target = createTarget();
        const full = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const fullReport = full.apply(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(fullReport.errors, []);
        const unsafeExtension = fs.readFileSync(target.extensionJsPath, 'utf8');
        assert.ok(fs.readFileSync(target.appServerManagerSignalsPath, 'utf8').includes('codexLocalGroupsRecentPatchVersion=3'));

        const safe = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const report = safe.apply(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(report.errors, []);
        assert.ok(report.cleanRestored.length > 0);
        assert.ok(fs.readFileSync(target.headerPath, 'utf8').includes('codexLocalGroupsHeaderSafePatchVersion=6'));
        assert.ok(!fs.readFileSync(target.extensionJsPath, 'utf8').includes('c.cwds=s'));
        assert.ok(!fs.readFileSync(target.appServerManagerSignalsPath, 'utf8').includes('codexLocalGroupsRecentPatchVersion'));

        fs.writeFileSync(target.extensionJsPath, unsafeExtension);
        const partialReport = safe.apply(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(partialReport.errors, []);
        assert.ok(partialReport.cleanRestored.some((item) => item.path === target.extensionJsPath));
        assert.ok(!fs.readFileSync(target.extensionJsPath, 'utf8').includes('workspace.workspaceFolders?.map'));
      },
    },
    {
      name: 'safe plan recovers a fully patched Codex 26.721 without anchor errors',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:null,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        fs.writeFileSync(target.appServerManagerSignalsPath, split26721AppServerText);
        configure26721Features(target);
        const full = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        assert.deepStrictEqual(full.apply(target, { version: 1, conversations: {} }).errors, []);

        const safe = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = safe.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes, []);
        assert.ok(plan.unsafeBundles.length > 0);
        const report = safe.apply(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(report.errors, []);
        assert.ok(fs.readFileSync(target.headerPath, 'utf8').includes('codexLocalGroupsHeaderSafePatchVersion=14'));
        const extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        assert.ok(!extension.includes('c.cwd=s'));
        assert.ok(!extension.includes('c.cwds=s'));
        assert.ok(!extension.includes('workspace.workspaceFolders?.map'));
        assert.ok(!fs.readFileSync(target.appServerManagerSignalsPath, 'utf8').includes('codexLocalGroupsRecentPatchVersion'));
        const appServer = fs.readFileSync(target.appServerManagerSignalsPath, 'utf8');
        const runtimeStart = appServer.indexOf('async function fFe');
        const featureStart = appServer.indexOf('var codexLocalGroupsPowerAndSubagentsPatchVersion', runtimeStart);
        const runtimeText = appServer.slice(runtimeStart, featureStart < 0 ? undefined : featureStart);
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', nativeHistorySmokeScript(runtimeText)], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'safe plan detects a partial legacy safe-v3 header',
      run() {
        const target = createTarget();
        const full = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const report = full.apply(target, { version: 1, conversations: {} });
        for (const change of report.changes) {
          if (change.path !== target.headerPath) fs.writeFileSync(change.path, change.oldText);
        }
        const legacy = fs.readFileSync(target.headerPath, 'utf8').replace('codexLocalGroupsHeaderPatchVersion=39', 'codexLocalGroupsHeaderSafePatchVersion=3');
        fs.writeFileSync(target.headerPath, legacy);

        const safe = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = safe.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes, []);
        assert.deepStrictEqual(plan.unsafeBundles, [target.headerPath]);
      },
    },
    {
      name: 'safe recovery writes nothing when a legacy bundle lacks a clean backup',
      run() {
        const target = createTarget();
        const unsafe = `${fs.readFileSync(target.extensionJsPath, 'utf8')}"--disable","plugins"`;
        fs.writeFileSync(target.extensionJsPath, unsafe);
        const safe = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const report = safe.apply(target, { version: 1, conversations: {} });
        assert.ok(report.errors.some((error) => error.includes('无法恢复旧版高风险补丁')));
        assert.deepStrictEqual(report.cleanRestored, []);
        assert.strictEqual(fs.readFileSync(target.extensionJsPath, 'utf8'), unsafe);
        assert.ok(!fs.existsSync(path.join(target.extensionDir, '.codex-patches')));
      },
    },
    {
      name: 'fails closed for an unverified future Codex protocol',
      run() {
        const target = createTarget();
        target.version = '26.5731.1';
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.includes('不支持的 Codex 扩展版本：26.5731.1'));
      },
    },
    {
      name: 'patches extension metadata helper when path alias changes',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.extensionJsPath, extensionText.replace(
          'var Dle=require("path");W();$t();',
          'var tue=require("path");U();Nt();',
        ));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(extension.includes('var tue=require("path"),codexLocalGroupsFs=require("fs"),codexLocalGroupsPatchVersion=17'));
        assert.ok(extension.includes('typeof U=="function"&&U(),typeof Nt=="function"&&Nt();'));
      },
    },
    {
      name: 'fails closed when runtime metadata sync cannot be upgraded',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const getMetadataBranch = 'if(e.action==="getMetadata"){try{t?.postMessage?.({type:"codex-local-groups",action:"metadataSaved",metadata:r})}catch{}return!0}';
        const staleExtension = fs.readFileSync(target.extensionJsPath, 'utf8')
          .replace('codexLocalGroupsPatchVersion=17', 'codexLocalGroupsPatchVersion=14')
          .replace('||e.action==="getMetadata"', '')
          .replace(getMetadataBranch, '')
          .replace('let r=codexLocalGroupsReadMeta();if(e.action==="saveConversationMeta")', 'let r=(codexLocalGroupsReadMeta());if(e.action==="saveConversationMeta")')
          .concat('if(e.action==="getMetadata")doSomething();');
        fs.writeFileSync(target.extensionJsPath, staleExtension);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.some((error) => error.includes('getMetadata 注入不完整')));
        assert.ok(!plan.changes.some((change) => change.path === target.extensionJsPath));
      },
    },
    {
      name: 'patches Codex 26.707 extension host anchors',
      run() {
        const target = createTarget();
        const currentAccount = accountInfoText.replace('X().error', 'Y().error');
        const currentExtension = extensionText
          .replace('var Dle=require("path");W();$t();var $g=1;', 'var $de=require("path");U();Mt();var cy=B(require("vscode"));')
          .replace('kle(this.extensionUri,"app-server",["--analytics-default-enabled"])', 'Cde(this.extensionUri,["-c","features.code_mode_host=true","app-server","--analytics-default-enabled"])');
        fs.writeFileSync(target.extensionJsPath, `${currentExtension}${currentAccount}`);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(extension.includes('var $de=require("path"),codexLocalGroupsFs=require("fs")'));
        assert.ok(extension.includes('typeof U=="function"&&U(),typeof Mt=="function"&&Mt();'));
        assert.ok(extension.includes('var cy=B(require("vscode"))'));
        assert.ok(extension.includes('"features.code_mode_host=true","app-server","--analytics-default-enabled","--disable","plugins"'));
        assert.ok(extension.includes('"account-info":async()=>({accountId:null'));
      },
    },
    {
      name: 'patches Codex 26.715 extension host thread list shape',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.extensionJsPath, extensionText.replace('sourceKinds:Yf})', 'sourceKinds:Yf,useStateDbOnly:!0})'));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const extension = plan.changes.find((change) => change.path === target.extensionJsPath).nextText;
        assert.ok(extension.includes('sourceKinds:Yf,useStateDbOnly:!0'));
        assert.ok(extension.includes('c.cwds=s'));
      },
    },
    {
      name: 'safe header uses stable messenger reference when alias collides',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.headerPath, headerText.replace('f as b', 'f as a'));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('var codexLocalGroupsMessenger=a;'));
        assert.ok(header.includes('codexLocalGroupsMessenger.dispatchMessage'));
        assert.ok(!header.includes('codexLocalGroupsMetadataRow'));
        assert.ok(!header.includes('try{a.dispatchHostMessage'));
        assert.ok(!header.includes('try{a.dispatchMessage(`codex-local-groups`'));
      },
    },
    {
      name: 'safe header preserves upstream recent menu height limits',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.headerPath, headerText.replace('codexRecentTaskCurrentRoot ', 'codexRecentTaskCurrentRoot max-h-[300px] max-h-[450px] '));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('max-h-[300px]'));
        assert.ok(header.includes('max-h-[450px]'));
        assert.ok(!header.includes('max-h-[900px]'));
      },
    },
    {
      name: 'normalizes legacy recent menu height to 480px',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const staleHeader = fs.readFileSync(target.headerPath, 'utf8')
          .replace('codexLocalGroupsHeaderPatchVersion=39', 'codexLocalGroupsHeaderPatchVersion=38')
          .replace('codexRecentTaskCurrentRoot ', 'codexRecentTaskCurrentRoot className:`flex max-h-[900px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1` ');
        fs.writeFileSync(target.headerPath, staleHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderPatchVersion=39'));
        assert.ok(header.includes('max-h-[480px]'));
        assert.ok(!header.includes('max-h-[900px]'));
      },
    },
    {
      name: 'safe header refreshes group rows without rewriting parent React cache state',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.headerPath, 'codexRecentTaskCurrentRoot import{f as b}from"./vscode-api-a.js";function rt(e){let t=(0,Z.c)(33),x=1;let T=codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter($e(n.data,r,ee),codexRecentTaskCurrentRoot),[te,k]=(0,$.useState)(``),j=(0,$.useDeferredValue)(te);t[15]!==y||t[16]!==n||t[17]!==F||t[18]!==M||t[19]!==D.length||t[20]!==i||t[21]!==g?(V=1,t[19]=D.length,t[20]=i,t[21]=g,t[22]=V):V=t[22];return T}function Ke(e){return e.kind===`remote`}function codexRecentTaskProjectRows(e,t,n){return []}var qe=1;');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('function rt(e){let t=(0,Z.c)(33),'));
        assert.ok(header.includes('function codexLocalGroupsProjectRowsView'));
        assert.ok(header.includes('(0,$.useEffect)(()=>{let e=()=>a(e=>e+1)'));
        assert.ok(header.includes('window.addEventListener(`codex-local-groups-refresh`'));
        assert.ok(!header.includes('t[33]!==codexLocalGroupsRefresh'));
        assert.ok(!header.includes('t[33]=codexLocalGroupsRefresh'));
      },
    },
    {
      name: 'patches Codex 26.707 recent tasks header',
      run() {
        const target = createTarget();
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'use-webview-execution-target-current.js'), 'export{};');
        fs.writeFileSync(target.headerPath, [
          'import{i as R}from"./use-environment-current.js";',
          'import{c as i,la as a}from"./vscode-api-current.js";',
          'function rt(e){let t=(0,Z.c)(33),l=x(),{authMethod:u}=I(),[d,f]=v(nt),h=c?d:`recent`,g=E(`/local/:conversationId`)?.params?.conversationId??null;let T=r.filter(w),D=$e(n.data,r,C),[O,j]=(0,$.useState)(``),M=(0,$.useDeferredValue)(O),N=M.length>0,P=D.filter(it),F=N?P:P,L=N?T:T,R=N?D:D,z=F.map(e=>(0,Q.jsx)(ve,{task:e.task,onClose:i},e.key)),U;t[15]!==g||t[16]!==n||t[17]!==R||t[18]!==N||t[19]!==D.length||t[20]!==i||t[21]!==h?(U=R.map(e=>(0,Q.jsx)(ot,{item:e,isActive:e.kind===`local`&&e.conversation!=null&&g===e.conversation.id,onClose:i},e.key)),t[15]=g,t[16]=n,t[17]=R,t[18]=N,t[19]=D.length,t[20]=i,t[21]=h,t[22]=U):U=t[22];return U}',
          'function it(e){return e.kind===`remote`}',
          'var at=(0,$.memo)(function(e){let t=(0,Z.c)(7),{conversationId:n,updatedAt:r,isActive:i,onClose:a}=e,o=r==null?void 0:(0,Q.jsx)(de,{dateString:new Date(r).toISOString()});return(0,Q.jsx)(ye,{conversationId:n,isActive:i,metaContent:o,onClick:a})}),',
          'ot=(0,$.memo)(function(e){let t=(0,Z.c)(23),{item:n,isActive:r,onClose:i}=e;switch(n.kind){case`remote`:{let e;return t[0]!==n.task||t[1]!==i?(e=(0,Q.jsx)(ve,{task:n.task,onClose:i}),t[0]=n.task,t[1]=i,t[2]=e):e=t[2],e}case`local`:{if(n.conversation==null){let e=()=>{},r=()=>{},s=(0,Q.jsx)(be,{task:n.pendingWorktree,hasAttention:n.pendingWorktree.needsAttention,onClick:e,onArchive:r});return s}let e=(n.conversation.recencyAt??n.conversation.updatedAt)==null?void 0:(0,Q.jsx)(de,{dateString:new Date(n.conversation.recencyAt??n.conversation.updatedAt).toISOString()});return(0,Q.jsx)(ye,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:i})}}});',
        ].join(''));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('f as codexLocalGroupsMessengerImport'));
        assert.ok(header.includes('codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot'));
        assert.ok(header.includes('codexRecentTaskProjectRows(R,g,i,ot)'));
        assert.ok(header.includes('t[33]!==codexLocalGroupsRefresh'));
        assert.ok(header.includes('e.pendingWorktree?.clientThreadId'));
        assert.ok(header.includes('o.conversation==null?p'));
      },
    },
    {
      name: 'resolves Codex 26.721 messenger and execution target after bundle hash and symbol changes',
      run() {
        const target = createTarget();
        const assets = path.dirname(target.headerPath);
        const appBundle = 'app-initial-NEW_HASH.js';
        fs.writeFileSync(path.join(assets, appBundle), 'function nextTarget(workspace){return{activeWorkspaceRoot:null,isActiveWorkspaceRootLoading:false}}const m=1;export{nextTarget as nR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text.replace('app-initial-DZH_C2c-.js', appBundle));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('qQ as codexLocalGroupsMessengerImport'));
        assert.ok(header.includes('nR as codexUseExecutionTarget}from"./app-initial-NEW_HASH.js"'));
        assert.ok(!header.includes('Rle as codexUseExecutionTarget'));
      },
    },
    {
      name: 'fails closed when an app bundle exports multiple execution target hooks',
      run() {
        const target = createTarget();
        const assets = path.dirname(target.headerPath);
        const appBundle = 'app-initial-MULTIPLE.js';
        const appText = 'function first(a){return{activeWorkspaceRoot:null,isActiveWorkspaceRootLoading:false}}function second(b){return{activeWorkspaceRoot:null,isActiveWorkspaceRootLoading:false}}const m=1;export{first as aR,second as bR,m as qQ};';
        fs.writeFileSync(path.join(assets, appBundle), appText);
        fs.writeFileSync(target.headerPath, header26721Text.replace('app-initial-DZH_C2c-.js', appBundle));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const original = fs.readFileSync(target.headerPath, 'utf8');
        const report = engine.apply(target, { version: 1, conversations: {} });
        assert.ok(report.errors.includes('header: execution target Hook 导出数量为 2'));
        assert.deepStrictEqual(report.changed, []);
        assert.strictEqual(fs.readFileSync(target.headerPath, 'utf8'), original);
      },
    },
    {
      name: 'safe Codex 26.721 header keeps only current-project history and sets a real 600px menu height',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        fs.writeFileSync(path.join(path.dirname(target.headerPath), 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/xixian`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=14'));
        assert.ok(header.includes('eR as codexUseExecutionTarget'));
        assert.ok(header.includes('codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??null'));
        assert.ok(header.includes('{data:d}=ee(codexRecentHistoryRoot,void 0,codexRecentHistoryRootReady)'));
        assert.ok(header.includes('codexRecentTaskRootReady?codexRecentConversationFilter'));
        assert.ok(header.includes('threadSummary:n.conversation'));
        assert.ok(header.includes('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:b,onClose:i,row:Jn,onActiveArchiveStart:p})'));
        assert.ok(header.includes('contentStyle:{height:`600px`,overflow:`hidden`}'));
        assert.ok(header.includes('className:`flex h-full min-h-0 w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`'));
        assert.ok(header.includes('vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1'));
        assert.ok(header.includes('function codexLocalGroupsProjectRowsView'));
        assert.ok(header.includes('(0,Gn.useEffect)(()=>{let e=()=>a(e=>e+1)'));
        assert.ok(header.includes('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F'));
        assert.ok(header.includes('function zn(e){let t=(0,Wn.c)(34),'));
        assert.ok(!header.includes('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`'));
        assert.ok(!header.includes('max-h-[600px]'));
        assert.ok(!header.includes('max-h-[60vh] flex-col gap-0 overflow-y-auto'));
        assert.ok(header.includes('unrelatedHeight={className:`max-h-[300px]`}'));
        assert.ok(!header.includes('max-h-[480px]'));
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(appServer.includes('codexLocalGroupsProjectHistoryPatchVersion=4'));
        assert.ok(!appServer.includes('codexLocalGroupsRecentPatchVersion'));
        const items = [
          { kind: 'local', key: 'wms', conversation: { id: 'wms', cwd: '/wms', title: 'wms' } },
          ...Array.from({ length: 49 }, (_, index) => ({ kind: 'local', key: `other-${index}`, conversation: { id: `other-${index}`, cwd: '/yuxi' } })),
        ];
        const ids = run26721HeaderRows(header, items, '/wms');
        assert.deepStrictEqual(ids, ['wms']);
        for (const change of plan.changes) fs.writeFileSync(change.path, change.nextText);
        assert.strictEqual(engine.plan(target, { version: 1, conversations: {} }).changes.length, 0);
      },
    },
    {
      name: 'refreshes the 26.721 dropdown row after setting a local title',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        fs.writeFileSync(path.join(path.dirname(target.headerPath), 'app-initial-DZH_C2c-.js'), 'const m=1;export{m as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) fs.writeFileSync(change.path, change.nextText);
        const current = fs.readFileSync(target.headerPath, 'utf8');
        const stale = restoreSafe26721TitleOverride(current)
          .replace('codexLocalGroupsHeaderSafePatchVersion=14', 'codexLocalGroupsHeaderSafePatchVersion=13');
        fs.writeFileSync(target.headerPath, stale);
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        assert.deepStrictEqual(plan.changes.map((change) => change.path), [target.headerPath]);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const start = header.indexOf('var Jn=');
        const end = header.indexOf(';const nativeScrollHeight', start) + 1;
        const script = `const vm=require('vm'),cache=[],nativeTitle='原标题',Fe=props=>{let override=props.titleOverride;if(typeof override!==\`string\`&&override!=null)return override.props.children;return nativeTitle??props.threadSummary?.title??override?.trim()??'New chat'},context={Gn:{memo:e=>e},Wn:{c:()=>cache},Z:{Fragment:'fragment',jsx:(type,props)=>type===Fe?Fe(props):{type,props}},Fe,codexLocalGroupsLocalTitle:e=>e.conversation.title};vm.createContext(context);vm.runInContext(${JSON.stringify(header.slice(start, end))},context);const common={kind:'local',id:'one'},onClose=()=>{},first=context.Jn({item:{...common,conversation:{id:'one',title:'原标题'}},isActive:false,onClose}),second=context.Jn({item:{...common,conversation:{id:'one',title:'新标题'}},isActive:false,onClose});console.log(JSON.stringify([first,second]));`;
        const result = childProcess.spawnSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
        assert.strictEqual(result.stdout.trim(), '["原标题","新标题"]');
        fs.writeFileSync(target.headerPath, header);
        assert.strictEqual(engine.plan(target, { version: 1, conversations: {} }).changes.length, 0);
      },
    },
    {
      name: 'safe Codex 26.721 header fails closed when messenger export is missing',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        fs.writeFileSync(path.join(path.dirname(target.headerPath), 'app-initial-DZH_C2c-.js'), 'export{eR};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.includes('header: app-initial 未导出 qQ messenger'));
        assert.ok(!plan.changes.some((change) => change.path === target.headerPath));
      },
    },
    {
      name: 'upgrades the live safe-v7 header to current-project history',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        const liveV7 = restoreSafe26721Layout(fs.readFileSync(target.headerPath, 'utf8'))
          .replace('function codexRecentTaskFilter(e,t){return e}', 'function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);if(!n)return e;return e.filter(e=>{let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return!t||t===n||t.startsWith(n+`/`)})}')
          .replace('function codexRecentConversationFilter(e,t){return e}', 'function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);if(!n)return e;return e.filter(e=>{if(!e)return!1;let t=codexRecentTaskNormalizePath(codexLocalGroupsConversationProjectRoot(e.id,e.cwd));return!t||t===n||t.startsWith(n+`/`)})}')
          .replace('let E=r.filter(T),D=Nn(n.data,r,w),', 'let E=codexRecentConversationFilter(r.filter(T),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter(Nn(n.data,r,w),codexRecentTaskCurrentRoot),')
          .replace('d=_e(),p=At(),', 'd=_e(),p=At(),codexRecentTaskTarget=codexUseExecutionTarget(),codexRecentTaskCurrentRoot=codexRecentTaskTarget.activeWorkspaceRoot??codexRecentTaskTarget.cwd??null,')
          .replace('}from"./app-initial-DZH_C2c-.js"', ',eR as codexUseExecutionTarget}from"./app-initial-DZH_C2c-.js"')
          .replace('codexLocalGroupsHeaderSafePatchVersion=14', 'codexLocalGroupsHeaderSafePatchVersion=7');
        fs.writeFileSync(target.headerPath, liveV7);
        const upgrade = engine.plan(target, { version: 1, conversations: {} });
        const header = upgrade.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=14'));
        assert.ok(header.includes('codexRecentTaskRootReady?codexRecentConversationFilter'));
        assert.ok(header.includes('function codexRecentTaskFilter(e,t){let n=codexRecentTaskNormalizePath(t);'));
        assert.ok(header.includes('function codexRecentConversationFilter(e,t){let n=codexRecentTaskNormalizePath(t);'));
        assert.ok(header.includes('contentStyle:{height:`600px`,overflow:`hidden`}'));
        assert.ok(!header.includes('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`'));
      },
    },
    {
      name: 'fails closed when safe-v14 history height and group row-limit postconditions are incomplete',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        const partial = fs.readFileSync(target.headerPath, 'utf8').replace('vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto pb-1', 'vertical-scroll-fade-mask flex min-h-0 flex-col gap-0 overflow-y-auto pb-1');
        fs.writeFileSync(target.headerPath, partial);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(second.errors.includes('header 26.721 local title override: 补丁标记不完整'));
        assert.ok(!second.changes.some((change) => change.path === target.headerPath));
      },
    },
    {
      name: 'fails closed when safe-v14 group row refresh or active retention drifts',
      run() {
        const drifts = [
          ['window.addEventListener(`codex-local-groups-refresh`,e)', 'window.addEventListener(`broken`,e)'],
          ['function codexLocalGroupsItemIsActive(e,t){return e.kind===`local`&&e.conversation!=null&&t===e.conversation.id}', 'function codexLocalGroupsItemIsActive(e,t){return!1}'],
          ['function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}', 'function codexLocalGroupsGroupExpanded(e,t,n,r){return!1}'],
          ['function codexLocalGroupsGroupLimit(e,t){let n=Number(codexLocalGroupsReadJsonState(`codex-local-groups-visible-counts-v1`)[codexLocalGroupsGroupKey(e,t)]);return Number.isFinite(n)&&n>=5?Math.floor(n):5}', 'function codexLocalGroupsGroupLimit(e,t){return 5}'],
          ['codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,Math.min(i.items.length,d+10))', 'codexLocalGroupsSetGroupLimit(e.projectRoot,i.label,d+1)'],
          ['s&&(h||l||c>0)?(0,Z.jsxs)(`div`', 's&&!1?(0,Z.jsxs)(`div`'],
          ['a&&!i.includes(a)&&i.push(a)', 'a&&i.includes(a)&&i.push(a)'],
          ['codexRecentTaskProjectRows(e,t,n,r,i)}', '[]}'],
          ['for(let a of e){let o=codexLocalGroupsProjectKey(a)', 'for(let a of e.slice(0,5)){let o=codexLocalGroupsProjectKey(a)'],
          ['u.items.push(a)', 'u.items.push(...e)'],
          ['let s=codexLocalGroupsGroupExpanded(e.projectRoot,i.label,i,t),d=codexLocalGroupsGroupLimit(e.projectRoot,i.label)', 'let s=!0,d=codexLocalGroupsGroupLimit(e.projectRoot,i.label)'],
          ['let o=codexLocalGroupsProjectKey(a),s=codexLocalGroupsProjectLabel(a)', 'let o=`shared`,s=codexLocalGroupsProjectLabel(a)'],
          ['function codexLocalGroupsProjectKey(e){let t=codexRecentTaskNormalizePath(codexLocalGroupsProjectRoot(e));return t||`${e.kind}:${codexLocalGroupsProjectLabel(e)}`}', 'function codexLocalGroupsProjectKey(e){return `shared`}'],
          ['function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(n)return n;', 'function codexLocalGroupsConversationProjectRoot(e,t){let n=codexRecentTaskNormalizePath(t);if(!n)return n;'],
          ['sticky top-0 z-10 bg-token-dropdown-background', 'bg-token-dropdown-background'],
          ['Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(24),', 'Jn=(0,Gn.memo)(function(e){let t=(0,Wn.c)(23),'],
          ['t[23]!==n.conversation.title', 't[23]===n.conversation.title'],
          ['titleOverride:codexLocalGroupsLocalTitle(n)?(0,Z.jsx)(Z.Fragment,{children:n.conversation.title}):void 0', 'titleOverride:void 0'],
        ];
        for (const [before, after] of drifts) {
          const target = createTarget();
          target.version = '26.721.41059';
          configure26721Features(target);
          const assets = path.dirname(target.headerPath);
          fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
          fs.writeFileSync(target.headerPath, header26721Text);
          const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
          const first = engine.plan(target, { version: 1, conversations: {} });
          for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
          const complete = fs.readFileSync(target.headerPath, 'utf8');
          const partial = complete.replace(before, after);
          assert.notStrictEqual(partial, complete);
          fs.writeFileSync(target.headerPath, partial);
          const second = engine.plan(target, { version: 1, conversations: {} });
          assert.ok(second.errors.includes('header 26.721 local title override: 补丁标记不完整'), `${before}: ${JSON.stringify(second.errors)}`);
          assert.ok(!second.changes.some((change) => change.path === target.headerPath));
        }
      },
    },
    {
      name: 'upgrades safe-v8 header to safe-v14 per-group limits',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        for (const change of first.changes) fs.writeFileSync(change.path, change.nextText);
        let liveV8 = restoreSafe26721NativeHistory(fs.readFileSync(target.headerPath, 'utf8')).replace('(0,Z.jsx)(codexLocalGroupsProjectRowsView,{items:F,activeId:b,onClose:i,row:Jn,onActiveArchiveStart:p})', 'codexRecentTaskProjectRows(F,b,i,Jn,p)');
        const viewStart = liveV8.indexOf('function codexLocalGroupsProjectRowsView(');
        const rowsStart = liveV8.indexOf('function codexRecentTaskProjectRows', viewStart);
        liveV8 = liveV8.slice(0, viewStart) + liveV8.slice(rowsStart);
        liveV8 = liveV8
          .replace(/function codexLocalGroupsGroupLimit[\s\S]*?function codexLocalGroupsVisibleItems/, 'function codexLocalGroupsVisibleItems')
          .replace(/function codexLocalGroupsVisibleItems\(e,t,n,r\)\{[\s\S]*?\}function codexRecentTaskProjectRows/, 'function codexLocalGroupsVisibleItems(e,t,n,r){return e}function codexRecentTaskProjectRows')
          .replace(/,s&&\(h\|\|l\|\|c>0\)\?\(0,Z\.jsxs\)\(`div`,\{[\s\S]*?\},`group-more-`\+r\+`-`\+a\+`-`\+i\.label\):null/, '')
          .replace('codexLocalGroupsHeaderSafePatchVersion=14', 'codexLocalGroupsHeaderSafePatchVersion=8');
        fs.writeFileSync(target.headerPath, liveV8);
        const upgrade = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(upgrade.errors, []);
        const header = upgrade.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=14'));
        assert.ok(header.includes('codexLocalGroupsGroupLimit'));
        assert.ok(header.includes('group-more-'));
        assert.ok(header.includes('codex-local-groups-visible-counts-v1'));
        assert.ok(header.includes('codexRecentTaskRootReady?codexRecentConversationFilter'));
        assert.ok(header.includes('codexRecentTaskCurrentRoot'));
      },
    },
    {
      name: 'upgrades live safe-v9 group limits to safe-v14 incremental group limits',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const full = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const fullHeader = full.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.headerPath).nextText;
        const fullStart = fullHeader.indexOf('function Bn(e){return e.kind===`remote`}');
        const fullEnd = fullHeader.indexOf('function Vn', fullStart);
        let v9Helper = fullHeader.slice(fullStart, fullEnd);
        v9Helper = v9Helper.replace('codexLocalGroupsHeaderPatchVersion=39', 'codexLocalGroupsHeaderSafePatchVersion=9').replace(/codex-local-groups-collapsed-v1/g, 'codex-local-groups-collapsed-v2').replace(/codex-local-groups-expanded-all-v1/g, 'codex-local-groups-expanded-all-v2');
        v9Helper = v9Helper.replace('function codexLocalGroupsGroupExpanded(e,t,n,r){if(codexLocalGroupsGroupHasActive(n,r))return!0;let i=codexLocalGroupsReadJsonState(`codex-local-groups-collapsed-v2`),a=codexLocalGroupsGroupKey(e,t);return Object.prototype.hasOwnProperty.call(i,a)?!i[a]:!1}', 'function codexLocalGroupsGroupExpanded(e,t,n,r){return!0}');
        v9Helper = v9Helper.replace('role:`button`,tabIndex:0,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s)},onKeyDown:t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s))},children:[', 'children:[');
        v9Helper = v9Helper.replace('(0,Z.jsx)(`button`,{type:`button`,className:`min-w-0 flex-1 truncate text-left`,title:s?`折叠分组`:`展开分组`,"aria-expanded":s,onClick:t=>{t.preventDefault(),t.stopPropagation(),codexLocalGroupsToggleGroup(e.projectRoot,i.label,s)},children:(s?`▾`:`▸`)+` `+i.label})', '(0,Z.jsx)(`span`,{className:`min-w-0 flex-1 truncate`,children:i.label})');
        v9Helper = v9Helper.replace('function codexRecentTaskProjectRows', 'function codexLocalGroupsProjectRowsView({items:e,activeId:t,onClose:n,row:r,onActiveArchiveStart:i}){let[,a]=(0,Gn.useState)(0);return(0,Gn.useEffect)(()=>{let e=()=>a(e=>e+1);return window.addEventListener(`codex-local-groups-refresh`,e),()=>window.removeEventListener(`codex-local-groups-refresh`,e)},[]),codexRecentTaskProjectRows(e,t,n,r,i)}function codexRecentTaskProjectRows');
        v9Helper = v9Helper.replace(/function codexRecentTaskFilter\(e,t\)\{[\s\S]*?\}function codexRecentConversationFilter/, 'function codexRecentTaskFilter(e,t){return e}function codexRecentConversationFilter').replace(/function codexRecentConversationFilter\(e,t\)\{[\s\S]*?\}function codexRecentTaskNormalizePath/, 'function codexRecentConversationFilter(e,t){return e}function codexRecentTaskNormalizePath');
        const safe = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const current = restoreSafe26721NativeHistory(safe.plan(target, { version: 1, conversations: {} }).changes.find((change) => change.path === target.headerPath).nextText);
        const currentStart = current.indexOf('function Bn(e){return e.kind===`remote`}');
        const currentEnd = current.indexOf('function Vn', currentStart);
        fs.writeFileSync(target.headerPath, current.slice(0, currentStart) + v9Helper + current.slice(currentEnd));
        const upgrade = safe.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(upgrade.errors, []);
        const header = upgrade.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=14'));
        assert.ok(header.includes('codexLocalGroupsGroupLimit'));
        assert.ok(header.includes('group-more-'));
      },
    },
    {
      name: 'upgrades safe-v5 header to current-project-safe v14',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        configure26721Features(target);
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'app-initial-DZH_C2c-.js'), 'function sT(e){return{activeWorkspaceRoot:`/wms`,isActiveWorkspaceRootLoading:false}}const m=1;export{sT as eR,m as qQ};');
        fs.writeFileSync(target.headerPath, header26721Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const first = engine.plan(target, { version: 1, conversations: {} });
        const patched = first.changes.find((change) => change.path === target.headerPath).nextText;
        const legacy = restoreSafe26721NativeHistory(restoreSafe26721Layout(patched))
          .replace('codexLocalGroupsHeaderSafePatchVersion=14', 'codexLocalGroupsHeaderSafePatchVersion=5');
        fs.writeFileSync(target.headerPath, legacy);
        for (const change of first.changes) if (change.path !== target.headerPath) fs.writeFileSync(change.path, change.nextText);
        const upgrade = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(upgrade.errors, []);
        const header = upgrade.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderSafePatchVersion=14'));
        assert.ok(header.includes('contentStyle:{height:`600px`,overflow:`hidden`}'));
        assert.ok(header.includes('codexUseExecutionTarget'));
        assert.ok(header.includes('codexRecentTaskRootReady?codexRecentConversationFilter'));
        const items = [
          { kind: 'local', key: 'root', conversation: { id: 'root', cwd: '/wms' } },
          { kind: 'local', key: 'child', conversation: { id: 'child', cwd: '/wms/service' } },
          { kind: 'local', key: 'missing', conversation: { id: 'missing' } },
          { kind: 'local', key: 'other', conversation: { id: 'other', cwd: '/yuxi' } },
          { kind: 'local', key: 'pending', conversation: null, pendingWorktree: { id: 'pending', sourceWorkspaceRoot: '/wms' } },
        ];
        const ids = run26721HeaderRows(header, items, '/wms');
        assert.deepStrictEqual(ids, ['root', 'child', 'pending']);
        fs.writeFileSync(target.headerPath, header);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(second.errors, []);
        assert.strictEqual(second.changes.length, 0);
      },
    },
    {
      name: 'patches Codex 26.715 recent chats header',
      run() {
        const target = createTarget();
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'use-webview-execution-target-current.js'), 'export{};');
        fs.writeFileSync(target.headerPath, header26715Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        assert.ok(header.includes('codexLocalGroupsHeaderPatchVersion=39'));
        assert.ok(header.includes('codexUseExecutionTarget'));
        assert.ok(header.includes('codexRecentTaskProjectRows(ee,_,i,st,u)'));
        assert.ok(header.includes('t[34]!==codexLocalGroupsRefresh'));
        assert.ok(header.includes('onActiveArchiveStart:codexLocalGroupsArchiveStart'));
        assert.ok(header.includes('className:`flex max-h-[480px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`'));
        assert.ok(!header.includes('className:`flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`'));
        assert.ok(!header.includes('className:`flex max-h-[60vh] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1`'));
      },
    },
    {
      name: 'safe Codex 26.715 mounts the row refresh view',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.headerPath, header26715Text);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true, safeMode: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const view = '(0,Q.jsx)(codexLocalGroupsProjectRowsView,{items:ee,activeId:_,onClose:i,row:st,onActiveArchiveStart:u})';
        assert.ok(header.includes(view));
        assert.ok(!header.includes('codexRecentTaskProjectRows(ee,_,i,st,u)'));
        assert.ok(header.includes('(0,$.useEffect)(()=>{let e=()=>a(e=>e+1)'));
        for (const change of plan.changes) fs.writeFileSync(change.path, change.nextText);
        const second = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(second.errors, []);
        assert.strictEqual(second.changes.length, 0);
      },
    },
    {
      name: 'patches Codex 26.715 recent thread requests',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appServerManagerSignalsPath, 'async function Gk(e,{modelProviders:t,archived:n=!1,sourceKinds:r=h}){let i=[],a=async o=>{let s={limit:100,cursor:o,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:!0},c=await e.sendRequest(`thread/list`,s,{priority:`background`,source:`thread_list`});i.push(...c.data),c.nextCursor&&await a(c.nextCursor)};return await a(null),i}class X{async listRecentThreads({cursor:e,limit:t,background:n=!1}){let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:h,useStateDbOnly:!0},i=await this.params.requestClient.sendRequest(`thread/list`,r,n?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});return i}}');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const appServer = plan.changes.find((change) => change.path === target.appServerManagerSignalsPath).nextText;
        assert.ok(appServer.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(appServer.includes('let s=codexLocalGroupsRecentThreadListParams'));
        assert.ok(appServer.includes('let r=codexLocalGroupsRecentThreadListParams'));
        assert.ok(!appServer.includes('e.limit<200'));
      },
    },
    {
      name: 'plans local group patches and is idempotent after applying text changes',
      run() {
        const target = createTarget();
        const metadata = { version: 1, conversations: { abc: { title: '本地标题', group: '需求A', projectRoot: '/p' } } };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        assert.deepStrictEqual(plan.errors, []);
        assert.strictEqual(plan.changes.length, 7);
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const nextPlan = engine.plan(target, metadata);
        assert.deepStrictEqual(nextPlan.errors, []);
        assert.strictEqual(nextPlan.changes.length, 0);
        const extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const header = fs.readFileSync(target.headerPath, 'utf8');
        const appMain = fs.readFileSync(target.appMainPath, 'utf8');
        const appServerManagerSignals = fs.readFileSync(target.appServerManagerSignalsPath, 'utf8');
        const sidebarProjectGroupSignals = fs.readFileSync(target.sidebarProjectGroupSignalsPath, 'utf8');
        const request = fs.readFileSync(target.requestPath, 'utf8');
        assert.ok(extension.includes('codexLocalGroupsPatchVersion=17'));
        assert.ok(extension.includes('codexLocalGroupsSchedulePatch'));
        assert.ok(!extension.includes('codexLocalGroups.applyPatchesSilent'));
        assert.ok(extension.includes('codexLocalGroupsReportAutoPatchUnavailable'));
        assert.ok(extension.includes('codexLocalGroupsProjectRootFor'));
        assert.ok(extension.includes('cwd:e.cwd??codexLocalGroupsProjectRootFor(e.id)'));
        assert.ok(extension.includes('c.cwds=s'));
        assert.ok(extension.includes('c={limit:50,cursor:r,sortKey:"created_at"'));
        assert.ok(!extension.includes('requestAllThreadList(e)'));
        assert.ok(extension.includes('function n(c){return r?c===HS:c!==HS}'));
        assert.ok(!extension.includes('function n(c){return r?c===IS:c!==IS}'));
        assert.ok(extension.includes('promptConversationGroup'));
        assert.ok(extension.includes('showInputBox'));
        assert.ok(extension.includes('showQuickPick'));
        assert.ok(extension.includes('codexLocalGroupsExistingGroups'));
        assert.ok(extension.includes('codexLocalGroupsCleanGroupName'));
        assert.ok(extension.includes('e.action==="getMetadata"'));
        assert.ok(extension.includes('"--disable","plugins"'));
        assert.ok(extension.includes('"mcp_oauth_credentials_store=\\"file\\""'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(n))return;'));
        assert.ok(extension.includes('if(codexLocalGroupsHandleWebviewMessage(a,e))return;'));
        assert.ok(!extension.includes('JSON.stringify(e,null,2)+"\n"'));
        assert.ok(extension.includes('JSON.stringify(e,null,2)+String.fromCharCode(10)'));
        assert.ok(header.includes('codexLocalGroupsHeaderPatchVersion=39'));
        assert.ok(header.includes('codexLocalGroupsProjectKey'));
        assert.ok(header.includes('codexLocalGroupsConversationProjectRoot'));
        assert.ok(header.includes('codexLocalGroupsHistoryLimit=120'));
        assert.ok(!header.includes('codexLocalGroupsMetadataItems'));
        assert.ok(!header.includes('codexLocalGroupsMetadataOnly'));
        assert.ok(!header.includes('codexLocalGroupsMetadataRow'));
        assert.ok(header.includes('codexLocalGroupsDecoratedItem'));
        assert.ok(header.includes('codexLocalGroupsLocalTitle'));
        assert.ok(header.includes('codexLocalGroupsNormalizeGroupName'));
        assert.ok(header.includes('codexLocalGroupsToggleGroup'));
        assert.ok(header.includes('codexLocalGroupsVisibleItems'));
        assert.ok(header.includes('codex-local-groups-collapsed-v1'));
        assert.ok(header.includes('codex-local-groups-expanded-all-v1'));
        assert.ok(header.includes('aria-expanded'));
        assert.ok(header.includes('"aria-expanded":s'));
        assert.ok(!header.includes('`aria-expanded`:s'));
        assert.ok(header.includes('展开全部'));
        assert.ok(header.includes('收起到最近 5 条'));
        assert.ok(header.includes('titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0'));
        assert.ok(header.includes('e.groups.sort'));
        assert.ok(header.includes('bg-token-list-hover-background'));
        assert.ok(header.includes('text-sm font-semibold'));
        assert.ok(header.includes('#93c5fd'));
        assert.ok(header.includes('borderLeftColor:i.label===`未分组`'));
        assert.ok(!header.includes('overflow-hidden rounded-lg'));
        assert.ok(header.includes('codexLocalGroupsCanUsePendingGroup'));
        assert.ok(header.includes('e.kind!==`local`'));
        assert.ok(header.includes('Date.now()-n<600000'));
        assert.ok(header.includes('t<1e12?t*1e3:t'));
        assert.ok(header.includes('r||s'));
        assert.ok(header.includes('codexLocalGroupsUuidTime'));
        assert.ok(header.includes('codex-local-groups-refresh'));
        assert.ok(header.includes('codexLocalGroupsStoreMeta(r,!0)'));
        assert.ok(header.includes('pendingGroup'));
        assert.ok(header.includes('codexLocalGroupsSetBusy'));
        assert.ok(header.includes('codexLocalGroupsStoreCurrentRoot'));
        assert.ok(header.includes('codex-local-groups-current-root-v1'));
        assert.ok(header.includes('n.textContent===t&&(n.textContent=r)'));
        assert.ok(header.includes('t[20]!==o'));
        assert.ok(header.includes('打开中…'));
        assert.ok(!header.includes('onClose:()=>{b.dispatchHostMessage({type:`navigate-to-route`,path:`/local/'));
        assert.ok(header.includes('t.preventDefault(),t.stopPropagation(),codexLocalGroupsSetBusy(t,`打开中…`),codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('startedAtMs'));
        assert.ok(header.includes('action:`setPendingGroup`'));
        assert.ok(header.includes('dispatchHostMessage({type:`new-chat`})'));
        assert.ok(!header.includes('action:`newConversationInGroup`'));
        assert.ok(header.includes('codexLocalGroupsPromptNewGroup'));
        assert.ok(header.includes('codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('metadataSaved'));
        assert.ok(header.includes('action:`getMetadata`'));
        assert.ok(!header.includes('codexLocalGroupsRowActions'));
        assert.ok(!header.includes('onContextMenu:e=>{e.preventDefault(),e.stopPropagation(),codexLocalGroupsPromptGroup'));
        assert.ok(header.includes('新建分组并开始会话'));
        assert.ok(header.includes('+ 在此分组新建会话'));
        assert.ok(header.includes('设置标题'));
        assert.ok(header.includes('设置分组'));
        assert.ok(header.includes('codex-local-groups-conversation-row relative'));
        assert.ok(header.includes('codex-local-groups-inline-actions absolute top-1'));
        assert.ok(header.includes('paddingRight:`240px`'));
        assert.ok(!header.includes('paddingRight:`112px`'));
        assert.ok(!header.includes('additionalHoverActionCount:2'));
        assert.ok(header.includes('promptConversationTitle'));
        assert.ok(header.includes('promptConversationGroup'));
        assert.ok(appMain.includes('codexLocalGroupsWebviewPatchVersion=7'));
        assert.ok(appMain.includes('action:`getMetadata`'));
        assert.ok(appMain.includes('preventAllNetworkTraffic:!0'));
        assert.ok(appMain.includes('...(O==null||O===`local`?[{id:`codex-local-title`'));
        assert.ok(!appMain.includes('...O==null||O===`local`?[{id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-title`'));
        assert.ok(appMain.includes('id:`codex-local-group`'));
        const localTitle = fs.readFileSync(target.localTitlePath, 'utf8');
        assert.ok(localTitle.includes('codexLocalGroupsLocalTitlePatchVersion=6'));
        assert.ok(appServerManagerSignals.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(appServerManagerSignals.includes('codexLocalGroupsMarkArchivedConversation'));
        assert.ok(appServerManagerSignals.includes('codexLocalGroupsRecentThreadListParams'));
        assert.ok(sidebarProjectGroupSignals.includes('codexLocalGroupsSidebarProjectStatusPatchVersion=1'));
        assert.ok(sidebarProjectGroupSignals.includes('f?.type===`idle`||f?.type===`notLoaded`?`idle`'));
        assert.ok(!appServerManagerSignals.includes('codexLocalGroupsRecentInitialMeta'));
        assert.ok(appServerManagerSignals.includes('cwds:t'));
        assert.ok(!appServerManagerSignals.includes('e.limit<200'));
        assert.ok(request.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(request.includes('codexLocalGroupsIsDisabledUsageRequest'));
        assert.ok(request.includes('codexLocalGroupsDisabledRequestPath'));
        assert.ok(request.includes('`/ces/v1/rgstr`'));
        assert.ok(request.includes('`/backend-api/plugins/featured`'));
        assert.ok(request.includes('return null'));
      },
    },
    {
      name: 'disables ChatGPT-only prechecks in api-key extension sessions',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const extensionChange = plan.changes.find((item) => item.path === target.extensionJsPath);
        const appMainChange = plan.changes.find((item) => item.path === target.appMainPath);
        assert.ok(extensionChange);
        assert.ok(appMainChange);
        assert.ok(extensionChange.nextText.includes('"--disable","plugins"'));
        assert.ok(extensionChange.nextText.includes('"mcp_oauth_credentials_store=\\"file\\""'));
        assert.ok(appMainChange.nextText.includes('preventAllNetworkTraffic:!0'));
      },
    },
    {
      name: 'patches latest app-main tray menu helper anchor',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appMainPath, [
          'import{f as gi}from"./vscode-api-a.js";',
          'function vj({get:e,threadKeys:t,groups:n,projectlessThreadIds:r,projectlessLabel:i,untitledThreadLabel:a}){let o=Mm(n),s=[];for(let n of t){let t=e(dp,n);if(t==null||t.kind===`pending-worktree`)continue;let c=t.kind===`local`?t.conversation.workspaceKind===`projectless`||r?.includes(t.conversation.id)===!0:r?.includes(t.task.id)===!0;s.push({title:(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a,path:Wu(n),projectLabel:c?i:o.get(n)??(t.kind===`local`?Ba(t.conversation.cwd??``):t.task.task_status_display?.environment_label??``),isProjectless:c})}return s}',
          'qC={networkConfig:{api:HC,logEventUrl:ZS,sdkExceptionUrl:UC,networkOverrideFunc:zC}}',
        ].join(''));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: 'A' } } });
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsWebviewPatchVersion=7'));
        assert.ok(change.nextText.includes('function vj({get:e,threadKeys:t,groups:n'));
        assert.ok(change.nextText.includes('codexTitleAliasFor(t.conversation.id)??t.conversation.title?.trim()'));
        assert.ok(change.nextText.includes('preventAllNetworkTraffic:!0'));
      },
    },
    {
      name: 'discovers renamed app-main tray menu helper by semantics',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appMainPath, [
          'import{f as gi}from"./vscode-api-a.js";',
          'function Qj({get:e,threadKeys:t,groups:n,unreadThreadKeys:u,projectlessThreadIds:r,projectlessLabel:i,untitledThreadLabel:a}){let o=Mm(n),s=[];for(let n of t){let t=e(dp,n);if(t==null||t.kind===`local`&&t.conversation==null)continue;let c=t.kind===`local`?t.conversation.workspaceKind===`projectless`||r?.includes(t.conversation.id)===!0:r?.includes(t.task.id)===!0;s.push({title:(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a,path:Wu(n),projectLabel:c?i:o.get(n)??(t.kind===`local`?Ba(t.conversation.cwd??``):t.task.task_status_display?.environment_label??``),isProjectless:c})}return s}',
          'JC={networkConfig:{api:UC,logEventUrl:QS,sdkExceptionUrl:WC,networkOverrideFunc:BC}}',
        ].join(''));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: 'A' } } });
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsWebviewPatchVersion=7'));
        assert.ok(change.nextText.includes('function Qj({get:e,threadKeys:t,groups:n,unreadThreadKeys:u'));
        assert.ok(change.nextText.includes('codexTitleAliasFor(t.conversation.id)??t.conversation.title?.trim()'));
      },
    },
    {
      name: 'does not guess app-main helper when semantic anchor is not unique',
      run() {
        const target = createTarget();
        const helper = 'function Qj({get:e,threadKeys:t,groups:n,projectlessThreadIds:r,projectlessLabel:i,untitledThreadLabel:a}){let o=Mm(n),s=[];for(let n of t){let t=e(dp,n);if(t==null||t.kind===`pending-worktree`)continue;let c=t.kind===`local`?t.conversation.workspaceKind===`projectless`||r?.includes(t.conversation.id)===!0:r?.includes(t.task.id)===!0;s.push({title:(t.kind===`local`?t.conversation.title?.trim():t.task.title?.trim())||a,path:Wu(n),projectLabel:c?i:o.get(n)??(t.kind===`local`?Ba(t.conversation.cwd??``):t.task.task_status_display?.environment_label??``),isProjectless:c})}return s}';
        fs.writeFileSync(target.appMainPath, `import{f as gi}from"./vscode-api-a.js";${helper}${helper.replace('function Qj', 'function Rj')}`);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.ok(plan.errors.includes('app-main metadata helper: 找不到 function aE(e){ 注入点'));
      },
    },
    {
      name: 'disables ChatGPT usage requests for api-key auth users',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.requestPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(change.nextText.includes('codexLocalGroupsIsDisabledUsageRequest(s)'));
        assert.ok(change.nextText.includes('new URL(e,`https://chatgpt.com`).pathname'));
        assert.ok(change.nextText.includes('t.startsWith(`/wham/usage`)'));
        assert.ok(change.nextText.includes('t.startsWith(`/ces/v1/rgstr`)'));
        assert.ok(change.nextText.includes('t.startsWith(`/backend-api/plugins/featured`)'));
        assert.ok(change.nextText.includes('return null'));
        assert.ok(change.nextText.indexOf('codexLocalGroupsIsDisabledUsageRequest(s)') < change.nextText.indexOf('i.getInstance().get(u,l)'));
      },
    },
    {
      name: 'patches renamed request class in Codex 26.707',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.requestPath, requestText.replace('var p=class{', 'var _=class{constructor(e={}){this.defaults=e}'));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const request = plan.changes.find((change) => change.path === target.requestPath).nextText;
        assert.ok(request.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(request.includes('var _=class{constructor(e={}){this.defaults=e}'));
        assert.ok(request.includes('if(codexLocalGroupsIsDisabledUsageRequest(s))return null;'));
      },
    },
    {
      name: 'disables latest Statsig network config',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appMainPath, appMainText.replace(
          'tN={networkConfig:{api:YM,logEventUrl:cM,sdkExceptionUrl:XM,networkOverrideFunc:KM}}',
          'JC={networkConfig:{api:UC,logEventUrl:QS,sdkExceptionUrl:WC,networkOverrideFunc:BC}}'
        ));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(change);
        assert.ok(change.nextText.includes('JC={networkConfig:{api:UC,logEventUrl:QS,sdkExceptionUrl:WC,networkOverrideFunc:BC,preventAllNetworkTraffic:!0}}'));
      },
    },
    {
      name: 'upgrades existing v1 request precheck helper for api-key fallback',
      run() {
        const target = createTarget();
        const v1Helper = 'var codexLocalGroupsRequestPatchVersion=1;function codexLocalGroupsIsDisabledUsageRequest(e){return typeof e==`string`&&e.startsWith(`/wham/usage`)}';
        const oldRequestStart = 'async makeRequest(o,s,c){let{headers:l,url:u}=this.getRequestTarget(s,c);';
        const patchedRequestStart = 'async makeRequest(o,s,c){if(codexLocalGroupsIsDisabledUsageRequest(s))return null;let{headers:l,url:u}=this.getRequestTarget(s,c);';
        fs.writeFileSync(target.requestPath, requestText.replace('var p=class', `${v1Helper}var p=class`).replace(oldRequestStart, patchedRequestStart));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.requestPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsRequestPatchVersion=2'));
        assert.ok(change.nextText.includes('codexLocalGroupsDisabledRequestPath'));
        assert.ok(change.nextText.includes('new URL(e,`https://chatgpt.com`).pathname'));
        assert.ok(change.nextText.includes('t.startsWith(`/ces/v1/rgstr`)'));
        assert.ok(change.nextText.includes('t.startsWith(`/backend-api/plugins/featured`)'));
        assert.ok(!change.nextText.includes('codexLocalGroupsRequestPatchVersion=1'));
      },
    },
    {
      name: 'returns empty account info without parsing api-key auth token',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.extensionJsPath, `${extensionText}${accountInfoText}`);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('"account-info":async()=>({accountId:null,userId:null,plan:null,email:null,computeResidency:null,hasChatGptToken:!1})'));
        assert.ok(!change.nextText.includes('Unable to extract account id and plan from auth token'));
        assert.ok(!change.nextText.includes('Buffer.from(e.split(".")[1]'));
      },
    },
    {
      name: 'filters webview recent thread requests by the stored current root',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          conversations: {
            a: { group: '需求A', projectRoot: '/home/project/vscode/yuxi' },
            b: { group: '需求B', projectRoot: '/home/project/vscode/liaochen/' },
          },
        };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const change = plan.changes.find((item) => item.path === target.appServerManagerSignalsPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(change.nextText.includes('codexLocalGroupsRecentThreadListParams({limit:t'));
        assert.ok(change.nextText.includes('codexLocalGroupsRecentThreadListParams({limit:200'));
        assert.ok(change.nextText.includes('cwds:t'));
        assert.ok(!change.nextText.includes('e.limit<200'));
        const script = path.join(target.extensionDir, 'app-server-manager-signals-smoke.js');
        fs.writeFileSync(script, appServerManagerSignalsSmokeScript(change.nextText));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'filters current webview recent thread request shape',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appServerManagerSignalsPath, appServerManagerSignalsCurrentText());
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.appServerManagerSignalsPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('let c=codexLocalGroupsRecentThreadListParams({limit:200'));
        assert.ok(change.nextText.includes('let r=codexLocalGroupsRecentThreadListParams({limit:t'));
        const script = path.join(target.extensionDir, 'current-app-server-manager-signals-smoke.js');
        fs.writeFileSync(script, currentAppServerManagerSignalsSmokeScript(change.nextText));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'filters Codex 26.707 recent thread request shape',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.appServerManagerSignalsPath, [
          'async function YE(e,{modelProviders:t,archived:n=!1,sourceKinds:r=p,useStateDbOnly:i=!1}){let a=[],o=async s=>{let c={limit:100,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i},l=await e.sendRequest(`thread/list`,c,{priority:`background`,source:`thread_list`});a.push(...l.data),l.nextCursor&&await o(l.nextCursor)};return await o(null),a}',
          'async function fg(e,t,n){e.removeConversationFromCache(t),e.dispatchMessageFromView(`thread-archived`,{hostId:e.hostId,conversationId:t,cwd:n})}',
          'class Eg{async listRecentThreads({cursor:e,limit:t,useStateDbOnly:n=!1,background:r=!1}){let i={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:p,useStateDbOnly:n},a=await this.params.requestClient.sendRequest(`thread/list`,i,r?{priority:`background`,source:`recent_threads`}:{source:`recent_threads`});return a}}',
        ].join(''));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.appServerManagerSignalsPath);
        assert.ok(change.nextText.includes('codexLocalGroupsRecentPatchVersion=3'));
        assert.ok(change.nextText.includes('let c=codexLocalGroupsRecentThreadListParams({limit:100'));
        assert.ok(change.nextText.includes('let i=codexLocalGroupsRecentThreadListParams({limit:t'));
        assert.ok(change.nextText.includes('{priority:`background`,source:`thread_list`}'));
      },
    },
    {
      name: 'keeps completed rows idle when latest turn status is stale',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.sidebarProjectGroupSignalsPath);
        assert.ok(change);
        const script = path.join(target.extensionDir, 'sidebar-project-status-smoke.js');
        fs.writeFileSync(script, sidebarProjectStatusSmokeScript(change.nextText));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'generates parseable group collapse header helper',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        const start = headerChange.nextText.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = headerChange.nextText.indexOf('function codexRecentTaskProjectLabel', start);
        assert.ok(start >= 0);
        assert.ok(end > start);
        const result = childProcess.spawnSync(resolveNodePath(), ['--input-type=module', '--check'], {
          input: headerChange.nextText.slice(start, end),
          encoding: 'utf8',
        });
        assert.strictEqual(result.status, 0, result.stderr);
      },
    },
    {
      name: 'upgrades v28 inline action padding to avoid right-side overlap',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const oldHeader = fs.readFileSync(target.headerPath, 'utf8')
          .replace(/codexLocalGroupsHeaderPatchVersion=39/g, 'codexLocalGroupsHeaderPatchVersion=28')
          .replace(/paddingRight:`240px`/g, 'paddingRight:`112px`');
        fs.writeFileSync(target.headerPath, oldHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('codexLocalGroupsHeaderPatchVersion=39'));
        assert.ok(headerChange.nextText.includes('paddingRight:`240px`'));
        assert.ok(!headerChange.nextText.includes('paddingRight:`112px`'));
      },
    },
    {
      name: 'opens grouped new conversations in the current Codex webview',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const staleHeader = fs.readFileSync(target.headerPath, 'utf8')
          .replace(/codexLocalGroupsHeaderPatchVersion=39/g, 'codexLocalGroupsHeaderPatchVersion=36')
          .replace('codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`setPendingGroup`,projectRoot:e,group:t,startedAtMs:n.pendingGroup.startedAtMs}),codexLocalGroupsMessenger.dispatchHostMessage({type:`new-chat`})', 'codexLocalGroupsMessenger.dispatchMessage(`codex-local-groups`,{action:`newConversationInGroup`,projectRoot:e,group:t,startedAtMs:n.pendingGroup.startedAtMs})');
        fs.writeFileSync(target.headerPath, staleHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('codexLocalGroupsHeaderPatchVersion=39'));
        assert.ok(headerChange.nextText.includes('action:`setPendingGroup`'));
        assert.ok(headerChange.nextText.includes('dispatchHostMessage({type:`new-chat`})'));
        assert.ok(!headerChange.nextText.includes('action:`newConversationInGroup`'));
      },
    },
    {
      name: 'keeps latest header project rows on the upstream row component',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const staleHeader = fs.readFileSync(target.headerPath, 'utf8')
          .replace(/codexLocalGroupsHeaderPatchVersion=39/g, 'codexLocalGroupsHeaderPatchVersion=32')
          .replace(/codexRecentTaskProjectRows\(F,p,a,Je\)/g, 'codexRecentTaskProjectRows(F,y,i)')
          .replace(/codexRecentTaskProjectRows\(F,p,a\)/g, 'codexRecentTaskProjectRows(F,y,i)')
          .replace(/function codexRecentTaskProjectRows\(e,t,n,codexLocalGroupsRow\)\{/g, 'function codexRecentTaskProjectRows(e,t,n){')
          .replace(/\(0,Q\.jsx\)\(codexLocalGroupsRow,\{item:o,isActive:o\.kind===`local`&&t===o\.conversation\.id,onClose:n\},o\.key\)/g, '(0,Q.jsx)(Je,{item:o,isActive:o.kind===`local`&&t===o.conversation.id,onClose:n},o.key)')
          + ';codexRecentTaskProjectRows(F,y,i);';
        fs.writeFileSync(target.headerPath, staleHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('codexRecentTaskProjectRows(F,y,i,ot)'));
        assert.ok(headerChange.nextText.includes('function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow,codexLocalGroupsArchiveStart)'));
        assert.ok(headerChange.nextText.includes('(0,Q.jsx)(codexLocalGroupsRow,{item:o'));
        assert.ok(!headerChange.nextText.includes('(0,Q.jsx)(Je,{item:o'));
      },
    },
    {
      name: 'defines current root inside latest recent tasks menu',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.headerPath, 'codexRecentTaskCurrentRoot import{f as b}from"./vscode-api-a.js";codex-local-groups-inline-actions absolute codexLocalGroupsHeaderPatchVersion=33 function rt(e){let t=(0,Z.c)(33),x=1;let T=codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot),D=codexRecentTaskFilter($e(n.data,r,ee),codexRecentTaskCurrentRoot),[te,k]=(0,$.useState)(``);t[15]!==y||t[16]!==n||t[17]!==F||t[18]!==M||t[19]!==D.length||t[20]!==i||t[21]!==g||t[31]!==codexLocalGroupsRefresh?t[19]=D.length,t[20]=i,t[21]=g,t[31]=codexLocalGroupsRefresh,t[22]=V:V=t[22];return T}function codexRecentTaskProjectRows(e,t,n,codexLocalGroupsRow){return []}');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('codexRecentTaskMenuCurrentRoot'));
        assert.ok(headerChange.nextText.includes('function rt(e){let t=(0,Z.c)(35)'));
        assert.ok(headerChange.nextText.includes('t[33]!==codexLocalGroupsRefresh'));
        assert.ok(!headerChange.nextText.includes('codexRecentConversationFilter(r.filter(w),codexRecentTaskCurrentRoot)'));
        assert.ok(!headerChange.nextText.includes('t[31]!==codexLocalGroupsRefresh'));
      },
    },
    {
      name: 'upgrades latest header local title cache to react to metadata changes',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const staleTitle = 'let i;return t[5]!==r||t[6]!==n.conversation.id||t[7]!==a||t[8]!==e?(i=(0,Q.jsx)(de,{conversationId:n.conversation.id,isActive:r,metaContent:e,onClick:a,titleOverride:codexLocalGroupsLocalTitle(n)??void 0}),t[5]=r,t[6]=n.conversation.id,t[7]=a,t[8]=e,t[9]=i):i=t[9],i';
        const staleHeader = `${fs.readFileSync(target.headerPath, 'utf8')};${staleTitle};`;
        fs.writeFileSync(target.headerPath, staleHeader);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange);
        assert.ok(headerChange.nextText.includes('titleOverride:o?(0,Q.jsx)(Q.Fragment,{children:o}):void 0'));
        assert.ok(headerChange.nextText.includes('t[20]=o,t[9]=i'));
        assert.ok(!headerChange.nextText.includes('titleOverride:codexLocalGroupsLocalTitle(n)??void 0'));
      },
    },
    {
      name: 'patches latest local title signal with local aliases',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.localTitlePath, 'import{t as e,z as t}from"./app-scope.js";import{Pt as r,Rt as i,T as a,mi as o,pi as s}from"./thread-context-inputs.js";var c=t(e,(e,{get:t})=>e==null?null:s({id:e,title:t(r,e),turns:t(a,e)??t(i,e)})),l=t(e,(e,{get:t})=>null);export{l as n,c as t};');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });

        const plan = engine.plan(target, { version: 1, conversations: { abc: { title: '本地标题' } } });
        const localTitleChange = plan.changes.find((change) => change.path === target.localTitlePath);
        assert.ok(localTitleChange);
        assert.ok(localTitleChange.nextText.includes('codexLocalGroupsLocalTitlePatchVersion=6'));
        assert.ok(localTitleChange.nextText.includes('title:codexTitleAliasFor(e)??t(r,e)'));
      },
    },
    {
      name: 'does not show empty expand-all action when active item fills the limit',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const conversations = {};
        for (let index = 1; index <= 6; index += 1) {
          conversations[`id${index}`] = { group: '需求A', projectRoot: '/p', updatedAtMs: index };
        }
        const plan = engine.plan(target, { version: 1, conversations });
        const rows = runHeaderRows(plan.changes.find((change) => change.path === target.headerPath).nextText, 'id6', {
          metadata: { version: 1, conversations },
        });
        const rendered = JSON.stringify(rows);
        assert.ok(rendered.includes('id6'));
        assert.ok(!rendered.includes('还有 0 条'));
      },
    },
    {
      name: 'merges duplicate-looking group names in header rows',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const conversations = {};
        for (let index = 1; index <= 6; index += 1) {
          conversations[`id${index}`] = { group: index % 2 ? '需求A' : ' 需求A　', projectRoot: '/p', updatedAtMs: index };
        }
        const plan = engine.plan(target, { version: 1, conversations });
        const rows = runHeaderRows(plan.changes.find((change) => change.path === target.headerPath).nextText, 'id6', {
          metadata: { version: 1, conversations },
        });
        const groupHeaders = rows.filter((row) => String(row.key || '').startsWith('group-0-') && !String(row.key || '').startsWith('group-more'));
        assert.strictEqual(groupHeaders.length, 1);
        assert.ok(JSON.stringify(rows).includes('▾ 需求A'));
        assert.ok(!JSON.stringify(rows).includes(' 需求A　'));
      },
    },
    {
      name: 'restores opening label after React clears event currentTarget',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const start = header.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = header.indexOf('function codexRecentTaskProjectLabel', start);
        const script = path.join(target.extensionDir, 'header-busy-smoke.js');
        fs.writeFileSync(script, headerBusySmokeScript(header.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'refreshes cached local title override without reload',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          updatedAtMs: 100,
          conversations: {
            abc: { title: '旧标题', group: '需求A', projectRoot: '/p', updatedAtMs: 100 },
          },
        };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const script = path.join(target.extensionDir, 'header-title-refresh-smoke.js');
        fs.writeFileSync(script, headerTitleRefreshSmokeScript(header));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'removes legacy app-main title alias helper after webview helper upgrade',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const patched = fs.readFileSync(target.appMainPath, 'utf8');
        const broken = patched.replace(
          'function aE(e){',
          'var codexTitleAliasMap={};function codexTitleAliasFor(e){return null}function aE(e){',
        );
        fs.writeFileSync(target.appMainPath, broken);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.appMainPath);
        assert.ok(change);
        assert.strictEqual((change.nextText.match(/function codexTitleAliasFor/g) || []).length, 1);
        assert.ok(!change.nextText.includes('var codexTitleAliasMap={}'));
      },
    },
    {
      name: 'keeps paged thread list filtered by workspace cwd',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.extensionJsPath, extensionText.replace(
          'requestAllThreadList workingDirectoryPath',
          'requestAllThreadList',
        ));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        let extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const start = extension.indexOf('async requestAllThreadList(e){');
        const end = extension.indexOf('s=Cle(codexTitleAliasFor(r)??n)', start);
        const oldThreadList = 'async requestAllThreadList(e){let r=[],n=null;do{let o=await this.requestThreadList(e,n);r.push(...o.data),n=o.nextCursor??null}while(n);return{data:r}}requestThreadList(e,r){let n=String(this.nextRequestId++),o=new Promise((i,s)=>{this.requestToCallback.set(n,a=>{if(a.error){s(new Error(a.error.message));return}if(a.result==null){s(new Error("No result in response"));return}i(a.result)})}),s=Il.workspace.workspaceFolders?.map(a=>a.uri.fsPath).filter(Boolean)??[],c={limit:200,cursor:r,sortKey:"created_at",modelProviders:e?[HS]:null,archived:!1,sourceKinds:Yf};s.length>0&&(c.cwds=s);return this.codexAppServer.sendRequest(_le,n,"thread/list",c),o}';
        extension = extension.slice(0, start) + oldThreadList + extension.slice(end);
        fs.writeFileSync(target.extensionJsPath, extension);

        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        assert.ok(change);
        assert.ok(change.nextText.includes('c.cwds=s'));
        assert.ok(change.nextText.includes('c={limit:50,cursor:r,sortKey:"created_at"'));
      },
    },
    {
      name: 'upgrades the Codex 26.721 legacy cwd filter atomically',
      run() {
        const target = createTarget();
        target.version = '26.721.41059';
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) fs.writeFileSync(change.path, change.nextText);
        const extension = fs.readFileSync(target.extensionJsPath, 'utf8')
          .replace('c={limit:50,cursor:r,sortKey:"created_at"', 'c={limit:200,cursor:r,sortKey:"created_at"')
          .replace('c.cwd=s', 'c.cwds=s');
        fs.writeFileSync(target.extensionJsPath, extension);
        const result = engine.apply(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(result.errors, []);
        assert.strictEqual(result.restored, false);
        assert.strictEqual(result.idempotent, true);
        const upgraded = fs.readFileSync(target.extensionJsPath, 'utf8');
        assert.ok(upgraded.includes('c.cwd=s'));
        assert.ok(upgraded.includes('c={limit:50,cursor:r,sortKey:"created_at"'));
        assert.ok(!upgraded.includes('c.cwds=s'));
      },
    },
    {
      name: 'uses metadata project root when conversation cwd is missing',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          conversations: {
            old1: { title: '旧会话1', group: '需求A', projectRoot: '/p' },
            old2: { title: '旧会话2', group: '需求A', projectRoot: '/p' },
            other: { title: '其它会话', group: '其它', projectRoot: '/other' },
          },
        };
        const items = ['old1', 'old2', 'other'].map((id, index) => ({
          kind: 'local',
          key: id,
          conversation: { id, title: id, createdAt: index + 1, updatedAt: index + 1 },
        }));
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const probe = runHeaderRows(header, 'old2', { items, currentRoot: '/p', metadata });
        const rendered = JSON.stringify(probe.rows);
        assert.deepStrictEqual(probe.conversationIds, ['old1', 'old2']);
        assert.ok(rendered.includes('需求A'));
        assert.ok(rendered.includes('old1'));
        assert.ok(rendered.includes('old2'));
        assert.ok(!rendered.includes('other'));
      },
    },
    {
      name: 'recovers current project history rows from metadata with a hard limit',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          conversations: {},
        };
        metadata.conversations.old1 = { title: '旧会话1', group: '需求A', projectRoot: '/p', updatedAtMs: 100 };
        metadata.conversations.old2 = { title: '旧会话2', group: '需求A', projectRoot: '/p', updatedAtMs: 200 };
        metadata.conversations.other = { title: '其它会话', group: '其它', projectRoot: '/other', updatedAtMs: 300 };
        for (let index = 0; index < 130; index += 1) {
          metadata.conversations[`extra${index}`] = { title: `额外${index}`, group: '额外', projectRoot: '/p', updatedAtMs: index };
        }
        const items = [{
          kind: 'local',
          key: 'old2',
          conversation: { id: 'old2', title: '旧会话2', cwd: '/p', createdAt: 2, updatedAt: 2 },
        }];
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const probe = runHeaderRows(header, 'old2', { items, currentRoot: '/p', metadata });
        const rendered = JSON.stringify(probe.rows);
        assert.deepStrictEqual(probe.conversationIds, ['old2']);
        assert.ok(rendered.includes('old2'));
        assert.ok(rendered.includes('old1'));
        assert.ok(rendered.includes('"type":"CodexRow"'));
        assert.ok(rendered.includes('history-row-old1'));
        assert.ok(rendered.includes('history-actions-old1'));
        assert.ok(rendered.includes('flex w-full items-center justify-between'));
        assert.ok(!rendered.includes('other'));
        assert.ok(!probe.filteredItemIds.includes('extra0'));
        assert.ok(probe.filteredItemIds.includes('extra129'));
        assert.strictEqual(probe.filteredItemIds.length, 121);
      },
    },
    {
      name: 'shows archived local group conversations as ungrouped in header rows',
      run() {
        const target = createTarget();
        const key = JSON.stringify(['/p', '归档组']);
        const metadata = {
          version: 1,
          archivedGroups: { [key]: { projectRoot: '/p', group: '归档组', archivedAtMs: 1000 } },
          conversations: {
            old1: { title: '旧会话1', group: '归档组', projectRoot: '/p', updatedAtMs: 100 },
          },
        };
        const items = [{
          kind: 'local',
          key: 'old1',
          conversation: { id: 'old1', title: '旧会话1', cwd: '/p', createdAt: 1, updatedAt: 1 },
        }];
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const probe = runHeaderRows(header, 'old1', { items, currentRoot: '/p', metadata });
        const rendered = JSON.stringify(probe.rows);
        assert.ok(rendered.includes('未分组'));
        assert.ok(!rendered.includes('归档组'));
      },
    },
    {
      name: 'assigns pending group to new conversation from child or missing project root',
      run() {
        const startedAtMs = Date.now() - 1000;
        const target = createTarget();
        const metadata = {
          version: 1,
          pendingGroup: { projectRoot: '/p', group: '需求A', startedAtMs },
          conversations: {},
        };
        const childItems = [{
          kind: 'local',
          key: 'child',
          conversation: { id: 'child', title: '子目录会话', cwd: '/p/sub', createdAt: startedAtMs, updatedAt: startedAtMs },
        }];
        const missingItems = [{
          kind: 'local',
          key: 'missing',
          conversation: { id: 'missing', title: '无目录会话', createdAt: startedAtMs / 1000, updatedAt: startedAtMs },
        }];
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        const header = plan.changes.find((change) => change.path === target.headerPath).nextText;
        const childProbe = runHeaderRows(header, 'child', { items: childItems, includeStorage: true, metadata });
        const childStored = JSON.parse(childProbe.storage['codex-local-groups-meta-v1']);
        assert.ok(JSON.stringify(childProbe.rows).includes('需求A'));
        assert.strictEqual(childStored.conversations.child.group, '需求A');
        assert.strictEqual(childStored.conversations.child.projectRoot, '/p/sub');
        assert.strictEqual(childStored.pendingGroup, undefined);
        const missingProbe = runHeaderRows(header, 'missing', { items: missingItems, includeStorage: true, metadata });
        const missingStored = JSON.parse(missingProbe.storage['codex-local-groups-meta-v1']);
        assert.ok(JSON.stringify(missingProbe.rows).includes('需求A'));
        assert.strictEqual(missingStored.conversations.missing.group, '需求A');
        assert.strictEqual(missingStored.conversations.missing.projectRoot, '/p');
        assert.strictEqual(missingStored.pendingGroup, undefined);
      },
    },
    {
      name: 'removes extension-host navigator checks that break VS Code Node 24',
      run() {
        const target = createTarget();
        fs.appendFileSync(target.extensionJsPath, 'if(typeof navigator<"u"&&navigator?.userAgent?.includes("Cloudflare"))throw new Error("bad");if(typeof navigator<"u"&&navigator.userAgent)throw new Error("bad");');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        assert.ok(change);
        assert.ok(!change.nextText.includes('typeof navigator<"u"&&navigator'));
      },
    },
    {
      name: 'does not rewrite patched webview bundles when metadata changes',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const firstPlan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of firstPlan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }

        const metadata = {
          version: 1,
          updatedAtMs: 200,
          conversations: {
            abc: { title: '更新后标题', group: '更新后分组', projectRoot: '/p', updatedAtMs: 200 },
          },
        };
        const plan = engine.plan(target, metadata);
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(!plan.changes.some((change) => change.path === target.headerPath));
        assert.ok(!plan.changes.some((change) => change.path === target.appMainPath));
        assert.ok(!plan.changes.some((change) => change.path === target.localTitlePath));
      },
    },
    {
      name: 'routes webview prompt actions to extension host input boxes',
      async run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const extension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const start = extension.indexOf('var Dle=require("path"),codexLocalGroupsFs=');
        const end = extension.indexOf('$t();', start) + '$t();'.length;
        const script = path.join(target.extensionDir, 'extension-host-helper-smoke.js');
        fs.writeFileSync(script, extensionHostSmokeScript(extension.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'prefers file metadata when webview localStorage is older',
      run() {
        const target = createTarget();
        const metadata = { version: 1, updatedAtMs: 200, conversations: { abc: { title: '文件标题', group: '文件分组', projectRoot: '/p', updatedAtMs: 200 } } };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const header = fs.readFileSync(target.headerPath, 'utf8');
        const start = header.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = header.indexOf('function codexRecentTaskProjectRows', start);
        const script = path.join(target.extensionDir, 'header-merge-smoke.js');
        fs.writeFileSync(script, headerMergeSmokeScript(header.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'uses newer conversation metadata per conversation',
      run() {
        const target = createTarget();
        const metadata = {
          version: 1,
          updatedAtMs: 200,
          conversations: {
            fileNew: { title: '文件新标题', group: '文件新分组', projectRoot: '/p', updatedAtMs: 300 },
            localNew: { title: '文件旧标题', group: '文件旧分组', projectRoot: '/p', updatedAtMs: 100 },
          },
        };
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, metadata);
        for (const change of plan.changes) {
          fs.writeFileSync(change.path, change.nextText);
        }
        const header = fs.readFileSync(target.headerPath, 'utf8');
        const start = header.indexOf('function Ke(e){return e.kind===`remote`}');
        const end = header.indexOf('function codexRecentTaskProjectRows', start);
        const script = path.join(target.extensionDir, 'header-merge-newer-smoke.js');
        fs.writeFileSync(script, headerMergeNewerSmokeScript(header.slice(start, end)));
        const result = childProcess.spawnSync(resolveNodePath(), [script], { encoding: 'utf8' });
        assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
      },
    },
    {
      name: 'apply creates unique backups and stays idempotent',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const first = engine.apply(target, { version: 1, conversations: { a: { title: 'A' } } });
        assert.deepStrictEqual(first.errors, []);
        assert.strictEqual(first.idempotent, true);
        const second = engine.apply(target, { version: 1, conversations: { a: { title: 'B' } } });
        assert.deepStrictEqual(second.errors, []);
        assert.strictEqual(second.idempotent, true);
        const backups = [...first.backups, ...second.backups];
        assert.strictEqual(new Set(backups).size, backups.length);
        for (const backup of backups) {
          assert.ok(fs.existsSync(backup));
        }
        const third = engine.apply(target, { version: 1, conversations: { a: { title: 'B' } } });
        assert.deepStrictEqual(third.errors, []);
        assert.strictEqual(third.changes.length, 0);
      },
    },
    {
      name: 'restores clean backups even when newer backups are already patched',
      run() {
        const target = createTarget();
        fs.writeFileSync(target.sidebarPath, 'b=t(x,({get:e})=>e(d)??s),');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        engine.apply(target, { version: 1, conversations: { a: { title: 'A' } } });
        engine.apply(target, { version: 1, conversations: { a: { title: 'B' } } });
        assert.ok(fs.readFileSync(target.sidebarPath, 'utf8').includes('t===`recent`?s:t'));
        const unsafeBackup = path.join(target.extensionDir, '.codex-patches', `${path.basename(target.sidebarPath)}.before-codex-local-groups-99999999999999999-1.bak`);
        fs.writeFileSync(unsafeBackup, fs.readFileSync(target.sidebarPath));

        const restored = engine.restoreCleanBundles(target);

        assert.ok(restored.some((item) => item.path === target.extensionJsPath));
        assert.ok(restored.some((item) => item.path === target.sidebarPath));
        assert.ok(fs.readFileSync(target.sidebarPath, 'utf8').includes('e(d)??s'));
        assert.ok(!fs.readFileSync(target.sidebarPath, 'utf8').includes('t===`recent`?s:t'));
        for (const item of restored) {
          assert.strictEqual(fs.readFileSync(item.path, 'utf8').includes('codexLocalGroups'), false, item.path);
          assert.strictEqual(fs.readFileSync(item.backupPath, 'utf8').includes('codexLocalGroups'), false, item.backupPath);
        }
        assert.notStrictEqual(restored.find((item) => item.path === target.sidebarPath).backupPath, unsafeBackup);
      },
    },
    {
      name: 'restore command writes nothing when one modified bundle lacks a clean backup',
      run() {
        const target = createTarget();
        target.appStatsigPath = path.join(path.dirname(target.appMainPath), 'app-statsig-a.js');
        const cleanExtension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const unsafeExtension = `${cleanExtension}"--disable","plugins"`;
        const unsafeHeader = `${fs.readFileSync(target.headerPath, 'utf8')}var codexLocalGroupsHeaderSafePatchVersion=5;`;
        const unsafeStatsig = 'var config={preventAllNetworkTraffic:!0};';
        fs.writeFileSync(target.extensionJsPath, unsafeExtension);
        fs.writeFileSync(target.headerPath, unsafeHeader);
        fs.writeFileSync(target.appStatsigPath, unsafeStatsig);
        const backups = path.join(target.extensionDir, '.codex-patches');
        fs.mkdirSync(backups, { recursive: true });
        fs.writeFileSync(path.join(backups, `${path.basename(target.extensionJsPath)}.before-codex-local-groups-20260725000000000-1.bak`), cleanExtension);

        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        assert.throws(() => engine.restoreCleanBundles(target), /缺少 clean backup/);
        assert.strictEqual(fs.readFileSync(target.extensionJsPath, 'utf8'), unsafeExtension);
        assert.strictEqual(fs.readFileSync(target.headerPath, 'utf8'), unsafeHeader);
        assert.strictEqual(fs.readFileSync(target.appStatsigPath, 'utf8'), unsafeStatsig);
      },
    },
    {
      name: 'restore command rolls back earlier bundles when a later restore fails',
      run() {
        const target = createTarget();
        const cleanExtension = fs.readFileSync(target.extensionJsPath, 'utf8');
        const cleanHeader = fs.readFileSync(target.headerPath, 'utf8');
        const unsafeExtension = `${cleanExtension}"--disable","plugins"`;
        const unsafeHeader = `${cleanHeader}var codexLocalGroupsHeaderSafePatchVersion=5;`;
        fs.writeFileSync(target.extensionJsPath, unsafeExtension);
        fs.writeFileSync(target.headerPath, unsafeHeader);
        const backups = path.join(target.extensionDir, '.codex-patches');
        fs.mkdirSync(backups, { recursive: true });
        fs.writeFileSync(path.join(backups, `${path.basename(target.extensionJsPath)}.before-codex-local-groups-20260725000000000-1.bak`), cleanExtension);
        fs.writeFileSync(path.join(backups, `${path.basename(target.headerPath)}.before-codex-local-groups-20260725000000000-1.bak`), cleanHeader);
        const renameSync = fs.renameSync;
        fs.renameSync = (from, to) => {
          if (to === target.headerPath && from.includes('codex-local-groups-restore-')) throw new Error('forced restore failure');
          return renameSync(from, to);
        };
        try {
          const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
          assert.throws(() => engine.restoreCleanBundles(target), /forced restore failure/);
        } finally {
          fs.renameSync = renameSync;
        }
        assert.strictEqual(fs.readFileSync(target.extensionJsPath, 'utf8'), unsafeExtension);
        assert.strictEqual(fs.readFileSync(target.headerPath, 'utf8'), unsafeHeader);
      },
    },
    {
      name: 'restore command leaves an unmodified bundle with an old backup untouched',
      run() {
        const target = createTarget();
        const cleanHeader = fs.readFileSync(target.headerPath, 'utf8');
        const unsafeHeader = `${cleanHeader}var codexLocalGroupsHeaderSafePatchVersion=5;`;
        const currentAppMain = 'var upstreamCurrentCleanBundle=1;';
        fs.writeFileSync(target.headerPath, unsafeHeader);
        fs.writeFileSync(target.appMainPath, currentAppMain);
        const backups = path.join(target.extensionDir, '.codex-patches');
        fs.mkdirSync(backups, { recursive: true });
        fs.writeFileSync(path.join(backups, `${path.basename(target.headerPath)}.before-codex-local-groups-20260725000000000-1.bak`), cleanHeader);
        fs.writeFileSync(path.join(backups, `${path.basename(target.appMainPath)}.before-codex-local-groups-20260725000000000-1.bak`), 'var upstreamOldCleanBundle=1;');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const restored = engine.restoreCleanBundles(target);
        assert.deepStrictEqual(restored.map((item) => item.path), [target.headerPath]);
        assert.strictEqual(fs.readFileSync(target.headerPath, 'utf8'), cleanHeader);
        assert.strictEqual(fs.readFileSync(target.appMainPath, 'utf8'), currentAppMain);
      },
    },
    {
      name: 'skips syntax checks when bundles are already patched',
      run() {
        const target = createTarget();
        const first = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        first.apply(target, { version: 1, conversations: {} });

        const engine = new CodexPatchEngine({ nodePath: path.join(target.extensionDir, 'missing-node') });
        const report = engine.apply(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(report.errors, []);
        assert.strictEqual(report.changes.length, 0);
        assert.deepStrictEqual(report.syntax, []);
        assert.strictEqual(report.idempotent, true);
      },
    },
    {
      name: 'runs syntax checks successfully',
      run() {
        const target = createTarget();
        for (const file of [target.extensionJsPath, target.headerPath, target.appMainPath, target.appServerManagerSignalsPath, target.requestPath, target.localTitlePath, target.sidebarPath, target.sidebarProjectGroupSignalsPath]) {
          fs.writeFileSync(file, 'export{};');
        }
        fs.writeFileSync(target.extensionJsPath, 'const ok = true;\n');
        const engine = new CodexPatchEngine({ nodePath: resolveNodePath() });
        const syntax = engine.runSyntaxChecks(target);
        assert.strictEqual(syntax.length, 8);
      },
    },
    {
      name: 'accepts syntax checks that exit zero with a spawn warning',
      run() {
        const target = createTarget();
        for (const file of [target.extensionJsPath, target.headerPath, target.appMainPath, target.appServerManagerSignalsPath, target.requestPath, target.localTitlePath, target.sidebarPath, target.sidebarProjectGroupSignalsPath]) {
          fs.writeFileSync(file, 'export{};');
        }
        fs.writeFileSync(target.extensionJsPath, 'const ok = true;\n');
        const originalSpawnSync = childProcess.spawnSync;
        childProcess.spawnSync = () => ({ status: 0, error: new Error('spawnSync node EPERM'), stderr: '' });
        try {
          const syntax = new CodexPatchEngine({ nodePath: process.execPath }).runSyntaxChecks(target);
          assert.strictEqual(syntax.length, 8);
        } finally {
          childProcess.spawnSync = originalSpawnSync;
        }
      },
    },

    {
      name: 'restores changed files when syntax check command is unavailable',
      run() {
        const target = createTarget();
        const before = fs.readFileSync(target.headerPath, 'utf8');
        const engine = new CodexPatchEngine({ nodePath: path.join(target.extensionDir, 'missing-node') });
        assert.throws(() => engine.apply(target, { version: 1, conversations: {} }), /Node 不存在/);
        assert.strictEqual(fs.readFileSync(target.headerPath, 'utf8'), before);
      },
    },
    {
      name: 'uses discovered execution target bundle and vscode messenger alias',
      run() {
        const target = createTarget();
        const assets = path.dirname(target.headerPath);
        fs.writeFileSync(path.join(assets, 'use-webview-execution-target-newhash.js'), 'export{};');
        fs.writeFileSync(target.headerPath, headerNeedsBasePatchText);
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        const headerChange = plan.changes.find((change) => change.path === target.headerPath);
        assert.ok(headerChange.nextText.includes('./use-webview-execution-target-newhash.js'));
        assert.ok(headerChange.nextText.includes('var codexLocalGroupsMessenger=customMessenger;'));
        assert.ok(headerChange.nextText.includes('codexLocalGroupsMessenger.dispatchMessage'));
      },
    },
    {
      name: 'keeps enhancement active without running silent patch from Codex host',
      run() {
        const target = createTarget();
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        const change = plan.changes.find((item) => item.path === target.extensionJsPath);
        const start = change.nextText.indexOf('var Dle=require("path"),codexLocalGroupsFs=');
        const end = change.nextText.indexOf('$t();', start) + '$t();'.length;
        const script = extensionHostMissingSilentCommandScript(change.nextText.slice(start, end));
        childProcess.execFileSync(resolveNodePath(), ['-e', script], { encoding: 'utf8' });
      },
    },
    {
      name: 'stops without writing when upstream bundle anchors are unsupported',
      run() {
        const target = createTarget();
        const beforeAppMain = fs.readFileSync(target.appMainPath, 'utf8');
        fs.writeFileSync(target.appMainPath, beforeAppMain.replace('id:`rename-thread`', 'id:`upstream-renamed`'));
        const unsupportedAppMain = fs.readFileSync(target.appMainPath, 'utf8');
        const engine = new CodexPatchEngine({ nodePath: process.execPath, skipSyntaxCheck: true });
        const plan = engine.plan(target, { version: 1, conversations: {} });
        assert.deepStrictEqual(plan.errors, []);
        assert.ok(!plan.changes.some((change) => change.path === target.appMainPath && change.nextText.includes('codex-local-title')));
        const appMainChange = plan.changes.find((change) => change.path === target.appMainPath);
        if (appMainChange) {
          assert.ok(!appMainChange.nextText.includes('id:`codex-local-title`'));
          assert.ok(!appMainChange.nextText.includes('id:`codex-local-group`'));
        }
      },
    },
  ],
};

function extensionHostSmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

(async () => {
  let inputValue = '本地新标题';
  let quickPickMode = 'new';
  const quickPickLabels = [];
  const files = { '/root/.codex/codex-vscode-conversation-meta.json': '{"version":1,"conversations":{"abc":{"title":"旧标题","group":"旧分组","projectRoot":"/p"},"def":{"group":" 旧分组　","projectRoot":"/p"}}}' };
  const posted = [];
  const commands = [];
  const inputTitles = [];
  const infos = [];
  const warnings = [];
  const fsMock = {
    readFileSync(file) { if (!Object.prototype.hasOwnProperty.call(files, file)) throw new Error('ENOENT'); return files[file]; },
    writeFileSync(file, data) { files[file] = String(data); },
    mkdirSync() {},
    openSync() { return 1; },
    fsyncSync() {},
    closeSync() {},
    renameSync(from, to) { files[to] = files[from]; delete files[from]; },
  };
  const vscodeMock = {
    window: {
      showInputBox(options) {
        inputTitles.push(options.title);
        return Promise.resolve(options.ignoreFocusOut === true ? inputValue : undefined);
      },
      showQuickPick(items, options) {
        quickPickLabels.push(items.map((item) => item.label));
        if (options.ignoreFocusOut !== true) return Promise.resolve(undefined);
        if (quickPickMode === 'existing') return Promise.resolve(items.find((item) => item.group === '旧分组'));
        if (quickPickMode === 'clear') return Promise.resolve(items.find((item) => item.action === 'clear'));
        return Promise.resolve(items.find((item) => item.action === 'new'));
      },
      showInformationMessage(message) { infos.push(message); return Promise.resolve(); },
      showWarningMessage(message) { warnings.push(message); return Promise.resolve(); },
    },
    commands: {
      executeCommand(command) {
        commands.push(command);
        if (command === 'codexLocalGroups.applyPatchesSilent') return Promise.reject(new Error('missing silent patch'));
        return Promise.resolve();
      }
    },
  };
  const context = {
    require(name) { return name === 'fs' ? fsMock : name === 'vscode' ? vscodeMock : require(name); },
    console: { warn() {}, error: console.error, log: console.log },
    process: { pid: 123 },
    setTimeout(callback) { callback(); return 1; },
    $g() {},
    $t() {},
  };
  vm.createContext(context);
  vm.runInContext(${JSON.stringify(helper)}, context);
  assert.strictEqual(context.codexLocalGroupsHandleWebviewMessage(
    { type: 'codex-local-groups', action: 'getMetadata' },
    { postMessage(message) { posted.push(message); return Promise.resolve(true); } }
  ), true);
  assert.strictEqual(posted[0].action, 'metadataSaved');
  assert.strictEqual(posted[0].metadata.conversations.abc.title, '旧标题');
  posted.length = 0;
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationTitle', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.title, '本地新标题');
  assert.strictEqual(posted[0].type, 'codex-local-groups');
  assert.strictEqual(posted[0].action, 'metadataSaved');
  assert.strictEqual(posted[0].metadata.conversations.abc.title, '本地新标题');
  await Promise.resolve();
  assert.ok(infos.includes('Codex Local Groups: 已保存。'));
  assert.strictEqual(warnings.length, 0);
  assert.strictEqual(commands.filter((command) => command === 'codexLocalGroups.applyPatchesSilent').length, 0);
  inputValue = '需求B';
  assert.strictEqual(context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }), false);
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.group, '需求B');
  assert.strictEqual(posted[1].metadata.conversations.abc.group, '需求B');
  assert.strictEqual(commands.filter((command) => command === 'codexLocalGroups.applyPatchesSilent').length, 0);
  assert.ok(quickPickLabels[0].includes('旧分组'));
  assert.strictEqual(quickPickLabels[0].filter((label) => label === '旧分组').length, 1);
  quickPickMode = 'existing';
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.group, '旧分组');
  quickPickMode = 'clear';
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptConversationGroup', conversationId: 'abc', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  assert.strictEqual(JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']).conversations.abc.group, undefined);
  inputValue = '需求C';
  context.codexLocalGroupsHandleWebviewMessage({ type: 'codex-local-groups', action: 'promptNewGroup', projectRoot: '/p' }, { postMessage(message) { posted.push(message); return Promise.resolve(true); } });
  await Promise.resolve();
  const metadata = JSON.parse(files['/root/.codex/codex-vscode-conversation-meta.json']);
  const lastPost = posted[posted.length - 1];
  assert.strictEqual(lastPost.type, 'codex-local-groups');
  assert.strictEqual(lastPost.action, 'metadataSaved');
  assert.strictEqual(lastPost.metadata.pendingGroup.projectRoot, '/p');
  assert.strictEqual(lastPost.metadata.pendingGroup.group, '需求C');
  assert.strictEqual(lastPost.metadata.pendingGroup.startedAtMs, metadata.pendingGroup.startedAtMs);
  assert.ok(commands.includes('chatgpt.newChat'));
  assert.strictEqual(commands.filter((command) => command === 'codexLocalGroups.applyPatchesSilent').length, 0);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function run26721HeaderRows(header, items, currentRoot = '/xixian', options = {}) {
  const znStart = header.indexOf('function zn(e){');
  const znEnd = header.indexOf('const recentMenuHeight=', znStart);
  const helperStart = header.indexOf('function Bn(e){return e.kind===`remote`}');
  const helperEnd = header.indexOf('function Vn', helperStart);
  let znText = header.slice(znStart, znEnd);
  if (options.activeId) znText = znText.replace('w=null,b=null,i=null', `w=null,b=${JSON.stringify(options.activeId)},i=null`);
  const script = `
const vm=require('vm'),storage=${JSON.stringify(options.storage || {})},listeners={};let stateUpdates=0,cleanup=null;function Jn(){}function jsx(type,props,key){if(typeof type==='function'&&type.name==='codexLocalGroupsProjectRowsView')return type(props);return{type:type===Jn?'Jn':type,props,key}}
const context={Wn:{c:()=>[]},_e:()=>({}),At:()=>{},codexUseExecutionTarget:()=>({activeWorkspaceRoot:${JSON.stringify(currentRoot)},isActiveWorkspaceRootLoading:${options.rootLoading === true}}),T:()=>true,Nn:(cloud,local)=>local,Gn:{useState:()=>['',()=>{stateUpdates++}],useDeferredValue:e=>e,useEffect(effect){if(!cleanup)cleanup=effect()}},Z:{jsx,jsxs:jsx},Jn,codexLocalGroupsMessengerImport:{dispatchMessage(){},dispatchHostMessage(){}},localStorage:{getItem(key){return storage[key]??null},setItem(key,value){storage[key]=String(value)}},window:{addEventListener(type,listener){listeners[type]=listener},removeEventListener(type,listener){if(listeners[type]===listener)delete listeners[type]},dispatchEvent(event){listeners[event.type]?.()}},Event:function(type){this.type=type},setTimeout(){}};
vm.runInNewContext(${JSON.stringify(znText)},context);vm.runInNewContext(${JSON.stringify(header.slice(helperStart, helperEnd))},context);
const source=${JSON.stringify(items)};function render(){let rows=context.zn({localConversations:source,cloudtasksQuery:{data:[]}}),ids=[],projects=[];visit(rows,ids,projects);return{rows,ids,projects}}function visit(node,ids,projects){if(node==null)return;if(Array.isArray(node)){for(const item of node)visit(item,ids,projects);return}if(typeof node!=='object')return;if(node.type==='Jn'){let item=node.props.item;ids.push(item.conversation?.id??item.pendingWorktree?.id)}if(node.type==='div'&&String(node.key??'').startsWith('project-'))projects.push(node.props.children);visit(node.props?.children,ids,projects)}function findButton(node,label){if(node==null)return null;if(Array.isArray(node)){for(const item of node){let found=findButton(item,label);if(found)return found}return null}if(typeof node!=='object')return null;if(node.type==='button'&&String(node.props?.children??'').includes(label))return node;return findButton(node.props?.children,label)}
const initial=render();if(!${options.toggleMore === true})console.log(JSON.stringify(${options.includeProjects === true ? '{ids:initial.ids,projectLabels:initial.projects}' : 'initial.ids'}));else{findButton(initial.rows,'展开更多').props.onClick({preventDefault(){},stopPropagation(){}});const expanded=render();findButton(expanded.rows,'收起到最近 5 条').props.onClick({preventDefault(){},stopPropagation(){}});const collapsed=render();console.log(JSON.stringify({defaultIds:initial.ids,expandedIds:expanded.ids,collapsedIds:collapsed.ids,stateUpdates,storage}))}`;
  const result = childProcess.spawnSync(resolveNodePath(), ['-'], { input: script, encoding: 'utf8', timeout: 5000 });
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

function run26727HeaderActions(header) {
  const start = header.indexOf('function zn(e){return e.kind===`remote`}');
  const end = header.indexOf('function Bn', start);
  const script = `
const vm=require('vm'),dispatched=[],hostMessages=[],storage={};
const messenger={dispatchMessage(channel,message){dispatched.push({channel,message})},dispatchHostMessage(message){hostMessages.push(message)}};
const context={codexLocalGroupsMessengerImport:messenger,localStorage:{getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=String(value)}},window:{addEventListener(){},dispatchEvent(){}},Event:function(type){this.type=type},Date:{now:()=>123},setTimeout(){}};
vm.runInNewContext(${JSON.stringify(header.slice(start, end))},context);
context.codexLocalGroupsPromptTitle('abc','标题','/project');
context.codexLocalGroupsPromptGroup('abc','/project');
context.codexLocalGroupsStartConversationInGroup('/project','需求A');
console.log(JSON.stringify({dispatched:dispatched.filter(item=>item.message.action!=='getMetadata'),hostMessages}));`;
  const result = childProcess.spawnSync(resolveNodePath(), ['-'], { input: script, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function run265730HeaderActions(header) {
  const start = header.indexOf('function Sn(e){return e.kind===`remote`}');
  const end = header.indexOf('function Cn', start);
  const script = `
const vm=require('vm'),dispatched=[],hostMessages=[],storage={};
const messenger={dispatchMessage(channel,message){dispatched.push({channel,message})},dispatchHostMessage(message){hostMessages.push(message)}};
const context={codexLocalGroupsMessengerImport:messenger,localStorage:{getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=String(value)}},window:{addEventListener(){},dispatchEvent(){}},Event:function(type){this.type=type},Date:{now:()=>123},setTimeout(){}};
vm.runInNewContext(${JSON.stringify(header.slice(start, end))},context);
context.codexLocalGroupsPromptTitle('abc','标题','/project');
context.codexLocalGroupsPromptGroup('abc','/project');
context.codexLocalGroupsStartConversationInGroup('/project','需求A');
console.log(JSON.stringify({dispatched:dispatched.filter(item=>item.message.action!=='getMetadata'),hostMessages}));`;
  const result = childProcess.spawnSync(resolveNodePath(), ['-'], { input: script, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function runHeaderRows(header, activeId, options = {}) {
  const current265730 = header.includes('function Sn(e){return e.kind===`remote`}');
  const latest = header.includes('function Bn(e){return e.kind===`remote`}');
  const startMarker = current265730 ? 'function Sn(e){return e.kind===`remote`}' : latest ? 'function Bn(e){return e.kind===`remote`}' : 'function Ke(e){return e.kind===`remote`}';
  const endMarker = current265730 ? 'function Cn' : latest ? 'function Vn' : 'var qe=Je';
  const start = header.indexOf(startMarker);
  const end = header.indexOf(endMarker, start);
  const items = Object.prototype.hasOwnProperty.call(options, 'items') ? options.items : headerRowsItems();
  const currentRoot = Object.prototype.hasOwnProperty.call(options, 'currentRoot') ? options.currentRoot : null;
  const runtimeMetadata = options.metadata
    ? { ...options.metadata, updatedAtMs: options.metadata.updatedAtMs || Date.now() }
    : null;
  const initialStorage = { ...(options.storage || {}) };
  if (runtimeMetadata) initialStorage['codex-local-groups-meta-v1'] = JSON.stringify(runtimeMetadata);
  const script = `
const vm = require('vm');
function CodexRow() {}
function jsx(type, props, key) { return { type: type === CodexRow ? 'CodexRow' : type, props, key }; }
const storage = ${JSON.stringify(initialStorage)};
const dispatched = [];
const messenger = { dispatchMessage(channel, message) { dispatched.push({ channel, message }); }, dispatchHostMessage() {} };
const context = {
  ${latest ? '' : 'Q: { jsx, jsxs: jsx },'}
  Z: { jsx, jsxs: jsx },
  Je: 'Je',
  b: messenger,
  a: messenger,
  codexLocalGroupsMessengerImport: messenger,
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener() {}, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  setTimeout() {},
};
vm.runInNewContext(${JSON.stringify(header.slice(start, end))}, context);
const sourceItems = ${JSON.stringify(items)};
const currentRoot = ${JSON.stringify(currentRoot)};
const filteredItems = currentRoot == null ? sourceItems : context.codexRecentTaskFilter(sourceItems, currentRoot);
const filteredConversations = currentRoot == null ? null : context.codexRecentConversationFilter(sourceItems.map((item) => item.conversation), currentRoot);
const rows = context.codexRecentTaskProjectRows(filteredItems, ${JSON.stringify(activeId)}, () => {}, CodexRow);
function findButton(nodes, label) { for (const node of nodes) { if (node == null || typeof node !== 'object') continue; if (node.type === 'button' && String(node.props?.children ?? '').includes(label)) return node; let child = findButton(Array.isArray(node.props?.children) ? node.props.children : [node.props?.children], label); if (child) return child; } return null; }
let expandedRows = null, collapsedRows = null;
if (${options.toggleMore === true}) {
  findButton(rows, '展开更多').props.onClick({ preventDefault() {}, stopPropagation() {} });
  expandedRows = context.codexRecentTaskProjectRows(filteredItems, ${JSON.stringify(activeId)}, () => {}, CodexRow);
  findButton(expandedRows, '收起到最近 5 条').props.onClick({ preventDefault() {}, stopPropagation() {} });
  collapsedRows = context.codexRecentTaskProjectRows(filteredItems, ${JSON.stringify(activeId)}, () => {}, CodexRow);
}
  console.log(JSON.stringify({
    rows,
    expandedRows,
    collapsedRows,
    storage,
    dispatched,
    filteredItemIds: filteredItems.map((item) => item.conversation?.id ?? item.pendingWorktree?.id),
    conversationIds: filteredConversations == null ? null : filteredConversations.map((item) => item?.id),
  }));
`;
  const result = childProcess.spawnSync(resolveNodePath(), ['-'], { input: script, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  if (options.includeStorage) {
    return parsed;
  }
  return currentRoot == null ? parsed.rows : parsed;
}


function appServerManagerSignalsSmokeScript(text) {
  return `
const assert = require('assert');
const requests = [];
const localStorage = {
  getItem(key) {
    if (key === 'codex-local-groups-current-root-v1') return '/home/project/vscode/yuxi';
    return null;
  },
};
const D = [];
const sendRequest = (method, params) => {
  requests.push({ method, params });
  return Promise.resolve({ data: [], nextCursor: null });
};
${text}
(async () => {
  await ug({ sendRequest, recentConversationsSortKey: 'updated_at' }, { modelProviders: null });
  const store = new Eg();
  store.params = { requestClient: { sendRequest } };
  store.recentConversationSortKey = 'updated_at';
  await store.listRecentThreads({ limit: 50, cursor: null });
  assert.strictEqual(requests.length, 2);
  assert.strictEqual(requests[0].method, 'thread/list');
  assert.deepStrictEqual(requests[0].params.cwds, ['/home/project/vscode/yuxi']);
  assert.strictEqual(requests[0].params.limit, 200);
  assert.strictEqual(requests[1].method, 'thread/list');
  assert.deepStrictEqual(requests[1].params.cwds, ['/home/project/vscode/yuxi']);
  assert.strictEqual(requests[1].params.limit, 50);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function nativeHistorySmokeScript(text) {
  return `
const assert = require('assert');
const sessions = [
  { id: 'root', cwd: '/home/project/vscode/xixian' },
  { id: 'child', cwd: '/home/project/vscode/xixian/admin-service' },
  { id: 'missing' },
];
const requests = [];
const localStorage = { getItem() { return '/home/project/vscode/xixian'; } };
const te = [];
const server = {
  recentConversationsSortKey: 'updated_at',
  sendRequest(method, params) {
    requests.push(params);
    const cwd = params.cwd;
    const data = cwd ? sessions.filter((item) => cwd.includes(item.cwd)) : sessions;
    return Promise.resolve({ data, nextCursor: null });
  },
};
${text}
(async () => {
  const rows = await fFe(server, { modelProviders: null });
  assert.deepStrictEqual(rows.map((item) => item.id), ['root', 'child', 'missing']);
  const store = new Store();
  store.params = { requestClient: { ...server, getCompatibleThreadSortKey: (key) => key } };
  store.recentConversationSortKey = 'updated_at';
  const recent = await store.listRecentThreads({ limit: 50, cursor: null });
  assert.deepStrictEqual(recent.data.map((item) => item.id), ['root', 'child', 'missing']);
  for (const params of requests) {
    assert.ok(!Object.prototype.hasOwnProperty.call(params, 'cwd'));
    assert.ok(!Object.prototype.hasOwnProperty.call(params, 'cwds'));
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function projectHistoryPaginationSmokeScript(text) {
  const start = text.indexOf('var codexLocalGroupsProjectHistoryPatchVersion=4;');
  const end = text.indexOf('function e6e(', start);
  const helper = text.slice(start, end);
  return `
const assert = require('assert');
function fh(summary) { return { id: summary.conversationId, cwd: summary.cwd, updatedAt: summary.updatedAt, recencyAt: summary.recencyAt }; }
function oy(thread) { return { updatedAt: thread.updatedAt }; }
${helper}
const pages = new Map([
  [null, { data: Array.from({ length: 100 }, (_, index) => ({ id: 'other-' + index, cwd: '/xixian', updatedAt: 500 - index })), nextCursor: 'page-2' }],
  ['page-2', { data: [{ id: 'root', cwd: '/wms', updatedAt: 300 }, { id: 'child', cwd: '/wms/service', updatedAt: 299 }, { id: 'prefix', cwd: '/wms2', updatedAt: 298 }, { id: 'missing', updatedAt: 297 }], nextCursor: null }],
]);
const requests = [];
const store = {
  threadsById: new Map(),
  listRecentThreads(options) { requests.push(options); return Promise.resolve(pages.get(options.cursor)); },
  getThreadSummaryFromThread(thread) { return { conversationId: thread.id, cwd: thread.cwd, updatedAt: thread.updatedAt, recencyAt: thread.updatedAt }; },
  shouldSurfaceThreadSummary() { return true; },
};
(async () => {
  const rows = await codexLocalGroupsLoadProjectConversations(store, '/wms');
  assert.deepStrictEqual(rows.map((row) => row.id), ['root', 'child']);
  assert.strictEqual(requests.length, 2);
  assert.ok(requests.every((request) => request.limit === 100 && request.background === true));
  assert.ok(requests.every((request) => !Object.prototype.hasOwnProperty.call(request, 'cwd') && !Object.prototype.hasOwnProperty.call(request, 'cwds')));
  let calls = 0;
  await assert.rejects(
    () => codexLocalGroupsLoadProjectConversations({
      listRecentThreads() { calls += 1; return Promise.resolve({ data: [], nextCursor: 'same' }); },
      threadsById: new Map(),
      getThreadSummaryFromThread() { throw new Error('unreachable'); },
      shouldSurfaceThreadSummary() { return true; },
    }, '/wms'),
    /repeated a thread list cursor/
  );
  assert.strictEqual(calls, 2);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function appServerManagerSignalsCurrentText() {
  return 'async function bb(e,{modelProviders:t,archived:n=!1,sourceKinds:r=c,useStateDbOnly:i=!1}){let a=[],o=async s=>{let c={limit:200,cursor:s,sortKey:e.recentConversationsSortKey,modelProviders:t,sourceKinds:r,archived:n,useStateDbOnly:i},l=await e.sendRequest(`thread/list`,c);a.push(...l.data),l.nextCursor&&await o(l.nextCursor)};return await o(null),a}class Eg{async listRecentThreads({cursor:e,limit:t,useStateDbOnly:n=!1}){let r={limit:t,cursor:e,sortKey:this.params.requestClient.getCompatibleThreadSortKey(this.recentConversationSortKey),modelProviders:null,archived:!1,sourceKinds:c,useStateDbOnly:n};return this.params.requestClient.sendRequest(`thread/list`,r)}}';
}

function currentAppServerManagerSignalsSmokeScript(text) {
  return `
const assert = require('assert');
const requests = [];
const localStorage = {
  getItem(key) {
    if (key === 'codex-local-groups-current-root-v1') return '/home/project/vscode/yuxi';
    return null;
  },
};
const c = [];
const sendRequest = (method, params) => {
  requests.push({ method, params });
  return Promise.resolve({ data: [], nextCursor: null });
};
${text}
(async () => {
  await bb({ sendRequest, recentConversationsSortKey: 'updated_at' }, { modelProviders: null });
  const store = new Eg();
  store.params = { requestClient: { sendRequest, getCompatibleThreadSortKey: (sortKey) => sortKey } };
  store.recentConversationSortKey = 'updated_at';
  await store.listRecentThreads({ limit: 50, cursor: null });
  assert.strictEqual(requests.length, 2);
  assert.strictEqual(requests[0].method, 'thread/list');
  assert.deepStrictEqual(requests[0].params.cwds, ['/home/project/vscode/yuxi']);
  assert.strictEqual(requests[0].params.limit, 200);
  assert.strictEqual(requests[1].method, 'thread/list');
  assert.deepStrictEqual(requests[1].params.cwds, ['/home/project/vscode/yuxi']);
  assert.strictEqual(requests[1].params.limit, 50);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function sidebarProjectStatusSmokeScript(text) {
  return `
const assert = require('assert');
${text}
assert.strictEqual(ze({
  hasInProgressSideChat: false,
  isResponseInProgress: true,
  latestTurnHasSystemError: false,
  resumeState: 'resumed',
  threadRuntimeStatus: { type: 'idle' },
}), 'idle');
assert.strictEqual(ze({
  hasInProgressSideChat: false,
  isResponseInProgress: true,
  latestTurnHasSystemError: false,
  resumeState: 'resumed',
  threadRuntimeStatus: null,
}), 'loading');
assert.strictEqual(ze({
  hasInProgressSideChat: false,
  isResponseInProgress: false,
  latestTurnHasSystemError: false,
  resumeState: 'resumed',
  threadRuntimeStatus: { type: 'active' },
}), 'loading');
`;
}

function headerBusySmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

let scheduled;
const context = {
  b: { dispatchMessage() {}, dispatchHostMessage() {} },
  localStorage: { getItem() { return null; }, setItem() {} },
  window: { addEventListener() {}, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  setTimeout(callback) { scheduled = callback; return 1; },
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(helper)}, context);
const button = { textContent: '设置标题' };
const event = { currentTarget: button };
context.codexLocalGroupsSetBusy(event, '打开中…');
assert.strictEqual(button.textContent, '打开中…');
event.currentTarget = null;
scheduled();
assert.strictEqual(button.textContent, '设置标题');
`;
}

function headerTitleRefreshSmokeScript(header) {
  const helperStart = header.indexOf('function Ke(e){return e.kind===`remote`}');
  const helperEnd = header.indexOf('function codexRecentTaskProjectLabel', helperStart);
  const jeStart = header.indexOf('var qe=Je', helperEnd);
  const jeEnd = header.indexOf('});', jeStart) + '});'.length;
  return `
const assert = require('assert');
const vm = require('vm');

const storage = {
  'codex-local-groups-meta-v1': JSON.stringify({
    version: 1,
    updatedAtMs: 100,
    conversations: {
      abc: { title: '旧标题', group: '需求A', projectRoot: '/p', updatedAtMs: 100 }
    }
  })
};
const cache = [];
function close() {}
function jsx(type, props, key) { return { type, props, key }; }
const context = {
  Q: { jsx, jsxs: jsx },
  $: { memo(fn) { return fn; } },
  Z: { c() { return cache; } },
  J() { return { cancelPendingWorktree() {} }; },
  pe: 'pe',
  me: 'me',
  fe: 'fe',
  b: { dispatchMessage() {}, dispatchHostMessage() {} },
  codexRecentTaskDateLabel() { return '14:30'; },
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener() {}, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  Date,
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(header.slice(helperStart, helperEnd) + header.slice(jeStart, jeEnd))}, context);
const item = { kind: 'local', key: 'abc', conversation: { id: 'abc', title: '原始标题', cwd: '/p', updatedAt: 1 } };
const first = context.Je({ item, isActive: false, onClose: close });
assert.strictEqual(first.props.titleOverride.props.children, '旧标题');
context.codexLocalGroupsStoreMeta({
  version: 1,
  updatedAtMs: 300,
  conversations: {
    abc: { title: '新标题', group: '需求A', projectRoot: '/p', updatedAtMs: 300 }
  }
});
const second = context.Je({ item, isActive: false, onClose: close });
assert.strictEqual(second.props.titleOverride.props.children, '新标题');
`;
}

function headerRowsItems() {
  return [1, 2, 3, 4, 5, 6].map((index) => ({
    kind: 'local',
    key: `id${index}`,
    conversation: { id: `id${index}`, cwd: '/p', title: `会话${index}`, createdAt: index, updatedAt: index },
  }));
}


function extensionHostMissingSilentCommandScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

(async () => {
  const files = { '/root/.codex/codex-vscode-conversation-meta.json': '{"version":1,"conversations":{}}' };
  const warnings = [];
  const commands = [];
  let autoPatchAttempts = 0;
  const fsMock = {
    readFileSync(file) { if (!Object.prototype.hasOwnProperty.call(files, file)) throw new Error('ENOENT'); return files[file]; },
    writeFileSync(file, data) { files[file] = String(data); },
    mkdirSync() {},
    openSync() { return 1; },
    fsyncSync() {},
    closeSync() {},
    renameSync(from, to) { files[to] = files[from]; delete files[from]; },
  };
  const vscodeMock = {
    window: { showWarningMessage(message) { warnings.push(message); return Promise.resolve(); } },
    commands: {
      executeCommand(command) {
        commands.push(command);
        if (command === 'codexLocalGroups.applyPatchesSilent') {
          autoPatchAttempts += 1;
          return Promise.reject(new Error("command 'codexLocalGroups.applyPatchesSilent' not found"));
        }
        return Promise.resolve();
      },
    },
  };
  const context = {
    require(name) { return name === 'fs' ? fsMock : name === 'vscode' ? vscodeMock : require(name); },
    console: { warn() {}, error: console.error, log: console.log },
    process: { pid: 123 },
    setTimeout(callback) { callback(); return 0; },
    $t() {},
  };
  vm.createContext(context);
  vm.runInContext(${JSON.stringify(helper)}, context);
  const message = { type: 'codex-local-groups', action: 'newConversationInGroup', projectRoot: '/p', group: '需求A' };
  context.codexLocalGroupsHandleWebviewMessage(message);
  await Promise.resolve();
  context.codexLocalGroupsHandleWebviewMessage(message);
  await Promise.resolve();
  assert.strictEqual(autoPatchAttempts, 0);
  assert.strictEqual(warnings.length, 0);
  assert.strictEqual(commands.filter((command) => command === 'chatgpt.newChat').length, 2);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
`;
}

function headerMergeSmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

const storage = {
  'codex-local-groups-meta-v1': JSON.stringify({
    version: 1,
    updatedAtMs: 100,
    conversations: {
      abc: { title: '本地旧标题', group: '本地旧分组', projectRoot: '/p', updatedAtMs: 100 }
    }
  })
};
const requests = [];
let messageListener;
const context = {
  b: { dispatchMessage(channel, message) { requests.push({ channel, message }); }, dispatchHostMessage() {} },
  localStorage: {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener(type, listener) { if (type === 'message') messageListener = listener; }, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  Date,
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(helper)}, context);
assert.strictEqual(requests[0].message.action, 'getMetadata');
messageListener({ data: {
  type: 'codex-local-groups',
  action: 'metadataSaved',
  metadata: {
    version: 1,
    updatedAtMs: 200,
    conversations: {
      abc: { title: '文件标题', group: '文件分组', projectRoot: '/p', updatedAtMs: 200 }
    }
  }
} });
context.codexRecentTaskNormalizePath = (value) => typeof value === 'string' ? value.replace(/\\\\/g, '/').replace(/\\/+$/, '') : '';
assert.strictEqual(context.codexLocalGroupsReadMeta().conversations.abc.group, '文件分组');
assert.strictEqual(context.codexLocalGroupsDecoratedItem({ kind: 'local', conversation: { id: 'abc', title: '原始标题' }, key: 'abc' }).conversation.title, '文件标题');
Date.now = () => 1781350796000;
assert.strictEqual(context.codexLocalGroupsItemCreatedAt({ kind: 'local', conversation: { id: 'seconds', createdAt: 1781350795 } }), 1781350795000);
assert.strictEqual(context.codexLocalGroupsItemCreatedAt({ kind: 'local', conversation: { id: '019ec0c8-07f9-7b80-944e-63aa3273a37f' } }), 1781350795257);
assert.strictEqual(context.codexLocalGroupsCanUsePendingGroup({ kind: 'local', conversation: { id: '019ec0c8-07f9-7b80-944e-63aa3273a37f' } }, { startedAtMs: 1781350789497 }), true);
assert.strictEqual(context.codexLocalGroupsProjectMatches('/p/sub', '/p'), true);
assert.strictEqual(context.codexLocalGroupsProjectMatches('/p2', '/p'), false);
`;
}

function headerMergeNewerSmokeScript(helper) {
  return `
const assert = require('assert');
const vm = require('vm');

const storage = {
  'codex-local-groups-meta-v1': JSON.stringify({
    version: 1,
    updatedAtMs: 300,
    conversations: {
      fileNew: { title: '本地旧标题', group: '本地旧分组', projectRoot: '/p', updatedAtMs: 100 },
      localNew: { title: '本地新标题', group: '本地新分组', projectRoot: '/p', updatedAtMs: 300 }
    }
  })
};
const requests = [];
let messageListener;
const context = {
  b: { dispatchMessage(channel, message) { requests.push({ channel, message }); }, dispatchHostMessage() {} },
  localStorage: {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
  },
  window: { addEventListener(type, listener) { if (type === 'message') messageListener = listener; }, dispatchEvent() {} },
  Event: function Event(type) { this.type = type; },
  Date,
};
vm.createContext(context);
vm.runInContext(${JSON.stringify(helper)}, context);
assert.strictEqual(requests[0].message.action, 'getMetadata');
messageListener({ data: {
  type: 'codex-local-groups',
  action: 'metadataSaved',
  metadata: {
    version: 1,
    updatedAtMs: 200,
    conversations: {
      fileNew: { title: '文件新标题', group: '文件新分组', projectRoot: '/p', updatedAtMs: 300 },
      localNew: { title: '文件旧标题', group: '文件旧分组', projectRoot: '/p', updatedAtMs: 100 }
    }
  }
} });
const metadata = context.codexLocalGroupsReadMeta();
assert.strictEqual(metadata.conversations.fileNew.title, '文件新标题');
assert.strictEqual(metadata.conversations.fileNew.group, '文件新分组');
assert.strictEqual(metadata.conversations.localNew.title, '本地新标题');
assert.strictEqual(metadata.conversations.localNew.group, '本地新分组');
assert.strictEqual(context.codexLocalGroupsDecoratedItem({ kind: 'local', conversation: { id: 'localNew', title: '原始标题' }, key: 'localNew' }).conversation.title, '本地新标题');
`;
}
