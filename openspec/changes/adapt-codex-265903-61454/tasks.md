# Tasks

- [x] 1. 读取升级手册、既有 5901 change、locator/engine/verifier/tests，并校验 official VSIX 与 clean topology。
- [x] 2. 确认 Host、Header、Main、Power、Server/History 的真实 aliases 与调用链。
- [x] 3. 实现 exact-build 白名单、五 bundle 适配和 unknown/suffix 零写入。
- [x] 4. 同步 external verifier 的 exact mappings 与跨 bundle 契约。
- [x] 5. 增加 locator、engine、runtime 和 verifier 版本回归。
- [x] 6. official/active clean 完成五 bundle plan/apply、语法、external verifier 和二次 plan 0。
- [x] 7. 完成全量 386 tests、compile、lint、strict OpenSpec 和 `git diff --check`。
- [x] 8. 同步发布文档与版本，打包并安装 Local Groups `0.0.69`；未 commit、未 push。

## 最终证据

- active registry：Codex `26.5903.61454`、Local Groups `0.0.69`。
- live 五 bundle 语法、external verifier、二次 plan 0 通过；安装目录 engine/verifier 与工作区 SHA-256 一致。
- Kimi `kimi-k3(max)` 独立 review 调用被服务端以 `invalid_request_error` 拒绝，未将其记为 review PASS。
- 本次归属的 `/tmp/codex-5903-*` 与临时 VSIX 已清理；未修改 multi-agent、provider 或用户模型配置。
