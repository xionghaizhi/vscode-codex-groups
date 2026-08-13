# Tasks

- [x] 1. 用真实 rollout 确认 V2 Grok 422 与 Kimi 任务正文丢失。
- [x] 2. 核对 Codex 官方 V1/V2 消息生成和模型覆盖调用链。
- [x] 3. 在相同 rtai 地址验证 V1 Grok 与 V1 Kimi 均返回 `RESULT=OK`。
- [x] 4. 在隔离差分中确认 `multi_agent=true`、`multi_agent_v2=false` 可让 Grok/Kimi 收到普通正文；该证据不授权修改用户正式配置或模型目录。
- [x] 5. 增加 26.5803 V1/V2 同分支活动展示后置条件、live verifier 和 fail-closed 回归。
- [x] 6. 更新升级手册和 OpenSpec，记录 V1/V2 provider 差异与用户配置所有权边界。
- [x] 7. 在 `26.5803.41515` Reload 后由用户确认 GPT 显式创建 Grok/Kimi 时，对话框上方显示原生子 agent 活动。
- [x] 8. 在 `26.5803.61601` 用户配置的 V2 模式下复现“正文有子 agent 样式、对话框上方没有面板”，确认 membership `canInteract=false` 被 `Een` 过滤。
- [x] 9. 纠正一次越界配置修改：用改动前备份把正式配置逐字恢复为用户原值 `multi_agent=true`、`multi_agent_v2=true`；不修改 `canInteract` 或 `Een`。
- [x] 10. 增加 `Up -> Cen -> visibleRows -> xn -> _Rt` 顶部面板全链的 patch postcondition、live verifier 和“正文仍存在但 `_Rt` 消费缺失” fail-closed 回归。
- [x] 11. 在 official clean 副本、patched clean 和 live bundle 完成顶部面板全链验证。
- [ ] 12. 保持用户正式配置不变，Reload `26.5803.61601` 后显式创建 Grok/Kimi 子 agent，分别记录顶部 composer、对话正文和任务正文结果；已知 V2 限制必须如实记录，不得为通过门禁改配置。

## 验收证据

- 用户已在 `26.5803.41515` Reload 后实测并确认原生跨模型子 agent 活动显示正常，反馈“可以，没问题”。该证据不替代 `26.5803.61601` 的 Reload 门禁。
- `26.5803.61601` 已确认正文 activity 和顶部面板是独立消费链；本次缺面板是 V2 membership 被 `Een` 排除，不是正文 activity 组件缺失。
- 当前正式配置已按用户要求恢复为改动前的 V2 选择。顶部面板静态全链已由 patch postcondition 和 verifier 覆盖 producer、selector、export、筛选、可见性、渲染和摘要作用域变化，official clean 隔离副本与 live bundle 均通过；compile、lint、206 tests 和 OpenSpec strict validation 通过。
- Reload 后按用户 V2 配置记录顶部 composer、transcript 和任务正文的人工证据仍为 pending；完成前不得引用旧 build 的“可以，没问题”宣称本 build 通过。
