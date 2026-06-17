# Changelog

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
