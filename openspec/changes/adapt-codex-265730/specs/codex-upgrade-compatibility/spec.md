# Codex 26.5730 Compatibility Specification

## ADDED Requirements

### Requirement: split app-initial bundles are located semantically

Local Groups MUST 唯一定位新版 app main、App Server、Statsig、request 和 local title 职责，MUST NOT 要求 `untitledThreadLabel` 与 `conversation.title` 位于同一 bundle。

#### Scenario: app-main semantics are split

- **Given** `untitledThreadLabel` 与模型设置、`conversation.title` 位于不同 `app-initial-*`
- **When** locator 扫描新版扩展
- **Then** app main 指向包含模型设置和 `conversation.title` 的 bundle
- **And** App Server、Statsig、request 与 local title 均指向各自唯一 bundle
- **And** 候选不唯一时停止适配

### Requirement: Webview startup budget covers measured healthy startup

新版 Codex MUST 区分资源加载失败和健康但缓慢的 Webview 启动。启动看门狗 MUST 大于已测量的健康 route mount 时间，并保留真正失败时的兜底；语法、module link、plan 和 verifier 通过 MUST NOT 代替真实 VSCode Webview `ready` 门禁。

#### Scenario: resources load before a slow healthy route mount

- **Given** 日志已出现 `React root render requested`
- **And** Remote VSCode 的健康 `app routes mounted` 需要超过 `30s`、但少于 `120s`
- **When** `26.5730` 启动 Codex Webview
- **Then** Extension Host 不得在 `30s` 覆盖 Webview
- **And** 必须等待 `app routes mounted` 和 `ready provider mounted`
- **And** 日志不得出现 `Webview did not finish starting`

#### Scenario: a future upgrade changes the startup watchdog

- **Given** 新版修改了 timeout 锚点、时长或 ready 调用链
- **When** 维护者执行升级适配
- **Then** 必须重新测量 clean 与 patched 的 root render、route mount 和 ready 时间线
- **And** 必须为该版本增加精确回归与 verifier 后置条件
- **And** 不得删除看门狗或把 `120s` 补丁盲目扩展到未知版本

#### Scenario: clean Webview does not finish starting

- **Given** 超过版本限定的启动预算后仍没有 `app routes mounted` 和 `ready provider mounted`
- **When** 维护者评估新版是否可用
- **Then** 新版不得成为 active Codex
- **And** 必须回退上一个已验证版本
- **And** OpenSpec 必须保留失败时间线和未完成 UI 验收

### Requirement: locator follows the active VSCode registry entry

Local Groups MUST 优先定位 `extensions.json` 中 active 的 `openai.chatgpt`，MUST NOT 因回退后残留的更高版本目录操作未启用扩展。

#### Scenario: a newer inactive directory remains after rollback

- **Given** 扩展目录同时存在 26.5730 和 26.727
- **And** VSCode active registry 指向 26.727
- **When** Local Groups 执行 plan、apply 或 verifier
- **Then** 目标必须是 active 26.727
- **And** 26.5730 目录只保留取证，不参与当前 patch

### Requirement: metadata actions traverse the new host callback

标题、分组和分组内新建会话 MUST 使用语义定位的 messenger，并由新版 Extension Host direct webview callback 消费。

#### Scenario: all three Header actions are used

- **When** 用户分别点击设置标题、设置分组和在此分组新建会话
- **Then** Header 发出 `promptConversationTitle`、`promptConversationGroup` 和 `setPendingGroup`
- **And** 分组内新建会话继续投递原生 `new-chat`
- **And** Extension Host 打开对应输入控件或保存 pending group

### Requirement: project history remains isolated and fail closed

新版项目历史 MUST 独立分页读取当前 root 及子目录会话，MUST NOT 扩大共享 recent store 或在 root 未就绪时显示其他项目数据。

#### Scenario: current workspace root is ready

- **When** Header 加载项目历史
- **Then** worker manager 使用分页历史能力
- **And** 代理 manager 可回退原生 `listAllThreads()`
- **And** 结果只包含 root 及子目录

#### Scenario: root or manager is unavailable

- **When** root 未就绪、manager 缺失、查询失败或能力不可确认
- **Then** Header 返回空项目历史
- **And** 不显示其他项目数据

### Requirement: final grouping and menu contracts survive the upgrade

新版 MUST 保留每分组独立 5/+10/15/5、active 额外保留、实际隐藏数、sticky 项目标题和实际 600px 高度。

#### Scenario: two long groups are shown

- **When** 两组都超过 15 条且只展开第一组
- **Then** 第一组按 5 -> 15 -> 25 变化
- **And** 第二组仍保持 5 条
- **And** 收起到 15/5、active 保留和隐藏数正确

### Requirement: Sol Max Ultra and native subagents remain available

Local Groups MUST 为 `gpt-5.6-sol` 补齐 Power 和实际 Reasoning 菜单的 Max/Ultra，同时 MUST 保留新版原生子 agent 能力且不恢复旧 feature gate。

#### Scenario: Sol and another model are compared

- **When** 后端 supported efforts 未列出 Sol Max/Ultra
- **Then** Sol 菜单仍显示 Max/Ultra
- **And** 其他模型不增加 Max/Ultra
- **And** Sol Ultra 可写入并回读
- **And** 子 agent 活动和面板仍由新版原生链路提供
