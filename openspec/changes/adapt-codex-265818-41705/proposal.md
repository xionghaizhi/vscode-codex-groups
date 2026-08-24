# 适配 Codex 26.5818.41705

## 背景

官方 linux-x64 `openai.chatgpt@26.5818.41705` 已验证 VSIX、ZIP 和 package；现有 Local Groups 仅精确支持 `26.5818.31338`，因此 safe mode 对 41705 必须先保持零规划、零恢复、零写入。

## 目标

- 仅新增精确三段版本 `26.5818.41705` 支持，并保持未知 build/minor fail closed。
- 以官方 clean bundle 的真实 Host、Header、Main/Power、History 调用链更新 variant 和强后置条件。
- 将 Local Groups 提升到 `0.0.61`，补齐 locator、engine、verifier、decoy 和回归测试。
- 固化 OpenSpec 强制执行和主线程自验收：升级适配必须先读规格、按完整矩阵留证，不把常规 Reload/UI 回归交给用户，也不再采用“用户发现一项再补一项”的交付方式。

## 非目标

- 不改 `config.toml`，不切换 multi-agent、provider、model 或 reasoning；live 安装只使用已校验的官方 Codex VSIX 和本 change 产出的 Local Groups VSIX。
- 不扩大 31338 或其他旧 build 的锚点，不重构补丁管线。
