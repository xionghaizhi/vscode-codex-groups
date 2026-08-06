# 适配 Codex 26.5730.61639

## 背景

官方 Marketplace 预发布版已从 `openai.chatgpt@26.727.40816` 更新到 `26.5730.61639`。新版把原来同处一个 `app-initial-*` 的 app-main 语义拆到多个 bundle，并改变了 Extension Host、Header、项目历史和 Power/Reasoning 的压缩锚点。旧版 locator 因此无法定位 app-main，安全补丁会 fail closed。

首次 Reload 验收曾把该预发布版判定为 clean Webview 无法启动并回退到 `26.727.40816`。后续日志对时确认：资源已加载且 React 已请求 root render，但 Remote VSCode 中健康的路由挂载需要 `61,906` 至 `70,983ms`；新版 Extension Host 固定 `30s` 看门狗先覆盖了仍在启动的 Webview，因而显示误导性的 “The extension couldn't load its resources”。

Local Groups `0.0.53` 仅对 `26.5730` 把该看门狗延长到 `120s`，保留真正启动失败时的原生错误兜底。当前 active 版本已恢复为 `26.5730.61639`，Reload 后在 `61,906ms` 完成 `app routes mounted`，随后出现 `ready provider mounted`，且没有 `Webview did not finish starting`。

## 目标

- 恢复升级手册列出的当前项目隔离、需求分组、长列表、600px 菜单、本地标题和 metadata 操作。
- 恢复独立项目历史、Sol Max/Ultra 和原生子 agent 能力。
- 按语义重新证明 Header messenger、execution target 和 Extension Host 消费链，不复用压缩导出名。
- 保持 clean-copy、幂等、语法、后置条件和回滚门禁。
- 把 Webview 启动耗时、`ready` 和 VSCode active registry 纳入升级、回退门禁。
- 防止固定启动超时误杀已经加载资源、但在 Remote 环境中挂载较慢的健康 Webview。

## 非目标

- 不修改 metadata 数据结构、认证、权限、sandbox、MCP 或插件协议。
- 不给共享 `thread/list` 注入 `cwd` / `cwds`，不扩大共享 recent store。
- 不把 `26.721.41059` 专用 HTTP fallback 扩大到新版。

## 影响范围

- `src/extensionLocator.js`：新版三份 `app-initial-*` 的语义定位。
- `src/patchEngine.js`：新版明确门禁及 Extension Host、Header、项目历史、Power/Reasoning 锚点。
- `test/locator.test.js`、`test/patch-engine.test.js`、`test/scripts.test.js`：新版回归和 verifier 门禁。
- 版本、README、CHANGELOG 和升级手册。
