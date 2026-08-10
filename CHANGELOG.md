# Changelog

## v0.0.54 - 2026-08-10

### Compatibility

- 适配官方 linux-x64 预发布版 `openai.chatgpt@26.5803.41515` 的 Header 新过滤分支、`hostId` row cache、项目历史 Hook、模型校验和 Power/Reasoning 锚点。
- 保留当前项目及子目录隔离、每分组 5/+10/15/5、600px 菜单、本地标题、需求分组、分组内新建会话、Sol Max/Ultra 和新版原生子 agent。
- 仅对已验证的 `26.5803` 延续 120 秒 Webview 看门狗；未知版本继续 fail closed。

### Fixed

- 修复新版 messenger 导出名 `$1` 在幂等 plan 中被 JavaScript replacement string 误解释为捕获组、从而生成非法 import 的问题；现用 replacement callback 保留字面导出名。
- verifier 增加 26.5803 的 messenger、execution target、Header cache、项目历史、Power、Reasoning、启动看门狗和原生子 agent 后置条件。

### Startup evidence

- 旧版 `61,906ms` 是 `26.5730` Webview 从 React root 请求到 route mount 的真实上游耗时；120 秒补丁只避免 30 秒误杀，不会让上游初始化变快。
- 当前 clean `26.5803` 在同一 Remote 环境为 `34,566ms`，随后约 20ms 进入 ready；主要等待仍发生在上游 Webview route mount 之前，不在 Local Groups metadata、Header 或项目历史补丁中。

## v0.0.53 - 2026-08-07

### Fixed

- 修复 Codex `26.5730.61639` 在 Remote VSCode 中启动约 65 秒、却被新版固定 30 秒 Webview 超时提前覆盖的问题。
- `CodexPatchEngine` 仅对 `26.5730` 将 Webview 启动保护延长到 120 秒，保留真正启动失败时的错误兜底。
- verifier 新增 120 秒补丁和旧 30 秒锚点检查；隔离 clean bundle 应用、幂等、语法和 verifier 验证通过。
- Reload 日志确认 `app routes mounted after 61906ms`，随后 `ready provider mounted`，且没有 `Webview did not finish starting`；当前 active Codex 已恢复为 `26.5730.61639`。

## v0.0.52 - 2026-08-07

### Fixed
- 回退当前启用的 Codex 到已验证的 `26.727.40816`；`26.5730.61639` 的 clean Webview 在应用 Local Groups 补丁前已经无法完成启动。
- locator 优先读取 VSCode `extensions.json` 中的 active `openai.chatgpt` 记录，不再因扩展目录残留的更高版本选择到未启用或已回退的 Codex。

### Verification
- 新增“高版本目录仍存在、active registry 已回退”的定位回归；当前 active 26.727 二次 plan 为 0，verifier 通过。
- `Codex.log` 显示 clean 26.5730 在 00:20:46 已超时，首次 Local Groups backup 在 00:23:52 才创建，排除本次 bundle patch 是首次启动失败原因。
- compile、lint、181 tests 和 `git diff --check` 通过；`vscode-codex-groups-0.0.52.vsix` 已安装，安装目录 compile、plan 0 和 verifier 通过。

## v0.0.51 - 2026-08-06

### Compatibility
- 适配官方预发布版 `openai.chatgpt@26.5730.61639` 的 split app-main、Header、Extension Host、项目历史和 Power/Reasoning 锚点。
- app-main 定位不再要求 `untitledThreadLabel` 与 `conversation.title` 位于同一 bundle；候选不唯一时仍 fail closed。
- 保留当前项目及子目录隔离、每分组 5/+10/15/5、active 会话保留、600px 菜单、本地标题、需求分组和分组内新建会话。
- 为 5.6 Sol 补齐 Max/Ultra Power、实际 Reasoning 菜单和模型校验；新版原生子 agent 链路保持不变。

### Safety
- Extension Host 消息桥兼容新版 `handleMessage(e,c)` 回调，Header messenger 与 execution target 继续按真实实现和导出表唯一定位。
- 项目历史继续使用独立分页查询与本地严格过滤，不扩大共享 recent store；`26.721.41059` 专用 HTTP fallback 不扩展到新版。
- 未验证版本继续 fail closed，marker 后置条件、clean backup、语法、幂等和事务回滚门禁保持不变。

