# 适配 Codex 26.5908.31748

## Why

官方 linux-x64 已更新到 `openai.chatgpt@26.5908.31748`。现有 Local Groups 只精确支持到 `26.5903.61454`。新版仍是五 bundle 拆包，但 Host、Header、Main、Power、Server 的压缩符号和部分调用参数均已漂移，旧版补丁会按设计 fail closed。

## What Changes

- 新增精确 `26.5908.31748` 白名单；未知 build、后缀版本和未来 minor 继续零写入失败。
- 按官方 clean VSIX 的真实调用链适配 Host、Header、Main、Power、Server/History。
- 保留标题即时回显、标题一致性、设置分组、分组内新建会话、项目历史、子 agent 展示和 Sol/Astra Max/Ultra。
- 同步 external verifier、fixture、运行时负例与 official clean 门禁。
- 不修改 `~/.codex/config.toml`、multi-agent、provider 或用户模型配置。

## Impact

- 代码：`src/patchEngine.js`、`scripts/verify-patched-bundles.js` 及相关测试。
- 文档：本 change、CHANGELOG、README、升级手册。
- 运行时：仅精确匹配 `26.5908.31748` 时写入；既有版本行为不变。
