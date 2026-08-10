# Codex 26.5803 Compatibility Specification

## ADDED Requirements

### Requirement: the new split bundles remain fail-closed

Local Groups MUST 唯一定位 26.5803 的 Header、app main 和 App Server bundle，并且 MUST 只明确放行已验证的 `26.5803` minor。

#### Scenario: the new version is planned before adaptation

- **Given** active Codex 为 `26.5803.41515`
- **When** 旧版 Local Groups 执行 plan
- **Then** locator 唯一返回三个语义 bundle
- **And** 版本门禁阻止写入未验证的特性 bundle

### Requirement: metadata actions traverse the new host chain

设置标题、设置分组和在分组内新建会话 MUST 经新版 messenger 和 direct Extension Host callback 完成。

#### Scenario: all three Header actions are used

- **Then** Header 分别发送 `promptConversationTitle`、`promptConversationGroup`、`setPendingGroup` 和原生 `new-chat`
- **And** Extension Host 使用消息参数 `c` 和 Webview 参数 `e` 消费 Local Groups 消息

#### Scenario: messenger export contains a dollar-number name

- **Given** 新版 messenger 导出名为 `$1`
- **When** 已有 import 在二次 plan 中被校正
- **Then** patcher 必须按字面保留 `$1`
- **And** 不得把 `$1` 解释为 replacement capture group
- **And** 二次 plan 必须为 0 且生成 bundle 语法有效

### Requirement: project history and group limits survive new filters

Cloud/Local/Recent 分支变化 MUST NOT 破坏当前项目隔离或每分组独立展示上限。

#### Scenario: two long groups exist in the Recent filter

- **Then** 其他项目会话被过滤
- **And** 两组各显示最近 5 条
- **And** 展开第一组只把第一组增加到 15 条
- **And** active 会话额外保留且隐藏数正确

### Requirement: Sol and native subagents retain their contracts

Local Groups MUST 为 `gpt-5.6-sol` 保留 Max/Ultra，并 MUST NOT 给其他模型增加档位或恢复旧子 agent feature gate。

#### Scenario: Sol and Terra are compared

- **Then** Sol Power 和 Reasoning 菜单包含 Max/Ultra
- **And** Terra 保持上游档位
- **And** Sol Ultra 能通过模型校验和设置回读
- **And** 原生 subagent activity 和 panel 标记仍存在

### Requirement: the measured Webview watchdog remains version-scoped

26.5803 MUST 使用 120 秒启动预算，保留真实失败兜底；未知版本 MUST NOT 自动继承该补丁。

#### Scenario: Remote route mounting exceeds 30 seconds

- **Then** Webview 不得在 30 秒被覆盖
- **And** Reload 验收必须等待 route mount 和 ready
- **And** 120 秒预算不得被描述为启动必须等待 120 秒
