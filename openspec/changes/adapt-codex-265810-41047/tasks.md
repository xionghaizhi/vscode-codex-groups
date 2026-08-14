# Tasks

- [x] 1. 记录旧 active Codex / Local Groups、plan、verifier、config 哈希/mtime，并保存 official VSIX / clean / validation / rollback 路径。
- [x] 2. 对比 26.5803.61601 与 26.5810.41047 的拓扑、Header、jP 看门狗、Power、History、V1/V2 链。
- [x] 3. 先增加 26.5810 locator、未知版本仍 fail closed、jP/Power 锚点失败回归，再写 5810 专用 patch。
- [x] 4. 在 official clean/validation 副本完成 4 文件 plan/apply/plan、唯一 bundle 语法和 verifier。
- [x] 5. 完成 compile、lint、全量测试和 `git diff --check`。
- [x] 6. 提升 Local Groups 到 0.0.57，同步 README、CHANGELOG、升级手册和本 OpenSpec。
- [x] 7. Review 第1轮：补齐 UI 后置条件全链 fail-closed、verifier 同强度、5810 运行态 fixture、文档证据措辞。
- [x] 8. GPT Standards / Spec review 通过后安装 official Codex、执行 live plan/apply/plan + verifier，并安装 Local Groups 0.0.57。
- [x] 9. 主线程所有 agent 结束后恢复 `config.toml` 基线 SHA-256 `9c0111f6be62b12a9af2ae53b8619c2ab9fe6de126ff13c3ad30de90b8d7649e`、mtime `2026-08-13 19:17:29 +0800`。
- [x] 10. 用户执行 Reload Window 后确认 5.0 UI 矩阵无问题；日志证明 route mount / ready 正常。

## 当前证据

- Marketplace latest linux-x64：`openai.chatgpt@26.5810.41047`。
- 官方 VSIX：`/tmp/openai.chatgpt-26.5810.41047-linux-x64.vsix`；SHA-256 `d6ef20f9dca65f732918bcc3c84ba32d6cf284fd813f0da9738929422f6e3e25`。
- official clean：`/tmp/codex-26581041047-clean-20260814-092455/extension`。
- final validation：`/tmp/codex-26581041047-final-validation-20260814-102809/openai.chatgpt-26.5810.41047`。
- 旧版回滚：`/tmp/openai.chatgpt-26.5803.61601.rollback-20260814-092455`。
- validation plan1：4 files / errors `[]`；apply idempotent true；syntax 5 项通过；plan2：0 / `[]`；verifier 通过。
- live active 已是 `openai.chatgpt@26.5810.41047`；live plan 4 / apply 幂等 / plan 0 / verifier 通过。
- Local Groups VSIX：`vscode-codex-groups-0.0.57.vsix`，SHA-256 `74c9c00feea52b6e9552cfced1d08993419603b353b0b1319927df2462d61a33`；active registry 已切到 0.0.57，安装目录 plan 0 / verifier 通过。
- official/patched clean 为隔离副本，不挂载 UI；live Reload 启动时间线已取得。
- `config.toml` 适配代码未写入。任务期间 agent 编排 / CLI 激活曾意外切换 model/reasoning；主线程已恢复原始 `grok-4.6/high`，最终 SHA-256 与 mtime 分别为 `9c0111f6be62b12a9af2ae53b8619c2ab9fe6de126ff13c3ad30de90b8d7649e` / `2026-08-13 19:17:29 +0800`。
- Reload 日志：2026-08-14 10:50:30.398 root render，10:51:03.528 routes mounted（`36,967ms`），10:51:03.550 ready；无 `Webview did not finish starting`。用户确认 UI 无问题。


## official clean 与 patched clean

- official clean 解包：`/tmp/codex-26581041047-clean-20260814-092455/extension`，未写入补丁。
- patched clean：`/tmp/codex-26581041047-final-validation-20260814-102809/openai.chatgpt-26.5810.41047`，plan 4 / apply / plan 0 + verifier。
- live active 已是 `26.5810.41047`，下表 live 自动与 Reload UI 证据均已更新。

## 5.0 矩阵（本 change）

| 回归域 | Fixture/自动 | Official clean | Patched clean | Live/verifier | Reload 人工 |
| --- | --- | --- | --- | --- | --- |
| 启动 | PASS：jP 30→120 与锚点 fail-closed | N/A：official clean 隔离副本不挂载 UI | N/A：patched clean 以语法/verifier 验证 | PASS：36,967ms mount，随后 ready，无 timeout | PASS：用户确认可正常打开 |
| 定位与安全 | PASS：locator 唯一；26.5731 仍 fail closed | PASS：4 文件、errors 0 | PASS：二次 plan 0、幂等 | PASS：active registry + plan 0 + verifier | PASS：用户确认 |
| 项目历史 | PASS：root/child 分页过滤执行 | PASS：Ron hook + listProjectConversations | PASS：verifier 历史契约 | PASS：live verifier | PASS：用户确认 |
| 分组列表 | PASS：5→15→25、25 时 15/5 双收起、隐藏数 | PASS：header 契约生成 | PASS：verifier 分组/滚动/sticky | PASS：live verifier | PASS：用户确认 |
| Metadata 四入口 | PASS：标题/分组/分组内会话/promptNewGroup 执行 | PASS：extension helper v17 生成 | PASS：verifier getMetadata/inputBox | PASS：live verifier | PASS：用户确认 |
| 标题双消费 | PASS：同 ID dropdown + Bn，空缺回退，断链失败 | PASS：OpenedTitle265810 生成 | PASS：verifier 双消费 | PASS：live verifier | PASS：用户确认 |
| Sol | PASS：Max 写入、Ultra 单份、kon/u$ | PASS：Power 在 CuO8rPSL | PASS：verifier Max/Ultra | PASS：live verifier | PASS：用户确认 |
| 子 agent | PASS：dyn/uyn/lJ 与 DOr/AOr/OOr/xzn | PASS：native 链仍在 | PASS：verifier 全链 | PASS：live verifier | PASS：用户确认 |
| 用户配置 | PASS：代码无写入 | PASS：最终恢复基线 | PASS：最终恢复基线 | PASS：hash/mtime 与任务前一致 | PASS：Reload 后仍一致 |
| 安装与状态 | PASS：225 tests / compile / lint | PASS：official VSIX/clean 已校验 | PASS：final validation | PASS：Codex 5810 + Local Groups 0.0.57 registry、plan 0、verifier | PASS：用户确认 |
