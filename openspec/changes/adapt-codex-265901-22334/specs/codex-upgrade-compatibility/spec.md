# Codex 26.5901.22334 Compatibility Specification

## ADDED Requirements

### Requirement: exact 22334 support is isolated

Local Groups MUST support only the verified exact `26.5901.22334` build through its 5901 variant. Unknown 5901 builds, suffixed versions and future minors MUST be rejected before backup restoration or writes, while all older supported variants remain unchanged.

#### Scenario: verified clean build patches atomically

- **Given** the verified official linux-x64 `26.5901.22334` extension
- **When** safe plan and apply run
- **Then** Host, Header, Main, Power and Server/History targets are uniquely patched
- **And** syntax, external verification and a second zero-change plan pass

#### Scenario: unverified version has no side effects

- **Given** an unknown 5901 build, a suffixed 5901 version or a future minor
- **When** plan or apply runs
- **Then** the version is rejected before restoration or writing
- **And** file contents and mtimes remain unchanged

### Requirement: 22334 title and metadata paths use the real bridges

Metadata actions MUST traverse the three UI entry points and the real `J9` Host bridge. Local titles MUST appear in both recent-menu rows and `/local/:id` Header, while empty or whitespace-only aliases MUST fall back to the native title.

#### Scenario: title consumers refresh

- **Given** a saved non-empty local title for a conversation
- **When** metadata refreshes
- **Then** the dropdown row and opened Header show the local title
- **And** clearing the title restores the native title in both consumers

#### Scenario: dropdown resolver accepts only the Local Groups marker

- **Given** the 5901 `$T/yMt` row resolver receives both a native title and a Local Groups-marked title override
- **When** metadata refreshes after a title save
- **Then** the resolver strips only that marker and displays the local title immediately
- **And** the marker payload is produced by `codexLocalGroupsDecoratedItem()` and passed through the project row helper
- **And** an unmarked override continues to follow native Codex precedence
- **And** a missing, duplicate, later-decoy or nested-decoy producer declaration, marker or resolver contract stops patching before writes

#### Scenario: opened title uses the real hooks runtime and cleans up

- **Given** the exact Header's JSX runtime `$` and hooks runtime `Ln`
- **When** the opened-title refresh patch is applied
- **Then** `Bn` uses `Ln.useState/useEffect`, not `$` hooks
- **And** its refresh listener is removed by the cleanup returned from the same effect
- **And** a missing cleanup or JSX-runtime hook injection is rejected before writing

### Requirement: project history uses the real split request path

Project history MUST use the Server store's real `listRecentThreads` request with state-database reads and cursor pagination, include the selected root and descendants only, and expose a manager method with a compatible `listAllThreads` fallback in the Power query hook. Hydration decoys MUST NOT satisfy this requirement.

#### Scenario: paginated root history is loaded

- **Given** root, child-root and unrelated conversations across multiple pages
- **When** project history loads for the selected root
- **Then** root and child-root rows are returned and unrelated rows are excluded
- **And** every page requests state-database-only history
- **And** a repeated cursor terminates with an error

#### Scenario: manager compatibility fallback is available

- **Given** a manager without `listProjectConversations` but with `listAllThreads`
- **When** the Power history hook queries the selected root
- **Then** compatible summaries are filtered and returned
- **And** the native no-argument recent-history hook remains unchanged in behavior

### Requirement: subagent consumers remain independent

The transcript producer/lazy consumer and the Main membership/Power composer consumer MUST remain separate validated chains. The adaptation MUST NOT change `multi_agent`, `multi_agent_v2` or `canInteract` behavior.

#### Scenario: transcript and top composer both consume agent state

- **Given** sub-agent activity and spawn events for the current parent
- **When** transcript and composer state are derived
- **Then** transcript items reach the lazy transcript panel
- **And** membership rows reach the top composer panel through `Po as Kd`
- **And** the native `canInteract` and current-parent-turn filters remain intact

### Requirement: Max and Ultra remain Sol-only without replacing native Power

Max and Ultra MUST be accepted and persisted for `gpt-5.6-sol` only. The Power menu MAY add those efforts for Sol, but the native `$Nn/JNn` slider and existing settings read/write/readback chain MUST remain unchanged; non-Sol models MUST keep native behavior.

#### Scenario: Sol efforts use native persistence

- **Given** Sol and non-Sol model definitions
- **When** Max or Ultra is selected
- **Then** Sol validation and menu accept the effort
- **And** settings cache, default-model write and subsequent model fetch preserve it
- **And** non-Sol validation/menu and the compact/expanded native slider are not widened

### Requirement: watchdog changes only the verified Host chain

The startup timeout MUST change only in the exact `GI` watchdog and MUST remain reachable through `Dd`, `new tI({startup})` and the exact `renderer_ready` phase.

#### Scenario: renderer ready disposes the extended watchdog

- **Given** the patched exact Host bundle
- **When** the app host reports `renderer_ready`
- **Then** the 120-second `GI` watchdog is disposed through the verified client-coordination chain
- **And** unrelated timeout literals remain untouched
