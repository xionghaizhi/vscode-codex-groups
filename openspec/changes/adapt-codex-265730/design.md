# 设计：Codex 26.5730.61639 兼容

## 已确认上游变化

| 职责 | 新 bundle / 语义 | 变化 |
| --- | --- | --- |
| Header | `header-CrjJdV23.js` | React cache、row、项目历史和菜单锚点变化。 |
| app main / request / local title | `app-initial-gPcxinc5.js` | `conversation.title`、模型校验、messenger 和 execution target 在此；`untitledThreadLabel` 已移出。 |
| App Server / Statsig / Power | `app-initial-DxpEDIqJ.js` | 项目历史 Hook 为 `FJe/IJe`，Power 为 `mOt/vOt/cQ`。 |
| 其他 UI | `app-initial-BI2fsfeY.js` | 不属于 Local Groups 安全补丁目标。 |
| Extension Host | `out/extension.js` | direct webview 回调从 `handleMessage(e,a)` 漂移为 `handleMessage(e,c)`；Cap'n RPC 增加 session 校验。 |

## 语义调用链证明

```text
Header import N$ -> local pu
  -> fu.getInstance()
  -> dispatchMessage() 使用 VS Code postMessage
  -> dispatchHostMessage() 投递原生 host 订阅
  -> out/extension.js direct onDidReceiveMessage
  -> codexLocalGroupsHandleWebviewMessage()
```

execution target 为 `wB -> XS()`，返回 `activeWorkspaceRoot` 和 `isActiveWorkspaceRootLoading`。两者都必须按实现与导出表唯一定位，压缩名只作为本版证据记录。

## 实现边界

1. locator 的 app-main 判定允许新版 `conversation.title + 模型设置校验`，但仍要求唯一候选。
2. 版本只明确放行 `26.5730`，未知 minor 继续 fail closed。
3. Header 继续复用现有 `safeHeaderHelper()` 和每分组 5/+10/15/5 规则，只新增本版原生锚点适配。
4. 项目历史继续通过独立 Hook 查询，worker manager 使用分页 `listRecentThreads()`；代理 manager 缺少专用方法时回退 `listAllThreads()` 并本地严格过滤。
5. 新版原生子 agent 已启用且没有旧 feature gate，不注入旧开关；只补 Sol Max/Ultra 的 Power、Reasoning 菜单和模型校验。
6. Extension Host 消息桥按唯一 direct callback 插入，找不到或不唯一时停止写入。
7. 生成结果必须由后置条件校验真实契约，不以 marker 代替。

## Webview 启动看门狗兼容

`out/extension.js` 的 `JP.start()` 在 `26.5730` 中固定使用 `30s` 定时器。失败会由 `initializeWebview()` 直接覆盖 Webview，因此错误页中的 “couldn't load its resources” 不能单独证明资源缺失。

本次日志调用链为：

```text
React root render requested
  -> 原生 30s timeout 覆盖 Webview
  -> 实际健康启动在 61,906-70,983ms 才完成 app routes mounted
  -> ready provider mounted
```

处理规则：

1. 仅当 `context.codexMinor === 5730` 时，把精确锚点 `this.onTimeout()},3e4))}dispose()` 改为 `this.onTimeout()},12e4))}dispose()`。
2. 保留定时器和 `onTimeout()`，不删除真正失败时的原生兜底。
3. 锚点缺失或不唯一时沿用 `replaceOnce()` fail closed，不猜测新版实现。
4. verifier 同时要求 `120s` 锚点存在、旧 `30s` 锚点不存在。
5. Reload 门禁必须同时看到 `app routes mounted`、`ready provider mounted`，并确认没有 `Webview did not finish starting`；静态资源、语法、module link 和 marker 均不能替代此门禁。

## 回滚

沿用 `.codex-patches` clean backup、临时文件原子替换、语法检查和失败事务回滚。升级前的 `26.727.40816` live 目录另存于 `/tmp`，直到新版人工验收完成。

首次 Reload 验收中，26.5730 在首次 Local Groups backup 前已经出现 Webview timeout，因此当时先回退到 `26.727.40816`。locator 必须先读取 `extensions.json` 的 active `openai.chatgpt`；只有 registry 缺失或失效时才按目录版本和 mtime 兜底，避免残留高版本目录劫持 plan/apply/verifier。

根因确认并应用 `120s` 版本限定补丁后，active registry 已恢复为 `26.5730.61639`。若后续版本改变看门狗实现或健康启动超过 `120s`，不得继续放大超时；先重新测量资源加载、root render、route mount 和 ready 时间线，再决定适配或回滚。
