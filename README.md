# Codex Local Groups

Codex Local Groups 是一个独立 VSCode 扩展，用于本地管理 OpenAI Codex VSCode 扩展的会话标题、需求分组和项目隔离。扩展会自动为当前 Codex 扩展打保守补丁，并在补丁前备份目标文件。

> 当前版本面向内网远程开发环境：`/root/.vscode-server/extensions/openai.chatgpt-*` 和 `/root/.codex/`。

## 功能

- 本地会话标题 alias。
- 按“项目 > 需求分组 > 会话”展示最近会话。
- 仅显示当前项目相关的本地会话。
- 本地会话右键设置“本地标题 / 需求分组”。
- 分组标题右侧 `+` 新建会话，并自动归入该分组。
- 自动迁移旧标题文件：
  - 旧：`/root/.codex/codex-vscode-conversation-titles.json`
  - 新：`/root/.codex/codex-vscode-conversation-meta.json`
- Codex 扩展升级后，可一键重新应用补丁。

## 安装

### 方式一：从内网仓库下载源码

```bash
cd ~/.vscode-server/extensions
git clone <内网仓库地址> codex-local-groups-0.0.1
```

如果仓库根目录不是扩展目录，而是包含 `codex-local-groups/` 子目录，请复制该子目录：

```bash
cp -r <仓库目录>/codex-local-groups ~/.vscode-server/extensions/codex-local-groups-0.0.1
```

然后在 VSCode 中执行：

1. `Developer: Reload Window`
2. 打开命令面板，执行 `Codex Local Groups: Apply Patches`
3. 再执行一次 `Developer: Reload Window`

### 方式二：安装 VSIX

维护者可先打包：

```bash
cd codex-local-groups
npx @vscode/vsce package
```

同事下载 `.vsix` 后安装：

