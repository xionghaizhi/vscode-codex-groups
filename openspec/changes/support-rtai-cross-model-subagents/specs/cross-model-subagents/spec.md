# Cross-model Subagents Compatibility Specification

## ADDED Requirements

### Requirement: rtai cross-model agents use a compatible native protocol

当在隔离环境验证当前 rtai 自定义 provider 的 Grok 或 Kimi 子 agent 时，系统 MUST 区分不同原生协议的真实兼容结果，不得据此改写用户正式配置。

#### Scenario: spawn Grok from GPT

- **Given** provider 地址为现有 `https://rtai.jnrongtu.com/v1`
- **And** 原生 Multi-Agent V1 已启用
- **When** GPT 主线程用 `spawn_agent` 指定 `model="grok-4.5"`
- **Then** Grok 子线程收到普通文本任务
- **And** 子线程可完成任务并向父线程返回结果

#### Scenario: spawn Kimi from GPT

- **Given** provider 地址为现有 `https://rtai.jnrongtu.com/v1`
- **And** 原生 Multi-Agent V1 已启用
- **When** GPT 主线程用 `spawn_agent` 指定 `model="kimi-k3"`
- **Then** Kimi 子线程收到普通文本任务
- **And** 子线程可完成任务并向父线程返回结果

### Requirement: unverified V2 compatibility is fail closed

系统 MUST NOT 仅通过给 Grok/Kimi 增加 V2 模型目录标记来宣称跨模型兼容。

#### Scenario: provider cannot consume V2 agent messages

- **Given** V2 子线程请求包含 `agent_message/encrypted_content`
- **When** Grok 返回 `422 ModelInput` 或 Kimi 无法读取任务正文
- **Then** 兼容结论必须明确记录 V2 尚未通过
- **And** 不修改 rtai 地址、不伪造解密、不增加 V2 模型标记
- **And** 不切换用户正式配置到 V1

### Requirement: native subagent activity remains visible

Codex 26.5803 Webview MUST 保留 V1 `collabAgentToolCall` 与 V2 `subAgentActivity` 两种原生活动消费链。

#### Scenario: V1 child starts

- **When** GPT 通过 V1 创建 Grok 或 Kimi 子线程
- **Then** Webview 从 `collabAgentToolCall` 发现子线程
- **And** 对话框上方展示其活动和状态
- **And** shell 中的 `codex exec` 进程不得作为该门禁的替代证据

#### Scenario: transcript activity exists but the composer panel chain is broken

- **Given** V1 或 V2 事件已转换为对话正文 activity
- **When** membership store、当前 parent 筛选、`visibleRows`、面板可见判定或 `_Rt` 渲染任一步缺失
- **Then** patch postcondition 和 live verifier MUST fail closed
- **And** 对话正文中的子 agent 样式 MUST NOT 作为对话框上方面板的替代证据

#### Scenario: a new Codex bundle is adapted

- **Given** 当前 `26.5803.61601` 链路为 `Up -> Cen -> visibleRows -> xn -> _Rt`
- **When** 新版 bundle 的压缩名、分包或调用位置变化
- **Then** 适配必须按等价语义重新定位 membership 生成、当前 parent rows、可见 rows、面板判定和面板渲染
- **And** official clean、patched clean、live verifier 和 Reload 人工门禁必须分别通过

### Requirement: user-owned Multi-Agent configuration is not rewritten

Local Groups MUST NOT 因当前 rtai provider 的 V2 限制而改写用户的 V1/V2 选择，也 MUST NOT 通过改写上游 membership 交互语义来伪造面板可见。

#### Scenario: V2 membership is filtered from the composer panel

- **Given** 用户主动启用 `multi_agent_v2`，且 V2 membership 的 `canInteract=false`
- **And** `Een` 按 `canInteract` 排除该 membership
- **When** 对话正文仍显示 V2 `subagent-activity`
- **Then** Local Groups 只记录该上游限制，不改写 `config.toml`
- **And** 不修改 `canInteract`，不放宽 `Een`
- **And** Reload 后顶部面板未取得人工证据前，该 build 仍不能标记为通过

#### Scenario: V1 and V2 need comparison during an upgrade

- **When** 适配人员需要验证协议差异
- **Then** 必须使用隔离配置或先取得用户明确确认
- **And** 正式 `config.toml` 在验证前后保持逐字一致

### Requirement: Local Groups does not own provider credentials

Local Groups MUST NOT 为跨模型子 agent 写入、复制、记录或硬编码 Token。

#### Scenario: plan, apply, repair or verify

- **When** 用户运行任一 Local Groups 补丁流程
- **Then** 认证配置保持不变
- **And** verifier 只检查 bundle 契约，不读取或输出 Token
