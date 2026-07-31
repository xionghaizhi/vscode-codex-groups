# OpenAI Codex 升级适配手册

> 基线日期：2026-07-31
> 当前 Codex：`openai.chatgpt@26.727.40816`
> 当前 Local Groups：`xinghezhiyuan.vscode-codex-groups@0.0.49`

本文档是下一次 OpenAI Codex VSCode 扩展升级时的执行基线。目标不是复制旧 bundle 的压缩变量名，而是恢复下文明确的功能契约、安全边界和验证门禁。

## 1. 先记住最终结论

Codex 升级后，应该恢复成以下状态：

1. 最近会话只显示当前窗口 `activeWorkspaceRoot` 根目录及其子目录。
2. 子目录会话归入当前工作区根项目，不产生第二个项目标题。
3. 不扩大共享 recent store，不给共享 `thread/list` 注入 `cwd` / `cwds`。
4. Codex `26.721` / `26.727` 通过独立项目历史查询分页读取会话，再在本地严格过滤根目录和子目录。
5. 工作区 root 未就绪、查询失败或项目归属不可确认时 fail closed，不用其他项目数据兜底。
6. 页面结构为“项目 > 需求分组 > 会话”，项目标题在内层滚动区粘性置顶。
7. **每个需求分组独立**默认显示最近 5 条，“展开更多”每次 +10，不是整个项目共享 5 条。
8. 分组上限超过 15 时，同时显示“收起到最近 15 条”和“收起到最近 5 条”。
9. 当前 active 会话即使在分组上限之后也必须额外保留；“还有 N 条”只统计实际隐藏行。
10. 最近会话菜单使用实际 `600px` 高度，列表区独立滚动，矮窗口继续受 Radix 可用高度约束。
11. 保留本地标题、设置分组、新建分组、在分组中新建会话、搜索会话和 Manage Groups。
12. Codex `26.721` / `26.727` 保留原生子 agent 活动面板，`gpt-5.6-sol` 实际 Reasoning 菜单及持久化链路都要支持 `Max` / `Ultra`。
13. 启动时只读检查，不在多窗口启动阶段后台改写 Codex bundle。
14. `26.721.41059` 的自定义 provider 使用 HTTP fallback，避免恢复压缩历史时 WS 请求丢失原生工具；不写 `config.toml`。

## 2. 当前调用链

### 2.1 启动检查

```text
src/extension.js::activate()
  -> scheduleStartupPatchCheck()
  -> runStartupPatchCheck()
  -> src/extensionLocator.js::CodexExtensionLocator.locate()
  -> src/patchEngine.js::CodexPatchEngine.plan()
  -> 有缺失时提示“修复并 Reload”
```

启动检查只做 plan。用户确认后才进入 `applyPatches()`。

### 2.2 安全应用

```text
src/extension.js::applyPatches()
  -> CodexPatchEngine.apply()
  -> 预查并恢复旧高风险补丁的 clean backup
  -> plan()
  -> 为所有待修改文件创建备份
  -> 临时文件 + rename 原子写入
  -> runSyntaxChecks()
  -> 二次 plan() 验证幂等
  -> 任一阶段失败则恢复写入前文件
```

CLI 入口 `scripts/plan-patches.js` / `apply-patches.js` / `repair-codex-ui.js` 与 VSCode 命令一样，必须使用 `safeMode: true`。

### 2.3 Header 会话数据

```text
Header 读取 activeWorkspaceRoot
  -> root ready 时调用对应版本扩展后的项目历史 Hook（26.721 `e6e` / 26.727 `Xtt`）
  -> App Server manager 独立分页历史查询
  -> 按 root / root 子目录过滤
  -> 合并原生 recent query 已有项
  -> Header 再次执行窗口级 fail-closed 过滤
  -> codexLocalGroupsProjectRowsView
  -> 项目 / 需求分组 / 会话行
```

### 2.4 Metadata 同步

```text
Header 操作
  -> qQ / VSCode messenger
  -> out/extension.js 中的 codexLocalGroupsHandleWebviewMessage()
  -> ~/.codex/codex-vscode-conversation-meta.json
  -> metadataSaved 回传 Header
  -> localStorage 合并 metadata
  -> codex-local-groups-refresh
  -> 独立分组视图重算
```

