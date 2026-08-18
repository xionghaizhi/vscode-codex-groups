# Tasks

- [x] 1. 记录 active 52044、Local Groups 0.0.58、当前 plan 0、用户 config SHA/mtime。
- [x] 2. 通过 Marketplace API 确认 linux-x64 `26.5814.41407`，Range 下载并校验 official VSIX SHA-256/ZIP/package。
- [x] 3. 在 clean 副本验证 locator 唯一定位新拓扑，确认新 minor fail closed 且 live 未修改。
- [x] 4. 调研 Host/Header/UI/Power/History/子 agent 的真实调用链和唯一锚点，补设计映射。
- [x] 5. 先补 5814 fixture、locator、断链和未知 build 红测，再实现精确版本适配。
- [x] 6. 同步 verifier，同强度验证标题双消费、Metadata 四入口、Sol 和子 agent 双消费链。
- [x] 7. 完成 compile、lint、全量测试、diff-check、OpenSpec strict；config SHA/mtime 不变。
- [x] 8. 在 5814 official clean 完成 plan/apply/plan 0、语法、verifier；复验 5810 双 build 不回归。
- [x] 9. 主线程 review 通过后安装 official Codex 和 Local Groups 0.0.59，完成 live plan/apply/plan 0/verifier。
- [x] 10. 同步 README、CHANGELOG、升级手册和本 OpenSpec，记录本次阻碍与防复发规则。
- [ ] 11. 用户 Reload Window 后按全量矩阵人工验收。

## 当前证据

- official VSIX：`/tmp/codex-26581441407-20260818/openai.chatgpt-26.5814.41407-linux-x64.range.vsix`。
- official clean：`/tmp/codex-26581441407-20260818/clean-root/openai.chatgpt-26.5814.41407`。
- VSIX SHA-256：`a25dc61555d079b989e32c22017cd5e43e0b6894d3428481ae34581838c66708`；ZIP 完整性通过。
- 最终自动化：274 tests PASS；compile、lint、diff-check 通过。覆盖真实 41407 fixture、未知 build 零规划/零恢复、Metadata 四入口、分组 25 条、标题双消费、Sol Max/Ultra、History、V1/V2 membership 与 composer 断链，以及 nested/same-try decoy 负例。
- config baseline：SHA-256 `dbee59d4f58bb49fb0f2245207a85c8e283824965b3a15bc5b87ae041be069ea`，mtime epoch `1786951796`。
- official patched clean：`/tmp/codex-26581441407-20260818/final-nested-1787028868`；首次 plan 4、apply 4、二次 plan 0、语法和 verifier 通过。
- live active：Codex `26.5814.41407` / Local Groups `0.0.59`；四个核心 bundle apply 后 plan 0、verifier 通过。Local Groups VSIX SHA-256 为 `f08ae7b9cf2c88198c15963cbafbf5f93b2da8dfc303f1c5cb430c2cebdcf9de`，安装目录关键代码与 worktree 哈希一致。
- `config.toml` 验证后 SHA-256 仍为 `dbee59d4f58bb49fb0f2245207a85c8e283824965b3a15bc5b87ae041be069ea`，mtime epoch 仍为 `1786951796`。
- 代码 Standards 与 Spec review 最终均为 0 finding；Reload 人工矩阵仍 pending。
