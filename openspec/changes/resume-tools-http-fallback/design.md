# 设计：旧会话工具的 HTTP fallback

## 已确认调用链

```text
CodexExtensionLocator.locate()
  -> CodexPatchEngine.plan()
  -> patchExtensionSafeHost()
  -> OpenAI extension 创建 codex app-server
  -> Codex Core 读取 provider 配置
  -> Responses WS 或 HTTP POST
```

故障发生在最后一段：恢复压缩历史时，WS 请求的 `tools` 为空。Extension Host、权限、workspace root 和 shell snapshot 均已成功。

## 方案

1. 从 `$CODEX_HOME/config.toml` 或 `~/.codex/config.toml` 的顶层 `model_provider` 读取自定义 provider ID，并确认存在对应的裸键或 quoted key `[model_providers.<provider>]` 表。
2. 只接受字母、数字、下划线和连字符；内置保留 ID 或无法确认时不修改启动参数。
3. 仅对 `openai.chatgpt@26.721.41059` 的 app-server 启动参数追加：

```text
-c model_providers.<provider>.supports_websockets=false
```

4. Codex 继续使用同一 provider、认证和 Responses API，仅从 WebSocket 回退到 HTTP POST。
5. 新版 Codex 不应用该覆盖；升级得到 clean bundle 后自然恢复 WebSocket。

## 为什么不直接补工具表

工具路由、压缩历史重建和 Responses 请求由已编译的 Codex Core 负责。Local Groups 修改 JavaScript bundle 时无法可靠取得每个 turn 的原生工具定义。伪造 `exec` schema 会破坏工具执行协议和权限边界。

## 安全边界

- 不修改 `config.toml`。
- 不覆盖 Codex 保留的 `amazon-bedrock`、`openai`、`ollama`、`lmstudio` provider；强行重建可能改变认证、endpoint 或本地运行时。
- provider ID 不合法、配置缺失或 Codex 版本不匹配时 fail closed。
- provider 切换时原位更新已有覆盖；切换到内置 provider 或目标版本变化时移除旧覆盖。
- 不禁用 MCP、plugins、权限或 sandbox。

## 上游永久修复要求

Codex Core 应增加恢复压缩历史的回归测试：WS prewarm 与实际 `response.create` 必须基于当前 step context 构造工具；实际 turn 的工具表不得因 startup prewarm、resume 或 compacted history 变为空。