## 3. 当前 bundle 与目标契约

下表是 `26.727.40816` 快照。下一版 Vite hash、分包和压缩符号可以变，功能契约不能变。

| 当前目标 | 定位方式 | 当前 marker | 应改成什么 |
| --- | --- | --- | --- |
| `out/extension.js` | 固定路径 | `codexLocalGroupsPatchVersion=17` | 注入 metadata 消息桥，并对已确认缺陷版本的自定义 provider 增加 app-server HTTP fallback；不改共享会话请求、认证、MCP 或插件。 |
| `header-nb2Xra8M.js` | `recentTasksMenu` + `Search recent chats/tasks` | `codexLocalGroupsHeaderSafePatchVersion=15` | 当前项目严格隔离、原生 row 组件、需求分组、每组 5/+10/15/5、active 保留、粘性项目标题、600px 菜单、独立刷新、本地标题缓存失效和非字符串 `titleOverride`。 |
| `app-initial-OtKCH0aX.js` | `untitledThreadLabel` + `conversation.title` | `codexLocalGroupsCodexUi26727PatchVersion=3` | 复用新版原生子 agent 和设置读写；仅对 `gpt-5.6-sol` 保留 Max/Ultra 的模型校验。 |
| `app-initial-CToTcrdv.js` | `recentConversationsSortKey` + `thread/list` | `codexLocalGroupsProjectHistory26727PatchVersion=5` | 独立项目历史查询；manager 能力检测；代理 manager 通过 `listAllThreads()` 兼容分支返回项目会话。 |
| `app-initial-CToTcrdv.js` | `networkConfig` / Power / Subagent 语义 | `codexLocalGroupsPower26727PatchVersion=3` | 实际 Reasoning 菜单为 Sol 补 Max/Ultra，Power Picker 不过滤这两档，保留新版原生子 agent 活动发现和面板。 |

当前 locator 允许 `appMainPath` / `appStatsigPath` / `appServerManagerSignalsPath` 指向同一文件。`CodexPatchEngine.plan()` 必须对合包和分包都只规划一次写入。

## 4. 每个模块具体要改什么

### 4.1 `src/extensionLocator.js`

关键实现：

- `CodexExtensionLocator.latestExtensionDir()`：先按 `package.json.version` 选最新版，同版再按 mtime。
- `CodexExtensionLocator.locate()`：返回每个语义 bundle 的真实路径。
- `isHeaderBundle()` / `isAppMainBundle()` / `isAppServerManagerSignalsBundle()` / `isStatsigConfigBundle()`：按内容语义定位，不按 Vite hash。

下一版需要：

1. 保存新版 clean bundle 结构信息。
2. 先用旧 predicate 定位；如果是 0 个或多个候选，根据新版稳定语义更新 predicate。
3. 一个语义目标必须唯一；不允许“取第一个”。
4. 新版若把多个功能合并到同一 `app-initial-*`，保留 `plan()` 中的同路径去重逻辑。
5. 补 `test/locator.test.js` 的新版分包、合包、多候选 fail-closed 用例。

### 4.2 `src/patchEngine.js::CodexPatchEngine.plan()`

当前只验证了 `26.721` 和 `26.727`；其他 minor 版本会报：

```text
不支持的 Codex 扩展版本
```

这是正常的安全门禁。不能把当前“`<=721` 或 `===727`”的明确白名单盲目放大。应先完成 bundle 定位、调用链和回归验证，然后再明确放行新版本。

版本升级后检查：

- safe mode 仍只规划 extension host、Header 和已确认的 `26.721` / `26.727` 特性 bundle。
- 若新协议改变 `thread/list` 字段，先查新版 App Server 类型或源码；不推测 `cwd` / `cwds`。
- 仅当生成后契约变化时提升对应 marker。只有 hash 或 clean anchor 变化、生成结果不变时，marker 可保持。
- marker 提升必须保留上一个 live marker 的原地升级路径和后置条件检查。

### 4.3 `src/patchEngine.js::patchExtensionSafeHost()`

目标是保留最小 metadata 消息桥：

