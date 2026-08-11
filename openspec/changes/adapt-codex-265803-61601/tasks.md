# Tasks

- [x] 1. 记录旧 active Codex / Local Groups 版本、plan、verifier、bundle 哈希，并备份旧目录和 `extensions.json`。
- [x] 2. 通过 Marketplace 官方 API 确认 linux-x64 `26.5803.61601`，下载、解 gzip 包装、校验 ZIP/package/engine/SHA-256并保存 clean 副本。
- [x] 3. 对比新旧资源拓扑、Extension Host、Header、app main、App Server / Power、messenger、execution target、项目历史、Reasoning 和 V1/V2 子 agent 链路。
- [x] 4. 先增加 `26.5803.61601` locator 和 `tBe -> iBe` 失败回归，再按唯一业务签名修复 marker 锚点。
- [x] 5. 在 official clean 副本完成 4 文件 plan/apply/plan、唯一 bundle 语法和 verifier。
- [x] 6. 安装新版 Codex、应用 live 四文件补丁，确认 active registry、幂等、二次 plan 0 和 live verifier。
- [x] 7. 完成 compile、lint、194 tests、`git diff --check` 和代码/QA review。
- [x] 8. 提升 Local Groups 版本，同步中英文 README、CHANGELOG、升级手册和本 OpenSpec。
- [x] 9. 打包并安装 Local Groups VSIX，从安装目录复验 compile、plan 0 和 verifier。
- [x] 10. Reload 后记录启动时间线并完成人工业务 UI 门禁。

## 当前证据

- Marketplace latest linux-x64：`openai.chatgpt@26.5803.61601`，发布于 `2026-08-10T18:01:20.633Z`。
- 官方 VSIX：`/tmp/openai.chatgpt-26.5803.61601-linux-x64.vsix`；SHA-256 `c232a7d039a0817064351d0d2d6915477256cc04ab9e342b13336dca71ee6279`。
- 回滚：`/tmp/openai.chatgpt-26.5803.41515.rollback-20260811-091534`；registry 备份 `/tmp/extensions.json.before-codex-26.5803.61601-20260811-091534`。
- clean：`/tmp/codex-26580361601-clean-20260811-091534`；validation：`/tmp/codex-26580361601-validation-20260811-092239`。
- clean-copy：第一次 plan 4、errors 0；apply 后 plan 0；Extension Host 和 3 个唯一 ESM bundle 语法、verifier 通过。
- live：`/root/.vscode-server/extensions/openai.chatgpt-26.5803.61601`；四文件备份和 apply 完成，幂等通过，二次 plan 0，verifier 通过。
- 仓库：compile、lint、194 tests 和 `git diff --check` 通过。代码/QA review 完成 2 轮：已修复跨 `case/default/switch` 假阳性、未 push 死对象和输入变量未绑定；最终后置条件从外层 `switch(<event>.type)` 回引同一输入，并校验 V1/V2 完整 push 片段。
- VSIX：`vscode-codex-groups-0.0.55.vsix` 已打包并安装；active Local Groups 为 `0.0.55`。
- 安装目录：`/root/.vscode-server/extensions/xinghezhiyuan.vscode-codex-groups-0.0.55`，compile、live plan 0 和 verifier 通过。
- 安装阻碍：Remote CLI 长时间无输出，停止后 VSCode Server 安装任务仍完成目录和 registry；已验证标准 `.vsixmanifest`、package `__metadata` 和关键文件，处理原则见 `design.md`。
- Reload 证据：`exthost7/openai.chatgpt/Codex.log` 在 10:45:35.389 记录 React root render，10:46:40.792 记录 `app routes mounted after 66081ms`，10:46:40.811 ready，route 到 ready 为 19ms；无 Oops、资源加载失败或启动超时。
- Reload 后新 Extension Host 运行 `/root/.vscode-server/extensions/openai.chatgpt-26.5803.61601/bin/linux-x86_64/codex`，active registry 为 Codex `26.5803.61601` / Local Groups `0.0.55`。
- 用户在上述 Reload 后确认无问题；前述人工门禁中的最近会话项目隔离、分组 5/15/25 与展开收起、标题/分组/新分组/分组内新建会话、600px 滚动、归档刷新、Sol Max/Ultra、原生子 agent 和 Check Status 均通过。
- 性能观察：功能启动健康，但 route mount 仍需 `66,081ms`；120 秒看门狗避免误杀，不代表上游启动延迟已消除。
