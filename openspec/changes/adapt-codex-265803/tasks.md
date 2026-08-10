# Tasks

- [x] 1. 记录 26.5730 active plan、verifier、bundle 哈希、registry 和完整回滚副本。
- [x] 2. 通过 Marketplace 官方 API 确认并安装 linux-x64 `26.5803.41515`，保存未修改 clean 副本。
- [x] 3. 确认 locator 唯一定位新版 bundle，旧版 plan 因版本门禁 fail closed。
- [x] 4. 定位新版 messenger、execution target、direct host callback、Header Recent rows、项目 Hook、Power/Reasoning 和子 agent 链路。
- [x] 5. 先增加 26.5803 locator、Header 三入口、项目历史、长列表、Sol 对照、启动看门狗和幂等回归。
- [x] 6. 实现 26.5803 最小安全适配，未知版本继续 fail closed。
- [x] 7. 完成 compile、lint、tests、git diff、clean-copy plan/apply/plan 和 verifier。
- [x] 8. 应用 live bundle，确认二次 plan 为 0 且 verifier 通过。
- [x] 9. 提升 Local Groups 版本，同步 README、CHANGELOG、升级手册，打包并安装 VSIX。
- [ ] 10. Reload 后验证启动时间线和完整业务 UI 清单。

## 当前证据

- Marketplace：linux-x64 最新预发布版 `26.5803.41515`，官方 VSIX SHA-256 `7599366db5b892b790b7736b883cb73baaecd5baacfbf1c47f8f8af10d53ddbd`。
- clean：`/tmp/openai.chatgpt-26.5803.41515.clean-20260810-093910`。
- 回滚：`/tmp/openai.chatgpt-26.5730.61639-linux-x64.rollback-20260810-093148`；registry 备份 `/tmp/extensions.json.before-codex-upgrade-20260810-093148`。
- active：`/root/.vscode-server/extensions/openai.chatgpt-26.5803.41515`。
- clean-copy：`/tmp/codex-265803-validation-20260810100615` 完成 4 文件 apply、二次 plan 0、语法和 verifier。
- 仓库：compile、lint、184 tests 和 `git diff --check` 通过。
- live：二次 plan 为 0，verifier 通过；`vscode-codex-groups-0.0.54.vsix` 已打包并安装，active registry 为 `0.0.54`，安装目录 compile、plan 0 和 verifier 通过。
- 启动时间：clean 26.5803 于 09:29:28.598 请求 root render，09:30:02.008 在 `34,566ms` 完成 route mount，09:30:02.028 ready；旧 `61,906ms` 是 26.5730 上游 route mount 耗时，不是 120 秒看门狗增加的等待。
- 实施阻碍：Remote Marketplace CLI 安装未可靠完成并留下未启用目录；官方 `vspackage` 需要先解开 gzip 包装；plan/apply CLI 不读取 `CODEX_EXTENSIONS_ROOT`；大 bundle 检查必须等待最终 exit code；`$1` import 必须使用 replacement callback。处理方式和防复发门禁见 `design.md`。
- 待人工门禁：Reload 后逐项点击设置标题、设置分组、分组内新建会话，并记录 patched 26.5803 的新启动时间线。
