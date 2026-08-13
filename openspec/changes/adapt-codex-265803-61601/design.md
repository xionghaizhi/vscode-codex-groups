# 设计：Codex 26.5803.61601 兼容

## 已确认上游变化

| 职责 | 26.5803.41515 | 26.5803.61601 | 结论 |
| --- | --- | --- | --- |
| Extension Host | `out/extension.js` | `out/extension.js` | 哈希相同，metadata bridge 和 30 秒 clean 锚点未变。 |
| Header | `header-3dYZcpGE.js` | `header-C4MbtUfx.js` | 归一化 Vite 引用后相同；messenger、execution target、row/cache 和菜单锚点未变。 |
| App Main | `app-initial-D-Ftjleg.js` | `app-initial-BOIVXb2k.js` | 增加 198 bytes；模型选择函数 `tBe -> iBe`。 |
| App Server / Power | `app-initial-CF-0nv_7.js` | `app-initial-4D0dCZ-d.js` | 归一化 Vite 引用后相同；项目历史、Power、Reasoning 和子 agent 契约未变。 |

`CodexExtensionLocator.locate()` 对新版返回唯一候选，因此不修改 locator 生产代码。旧 engine 在 official clean 新版上稳定得到 4 个预期 changes 和两个错误：

```text
Codex UI 26.5803 marker: 期望 1 处匹配，实际 0 处
Codex UI 26.5803: 补丁后置条件不完整
```

## 根因与实现

`src/patchEngine.js::patchCodexUi265803()` 先按稳定校验表达式替换 Sol Max/Ultra，再按 `function tBe({userSavedModelString:` 插入 marker。第二个锚点把压缩名误当成稳定接口。

修复使用现有 `replaceRegexOnce()`，只匹配唯一：

```text
function <合法 JS 符号>({userSavedModelString:
```

replacement callback 在完整匹配前插入现有 marker，不重写函数名或函数体。`replaceRegexOnce()` 继续要求恰好一处；零处或多处仍 fail closed。

本次符号适配没有改变 Sol 生成契约，因此 `codexLocalGroupsCodexUi265803PatchVersion=1` 不升级。旧 `tBe` fixture 和新 `iBe` fixture 必须同时通过。最终 `0.0.56` 交付同时纳入 `support-rtai-cross-model-subagents` change，它只强化 V1/V2 现有分支的后置验证，不改写上游活动转换。

## 打开页标题错配的根因

复现使用同一个 conversation ID `019feeee-54a3-78b1-aac4-fd11f6a9b5e1`：

| 数据源 | 标题 |
| --- | --- |
| `~/.codex/codex-vscode-conversation-meta.json` | `积分订单导出修改` |
| `~/.codex/session_index.jsonl` 的原生 `thread_name` | `切换到指定 Git 分支` |

最近会话行已经通过 Header 安全补丁调用 `codexLocalGroupsLocalTitle()`，所以显示本地标题；打开会话后，lazy conversation 把 app main selector 生成的原生标题传入 Header `Bn`，`Bn` 直接渲染该 prop。导航 ID 没有错，metadata 也没有被覆盖，根因是两个展示入口只改了其中一个。

历史人工门禁只证明“设置标题消息可用”和“最近会话行显示本地标题”，没有点击同一行后核对打开页左上角。因此原 Reload 记录中笼统的“标题通过”必须收窄，不能继续代表两个标题入口都通过。

## 打开页标题修复边界

修复只修改 `26.5803` Header bundle 的顶层组件 `Bn`：

1. 复用同一 bundle 已有的 `codexLocalGroupsLocalTitle()`，按 `desktopDeepLinkConversationId` 查询本地 metadata。
2. 本地标题 trim 后非空时覆盖传入的原生 title；缺失或空白时保留原生 title。
3. 复用 `metadataSaved` 已触发的 `codex-local-groups-refresh` 事件，在 `Bn` 中注册和清理监听，使当前打开页立即重渲染。
4. 不修改 app main selector，不写 `session_index.jsonl`，不调用原生 thread rename，因此 Codex 原生标题仍是只读回退值。

既有 Header 安全 marker 保持不变，新增独立 `codexLocalGroupsOpenedTitle265803PatchVersion=1`。clean bundle 和已经带旧 Header marker 的 live bundle 都必须通过唯一 `Bn` 锚点补齐该契约；标题覆盖、事件订阅和事件清理任一缺失时，postcondition 与 verifier 都必须 fail closed。

## 调用链与安全边界

