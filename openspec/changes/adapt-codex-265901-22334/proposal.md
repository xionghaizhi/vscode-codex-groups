# 适配 Codex 26.5901.22334

## Why

官方 linux-x64 预发布版已更新到 `openai.chatgpt@26.5901.22334`。现有 Local Groups 只精确支持到 `26.5825.51511`，而新版本把 Header、Main、Power 与 Server/History 分散到不同 bundle。直接沿用旧版单 bundle 假设会误判调用链，因此必须基于 official clean 重新适配。

## What Changes

- 新增精确 `26.5901.22334` 白名单；未知 build、带后缀版本和未来 minor 继续在恢复或写入前失败。
- 按新拓扑分别适配 Host、Header、Main、Power 和 Server/History。
- 修复 5901 行解析器原生标题优先导致下拉标题不即时回显：仅对 Local Groups 标记标题恢复本地非空优先，清空后仍回退原生标题。
- 保留原生 Multi-Agent 和 provider/model/reasoning 用户配置；按 2026-09-05 用户确认，将 Sol/Astra 的 Max/Ultra 同时纳入菜单、紧凑/展开拖拽条和保存回读适配，复用原生滑块交互与持久化链。
- 同步 external verifier、fixture、runtime、负例和 official clean 门禁。

## Impact

- 代码：`src/patchEngine.js`、`scripts/verify-patched-bundles.js` 及相关测试。
- 文档：本 change 和后续发布文档。
- 运行时：只在所有 clean 与 review 门禁通过后修改精确匹配的 Codex `26.5901.22334`；不修改 `~/.codex/config.toml`。
