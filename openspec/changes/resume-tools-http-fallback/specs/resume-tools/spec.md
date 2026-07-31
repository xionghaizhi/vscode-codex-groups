# Resume Tools Compatibility Specification

## ADDED Requirements

### Requirement: affected custom providers use HTTP fallback

当 OpenAI 扩展版本为 `26.721.41059`，且顶层 `model_provider` 是可确认的自定义 provider 时，Local Groups 安全补丁 MUST 为 app-server 增加该 provider 的 `supports_websockets=false` CLI 覆盖。

#### Scenario: resume compacted history

- **Given** 旧会话包含 `compacted` 历史
- **And** 当前 provider 原本支持 Responses WebSocket
- **When** 用户应用补丁并 Reload Window
- **Then** app-server 使用同一 provider 的 HTTP POST
- **And** 恢复后的 turn 仍可获得并执行原生终端工具

### Requirement: user configuration remains unchanged

Local Groups MUST NOT 为了 fallback 写入、重排或覆盖 `config.toml`。

#### Scenario: patch planning and application

- **When** 用户执行 plan、apply 或 repair
- **Then** 只修改已纳入备份和回滚机制的 OpenAI extension bundle
- **And** `config.toml` 内容和 mtime 不变

### Requirement: fallback is version and provider scoped

Local Groups MUST 只对已确认的版本和自定义 provider 应用 transport 覆盖，其他情况保持原启动参数。

#### Scenario: unsupported provider identity

- **Given** provider ID 缺失、位于非顶层、没有对应自定义 provider 表、属于内置保留 ID 或包含不安全字符
- **When** Local Groups 规划补丁
- **Then** 不增加 transport 覆盖
- **And** 不猜测 provider ID

#### Scenario: Codex version changes

- **Given** OpenAI extension 版本不是 `26.721.41059`
- **When** Local Groups 规划补丁
- **Then** 不增加本兼容覆盖

#### Scenario: configured provider changes

- **Given** bundle 已包含旧自定义 provider 的 transport 覆盖
- **When** 顶层 provider 改为另一自定义 provider
- **Then** Local Groups 原位替换为当前 provider 的唯一覆盖
- **And** 顶层 provider 不再可覆盖时移除旧覆盖

### Requirement: native tool protocol is not reimplemented

Local Groups MUST NOT 伪造 `exec`、`apply_patch` 或其他工具 schema，MUST NOT 修改权限和 sandbox 契约。

#### Scenario: native tools remain owned by Codex Core

- **When** Local Groups 应用 HTTP fallback
- **Then** Local Groups 不创建或修改任何原生工具定义
- **And** Codex Core 继续负责工具注册、权限和执行
