# 适配 Codex 26.5803.41515

## 背景

Microsoft Marketplace 最新 linux-x64 预发布版已更新到 `openai.chatgpt@26.5803.41515`。现有 locator 能唯一定位新版 Header、app main 和 App Server bundle，但版本门禁按预期拒绝适配。

新版继续使用原生 `30s` Webview 看门狗和相同 direct host callback；Header 新增 Cloud/Local/Recent 过滤分支并改变本地 row cache，项目历史 Hook、模型校验、Power 和 Reasoning 的压缩锚点也已漂移。只放开版本会丢失项目隔离、分组入口和 Sol Max/Ultra。

适配时还确认了一个独立根因：新版 messenger 导出名为 `$1`，若通过 replacement string 更新已有 import，JavaScript 会把 `$1` 当捕获组并生成非法 import。实现必须使用 replacement callback，并以二次 plan 和语法门禁防止复发。

旧 `61,906ms` 是 26.5730 Webview 的真实 route mount 时间，120 秒补丁只延后失败判定，不会让启动额外等待。clean 26.5803 当前降为 `34,566ms`，ready 在 route mount 后约 20ms 到达；剩余耗时属于上游 Webview 初始化，不在 Local Groups 分组或项目历史关键路径中。

## 目标

- 恢复标题、分组和分组内新建会话的完整 host 消息链。
- 保留当前项目及子目录隔离、独立项目历史、每组 5/+10/15/5、active 保留和 600px 菜单。
- 保留 Sol Max/Ultra 和新版原生子 agent 能力。
- 延续版本限定的 120 秒启动看门狗、clean-copy、幂等、语法、verifier 和 Reload 门禁。

## 非目标

- 不修改 metadata 数据结构、共享 recent store、认证、权限、sandbox、MCP 或插件协议。
- 不给共享 `thread/list` 注入 `cwd` / `cwds`。
- 不把 `26.721.41059` 专用 HTTP fallback 扩大到新版。

## 影响范围

- `src/patchEngine.js`：增加 26.5803 的版本限定 Header、项目历史、Power/Reasoning 和启动补丁。
- `test/locator.test.js`、`test/patch-engine.test.js`、`test/scripts.test.js`：增加新版调用链和行为回归。
- `scripts/verify-patched-bundles.js`：增加 live 后置条件。
- 版本、README、CHANGELOG 和升级手册。
