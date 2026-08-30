# Design: Codex 26.5825.32147 Compatibility

## Context

Marketplace linux-x64 `26.5825.32147` 的官方 VSIX 为 `240907669` bytes，SHA-256 为 `f337c04eb940d53889c61704505ea3a62f6c547706ed5209a4316cba6edf158f`。clean bundle 包含 `header-BE8_0Va3.js`、`app-initial-DOdr0yAB.js` 和 `app-initial-DraLrsJK.js`；语义归属仍需通过真实调用链确认。

`26.5818.41705` 曾连续出现慢加载、空历史、模型菜单崩溃和宽松 verifier 假绿。本次不能从旧符号名推断新版结构，也不能把 route ready、ID 集合或字符串存在当作 UI 等价证据。

## Goals

- 精确支持 `26.5825.32147`，其他 5825 build fail closed。
- engine、verifier、fixture、runtime 使用同一真实契约。
- 一次性覆盖启动、标题、分组、历史、子 agent、Power 和安全边界。
- 测试及升级产物在成功和失败路径都自动清理。

## Non-Goals

- 不改变 `multi_agent` / `multi_agent_v2` 配置或 `canInteract` 语义。
- 不调用 Codex 原生 thread rename 接口。
- 不恢复 full-host patch、认证/网络屏蔽或无限历史读取。
- 不放宽到未验证的 5825 build、suffix 或未来版本。

## Decisions

### 0. Verified 5825 topology

- Host uses metadata parser `DY` and the unique `yP` startup watchdog. The watchdog is released only by `startup.reach -> handleStartupPhase("renderer_ready")`; a raw `ready` message is not equivalent.
- Header is `header-BE8_0Va3.js`. Its recent-row producer is `On -> Ze`, the opened-title consumer is `Ln`, and the semantic Main exports are `_pt` for the messenger and `w8` for the execution target.
- Main/Power/Subagent is `app-initial-DraLrsJK.js`; the membership/composer chain is `Mbr -> Abr -> p4 -> gMr -> uIr/EHn -> a8n`, and Power is `hEn/uEn/B$`.
- Server/History is `app-initial-DOdr0yAB.js`; the project-history chain is `zun/Vun`, raw-thread mapper `RCt`, and state-DB list producer `HCt`.

### 1. Exact-build variant

5825 使用独立 variant 和后置条件。只有 clean bundle 的唯一 producer/consumer 链全部确认后才加入白名单；preflight 发生在备份恢复和任何写入前。

### 2. Semantic bundles and scoped contracts

locator 继续按内容语义唯一定位 Header、Main/Statsig 和 Server/History，允许同文件去重，不按 Vite hash 取第一个。补丁和 verifier 都必须提取真实函数或 initializer scope，拒绝 string、nested、later-function、重复 producer 和 FakePanel decoy。

### 3. Preserve the complete Local Groups contract

新版必须同时保留：

- Host metadata 五类消息和真实 Webview watchdog/ready 链；
- 最近列表与打开页左上角的同 ID 本地标题双消费；
- 当前项目隔离、分组 5/+10/15/5、600px 滚动区及在分组中新建会话；
- state DB 项目历史分页、raw thread mapper 契约、cursor 防循环和空能力兜底；
- V1/V2 transcript、membership、composer guard 与顶部面板双消费，不改用户功能开关；
- `gpt-5.6-sol` Max/Ultra 的模型校验、supported efforts、菜单、回读和写入。

### 4. Ownership-scoped cleanup

测试运行器登记本次创建的每个路径，并在顶层 `finally` 清理。清理只接受登记路径；成功、测试失败、throw 和 no-match 都执行。任一清理错误必须令命令失败。official、patched、rollback、VSIX、npm cache、review、probe、log 和随机 helper 目录也必须纳入同一清单或命令级 trap，最终验证工作区外零新增项目产物。

### 5. Release evidence

先完成 fixture、official clean、patched clean，再修改 live。完成标准包含：plan 预期数量、apply、语法、external verifier、二次 plan 0、真实 mapper/runtime 非空行、标题/分组/子 agent/模型菜单确定性等价、启动和冷加载耗时、配置文件只读哈希，以及临时产物零新增。缺任一适用证据则保持 pending。

## Risks

- 压缩符号全量变化可能导致旧 helper 产生假阳性；用 exact scope 和负例关闭。
- Header/Main/Server 可能重新合包；使用 locator 同路径去重，禁止重复写入。
- live 安装会替换当前 Codex 版本；只在 clean 验证完成后执行，并保留可回滚的旧安装。
- 自动清理若归属判断过宽可能误删其他 `/tmp` 内容；仅删除当前运行登记路径。

## Obstacles and prevention

1. The first symbol inventory reported History `storeRequest` as `$Ct`. Official clean source proves the real unique call is `HCt(...)`; `$Ct` is only a class constructor. Exact variants MUST be derived from the real consumer scope, not a same-bundle symbol list.
2. npm on Node 24 can create `node-compile-cache` after the test child exits, outside the test runner's `finally`. Full upgrade validation MUST run through `with-upgrade-workspace`, which isolates npm artifacts and disables the Node compile cache for the child process. Shared pre-existing caches MUST NOT be deleted.
3. `yP` is disposed by the RPC startup phase `renderer_ready`, not the raw Webview `ready` branch. Startup verification MUST bind that producer/consumer chain before accepting a timeout rewrite.
4. Official Host is `Cd=class t`, and the startup capability is inside `new kI({ ... startup ... })`, not a fixture-level direct return object. Both engine and verifier MUST bind that exact container and reject unreachable or nested startup decoys.
5. Reviewing a single function scope is insufficient when an attacker can move the entire adjacent chunk. Membership, Power and History MUST bind their real predecessor and successor chains: `jbr -> Mbr -> Nbr`, `mEn -> hEn -> var gEn`, and `VP/zP -> RCt -> var zCt`.
6. The `_pt` export is valid only when `Zu` installs a non-empty `aSe` relay whose direct body is `Xu.dispatchMessage(e,t)`. Marker/idempotent paths MUST repeat this semantic validation.
7. The first review also found an unbound `canInteract` filter and a non-model-scoped Sol menu guard. Both are release-blocking: `yMr` remains native, while Max/Ultra additions are limited to `gpt-5.6-sol`.
8. Normal tests MUST NOT depend on downloaded official artifacts. Official-package validation belongs to the ownership-scoped upgrade workspace so a final cleanup can remove the entire download tree without breaking `npm test`.
