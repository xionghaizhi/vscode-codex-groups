# Design: Codex 26.5903.61454 Compatibility

## Verified artifact and topology

- VSIX：`openai.chatgpt-26.5903.61454-linux-x64.vsix`，SHA-256 `3b38f21c65e0a2f35e5f47efc0ace8405a46ea2bc90abbb0b10f995c292a0d8c`。
- 现有 locator 已能唯一命中五 bundle，无需改谓词。
- Host：`out/extension.js`。watchdog `jI`，host `Nd=class t`，app-host `iI`，capn parser `p5`，child-process `hPe`。`initializeWebview -> new jI -> registerClientCoordinationForWebview -> createClientCoordinationSession -> registerAppHostSessionForWebview -> startup:{reach:a=>o.handleStartupPhase(a)}`，`handleStartupPhase(e){e==="renderer_ready"&&this.dispose()}`。原生 timeout `3e4`。
- Header：`header-31d7d84f9363.js`。history `Fn` / `{data:d}=ut()`，list `Tn` / `let E=r.filter(T),D=yn(n.data,r,ee)`，rows `Nn` / `P`（Main `HE`/`JFt`），opened `Hn`。JSX：rows 用 `Z`，opened 用 `$`。rows React 为 `jn`；opened 所在 Yn 模块必须补 `Ln=t(T(),1)`，不得用 `$` hooks。
- Main：`app-initial-1338e8d6a2c6.js`。messenger `$d/ef -> grt`，execution target `sE/cE -> aX`。标题解析器 `YFt` 仍原生优先。校验 `t0e`。row 组件 `JFt as HE`。
- Power：`app-initial-651b098e975e.js`。菜单 `U4`，slider 生成 `Alt`/`Flt`，实际消费 `S0n` 的 `qe` -> `rGn({powerSelectionsWithXHigh:qe})`。历史 hook 入口 `qct -> Jct(\`recent-conversations\`)`，导出 `eV`。
- Server/History：`app-initial-3ec16fef3ca9.js`。store `pWt`，manager `M2t extends SH`，`listRecentThreads` filter `rHt`，summary `QUt`，timestamps `xG`，host sentinel `QL`，sourceKinds `KR`，list helper `nWt`。helper 锚点 `var CG=t((()=>{}));function QUt`。

## Decisions

1. 5903 使用独立 exact-build 分支和独立 OpenSpec change，不把 61454 塞进 5901 variant map。
2. Header 复用已验证的安全分组 helper；history/execTarget/filter/rows/opened-title 使用 5903 exact anchors。
3. 下拉标题：Header `Nn` 只传 `__codexLocalGroupsTitle265903:` marker；Main `YFt` 只识别该前缀后返回本地标题。普通 override 和原生标题优先级不变。decorator producer 必须进入 `codexRecentTaskProjectRows` 的真实 `u.map` 回调。
4. 打开页 `Hn` 在同一 Yn 模块内使用 `Ln.useState/useEffect`，并在同一 effect 配对注销 listener。
5. 项目历史：Server 通过真实 `listRecentThreads` 逐页读取 state DB，过滤根目录及其子目录；Power `qct` 优先 `listProjectConversations`，保留 `listAllThreads` fallback。无参调用保持原生 `Jct`。
6. Sol/Astra Max/Ultra：菜单改 `U4`；滑块在 `S0n` 把 `qe` 交给 `rGn` 之前插入，保证 compact/expanded 同一数组。保存回读改 `t0e`。不改 `config.toml`、模型目录或 multi-agent。
7. Host watchdog 仅在 exact `jI` 将 30 秒改为 120 秒，并验证 `Nd -> new jI -> new iI({startup}) -> renderer_ready` 可达链。
8. unknown/suffix/未来 minor 在 plan 前 fail closed，零写入。5901 行为保持不变。

## Non-Goals

- 不修改 `multi_agent`、`multi_agent_v2`、`canInteract`、provider/model/reasoning 用户配置。
- 不扩大到其他 5903 build、suffix 或未来版本。
- 不修改 Codex 配置、不顺带重构旧 variant。
- 不为 5903 伪造不存在的旧符号通过。

## Release gate

official clean 必须依次通过：精确定位、plan、apply、语法检查、external verifier、二次 plan 0。自动化必须覆盖 exact/suffix fail closed、双标题、真实 history request 与分页/fallback、Sol/Astra Max/Ultra 菜单与真实滑块消费、原生 settings 和 exact watchdog。之后再执行全量 compile/lint/test。

## Risks

- 压缩符号再变时 exact anchors 必须故意失败。
- Power hook 与 Server store 跨 bundle，任一侧缺失都会使项目历史不可用。
- `Hn` 若误用 `$` hooks 会重现 5901 opened-title error boundary。
- `S0n` 后续不可达 decoy 不能当作 slider 消费；必须绑定 `let Je=xD(qe` 之前的实际 `qe` 与 `rGn({powerSelectionsWithXHigh:qe})`。