### Verification
- 新增 `26.5730` split locator、三个 metadata 操作、项目分页隔离、Sol Max/Ultra、幂等和 verifier 回归。
- 官方 clean 副本完成 4 个预期 bundle 的 plan/apply/plan，7 个 Node 语法检查和 verifier 均通过。
- compile、lint、180 tests 和 `git diff --check` 通过；live 二次 plan 为 0，`vscode-codex-groups-0.0.51.vsix` 已安装且安装目录 verifier 通过。

## v0.0.50 - 2026-08-04

### Fixed
- 修复 Codex 26.727 的“设置标题”“设置分组”“在此分组新建会话”同时无响应。
- 不再把 `qQ` 实时语音状态误当 VSCode messenger；改为按 singleton、`dispatchMessage()` 和 `dispatchHostMessage()` 语义唯一定位消息桥。
- 支持把 v0.0.49 已写入 live Header 的错误 messenger import 原地升级，不因已有 Header marker 跳过修复。

### Verification
- 新增三个操作的消息反馈环、错误 import 升级、幂等和真实 bundle verifier 回归。

## v0.0.49 - 2026-07-31

### Compatibility
- 适配 `openai.chatgpt@26.727.40816` 的新 Header、App Server、Power Picker 和 Reasoning bundle 锚点。
- Safe Header marker 升级到 v15，项目历史 marker 升级到 v5，保留当前窗口项目隔离、每组 5/+10/15/5、600px 菜单和本地标题即时刷新。
- 新版 Codex 已原生启用子 agent 链路；仅补齐 5.6 Sol 的 Max/Ultra Power 与 Reasoning 选项，并保留设置校验结果。

### Safety
- `26.721.41059` 专用 Responses WebSocket HTTP fallback 不扩展到 `26.727.40816`。
- 新增 `26.727` split bundle、Max/Ultra 行为、幂等和 verifier 回归；未验证的后续 minor 版本继续 fail closed。

## v0.0.48 - 2026-07-28

### Fixed
- 为 `openai.chatgpt@26.721.41059` 恢复压缩历史时丢失原生工具的问题增加 HTTP fallback。
- 对可确认的自定义 provider，在 app-server 启动参数中覆盖 `supports_websockets=false`；不写入用户 `config.toml`。
- 修正 v0.0.47 标题刷新补丁：最近会话原生状态中的原标题优先于 `threadSummary`，现改用非字符串 `titleOverride` 显示本地标题。

### Safety
- 仅处理顶层、安全格式的自定义 provider ID；配置缺失、内置 provider 或其他 Codex 版本保持原行为。
- 不伪造 `exec` / `apply_patch` 工具定义，不修改权限、sandbox、MCP 或 plugins。

## v0.0.47 - 2026-07-28

### Fixed
- 修复设置本地标题后，Codex 26.721 最近会话下拉仍复用原标题的问题。
- 将 `conversation.title` 加入本地会话行的 React compiler cache 依赖，保存后的 metadata 刷新可立即重建原生会话行。

### Compatibility
- Safe Header marker 升级到 v13，支持 live safe-v12 原地升级；标题依赖、缓存槽和写入后置条件缺失时 fail closed。

## v0.0.46 - 2026-07-26

### Fixed
- 修正长列表控制层级：最近会话不再按整个项目共享 5 条预算，每个需求分组独立从 5 条开始。
- 每个分组的“展开更多”每次增加 10 条；展示上限超过 15 条时，同时提供收起到 15 条和 5 条。
- 分组展示数使用 `codex-local-groups-visible-counts-v1` 独立记忆，当前打开会话仍保留，“还有 N 条”只统计实际隐藏行。

### Compatibility
- Safe Header marker 升级到 v12，支持 live v11 原地升级，并对每组独立状态、+10、15/5 收起、active 保留和即时刷新执行 fail-closed 校验。

### Documentation
- 新增 `docs/codex-upgrade-playbook.md`，汇总 v0.0.29-v0.0.46 及前序线程的最终适配契约、禁止恢复的旧方案、升级步骤、验证门禁和回滚流程。

## v0.0.45 - 2026-07-26

### Fixed
- 修复项目历史订阅假定所有代理 manager 都实现归档、取消归档和删除监听，导致 Header 挂载后进入 Oops 错误页。
- 修复 webview 代理 manager 没有 worker 专用 `listProjectConversations()` 时项目历史查询失败、下拉列表为空；改为复用其原生 `listAllThreads()` 并在本地严格过滤当前项目。
- 项目历史 marker 升级到 v4，支持 live v1-v3 原地升级；补充空 registry、缺少可选监听和代理分页查询回归。

