# Design: Codex 26.5908.31748 Compatibility

## Verified artifact and topology

- VSIX：`openai-chatgpt-26.5908.31748-linux-x64.vsix`，SHA-256 `7a359b93b200e4406eb19858a48fa7e2da6ed557d3579ad8ec6b63ee4d354b45`。
- Host：`out/extension.js`。watchdog `ik`，host `Hd`，app-host `bI`，capn parser `W5`，child-process `Mke`。
- Header：`header-8aa6e5b9570e.js`。history menu `Nn`，list `Cn`，row `jn`，opened header `Bn`；Header 已自带 React `Ln`。
- Main：`app-initial-972655adec02.js`。messenger `rp/ip -> Zat`，execution target `uD/dD -> pQ`，title resolver `mWt`，settings validation `Z7e`。
- Power：`app-initial-84c784f5e305.js`。menu `p3`，slider `Slt/Dlt`，真实 picker `Ncr` 的 `it -> I8n`，history hook `sEt -> QL`。
- Server：`app-initial-c027c57a4b11.js`。store `lXt`，manager `M9t extends cJ`，summary `BYt`，timestamp `YZ`，filter `Uqt`，host sentinel `QH`，source kinds `XU`，list helper `WYt`。

## Decisions

1. 使用独立 exact-build 分支，不复用 5903 的失效压缩锚点。
2. Header 复用安全分组 helper；新锚点只绑定真实 `Cn -> I.map -> jn` 行渲染链。
3. 下拉标题由 Header 传递 `__codexLocalGroupsTitle265908:` marker，Main `mWt` 只解析该 marker；打开页使用现有 `Ln.useState/useEffect` 并在同一 effect 注销监听。
4. 项目历史从 Server `lXt.listRecentThreads` 分页读取 state DB，补齐新增的 `originators` 参数；Power `sEt` 优先调用 `listProjectConversations` 并保留 `listAllThreads` fallback。
5. Max/Ultra 在 `Ncr` 完成 `it` 构造后、`let at=Bw(it...)` 实际消费前注入；菜单和 `Z7e` 保存回读同步放行。守卫模型为 `gpt-5.6-sol`、`gpt-6-sol`、`gpt-6-astra`。
6. Host 只修改 exact `ik` watchdog 的 30 秒为 120 秒，并验证 `Hd -> new ik -> new bI({startup}) -> renderer_ready` 可达。
7. unknown/suffix/future 版本在恢复或写入前失败；不修改 multi-agent 与用户配置。

## Release gate

official clean 依次通过：精确定位、plan、apply、五 bundle 语法、external verifier、二次 plan 0。自动化覆盖 exact/suffix fail closed、标题双路径、分组动作、真实历史分页/fallback、子 agent 契约、Sol/Astra Max/Ultra 菜单及拖拽消费、watchdog 和临时目录清理。之后执行 compile、lint、全量测试和 strict OpenSpec。

## Risks

- 压缩符号再变时必须故意失败，禁止猜测性写入。
- History 新增 `originators` 参数；遗漏会使项目历史请求契约失配。
- Slider 必须在 `it` 的所有原生改写之后注入，否则 compact/expanded 会继续只到 xhigh。
- 标题刷新若误用 JSX runtime 而非 React `Ln`，会触发 error boundary。

## Validation evidence

- Official clean: plan 5, apply 5, Host/Header/Main/Power/Server/request syntax pass, external verifier pass, second plan 0.
- Repository: compile pass, lint pass, 391 tests pass, strict OpenSpec pass, `git diff --check` pass.
- Live: active Codex `26.5908.31748` and Local Groups `0.0.70`; live apply changed five bundles, retained operational restore backups, second plan 0 and external verifier pass.
- Cleanup: upgrade extraction, downloaded VSIX, packaged test VSIX and stale `/tmp/codex-patch-*` test artifacts removed. Live `.codex-patches` are intentionally retained because Restore Original Codex UI depends on them.
