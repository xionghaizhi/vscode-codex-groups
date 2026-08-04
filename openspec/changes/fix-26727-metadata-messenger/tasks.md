# Tasks

- [x] 1. 用真实 26.727 导出表确认 `qQ -> Cp` 与 `N0 -> Au`，定位三个入口同时失效的根因。
- [x] 2. 增加 singleton + 两种 dispatch 的 messenger 语义识别，26.727 不再按 `qQ` 猜测。
- [x] 3. 支持 v0.0.49 错误 messenger import 在 Header marker 早退前原地升级。
- [x] 4. 补正确 import、三入口消息、`new-chat`、错误 import 升级和幂等回归。
- [x] 5. verifier 拒绝 26.727 的错误 `qQ` import。
- [x] 6. 完成 compile、lint、178 tests、live apply、二次 plan 0 和真实 bundle verifier。
- [x] 7. 升级、打包并安装 `xinghezhiyuan.vscode-codex-groups@0.0.50`。
- [x] 8. 用户 Reload 后确认设置标题、设置分组和分组内新建会话均恢复。

> 2026-08-04：Phase 完成。后续 Codex 适配不得复用压缩导出名，必须执行 Design 中的完整消息链证明和三入口人工验收。
