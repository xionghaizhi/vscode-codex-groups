# 支持 rtai 跨模型原生子 agent

## 背景

GPT 主线程显式创建 Grok/Kimi 子 agent 时，Multi-Agent V2 可以创建原生子线程，但通过现有 `https://rtai.jnrongtu.com/v1/responses` 请求 Grok 会返回 `422 ModelInput`，Kimi 会启动却忽略任务正文。

根因不是地址或模型白名单。V2 把任务放入 Codex 私有的 `agent_message/encrypted_content`；当前自定义 provider 对 Grok/Kimi 不兼容该输入。原生 Multi-Agent V1 使用普通文本输入，在相同地址、相同模型下均已通过。

## 目标

- GPT 主线程可显式创建 `grok-4.5` 和 `kimi-k3` 原生子 agent。
- 子 agent 使用当前 rtai provider，不新增网关或 Token 配置。
- 对话框保留原生子 agent 活动、拓扑和状态展示。
- 把 V1/V2 差异加入升级门禁，防止下次误把 V2 白名单当成兼容修复。

## 非目标

- 不修改 Codex Core 二进制或重实现 `spawn_agent`。
- 不代理、解密或记录子 agent 任务正文。
- 不自动写用户 `config.toml` 或认证文件。
- 不给 Grok/Kimi 增加未经验证的 V2 模型目录标记。

## 影响范围

- `src/patchEngine.js`：26.5803 Codex UI 后置条件同时检查 V1/V2 活动链。
- `scripts/verify-patched-bundles.js`：live verifier 增加 V1/V2 同分支活动展示门禁。
- `test/patch-engine.test.js`、`test/scripts.test.js`：增加 V1/V2 链路缺失、跨分支和跨 `switch` 假阳性的 fail-closed 回归。
- `docs/codex-upgrade-playbook.md`：记录跨模型配置、根因和升级验证矩阵。
