# Codex Local Groups

<p align="center">
  <strong>简体中文</strong> | <a href="README.en.md">English</a>
</p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="release" src="https://img.shields.io/badge/release-v0.0.9-blue">
  <img alt="VSCode" src="https://img.shields.io/badge/VSCode-%5E1.96.2-007ACC">
  <img alt="Codex" src="https://img.shields.io/badge/Codex-local_groups-10a37f">
</p>

Codex Local Groups 是一个独立 VSCode 扩展，用于给 OpenAI Codex VSCode 扩展补充本地会话标题、需求分组和项目隔离能力。扩展会自动发现已安装的 Codex 扩展，保守 patch 目标文件，并在写入前创建备份。

## 预览

<p align="center">
  <img src="https://github.com/xionghaizhi/vscode-codex-groups/raw/HEAD/docs/codex-local-groups-preview.png" alt="Codex Local Groups grouped recent tasks preview" width="656">
</p>

## 功能

- 本地会话标题别名。
- 按“项目 > 需求分组 > 会话”展示最近会话。
- 仅显示当前项目相关的本地会话。
- 顶部最近任务列表里，每个本地会话右侧有同一行的 `设置标题 / 设置分组` 操作，用 VSCode 输入框保存，减少列表纵向占用。
- 项目下 `+ 新建分组并开始会话`，输入分组名后自动打开新会话。
- 分组标题右侧 `+ 在此分组新建会话`，新会话自动归入该分组。
- `Check Status` 检查 Codex 扩展、patch 状态、metadata 和会话数量，并提供 Apply / Reload 快捷操作。
- `Search Conversations` 用 VSCode QuickPick 搜索本地标题、分组、项目路径或会话 ID，并跳转到选中的 Codex 会话。
- `Manage Groups` 用 VSCode QuickPick 批量重命名、合并、清空分组，并查看分组下会话。
- 自动迁移旧标题文件：
  - 旧：`~/.codex/codex-vscode-conversation-titles.json`
  - 新：`~/.codex/codex-vscode-conversation-meta.json`
- Codex 扩展升级后，可一键重新应用补丁。

## 安装

### 方式一：从源码安装

```bash
git clone https://github.com/xionghaizhi/vscode-codex-groups.git
cd vscode-codex-groups
```

将扩展目录复制到 VSCode 扩展目录，目录名建议包含版本号：

```bash
cp -r . ~/.vscode/extensions/vscode-codex-groups-0.0.9
```

远程 VSCode Server 场景可复制到远程扩展目录，例如：

```bash
cp -r . ~/.vscode-server/extensions/vscode-codex-groups-0.0.9
```

然后在 VSCode 中执行：

1. `Developer: Reload Window`
2. 打开命令面板，执行 `Codex Local Groups: Apply Patches`
3. 再执行一次 `Developer: Reload Window`

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
code --install-extension vscode-codex-groups-0.0.9.vsix
```

远程 VSCode Server 场景下，建议在远程窗口里安装，并确认扩展运行在 remote/workspace 侧。

## 使用

### 首次使用

1. 确认已安装 OpenAI Codex VSCode 扩展。
2. 安装本扩展。
3. Reload Window 后，本扩展会自动尝试 patch 最新的 `openai.chatgpt-*` 扩展。
4. 若未自动生效，执行命令：
   - `Codex Local Groups: Apply Patches`
   - `Codex Local Groups: Reload Window`

### 设置本地标题 / 需求分组

1. 打开 Codex 最近会话列表。
2. 找到本地会话行。
3. 点击会话右侧同一行的 `设置标题` 或 `设置分组`。
4. 在 VSCode 输入框里输入内容。
5. 保存后会同步到当前 Codex webview；如当前 webview 仍加载旧补丁，可 Reload Window 一次。

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

批量更新后会提示 Reload Window。若自动 patch 失败，metadata 更新仍会保留，可直接点 `Apply Patches` 重试，或查看输出后手动处理。

## Codex 扩展升级后怎么恢复

OpenAI Codex VSCode 扩展升级后，原 bundle 可能被覆盖。执行：

```text
Codex Local Groups: Apply Patches
Codex Local Groups: Reload Window
```

也可在终端验证：

```bash
cd ~/.vscode-server/extensions/vscode-codex-groups-0.0.9
npm run plan-patches
npm run apply-patches
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
| `Codex Local Groups: Open Metadata JSON` | 想查看或人工排查本地标题、分组数据时 | 打开 `~/.codex/codex-vscode-conversation-meta.json`。里面保存本地会话标题、分组、项目路径和 pending group 状态。手动编辑前建议先备份。 |
| `Codex Local Groups: Reload Window` | patch 后、安装新版本后，或当前 Codex webview 仍显示旧 UI 时 | 触发 VSCode `workbench.action.reloadWindow`，让 extension host 和 Codex webview 重新加载最新补丁。 |
| `Codex Local Groups: Reset Pending Group` | 点击“新建分组并开始会话”后，新会话没有正确归组或 pending 状态卡住时 | 清空待归组状态 `pendingGroup`，再静默应用 patch，并提示 Reload Window。不会删除已有会话或已有分组。 |
| `Codex Local Groups: Search Conversations` | 想快速找到某个本地 Codex 会话时 | 用 QuickPick 搜索本地标题、分组、项目路径或会话 ID。选择结果后通过 Codex deeplink 打开对应本地会话。 |

## Troubleshooting

- 看不到分组 UI：执行 `Apply Patches` 后 Reload Window。
- Codex 升级后失效：重新执行 `Apply Patches`。
- patch 失败：查看 `Codex Local Groups` 输出面板。
- Node 版本过低：扩展会优先使用 VSCode Server 自带 Node；必要时设置 `codexLocalGroups.nodePath`。
