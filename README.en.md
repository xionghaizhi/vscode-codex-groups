# Codex Local Groups (English)

<p align="center">
  <a href="README.md">简体中文</a> | <strong>English</strong>
</p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="release" src="https://img.shields.io/badge/release-v0.0.56-blue">
  <img alt="VSCode" src="https://img.shields.io/badge/VSCode-%5E1.96.2-007ACC">
  <img alt="Codex" src="https://img.shields.io/badge/Codex-local_groups-10a37f">
</p>

Codex Local Groups is an independent VSCode extension that adds local conversation titles and requirement groups to the OpenAI Codex VSCode extension. It discovers the installed Codex extension, applies conservative patches, and backs up target files before writing.

## Preview

<p align="center">
  <img src="docs/codex-local-groups-preview.png" alt="Codex Local Groups grouped recent tasks preview" width="656">
</p>

## Features

- Local conversation title aliases.
- “Project > Requirement Group > Conversation” view.
- Shows only the current window's workspace history; root and child-directory conversations are merged into one project, and other projects are excluded.
- Each requirement group independently renders five recent conversations by default. `Show more` adds ten rows, and a group above fifteen can collapse to fifteen or five. The active conversation remains visible beyond the limit.
- In the top recent-task list, each local conversation has same-row `设置标题 / 设置分组` actions on the right, saved through the VSCode input box while using less vertical space.
- `+ New group and start chat` under each project.
- `+ Start chat in this group` on group headers.
- `Check Status` checks the Codex extension, patch status, metadata, and conversation counts, with Apply / Reload shortcuts.
- `Search Conversations` uses VSCode QuickPick to search local titles, groups, project paths, or conversation IDs, then opens the selected Codex conversation.
- `Manage Groups` uses VSCode QuickPick to rename, merge, clear groups, and view conversations in a group.
- By default, patches only the metadata bridge, grouped recent-list rendering, an isolated Codex 26.721/26.727/26.5730/26.5803 project-history query, and the fixed menu height; it does not expand the shared recent store or write conversation data.
- Migration from:
  - Old: `~/.codex/codex-vscode-conversation-titles.json`
  - New: `~/.codex/codex-vscode-conversation-meta.json`
- To avoid startup-time blank views, Codex Local Groups only performs a read-only bundle check during VSCode startup. If an upgrade replaced compatible patches, it offers one-click repair and Reload.
- Repair can restore clean bundles before patching if the Codex UI gets stuck.
- Restore Original Codex UI can restore clean bundles without reapplying patches when you want to stop using the enhancements.

## Safe-mode boundary

Starting in v0.0.36, every extension and CLI entry point uses native-history safe patching:

- It never adds `cwd` / `cwds` to the shared recent-list request, avoiding cross-window state leaks and exact-cwd filtering that drops child directories.
- On Codex 26.721/26.727/26.5730/26.5803, it pages an isolated project-history query and strictly keeps the active `activeWorkspaceRoot` plus descendants. While the workspace root is loading, it fails closed with an empty list instead of showing another project.
- Items without a real cwd are not assigned to a project from metadata. SQLite, session files, and conversation data are never written.
- The Header keeps every upstream item but initially constructs five conversation rows per requirement group. Each group's row limit uses UI-only localStorage and never changes conversation metadata.
- It does not synthesize clickable history rows from metadata; metadata supplies titles and groups only.
- On Codex 26.721/26.727/26.5730/26.5803, the recent menu gets an actual `600px` height, remains clamped by Radix on short windows, and scrolls inside the list region. Other versions keep their original height; React compiler cache state, authentication, plugins, and network requests remain unchanged.
- On Codex 26.721/26.727/26.5730/26.5803 it preserves or enables the native subagent activity panel and keeps `Max` and `Ultra` in the local 5.6 Sol reasoning selector.
- If a legacy high-risk patch is detected, Apply restores clean backups first and fails closed if restoration is impossible.

## Installation

### Option 1: Install from source

```bash
git clone https://github.com/xionghaizhi/vscode-codex-groups.git
cd vscode-codex-groups
```

Copy the extension directory into a VSCode extensions directory. A versioned directory name is recommended:

```bash
cp -r . ~/.vscode/extensions/vscode-codex-groups-0.0.56
```

For Remote VSCode Server, copy it into the remote extensions directory, for example:

```bash
cp -r . ~/.vscode-server/extensions/vscode-codex-groups-0.0.56
```

