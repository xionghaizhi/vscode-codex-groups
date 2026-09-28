# Tasks

- [x] 1. 把 5901/5903/5908/5917 的菜单、滑块、保存回读守卫扩到 `gpt-6-sol`，并迁移旧 marker。
- [x] 2. 同步 external verifier 与 engine 回归，覆盖 6 Sol 保存值和 5908 v1→v2 迁移。
- [x] 3. 更新升级手册与 5901/5903/5908/5917 spec，把 6 Sol 写入下次升级必查项。
- [x] 4. 已对当前 `26.5908.31748` 执行 apply-patches / plan 0 / verifier。远程 CLI 不支持 `execute-command`，需要在 VS Code 执行 Developer: Reload Window 让 webview 加载新 bundle。
