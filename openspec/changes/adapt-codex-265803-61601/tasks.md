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
- [x] 10. Reload 后记录启动时间线并完成当时定义的人工业务 UI 门禁。

## 打开页标题一致性补充修复

- [x] 11. 用同一 conversation ID 对照本地 metadata 与原生 session index，确认不是错误导航或 metadata 覆盖，而是最近会话和打开页使用了不同标题源。
- [x] 12. 先增加“本地标题优先、空白回退原生、保存后即时刷新”的失败回归，再在 Header `Bn` 展示层复用 `codexLocalGroupsLocalTitle()` 使测试转绿。
- [x] 13. 新增独立打开页标题 marker，并增加缺少标题覆盖、刷新订阅或清理监听时的 postcondition / verifier fail-closed 回归。
- [x] 14. 在 official clean 副本和已带旧 Header marker 的 live bundle 完成 plan/apply/plan、语法、postcondition、verifier 和幂等验证。
- [ ] 15. Reload 后设置当前会话标题，确认下拉和左上角同时立即刷新；再从最近会话重新打开同一 conversation ID，确认两处文字一致；最后用本地标题缺失或空白的同一 ID，确认下拉和左上角都回退原生标题。
- [x] 16. 建立下一版必须一次性执行的全量已知回归矩阵，并新增“任一适用项 pending 就不得宣称适配完成”的 OpenSpec 与升级手册门禁。
- [x] 17. 记录用户配置所有权事故并恢复改动前 `config.toml`；以后适配前后校验内容哈希和 mtime，不得自动切换 V1/V2。

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
- 用户在上述 Reload 后确认最近会话项目隔离、分组 5/15/25 与展开收起、设置标题动作与最近会话行显示、分组/新分组/分组内新建会话、600px 滚动、归档刷新、Sol Max/Ultra、对话正文子 agent 活动和 Check Status 可用。该轮没有验证顶部 composer 子 agent 面板，也没有进入同一会话核对打开页左上角，不能作为本次两个人工门禁的通过证据。
- 性能观察：功能启动健康，但 route mount 仍需 `66,081ms`；120 秒看门狗避免误杀，不代表上游启动延迟已消除。

## 标题错配复现证据

- conversation ID：`019feeee-54a3-78b1-aac4-fd11f6a9b5e1`。
- Local Groups metadata 标题：`积分订单导出修改`。
- Codex 原生 `thread_name`：`切换到指定 Git 分支`。
- 标题修复隔离验证：`/tmp/codex-26580361601-title-panel-validation-20260813-105338`；official clean 首次 plan 4、apply 语法/幂等通过、二次 plan 0、verifier 通过。
- 标题修复 live 验证：已备份并更新 `header-C4MbtUfx.js`；语法/幂等通过，二次 plan 0，verifier 通过。
- 自动化：compile、lint、206 tests、`git diff --check` 与两个 OpenSpec strict validation 通过。
- VSIX：`vscode-codex-groups-0.0.56.vsix` 已打包并安装；active registry 为 Local Groups `0.0.56`，安装目录 compile、plan 0、verifier 通过。最终 SHA-256 由同目录 `sha256sum` 发布证据记录，避免在被打包文档内写入自身哈希造成循环变化。
- 修复前的复现状态为最近会话显示本地标题、打开页左上角显示原生标题；修复后的 Reload 人工门禁完成前，不得把该项标记为通过。
