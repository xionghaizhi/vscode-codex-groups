# Spec: Codex 26.5903.61454 upgrade compatibility

## ADDED Requirements

### Requirement: exact-build whitelist

The adaptation MUST only patch `openai.chatgpt@26.5903.61454`. Unknown 5903 builds, suffixed versions and future minors MUST fail closed with zero writes.

#### Scenario: exact build is patched

- **Given** official clean `26.5903.61454`
- **When** plan and apply run
- **Then** Host, Header, Main, Power and Server/History receive the 5903 patches atomically
- **And** syntax, external verification and a second zero-change plan pass

#### Scenario: unknown or suffixed versions write nothing

- **Given** `26.5903.99999`, `26.5903.61454.1`, `26.5903.61454-insider` or `26.5904.1`
- **When** plan or apply runs
- **Then** no target file is restored or written
- **And** existing 5901 exact-build behavior is unchanged

### Requirement: dropdown and opened titles stay consistent

Header MUST send only the Local Groups marker. Main `YFt` MUST decode only that marker. Opened-title refresh MUST use Yn-module React `Ln`, not JSX `$`.

#### Scenario: dropdown shows local title immediately

- **Given** a local conversation with a non-empty local title
- **When** metadata is saved
- **Then** the recent-row marker is `__codexLocalGroupsTitle265903:` plus the native title
- **And** `YFt` returns the local title
- **And** clearing the local title omits the marker and shows the native title

#### Scenario: opened title uses the real hooks runtime and cleans up

- **Given** Header JSX `$` and Yn React `Ln`
- **When** the opened-title refresh patch is applied
- **Then** `Hn` uses `Ln.useState/useEffect`
- **And** its refresh listener is removed by the cleanup returned from the same effect
- **And** a missing cleanup or JSX-runtime hook injection is rejected before writing

#### Scenario: decorator reaches the real row map

- **Given** the Header project row helper
- **When** rows are rendered
- **Then** `codexRecentTaskProjectRows` calls `u.map` and that callback calls `codexLocalGroupsDecoratedItem`
- **And** duplicate/later/nested decorator decoys are rejected

### Requirement: project history uses the real split request path

Project history MUST use the Server store's real `listRecentThreads` request with state-database reads and cursor pagination, include the selected root and descendants only, and expose a manager method with a compatible `listAllThreads` fallback in the Power `qct` hook.

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
- **And** a no-argument `qct()` call keeps native recent-history behavior

### Requirement: Sol and Astra Max and Ultra cover menu and drag sliders

Max and Ultra MUST be selectable in the reasoning menu and both compact and expanded drag sliders for available `gpt-5.6-sol`, `gpt-6-sol` and `gpt-6-astra`, even when the picker input has been filtered down to xhigh. Native persistence MUST be reused. Patching MUST NOT change user configuration.

#### Scenario: both target models expose ordered choices through actual consumers

- **Given** an available Sol or Astra model whose picker efforts end at xhigh
- **When** the user opens the compact or expanded Power control
- **Then** `S0n` splices Max then Ultra into `qe` before `rGn({powerSelectionsWithXHigh:qe})`
- **And** `U4` exposes the same efforts
- **And** `t0e` preserves Max/Ultra on readback
- **And** absent or unrelated models are not widened

### Requirement: watchdog changes only the verified Host chain

The startup timeout MUST change only in the exact `jI` watchdog and MUST remain reachable through `Nd`, `new iI({startup})` and `renderer_ready`.

#### Scenario: renderer ready disposes the extended watchdog

- **Given** the patched exact Host bundle
- **When** the app host reports `renderer_ready`
- **Then** the 120-second `jI` watchdog is disposed through the verified client-coordination chain
- **And** unrelated timeout literals remain untouched
