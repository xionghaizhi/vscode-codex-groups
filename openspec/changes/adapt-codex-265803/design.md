# 设计：Codex 26.5803.41515 兼容

## 已确认上游变化

| 职责 | 新 bundle / 语义 | 变化 |
| --- | --- | --- |
| Header | `header-3dYZcpGE.js` | Recent 分支仍由 `Sn`/`An` 组成，但新增 Cloud/Local/Recent 过滤，row 增加 `hostId`，cache 槽位变化。 |
| app main | `app-initial-D-Ftjleg.js` | messenger 为 `$1 -> pu`，execution target 为 `LV -> cC()`，模型校验为 `tBe()`。 |
| App Server / Power | `app-initial-CF-0nv_7.js` | 项目 Hook 为 `_Xe/vXe`，Power 为 `POt/ROt/zZ`。 |
| Extension Host | `out/extension.js` | direct callback 仍为 `handleMessage(e,c)`；固定 30 秒看门狗仍存在。 |

## 实现边界

1. locator 无需扩大 predicate；新增真实新版分包回归即可。
2. 仅明确放行 `26.5803`，未知 minor 继续 fail closed。
3. Header 复用语义 messenger/execution-target 导入和 `safeHeaderHelper()`，只适配新版 parent、Recent rows、row cache 和菜单锚点。
4. 项目历史继续独立分页，worker manager 使用 `listRecentThreads()`；代理 manager 仅在存在 `listAllThreads()` 时回退并严格过滤 root。
5. Power/Reasoning 只为 `gpt-5.6-sol` 增加 Max/Ultra，其他模型不扩档；不注入已消失的旧子 agent feature gate。
6. Extension Host 继续保留 `onTimeout()`，仅把已确认版本的 `30s` 精确改为 `120s`。
7. 任一锚点缺失、不唯一或后置条件不完整时停止写入。

## 本次新增防回归结论

1. messenger 导出 `$1` 必须通过 `String.replace()` callback 写入。若把 `$1 as codexLocalGroupsMessengerImport` 作为 replacement string，`$1` 会被解释为捕获组，二次 plan 将生成非法 import。
2. 新版本地 row 同时缓存 `hostId`、conversation id 和标题；必须把 cache 从 24 槽扩为 25 槽，标题使用新增的 `t[24]`，不能复制 26.5730 的槽位。
3. 三个 metadata 入口必须执行 helper 行为回归，断言 `promptConversationTitle`、`promptConversationGroup`、`setPendingGroup` 和 `new-chat`；marker 和 import 字符串只能作为补充门禁。

## 启动耗时根因边界

- `120s` 只改变 Extension Host 在何时判定启动失败，不会等待 120 秒，也不会缩短 Webview 自身 route mount。
- 旧 `61,906ms` 是 26.5730 从 `React root render requested` 到 `app routes mounted` 的真实上游耗时；ready 在 route mount 后立即到达。
- clean 26.5803 当前为 `34,566ms`，ready 再晚约 20ms。主要等待仍在上游 Webview 资源加载、bundle 求值和 React route mount 阶段，早于 Local Groups 项目历史查询和分组交互。
- 不通过删除上游初始化、认证、Statsig、网络或子 agent 能力缩短启动；这些属于需求外高风险改动。当前修复只避免已确认的 30 秒误杀。

## 验证门禁

- 官方 clean 副本完成 plan/apply/plan、语法和 verifier。
- live 应用后 plan 为 0，安装目录 verifier 通过。
- Reload 日志必须出现 root render、route mount 和 ready，且不能出现 Webview timeout。
- 三个 metadata 入口必须执行真实 helper 行为回归，不能只检查 marker。
