# 设计：Codex 26.5818.41705 兼容

## 已确认基线

- official VSIX：`openai.chatgpt-26.5818.41705-linux-x64.vsix`，`228793737` bytes，SHA-256 `ddb771ccf0ec79cdddfa0c48a4b193e176c289749965c6555aee502de5ebda03`。
- clean locator：Header `header-DtxiyEJb.js`；Main/Statsig/Request `app-initial-DqGfhkM8.js`；Server/History `app-initial-BGrXbXCc.js`。
- 用户 config 只读基线：SHA-256 `d064a25eed2c56360ebd9a906dec04f4e58280b32fa3ee1dae932888aeef3005`，mtime_ns `1787386744925792241`。

## 精确映射

- Host：唯一 `QP` 看门狗；capn parser `oY`。
- Header：rows `N/v/i/u/An`，row `xe` 的局部字段 `r/i/a/o`，menu trigger `G`，opened `zn/Wn/In/a/o/l`；semantic imports 为 messenger `Jlt`、execution target `Z1`。
- Main：`GWn → WWn → zX(ti, export DS) → Uqr(Bc) → SZr(Cn) → yer`；filter `Kqr/Wqr`；Sol `F7e/K7e/X7e`；Power `bCn/SCn/CCn/pCn/y$/dw/J8e`。
- History：`qPn/YPn/vG/IN/bG/RPn/LPn/wdt`；timestamps `SA`、summary `bdt`、visible `ddt`、title `vM/$C/xA`。41705 的 `thread/list` 新增 `useStateDbOnly` 语义；Local Groups 项目历史分页显式传 `true`，原生调用仍保留 `hostId !== PT` 默认值。

## 门禁

engine 与 external verifier 均使用既有 minified scope/depth helper，绑定真实 producer、selector、consumer 和 panel；later/nested/string decoy 不得通过。只允许四个既有语义入口写入；apply 后必须二次 plan 为零。

41705 的新门禁必须遵守以下约束：

- `zX` 只能从唯一 `BX=e((()=>{...}))` initializer 的直接层取得。
- `GWn` 的 activity/spawn `i.set`、直接 return，`WWn` 的直接聚合调用，`yer` 的 summary 和 `SZr` 的真实 panel props 分别验证；内部 nested function 和 literal 不得补齐断裂的真实链。
- Header 的 `Jlt` / `Z1` 使用导入项边界匹配，并回绑 Main 的 `ju/ku/Au/V_e` singleton 与 `Bw` hook；相似名称不得通过。
- 项目历史必须先用唯一 `listAllThreads/listProjectConversations → listArchivedThreads` 相邻成员定位真实 Store class，再绑定该 class depth 1 的 `listRecentThreads` 参数和请求对象：Local Groups 分页每页传 `useStateDbOnly: true`；方法未显式传参时继续使用上游 `hostId !== PT`，不得全局强制 state DB。comment、template string 或 fake class 中的完整方法都不得通过。
- clean、旧 marker 原位迁移和 external verifier 都必须拒绝缺少上述任一端的补丁，防止 helper 传参被静默忽略。
- direct-depth/去 literal 只用于 41705 新 variant；不得改变 5814、31338 等旧 build 的 helper 行为。

## 性能根因与验收

- 41705 在 `useStateDbOnly=false` 时会扫描 JSONL rollout 修复 metadata。项目历史要完整分页，不能把每页扫描误当成普通数据库查询。
- 同一真实 app-server、同一数据集基准：6 页、511 个唯一会话；`false` 为 `33397ms`，`true` 为 `992ms`，会话 ID 集合完全一致。
- `app routes mounted/ready` 只证明路由启动，不能证明最近会话可用。主线程必须单独记录下拉从打开到项目行出现、spinner 结束和行可点击；无法直接驱动 UI 时，必须用相同 app-server、相同完整数据集的全分页耗时、ID 集合与生成 Header/Server 契约作为确定性等价证据。

## OpenSpec 执行与验收责任

- 修改前必须先读本 change、历史故障和升级手册的全量矩阵；不得只适配压缩符号后就进入 live。
- 用户新发现的问题必须先补 requirement、失败测试和 verifier 负例，再改实现并重跑全部适用项。
- 常规 Reload、UI、启动和性能验收由主线程负责，不把检查清单交给用户。无法取得 agent UI 或确定性等价证据时保持 blocked/pending，不能宣称完成。

## 安装约束

Remote CLI 返回可能晚于安装事务。以 `remoteagent.log` 最终成功记录、active registry、目标目录和无残留安装进程共同确认结束；Codex 安装结束后才 apply，Local Groups 安装结束后再次 plan 0/verifier。`config.toml` 前后 hash 与 mtime 必须一致。
