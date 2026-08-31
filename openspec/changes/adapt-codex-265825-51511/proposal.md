# 适配 Codex 26.5825.51511

## Why

Marketplace linux-x64 预发布版已更新到 `openai.chatgpt@26.5825.51511`。现有 Local Groups 只精确支持 `26.5825.32147`，新 build 必须继续 fail closed，并按官方 clean bundle 的真实调用链重新适配和完整验收。

## What Changes

- 新增精确 `26.5825.51511` 支持；未知 build、带后缀版本和未来版本继续零规划、零写入。
- 为 Host、Header、Main/Power/Subagent、Server/History 增加独立 build variant。
- 同步更新 engine、external verifier、fixture/runtime、decoy 和 installed-artifact 门禁。
- 完整验证标题、分组、分组中新建会话、项目历史、子 agent 双展示、Sol Max/Ultra、启动与配置只读。

## Impact

- 代码：`src/patchEngine.js`、`scripts/verify-patched-bundles.js` 及相关测试。
- 文档：本 change、升级手册、README、CHANGELOG 和版本号。
- 运行时：只修改精确匹配的 Codex `26.5825.51511`；不修改 `~/.codex/config.toml`、Multi-Agent 配置或 `canInteract`。
