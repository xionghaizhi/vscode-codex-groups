# Spec: Codex 26.5917.62051 upgrade compatibility

## MODIFIED Requirements

### Requirement: exact-build fail-closed

The adaptation MUST patch `openai.chatgpt@26.5917.61114` and `openai.chatgpt@26.5917.62051` with their own host aliases. Unknown 5917 builds, suffixed versions and future minors MUST produce zero writes. 62051 MUST NOT be patched with the 61114 host symbols `uD`, `pm`, `xM` or `ute`.

#### Scenario: unverified 5917 build stays untouched

- **WHEN** plan or apply receives an unknown or suffixed 26.5917 build
- **THEN** it reports the unsupported exact build and writes no Codex bundle

### Requirement: existing Local Groups behavior remains live

Titles, groups, grouped new conversations, project history and subagent rendering MUST remain available without changing user configuration. Following user approval on 2026-09-30, Max/Ultra choices MUST follow each model catalog declaration rather than a model-name allowlist. This supersedes the earlier fixed Sol/Astra model set for supported 26.5917 builds.

#### Scenario: existing Local Groups contracts survive the upgrade

- **WHEN** a supported 26.5917 build is patched and reloaded
- **THEN** titles, groups, grouped new conversations, project history, subagent rendering and the catalog-declared Max/Ultra choices remain available without changing user configuration

### Requirement: host drift is explicit

The 62051 host patch MUST bind watchdog `aD`, host class `dm`, startup object `new SM({`, child process alias `oLe`, metadata anchor `Z2e` and capn parser `ate`. Header, UI, Power and Server semantic bundles MUST still be uniquely located.

## ADDED Requirements

### Requirement: Codex Audio dependency is enabled on Remote-SSH

`openai.chatgpt@26.5917.62051` MUST NOT be treated as activated until `openai.codex-audio` is installed and enabled. A remote-only copy of a `extensionKind: ui` Codex Audio MUST be considered disabled. Remote-SSH MAY enable it by installing the matching `26.917.62051` build on the server and setting `remote.extensionKind["openai.codex-audio"] = ["workspace"]`, then reloading. Local Groups MUST NOT modify `~/.codex/config.toml` for this. The marketplace dialog `安装并重新加载` MUST NOT be used as the recorded install path when a server copy already exists.

#### Scenario: missing dependency

- **WHEN** Codex 26.5917.62051 is installed without Codex Audio
- **THEN** VS Code reports that Codex cannot activate because Codex Audio is not installed

#### Scenario: UI-kind copy disabled on remote

- **WHEN** Codex Audio is copied only into `~/.vscode-server/extensions` and `extensionKind` remains `ui`
- **THEN** VS Code reports that Codex cannot activate because Codex Audio is disabled

#### Scenario: remote workspace override

- **WHEN** matching `openai.codex-audio@26.917.62051` is present and `remote.extensionKind` maps it to `workspace`
- **THEN** after Reload Window, Codex can activate without installing a second copy from the dialog

### Requirement: reasoning choices follow declared model capabilities

For exact builds 26.5917.61114 and 26.5917.62051, the `model/list` transformation MUST preserve catalog-declared `max` and `ultra` regardless of UI feature gates or the model slug. The reasoning menu, compact/expanded slider consumer and saved-effort validation MUST use those declarations. They MUST NOT add an undeclared effort or invent an unavailable model. Native model visibility, disabled states, lower efforts and configuration persistence MUST remain unchanged. `persistent` remains excluded from the reasoning menu. Local Groups MUST NOT rewrite configuration, catalogs, provider credentials or multi-agent preferences.

#### Scenario: newly configured model declares both levels

- **WHEN** `gpt-6.1-sol` or an arbitrary custom model declares `max` and `ultra`
- **THEN** both choices survive model-list filtering, appear in the reasoning menu and slider consumer, and remain selected after native save/readback

#### Scenario: partial or absent capabilities

- **WHEN** a model declares only Max, only Ultra, or neither
- **THEN** only its declared choices appear; an unsupported saved choice follows native default validation
- **AND** a missing model or empty slider does not receive fabricated entries

#### Scenario: previously installed model guards are migrated

- **WHEN** a supported build has UI/Power marker v1 or v2
- **THEN** repair replaces the model allowlist with catalog-driven v3 contracts, remains idempotent, and rejects detached or duplicate contracts before writing

#### Scenario: future upgrade preserves this rule

- **WHEN** another exact Codex build is adapted
- **THEN** its real model-list, menu, slider and persistence consumers must be identified and regression-tested for arbitrary slugs and partial capabilities; copying a Sol/Astra allowlist is prohibited
