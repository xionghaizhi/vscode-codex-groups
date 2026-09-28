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

### Requirement: Sol and Astra Max and Ultra cover menu and drag sliders

Following user approval on 2026-09-05, Max and Ultra MUST be selectable in the reasoning menu and both compact and expanded drag sliders for available `gpt-5.6-sol` and `gpt-6-astra` models, even when the picker input has been filtered down to xhigh. Following the 2026-09-23 catalog/UI mismatch, `gpt-6-sol` MUST be included in the same guard whenever this variant is still patched. This supersedes the earlier Sol-menu-only restriction. Existing lower choices, native slider interaction and settings read/write/readback MUST be reused. Other models and older supported extension builds MUST keep their existing behavior. Patching MUST NOT change user configuration, persisted preferences, model catalogs or multi-agent settings, or invent an unavailable model.

#### Scenario: both target models expose ordered choices through actual consumers

- **Given** an available Sol or Astra model whose picker efforts end at xhigh
- **When** the user opens the compact or expanded Power control
- **Then** its real slider consumer receives Max followed by Ultra without duplicate choices
- **And** mouse dragging and keyboard selection use the same model ID and effort as the reasoning menu
- **And** lower choices and the native reset path remain available
- **And** an already complete input is not duplicated, and absent or unrelated models are not widened

#### Scenario: both target models use native persistence

- **Given** Sol or Astra and filtered picker model definitions
- **When** the user selects Max or Ultra and settings are read back
- **Then** the existing settings cache and default-model write receive the selected model and effort
- **And** validation preserves both values instead of reverting to Light, xhigh or null
- **And** other models retain native validation behavior

#### Scenario: previous live patch migrates and consumers fail closed

- **Given** official clean 22334 or the previous valid menu-only live patch
- **When** plan and apply run
- **Then** all required model-validation, menu and slider changes are applied atomically
- **And** syntax, external verification and a second zero-change plan pass
- **And** missing or duplicate declarations, detached/nested/later consumer decoys and incomplete markers are rejected before writes

### Requirement: watchdog changes only the verified Host chain

The startup timeout MUST change only in the exact `GI` watchdog and MUST remain reachable through `Dd`, `new tI({startup})` and the exact `renderer_ready` phase.

#### Scenario: renderer ready disposes the extended watchdog

- **Given** the patched exact Host bundle
- **When** the app host reports `renderer_ready`
- **Then** the 120-second `GI` watchdog is disposed through the verified client-coordination chain
- **And** unrelated timeout literals remain untouched