- Header 三入口继续使用 `addVscodeMessengerImport()`、`addExecutionTargetImport()` 和 Extension Host direct callback；本次不修改消息协议。
- Header 最近会话行和打开页 `Bn` 统一读取现有本地 metadata；不新增 metadata 字段或第二套标题状态。
- 项目历史继续使用 `_Xe/vXe`、manager 能力检测、独立分页和 root/child 本地过滤；不扩大共享 recent store。
- Power/Reasoning 继续只给 `gpt-5.6-sol` 补 Max/Ultra；其他模型不扩档。
- 26.5803 Webview 必须保留 V1 `collabAgentToolCall -> multi-agent-action` 与 V2 `subAgentActivity -> subagent-activity` 转换分支；后置条件和 verifier 检查同一分支内的成对语义，不接受无关死字符串。
- 120 秒补丁仍只修改失败预算并保留 `onTimeout()`；新 build 的真实 route mount/ready 时间必须在 Reload 后单独记录。
- 不写 Codex、provider 或认证配置，不读取或记录 Token。
- `src/codexConfig.js::configuredCustomModelProviderId()` 继续保持只读识别；升级前后记录 `config.toml` 内容哈希和 mtime，任何变化都阻断交付。

## 安装阻碍与防复发

Remote `code --install-extension <VSIX> --force` 超过 90 秒无输出。停止命令时 registry 和目录仍为旧版，但 VSCode Server 的安装任务随后完成了新版目录和 active registry 更新。

处理原则：

1. 安装前备份旧 active 目录和 `extensions.json`。
2. 无输出时同时检查 CLI 子进程、目标目录和 registry，不能只看终端。
3. 停止前后都重新检查；目标目录出现后先验证 publisher/name/version/engine、标准 `.vsixmanifest`、文件数和关键文件哈希。
4. 只有安装任务完全退出且没有有效目录时，才允许使用已记录的手工 registry 兜底。
5. locator 始终以 active registry 为准，旧目录继续保留到 Reload 人工验收完成。

## Review 阻碍与防复发

初版 V1/V2 门禁只检查事件名和展示类型字符串，不能证明它们属于同一转换分支。Review 逐步复现了四类假阳性：

1. 输出字符串位于下一 `case`、`default` 或 `switch` 闭合后。
2. V1 创建 `multi-agent-action` 对象但没有 push 到活动列表。
3. V1 的 `.tool` / `.id` 或 V2 的 `.id` 来自其他变量，不是当前 `switch` 输入。
4. 仅用长度上限的正则仍可跨越语义边界，不能替代完整转换片段。

最终后置条件和 live verifier 从外层 `switch(<event>.type)` 捕获 event，回引 V1 `.tool/.id` 和 V2 `.id`，并要求 V1 action 对象与 V2 activity 对象完成真实 push。下次升级必须保留跨分支、未 push 和错输入三组失败回归，不得退回独立 `includes` 或只检查输出字符串。

## 验证门禁

本节是当前 build 的专项证据，不能替代升级手册中的全量已知回归矩阵。修改 live 前，矩阵中自动、official clean 与 patched clean 的适用项必须全部通过；发布或宣称适配完成前，live verifier 与 Reload 人工项也必须全部有 PASS 证据。发现遗漏后必须先补矩阵和回归，再重跑全量适用项，禁止只补刚暴露的一项。

- 新版 locator fixture 使用真实 bundle 名。
- `iBe` fixture 在修复前失败、修复后通过；旧 `tBe` fixture继续通过。
- official clean 第一次 plan 必须为四个预期文件、errors 为空；apply 后二次 plan 为 0。
- Extension Host 和三个唯一 ESM bundle 语法、verifier 必须通过。
- live apply 必须备份四个文件、幂等，二次 plan 为 0，active registry 和 verifier 指向 `26.5803.61601`。
- Local Groups VSIX 安装目录必须再次通过 compile、plan 0 和 verifier。
- 每个新 clean bundle 必须同时定位最近会话标题消费者和打开页 Header `Bn`，并通过 plan、postcondition、verifier 以及缺锚点失败回归。
- Reload 后必须记录 root render / route mount / ready / timeout；设置本地标题后检查当前页即时刷新，再从最近会话点击同一 conversation，确认下拉与左上角文字一致，同时验证其余业务门禁。

## Reload 验收结果

- 新 Extension Host 使用 `openai.chatgpt-26.5803.61601` app-server；10:45:35.389 请求 React root render，10:46:40.792 记录 `app routes mounted after 66081ms`，10:46:40.811 ready。
- 日志无 Oops、资源加载失败或启动看门狗超时。ready 后有外部网络错误，但明确为 `error_is_timeout=false`，不属于本次启动失败。
- 用户当时确认设置标题动作和最近会话行显示可用，但该轮没有点击同一会话核对打开页左上角；后续截图已复现双源标题错配，因此这部分不能视为完整标题门禁通过。其余已执行门禁不受此证据修正影响。
- `66,081ms` 仍是健康但偏慢的上游 route mount，需在下一 build 继续重新测量，不得因本次 ready 成功宣称延迟已消除。