- `patchExtensionMetadataHelper()` 生成 `codexLocalGroupsPatchVersion=17`。
- `patchExtensionMessageHandler()` 在 Codex 原生 webview message handler 边界拦截 Local Groups 消息。
- `patchExtensionResponsesWebsocketFallback()` 仅为 `26.721.41059` 的已确认自定义 provider 追加 `supports_websockets=false` CLI 覆盖。
- 支持 `getMetadata`、`saveConversationMeta`、`archiveConversationMeta`、`setPendingGroup`、`resetPendingGroup`。
- 设置标题使用 `showInputBox(..., ignoreFocusOut: true)`。
- 设置分组使用 `showQuickPick(..., ignoreFocusOut: true)`，可选已有分组、新建分组或清除分组。

不能恢复 `patchExtension()` 的高风险完整模式。safe host 中必须不存在：

- `workspace.workspaceFolders` 项目路径注入。
- `c.cwd=s` / `c.cwds=s`。
- `requestAllThreadList(e)`。
- `"--disable","plugins"`。
- ChatGPT 认证、OAuth、Statsig 网络屏蔽。

HTTP fallback 的边界：

- provider ID 只从 `$CODEX_HOME/config.toml` 或 `~/.codex/config.toml` 顶层 `model_provider` 读取，并确认存在对应的 `[model_providers.<provider>]` 表。
- 不写配置文件，不覆盖 `amazon-bedrock`、`openai`、`ollama`、`lmstudio` 等 Codex 保留 provider。
- provider 不可确认、字符不安全或 Codex 版本变化时不应用覆盖。
- 官方修复后应移除版本门禁，不把 fallback 扩大为长期全局策略。

### 4.4 `src/patchEngine.js::patchHeader()`

Header 是升级最容易漂移的部分。新版必须通过语义重新确认以下锚点：

1. 最近会话菜单组件和原生 row 组件。
2. `activeWorkspaceRoot` 及 `isActiveWorkspaceRootLoading` 的 execution-target Hook。
3. 真正可用的 `qQ` / VSCode messenger 导出。
4. 项目历史 query Hook 的调用位置。
5. Radix 菜单外层、内层滚动区和 `contentStyle` 位置。

现有可复用实现：

- `addExecutionTargetImport()`：从真实 `app-initial-*` 导出中唯一定位 execution-target Hook。
- `matchingAppInitialImports()`：按模块内容检查 import，不硬编码 hash。
- `patchSafeHeader26721ProjectScope()`：使用窗口 root，root 未就绪时返回空列表。
- `patchSafeHeader26721ThreadSummary()`：继续把原生 `threadSummary` 传给 row，保留点击打开协议。
- `patchSafeHeader26721MenuLayout()`：实际 `600px` 高度 + `min-h-0 flex-1 overflow-y-auto`。
- `safeHeaderHelper()`：生成分组、标题、操作按钮、分组展示数和刷新组件。
- `safeHeader26721PostconditionsHold()`：校验整体契约，不是只检查 marker。

#### 每组长列表最终规则

- 状态键：`codex-local-groups-visible-counts-v1`。
- 子键：`normalizedProjectRoot + "::" + groupLabel`。
- 默认上限：5。
- 展开：`min(groupSize, currentLimit + 10)`。
- 当 `limit > 5` 时显示收起到 5。
- 当 `limit > 15` 时再显示收起到 15。
- active 会话不在当前 slice 时追加一次，不重复。
- 隐藏数：`groupSize - actualVisibleRows`，不是 `groupSize - limit`。
- 各分组点击后通过 `codex-local-groups-refresh` 立即重算，不修改上游 React compiler cache slot。

明确禁止恢复的旧实现：

- 项目级 `codex-local-groups-expanded-projects-v1`。
- `project-more-*` 项目级更多按钮。
- `codex-local-groups-expanded-all-v1/v2` 全展开布尔状态。
- 整个项目共享 5 条预算。
- metadata-only 伪会话行。
- 只改 `maxHeight: 600px` 却不设实际高度。
- `900px`、外层 `60vh` 或其他可能引起 ResizeObserver 循环的方案。

### 4.5 `src/patchEngine.js::patchProjectHistory26721()`

项目历史的最终实现是 marker v4。新版适配时必须保留：

