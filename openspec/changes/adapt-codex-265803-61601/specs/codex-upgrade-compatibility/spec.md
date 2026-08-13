# Codex 26.5803.61601 Compatibility Specification

## ADDED Requirements

### Requirement: same-minor build remangling remains fail-closed

Local Groups MUST 在不依赖压缩函数名的前提下适配 `26.5803.61601`，并 MUST 继续支持上一 `26.5803.41515` build。

#### Scenario: model selector symbol changes

- **Given** 模型选择函数仍接收 `userSavedModelString`、`userSavedReasoningEffort` 和 `listModelsData`
- **And** 压缩函数名从 `tBe` 变为 `iBe`
- **When** Local Groups 执行 clean plan
- **Then** marker 按唯一业务签名插入
- **And** 不修改上游函数名或默认模型逻辑
- **And** 零处或多处匹配时停止写入

#### Scenario: previous build is planned

- **Given** clean Codex 为 `26.5803.41515`
- **When** 同一 patcher 执行 plan/apply/plan
- **Then** 原 `tBe` fixture 仍通过
- **And** 生成 marker 和后置条件与新版相同

### Requirement: unchanged bundle contracts are reused

纯 Vite hash 和压缩符号变化 MUST NOT 触发 Header、Extension Host、项目历史或 Power/Reasoning 的重复实现。

#### Scenario: latest bundles are located

- **Then** Header 唯一定位为 `header-C4MbtUfx.js`
- **And** app main 唯一定位为 `app-initial-BOIVXb2k.js`
- **And** App Server / Power 唯一定位为 `app-initial-4D0dCZ-d.js`
- **And** first plan 只有四个既有安全补丁目标

### Requirement: user-facing group actions remain end-to-end

设置标题、设置分组、新建分组和在分组内新建会话 MUST 继续通过真实 messenger 与 Extension Host 消息桥工作。

#### Scenario: all metadata actions are used after Reload

- **Then** Header 发出 `promptConversationTitle`、`promptConversationGroup`、`setPendingGroup` 和原生 `new-chat`
- **And** metadata 保存后当前行和项目历史刷新
- **And** 最近会话仍只包含当前 root 和子目录

### Requirement: local titles remain consistent after opening a conversation

同一个 local conversation MUST 在最近会话和打开页左上角使用同一标题优先级。Local Groups MUST NOT 为实现展示一致性而修改 Codex 原生 thread title。

#### Scenario: local and native titles differ for the same conversation

- **Given** 同一 conversation ID 的本地 metadata title trim 后非空
- **And** Codex 原生 `thread_name` 与本地 title 不同
- **When** 用户在最近会话查看并打开该 conversation
- **Then** 最近会话行和打开页左上角都显示本地 title
- **And** app main selector 与原生 `thread_name` 保持不变
- **And** 不写 `session_index.jsonl`，不调用原生 thread rename

#### Scenario: local title is absent or blank

- **Given** 本地 metadata title 缺失或 trim 后为空
- **When** 用户打开该 conversation
- **Then** 最近会话行和打开页左上角都显示 Codex 原生 title
- **And** 两处仍指向同一个 conversation ID

#### Scenario: title metadata is saved while the conversation is open

- **Given** 用户正在查看 local conversation
- **When** Extension Host 返回 `metadataSaved`
- **Then** 既有 `codex-local-groups-refresh` 事件使最近会话 dropdown 和 Header `Bn` 都立即重渲染
- **And** 用户不需要 Reload 或重新进入 conversation

#### Scenario: a new Codex bundle changes either title consumer

- **Given** 下载了新的 official clean Codex bundle
- **When** Local Groups 执行升级适配
- **Then** clean fixture、plan、postcondition 和 verifier 同时验证最近会话标题消费者与打开页 Header `Bn`
- **And** 标题覆盖、刷新订阅、监听清理或唯一锚点任一缺失时停止写入
- **And** Reload 人工门禁必须点击同一 conversation 对比最近会话文字与左上角文字

### Requirement: Sol and both native subagent activity formats survive the build update

Local Groups MUST 保留 Sol Max/Ultra 完整链路，并 MUST 同时保留 V1/V2 原生子 agent 活动消费格式。

#### Scenario: patched bundles are verified

- **Then** Sol Power、Reasoning 菜单、写入、回读和校验包含 Max/Ultra
- **And** 其他模型保持上游档位
- **And** app main 在同一 V1 分支把 `collabAgentToolCall` 转为 `multi-agent-action`
- **And** app main 在同一 V2 分支把 `subAgentActivity` 转为 `subagent-activity`

### Requirement: a silent Remote install is validated before fallback

Remote CLI 没有输出时，系统 MUST NOT 立即把它判定为失败并覆盖目标目录或 registry。

#### Scenario: install continues after the invoking shell is stopped

- **When** 新版目录或 active registry 随后出现
- **Then** 先验证官方 package、标准 VSIX 元数据、文件完整性和关键哈希
- **And** 只有安装任务完全退出且没有有效安装时才允许手工兜底

### Requirement: automated checks do not replace Reload acceptance

适配完成 MUST 包含新版真实 Webview 的启动时间线和业务 UI 人工验收。

#### Scenario: automated plan and verifier pass

- **Then** 仍需 Reload 并记录 root render、route mount、ready 和 timeout
- **And** 仍需验证最近会话、独立分组上限、三个 metadata 操作、Sol Max/Ultra、原生子 agent 和 Check Status

### Requirement: the known regression matrix is one release gate

每个新 Codex build MUST 一次性完成全部已知兼容矩阵，而不是只验证本轮刚发现或刚修改的功能。

#### Scenario: a new Codex build is adapted

- **Given** 升级手册列出了启动、定位与安全、项目历史、分组列表、四个 metadata 入口、标题双消费、Sol、子 agent、安装和状态检查矩阵
- **When** 适配人员准备修改 live bundle
- **Then** fixture/unit、official clean 和 patched clean 的全部适用项必须已有 PASS 证据
- **And** 不适用项必须记录 N/A 和理由，不能留空

#### Scenario: the adaptation is declared complete

- **When** 适配人员准备发布或宣称新版适配完成
- **Then** live verifier 和 Reload 人工列的全部适用项必须已有 PASS 证据
- **And** 任一项 pending、失败或缺证据时不得标记完成
- **And** 新发现的遗漏必须加入矩阵并重跑全部适用项，不能只验证该遗漏

### Requirement: user Codex configuration remains unchanged

Local Groups 的 plan、apply、repair、verify 和升级适配 MUST NOT 改写用户 `config.toml`。

#### Scenario: compatibility needs a V1/V2 comparison

- **When** 需要比较不同 Multi-Agent 模式
- **Then** 使用隔离配置或先取得用户明确确认
- **And** 正式 `config.toml` 的内容哈希和 mtime 在验证前后保持不变
