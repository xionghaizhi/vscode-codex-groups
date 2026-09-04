# Design: Codex 26.5901.22334 Compatibility

## Verified artifact and topology

- VSIX：`openai.chatgpt-26.5901.22334-linux-x64.vsix`，SHA-256 `cd9cd06c5bfcc8e18972587d04ac9d08b04152ebf6de426233ddc812b05933ff`。
- Host：path/parser/watchdog/provider/app-host aliases 为 `NCe/J9/GI/Dd/tI`，child-process alias 为 `HTe`。
- Header：`header-f427a7169f39.js`，history/rows/row/opened-title 为 `Nn/Cn/jn/Bn`。
- Header 的 JSX runtime 为 `$`，真实 hooks runtime 为 `Ln`；二者不可互换。
- Main：`app-initial-d8588f3b7d3f.js`，messenger 为 `Vd/Hd -> Ttt`，execution target 为 `rE/iE -> BJ`，membership 为 `eAn/Qkn/wAn -> Po`。
- Power：`app-initial-2e80ba27d368.js`，reasoning menu/slider/composer 为 `i3/JNn/$Nn/I7n/Wtr/rWn`，并从 Main 导入 `Po as Kd`。
- Server/History：`app-initial-c518b37afd45.js`，真实 request/store/mapper 为 `vUt/yVt/mUt/RG`；hydration 字符串不是项目历史注入点。
- Lazy transcript consumer：`local-conversation-subagents-panel-tab-e3e8ef5b32c6.js`。

## Decisions

1. 5901 使用独立 exact-build 分支，按五个目标 bundle 规划，不把旧 51511 单 bundle variant 扩展成模糊匹配。
2. Header 只复用已验证的安全分组 helper；执行 target、历史 hook、rows 和双标题分别使用新 exact anchors。
3. 项目历史分为 Power 查询 hook 与 Server store producer。Server 通过真实 `listRecentThreads` 逐页读取 state DB，过滤根目录及其子目录；Power 优先调用新 manager 方法，并保留 `listAllThreads` 兼容 fallback。
4. Main 只扩大 Sol 的 Max/Ultra 合法性。Power 只扩大 Sol reasoning menu；原生 `$Nn/JNn` slider、设置读取、写入和回读调用链必须保持不变。
5. transcript producer、Main membership store、Power 顶部 composer 和 lazy transcript consumer 分别验证，不能以任一消费者代替另一消费者。
6. Host watchdog 仅在 exact `GI` 类中将 30 秒改为 120 秒，并验证 `Dd -> new tI({startup}) -> handleStartupPhase("renderer_ready")` 可达链。
7. `/local/:id` 标题 refresh 必须在 `Bn` 使用 `Ln.useState/useEffect`，并在同一 effect 配对注销 listener。`$` 只能用于 JSX；不得把 JSX runtime 当作 hooks runtime。
8. 5901 的 `$T/yMt` 行解析器已改为原生标题优先，旧版非字符串 `titleOverride` 会被忽略。Header 只传递唯一的 Local Groups 字符串标记，`yMt` 只识别并剥离该标记后返回本地标题；普通 `titleOverride` 和原生标题优先级保持不变。marker 的 payload 必须来自 `codexLocalGroupsDecoratedItem()`，且项目 row helper 必须把 decorator 结果传入原生 row；这条 producer/use 链与 Header/Main resolver 一并 fail closed。decorator 与 row function declaration 按 top-level、唯一、code-aware 契约检查，不能被同名 duplicate/later/nested decoy 满足。

## Non-Goals

- 不修改 `multi_agent`、`multi_agent_v2`、`canInteract`、provider/model/reasoning 用户配置。
- 不扩大到其他 5901 build、suffix 或未来版本。
- 不修改 Codex 配置、不顺带重构旧 variant。

## Release gate

official clean 必须依次通过：精确定位、plan、apply、语法检查、external verifier、二次 plan 0。自动化必须覆盖 exact/suffix fail closed、双标题、真实 history request 与分页/fallback、独立子 agent 消费链、Sol-only Max/Ultra、原生 slider/settings 和 exact watchdog。之后再执行全量 compile/lint/test、strict OpenSpec 与独立 review。

## Risks

- 压缩符号或 bundle 边界再次变化时 exact anchors 会故意失败；不得用宽泛字符串搜索绕过。
- Power hook 与 Server store 跨 bundle，任一侧缺失都会使项目历史不可用；verifier 必须同时验证两侧。
- Lazy transcript bundle 当前不修改，只验证其真实消费链。上游改变该 bundle 时应 fail closed 并重新取证。
- 初次 live Reload 暴露 `Bn` 错误边界：注入误用了 `$` hooks，clean-plan、语法和静态 verifier 都未捕获。修复后必须用 `$` 仅含 JSX、`Ln` 才含 hooks 的执行级回归验证，并重新进行 fresh clean 与 live Repair；不得仅替换 marker。
- 下拉标题不能只检查 Header 是否读取 metadata：5901 必须同时验证 decorator producer、项目 row helper、Header 标记输出和 Main `$T/yMt` 标记解析。若缺任一侧，必须 fail closed，避免再次出现“打开页正确、下拉仍为原生标题”。
- 两轮 review 修复后发现 row helper 内的 consumer 仍为局部 `includes`；当前 exact 5901 source 和执行级回归正确，但未来还应绑定 `u.map` 的真实渲染 callback，避免未调用 nested function 的 use-string decoy。受“最多两轮修复”限制，本次只记录为下一次升级前必须完成的门禁，不再扩大当前 live 修复。