### Compatibility
- 扩展与 live bundle 同步升级，避免旧版扩展把新 marker 误判为“不兼容，补丁未应用”。

## v0.0.44 - 2026-07-26

### Fixed
- 修复 Codex UI 启动时 App Server manager 尚未注册，项目历史 hook 直接读取空 manager 的 `getHostId()`，导致统一 Oops 错误页。
- 默认 host 未就绪时使用 `local` 作为禁用查询的稳定 key；manager 注册后继续由现有 registry 订阅触发刷新，不改变分页、项目过滤或共享最近会话链路。
- 项目历史 marker 升级到 v2，支持 live v1 原地升级，并增加启动窗口回归测试。

## v0.0.43 - 2026-07-26

### Fixed
- 修复当前窗口的一个项目里出现其他项目分组：Header 只使用该窗口的 `activeWorkspaceRoot`，严格保留项目根目录及其子目录会话。
- 子目录会话统一归入工作区根项目，不再生成第二个项目标题；缺少真实 cwd 的会话不再用 metadata 伪造归属。
- 当前项目历史使用独立分页查询，不扩大共享最近会话 store；即使当前项目会话不在全局前 50 条内，也能进入当前窗口列表。
- 工作区根目录加载中或项目历史查询失败时 fail closed，不用其他项目或不完整的共享列表兜底。

### Data safety
- 不修改 SQLite、session、rollout 或会话 metadata；项目历史查询不传 `cwd` / `cwds`，避免 Codex 精确 cwd 过滤漏掉子目录。
- 归档、取消归档、删除和会话 metadata 变化会刷新独立项目历史；共享最近会话链路保持原生前 50 条行为。

### Compatibility
- Safe Header marker 升级到 v11；Codex 26.721 项目历史 marker 为 v1，支持 safe-v5 至 safe-v10 原地升级并执行完整后置条件校验。

## v0.0.42 - 2026-07-26

### Fixed
- 修正 Safe Header 长列表限制层级：每个项目默认合计渲染最近 5 条，不再对项目内每个需求分组各渲染 5 条；当前打开会话在第 5 条之后时仍额外保留。
- “还有 N 条，展开全部 / 收起到最近 5 条”改为项目级状态，不读取旧分组级展开状态。
- 项目标题在最近会话列表内粘性置顶，避免滚动后项目标题离开视口、会话行看起来像属于下一个项目。

### Codex compatibility
- 当前 Marketplace 稳定包仍为 `26.721.41059`，重新下载的 clean bundle 与本地 clean backup 哈希一致，无新的上游 bundle 需要猜测适配。
- Safe Header marker 升级到 v10，支持 live v9 原地升级，并对原生历史、600px 布局、项目级 5 条预算、当前会话保留、项目级展开和粘性标题做 fail-closed 校验。

### Data safety
- 不修改 `thread/list`、SQLite、session、rollout 或会话 metadata；只修正 Header 的项目内渲染预算和滚动标题。

### Verified
- `npm run compile`、`npm run lint`、`npm test`（160 tests）和 `git diff --check` 通过；26.721 VM 覆盖多需求分组共享 5 条预算、active 第 2000 条保留、即时展开/收起 2000 条、WMS/yuxi 分离和 v9 -> v10。
- clean `26.721.41059` 安全应用 4 个预期变更，7 个语法检查、幂等和二次 plan 0 通过；已安装 v0.0.42 并应用 live Header v9 -> v10，`plan-patches` 为 0，`verify-patched-bundles` 通过。
- 代码 Review 发现的 active 谓词 fail-closed 缺口已修复，增量复审及 Spec、QA、VSCode/UI Review 最终均为 Critical 0、Important 0、Minor 0。

## v0.0.41 - 2026-07-26

### Fixed
- 恢复 Safe Header 的长分组控制：全量保留 Codex 上游会话输入，但每组默认只渲染最近 5 条；当前打开会话位于第 5 条之后时仍额外保留。
- 恢复“还有 N 条，展开全部 / 收起到最近 5 条”；独立分组视图组件负责即时刷新，不改写上游 `zn()` 的 React compiler cache。
- 展开状态改用 `codex-local-groups-expanded-all-v2`，忽略旧 v1 残留的全展开状态，避免升级后立即构造超长列表。

