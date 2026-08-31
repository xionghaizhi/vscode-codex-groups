# Tasks

- [x] 1. 读取既有 OpenSpec 与升级手册；下载、校验 official linux-x64 VSIX/package，并记录 clean bundle 清单。
- [x] 2. 对照完整矩阵确认 Host、Header、Main/Power/Subagent、Server/History 的真实 producer/consumer、作用域和调用链。
- [x] 3. 先补 5825 fail-closed、真实 fixture/runtime 与 decoy 失败回归，再实现 exact-build variant。
- [x] 4. 完成测试与升级工作流临时产物所有权登记和 guaranteed cleanup，覆盖 pass/fail/no-match/throw 与所有产物类型。
- [x] 5. official clean 完成唯一 locator、预期 plan/apply、语法、external verifier、二次 plan 0 和配置只读门禁。
- [ ] 6. patched clean 完成启动、项目历史、标题、分组、新建会话、子 agent、Sol Max/Ultra 的确定性验收与性能基线。
- [x] 7. 完成 npm test、compile、lint、diff-check 和 OpenSpec strict validation。
- [ ] 8. 安装 live Codex 与 Local Groups，重新验证 active registry、plan 0、verifier、真实数据/UI 等价、启动/冷加载耗时和 config 只读。（安装、registry、plan 0、verifier、确定性 runtime 与 config 已通过；Reload 后 UI 截图和冷加载耗时尚无证据。）
- [x] 9. 启动新的独立子 agent review；最多两轮需求内修复，第三轮停止并汇报。
- [x] 10. 更新 OpenSpec 证据、升级手册、README、CHANGELOG 和版本号；清理全部本次临时产物并提交当前分支。
- [x] 11. 修复 5825 最近会话下拉 wrapper 误用 React 别名 `$` 的运行时崩溃；将 Header marker 升为 v2，支持已安装 v1 原位迁移，并把 wrapper 实际执行加入回归与 external verifier。
- [x] 12. 将含 v2 迁移逻辑的 Local Groups `0.0.64` 打包覆盖安装，防止 Reload 后修复前的 `0.0.63` 引擎将 Header v2 误报为不兼容。
- [x] 13. Reload 后用户确认 `0.0.64` 不再弹出“Codex 版本不兼容/补丁未应用”误报；将最终 VSIX、active registry、安装目录哈希、安装目录 plan/verifier、Reload 日志和受影响 UI 入口统一列为下次升级强制门禁。

## Evidence

- Marketplace：`openai.chatgpt@26.5825.32147`，linux-x64，发布于 `2026-08-28T07:18:17.907Z`。
- Official VSIX：`240907669` bytes；SHA-256 `f337c04eb940d53889c61704505ea3a62f6c547706ed5209a4316cba6edf158f`；ZIP 与 `extension/package.json` 校验通过。
- Clean bundle：Header `header-BE8_0Va3.js`；Server/History `app-initial-DOdr0yAB.js`；Main/Power/Subagent `app-initial-DraLrsJK.js`。
- 语义归属：Host `DY/yP/renderer_ready`；Header `On/Ze/Ln` 与 Main exports `_pt/w8`；Main `Mbr/Abr/p4/gMr/uIr/EHn/a8n`、Power `hEn/uEn/B$`；Server `zun/Vun/RCt/HCt`。
- 清理门禁：test runner 覆盖 helper/direct 临时路径及 pass/fail/no-match/throw；upgrade workspace 覆盖 official/extracted/patched/rollback/VSIX/npm-cache/review/probe/schema/log/helper，并禁用 Node child compile cache。
- 自动化：5825 定向 11 tests、全量 351 tests、compile/lint 26 files、diff-check、OpenSpec strict 通过；official clean 为 plan/apply `4/4`、backup 4、syntax 5、二次 plan 0、external verifier 通过。
- Review：第一轮修复 sole nested/string、`canInteract`、Sol model guard 与硬编码 official artifact；第二轮修复完整 nested chunk、不可达 startup 和空 relay。最终 Critical/Important/Minor 均为 0，五个精确 mutation 均被 engine/verifier 拒绝。
- Live：active Codex `26.5825.32147`、Local Groups `0.0.63`；live plan 0/verifier 与安装文件哈希一致。VSIX SHA-256 `a3425ec42c2042b93ce417b64bd1fe3b48188b3548c57ae399bd9004f6f0b3de`；`config.toml` size/mtime/SHA-256 保持 `5156` / `1787908129` / `d8edde15575b9fd915ab730d56e41d44107d533f51a8757f0cf3e5b3d7b61a88`。
- 最终清理：删除本次 `/home/project/vscode/yuxi/.codex-upgrade`，归属 wrapper 自动回收全部 `/tmp/codex-upgrade-*`；另按精确夹具证据清理 11 个旧 `/tmp/codex-patch-*`。已知项目临时前缀递归扫描为 0，未删除共享 cache 或无所有权证据的目录。
- 下拉 hotfix：真实 `Codex.log` 错误边界指向 `codexLocalGroupsProjectRowsView`；直接执行 live wrapper 稳定复现 `ReferenceError: $ is not defined`。实际 Header React runtime 为 `Pn`；修复后 v1/$ 原位迁移为 v2/Pn，全量 352 tests、compile/lint、live plan 0、external verifier 和 live wrapper 执行通过；`config.toml` size/mtime/SHA-256 不变。
- 安装包闭环：Reload 误报时，active Local Groups `0.0.63` 的 `patchEngine.js` 仍只识别 Header v1，与仓库 v2 引擎哈希不同。已打包并安装 `0.0.64`（VSIX SHA-256 `b5ac1b971fb2ff6cd651cbae99f9fb43b38e5a43ead08c27425a0b168be67036`）；active registry 指向 `xinghezhiyuan.vscode-codex-groups-0.0.64`，安装目录 engine/verifier 与仓库哈希一致，从安装目录执行 compile、plan 0 和 verifier 均通过。
- 人工确认：用户在安装 `0.0.64` 并 Reload 后确认本次问题已解决，不再出现“当前 Codex 扩展版本不兼容、补丁未应用”的两条误报。该确认只覆盖本次误报和相关入口，不冒充冷启动耗时或其他未单独观察的 UI 证据。
