# Tasks

- [x] 1. 校验 official VSIX/ZIP/package，记录 clean locator 与 config 只读基线。
- [x] 2. 确认 Host、Header 标题双消费、Main/Power、History、V1/V2 transcript 与 composer 的真实链路。
- [x] 3. 新增 exact-build 41705 variant，保持未知 build/minor/suffix 零规划、零恢复、零写入。
- [x] 4. 补 locator、engine、verifier 与 false-green decoy 回归。
- [x] 5. clean official 副本完成 plan 4 / apply 4 / plan 0、语法和 verifier。
- [x] 6. 完成 npm test、compile、lint、diff-check 与 OpenSpec strict。
- [x] 7. 主线程安装 live Codex/Local Groups，重新验证 plan/apply/plan 0、verifier，并核对 config 只读门禁。
- [x] 7.1 复现并修复 41705 项目历史每页重复扫描 JSONL 导致的最近会话慢加载，补旧 marker 迁移、native 默认值和 external verifier 回归。
- [x] 7.2 修复 41705 项目历史把 `ThreadSummary` 误传给真实 `bdt({thread,...})` 导致 query 失败并显示 `No chats yet`；补真实 mapper fixture、load/fallback/producer 门禁与旧 marker 迁移。
- [ ] 7.3 修复 41705 紧凑模型按钮强制展开 Max/Ultra 导致 ResizeObserver 崩溃；恢复原生 `pCn/bCn/SCn`，仅保留 `y$` 展开菜单兜底，并迁移 Power marker v1 到 v2。
- [x] 8. 主线程重新完成 agent-owned release acceptance；真实 mapper runtime 已产生非空项目 conversation，live plan/verifier、原生行输出字段与点击组件契约均通过确定性等价门禁。
- [ ] 9. 实现测试与升级工作流的全量临时产物所有权登记和 finally 强制清理，覆盖 `tempDir()`、direct `mkdtempSync()`、official/rollback/VSIX/npm-cache/review/probe/log/helper、pass/fail/no-match/throw；补运行前后零新增产物回归，禁止只清理用户点名的前缀。

## 证据