1. worker store 有 `listProjectConversations(root)` 时，先完成 hydration，再使用 `listRecentThreads({ limit: 100, background: true })` 分页读取。
2. 检测重复 cursor，禁止无限分页。
3. 根据实际 thread cwd 匹配 root / root 子目录。
4. 与原生 recent query 按 conversation id 合并，按 recency 降序。
5. App Server registry 还没有 default manager 时，host key 稳定回退到 `local`，不调用 `null.getHostId()`。
6. manager 的 `addAnyConversationMetaCallback` / archive / unarchive / delete 监听都是可选能力，调用前检查 `typeof ... === "function"`。
7. webview 代理 manager 没有 `listProjectConversations()` 时，复用其原生 `listAllThreads({ modelProviders: null })`，在本地按 cwd 严格过滤并转为会话摘要。
8. manager 同时没有上述两个查询能力时返回空列表。
9. React Query 错误且没有旧数据时返回空列表，不显示其他项目。
10. 不使用 `Number.MAX_SAFE_INTEGER`一次扩大共享 recent store。

已经确认过的两个 Oops 根因，下次不得重复引入：

- 启动时默认 manager 为 `null`，直接调用 `getHostId()`。
- 把 worker manager 的生命周期监听和 `listProjectConversations()` 假定为所有 webview 代理都具备。

### 4.6 `patchCodexUiFeatureGate()` 和 `patchCodexPowerAndSubagents()`

这两条链路可能在新版中合包或分包，但最终目标不变：

- 子 agent discovery、topology、activity store 和 panel 开关处于启用状态。
- `gpt-5.6-sol` Power 数据有 `max` 和 `ultra`。
- `XNt` 的 supported-effort 过滤不删除 Sol Max/Ultra。
- 截图中真正的 Reasoning 菜单链路是“当前模型 -> 后端 supported efforts -> 菜单数组”。当前压缩符号为 `g$t -> XZ`，下一版应重新按语义找到它，不能只改 Power Picker。
- 仅为 `gpt-5.6-sol` 补缺少的 Max/Ultra，已存在时不重复，Terra 和其他模型不变。
- Ultra 写入不被默认 target 的旧值覆盖，配置回读不把 Sol Ultra 转为 `null`，模型验证不回退到 Light。

开关消费点数量、Power 锚点或作用域不唯一时必须停止，不得用全局字符串替换猜测新结构。

### 4.7 Metadata 和命令能力

`src/metadataStore.js::ConversationMetadataStore` 的数据契约不依赖 Codex bundle hash，升级时不应重构。

主文件：

```text
~/.codex/codex-vscode-conversation-meta.json
```

核心字段：

```json
{
  "version": 1,
  "conversations": {
    "conversation-id": {
      "title": "本地标题",
      "group": "需求分组",
      "projectRoot": "/project/root",
      "updatedAtMs": 0
    }
  },
  "pendingGroup": {
    "projectRoot": "/project/root",
    "group": "需求分组",
    "startedAtMs": 0
  },
  "archivedConversations": {},
  "archivedGroups": {},
  "migrations": {}
}
```

必须保留：

- JSON 边界校验和原子写入。
- 旧 titles JSON 和 session index 标题迁移。
- archived session 同步和 tombstone。
- `Search Conversations` 只读搜索。
- `Manage Groups` 按项目重命名、合并、清空、查看和归档。
- metadata 修改不触发 Codex bundle 重写。

## 5. 下一次 Codex 升级的标准流程

### 步骤 1：记录基线，不立即 Apply

```bash
cd /home/project/vscode/yuxi/codex-local-groups
git status --short
code --list-extensions --show-versions | grep -E 'openai.chatgpt|xinghezhiyuan.vscode-codex-groups'
ls -dt /root/.vscode-server/extensions/openai.chatgpt-* | head
npm run plan-patches
```

记录：

- 新 Codex 版本。
- 新扩展目录。
- locator 是否唯一定位所有语义 bundle。
- `plan-patches` 的完整错误，不仅仅记录“不兼容”。
- clean bundle 与已打补丁 bundle 的哈希和备份情况。

如果当前分支是 `dev` / `test` / `pre` / `prod`，先创建 `hotfix/codex-<version>-compat`，不在公共分支直接提交。

### 步骤 2：在 clean 副本上调研

不直接用 live bundle 试错。先将新 Codex 扩展复制到临时 extensions root，使用 `CodexExtensionLocator({ extensionsRoot })` 和 `CodexPatchEngine({ safeMode: true })` 调试。

