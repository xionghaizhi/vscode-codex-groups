# 设计：Codex 26.5818.31338 兼容

## 已确认基线

- Marketplace linux-x64：`26.5818.31338`，发布时间 `2026-08-20T22:46:38.473Z`。
- official VSIX：`228799121` bytes，SHA-256 `6eb72e234e83b809e776fa100f377f289910fd6410d0680438bae9ac5c9cfb2c`。
- clean：`/tmp/codex-26581831338-20260821/clean-root-1787275747/openai.chatgpt-26.5818.31338`。
- bundle：Header `header-D92QSxKa.js`；App Main/Statsig/Request `app-initial-CYlXrWdX.js`；App Server/History `app-initial-D5LtbkHB.js`。
- locator 零改动即可唯一定位；`localTitlePath`、sidebar 两个可选目标为空。
- 内置 Codex CLI 从 `0.148.0-alpha.15` 更新到 `0.149.0-alpha.4`。
- 当前 active 仍为 Codex `26.5814.41407` / Local Groups `0.0.59`，live 未修改。

## 配置所有权

本次开始时用户 `config.toml` SHA-256 为 `47d1d34e2a1e0f20f86ee3a631651b539834eaa82b6287ead7431a5ae8eb9889`，mtime epoch 为 `1787275309`。这是当前只读基线；不得按旧 OpenSpec hash 回退。

## 实现原则

- 5818 使用独立 exact-build 门禁；未知 minor/build 在 `plan()` 读取 feature bundle 和 `apply()` 恢复 backup 前停止。
- 复用 helper、备份、原子写入、回滚、runtime 测试和 verifier；只新增真实 5818 变体。
- 生成契约未变时 marker 保持；生成契约变化时才升级，并保留旧 live marker 原地升级。
- engine postcondition 与 verifier 必须绑定同一真实参数对象与 brace depth，拒绝 later/nested/same-try decoy。
- official clean 先完成 plan/apply/plan 0、语法和 verifier；双轴 review 后才允许改 live。

## 最终语义映射

- Extension Host：Webview 看门狗为 `QP`，capn parser 为 `nY`。只替换唯一看门狗的 `timeoutMs:3e4` / `3e4` 为 `12e4`，保留 `onTimeout()`。
- Header：rows 为 `F/v/i/d/An`，row 为 `Te`，trigger 为 `K`，打开页标题为 `zn/Wn/In/o/s`。本地标题继续只覆盖展示；同 ID 下拉和打开页必须一致。
- Header 依赖：真实 execution-target hook `pC` 导出为 `c0`，真实 messenger singleton `cu` 导出为 `Flt`。`mtt as U$` 和 `jd as Vst` 在本 build 仍存在，但已是无关导出，不能复用旧别名。
- Power：`ogn/cgn/lgn/$hn/v$/GS/X8e`；上游仍有一份 Ultra、没有 Max，继续只补 Max 并验证菜单、校验、写入、回读。
- History：`NPn/FPn/fG/HN/mG/wPn/CPn/Cdt/cA/jk/udt`；manager/store 的 `listAllThreads()` 注入形态不变。标题 fallback 复用 `threadStorePolicy.getSummaryTitle()` / `formatTitle()` 语义，自由函数为 `$j`（标题清理）、`sw`（delegation preview 解析）、`sA`（60 字符截断）；禁止复用已变成 zod schema 或无关导出的 `wRt/AF`。
- 子 agent：`Wzn -> Uzn -> Pq(ua, export sw) -> JKr(f) -> ZKr/YKr -> DXr(xn) -> $4n(j6)`；normalized ID 为 `bs`。V1/V2 producer、parent selector、原生 guard、真实 panel 必须同链验证，不修改 `canInteract`。

## 本次已确认阻碍

1. 旧版本门禁对未知新 minor 仍会先规划通用 Host/Header。未知 minor/build 必须在读取 feature bundle、恢复 backup 或写文件前统一零规划失败。
2. 旧导出别名 `U$` / `Vst` 仍存在但语义已漂移；只按别名复用会把 Local Groups 接到错误对象。必须通过实际 hook/singleton 调用链重新求唯一导出。
3. 5814 History 的 `wRt/AF` 在 5818 已变成无关 schema/export；fixture 必须包含这些碰撞项，防止门禁假绿。
4. Main 中仍有旧压缩名碰撞。子 agent 门禁不能只看名称，必须绑定 producer、store/export、selector、filter、原生 guard 和真实 `$4n` panel。
5. 初版 postcondition/verifier 中多处全 bundle `includes` 可被 later、nested、same-try、template-string、duplicate function 或 FakePanel 假绿。最终所有 5818 门禁绑定真实函数、brace depth 和唯一参数对象；零个或多个同层作用域都拒绝。
6. official 真包的 Sol 校验函数为 `W7e`，而不是早期 fixture 中误写的 `iBe`。新增 gate 必须先在 fresh official patched 包上验证正向，再用真实 drift 加 decoy 验证负向。
7. Review 逐项发现并修复 QP、An/zn 标题、Flt/c0 import、History title/isolation、Wzn/Uzn/Pq/export/JKr、W7e/ogn/$hn/v$/t9e/a9e 的假门禁。engine 与 external verifier 现在保持相同强度。
8. Remote `code --install-extension` 可能先更新 registry 后继续异步排队安装；本次重复 Codex 安装在首次 live apply 后又覆盖了 bundle。以后必须等 `remoteagent.log` 明确出现最后一次 `Extension installed successfully`、确认没有安装进程，再执行 live apply；安装后必须重新 plan，不能沿用先前 plan 0 证据。

## 最终验证

- 自动：314 tests、compile、lint、diff-check 通过；5810/5814 回归保留。
- official：`/tmp/codex-5818-root-round2-1787283461` 完成 plan 4、apply 4、syntax 5、plan 0、external verifier。
- Review：两轮 Standards / Spec QA 最终均为 0 finding。
- config：SHA-256 和 mtime 与只读基线一致。
- live：official Codex 与 Local Groups `0.0.60` 已安装，active registry/package 校验、最终 plan 0、语法、verifier 和安装代码哈希一致性均通过。
- Reload：必须由用户实际确认，当前保持 pending。

## 验证边界

Fixture/自动、Official clean、Patched clean、Live/verifier、Reload 人工五阶段必须一次填写。Reload 证据由用户实际操作确认；未确认前保持 pending。
