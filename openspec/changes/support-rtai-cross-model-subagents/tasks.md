# Tasks

- [x] 1. 用真实 rollout 确认 V2 Grok 422 与 Kimi 任务正文丢失。
- [x] 2. 核对 Codex 官方 V1/V2 消息生成和模型覆盖调用链。
- [x] 3. 在相同 rtai 地址验证 V1 Grok 与 V1 Kimi 均返回 `RESULT=OK`。
- [x] 4. 确认正式配置已保持 `multi_agent=true`、`multi_agent_v2=false`，无需写配置或修改模型目录。
- [x] 5. 增加 26.5803 V1/V2 同分支活动展示后置条件、live verifier 和 fail-closed 回归。
- [x] 6. 更新升级手册和 OpenSpec，记录禁止误启 V2 的边界。
- [x] 7. 在 `26.5803.41515` Reload 后由用户确认 GPT 显式创建 Grok/Kimi 时，对话框上方显示原生子 agent 活动。

## 验收证据

- 用户已在 `26.5803.41515` Reload 后实测并确认原生跨模型子 agent 活动显示正常，反馈“可以，没问题”。该证据不替代 `26.5803.61601` 的 Reload 门禁。
