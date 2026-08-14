# 适配 Codex 26.5810.41047

## 背景

Microsoft Marketplace 最新 linux-x64 预发布版已从 `openai.chatgpt@26.5803.61601` 更新到 `26.5810.41047`。现有 locator 仍能唯一定位 Header、app main/statsig 和 App Server，但 `CodexPatchEngine.plan()` 因 minor 白名单 fail closed：`不支持的 Codex 扩展版本：26.5810.41047`。

新版不是 26.5803 的同 minor 重压缩。资源拓扑从“main 与 server/statsig 部分合包”变成：

- Header：`header-DPGKK91L.js`
- App main + Statsig + Power + composer：`app-initial-CuO8rPSL.js`
- App Server / 项目历史：`app-initial-DLJA_f9P.js`

压缩符号整体漂移。Webview 看门狗从旧 `this.onTimeout()},3e4))}dispose()` 改为 `var jP=class` 内 `timeoutMs:3e4},3e4`。上游 Power 已有 `gpt-5.6-sol:ultra`，仍没有 `gpt-5.6-sol:max`。

## 目标

- 用 26.5810 专用 marker / 后置条件 / verifier 完成 official clean plan/apply/plan。
- 保留项目隔离、每分组 5/+10/15/5、600px 菜单、四个 metadata 入口、标题双消费、Sol Max/Ultra、V1/V2 transcript 与 composer 面板链。
- 30s 看门狗按唯一 `jP` 语义改为 120s。
- 只补缺失 Max，不复制或改写原生 Ultra 对象。
- 不修改用户 `config.toml`；review 通过后安装 live，但 Reload 人工验收必须由用户执行；不 commit。

## 非目标

- 不把 26.5803 压缩名复用到 26.5810。
- 不扩大到未验证的其他 minor。
- 不切换用户 V1/V2，不 patch `canInteract`。
- 不把 `26.721.41059` HTTP fallback 扩到本版。
- 不写原生 thread title / `session_index.jsonl`。

## 影响范围

- `src/patchEngine.js`：白名单、5810 Header/UI/Power/History/timeout、messenger 扫描、syntax null guard。
- `test/locator.test.js`、`test/patch-engine.test.js`、`test/scripts.test.js`。
- `scripts/verify-patched-bundles.js`。
- `package.json`、README、CHANGELOG、升级手册、本 OpenSpec。
