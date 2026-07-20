# Changelog

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
