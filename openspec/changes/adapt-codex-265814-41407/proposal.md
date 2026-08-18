# 适配 Codex 26.5814.41407

## 背景

Microsoft Marketplace 最新 linux-x64 预发布版已从 `openai.chatgpt@26.5810.52044` 更新到 `26.5814.41407`。这是新 minor；现有 locator 能唯一定位 Header、App Main/Statsig/Request 和 App Server/History，但 `CodexPatchEngine.plan()` 按安全门禁拒绝未知 minor，Local Groups 功能不会自动应用。

官方 VSIX 通过 Marketplace API 定位并使用 HTTP/1.1 Range 分段下载，完整文件 SHA-256 为 `a25dc61555d079b989e32c22017cd5e43e0b6894d3428481ae34581838c66708`。任何断流残件不得作为 official clean。

## 目标

- 在 official clean 副本上重新确认 5814 的 Extension Host、Header、标题双消费、项目历史、Sol Max/Ultra、V1/V2 transcript 与 composer 面板全链。
- 新增 `26.5814.41407` 的精确版本支持；未知 5814 build 继续 fail closed。
- 保留 `26.5810.41047`、`26.5810.52044` 的 clean、patched 和回滚兼容，不用 5814 锚点覆盖旧版本。
- 完成 fixture、official clean、patched clean、live verifier 与 Reload 人工矩阵，并记录本次实际阻碍。
- Local Groups 发布版本提升为 `0.0.59`。

## 非目标

- 不修改、重排或恢复用户 `config.toml`；不切换 Multi-Agent V1/V2、provider、model、reasoning 或认证。
- 不 patch `canInteract`，不放宽 Codex 原生子 agent 筛选语义。
- 不在 clean、自动测试和 review 通过前修改 live Codex。
- 不顺手重构 5810 及更早版本链路。

## 影响范围

- `src/patchEngine.js`：5814 版本门禁、Host/Header/UI/Power/History 锚点与强后置条件。
- `src/extensionLocator.js`：仅在新拓扑无法唯一定位时修改。
- `scripts/verify-patched-bundles.js`：5814 live 强契约。
- `test/locator.test.js`、`test/patch-engine.test.js`、`test/scripts.test.js`：5814 正向、断链和未知 build 负例。
- `package.json`、README、CHANGELOG、升级手册与本 OpenSpec。
