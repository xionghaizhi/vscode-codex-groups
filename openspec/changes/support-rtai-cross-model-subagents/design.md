# 设计：rtai 跨模型原生子 agent 兼容

## 已确认调用链

### V2 失败链

```text
GPT spawn_agent(message)
  -> multi_agents_spec.rs::spawn_agent_common_properties_v2().with_encrypted()
  -> multi_agents_v2.rs::communication_from_tool_message()
  -> child input: agent_message + encrypted_content
  -> https://rtai.jnrongtu.com/v1/responses
  -> Grok: 422 ModelInput / Kimi: 任务正文不可见
```

### V1 成功链

```text
GPT multi_agent_v1.spawn_agent(message, model)
  -> multi_agents/spawn.rs::handle_spawn_agent()
  -> multi_agents_common.rs::parse_collab_input()
  -> child input: message + input_text
  -> https://rtai.jnrongtu.com/v1/responses
  -> Grok/Kimi: RESULT=OK
```

## 决策

1. 当前自定义 provider 使用 `multi_agent=true`、`multi_agent_v2=false`。
2. 不修改 `base_url`；当前请求已到 rtai 的 `/v1/responses`。
3. 不给 Grok/Kimi 增加 `multi_agent_version="v2"`。V1 模型覆盖无需该标记，且真实请求已验证成功。
4. 不增加本地请求代理。代理只能改 JSON 外形，无法安全解密 GPT 服务端返回的 V2 加密参数。
5. 26.5803 UI 必须继续同时消费 `collabAgentToolCall` 和 `subAgentActivity`。`src/patchEngine.js::codexUi265803PostconditionsHold()` 与 live verifier 检查各输入到展示类型的同分支转换，避免无关字符串误通过。

## 现有代码复用与边界

- 复用 Codex Core 原生 V1 `spawn_agent`，不在 Local Groups 实现子线程协议。
- `src/codexConfig.js::configuredCustomModelProviderId()` 只负责只读识别自定义 provider，不扩展为配置写入器。
- `src/patchEngine.js::patchExtensionResponsesWebsocketFallback()` 是 `26.721.41059` 的恢复工具 HTTP fallback，和本问题无关，不扩大版本范围。
- `26.5803.41515` 调研快照中，`app-initial-CF-0nv_7.js` 的活动聚合同时识别 `collabAgentToolCall` 与 `subAgentActivity`；`app-initial-D-Ftjleg.js` 将前者转换为 `multi-agent-action`。

## 验证证据

| 场景 | 结果 |
| --- | --- |
| V2 + Grok | 原生子线程创建，约 21 秒后稳定返回 `422 ModelInput`。 |
| V2 + Kimi | 子线程创建，但任务正文不可见，未返回要求标记。 |
| V1 + Grok | 子线程模型 `grok-4.5`、版本 V1，收到普通 `input_text`，返回 `RESULT=OK`。 |
| V1 + Kimi | 子线程模型 `kimi-k3`、版本 V1，收到普通 `input_text`，返回 `RESULT=OK`。 |

测试未修改正式模型目录、provider 地址或认证配置。当前正式配置原本已是 V1 兼容状态。

## 升级防复发

1. 先检查 Codex Core 的 V2 message schema，不能只看模型是否出现在覆盖列表。
2. 用同一 provider 做 V1/V2 差分，子线程必须实际读到指定任务并返回固定标记。
3. 检查 Webview 同时保留 V1 `collabAgentToolCall` 和 V2 `subAgentActivity` 消费链。
4. 人工门禁必须看到对话框上方原生活动；`exec_command`、`codex exec` 或长时间 Running command 不算子 agent 成功。
