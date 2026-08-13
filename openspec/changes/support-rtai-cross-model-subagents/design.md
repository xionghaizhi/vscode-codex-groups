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

### `26.5803.61601` V2 模式下的顶部面板缺失链

```text
用户启用 multi_agent_v2
  -> V2 subAgentActivity 仍生成正文 subagent-activity
  -> V2 membership canInteract=false
  -> Up membership store
  -> Cen: parentConversationId 过滤
  -> Een: canInteract=false 被排除
  -> visibleRows 为空
  -> xn 不渲染 _Rt 顶部面板
```

正文活动转换和 composer 顶部面板使用独立消费链。所以“对话中的样式存在”与“对话框上方的子 agent 面板存在”是两个门禁，不能互相替代。

## 决策

1. 用户正式配置属于用户所有；当前已按用户要求恢复为 `multi_agent=true`、`multi_agent_v2=true`，Local Groups 只读取必要信息，不写入或纠正 V1/V2 选择。
2. 不修改 `base_url`；当前请求已到 rtai 的 `/v1/responses`。
3. 不给 Grok/Kimi 增加 `multi_agent_version="v2"`。V1 模型覆盖无需该标记，且真实请求已验证成功。
4. 不增加本地请求代理。代理只能改 JSON 外形，无法安全解密 GPT 服务端返回的 V2 加密参数。
5. 26.5803 UI 必须继续同时消费 `collabAgentToolCall` 和 `subAgentActivity`。`src/patchEngine.js::codexUi265803PostconditionsHold()` 与 live verifier 检查各输入到展示类型的同分支转换，避免无关字符串误通过。
6. V1 仅作为隔离差分中已验证可给 Grok/Kimi 传递普通正文的参考模式，不得据此修改用户正式配置。
7. 不把 `canInteract=false` 改为 `true`，不修改 `Een` 过滤。该字段是上游交互语义，强制放宽会掩盖 provider 不兼容 V2 的真实问题。
8. 顶部面板自动门禁必须绑定当前语义全链：app main 生成 membership store `Up`，App Server / Power 中 `Cen` 按当前 parent 筛选并产生 `visibleRows`，`xn` 判定可见，最终把同一组 rows 交给 `_Rt`。新版压缩名可变，语义步骤不能缺。

## 现有代码复用与边界

- 复用 Codex Core 原生 V1 `spawn_agent`，不在 Local Groups 实现子线程协议。
- `src/codexConfig.js::configuredCustomModelProviderId()` 只负责只读识别自定义 provider，不扩展为配置写入器。
- `src/patchEngine.js::patchExtensionResponsesWebsocketFallback()` 是 `26.721.41059` 的恢复工具 HTTP fallback，和本问题无关，不扩大版本范围。
- `26.5803.41515` 调研快照中，`app-initial-CF-0nv_7.js` 的活动聚合同时识别 `collabAgentToolCall` 与 `subAgentActivity`；`app-initial-D-Ftjleg.js` 将前者转换为 `multi-agent-action`。
- `26.5803.61601` 中，`app-initial-BOIVXb2k.js` 负责 V1/V2 正文转换和 membership 生成，`app-initial-4D0dCZ-d.js` 负责 `Cen -> visibleRows -> xn -> _Rt` composer 顶部面板消费。

## 验证证据

| 场景 | 结果 |
| --- | --- |
| V2 + Grok | 原生子线程创建，约 21 秒后稳定返回 `422 ModelInput`。 |
| V2 + Kimi | 子线程创建，但任务正文不可见，未返回要求标记。 |
| V1 + Grok | 子线程模型 `grok-4.5`、版本 V1，收到普通 `input_text`，返回 `RESULT=OK`。 |
| V1 + Kimi | 子线程模型 `kimi-k3`、版本 V1，收到普通 `input_text`，返回 `RESULT=OK`。 |
| `26.5803.61601` 用户启用 V2 | 对话正文有子 agent 样式，但 membership 因 `canInteract=false` 被 `Een` 过滤，对话框上方面板缺失；作为已知上游行为记录，不擅自改配置。 |
| 隔离 V1 差分 | `multi_agent=true`、`multi_agent_v2=false` 时 Grok/Kimi 可收到普通正文；该证据不授权修改用户正式配置。 |

测试未修改正式模型目录、provider 地址或认证配置。曾未经充分确认把正式配置改成 V1，现已用改动前备份逐字恢复为用户原配置；以后禁止把配置模式切换纳入自动修复。

## 升级防复发

1. 先检查 Codex Core 的 V2 message schema，不能只看模型是否出现在覆盖列表。
2. 用同一 provider 做 V1/V2 差分，子线程必须实际读到指定任务并返回固定标记。
3. 检查 Webview 同时保留 V1 `collabAgentToolCall` 和 V2 `subAgentActivity` 正文消费链。
4. 在 official clean、patched clean 和 live 上分别检查 `Up -> Cen -> visibleRows -> xn -> _Rt` 全链；只有 `subagentsPanel` 字符串或正文 activity 不算通过。
5. 人工门禁必须同时看到对话框上方原生活动和对话中的子 agent 样式；`exec_command`、`codex exec` 或长时间 Running command 不算子 agent 成功。
6. 记录正式配置的只读快照和哈希；验证过程不得写 `config.toml`。需要 V1/V2 差分时使用隔离 `CODEX_HOME`，没有隔离条件则暂停并询问用户。
