# Changelog

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
