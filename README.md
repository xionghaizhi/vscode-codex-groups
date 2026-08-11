# Codex Local Groups

<p align="center">
  <strong>简体中文</strong> | <a href="README.en.md">English</a>
</p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="release" src="https://img.shields.io/badge/release-v0.0.55-blue">
  <img alt="VSCode" src="https://img.shields.io/badge/VSCode-%5E1.96.2-007ACC">
  <img alt="Codex" src="https://img.shields.io/badge/Codex-local_groups-10a37f">
</p>

Codex Local Groups 是一个独立 VSCode 扩展，用于给 OpenAI Codex VSCode 扩展补充本地会话标题和需求分组能力。扩展会自动发现已安装的 Codex 扩展，保守 patch 目标文件，并在写入前创建备份。

## 预览

<p align="center">
  <img src="https://github.com/xionghaizhi/vscode-codex-groups/raw/HEAD/docs/codex-local-groups-preview.png" alt="Codex Local Groups grouped recent tasks preview" width="656">
</p>

## 功能

- 本地会话标题别名。
- 按“项目 > 需求分组 > 会话”展示最近会话。
- 最近会话只显示当前窗口工作区；项目根目录和子目录会话归入同一项目，其他项目不会混入。
- 每个需求分组独立默认渲染最近 5 条；“展开更多”每次增加 10 条，展示上限超过 15 条时可收起到 15 条或 5 条。各分组状态互不影响，当前打开会话位于上限之后时仍保留。
- 顶部最近任务列表里，每个本地会话右侧有同一行的 `设置标题 / 设置分组` 操作，用 VSCode 输入框保存，减少列表纵向占用。
- 项目下 `+ 新建分组并开始会话`，输入分组名后自动打开新会话。
- 分组标题右侧 `+ 在此分组新建会话`，新会话自动归入该分组。
- `Check Status` 检查 Codex 扩展、patch 状态、metadata 和会话数量，并提供 Apply / Reload 快捷操作。
- `Search Conversations` 用 VSCode QuickPick 搜索本地标题、分组、项目路径或会话 ID，并跳转到选中的 Codex 会话。
- `Manage Groups` 用 VSCode QuickPick 批量重命名、合并、清空分组，并查看分组下会话。
- 默认只 patch metadata 消息桥、最近会话分组渲染、Codex 26.721/26.727/26.5730/26.5803 独立项目历史查询及下拉固定高度，不改写共享最近会话 store、认证、插件或会话数据。
- 自动迁移旧标题文件：
  - 旧：`~/.codex/codex-vscode-conversation-titles.json`
  - 新：`~/.codex/codex-vscode-conversation-meta.json`
- 为避免启动阶段白屏，VSCode 启动时只读检查 Codex bundle，不会后台自动改写；检测到升级覆盖补丁时，可一键“修复并 Reload”。
- Codex UI 异常时可用 Repair 恢复 clean bundle 后重打补丁。
- 想停用本扩展增强时，可用 Restore Original Codex UI 只恢复 clean bundle，不重新打补丁。

## 安全模式边界

v0.0.36 起，扩展入口统一使用 native-history safe patch：

- 不给共享最近会话请求添加 `cwd` / `cwds`，避免跨窗口状态污染和精确 cwd 过滤漏掉子目录。
- Codex 26.721/26.727/26.5730/26.5803 为当前窗口单独分页读取历史，再按 `activeWorkspaceRoot` 严格保留根目录及子目录会话；工作区根目录尚未就绪时列表保持空白，不展示其他项目兜底数据。
- 缺少真实 cwd 的项不会用 metadata 伪造项目归属；会话数据、SQLite、session 文件均不写入。
- Header 保留 Codex 上游返回的全部输入，但每个需求分组首屏只构造最近 5 个会话行；每组展示数状态使用独立 UI localStorage，不改会话 metadata。
- 不用 metadata 合成可点击的伪历史行；metadata 只提供标题和分组信息。
- Codex 26.721/26.727/26.5730/26.5803 最近会话菜单实际高度设为 `600px`，矮窗口继续由 Radix 原生可用高度限制，列表区域独立滚动。其他版本保持原高度，不修改 React compiler cache、认证、插件或网络请求。
- Codex 26.721/26.727/26.5730/26.5803 保留或启用原生子 agent 活动面板，并在 5.6 Sol 本地推理档位中保留 `Max`、`Ultra`。
- 若发现旧版高风险补丁，Apply 会先恢复 clean backup；无法恢复则停止，不混合新旧补丁。