### Codex compatibility
- 核对当前安装与最新稳定 Codex UI `26.721.41059`；Header、600px 高度、Max/Ultra 持久化和子 agent 链路的真实 bundle 锚点仍匹配。
- Header 不再硬编码 `app-initial-DZH_C2c-*` 文件名；改为从实际 `app-initial-*.js` import 中按 `qQ` messenger / execution-target Hook 导出唯一定位，Vite hash 变化时仍可验证匹配。
- Safe Header marker 升级到 v9，支持 live v8 原地升级，并对原生历史、600px 布局、5 条限制、更多按钮和即时刷新做 fail-closed 校验。

### Data safety
- 不修改 `thread/list`、SQLite、session、rollout 或会话 metadata；WMS / yuxi 仍按原生 cwd 分组，不做工作区后置过滤。

### Verified
- `npm run compile`、`npm run lint`、`npm test`（158 tests）和 `git diff --check` 通过；当前 26.721 `Bn/Z/Gn` VM 验证单组 2000 条默认 5 条、active 最多额外 1 条、即时展开 2000 条并可收起，WMS / yuxi 不串组。
- 重新下载的官方稳定 Codex `26.721.41059` clean bundle 安全应用 4 个预期变更，7 个 Node 24 语法检查、幂等和二次零变更计划均通过；两轮代码、QA、VSCode/UI 子 agent Review 均为 Critical 0、Important 0、Minor 0。

## v0.0.40 - 2026-07-26

### Fixed
- 修复 Reload 后当前项目只剩极少会话：Safe Header 不再把 Codex 原生有限最近列表按 `activeWorkspaceRoot` 二次过滤，恢复上游已返回的全部会话，并继续按真实 cwd 分组。
- 修复 `maxHeight:600px` 只限制上限、没有实际增高的问题：Radix 菜单改为实际 `600px` 高度，矮窗口仍受原生可用高度限制，列表区域独立滚动。
- Safe Header marker 升级到 v8，支持 live v7 原地升级，并对原生列表表达式、菜单高度、滚动区域和旧过滤残留做 fail-closed 校验。

### Data safety
- 未修改 `thread/list`、SQLite、session、rollout 或 metadata；本机 WMS 会话记录和 rollout 文件均仍存在。

### Verified
- `npm run compile`、`npm run lint`、`npm test`（148 tests）、`git diff --check` 和真实 Header v8 nextText 的 Node 24 module syntax 检查通过。
- v0.0.40 已安装并应用；真实 `plan-patches` 为 0，`verify-patched-bundles` 通过。代码、QA、VSCode/UI 三路子 agent Review 均为 Critical 0、Important 0、Minor 0。

## v0.0.39 - 2026-07-26

### Changed
- 将 Codex 26.721 最近会话下拉外层最大高度从固定 `300px` 提高一倍到 inline `600px`；真实 CSS bundle 没有 `max-h-[600px]` selector，避免只改 class 但界面无变化。
- 保留内部原生 `60vh` 滚动区域，不使用曾带来布局循环风险的外层 `60vh` 或 `900px` 方案。
- Safe Header marker 升级到 v7，支持 live v6 原地升级并校验唯一高度锚点。

### Verified
- `npm run compile`、`npm run lint`、`npm test`（148 tests）、`git diff --check` 和真实 Header nextText Node 24 module syntax 通过。
- v0.0.39 已安装并应用；`plan-patches` 为 0，`verify-patched-bundles` 通过。代码与 QA/UI 子 agent Review 的 Critical、Important、Minor 均为 0。

## v0.0.38 - 2026-07-26

### Fixed
- 修复 5.6 Sol 选择 `Ultra` 后约一秒回退到 `Light`：Codex 的写入层会把默认目标的 `ultra` 改写为主机旧配置，读取层又会丢弃 `ultra`，模型校验层还会按缺少 Max/Ultra 的服务端列表回退默认档位。
- 仅对 `gpt-5.6-sol` 保留用户选择和回读的 `Max`、`Ultra`；其他模型继续使用 Codex 原生兼容逻辑，普通档位不变。
- Codex UI marker 升级到 v2，支持 live v1 原地升级；持久化作用域缺失时 fail-closed。

