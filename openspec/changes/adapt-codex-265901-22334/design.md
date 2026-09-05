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
4. 2026-09-05 用户确认将拖拽条纳入适配，取代原“仅 Sol 菜单、滑块不变”约束。仅对当前可用的 `gpt-5.6-sol` / `gpt-6-astra` 补齐 Max/Ultra：菜单、紧凑/展开滑块及 Main 保存值校验必须一致。保留原生低档位、其他模型、鼠标/键盘/重置及设置读取、写入和回读链；禁止用修改全局偏好或用户配置代替补丁。
5. transcript producer、Main membership store、Power 顶部 composer 和 lazy transcript consumer 分别验证，不能以任一消费者代替另一消费者。
6. Host watchdog 仅在 exact `GI` 类中将 30 秒改为 120 秒，并验证 `Dd -> new tI({startup}) -> handleStartupPhase("renderer_ready")` 可达链。
7. `/local/:id` 标题 refresh 必须在 `Bn` 使用 `Ln.useState/useEffect`，并在同一 effect 配对注销 listener。`$` 只能用于 JSX；不得把 JSX runtime 当作 hooks runtime。
8. 5901 的 `$T/yMt` 行解析器已改为原生标题优先，旧版非字符串 `titleOverride` 会被忽略。Header 只传递唯一的 Local Groups 字符串标记，`yMt` 只识别并剥离该标记后返回本地标题；普通 `titleOverride` 和原生标题优先级保持不变。marker 的 payload 必须来自 `codexLocalGroupsDecoratedItem()`，且项目 row helper 必须把 decorator 结果传入原生 row；这条 producer/use 链与 Header/Main resolver 一并 fail closed。decorator 与 row function declaration 按 top-level、唯一、code-aware 契约检查，不能被同名 duplicate/later/nested decoy 满足。

## Non-Goals

- 不修改 `multi_agent`、`multi_agent_v2`、`canInteract`、provider/model/reasoning 用户配置。
- 不扩大到其他 5901 build、suffix 或未来版本。
- 不修改 Codex 配置、不顺带重构旧 variant。

## Release gate

official clean 必须依次通过：精确定位、plan、apply、语法检查、external verifier、二次 plan 0。自动化必须覆盖 exact/suffix fail closed、双标题、真实 history request 与分页/fallback、独立子 agent 消费链、Sol/Astra Max/Ultra 菜单与真实滑块消费、原生 settings 和 exact watchdog。之后再执行全量 compile/lint/test、strict OpenSpec 与独立 review。

## 2026-09-05 Power 档位遗漏：原因与防复发

- 现象：Sol 和 Astra 的本地模型目录均包含 `max` / `ultra`，实际拖拽条却最高只到 Extra High。
- Main 的 `IT -> fZe -> nZe` 不直接透传目录：默认 `enabled-reasoning-efforts` 不含 Max，Ultra 还受功能开关过滤。Power 的 `JNn` 默认预设不含 Max，Ultra 另有开关；当前模型路径 `ZNn` 使用的是已经过滤的目录。
- 旧 `patchCodexPower265901()` 只给 Sol 的 `i3` 菜单补档，没有补 `CKn` 传给 `pIn` 的滑块数组；Astra 也不在旧菜单和保存值校验的补丁范围。只验证菜单字符串和原生 slider 未改变，会把“菜单有档位、拖拽没有”当作通过。
- 修复边界：在版本限定的真实当前模型消费链补档，保证 Max 在 Ultra 前、无重复、选择后模型 ID 与 effort 不变；不修改 `nZe` 的全局功能开关、用户偏好、`config.toml` 或模型目录，不凭空增加不可用模型。
- 下次升级必须分别追踪原始模型目录、过滤后目录、菜单、紧凑/展开滑块、选中回调和保存回读。自动化需执行真实消费片段并传入“目录被过滤到 xhigh”的输入；仅有 marker、菜单文字或静态数组不算通过。任一消费者缺失、迁移不完整或出现死代码 decoy 时，plan/apply/verifier 必须失败。
- Ultra 会启用模型本身的自动任务委派语义；安装补丁只提供选择入口，不替用户选择 Ultra，也不切换 V1/V2 配置。
- 实施时首轮 official clean plan 被拦截：通用顶层函数扫描器在真实大 bundle 上未正确提取 `CKn/i3`，且 fixture 将真实不相邻的 props 当作相邻字符串。应按精确函数签名和 code-depth 分别绑定 `Ge=pIn` 输入及最终 `uKn` 输出，并用 official clean 校对，不能放宽门禁迎合 fixture。
- 独立 review 又发现“最后一个引用”不等于实际消费：真实 CKn return 后追加不可达的 `tn = ...uKn(...)`，可欺骗旧校验。必须绑定同一实际 return 表达式的最终渲染，而不是 `includes` 或简单位置顺序；clean、v1 迁移和 v2 verifier 都要拒绝此类 decoy。
- Marker 必须逐版本计数：完成迁移后 v2 恰好一次、v1 为零；混合 v1/v2 和重复 v2 都属于损坏状态，不能把“含新 marker”当作完整迁移。Astra 的过滤目录及缺失目标模型必须有持久回归，不能以 Sol 测试或一次性外部 probe 代替。

## Risks

- 压缩符号或 bundle 边界再次变化时 exact anchors 会故意失败；不得用宽泛字符串搜索绕过。
- Power hook 与 Server store 跨 bundle，任一侧缺失都会使项目历史不可用；verifier 必须同时验证两侧。
- Lazy transcript bundle 当前不修改，只验证其真实消费链。上游改变该 bundle 时应 fail closed 并重新取证。
- 初次 live Reload 暴露 `Bn` 错误边界：注入误用了 `$` hooks，clean-plan、语法和静态 verifier 都未捕获。修复后必须用 `$` 仅含 JSX、`Ln` 才含 hooks 的执行级回归验证，并重新进行 fresh clean 与 live Repair；不得仅替换 marker。
- 下拉标题不能只检查 Header 是否读取 metadata：5901 必须同时验证 decorator producer、项目 row helper、Header 标记输出和 Main `$T/yMt` 标记解析。若缺任一侧，必须 fail closed，避免再次出现“打开页正确、下拉仍为原生标题”。
- 两轮 review 修复后发现 row helper 内的 consumer 仍为局部 `includes`；当前 exact 5901 source 和执行级回归正确，但未来还应绑定 `u.map` 的真实渲染 callback，避免未调用 nested function 的 use-string decoy。受“最多两轮修复”限制，本次只记录为下一次升级前必须完成的门禁，不再扩大当前 live 修复。
