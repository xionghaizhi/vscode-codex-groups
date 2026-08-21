# Tasks

- [x] 1. 记录 active 5814、Local Groups 0.0.59、当前用户 config SHA/mtime。
- [x] 2. 通过 Marketplace API 确认 linux-x64 `26.5818.31338`，下载并校验 official VSIX SHA-256/ZIP/package。
- [x] 3. 在 official clean 验证 locator 唯一定位新拓扑，确认当前版本门禁且 live 未修改。
- [x] 4. 调研 Host/Header/UI/Power/History/子 agent 真实调用链和唯一锚点，补设计映射。
- [x] 5. 先补 5818 独立 fixture、locator、runtime、断链和未知 minor/build 红测，再实现精确适配。
- [x] 6. 同步 verifier，覆盖 Metadata 四入口、标题双消费、Sol、History 和子 agent producer/consumer。
- [x] 7. 完成全量 tests、compile、lint、diff-check、OpenSpec strict；config SHA/mtime 不变。
- [x] 8. 在 official clean 完成 plan/apply/plan 0、语法、verifier，并复验 5810/5814 不回归。
- [x] 9. Standards/Spec 双轴 review 通过后安装 official Codex 和 Local Groups 0.0.60，完成 live plan/apply/plan 0/verifier。
- [x] 10. 同步 README、CHANGELOG、升级手册和本 OpenSpec，记录实际阻碍与防复发规则。
- [ ] 11. 用户 Reload Window 后按全量矩阵人工验收。

## 当前证据

- official VSIX：`/tmp/codex-26581831338-20260821/openai.chatgpt-26.5818.31338-linux-x64.vsix`。
- official clean：`/tmp/codex-26581831338-20260821/clean-root-1787275747/openai.chatgpt-26.5818.31338`。
- VSIX SHA-256：`6eb72e234e83b809e776fa100f377f289910fd6410d0680438bae9ac5c9cfb2c`；ZIP 完整性通过。
- locator：Header `header-D92QSxKa.js`；Main `app-initial-CYlXrWdX.js`；Server `app-initial-D5LtbkHB.js`；唯一定位通过。
- 最终自动化：314 tests PASS；compile 24 files、lint 24 files、`git diff --check` 通过。
- root fresh patched clean：`/tmp/codex-5818-root-round2-1787283461`；plan 4、apply 4、备份 4、syntax 5、二次 plan 0、external verifier 通过。
- Review：两轮 Standards / Spec QA 最终均为 Critical 0、Important 0、Minor 0。
- 未知 5810/5814/5818 build、未来 minor 和带后缀 `26.5818.31338.1` 均在 plan/restore/write 前零规划失败；文件内容与 mtime 不变。
- config baseline：SHA-256 `47d1d34e2a1e0f20f86ee3a631651b539834eaa82b6287ead7431a5ae8eb9889`，mtime epoch `1787275309`。
- live Codex：active registry / relativeLocation / package 为 `26.5818.31338` / `openai.chatgpt-26.5818.31338`；最终 plan 0、语法和 verifier 通过。
- Local Groups：`vscode-codex-groups-0.0.60.vsix`，SHA-256 `c7ab3bc568db83a2ee44118221b44511750d18bacb493d4bc3cdd3d162df4c34`；active `0.0.60`，patchEngine/locator/verifier 与 worktree 哈希一致。
- Reload UI：pending。
