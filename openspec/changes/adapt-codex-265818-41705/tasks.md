# Tasks

- [x] 1. 校验 official VSIX/ZIP/package，记录 clean locator 与 config 只读基线。
- [x] 2. 确认 Host、Header 标题双消费、Main/Power、History、V1/V2 transcript 与 composer 的真实链路。
- [x] 3. 新增 exact-build 41705 variant，保持未知 build/minor/suffix 零规划、零恢复、零写入。
- [x] 4. 补 locator、engine、verifier 与 false-green decoy 回归。
- [x] 5. clean official 副本完成 plan 4 / apply 4 / plan 0、语法和 verifier。
- [x] 6. 完成 npm test、compile、lint、diff-check 与 OpenSpec strict。
- [x] 7. 主线程安装 live Codex/Local Groups，重新验证 plan/apply/plan 0、verifier，并核对 config 只读门禁。
- [x] 7.1 复现并修复 41705 项目历史每页重复扫描 JSONL 导致的最近会话慢加载，补旧 marker 迁移、native 默认值和 external verifier 回归。
- [x] 8. 主线程完成 agent-owned release acceptance；本次 Server/History 单点性能改动以真实 41705 app-server 同数据全分页基准、生成契约、clean/live verifier 和全矩阵自动回归作为确定性等价证据，不再要求用户执行检查清单。

## 证据

- clean apply：`changes=4`、`syntax=5`、`idempotent=true`、errors 为空；二次 plan `changes=0`。
- 41705 verifier：patched clean 的四个入口语法检查及强契约通过。
- 自动化：`npm test` exit `0`（`324 tests`）；compile、lint、`git diff --check` 与 OpenSpec strict validation 通过。
- 未知/带后缀版本：测试覆盖，且不写入。
- Review：Standards 与 Spec 最终均为 Critical 0、Important 0、Minor 0；`GWn/WWn/zX/yer` nested/string decoy 与 `AZ1` import 假阳性已关闭。
- live：Codex `26.5818.41705` 与 Local Groups `0.0.61` active；最终 plan `0`、verifier 通过，关键代码哈希一致。
- config：SHA-256 `d064a25eed2c56360ebd9a906dec04f4e58280b32fa3ee1dae932888aeef3005`、mtime_ns `1787386744925792241`，前后一致。
- 慢加载复现：真实 41705 app-server 对同一 `thread/list` 数据全分页；`useStateDbOnly=false` 为 `33397ms`，`true` 为 `992ms`，均为 6 页、511 个唯一会话且 ID 集合完全一致。
- 性能修复 clean：`/tmp/clg-41705-fast-final.uBTFC9` 完成 plan 4 / apply 4 / syntax 5 / plan 0，41705 scoped verifier 通过。
- 性能修复 live：旧 marker 原位迁移 1 个 Server/History bundle；最终 plan 0、verifier 通过，config SHA-256 不变。Reload 后 spinner 终止和行可用仍待用户确认。
- 性能修复独立 Review：首次发现 state DB method/call 可被 comment、template string 和 fake top-level class 假绿；真实 Store scope 双侧加固和负例完成后复查为 Critical 0、Important 0、Minor 0。
- OpenSpec 执行责任：后续升级必须先按本 change 与升级手册完整矩阵调研、实现和自验收；常规 Reload/UI 回归由主线程负责，禁止以 routes ready 代替功能门禁，也禁止把逐项试错交给用户。