Then in VSCode:

1. Run `Developer: Reload Window`.
2. Choose `修复并 Reload` in the startup notice. If no notice appears, run `Codex Local Groups: Apply Patches`, then Reload Window.

### Option 2: Install a VSIX

You can download the packaged VSIX from GitHub Actions:

1. Open the repository `Actions` page.
2. Select the `Package VSIX` workflow.
3. Open the latest successful run and download the `vscode-codex-groups-vsix` artifact.
4. Unzip it to get the `.vsix` file. When a `v*` tag is pushed, the same VSIX is also uploaded to GitHub Release assets.

Maintainers can also package locally:

```bash
cd vscode-codex-groups
npx @vscode/vsce package
```

Install the downloaded or packaged VSIX:

```bash
code --install-extension vscode-codex-groups-0.0.56.vsix
```

For Remote VSCode Server, install it in the remote window and make sure it runs on the remote/workspace side.

## Usage

### First run

1. Make sure the OpenAI Codex VSCode extension is installed.
2. Install this extension.
3. Reload Window, then choose `修复并 Reload` in the startup notice.
4. If no notice appears, run `Codex Local Groups: Apply Patches`, then Reload Window.

### Set local title / requirement group

1. Open the Codex recent conversations list.
2. Find a local conversation row.
3. Click the same-row `设置标题` / Set Title or `设置分组` / Set Group action on the right.
4. Enter the value in the VSCode input box.
5. Close and reopen the recent-conversations list after saving to see the new title or group. If the webview is still running an old patch, reload the window once.

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

The metadata file is stored in the Codex user directory by default:

```text
~/.codex/codex-vscode-conversation-meta.json
```

### Reset pending group

If the `+` flow does not assign the new conversation correctly:

```text
Codex Local Groups: Reset Pending Group
```

If the current webview still does not sync, reload the window once.

### Check status

Run:

```text
Codex Local Groups: Check Status
```

Status details are written to the `Codex Local Groups` output channel. The message also offers `Apply Patches`, `Reload Window`, and `Show Output` actions.

### Search conversations

Run:

```text
Codex Local Groups: Search Conversations
```

Search by local title, group, project path, or conversation ID. Selecting a result opens the local conversation through a Codex deeplink.

### Manage groups

Run:

```text
Codex Local Groups: Manage Groups
```

The list shows group name, conversation count, and project path, and it supports searching by group or project path. After selecting a group, you can:

- Rename the group and update all conversations in it; if the new name already exists, the command asks for merge confirmation first, and groups with unknown project paths cannot be merged.
- Merge it into another group in the same project only, with a second confirmation after choosing the target; groups with unknown project paths cannot be merged.
- Clear the group and move conversations to Ungrouped, with confirmation; this only removes the group label and does not delete conversations.
- View conversations in the group and open a selected conversation; view is read-only.

Batch updates only write local metadata and do not rewrite Codex bundles while the UI is running. Reload Window if the current UI is stale; use `Apply Patches` only after a Codex extension upgrade or when patches are missing.

## After Codex extension upgrades

Before adapting a new Codex version, maintainers should follow the [OpenAI Codex upgrade playbook](docs/codex-upgrade-playbook.md) for bundle contracts, forbidden regressions, validation gates, and rollback steps.

The Codex extension upgrade may overwrite patched bundles. Run:

```text
Codex Local Groups: Apply Patches
Codex Local Groups: Reload Window
```

Terminal verification:

```bash
cd ~/.vscode-server/extensions/vscode-codex-groups-0.0.56
npm run plan-patches
npm run apply-patches
npm run repair-codex-ui
npm run restore-codex-ui
npm run verify-patched-bundles
```

## Safety and backups

- Target files are backed up before patching.
- Backups are written under the target Codex extension directory:

```text
<openai.chatgpt-extension>/.codex-patches/
```

- Conservative matching: if anchors do not match, patching stops.
- Syntax checks and idempotence checks run after patching.

## Command palette features

Type `Codex Local Groups` in the VSCode command palette to see the extension commands:

