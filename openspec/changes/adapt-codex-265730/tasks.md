# Tasks

- [x] 1. 记录 `26.727.40816` live plan、verifier、bundle 哈希和 clean backup，并保存回滚副本。
- [x] 2. 从官方 Marketplace 安装 `openai.chatgpt@26.5730.61639`，确认其为预发布版且保留旧版目录。
- [x] 3. 定位新版三份 `app-initial-*`、Header、Extension Host、messenger、execution target、项目历史、Power/Reasoning 和子 agent 调用链。
- [x] 4. 增加新版 locator、Extension Host 消息桥、Header 三入口、项目历史、长列表、600px、Sol Max/Ultra 和子 agent 回归。
- [x] 5. 实现 `26.5730` 安全适配，未知版本继续 fail closed，旧版 HTTP fallback 不外扩。
- [x] 6. 完成 compile、lint、181 tests、git diff、clean-copy plan/apply/plan 和 verifier。
- [x] 7. 应用 live bundle，确认二次 plan 为零且 verifier 通过；发现 clean 版本本身启动失败后回退 active 版本。
- [x] 8. 提升 Local Groups 到 `0.0.52`，同步 README、CHANGELOG、升级手册，打包并安装 VSIX；安装目录 compile、plan 和 verifier 通过。
- [ ] 9. Reload 后人工验证三个 metadata 入口、项目隔离、长列表、600px、Sol Max/Ultra 和子 agent；启动门禁已通过，完整 UI 清单仍需逐项复验。
- [x] 10. 回退 active Codex 到 `26.727.40816`，locator 优先 VSCode active registry，残留高版本目录不再覆盖回退版本。
- [x] 11. 对时 root render、route mount、ready 与 timeout 日志，确认固定 `30s` 看门狗误杀 `61,906-70,983ms` 的健康启动；仅对 `26.5730` 延长到 `120s`，增加回归和 verifier，重新启用后 Reload 成功。

## 验证证据

- clean root：`/tmp/codex-265730-validation-root-KL7uba`；4 个预期变更、7 个语法检查、二次 plan 0、verifier 通过。
- live：`/root/.vscode-server/extensions/openai.chatgpt-26.5730.61639-linux-x64`；4 个预期变更已备份并应用，二次 plan 0、verifier 通过。
- live Header helper：已实际发出 `promptConversationTitle`、`promptConversationGroup`、`setPendingGroup` 和原生 `new-chat`；verifier 同时锁定新版 direct host callback 参数顺序。
- 初次误判证据：失败会话已出现 `React root render requested`，约 30 秒后才记录 Webview timeout；首次 Local Groups backup 更晚，排除原业务 bundle patch 导致资源缺失。
- 健康耗时证据：旧版成功会话为 `64,717ms` 和 `70,983ms`；修复后的 26.5730 为 `61,906ms`。固定 `30s` 小于当前 Remote 环境的正常启动耗时。
- 当前 Reload：`Codex.log` 01:28:31 请求 root render，01:29:31 完成 `app routes mounted after 61906ms`，随后记录 `ready provider mounted`，没有 `Webview did not finish starting`。
- active：VSCode 已启用 `openai.chatgpt@26.5730.61639`；二次 plan 为 0，verifier 通过。
- VSIX：`vscode-codex-groups-0.0.53.vsix` 已安装；安装目录使用版本限定的 `120s` 补丁。
- 用户已确认 Codex 能打开。任务 9 只保留完整业务 UI 清单的逐项人工复验，不再阻塞 26.5730 启动可用结论。