## 安装

### 方式一：从源码安装

```bash
git clone https://github.com/xionghaizhi/vscode-codex-groups.git
cd vscode-codex-groups
```

将扩展目录复制到 VSCode 扩展目录，目录名建议包含版本号：

```bash
cp -r . ~/.vscode/extensions/vscode-codex-groups-0.0.55
```

远程 VSCode Server 场景可复制到远程扩展目录，例如：

```bash
cp -r . ~/.vscode-server/extensions/vscode-codex-groups-0.0.55
```

然后在 VSCode 中执行：

1. `Developer: Reload Window`
2. 按启动提示选择“修复并 Reload”。若未出现提示，手动执行 `Codex Local Groups: Apply Patches` 后 Reload Window。

### 方式二：安装 VSIX

可以从 GitHub Actions 下载自动打包产物：

1. 打开仓库的 `Actions` 页面。
2. 选择 `Package VSIX` workflow。
3. 打开最近一次成功运行，下载 `vscode-codex-groups-vsix` artifact。
4. 解压后得到 `.vsix` 文件。推送 `v*` 标签时，同一个 VSIX 也会自动上传到 GitHub Release 附件。

也可以本地打包：

```bash
cd vscode-codex-groups
npx @vscode/vsce package
```

下载或打包 `.vsix` 后安装：

```bash
code --install-extension vscode-codex-groups-0.0.55.vsix
```

远程 VSCode Server 场景下，建议在远程窗口里安装，并确认扩展运行在 remote/workspace 侧。

## 使用

### 首次使用

1. 确认已安装 OpenAI Codex VSCode 扩展。
2. 安装本扩展。
3. Reload Window 后按启动提示选择“修复并 Reload”。
4. 若未出现提示，手动执行 `Codex Local Groups: Apply Patches` 后 Reload Window。

### 设置本地标题 / 需求分组

1. 打开 Codex 最近会话列表。
2. 找到本地会话行。
3. 点击会话右侧同一行的 `设置标题` 或 `设置分组`。
4. 在 VSCode 输入框里输入内容。
5. 保存后关闭并重新打开最近会话列表即可看到新标题或分组；如当前 webview 仍加载旧补丁，可 Reload Window 一次。

这是最直接的分组创建方式：输入一个不存在的分组名，会自动创建该分组并把当前会话放进去。

### 新建分组并开始会话

1. 在最近会话列表找到目标项目。
2. 点击项目下方的 `+ 新建分组并开始会话`。
3. 输入新分组名。
4. Codex 会打开新会话，并在可识别时自动归入该新分组。

### 在指定分组中新建会话

1. 在最近会话列表找到目标项目和需求分组。
2. 点击分组标题右侧 `+ 在此分组新建会话`。
3. 新会话会打开，并在可识别时自动归入该需求分组。

### 打开 metadata

命令面板执行：

```text
Codex Local Groups: Open Metadata JSON
```

metadata 文件默认位于 Codex 用户目录：

```text
~/.codex/codex-vscode-conversation-meta.json
```

### 重置 pending group

如果点击 `+` 后新会话没有正常归组，或 pending 状态异常：

```text
Codex Local Groups: Reset Pending Group
```

如仍未同步，可执行 Reload Window 重新加载当前 Codex webview。

