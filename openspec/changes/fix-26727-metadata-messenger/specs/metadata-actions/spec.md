# Metadata Actions Compatibility Specification

## ADDED Requirements

### Requirement: messenger discovery is semantic

Local Groups MUST 按 singleton 和消息能力定位 Header 使用的 VSCode messenger，MUST NOT 仅按压缩导出名推断对象用途。

#### Scenario: Codex bundle symbols change

- **Given** 新版 Codex 改变 `app-initial-*` 导出名或对象用途
- **When** Local Groups 规划 Header 补丁
- **Then** 候选对象由 `getInstance()` singleton 产生
- **And** 候选对象同时具备 `dispatchMessage()` 和 `dispatchHostMessage()` 调用证据
- **And** 候选不唯一或不存在时停止写入

### Requirement: all metadata actions reach their native destinations

Header 的标题、分组和分组内新会话操作 MUST 通过真实 messenger 到达 extension host 或原生 host 订阅。

#### Scenario: set a conversation title

- **When** 用户点击“设置标题”
- **Then** webview 发出 `promptConversationTitle`
- **And** extension host 打开标题输入框

#### Scenario: set a conversation group

- **When** 用户点击“设置分组”
- **Then** webview 发出 `promptConversationGroup`
- **And** extension host 打开分组选择框

#### Scenario: start a conversation in a group

- **When** 用户点击“在此分组新建会话”
- **Then** webview 发出 `setPendingGroup`
- **And** 原生 host 收到 `new-chat`

### Requirement: incorrect live imports are upgradeable

Local Groups MUST 在 Header marker 早退前检查 messenger import，使已安装的错误补丁可以原地修复。

#### Scenario: v0.0.49 Header imports qQ as messenger

- **Given** 26.727 Header 已包含 Safe Header marker
- **And** Header 错误导入 `qQ as codexLocalGroupsMessengerImport`
- **When** v0.0.50 规划补丁
- **Then** 只规划 Header import 修复
- **And** 修复后再次规划为零变更

### Requirement: upgrade validation includes real UI actions

Codex 新版本适配 MUST 在 Reload 后人工验证三个入口，不得只依赖 marker 或字符串断言。

#### Scenario: complete a Codex upgrade

- **When** 自动测试、语法检查、幂等和 verifier 全部通过
- **Then** 仍需人工点击设置标题、设置分组和分组内新建会话
- **And** 三个入口均成功后才能标记适配完成