### Verified
- 回归测试执行真实写入、配置回读和模型校验代码形态：修复前 Sol Max/Ultra 均为 `low`，修复后分别保持 `max`/`ultra`；Sol High 与 Terra Max/Ultra 保持原行为。
- `npm run compile`、`npm run lint`、`npm test`（146 tests）和真实 DZH nextText 的 Node 24 module syntax 检查通过。
- 已安装 v0.0.38 并应用真实 bundle；`plan-patches` 为 0，`verify-patched-bundles` 通过。代码、QA、VSCode/Codex 子 agent Review 的 Critical、Important、Minor 均为 0。

## v0.0.37 - 2026-07-26

### Fixed
- 修复 5.6 Sol 实际 `Reasoning` 菜单仍只有 Light、Medium、High、Extra High：此前只修改了 Power Picker 的 `KNt/XNt` 链路，截图中的菜单实际由 `g$t -> XZ(models, model)` 使用后端 `supportedReasoningEfforts` 生成。
- `XZ` 现仅为 `gpt-5.6-sol` 补齐缺少的 `Max`、`Ultra`，其他模型及 Terra fallback 不变。
- Power/Subagent marker 升级到 v2，并支持从 live v1 原地升级；结构或 postcondition 不完整时继续 fail-closed。

### Verified
- `npm run compile`、`npm run lint`、`npm test`（143 tests）和真实 Codex `26.721.41059` BKh nextText 的 Node 24 语法检查通过。
- 真实 `XZ` VM 输出 `low / medium / high / xhigh / max / ultra`；Sol 已有档位不重复，missing-Sol fallback 补 Ultra，Terra/custom 不变。
- 修复后代码、QA、VSCode/Codex 子 agent Review 的 Critical、Important、Minor 均为 0。

## v0.0.36 - 2026-07-26

### Fixed
- 修复 WMS 窗口展示并打开 yuxi 会话：Header 改用当前窗口的 `activeWorkspaceRoot`，只保留当前根目录、子目录和缺少 cwd 的原生项，不向 `thread/list` 注入精确 cwd。
- Safe Header 升级到 v6；继续保留原生高度和 React cache，不使用跨窗口共享的项目路径决定当前窗口。
- Codex 26.721 强制启用原生子 agent 活动发现和面板。
- 5.6 Sol 本地推理档位补齐并保留 `Max`、`Ultra`；功能开关 `1221508807` 在对应 UI 链路固定启用。

### Verified
- `/etc/mihomo/config.yaml` 已存在 `DOMAIN,ab.chatgpt.com,FALLBACK`，本轮未重复修改系统代理配置。
- `npm run compile`、`npm run lint`、`npm test`（140 tests）和真实 Codex `26.721.41059` 三个目标 bundle 的 Node 24 语法检查通过。
- 两轮代码、QA、VSCode/Codex 子 agent Review 后，Critical、Important、Minor 均为 0。

## v0.0.35 - 2026-07-25

### Fixed
- 修复 `thread/list` 被共享 `localStorage` 中的项目路径强制加上精确 `cwd` 后，只返回根目录会话、隐藏子项目和缺少 cwd 的原生历史会话。
- 默认改为 native-history safe patch：不再改写 extension host / app-server 的 `thread/list` 请求，不再用当前项目过滤 Codex 已返回的列表。
- 分组只重排 Codex 原生返回项；默认展开并展示全部，不再用 metadata 合成历史行，也不再默认折叠或截断到 5 条。
- 保留 Codex 原生最近会话高度和 React cache 状态，避免下拉布局循环和 cache slot 改写引发报错或窗口卡顿。
- Safe Apply、Repair 和 Restore 会先预查全部 clean backup，再用同目录原子替换移除已修改 bundle；缺少任一备份时零写入并 fail-closed。
- 多 bundle 恢复中途失败时回滚先前已恢复文件，避免留下半恢复状态；旧版独立 Statsig 网络补丁也纳入恢复检测。
- 写入 26.721 Header 前校验 `app-initial` 确实导出 `qQ` messenger，导出结构漂移时停止写入，避免下拉打开时报未定义导入。
- 修复 extension host 会话过滤代码生成后的转义错误，避免生成无法解析的 JavaScript。

### Verified
- `npm test`：134 tests（含 root、子项目、缺少 cwd、pending row、26.721 原生状态/高度、导出校验及旧补丁事务恢复回归）。

## v0.0.34 - 2026-07-25

