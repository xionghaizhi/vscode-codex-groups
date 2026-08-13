# 支持 rtai 跨模型原生子 agent

## 背景

GPT 主线程显式创建 Grok/Kimi 子 agent 时，Multi-Agent V2 可以创建原生子线程，但通过现有 `https://rtai.jnrongtu.com/v1/responses` 请求 Grok 会返回 `422 ModelInput`，Kimi 会启动却忽略任务正文。

根因不是地址或模型白名单。V2 把任务放入 Codex 私有的 `agent_message/encrypted_content`；当前自定义 provider 对 Grok/Kimi 不兼容该输入。原生 Multi-Agent V1 使用普通文本输入，在相同地址、相同模型下均已通过。

`26.5803.61601` 后续在用户配置的 V2 模式下实测：对话正文仍能渲染 V2 `subagent-activity`，但对话框上方没有子 agent 面板。V2 membership 的 `canInteract=false` 被 composer 的 `Een` 过滤，因此正文活动存在不能证明顶部面板链路可用。该配置是用户主动选择，不是 Local Groups 可以判定或修复的“漂移”。

## 目标

- GPT 主线程可显式创建 `grok-4.5` 和 `kimi-k3` 原生子 agent。
- 子 agent 使用当前 rtai provider，不新增网关或 Token 配置。
- 对话框保留原生子 agent 活动、拓扑和状态展示。
- 把 V1/V2 差异加入升级门禁，防止下次误把 V2 白名单当成兼容修复。
- 同时验证正文活动转换和 `Up -> Cen -> visibleRows -> xn -> _Rt` 顶部面板全链，任一链路缺失都必须 fail closed。
- 记录本次未经充分确认修改用户 Multi-Agent 配置的边界事故；后续任何适配流程不得写、重排或覆盖用户 `config.toml`。

## 非目标

- 不修改 Codex Core 二进制或重实现 `spawn_agent`。
- 不代理、解密或记录子 agent 任务正文。
- 不自动写用户 `config.toml` 或认证文件。
- 不把用户选择的 V1/V2 模式改成另一模式；升级调研若需差分，只能使用隔离配置或获得用户逐次确认。
- 不给 Grok/Kimi 增加未经验证的 V2 模型目录标记。
- 不修改 V2 membership 的 `canInteract`，不放宽 `Een` 过滤来伪造顶部面板。

## 影响范围

- `src/patchEngine.js`：26.5803 Codex UI 后置条件检查 V1/V2 正文活动链，Power 后置条件检查 membership 到 composer 顶部面板的完整消费链。
- `scripts/verify-patched-bundles.js`：live verifier 同时增加 V1/V2 同分支正文转换和 composer 顶部面板全链门禁。
- `test/patch-engine.test.js`、`test/scripts.test.js`：增加 V1/V2 链路缺失、跨分支、跨 `switch` 和“只有正文活动没有顶部面板”的 fail-closed 回归。
- `docs/codex-upgrade-playbook.md`：记录跨模型配置、根因和升级验证矩阵。