```bash
code --install-extension codex-local-groups-0.0.1.vsix
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
2. 对本地会话行右键。
3. 选择：
   - `设置本地标题`
   - `设置需求分组`
4. 输入内容后，列表会刷新并写入 metadata。

### 在指定分组中新建会话

1. 在最近会话列表找到目标项目和需求分组。
2. 点击分组标题右侧 `+`。
3. 新会话会打开，并在可识别时自动归入该需求分组。

### 打开 metadata

命令面板执行：

```text
Codex Local Groups: Open Metadata JSON
```

metadata 文件路径：

```text
/root/.codex/codex-vscode-conversation-meta.json
```

### 重置 pending group

如果点击 `+` 后新会话没有正常归组，或 pending 状态异常：

```text
Codex Local Groups: Reset Pending Group
```

然后 Reload Window。

## Codex 扩展升级后怎么恢复

OpenAI Codex VSCode 扩展升级后，原 bundle 可能被覆盖。执行：

```text
Codex Local Groups: Apply Patches
Codex Local Groups: Reload Window
```

也可在终端验证：

```bash
cd ~/.vscode-server/extensions/codex-local-groups-0.0.1
npm run plan-patches
npm run apply-patches
npm run verify-patched-bundles
```

## 安全与备份

- patch 前会备份目标文件。
- 备份目录：

```text
/root/.vscode-server/extensions/openai.chatgpt-*/.codex-patches/
```

- 匹配失败会停止，不会盲目覆盖。
- patch 后会执行语法检查和幂等检查。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `Codex Local Groups: Apply Patches` | 手动应用补丁 |
| `Codex Local Groups: Open Metadata JSON` | 打开 metadata 文件 |
| `Codex Local Groups: Reload Window` | 重载 VSCode 窗口 |
| `Codex Local Groups: Reset Pending Group` | 清空待归组状态 |

## Troubleshooting

- 看不到分组 UI：执行 `Apply Patches` 后 Reload Window。
- Codex 升级后失效：重新执行 `Apply Patches`。
- patch 失败：查看 `Codex Local Groups` 输出面板。
- Node 版本过低：扩展会优先使用 VSCode Server 自带 Node；必要时设置 `codexLocalGroups.nodePath`。

---

# Codex Local Groups (English)

Codex Local Groups is an independent VSCode extension for managing local OpenAI Codex VSCode conversations: local titles, requirement groups, and project isolation. It conservatively patches the installed Codex extension and backs up target files before writing.

> This version targets the internal remote development environment: `/root/.vscode-server/extensions/openai.chatgpt-*` and `/root/.codex/`.

## Features

- Local conversation title aliases.
- “Project > Requirement Group > Conversation” view.
- Local conversation isolation by current project.
- Right-click actions for local title and requirement group.
- `+` button on group headers to start a new conversation in that group.
- Migration from:
  - Old: `/root/.codex/codex-vscode-conversation-titles.json`
  - New: `/root/.codex/codex-vscode-conversation-meta.json`
- One-command patch reapply after Codex extension upgrades.

## Installation

### Option 1: Download from the internal repository

```bash
cd ~/.vscode-server/extensions
git clone <internal-repo-url> codex-local-groups-0.0.1
```

If the repository root contains a `codex-local-groups/` subdirectory, copy that subdirectory:

```bash
cp -r <repo>/codex-local-groups ~/.vscode-server/extensions/codex-local-groups-0.0.1
```

Then in VSCode:

1. Run `Developer: Reload Window`.
2. Run `Codex Local Groups: Apply Patches`.
3. Run `Developer: Reload Window` again.

### Option 2: Install a VSIX

Maintainer packaging:

```bash
cd codex-local-groups
npx @vscode/vsce package
```

Install the VSIX:

```bash
code --install-extension codex-local-groups-0.0.1.vsix
```

For Remote VSCode Server, install it in the remote window and make sure it runs on the remote/workspace side.

## Usage

### First run

1. Make sure the OpenAI Codex VSCode extension is installed.
2. Install this extension.
3. Reload Window. The extension will try to patch the latest `openai.chatgpt-*` extension automatically.
4. If it does not take effect, run:
   - `Codex Local Groups: Apply Patches`
   - `Codex Local Groups: Reload Window`

### Set local title / requirement group

1. Open the Codex recent conversations list.
2. Right-click a local conversation row.
3. Choose:
   - `设置本地标题` / Set Local Title
   - `设置需求分组` / Set Requirement Group
4. Enter the value. The metadata will be saved and the list will refresh.

### Start a conversation in a group

1. Find the project and requirement group in the recent list.
2. Click the `+` button on the group header.
3. A new conversation opens and will be assigned to the group when identifiable.

### Open metadata

Run:

```text
Codex Local Groups: Open Metadata JSON
```

Metadata path:

```text
/root/.codex/codex-vscode-conversation-meta.json
```

### Reset pending group

If the `+` flow does not assign the new conversation correctly:

```text
Codex Local Groups: Reset Pending Group
```

Then reload the window.

## After Codex extension upgrades

The Codex extension upgrade may overwrite patched bundles. Run:

```text
Codex Local Groups: Apply Patches
Codex Local Groups: Reload Window
```

Terminal verification:

```bash
cd ~/.vscode-server/extensions/codex-local-groups-0.0.1
npm run plan-patches
npm run apply-patches
npm run verify-patched-bundles
```

## Safety and backups

- Target files are backed up before patching.
- Backup directory:

```text
/root/.vscode-server/extensions/openai.chatgpt-*/.codex-patches/
```

- Conservative matching: if anchors do not match, patching stops.
- Syntax checks and idempotence checks run after patching.

## Commands

| Command | Purpose |
| --- | --- |
| `Codex Local Groups: Apply Patches` | Apply patches manually |
| `Codex Local Groups: Open Metadata JSON` | Open the metadata file |
| `Codex Local Groups: Reload Window` | Reload the VSCode window |
| `Codex Local Groups: Reset Pending Group` | Clear pending group state |

## Troubleshooting

- Group UI is missing: run `Apply Patches`, then Reload Window.
- Broken after Codex upgrade: run `Apply Patches` again.
- Patch failed: check the `Codex Local Groups` output channel.
- Node version is too old: the extension prefers the VSCode Server Node; set `codexLocalGroups.nodePath` if needed.
