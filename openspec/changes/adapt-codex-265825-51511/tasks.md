# Tasks

- [x] 1. 读取既有 OpenSpec/升级手册，查询 Marketplace 并校验 official linux-x64 VSIX。
- [x] 2. 确认 Host、Header、Main/Power/Subagent、Server/History 的真实 bundle、调用链和漂移点。
- [x] 3. 补 exact-build engine variant、fixture/runtime 和 fail-closed/decoy 回归。
- [x] 4. 同步 external verifier 的 exact-build variant 与负例。
- [x] 5. official clean 完成 plan/apply、语法、verifier、二次 plan 0。
- [x] 6. patched clean 完成标题、分组、分组中新建会话、历史、子 agent 双展示、Sol Max/Ultra、启动和配置只读验收。
- [x] 7. 完成全量 test、compile、lint、OpenSpec 校验和独立 review。
- [x] 8. 打包并安装新版 Local Groups；验证 active registry、安装目录哈希、compile、plan 0、verifier、Reload 输出和受影响 UI。
- [x] 9. 清理本次全部临时产物，记录最终证据、风险和待确认项。

## Evidence

- Official：Marketplace linux-x64 VSIX `242073433` bytes，SHA-256 `557e8059809647893bf5fc86fba1515528c1611afe31d56279266c2fcde2a204`；clean plan/apply 4 files、backup 4、syntax 5、幂等与 external verifier 通过，patched clean 二次 plan 为 0。
- 自动化：51511 定向 7 tests、全量 359 tests、compile 26 files、lint 26 files、`git diff --check` 与 `openspec validate adapt-codex-265825-51511 --strict` 通过。运行期实际执行 public rows wrapper、四个 metadata 入口、标题双消费、非空 history mapper/state DB、transcript/顶部面板、`f4e` 读写/default setter、`Own` compact/expanded slider 与 Sol/非 Sol 校验。
- Review：独立 reviewer 首轮发现 51511 verifier 负例和 Sol persistence/slider runtime 覆盖不足；补齐后定向复查 Critical/Important/Minor 均为 0。
- Live：active registry 与 CLI 均为 Codex `26.5825.51511`、Local Groups `0.0.65`。live Codex plan 0、syntax 5、external verifier 通过；installed Local Groups compile、plan 0、verifier 通过，仓库/安装目录 engine SHA-256 均为 `107ff9d4be5c420adc10cd5ccc3a4012fc583592411c5aa1258cb4069668242f`，verifier 均为 `1a7686ad387fdfc41adfe45e720a63ee363b28024735536e4a205a34af28835e`。
- VSIX：Local Groups `0.0.65` SHA-256 `892e195f47d2715c378d3874c086eafc5a3bbe13dcf01ec65812fbe5c134ec70`；安装日志确认成功，新 Extension Host 激活 `openai.chatgpt` 与 `xinghezhiyuan.vscode-codex-groups`，Local Groups 输出为空且不含不兼容/未应用提示。
- Startup：新 Extension Host 在 `48153ms` 挂载 app routes 并挂载 ready provider；未出现资源加载失败或错误边界。启动前的 persisted-atom legacy fallback 与后续 Statsig 网络失败没有阻止 ready，作为上游运行观察保留，不冒充 Local Groups 功能失败。
- 配置只读：`/root/.codex/config.toml` 的 size/mtime/SHA-256 始终为 `5156` / `1787908129` / `d8edde15575b9fd915ab730d56e41d44107d533f51a8757f0cf3e5b3d7b61a88`。
- 清理：删除本次完整 `/home/project/vscode/yuxi/.codex-upgrade`（含 official、patched、rollback、release VSIX/extracted），以及本次 Marketplace probe；同时清理两个有明确 Local Groups 所有权的旧日志 `/tmp/codex-local-groups-review-test.log`、`/tmp/clg-check-js.log`。已知项目临时前缀扫描为 0；保留无本次所有权证据的 `/tmp/codex-vscode-patches.lock` 与 `/tmp/codex-broken-skill-links.txt`。
