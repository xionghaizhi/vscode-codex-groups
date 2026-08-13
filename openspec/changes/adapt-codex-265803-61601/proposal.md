# 适配 Codex 26.5803.61601

## 背景

Microsoft Marketplace 最新 linux-x64 预发布版已从 `openai.chatgpt@26.5803.41515` 更新到 `26.5803.61601`。现有 locator 仍能唯一定位 Header、app main 和 App Server / Power bundle；旧安全 plan 的四个业务补丁中，只有 Codex UI marker 注入失败。

新版没有改变协议或资源拓扑。真实差异是 app main 的模型选择函数从压缩名 `tBe()` 变成 `iBe()`；Sol Max/Ultra 校验锚点仍匹配，但 `patchCodexUi265803()` 把 marker 注入点硬编码为旧函数名，导致 plan fail closed。

升级后的人工复查还确认了一个独立的展示问题：同一 conversation ID 在 Local Groups metadata 和 Codex 原生 session index 中可以存在两个标题。最近会话下拉使用本地标题，打开会话后的左上角却仍使用原生 `thread_name`，因此会显示不同文字。此前“标题通过”的人工记录只覆盖设置标题动作和最近会话中的显示，没有进入同一会话核对左上角，不能作为打开页标题门禁的通过证据。

## 目标

- 安装并启用官方 linux-x64 `openai.chatgpt@26.5803.61601`。
- 用唯一业务签名适配模型选择函数的压缩符号漂移，同时保留上一 build。
- 保留当前项目隔离、每分组 5/+10/15/5、600px 菜单和三个 metadata 操作。
- 保留 Sol Max/Ultra、版本限定 120 秒看门狗，以及 V1/V2 原生子 agent 活动消费链。
- 同一会话存在本地标题时，最近会话和打开页左上角都优先显示本地非空标题；本地标题缺失或空白时回退原生标题。
- metadata 保存后立即刷新当前打开页标题，不要求 Reload 或重新进入会话。
- 把“下拉标题 + 打开页标题”并入每次 Codex 插件升级必须一次性完成的全量已知回归矩阵；不能只验证本轮刚发现的问题。
- 完成 official clean、live、VSIX、Reload 和人工 UI 门禁，并把阻碍记录到升级手册。

## 非目标

- 不扩大 `26.5803` 以外的版本白名单。
- 不修改 locator predicate、metadata 结构、共享 recent store、认证、权限、sandbox、MCP、插件或 provider 配置；尤其不得写入、重排或覆盖用户 `config.toml` 中的 feature 选择。
- 不提升现有 Header、Codex UI、项目历史或 Power marker；打开页标题使用独立 marker。
- 不把 `26.721.41059` 专用 HTTP fallback 扩展到当前版本。
- 不写入 Codex `session_index.jsonl`，不修改原生 `thread_name`，也不调用原生 thread rename 接口。
- 不修改 app main 的 conversation selector；标题一致性修复只发生在 `26.5803` Header 展示层。

## 影响范围

- `src/patchEngine.js`：Codex UI marker 改为唯一业务签名定位。
- `src/patchEngine.js`：在 Header `Bn` 展示层复用 `codexLocalGroupsLocalTitle()`，监听已有刷新事件，并新增独立打开页标题 marker。
- `scripts/verify-patched-bundles.js`：同时校验 V1/V2 同输入的完整活动 push 片段和打开页标题展示契约。
- `test/locator.test.js`、`test/patch-engine.test.js`、`test/scripts.test.js`：增加 `26.5803.61601` 资源、符号漂移和 verifier 假阳性回归。
- `package.json`、README、CHANGELOG、升级手册：发布与防复发记录。
- 本 OpenSpec change 与 `support-rtai-cross-model-subagents`：记录 clean/live/安装/Reload/review 证据与 V1/V2 边界。
