# Codex Local Groups (English)

<p align="center">
  <a href="README.md">简体中文</a> | <strong>English</strong>
</p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-internal-lightgrey">
  <img alt="release" src="https://img.shields.io/badge/release-v0.0.1-blue">
  <img alt="VSCode" src="https://img.shields.io/badge/VSCode-%5E1.96.2-007ACC">
  <img alt="Codex" src="https://img.shields.io/badge/Codex-local_groups-10a37f">
</p>

Codex Local Groups is an independent VSCode extension for managing local OpenAI Codex VSCode conversations: local titles, requirement groups, and project isolation. It conservatively patches the installed Codex extension and backs up target files before writing.

> This version targets the internal remote development environment: `/root/.vscode-server/extensions/openai.chatgpt-*` and `/root/.codex/`.

## Features

- Local conversation title aliases.
- “Project > Requirement Group > Conversation” view.
- Local conversation isolation by current project.
- In the top recent-task list, each local conversation has separate `设置标题 / 设置分组` actions below the row, saved through the VSCode input box.
- `+ New group and start chat` under each project.
- `+ Start chat in this group` on group headers.
- Migration from:
  - Old: `/root/.codex/codex-vscode-conversation-titles.json`
  - New: `/root/.codex/codex-vscode-conversation-meta.json`
- One-command patch reapply after Codex extension upgrades.

## Installation

### Option 1: Download from the internal repository

```bash
cd ~/.vscode-server/extensions
git clone http://10.168.1.170:9001/open_source_plug_in_library/vscode-codex-local-groups.git codex-local-groups-0.0.1
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
2. Find a local conversation row.
3. Click `设置标题` / Set Title or `设置分组` / Set Group below the row.
4. Enter the value in the VSCode input box.
5. Reload Window after saving.

This also creates a group: enter a group name that does not exist, and the current conversation will move into that new group.

### Create a new group and start a chat

1. Find the target project in the recent list.
2. Click `+ 新建分组并开始会话` / `+ New group and start chat`.
3. Enter the new group name.
4. Codex opens a new conversation and assigns it to the new group when identifiable.

### Start a conversation in a group

1. Find the project and requirement group in the recent list.
2. Click `+ 在此分组新建会话` / `+ Start chat in this group` on the group header.
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