### Fixed
- 适配 OpenAI Codex `26.721.41059` 的新版 `app-initial-*` split bundle。
- 修复 Header 错误导入未导出的 `Rle`，以及误把模块初始化函数当作 execution target Hook，避免启动和打开最近会话列表时白屏。
- 按 Codex `26.721` 新协议将 `thread/list` 项目过滤参数从已失效的 `cwds` 改为 `cwd`；WMS 的 VSCode 主会话由错误过滤后的 1 条恢复为服务端可返回的 25 条。
- 保留 Codex `26.715` 及更早版本的 `cwds` 参数，避免旧版协议兼容回退。
- 未验证的未来 Codex 协议版本停止写入补丁，避免猜测 `thread/list` 参数。

## v0.0.33 - 2026-07-23

### Fixed
- 验证并适配 OpenAI Codex `26.715.61943`，现有 `26.715` patch anchor 可直接识别新版 bundle。
- 保留 Codex `26.715` 最近会话下拉固定 `480px` 高度；窗口未响应与该 UI 高度无直接证据关联。
- 恢复 Codex 原生 `thread/list` 请求量：扩展会话列表保持 `50` 条，Webview 分页保持调用方的 `100` 或动态 limit，不再统一强提到 `200`；继续保留当前项目 `cwds` 过滤和分页全量历史。

## v0.0.32 - 2026-07-21

### Fixed
- 恢复 Codex `26.715` 最近会话下拉原生 `300px` 高度，并清理旧补丁写入的 `900px`、`60vh`、`480px`，避免 Radix 弹层反复重算触发 ResizeObserver 布局循环和窗口未响应。

## v0.0.31 - 2026-07-20

### Fixed
- 将 Codex `26.715` 最近会话下拉高度调为固定 `480px`，比原生 `300px` 更高，同时避开曾导致 ResizeObserver 布局循环的 `60vh` 和 `900px`。

## v0.0.30 - 2026-07-20

### Changed
- 将 Codex `26.715` 最近会话下拉外层高度从 `300px` 放宽到已有样式支持的 `60vh`，避免分组列表首屏过矮，同时不恢复曾导致布局循环风险的 `900px`。

## v0.0.29 - 2026-07-19

### Fixed
- 适配 OpenAI Codex `26.715.31925` 的新版 header、extension host 和 thread list bundle 结构。
- bundle 定位改为按文件名前缀读取，避免同步扫描数千个 webview 资源阻塞 VS Code Extension Host。
- 适配 OpenAI Codex `26.707.91948`：更新后重新应用完整 Local Groups 补丁并验证 8 个 bundle。
- 修复系统 `node v12.16.3` 下补丁脚本因 `String.prototype.replaceAll` 不存在而失败的问题。
- 修复最近会话弹层被强制放大到 `900px` 后触发 ResizeObserver 布局循环，导致 Codex 无法打开和 VS Code 窗口未响应的问题。

### Changed
- 恢复安全的启动自检：只读检查 Codex 更新是否覆盖补丁，不在启动阶段自动改写 bundle。
- 检测到兼容且缺失的补丁时，提供一键“修复并 Reload”；检测到不兼容结构时 fail-closed，不写入文件。

## v0.0.28 - 2026-07-14

### Fixed
- 适配 OpenAI Codex `26.707.71524`：兼容 extension host 中新版 VSCode API 包装函数，恢复补丁规划、Local Groups UI 和 metadata 同步。

### Verified
- `npm run compile`
- `npm run lint`
- `npm test`
- `npm run plan-patches`
- `npm run apply-patches`
- `npm run verify-patched-bundles`

## v0.0.27 - 2026-07-11

### Fixed
- 修复多窗口启动时 Codex 偶发白屏：取消 VSCode 启动阶段自动改写 Codex bundle，避免多个 extension host 与 Codex webview 并发读写同一组文件。
- 本地标题和分组 metadata 改为由 Codex extension host 在 webview 启动后同步，不再把易变 metadata 写入 hashed webview bundle。
- `Reset Pending Group`、批量分组更新和分组归档只修改 metadata，不再隐式或误导用户运行 bundle patch。
- 适配 Codex `26.707` 状态函数迁移到 `open-project-setup-dialog-*`，且不依赖 minifier 局部别名，避免已完成会话被旧 `isResponseInProgress` 持续显示为 loading。
- v14-v16→v17 runtime metadata 同步升级改为精确校验完整 `metadataSaved` 分支并 fail-closed，注入点漂移时不再只升级 marker 后误报成功。
- 修复最新版 Codex 的 `$g` minifier 变量与 VSCode API 引用冲突，恢复会话“设置标题 / 设置分组”和新建分组输入框。
- 标题输入框和分组选择框启用 `ignoreFocusOut`，避免 Codex 下拉菜单关闭并回焦 webview 时让弹框瞬间取消。

