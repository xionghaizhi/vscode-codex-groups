# 恢复旧会话时保留终端工具

## 背景

`openai.chatgpt@26.721.41059` 内置的 `codex-cli 0.146.0-alpha.3.1` 在恢复经过历史压缩的旧会话时，Responses WebSocket 请求可能发送空工具表。相同历史改走 HTTP POST 可以正常执行终端工具，纯官方扩展也可复现。

## 目标

- 为已确认的 Codex 版本提供可回滚的 HTTP fallback，避免恢复旧会话后丢失 `exec`、`apply_patch`。
- 不写入用户的 `config.toml`，不修改会话历史，不伪造工具定义。
- 保留 OpenAI 后续版本修复后的 WebSocket 能力。

## 非目标

- 不在 JavaScript bundle 中重写 Codex Core 的工具注册或 Responses 协议。
- 不把 Codex Local Groups、MCP、Extension Host 或 VS Code 远程 WS 视为根因。
- 不为无法安全覆盖的内置 provider 构造替代配置。

## 影响范围

- `src/patchEngine.js`：为受影响版本的 app-server 启动参数增加 provider 级 `supports_websockets=false`。
- `src/codexConfig.js`：只读解析当前自定义 provider ID。
- VS Code 与 CLI patch 入口：把 provider ID 传给 patch engine。
- 测试、升级手册、README 和版本记录。
