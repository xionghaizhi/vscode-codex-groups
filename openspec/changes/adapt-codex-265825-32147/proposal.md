# 适配 Codex 26.5825.32147

## Why

官方 linux-x64 预发布版已更新到 `openai.chatgpt@26.5825.32147`。Local Groups 当前只精确支持到 `26.5818.41705`，因此新版必须先保持 fail closed，再按真实 producer/consumer 调用链完成独立适配，不能复用旧压缩符号或只验证页面能启动。

既有升级规范还留下测试临时产物自动清理任务。该门禁未完成前，新版适配不能标记完成。

## What Changes

- 新增精确 `26.5825.32147` 支持，未知 build、未来 minor 和带后缀版本继续零规划、零恢复、零写入。
- 重新确认 Host、Header、Main、Power、子 agent、Server/History 的真实 bundle、producer、consumer 和作用域。
- 保留本地标题双消费、分组列表、新建会话分组、项目历史、子 agent 双展示、Sol Max/Ultra 和 safe-host 边界。
- 为 engine、external verifier、fixture/runtime 和 decoy 补充同一份 5825 契约。
- 完成测试及升级工作流临时产物的所有权登记与 guaranteed cleanup。
- 在 official clean、patched clean 和 live 安装上执行完整回归矩阵，并把证据写回 OpenSpec 与升级手册。

## Impact

- 代码：`src/extensionLocator.js`、`src/patchEngine.js`、`scripts/verify-patched-bundles.js`、测试运行器与相关回归。
- 文档：本 change、`docs/codex-upgrade-playbook.md`、README、CHANGELOG 和版本号。
- 运行时：只修改精确匹配的 Codex `26.5825.32147` 安装目录；不修改用户 `~/.codex/config.toml`、Multi-Agent V1/V2 选择或 Codex 原生 thread title。