### 检查状态

命令面板执行：

```text
Codex Local Groups: Check Status
```

状态会写入 `Codex Local Groups` 输出面板，并在弹窗中提供 `Apply Patches`、`Reload Window` 和 `Show Output` 操作。

### 搜索会话

命令面板执行：

```text
Codex Local Groups: Search Conversations
```

可按本地标题、分组、项目路径或会话 ID 搜索。选择结果后，会通过 Codex deeplink 打开对应本地会话。

### 管理分组

命令面板执行：

```text
Codex Local Groups: Manage Groups
```

列表会显示分组名、会话数和项目路径，并支持按分组名或项目路径搜索。选择一个分组后，可以：

- 重命名分组：批量更新该分组下所有会话；若新名称已存在，会先按合并操作二次确认，项目路径未知时不会合并。
- 合并到已有分组：只会合并到当前项目内的其他分组，选择目标后需要二次确认；项目路径未知时不会合并。
- 清空分组，移入未分组：只移除分组标签，不删除会话，并需要二次确认。
- 查看该分组会话，并打开选中的会话；查看是只读操作。

批量更新只写本地 metadata，不会在 Codex UI 运行中改写 bundle。若当前 UI 未同步，请 Reload Window；`Apply Patches` 仅用于 Codex 扩展升级或补丁缺失。

## Codex 扩展升级后怎么恢复

维护者在适配新 Codex 版本前，先按 [OpenAI Codex 升级适配手册](docs/codex-upgrade-playbook.md) 核对 bundle、目标契约、禁止项、测试门禁和回滚步骤。

OpenAI Codex VSCode 扩展升级后，原 bundle 可能被覆盖。执行：

```text
Codex Local Groups: Apply Patches
Codex Local Groups: Reload Window
```

也可在终端验证：

```bash
cd ~/.vscode-server/extensions/vscode-codex-groups-0.0.55
npm run plan-patches
npm run apply-patches
npm run repair-codex-ui
npm run restore-codex-ui
npm run verify-patched-bundles
```

## 安全与备份

- patch 前会备份目标文件。
- 备份目录位于目标 Codex 扩展目录下：

```text
<openai.chatgpt-extension>/.codex-patches/
```

- 匹配失败会停止，不会盲目覆盖。
- patch 后会执行语法检查和幂等检查。

## 命令面板功能

在 VSCode 命令面板输入 `Codex Local Groups` 可以看到本扩展提供的命令：

| 命令 | 适合什么时候用 | 功能说明 |
| --- | --- | --- |
| `Codex Local Groups: Manage Groups` | 分组重复、分组过多、需要批量整理时 | 打开分组管理中心。支持按分组名或项目路径搜索，查看每个分组的会话数量，并可重命名、合并、清空分组或查看分组下会话。合并和清空会二次确认，只修改本地 metadata，不删除会话。 |
| `Codex Local Groups: Check Status` | 不确定插件是否生效、Codex 升级后想检查状态时 | 检查 OpenAI Codex 扩展位置、版本、patch 状态、metadata 路径、会话数量、已分组 / 未分组数量。结果会写入 `Codex Local Groups` 输出面板，并提供 Apply / Reload / Show Output 快捷操作。 |
| `Codex Local Groups: Apply Patches` | Codex 升级后分组 UI 消失、命令提示需要重新应用补丁时 | 手动把本扩展的增强逻辑重新 patch 到 OpenAI Codex 扩展 bundle。执行前会备份目标文件，匹配失败会停止，不会盲目覆盖。执行后通常需要 Reload Window。 |
| `Codex Local Groups: Repair Codex UI` | Codex UI 卡住、白屏、升级后 patch 状态异常时 | 从 `.codex-patches` 中选择 clean 备份恢复 Codex bundle，再重新应用补丁。完成后通常需要 Reload Window。 |
| `Codex Local Groups: Restore Original Codex UI` | 想停用本扩展增强、或禁用扩展后 Codex 仍异常时 | 从 `.codex-patches` 中选择 clean 备份恢复 Codex bundle，不重新应用补丁。完成后需要 Reload Window。 |
| `Codex Local Groups: Open Metadata JSON` | 想查看或人工排查本地标题、分组数据时 | 打开 `~/.codex/codex-vscode-conversation-meta.json`。里面保存本地会话标题、分组、项目路径和 pending group 状态。手动编辑前建议先备份。 |
| `Codex Local Groups: Reload Window` | patch 后、安装新版本后，或当前 Codex webview 仍显示旧 UI 时 | 触发 VSCode `workbench.action.reloadWindow`，让 extension host 和 Codex webview 重新加载最新补丁。 |
| `Codex Local Groups: Reset Pending Group` | 点击“新建分组并开始会话”后，新会话没有正确归组或 pending 状态卡住时 | 只清空 metadata 中的 `pendingGroup`，不改写 Codex bundle，并提示 Reload Window。不会删除已有会话或已有分组。 |
| `Codex Local Groups: Search Conversations` | 想快速找到某个本地 Codex 会话时 | 用 QuickPick 搜索本地标题、分组、项目路径或会话 ID。选择结果后通过 Codex deeplink 打开对应本地会话。 |