调研顺序：

1. 查 `package.json.version` 和新版 bundle 列表。
2. 按第 3 节语义定位 Header、app main、project history、Power/Subagent。
3. 确认 Header 使用的 messenger 和 execution-target Hook 真实导出。
4. 跟踪最近会话原生 query、row 组件和 App Server manager 能力。
5. 跟踪 Sol Reasoning 菜单生成、设置写入、回读和校验四条链路。
6. 先补新版 fixture 和失败测试，再修 patch anchor。

### 步骤 3：按影响范围修代码

通常需检查的文件：

| 文件 | 什么情况要改 |
| --- | --- |
| `src/extensionLocator.js` | 分包名、语义特征或合包关系变化。 |
| `src/patchEngine.js` | 新版本门禁、clean anchor、生成结果或 marker 升级路径变化。 |
| `test/locator.test.js` | 新 bundle 定位、合包、分包和多候选用例。 |
| `test/patch-engine.test.js` | clean 新版 fixture、旧 live marker 升级、后置条件和 VM 行为用例。 |
| `scripts/verify-patched-bundles.js` | marker 或最终契约变化；不得只校验 marker。 |
| `test/scripts.test.js` | verifier 强契约变化。 |
| `package.json` | Local Groups 发布版本提升。 |
| `README.md` / `README.en.md` / `CHANGELOG.md` | 安装版本、兼容版本、最终行为和历史记录。 |
| `../openspec/changes/codex-local-groups-extension/` | 任务状态、契约边界、验证证据。 |

若新版只改 Vite hash，上表不代表每个文件都必须修改。只改必要的 locator / fixture / 版本文档，禁止顺手重构其他链路。

### 步骤 4：先做自动验证

```bash
npm run compile
npm run lint
npm test
git diff --check
```

必须有的新版回归：

- locator 对新版 bundle 唯一定位。
- clean 新版第一次 plan 有且只有预期变更。
- 生成的 extension script 和 ESM bundle 语法通过。
- apply 后二次 plan 为 0。
- 旧 live marker 可原地升级；marker 缺内容时 fail closed。
- root、子目录、其他项目、缺 cwd、pending row 用例。
- manager 空 registry、缺监听方法、缺 `listProjectConversations()` 但有 `listAllThreads()` 用例。
- 两个需求分组默认各 5 条，一组 +10 不影响另一组。
- 5 -> 15 -> 25，收起到 15 / 5，active 额外保留，隐藏数正确。
- 600px 高度、独立滚动和项目标题 sticky。
- Sol Reasoning 菜单 Max/Ultra、Ultra 持久化、其他模型不变。
- 子 agent 面板和活动发现。
- 旧高风险 marker 恢复事务、缺 clean backup 零写入、中途失败回滚。

### 步骤 5：验证 clean 副本

在临时 extensions root 上执行一次完整 plan / apply / 二次 plan，不先改 live 目录。验收条件：

```text
plan.errors = []
plan.changes = 预期 bundle 集合
apply.errors = []
apply.idempotent = true
二次 plan.changes = []
所有语法检查通过
```

同时在 clean 副本执行与 `scripts/verify-patched-bundles.js` 等价的完整后置条件检查。新版如果分包变化，先更新 verifier，不得为了让它通过而删除关键断言。

### 步骤 6：再应用 live bundle

```bash
npm run plan-patches
npm run apply-patches
npm run plan-patches
npm run verify-patched-bundles
```

最终要求：

- 第二次 `plan-patches` 显示待修改 0。
- `verify-patched-bundles` 检查实际安装的新 Codex 目录并通过。
- 不存在 debug logger、临时 bundle、未删除的诊断代码或凭证。

### 步骤 7：打包和安装 Local Groups

1. 提升 `package.json.version`。
2. 同步 README 安装路径、badge、CHANGELOG 和 OpenSpec。
3. 打包：

```bash
npx @vscode/vsce package --no-dependencies
```

4. 优先使用当前 remote/workspace 侧 VSCode CLI 安装：

```bash
code --install-extension ./vscode-codex-groups-<version>.vsix --force
```

