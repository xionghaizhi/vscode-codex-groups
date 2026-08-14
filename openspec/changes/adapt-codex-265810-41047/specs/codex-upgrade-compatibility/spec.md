# Codex 26.5810.41047 Compatibility Specification

## ADDED Requirements

### Requirement: new minor is explicitly allowlisted after contract verification

Local Groups MUST 在完成 26.5810 bundle 定位、调用链和回归后，才把 `26.5810` 加入安全 plan 白名单。未知 minor MUST 继续 fail closed。

#### Scenario: unsupported newer minor remains closed

- **Given** Codex 版本为 `26.5811.1`
- **When** 执行 safe plan
- **Then** 错误包含 `不支持的 Codex 扩展版本：26.5811.1`
- **And** 不写入任何 bundle

#### Scenario: 26.5810 is planned after dedicated patches exist

- **Given** official clean `26.5810.41047`
- **When** 执行 safe plan
- **Then** 规划且只规划 extension host、Header、app main/statsig、App Server 四个文件
- **And** errors 为空

### Requirement: 26.5810 uses dedicated anchors instead of 26.5803 compressed names

26.5810 patch MUST 使用本版唯一业务锚点。它 MUST NOT 复用 `Be`、`triggerButton:J`、`function POt`、`function _Xe(){return vXe(` 或旧 `this.onTimeout()},3e4))}dispose()`。

#### Scenario: header compressed names drifted

- **Then** 项目行使用 `F.map` / `An` / `y` / `i` / `u`
- **And** 打开页 `Bn` 使用 `desktopDeepLinkConversationId:s` 与 `title:c`
- **And** 行组件为 `pt`
- **And** 菜单触发为 `triggerButton:oe`

#### Scenario: Power only adds missing Max

- **Given** 上游已有唯一 `gpt-5.6-sol:ultra` 对象 `Lon`
- **When** 应用 Power patch
- **Then** `Ion` 在 `xhigh` 后增加 `gpt-5.6-sol:max`
- **And** Ultra 对象仍只有一处
- **And** `Pon([...Ion,Lon].filter` 使 Ultra 进入菜单
- **And** 不新增第二个 Ultra 条目

### Requirement: jP watchdog is version-scoped to 120 seconds

`26.5810` MUST 把唯一 `jP` 启动看门狗从 30 秒改为 120 秒。锚点漂移 MUST fail closed。

#### Scenario: unique jP timeout is patched

- **Given** clean `this.onTimeout({...,timeoutMs:3e4})},3e4)`
- **When** 应用 safe host patch
- **Then** 同一处变为 `timeoutMs:12e4})},12e4)`
- **And** 其他 `timeoutMs:3e4` 不改

#### Scenario: jP timeout anchor disappears

- **Given** 该唯一字符串不存在或出现多次
- **When** 执行 plan
- **Then** 错误包含 `extension webview startup timeout 26.5810`
- **And** 不把 30 秒看门狗写成 120 秒

### Requirement: title dual consumers stay aligned

同一 conversation 的最近会话下拉与打开页左上角 MUST 使用同一本地非空标题；缺失或空白时 MUST 回退原生标题。

#### Scenario: local title wins on both surfaces

- **Given** 本地 title 非空且与原生 `thread_name` 不同
- **Then** 下拉 `titleOverride` 与 `Bn` 都显示本地 title
- **And** 不写原生 thread title

#### Scenario: opened title hook is incomplete

- **Given** marker 在但 override、refresh 订阅或 cleanup 任一缺失
- **When** 执行 plan 或 verifier
- **Then** fail closed

### Requirement: V1 and V2 subagent chains remain native

26.5810 MUST 保留 `dyn/uyn/lJ as FT -> DOr/AOr/OOr -> visibleRows -> aNr -> xzn`。Local Groups MUST NOT 为了让顶部面板出现而改用户配置或 `canInteract`。

#### Scenario: transcript producer and composer panel are verified separately

- **Then** V1 `collabAgentToolCall` 与 V2 `subAgentActivity` 转换都存在
- **And** composer 验证 `AOr`/`OOr`/`xzn`/`composer.backgroundSubagents.summary`
- **And** 删除任一段时 verifier fail closed

### Requirement: user config is never rewritten during upgrade

适配前后 MUST 校验 `config.toml` 由用户或用户明确操作拥有。Local Groups MUST NOT 写入、重排或覆盖该文件。

#### Scenario: feature flags stay user-owned

- **Then** 适配代码路径不打开 `config.toml` 写入
- **And** 不得把 `multi_agent` / `multi_agent_v2` / `model` 当成可纠正漂移