## Troubleshooting

- 看不到分组 UI：执行 `Apply Patches` 后 Reload Window。
- Codex 升级后失效：启动自检会提示一键“修复并 Reload”；也可手动执行 `Apply Patches` 后 Reload Window。
- Codex `26.5730.61639` 显示“could not start / couldn't load its resources”：升级到 v0.0.55，执行 `Apply Patches` 后 Reload Window。该错误可能是固定 30 秒看门狗误杀需要 61-71 秒的健康 Remote Webview；v0.0.55 仅对该版本延长到 120 秒，并保留真正失败时的错误兜底。
- Codex `26.5803.61601` 启动仍超过 30 秒：本次 Reload 在 `66,081ms` 挂载 route，19ms 后 ready，UI 和分组功能正常。120 秒补丁只避免 30 秒误杀，不会让 Webview 必须等待 120 秒，也不会缩短上游 bundle 加载和 React route mount；该延迟仍作为上游性能观察项。
- Codex UI 卡住或白屏：执行 `Codex Local Groups: Repair Codex UI`，或终端运行 `npm run repair-codex-ui` 后 Reload Window。
- 禁用/卸载本扩展后 Codex 仍异常：先执行 `Codex Local Groups: Restore Original Codex UI`，或终端运行 `npm run restore-codex-ui`，再 Reload Window。禁用扩展不会自动还原已 patch 的 Codex bundle。
- 当前项目混入其他项目分组：升级到 v0.0.55，执行 `Apply Patches` 后 Reload Window；该版本按当前窗口 `activeWorkspaceRoot` 隔离项目，并把子目录会话归入根项目。
- 单个需求分组一次展示太多会话：升级到 v0.0.55 并 Reload Window；每个分组默认独立渲染最近 5 条，展开更多每次增加 10 条，可收起到 15 条或 5 条。
- 设置标题、设置分组或“在此分组新建会话”无响应：升级到 v0.0.55，执行 `Apply Patches` 后 Reload Window；该版本兼容 Codex 26.727/26.5730/26.5803 的 messenger 导出和 Extension Host 回调。
- 恢复旧会话后没有终端工具：升级到 v0.0.55，执行 `Apply Patches` 后 Reload Window。对 `26.721.41059` 和可确认的自定义 provider，该版本让 app-server 回退到 HTTP POST，且不修改 `config.toml`。
- patch 失败：查看 `Codex Local Groups` 输出面板。
- Node 版本过低：扩展会优先使用 VSCode Server 自带 Node；必要时设置 `codexLocalGroups.nodePath`。
