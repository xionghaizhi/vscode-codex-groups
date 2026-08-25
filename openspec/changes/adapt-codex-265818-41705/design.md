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
- 41705 的 `bdt` 输入是 hydration 形态 `{ thread, hostId, conversationId, turns, threadTitle, ... }`，不是 `ThreadSummary`。load 必须把原始 thread 与 summary metadata 组合后传入，fallback 必须把 `listAllThreads` 的原始 thread 传入；fixture、engine 和 verifier 都绑定真实 producer 签名及两处 consumer，禁止用接受任意对象的假 mapper 掩盖契约错误。
- 真实压缩 bundle 的全文件 brace-depth 扫描会在 `bdt` 位置得到 depth `-1`，不能据此断言 producer 不是顶层。41705 必须改用“同名 producer 仅一个 + 完整签名唯一 scope”门禁；真实 producer 漂移后追加 nested/string 假 producer仍必须拒绝。
- clean、旧 marker 原位迁移和 external verifier 都必须拒绝缺少上述任一端的补丁，防止 helper 传参被静默忽略。
- direct-depth/去 literal 只用于 41705 新 variant；不得改变 5814、31338 等旧 build 的 helper 行为。

## 性能根因与验收

- 41705 在 `useStateDbOnly=false` 时会扫描 JSONL rollout 修复 metadata。项目历史要完整分页，不能把每页扫描误当成普通数据库查询。
- 同一真实 app-server、同一数据集基准：6 页、511 个唯一会话；`false` 为 `33397ms`，`true` 为 `992ms`，会话 ID 集合完全一致。
- ID 集合一致只证明分页数据未丢失，不能证明 UI 转换成功。验收还必须执行真实 `bdt` 输入契约，断言匹配项目至少产生一条包含 `id/cwd/title` 的 conversation；mapper 抛错后被 query 层折叠为 `[]` 的结果必须判失败。
- `app routes mounted/ready` 只证明路由启动，不能证明最近会话可用。主线程必须单独记录下拉从打开到项目行出现、spinner 结束和行可点击；无法直接驱动 UI 时，必须用相同 app-server、相同完整数据集的全分页耗时、ID 集合与生成 Header/Server 契约作为确定性等价证据。
- 2026-08-24 的失败证明“全分页耗时 + ID 集合 + 生成文本”不足以替代 mapper runtime：旧 fixture 的 `bdt(e)` 错误接受 summary，真实 41705 `bdt({thread:e,...})` 会读取 `undefined.createdAt`，React Query 再把错误显示成 `No chats yet`。以后确定性等价必须覆盖真实 producer/consumer 参数和非空 UI conversation 输出。
- 最终 live runtime 再次从真实 bundle 抽取 mapper 并执行当前 app-server 数据：173 条 thread 中当前 root 匹配 16 条，产出 16 条 conversation，且保留标题、host、workspace kind 与未读状态；该门禁直接覆盖用户看到的空列表症状。

## OpenSpec 执行与验收责任

- 修改前必须先读本 change、历史故障和升级手册的全量矩阵；不得只适配压缩符号后就进入 live。
- 用户新发现的问题必须先补 requirement、失败测试和 verifier 负例，再改实现并重跑全部适用项。
- 常规 Reload、UI、启动和性能验收由主线程负责，不把检查清单交给用户。无法取得 agent UI 或确定性等价证据时保持 blocked/pending，不能宣称完成。

## 测试临时目录生命周期

- 当前 `test/test-utils.js::tempDir()` 直接调用 `fs.mkdtempSync()`，`test/run-tests.js` 没有 finally 清理；完整测试约创建 300 个目录，重复运行会持续累积。`test/scripts.test.js` 的独立 `mkdtempSync()` 和升级流程创建的 `/tmp/codex-upgrade-*` 也必须纳入同一生命周期门禁。
- 每次测试运行只能删除本次运行明确登记的目录，不得按宽泛 glob 删除既有或其他进程的 `/tmp` 内容。
- pass、断言失败、无测试匹配、异常和中断可执行清理路径都必须回收本次创建的目录；清理失败必须使测试命令失败，不能只打印 warning。
- 完整测试验收必须比较运行前后清单，证明没有新增本次 `codex-*` 临时目录。升级调研产生的 clean、extracted、patched 或诊断副本在证据写入 OpenSpec 后也必须删除，不能把 `/tmp` 路径本身当作长期证据。
- 清理范围不能只覆盖用户点名的前缀。official clean/rollback、VSIX、npm cache、review/diagnostic workspace、schema/probe、日志、PID/path 辅助文件和历史版本验证副本都必须由创建方登记并回收；验收以本次运行的所有权清单为准，不以文件名是否包含某个已知前缀为准。
- 迁移到所有权清单前，历史残件清理还必须做内容兜底：递归查找任意顶层名称下的 `openai.chatgpt-*` 副本、Local Groups `patchEngine/verifier` 和 `package.json` 名称，避免 `review-*`、`specqa-*` 或随机 `tmp.*` 名称绕过清理。内容扫描只用于确认归属，不能据此删除无匹配的其他项目目录。

## 安装约束

Remote CLI 返回可能晚于安装事务。以 `remoteagent.log` 最终成功记录、active registry、目标目录和无残留安装进程共同确认结束；Codex 安装结束后才 apply，Local Groups 安装结束后再次 plan 0/verifier。`config.toml` 前后 hash 与 mtime 必须一致。