### Changed
- Codex 扩展升级后需要手动执行一次 `Codex Local Groups: Apply Patches`，再 Reload Window。

### Verified
- `npm run compile`
- `npm run lint`
- `npm test`（105 tests）
- `npm run apply-patches`
- `npm run verify-patched-bundles`
- `npm run plan-patches`（待修改文件数 0）
- metadata 仅在内存中变化时，实机 patch plan 仍为 0 个文件。

## v0.0.26 - 2026-07-10

### Fixed
- 修复在编辑器面板中点击“在此分组新建会话”无响应：保存 pending group 后，直接向当前 Codex webview 派发原生 `new-chat`，不再依赖只控制 sidebar 的 `chatgpt.newChat` 命令。

### Verified
- `npm run compile`
- `npm run lint`
- `npm test`
- `npm run apply-patches`
- `npm run verify-patched-bundles`
- `npm run plan-patches`（待修改文件数 0）

## v0.0.25 - 2026-07-10

### Fixed
- 适配 OpenAI Codex `26.707.31428`：支持 `app-server-manager-signals-*` bundle、最新版 extension host、recent tasks header、request class 和 tray menu 语义锚点。
- 修复最新版 pending worktree 改为 `kind: local + conversation: null` 后，分组 helper 访问空 conversation 导致 Codex UI 白屏的问题。
- 修复最新版 header 不再导入 VSCode messenger 时补丁注入未定义变量的问题。
- 兼容最新版 `thread/list` 首屏 limit 从 200 调整为 100，并保留 workspace `cwds` 过滤和运行时下限提升。

### Verified
- `npm run compile`
- `npm run lint`
- `npm test`（104 tests）
- `npm run apply-patches`
- `npm run verify-patched-bundles`
- `npm run plan-patches`（待修改文件数 0）

## v0.0.24 - 2026-07-06

### Fixed
- 修复最近会话已完成后仍显示 loading 的状态判定：当 Codex 回传 `threadRuntimeStatus` 已是 `idle/notLoaded` 时，不再被旧的 `isResponseInProgress` 覆盖成 loading。
- 适配新版 Codex `thread/list` 请求结构，确保最近会话项目过滤参数继续生效。

### Verified
- `npm run compile`
- `npm run lint`
- `npm test`
- `npm run apply-patches`
- `npm run verify-patched-bundles`
- `node scripts/plan-patches.js`

## v0.0.16 - 2026-06-26

### Changed
- app-main 注入点改为语义唯一查找，兼容 Codex 混淆函数名变化。
- Statsig network config 改为动态变量匹配，减少新版 Codex 小版本适配成本。
- 多个语义候选时继续 fail-closed，避免盲注入导致 Codex UI 白屏。

### Verified
- `npm run compile`
- `npm run lint`
- `npm test`
- `node scripts/plan-patches.js`
- `node scripts/verify-patched-bundles.js`

## v0.0.15 - 2026-06-26

### Added
- 新增 `Codex Local Groups: Restore Original Codex UI` 和 `npm run restore-codex-ui`，可只恢复 clean Codex bundle，不重新应用补丁。

### Changed
- 启动自动 patch 延迟从 15 秒缩短到 1 秒，降低 Codex 先启动旧 app-server 的概率。
- Restore 会覆盖 sidebar bundle，避免停用增强后残留 sidebar patch。

### Verified
- `npm run compile`
- `npm run lint`
- `npm test`
- `node scripts/plan-patches.js`
- `node scripts/verify-patched-bundles.js`

## v0.0.14 - 2026-06-24

### Added
- VSCode 启动完成 15 秒后自动检查最新版 Codex bundle；如果现有规则能适配，会自动应用补丁并提示 Reload Window。
- 自动补丁仅在实际修改 bundle 后提示 Reload；已是最新时保持静默。

### Changed
- 版本不兼容时保留 fail-closed 行为：停止自动 patch，并提示需要适配，避免盲改导致 Codex UI 崩溃。

### Verified
- `npm test`
- `npm run compile`
- `npm run lint`

