# 设计：Codex 26.727 metadata 消息桥修复

## 已确认调用链

```text
Header 操作按钮
  -> codexLocalGroupsPromptTitle / codexLocalGroupsPromptGroup
  -> codexLocalGroupsStartConversationInGroup
  -> VSCode messenger dispatchMessage / dispatchHostMessage
  -> out/extension.js::codexLocalGroupsHandleWebviewMessage()
  -> VSCode InputBox / QuickPick / new-chat
```

## 根因与测试盲点

- 错误 import：`qQ as codexLocalGroupsMessengerImport`。
- 真实含义：`qQ -> Cp` 是实时语音状态，不具备 messenger 方法。
- 正确导出：`N0 -> Au`，由 `getInstance()` 创建，并同时使用 `dispatchMessage()`、`dispatchHostMessage()`。
- 旧测试只检查按钮/helper 字符串，再用自造 messenger stub 执行 helper，没有验证 Header import 对应的真实导出能力。

## 方案

1. 复用 `matchingAppInitialImports()` 扫描 Header 实际导入的 `app-initial-*`。
2. 候选导出必须满足：由 `getInstance()` singleton 产生，并同时存在两种 dispatch 调用。
3. 26.727 找不到唯一语义候选时 fail closed，不回退猜测 `qQ`。
4. messenger import 修复必须发生在 Header marker 早退之前，使 v0.0.49 live Header 可原地升级。
5. 保留旧版已验证的 `vscode-api` / `qQ` 兼容分支，不改变其调用协议。

## 永久升级门禁

后续每次 Codex 更新必须从新版 clean bundle 重新证明：

```text
Header import
  -> exported local
  -> singleton
  -> dispatchMessage + dispatchHostMessage
  -> extension host 消费
```

压缩导出名、marker 存在、按钮文本或 helper 字符串均不能单独作为兼容证据。Reload 后必须分别点击三个入口，确认标题输入框、分组选择框和新会话导航真实出现。

## 回滚

补丁仍使用现有 `.codex-patches` clean backup、语法检查和写入失败回滚。识别不唯一时不写 Header。
