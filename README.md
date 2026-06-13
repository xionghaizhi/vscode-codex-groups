# Codex Local Groups

<p align="center">
  <strong>简体中文</strong> | <a href="README.en.md">English</a>
</p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-internal-lightgrey">
  <img alt="release" src="https://img.shields.io/badge/release-v0.0.1-blue">
  <img alt="VSCode" src="https://img.shields.io/badge/VSCode-%5E1.96.2-007ACC">
  <img alt="Codex" src="https://img.shields.io/badge/Codex-local_groups-10a37f">
</p>

Codex Local Groups 是一个独立 VSCode 扩展，用于本地管理 OpenAI Codex VSCode 扩展的会话标题、需求分组和项目隔离。扩展会自动为当前 Codex 扩展打保守补丁，并在补丁前备份目标文件。

> 当前版本面向内网远程开发环境：`/root/.vscode-server/extensions/openai.chatgpt-*` 和 `/root/.codex/`。

## 功能

- 本地会话标题 alias。
- 按“项目 > 需求分组 > 会话”展示最近会话。
- 仅显示当前项目相关的本地会话。
- 顶部最近任务列表里，每个本地会话下面有独立的 `设置标题 / 设置分组` 操作，用 VSCode 输入框保存。
- 项目下 `+ 新建分组并开始会话`，输入分组名后自动打开新会话。
- 分组标题右侧 `+ 在此分组新建会话`，新会话自动归入该分组。
- 自动迁移旧标题文件：
  - 旧：`/root/.codex/codex-vscode-conversation-titles.json`
  - 新：`/root/.codex/codex-vscode-conversation-meta.json`
- Codex 扩展升级后，可一键重新应用补丁。

## 安装

### 方式一：从内网仓库下载源码

```bash
cd ~/.vscode-server/extensions
git clone http://10.168.1.170:9001/open_source_plug_in_library/vscode-codex-local-groups.git codex-local-groups-0.0.1
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
2. 找到本地会话行。
3. 点击会话下方的 `设置标题` 或 `设置分组`。
4. 在 VSCode 输入框里输入内容。
5. 保存后 Reload Window 生效。

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
