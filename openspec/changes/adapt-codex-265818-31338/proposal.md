# 适配 Codex 26.5818.31338

## 背景

Microsoft Marketplace 最新 linux-x64 预发布版已从 `openai.chatgpt@26.5814.41407` 更新到 `26.5818.31338`。这是新 minor；现有 locator 能唯一定位 Header、App Main/Statsig/Request 和 App Server/History，但当前 safe plan 仍先规划通用 Host/Header，随后才报不支持新 minor，未达到未知版本零规划门禁。

官方 VSIX 大小 `228799121` bytes，SHA-256 为 `6eb72e234e83b809e776fa100f377f289910fd6410d0680438bae9ac5c9cfb2c`，ZIP 与 package 校验通过。

## 目标

- 在 official clean 副本重新确认 5818 的 Host、Header、标题双消费、项目历史、Sol Max/Ultra、V1/V2 transcript 与 composer 面板全链。
- 新增 `26.5818.31338` 精确版本支持；未知新 minor/build 在任何规划、backup 恢复或写入前 fail closed。
- 保留 5810 双 build 和 5814 的 clean、patched、回滚兼容。
- 按全量矩阵一次验证分组、Metadata 四入口、标题、History、Sol、子 agent、配置只读、安装和 Reload。
- Local Groups 发布版本提升为 `0.0.60`。

## 非目标

- 不修改、重排或恢复用户 `config.toml`；不切换 Multi-Agent、provider、model、reasoning 或认证。
- 不 patch `canInteract`，不放宽 Codex 原生子 agent 筛选。
- 不在 official clean、自动回归和 review 通过前修改 live Codex。
- 不顺手重构旧版本 patch 管线。

## 影响范围

- `src/patchEngine.js`：5818 exact-build 门禁、真实锚点、强后置条件。
- `src/extensionLocator.js`：仅在新拓扑不能唯一定位时修改。
- `scripts/verify-patched-bundles.js`：5818 live 强契约。
- `test/locator.test.js`、`test/patch-engine.test.js`、`test/scripts.test.js`：真实 fixture、runtime 与断链负例。
- `package.json`、README、CHANGELOG、升级手册与本 OpenSpec。