5. 若 Remote CLI 长时无返回，先停止并确认没有半安装状态。仅在已备份 `/root/.vscode-server/extensions/extensions.json` 时使用手工安装兜底：解压 VSIX 中 `extension/` 到独立版本目录，校验 publisher/name/version，原子更新唯一 extension registry 记录，保留旧版目录直到新版验收完成。
6. 从已安装目录再跑 compile / plan / verifier，确认安装产物与仓库源码一致。

### 步骤 8：Reload 后人工验收

必须执行 `Developer: Reload Window`，然后按以下顺序验收：

1. Codex UI 打开无 `Oops, an error has occurred`。
2. 最近会话下拉不为空。
3. 当前窗口只有当前项目，根目录和子目录会话都在。
4. 开两个需求分组，默认各 5 条。
5. 只点第一组“展开更多”，第一组变 15，第二组仍为 5。
6. 继续展开到 25，确认同时有收起到 15 和收起到 5。
7. 分别收起到 15 和 5，数量和“还有 N 条”正确。
8. 当前 active 会话在第 5 条之后时仍显示且不重复。
9. 设置标题后，下拉中的当前会话立即显示新标题；设置分组、新建分组、在分组内新建会话都可用。
10. 菜单高度和滚动正常，项目标题滚动时保持可见。
11. 归档 / 取消归档 / 删除 / metadata 变化能刷新项目历史。
12. 5.6 Sol Reasoning 显示 Max/Ultra，选择 Ultra 后不回退 Light。
13. 子 agent 活动面板和发现链路可用。
14. `Codex Local Groups: Check Status` 不提示“当前工具不兼容，补丁未应用”。

## 6. 故障分流

### 6.1 打开即 Oops

1. 先恢复 clean bundle，不连续盲改 Header。
2. 在 clean 副本上重现。
3. 优先检查未定义 import、错误 execution-target Hook、空 manager 和不存在的 manager 方法。
4. 必要时可临时让 ErrorBoundary 输出 `message` / `stack`，但诊断后必须还原原始 logger、删除 debug backup，并重跑 module 语法和 verifier。

### 6.2 下拉打开但会话为空

优先检查：

- `activeWorkspaceRoot` 是否 ready。
- 独立 React Query 的 `enabled` / `queryFn` / error 状态。
- registry 中 manager 是 worker manager 还是 webview proxy。
- manager 是否有 `listProjectConversations()`；没有时是否有 `listAllThreads()`。
- thread 的真实 cwd 和 root 规范化是否匹配。
- 是否错误使用 metadata projectRoot 伪造历史归属。

### 6.3 右下角提示不兼容、补丁未应用

这说明 locator、版本门禁或 postcondition 有一项不通过。应读取 `plan-patches` 的精确错误，定位漂移链路。不得：

- 直接删掉版本检查。
- 把唯一匹配降级为模糊的第一个候选。
- 仅更改 marker 让 plan 变成 0。
- 删除 verifier 关键断言。

### 6.4 窗口卡死或菜单布局循环

优先恢复 clean bundle。检查是否重新引入 `900px`、外层 `60vh`、只有 `maxHeight` 的半成品高度，或改写了上游 React compiler cache slot。

## 7. 回滚

优先使用：

```text
Codex Local Groups: Restore Original Codex UI
Codex Local Groups: Reload Window
```

或终端：

```bash
npm run restore-codex-ui
```

回滚规则：

- 必须使用经过检查的 clean backup。
- 多 bundle 恢复前先预查全部备份，缺任意一个则零写入。
- 恢复中途失败时把已恢复文件回滚到操作前快照。
- 不从多个未知时间的 `.bak` 中猜一个覆盖。
- 恢复后 Reload Window，确认原生 Codex UI 可打开，再继续适配。

## 8. 已有变更的历史摘要