## v0.0.13 - 2026-06-23

### Fixed
- 扩大 API key 模式下 ChatGPT auth 预检请求拦截：`/wham/usage*` 现在同时兼容路径和完整 URL。
- 追加拦截 `/ces/v1/rgstr*` 与 `/backend-api/plugins/featured*`，减少 API key 登录时无用遥测/插件预检导致的 `fetch failed` 和 loading 卡顿。
- 已有 v0.0.12 request bundle 会自动升级到 request patch v2。

### Verified
- `npm test`
- `npm run compile`
- `npm run lint`
- `npm run apply-patches`
- `npm run plan-patches`
- `npm run verify-patched-bundles`

## v0.0.12 - 2026-06-22

### Fixed
- 针对 API key 登录的 VSCode Codex 会话，启动 `app-server` 时禁用 remote plugins，并把 MCP OAuth 凭据存储切到 file，避免反复触发 ChatGPT-only 的 remote plugin bundle sync 与 keyring OAuth 预检。
- 禁用 webview 内 Statsig/AB SDK 网络流量，避免继续请求 `ab.chatgpt.com/v1/initialize`。

### Risk
- VSCode Codex 内 remote plugin marketplace / OpenAI-curated plugin 功能会不可用；本地 API key 对话和 Codex Local Groups 功能不受影响。
- ChatGPT auth/OAuth 登录用户如果依赖 ChatGPT 订阅用量页、remote plugin marketplace、OpenAI-curated plugins 或 AB 实验，不建议应用 v0.0.12 的 API key 兜底补丁。
- 未写入 `/etc/hosts`：当前环境有代理，hosts 映射不一定拦截代理侧 DNS，且会全局影响 ChatGPT 相关域名。

## v0.0.11 - 2026-06-22

### Fixed
- 针对 API key 登录场景，禁用 Codex webview 对 `/wham/usage*` 的 ChatGPT 用量请求，避免反复 401/432 拖慢 UI。
- `account-info` 不再解析 API key token 为 ChatGPT 账号计划，避免重复输出 `Unable to extract account id and plan from auth token.`。

### Risk
- 使用 API key 登录时，Codex 的 ChatGPT 订阅/用量设置页会显示为空或不可用；本地 API key 对话能力不受影响。

## v0.0.10 - 2026-06-22

### Fixed

- 降低 VSCode/Codex 启动卡死风险：运行中的 Codex webview 保存标题、分组或新建分组时，不再触发 `codexLocalGroups.applyPatchesSilent` 自动改写 Codex bundle。
- 新增 `Codex Local Groups: Repair Codex UI` 命令和 `npm run repair-codex-ui` 脚本，可先恢复 clean Codex bundle，再重新应用补丁。
- Repair 会优先选择不含 `codexLocalGroups` 标记的 clean 备份，避免误恢复到旧 patched 备份。

### Verified

- `npm test`
- `npm run compile`
- `npm run lint`
- `npm run repair-codex-ui`
- `npm run plan-patches`
- `npm run verify-patched-bundles`

## v0.0.9 - 2026-06-20

### Fixed

- 适配 OpenAI Codex `26.616.41845` 的新版 webview bundle 名和 minified anchors。
- 修复 Codex UI 启动阶段被本扩展 `onStartupFinished` 自动 patch 拖慢或卡住的问题；扩展只在命令或 metadata 保存后激活。
- 修复点击最近任务菜单“查看全部”后报“糟糕，出错了”的问题：最近任务菜单使用菜单内局部 current root，并避开 React compiler cache 槽冲突。

### Verified

- `npm test`：71 tests pass
- `npm run compile`
- `npm run lint`
- `npm run apply-patches`：幂等通过
- `npm run plan-patches`：待修改文件数 0
- `npm run verify-patched-bundles`

## v0.0.8 - 2026-06-17

### Fixed

- 修复当前项目历史列表只显示部分会话的问题：最近会话刷新请求现在会带上当前项目和已记录项目的 `cwds` 过滤。
- 将过滤后的最近会话首屏请求下限提升到 200，降低全局会话过多时当前项目旧会话丢失的概率。
- Header patch 升级到 v32，记录当前项目 root，供 webview 最近会话刷新链路复用。

### Verified

- `npm test`：65 tests pass
- `npm run compile`
- `npm run lint`
- `npm run plan-patches`：待修改文件数 0
- `npm run verify-patched-bundles`
