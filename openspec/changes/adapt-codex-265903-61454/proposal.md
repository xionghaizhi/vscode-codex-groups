# 适配 Codex 26.5903.61454

## Why

官方 linux-x64 已更新到 `openai.chatgpt@26.5903.61454`。现有 Local Groups 只精确支持到 `26.5901.22334`。5903 仍是五 bundle 拆包，但 Host/Header/Main/Power/Server 压缩符号全部漂移：Host 看门狗从 `GI/Dd/tI/J9/HTe` 变为 `jI/Nd/iI/p5/hPe`，下拉标题解析从 Header `yMt` 对侧改到 Main `YFt`，Power 菜单/滑块从 `i3/JNn/CKn` 变为 `U4/Alt/S0n`。把 5903 塞进 5901 change 会复用失效锚点。必须新建 exact-build change。

## What Changes

- 新增精确 `26.5903.61454` 白名单；未知 build、带后缀版本和未来 minor 继续在恢复或写入前失败。
- 按 5903 真实拓扑分别适配 Host、Header、Main、Power 和 Server/History。
- 保留标题/分组/新建会话、fail-closed、unknown/suffix 零写入、Sol/Astra Max/Ultra 菜单+紧凑/展开拖拽+保存回读。
- 下拉标题继续走 Header marker + Main resolver；打开页 refresh 只用 Yn 模块内 React `Ln`，禁止把 JSX `$` 当 hooks。
- 项目历史继续拆为 Server `listRecentThreads` producer 与 Power `qct` hook fallback。
- 同步 external verifier、fixture、runtime、负例和 official clean 门禁。
- 不修改 `~/.codex/config.toml`、multi-agent 或用户模型配置。

## Impact

- 代码：`src/patchEngine.js`、`scripts/verify-patched-bundles.js` 及相关测试。
- 文档：本 change、CHANGELOG、README、升级手册。
- 运行时：只在精确匹配的 Codex `26.5903.61454` 上写入；5901 既有契约保持不变。
