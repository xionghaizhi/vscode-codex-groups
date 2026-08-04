# 修复 Codex 26.727 metadata 操作消息桥

## 背景

`openai.chatgpt@26.727.40816` 更新后，最近会话分组仍能显示，但“设置标题”“设置分组”“在此分组新建会话”同时无响应。

v0.0.49 沿用了旧版 `qQ` 导出名假设。26.727 中 `qQ -> Cp` 实际是实时语音状态，正确 VSCode messenger 为 `N0 -> Au`。Header helper 又用 `try/catch` 吞掉了方法不存在异常，因此 UI 没有错误提示。

## 目标

- 按实现语义定位 VSCode messenger，不依赖压缩导出名。
- 修复三个 metadata 操作入口，并支持错误 live import 原地升级。
- 固化测试、verifier 和人工验收门禁，防止下次 Codex 更新重复出现。

## 非目标

- 不改变 metadata 数据结构、标题或分组业务规则。
- 不修改 Codex 认证、会话数据、权限、sandbox 或插件能力。
- 不重构 Header 分组 UI。

## 影响范围

- `src/patchEngine.js`：messenger 导出识别与错误 import 升级。
- `test/patch-engine.test.js`：26.727 三入口消息反馈环与升级回归。
- `scripts/verify-patched-bundles.js`：拒绝已知错误 import。
- 版本、升级手册和发布记录。