- clean apply：`changes=4`、`syntax=5`、`idempotent=true`、errors 为空；二次 plan `changes=0`。
- 41705 verifier：现已绑定真实 `bdt({thread,...})` producer、load raw thread + summary metadata 和 fallback raw thread；三类 mapper drift 负例均拒绝。
- 自动化：`npm test` exit `0`（`325 tests`）；compile、lint、`git diff --check` 与 OpenSpec strict validation 通过。
- 未知/带后缀版本：测试覆盖，且不写入。
- Review：Standards 与 Spec 最终均为 Critical 0、Important 0、Minor 0；`GWn/WWn/zX/yer` nested/string decoy 与 `AZ1` import 假阳性已关闭。
- live：Codex `26.5818.41705` 与 Local Groups `0.0.61` active，但用户实测为 `No chats yet`；`plan 0` 和旧 verifier 属于假绿，不能作为完成证据。
- config：SHA-256 `d064a25eed2c56360ebd9a906dec04f4e58280b32fa3ee1dae932888aeef3005`、mtime_ns `1787386744925792241`，前后一致。
- 慢加载复现：真实 41705 app-server 对同一 `thread/list` 数据全分页；`useStateDbOnly=false` 为 `33397ms`，`true` 为 `992ms`，均为 6 页、511 个唯一会话且 ID 集合完全一致。该证据只覆盖数据层，不覆盖 mapper/UI。
- 性能修复 clean：`/tmp/clg-41705-fast-final.uBTFC9` 完成 plan 4 / apply 4 / syntax 5 / plan 0，41705 scoped verifier 通过。
- 性能修复 live：旧 marker 原位迁移 1 个 Server/History bundle；最终 plan 0、verifier 通过，config SHA-256 不变。Reload 后 spinner 终止和行可用仍待用户确认。
- 性能修复独立 Review：首次发现 state DB method/call 可被 comment、template string 和 fake top-level class 假绿；真实 Store scope 双侧加固和负例完成后复查为 Critical 0、Important 0、Minor 0。
- 本次遗漏根因：fixture 将真实 `bdt({thread,...})` 简化为可接受任意 summary 的 `bdt(e)`，生成器因此错误写出 `bdt(s)`；真实 mapper 读取 `s.thread.createdAt` 抛错，query 层用 `[]` 呈现为 `No chats yet`。ID 数量一致、plan 0、旧 verifier 和 routes ready 均未覆盖该错误。
- mapper runtime：从 live 41705 bundle 抽取真实 `SA`、`bdt` 和 patched loader，对真实 app-server state DB 的 513 条 thread 执行；当前 root 匹配 51 条并产出 51 条 conversation，均含 `id/cwd/turns`，不再抛 `undefined.createdAt`。
- live hotfix：首次旧 marker 迁移生成 `var var`，语法检查失败并自动回滚；修正完整 `var` 边界并补回归后重新迁移成功，最终语法、plan 0 和 external verifier 通过。
- 最终迁移还发现全文件 top-level depth 扫描会把真实 live `bdt` 误判为 depth `-1`，导致有效旧 marker 无法升级。41705 mapper producer 现要求全文件只有一个 `function bdt(`，并用完整真实签名提取唯一函数 scope；嵌套或字符串假 producer 会增加同名项并被拒绝。不得再用全文件 brace depth 判断压缩 bundle 的 mapper 是否顶层。
- 最终 live runtime：同一真实 bundle 与 app-server 当前返回 173 条 thread，当前 root 匹配 16 条并成功产出 16 条含 `id/cwd/title/hostId/workspaceKind/hasUnreadTurn` 的 conversation；样例标题与现有历史一致。该非空输出、原生 row 组件契约和点击路径测试共同作为本次确定性 UI 等价证据。
- 最终 Review：mapper fallback 字段、producer decoy、runtime load/fallback 三项复查，以及真实 bundle producer-scope 调整复查，均为 Critical 0、Important 0、Minor 0。
- Local Groups `0.0.62` active；最终 VSIX `/tmp/vscode-codex-groups-0.0.62-hotfix-20260824173101.vsix`，SHA-256 `cf6cdd1ceed0ac35c67b4f1f275e7d1720e164679df5c6fe3d1102bc049a9675`。安装目录 patchEngine/verifier 与 worktree 哈希一致，安装目录 plan 0/verifier 通过。config SHA-256 仍为 `d064a25eed2c56360ebd9a906dec04f4e58280b32fa3ee1dae932888aeef3005`。
- 模型选择器复现：点击后同一 Host 在 5 秒内连续记录 24 次 `ResizeObserver loop completed with undelivered notifications`，随后 Webview/Extension Host 重建；旧 Power v1 的紧凑 `pCn` 实测输出 `xhigh/max/ultra`，失败回归先红后绿。
- 升级遗漏结论：41705 适配只更新了 Power 压缩符号，未重新核对 clean `SCn/wCn/pCn` 和真实 `model/list`；简化 fixture 与旧 verifier 又把强制 slider、metadata bypass、静态 Max 固化成错误验收标准，形成共同假绿。后续升级门禁已补入 `design.md`。
- 模型选择器修复：41705 Power v1 已原位迁移到 v2；live bundle 为 native `bCn`、native 完整 `pCn`、静态 Max 0、展开 `y$` Max/Ultra 各 1。repo 与安装目录均为 plan 0，external verifier 和五个 bundle 语法检查通过；迁移备份为 `.codex-patches/app-initial-DqGfhkM8.js.before-codex-local-groups-20260827082316961-502401.bak`。
- 模型选择器自动化：`npm test` exit `0`（`328 tests`）；compile、lint、`git diff --check`、OpenSpec strict 通过。测试专用 `TMPDIR` 在命令结束后自动回收。
- 模型选择器 Review：首次发现完整 `pCn` 尾部和双 marker 可假绿；补完整 direct body、v1=0 门禁及 forced slider/tail/filter/static Max/nested decoy 负例后，复查 Critical 0、Important 0、Minor 0。
- 模型选择器 live runtime：磁盘补丁已生效，当前 Webview 仍需 Reload 才会加载新 bundle；Reload 后点击回归完成前，任务 7.3 保持未完成。
- OpenSpec 执行责任：后续升级必须先按本 change 与升级手册完整矩阵调研、实现和自验收；常规 Reload/UI 回归由主线程负责，禁止以 routes ready、ID 集合或宽松 fixture 代替真实 producer/consumer 与非空列表门禁，也禁止把逐项试错交给用户。
- 临时目录根因：`test/test-utils.js::tempDir()` 只创建不删除，`test/run-tests.js` 没有测试结束清理；完整测试约产生 300 个目录，重复运行可累积到数万个。抽样 `codex-patch` 目录约 48K，另有 `/tmp/codex-upgrade-*` 约 4.21G；总占用不能只按单目录样本推断。任务 9 完成前，不得再把测试通过或升级适配标记为最终完成。
- 2026-08-24 手工清理：删除本仓库测试前缀目录 75,796 个（`codex-meta` 7,324、`codex-config` 329、`codex-patch` 49,159、`codex-locator` 3,778、`codex-status` 543、`codex-manage` 903、`codex-groups-verify` 13,760），另删除 `codex-upgrade` 4 个、`clg-41705` 2 个及 80 个已确认归属本项目的诊断/VSIX/日志残件；删除错误为 0。目标前缀复查均为 0，`/tmp` 从 99%（可用 600M）降至 85%（可用 5.7G），inode 使用率从 57% 降至 7%。该手工结果不替代任务 9 的自动 finally 清理。
- 二次全量审计不再局限于已点名前缀：又发现 236 个无进程占用的 Codex/Local Groups 历史产物，`du` 合计约 29.49 GiB，包含旧 build official clean/rollback、双版本验证副本、VSIX、npm cache、review/diagnostic/schema/probe 和日志。全部删除且错误为 0；按顶层名称复查，含 `codex`、`clg`、`openai.chatgpt` 或 `xinghezhiyuan` 的残件为 0。`/tmp` 最终从初始 99%（可用 600M）降至 53%（可用 18G），inode 使用率降至 3%。`du` 汇总与文件系统实际释放量分别记录，不把二者误当成同一指标。
- 三次内容审计发现名称不含 Codex 的历史残件：111 个 `review/specqa/standards-review` 候选合计约 19 GiB，其中 87 个通过 `openai.chatgpt-*`、Local Groups source/package 或适配日志内容确认归属并删除；混在同类前缀下的商城、IoT、MySQL、Jest 等其他项目资料保留。递归扫描又发现随机目录 `/tmp/tmp.othK9uZRxn` 内含 Local Groups package，删除后再次全量扫描：项目名称匹配项 0、`openai.chatgpt-*`/`patchEngine`/verifier/Local Groups package 内容归属项 0。最终 `/tmp` 为 35%（可用 25G），inode 使用率 2%；剩余大目录均无本项目归属证据，未删除。
