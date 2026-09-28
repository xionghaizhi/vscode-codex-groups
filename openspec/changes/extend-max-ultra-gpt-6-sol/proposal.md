# 扩展 Max/Ultra 守卫到 gpt-6-sol

## Why

`models_cache_bundled.json` 里 `gpt-5.6-sol` 和 `gpt-6-sol` 都声明了 `low/medium/high/xhigh/max/ultra`。Codex 面板紧凑滑块把 `xhigh` 显示成 Extra High，原生预设只到这一档。Local Groups 先前只对 `gpt-5.6-sol` 和 `gpt-6-astra` 插入 Max/Ultra，所以当前选中 **6 Sol** 时滑块停在 Extra High。下次升 Codex 若仍按 5.6 Sol 验收，会再次漏掉 6 Sol。

## What Changes

- Power 菜单、紧凑/展开拖拽条、Main 保存回读的 Max/Ultra 守卫增加 `gpt-6-sol`。
- 覆盖仍在维护的 `26.5901` / `26.5903` / `26.5908` / `26.5917`；已安装补丁从旧 marker 原地迁移。
- 升级手册与现有 5901/5903/5908/5917 spec 把模型集写成 `gpt-5.6-sol`、`gpt-6-sol`、`gpt-6-astra`。
- 不修改用户 `config.toml`、模型目录、默认档位或 Multi-Agent 配置。不把 Terra/Luna 或其他模型纳入该守卫。

## Impact

- 代码：`src/patchEngine.js`、`scripts/verify-patched-bundles.js`、相关测试。
- 文档：本 change、既有升级 change、CHANGELOG、README、升级手册。
- 运行时：仅已支持的精确 Codex build 写入；对当前线程的 6 Sol 滑块补 Max/Ultra。
