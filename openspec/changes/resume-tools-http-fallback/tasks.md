# Tasks

- [x] 1. 增加自定义 provider ID 的只读解析和边界测试。
- [x] 2. 增加受影响 Codex 版本的 app-server HTTP fallback 补丁测试。
- [x] 3. 实现 VS Code、CLI plan/apply/repair/verify 调用链。
- [x] 4. 更新升级手册、README、版本和 Changelog。
- [x] 5. 运行 test、lint、compile 和真实 bundle 只读 plan。
- [x] 6. 完成需求内代码 review；记录无法覆盖的内置 provider 边界。
- [x] 7. 修复 review 发现的 quoted provider 表和 provider 切换边界。
- [ ] 8. 用户确认后安装、应用 live bundle、Reload Window，并用旧会话执行终端命令验收。

> 2026-07-31：当前 Codex 已升级到 `26.727.40816`，该版本不应用 `26.721.41059` 专用 fallback。任务 8 仅保留为旧版本人工验收记录，不随新版本扩大 transport 覆盖。
