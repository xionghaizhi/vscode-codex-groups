# 适配 Codex 26.5803.61601

## 背景

Microsoft Marketplace 最新 linux-x64 预发布版已从 `openai.chatgpt@26.5803.41515` 更新到 `26.5803.61601`。现有 locator 仍能唯一定位 Header、app main 和 App Server / Power bundle；旧安全 plan 的四个业务补丁中，只有 Codex UI marker 注入失败。

新版没有改变协议或资源拓扑。真实差异是 app main 的模型选择函数从压缩名 `tBe()` 变成 `iBe()`；Sol Max/Ultra 校验锚点仍匹配，但 `patchCodexUi265803()` 把 marker 注入点硬编码为旧函数名，导致 plan fail closed。

## 目标

- 安装并启用官方 linux-x64 `openai.chatgpt@26.5803.61601`。
- 用唯一业务签名适配模型选择函数的压缩符号漂移，同时保留上一 build。
- 保留当前项目隔离、每分组 5/+10/15/5、600px 菜单和三个 metadata 操作。
- 保留 Sol Max/Ultra、版本限定 120 秒看门狗，以及 V1/V2 原生子 agent 活动消费链。
- 完成 official clean、live、VSIX、Reload 和人工 UI 门禁，并把阻碍记录到升级手册。

## 非目标

- 不扩大 `26.5803` 以外的版本白名单。
- 不修改 locator predicate、metadata 结构、共享 recent store、认证、权限、sandbox、MCP、插件或 provider 配置。
- 不提升生成契约未变化的 Header、Codex UI、项目历史或 Power marker。
- 不把 `26.721.41059` 专用 HTTP fallback 扩展到当前版本。

## 影响范围

- `src/patchEngine.js`：Codex UI marker 改为唯一业务签名定位。
- `scripts/verify-patched-bundles.js`：同时校验 V1/V2 同输入的完整活动 push 片段。
- `test/locator.test.js`、`test/patch-engine.test.js`、`test/scripts.test.js`：增加 `26.5803.61601` 资源、符号漂移和 verifier 假阳性回归。
- `package.json`、README、CHANGELOG、升级手册：发布与防复发记录。
- 本 OpenSpec change 与 `support-rtai-cross-model-subagents`：记录 clean/live/安装/Reload/review 证据与 V1/V2 边界。
