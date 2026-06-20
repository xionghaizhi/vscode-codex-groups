# Changelog

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