| Command | When to use it | What it does |
| --- | --- | --- |
| `Codex Local Groups: Manage Groups` | When groups are duplicated, too many, or need batch cleanup | Opens the group management center. You can search by group or project path, see conversation counts, rename groups, merge groups, clear groups, or view conversations in a group. Merge and clear actions require confirmation and only update local metadata; conversations are not deleted. |
| `Codex Local Groups: Check Status` | When you are not sure whether the extension is active, or after a Codex upgrade | Checks the OpenAI Codex extension location, version, patch status, metadata path, total conversations, grouped count, and ungrouped count. Results are written to the `Codex Local Groups` output channel, with Apply / Reload / Show Output shortcuts. |
| `Codex Local Groups: Apply Patches` | When the grouped UI disappears after a Codex upgrade, or when a command asks you to reapply patches | Manually patches the OpenAI Codex extension bundles with this extension's enhancements. Target files are backed up first; unsupported bundle anchors stop the patch instead of overwriting blindly. Reload Window is usually needed afterward. |
| `Codex Local Groups: Repair Codex UI` | When Codex UI is stuck, blank, or patch state looks broken after an upgrade | Restores clean Codex bundles from `.codex-patches`, then reapplies patches. Reload Window is usually needed afterward. |
| `Codex Local Groups: Restore Original Codex UI` | When disabling this extension, or Codex is still broken after disabling it | Restores clean Codex bundles from `.codex-patches` without reapplying patches. Reload Window is needed afterward. |
| `Codex Local Groups: Open Metadata JSON` | When you need to inspect or manually troubleshoot local titles and group data | Opens `~/.codex/codex-vscode-conversation-meta.json`, which stores local titles, groups, project paths, and pending group state. Back it up before manual edits. |
| `Codex Local Groups: Reload Window` | After patching, installing a new version, or when the current Codex webview still shows old UI | Runs VSCode `workbench.action.reloadWindow` so the extension host and Codex webview load the latest patches. |
| `Codex Local Groups: Reset Pending Group` | When `+ New group and start chat` does not assign the new conversation correctly, or pending state is stuck | Only clears `pendingGroup` in local metadata, does not rewrite Codex bundles, and prompts Reload Window. It does not delete existing conversations or groups. |
| `Codex Local Groups: Search Conversations` | When you need to quickly find a local Codex conversation | Uses QuickPick to search local titles, groups, project paths, or conversation IDs. Selecting an item opens the local conversation through a Codex deeplink. |

## Troubleshooting

- Group UI is missing: run `Apply Patches`, then Reload Window.
- Broken after a Codex upgrade: startup detection offers one-click repair and Reload. You can also run `Apply Patches`, then Reload Window.
- If Codex `26.5730.61639` shows “could not start / couldn't load its resources,” upgrade to v0.0.56, run `Apply Patches`, then Reload Window. The fixed 30-second watchdog can preempt a healthy Remote Webview that needs 61-71 seconds; v0.0.56 extends it to 120 seconds only for this version and preserves the real failure fallback.
- Codex `26.5803.61601` still takes more than 30 seconds to open: this Reload mounted routes after `66,081ms` and reached ready 19ms later, while the UI and grouping features worked normally. The 120-second patch only prevents a premature timeout; it neither forces a 120-second wait nor shortens upstream bundle loading and React route mounting. The delay remains an upstream performance observation.
- Codex UI is stuck or blank: run `Codex Local Groups: Repair Codex UI`, or run `npm run repair-codex-ui` in a terminal, then Reload Window.
- Codex is still broken after disabling/uninstalling this extension: run `Codex Local Groups: Restore Original Codex UI`, or run `npm run restore-codex-ui`, then Reload Window. Disabling the extension does not automatically revert patched Codex bundles.
- If the current project shows groups from other projects, upgrade to v0.0.56, run `Apply Patches`, then Reload Window. The project history is isolated by the current window's `activeWorkspaceRoot`, while child directories are merged into the root project.
- If one requirement group renders too many conversations at once, upgrade to v0.0.56 and Reload Window. Each group independently starts at five rows, `Show more` adds ten, and collapse controls return it to fifteen or five.
- If `Set title`, `Set group`, or `Start chat in this group` does nothing, upgrade to v0.0.56, run `Apply Patches`, then Reload Window. This version supports the Codex 26.727/26.5730/26.5803 messenger exports and Extension Host callback.
- If a resumed conversation has no terminal tools, upgrade to v0.0.56, run `Apply Patches`, then Reload Window. For `26.721.41059` with a resolvable custom provider, app-server falls back to HTTP POST without editing `config.toml`.
- Patch failed: check the `Codex Local Groups` output channel.
- Node version is too old: the extension prefers the VSCode Server Node; set `codexLocalGroups.nodePath` if needed.
