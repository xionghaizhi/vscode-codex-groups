# Cross-model Subagents Compatibility Specification

## ADDED Requirements

### Requirement: rtai cross-model agents use a compatible native protocol

当 GPT 主线程通过当前 rtai 自定义 provider 显式创建 Grok 或 Kimi 子 agent 时，系统 MUST 使用已通过真实请求验证的原生子 agent 协议。

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
- **Then** 兼容基线保持 V1
- **And** 不修改 rtai 地址、不伪造解密、不增加 V2 模型标记

### Requirement: native subagent activity remains visible

Codex 26.5803 Webview MUST 保留 V1 `collabAgentToolCall` 与 V2 `subAgentActivity` 两种原生活动消费链。

#### Scenario: V1 child starts

- **When** GPT 通过 V1 创建 Grok 或 Kimi 子线程
- **Then** Webview 从 `collabAgentToolCall` 发现子线程
- **And** 对话框上方展示其活动和状态
- **And** shell 中的 `codex exec` 进程不得作为该门禁的替代证据

### Requirement: Local Groups does not own provider credentials

Local Groups MUST NOT 为跨模型子 agent 写入、复制、记录或硬编码 Token。

#### Scenario: plan, apply, repair or verify

- **When** 用户运行任一 Local Groups 补丁流程
- **Then** 认证配置保持不变
- **And** verifier 只检查 bundle 契约，不读取或输出 Token
