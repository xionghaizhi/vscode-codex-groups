# Spec: Codex 26.5908.31748 upgrade compatibility

## ADDED Requirements

### Requirement: exact-build whitelist

The adaptation MUST only patch `openai.chatgpt@26.5908.31748`. Unknown 5908 builds, suffixed versions and future minors MUST fail closed with zero writes.

#### Scenario: exact build is patched

- **Given** official clean `26.5908.31748`
- **When** plan and apply run
- **Then** Host, Header, Main, Power and Server receive the 5908 patches atomically
- **And** syntax, external verification and a second zero-change plan pass

#### Scenario: unsupported versions write nothing

- **Given** `26.5908.99999`, `26.5908.31748.1`, `26.5908.31748-insider` or a future minor
- **When** plan or apply runs
- **Then** no target file is restored or written
- **And** prior exact-build behavior is unchanged

### Requirement: titles and groups remain live and consistent

The dropdown title, opened title, group assignment and grouped new-conversation actions MUST work without reloading VS Code.

#### Scenario: title metadata refreshes both surfaces

- **Given** a local conversation
- **When** its local title is saved or cleared
- **Then** the dropdown marker is decoded only by `mWt`
- **And** the opened `Bn` title refreshes through `Ln` and removes its listener on cleanup

#### Scenario: group actions use current project metadata

- **Given** a selected project and group
- **When** the user assigns a group or starts a conversation in that group
- **Then** metadata is persisted through the existing host bridge
- **And** the affected rows refresh immediately

### Requirement: project history follows the new request contract

Project history MUST page through the Server store's real `listRecentThreads` request, pass the new `originators` field, force state-database reads, filter the selected root and descendants, and retain the manager fallback.

#### Scenario: paginated project history is loaded

- **Given** matching and unrelated conversations across multiple cursors
- **When** project history loads
- **Then** only the selected root and descendants are returned
- **And** every request uses `useStateDbOnly: true`
- **And** a repeated cursor fails instead of looping

### Requirement: Sol and Astra Max and Ultra reach actual consumers

Available `gpt-5.6-sol`, `gpt-6-sol` and `gpt-6-astra` models MUST expose Max and Ultra in the menu and both picker layouts without changing user configuration.

#### Scenario: final slider array is widened

- **Given** native picker selections ending at xhigh
- **When** `Ncr` finishes constructing `it`
- **Then** Max and Ultra are inserted before `Bw`, `Clt` and `I8n` consume `it`
- **And** the same insertion runs for `gpt-6-sol`
- **And** `p3` and `Z7e` accept the same efforts

### Requirement: watchdog changes only the verified Host chain

The startup timeout MUST change only in exact `ik` and remain reachable through `Hd`, `bI` startup and `renderer_ready`.

#### Scenario: ready disposes the extended watchdog

- **Given** the patched exact Host bundle
- **When** the renderer reports ready
- **Then** the 120-second watchdog is disposed
- **And** unrelated timeouts remain unchanged

### Requirement: upgrade tests leave no temporary artifacts

Every upgrade verification MUST remove its temporary VSIX, extracted extension, isolated-test patch backups and test directories on success or failure.

#### Scenario: verification completes or fails

- **When** the upgrade workflow exits
- **Then** all task-owned temporary artifacts are removed
- **And** cleanup is verified before reporting completion
