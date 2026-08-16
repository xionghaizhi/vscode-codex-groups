# 适配 Codex 26.5810.52044

## 背景

Microsoft Marketplace 最新 linux-x64 预发布版从 `openai.chatgpt@26.5810.41047` 更新到 `26.5810.52044`。这是同 minor 的全量重压缩：分包拓扑不变，Vite hash 与压缩符号整体漂移。现有 locator 仍能唯一定位四个语义 bundle，且 Extension Host 锚点（`jP` 看门狗、capn 消息桥、metadata helper）全部未漂移；Header / UI / Power / History 的 5810 专用锚点全部失配，safe plan fail closed（16 项错误）。

获取阶段阻碍：Marketplace CDN 直下载多次断流、官方 CLI 安装失败；最终通过 HTTP/1.1 Range 分段续传获得完整官方 VSIX，并独立校验 SHA-256 `193a2a17e0ebe0b7938a6f7416f84c786426f3f1b76d235aa970cf8e09554bf2` 后解包。

## 目标

- 把 5810 专用 patch / 后置条件 / verifier / fixture 的锚点一次性更新到 52044 符号，恢复 official clean plan 4 / apply 幂等 / 二次 plan 0 / verifier。
- 同 minor 双 build 兼容：按完整版本号显式选择 41047/52044 变体，clean 41047 维持 plan 4 / apply / plan 0 / verifier，已 patched 41047 幂等 plan 0 / errors []；未知 5810 build fail closed；不复制共享业务 helper。
- 保留项目隔离、每分组 5/+10/15/5 双收起、600px 菜单、metadata 四入口、标题双消费、Sol Max/Ultra、V1/V2 transcript 与 composer 面板全链、120s 看门狗。
- marker 保持 `=1`：注入的生成契约不变，仅上游压缩锚点漂移。
- 记录获取阻碍与替代流程，防止下次把残件当 official clean。

## 非目标

- 不修改 locator（语义定位全部命中）。
- 不修改用户 `config.toml`，不切换 V1/V2，不 patch `canInteract`。
- Kimi 实现阶段不修改 live；主线程通过 official clean 与双 build review 后才安装 live。未取得用户 Reload 证据前，人工验收保持 pending，不预写 PASS。
- 不顺手重构其他版本链路。

## 影响范围

- `src/patchEngine.js`：5810 Header/UI/Power/History 锚点与命名后置条件，按 build 变体表驱动。
- `scripts/verify-patched-bundles.js`：同强度 5810 断言换名。
- `test/patch-engine.test.js`、`test/scripts.test.js`：5810 fixture 与断链负例换名。
- `package.json` 0.0.58、README、CHANGELOG、升级手册、本 OpenSpec。
