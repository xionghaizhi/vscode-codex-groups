# Tasks

- [x] 1. 记录基线：official VSIX SHA-256、clean、隔离验证副本、41047 rollback、用户 config SHA/mtime。
- [x] 2. 调研 52044 clean 与 41047 rollback 的拓扑、Header、Power、History、子 agent 链真实符号并验证唯一性。
- [x] 3. 确认 locator、extension host 锚点零改动；更新 5810 Header/UI/Power/History 锚点与后置条件。
- [x] 4. 同步 verifier 同强度断言；更新 5810 fixture 与断链负例到 52044 符号。
- [x] 5. 隔离 clean 副本完成 plan 4 / apply 幂等 / 二次 plan 0 / 语法 / verifier。
- [x] 6. compile、lint、全量测试、`git diff --check` 通过；确认 `config.toml` SHA/mtime 前后一致。
- [x] 7. Local Groups 升级 0.0.58，同步 README、CHANGELOG、升级手册（含获取阻碍与替代流程）、本 OpenSpec。
- [x] 7.1 Review 第 1 轮修复：同 minor 双 build 兼容（`context.codexBuild` 显式变体，41047/52044 白名单，未知 build fail closed）；41047 clean/patched 与 52044 clean 三门禁全过；playbook 章节按时间序整理；证据路径统一。
- [x] 7.2 Review 第 2 轮修复：补 52044 locator 正向回归（`header-CSBoBpDg` / `BYsFXcPC`(main/statsig/request 合包) / `CireNHNv`(server) + unrelated app-initial 候选 + localTitle 为空断言），locator 生产代码未改。
- [x] 8. 主线程 review 通过后安装 official Codex 与 Local Groups 0.0.58，执行 live plan/apply/plan + verifier。
- [x] 8.1 提交前复盘已记录下载断流、同 minor 回滚兼容遗漏、locator 测试遗漏、配置所有权与人工门禁边界。
- [ ] 9. 用户 Reload Window 后按全量矩阵人工验收（标题双消费、四入口、分组 5/15/25、子 agent transcript+顶部 composer、Sol Max/Ultra、启动时间线）。

## 当前证据

- official VSIX：`/tmp/codex-26581052044-20260816-155401/openai.chatgpt-26.5810.52044-linux-x64.vsix`；SHA-256 `193a2a17e0ebe0b7938a6f7416f84c786426f3f1b76d235aa970cf8e09554bf2`（HTTP/1.1 Range 续传获取，CDN 断流残件未使用）。
- official clean：`/tmp/codex-26581052044-20260816-155401/clean/extension`（52044）、`/tmp/codex-26581041047-clean-20260814-092455/extension`（41047）；双版本最终验证副本 `/tmp/clg-5810-dual-final-1786872909`。
- 双版本最终验证副本 `/tmp/clg-5810-dual-final-1786872909`：`clean41047` plan 4 / apply 幂等 / plan 0 / verifier 通过；`clean52044` 同；`patched41047` plan 0 / errors [] / verifier 通过。
- compile、lint、243 tests、`git diff --check` 通过；OpenSpec strict validation 通过。
- `config.toml` SHA-256 `47d1d34e2a1e0f20f86ee3a631651b539834eaa82b6287ead7431a5ae8eb9889`、mtime epoch `1786814971`，前后一致。
- 主线程独立双版本复验 `/tmp/clg-root-review-5810-dual-20260816-174631`：41047 / 52044 official clean 都为 plan 4 / apply 幂等 / plan 0 / verifier 通过。
- live active 已切到 Codex `26.5810.52044`：安装后四个业务文件与 official clean 哈希一致；live plan 4 / apply 幂等 / plan 0 / verifier 通过。
- Local Groups VSIX `vscode-codex-groups-0.0.58.vsix`，SHA-256 `ff4464be5305c92d41c1801f0eeeea4d16541aa6d71ec007a603579943b4abbf`；active registry 已切到 0.0.58，安装目录关键代码哈希一致、plan 0 / verifier 通过。
- Reload 人工验收：**pending**。