| Local Groups 版本 | 已解决问题 | 下次升级要保留的结论 |
| --- | --- | --- |
| v0.0.29 | `26.715` bundle 漂移、全量扫描卡 Extension Host、启动写 bundle、900px 布局循环 | 按前缀 + 语义定位；启动只读；不恢复 900px。 |
| v0.0.34 | `26.721` split bundle、错误 `Rle` import、协议 `cwd/cwds` 差异 | 检查真实导出；未验证新版 fail closed；不猜协议字段。 |
| v0.0.35 | 共享 thread list 精确 cwd 过滤丢会话，旧高风险补丁难恢复 | 默认 native-history safe mode；clean backup 事务恢复。 |
| v0.0.36-v0.0.38 | 跨窗口项目混入、子 agent 开关、Sol 菜单和 Ultra 持久化 | 使用窗口 root；同时验证菜单、写入、回读和校验链路。 |
| v0.0.39-v0.0.40 | 菜单只改 max-height 未变高、滚动区高度不稳定 | 实际 600px `contentStyle`，内层 `min-h-0 flex-1 overflow-y-auto`。 |
| v0.0.41-v0.0.42 | 长列表全构造和项目级 5 条预算的中间方案 | 不复制历史中间方案；以 v0.0.46 每需求分组独立上限为最终契约。 |
| v0.0.43 | 共享 recent 前 50 缺当前项目，根/子目录归并和跨项目隔离 | 独立项目历史查询，不扩大共享 store。 |
| v0.0.44 | 空 default manager 导致 Oops | manager 未就绪时使用稳定 host key，不解引空值。 |
| v0.0.45 | webview proxy 没有 worker listener / `listProjectConversations()` 导致 Oops 和空下拉 | 所有可选能力先检测；代理复用 `listAllThreads()`。 |
| v0.0.46 | 误把 5/15/更多做成项目级 | 每个需求分组独立 5 -> 15 -> 25，独立收起到 15/5。 |
| v0.0.49 | `26.727` Header、项目历史、Power/Reasoning 符号和 bundle 漂移 | 按新语义单独适配；复用原生子 agent 与设置链路；`26.721` HTTP fallback 不外扩。 |

## 9. Codex 26.727.40816 适配记录

### 上游变化

- Header 变为 `header-nb2Xra8M.js`，execution-target / messenger 分别从新版 `app-initial-*` 语义导出定位。
- App Main 为 `app-initial-OtKCH0aX.js`；设置读写和子 agent 活动已原生启用，只需保留 Sol Max/Ultra 校验。
- App Server / Power 为 `app-initial-CToTcrdv.js`；项目历史 Hook 从 `e6e/t6e` 变为 `Xtt/Ztt`，Power 从 `KNt/XNt/XZ` 变为 `FUt/zUt/MQ`。
- `1221508807` 旧开关已消失，不再对新版重复注入子 agent gate 补丁。

### 修改与安全边界

- `CodexPatchEngine.plan()` 只明确放行 `26.727`，未验证 minor 仍 fail closed。
- Header v15 和项目历史 v5 复用既有项目隔离、分页、分组和标题契约，仅适配新符号与 React runtime。
- Codex UI v3 只保留 Sol Max/Ultra 模型校验；Power v3 只补 Sol Max/Ultra Power 与实际 Reasoning 菜单。
- `26.721.41059` 专用 Responses WebSocket fallback 不扩展到 `26.727.40816`。

### 验证证据

- clean 副本：4 个预期文件变更，Node 24 语法通过，二次 plan 为 0，verifier 通过。
- live：4 个预期文件应用并备份，二次 plan 为 0，verifier 通过。
- 仓库：compile、lint、178 tests 通过；`git diff --check` 通过。
- VSIX：生成并安装 `vscode-codex-groups-0.0.49.vsix`；安装目录 compile、plan、verifier 通过。
- 未完成：当前窗口仍需 Reload 后执行真实 UI 和旧会话工具人工验收。

## 10. 每次适配的证据记录模板

```markdown
## Codex <version> 适配

### 上游变化
- 扩展目录：
- bundle 合并/分裂：
- Header 调用链：
- App Server manager 能力：
- Reasoning / Subagent 链路：

### 根因与修改
- 真实故障：
- 根因：
- 复用的现有实现：
- 修改的锚点/后置条件：
- 保持不变的安全边界：

### 变更文件
- `src/...`
- `test/...`
- `scripts/...`
- 版本与文档：

### 验证证据
- compile：
- lint：
- tests：
- git diff --check：
- clean plan/apply/plan：
- live plan/apply/plan：
- verifier：
- VSIX 和安装目录：
- Reload 人工验收：

### Review
- 代码/调用链：
- QA/回归：
- VSCode/UI：
- 需求外记录：
```

适配完成前，不得把“单元测试通过”等同于“真实 Codex UI 已验收”。
