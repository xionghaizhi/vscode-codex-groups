# Design: Codex 26.5825.51511 Compatibility

## Verified official artifact

- Marketplace version：`26.5825.51511`，更新时间 `2026-08-30T01:31:19.993Z`。
- linux-x64 VSIX：`242073433` bytes；SHA-256 `557e8059809647893bf5fc86fba1515528c1611afe31d56279266c2fcde2a204`。
- Header：`header-DapYxSvQ.js`。
- Main/Power/Subagent：`app-initial-yrsrisSW.js`。
- Server/History：`app-initial-DzcK9AhZ.js`。

## Goals

- 精确支持 `26.5825.51511`，并保留 `26.5825.32147`。
- engine、verifier、fixture、runtime 和 live 安装验证使用同一契约。
- 严格执行既有 OpenSpec 全矩阵，不以页面能打开、route ready 或字符串存在替代功能验收。

## Non-Goals

- 不修改 `multi_agent`、`multi_agent_v2` 或 `canInteract`。
- 不调用 Codex 原生 thread rename。
- 不放宽到其他 5825 build、suffix 或未来版本。

## Exact-build variants

1. Host 漂移为 path alias `pRe`、metadata parser `NY`、watchdog 后继 `wCe`；真实 ready 链仍是 `Cd -> new kI({startup}) -> handleStartupPhase("renderer_ready")`。
2. Header 仍由 `bn/On/Ln` 消费，执行 target、历史 source、项目过滤和 rows 变量已漂移；Main 语义导出仍是 `_pt/w8`，内部变为 `nd/rd/id/tSe/KS`。
3. 子 agent 链变为 `Pbr -> Mbr -> p4 -> vMr -> fIr/tHn -> s8n`；必须保留 `xMr` 的 `canInteract` 与 `yMr` 的当前父 turn 过滤。
4. Power 变为 `Nwn/Own/B$`；slider 保持原生，只给 `gpt-5.6-sol` 菜单补 Max/Ultra。
5. History 变为 `Vun/Uun`、store `twt`、request `WCt`、mapper `BCt/RP`、visibility `Pdt`、title `zCt(r,FP)`；不得误用 hydration `HCt` 或 descendant helper `Mdt`。

## Mandatory release gate

严格按 OpenSpec 顺序执行：official clean fail-closed 证据；fixture/runtime/decoy；official clean plan/apply/syntax/verifier/plan 0；patched clean 全功能验收；独立 review；新 Local Groups VSIX；active registry；安装目录 engine/verifier 哈希；安装目录 compile/plan 0/verifier；Reload 后输出与受影响 UI；配置哈希不变；本次 official、patched、backup、VSIX、npm cache、probe、log 和测试临时目录全部清理。任何一项缺失不得宣称升级完成。

## Preventing repeat failures

- 不能只把 build 加入白名单；所有压缩符号和 producer/consumer 必须来自本次 official clean。
- 下拉测试必须实际执行 `codexLocalGroupsProjectRowsView`，覆盖标题、设置分组和在分组中新建会话入口。
- 子 agent 必须同时验证正文 membership 与顶部面板 consumer；不得改变用户 Multi-Agent 配置来制造通过。
- verifier 必须按 exact build 取 variant，并拒绝 nested、string、duplicate、FakePanel、错误 parser/request/visibility/title decoy。
- 测试和升级命令创建的每个临时路径必须登记，并在成功、失败、throw、no-match 路径清理；清理失败视为失败。

## Obstacles and retained lessons

1. 51511 的真实 Host 漂移不止 parser：path alias、parser 和 watchdog 后继同时变为 `pRe/NY/wCe`；仍须从 `Cd -> new kI({startup}) -> handleStartupPhase("renderer_ready")` 的可达链验证，不能只替换一个名字。
2. Main 的 settings 读取合并进 `f4e`，真实字段为 `settings.reasoning_effort`；旧 build 分离的 `g4e` 写入形态不能直接套用。以后必须执行读取、query cache 写入和 `setDefaultModelConfig`，静态字符串不足。
3. Power 变为 `Nwn/Own/B$`，但 slider 仍应保持原生；Max/Ultra 只补到 Sol Reasoning menu。测试必须同时执行 compact/expanded slider，防止为了菜单误扩大 slider。
4. History 的 `HCt` 已变成 hydration decoy；真实 `thread/list` request 是 `WCt`，并与 `twt/BCt/RP/Pdt/zCt(r,FP)` 形成完整 producer/consumer。只搜旧 request 名会产生假适配。
5. 初版 51511 tests 只覆盖 semantic Host 与 Power，且 Sol runtime 只执行 validation/menu。独立 review 暴露该缺口后，已强制增加完整 verifier 正例、title/history/subagent/Sol/Power decoy，以及 `f4e` persistence 与 `Own` slider runtime。下次不得以“旧 build 已有类似测试”替代新 build 专属覆盖。
6. 新 change 初次 strict validate 因缺少 `specs/**/spec.md` delta 失败。以后创建 OpenSpec change 时，proposal/design/tasks 与 capability delta 必须同时落地并在修改 live 前 strict validate。
7. Remote CLI 安装可能长时间无 stdout；本次仍以 `remoteagent.log` 的 extract/rename/`Extension installed successfully`、active registry 和 CLI 退出共同判定，禁止因沉默重复覆盖安装。
