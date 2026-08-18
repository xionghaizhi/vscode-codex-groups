# Codex 26.5814.41407 Compatibility Specification

## ADDED Requirements

### Requirement: exact 5814 build support remains fail closed

Local Groups MUST support official build `26.5814.41407` only after all semantic anchors and final contracts are verified. Unknown `26.5814` builds MUST fail closed without modifying feature bundles. Existing `26.5810.41047` and `26.5810.52044` support MUST remain intact.

#### Scenario: official 5814 clean is patched atomically

- **Given** the verified official linux-x64 `26.5814.41407` clean extension
- **When** safe plan and apply run
- **Then** plan contains only the expected unique bundle set
- **And** apply performs syntax checks and an idempotent second plan
- **And** any missing or duplicate anchor restores all touched files

#### Scenario: future 5814 build is rejected

- **Given** an unverified `26.5814` build
- **Then** plan reports an unsupported build
- **And** no feature bundle is planned, restored or written
- **And** existing file content and mtime remain unchanged even when an old patch marker and clean backup exist

### Requirement: known user-facing contracts are one release gate

The 5814 release MUST validate project isolation, grouped row limits, Metadata four entries, same-ID title consistency, Sol Max/Ultra, project history, and both subagent transcript and composer consumers as one matrix. Passing only the newly changed anchor MUST NOT count as completion.

#### Scenario: same conversation title remains consistent

- **Given** one conversation has native title A and non-empty local title B
- **Then** the dropdown and opened Header display B for the same conversation ID
- **And** missing or blank local title makes both consumers fall back to A
- **And** metadata refresh updates both consumers and cleans up listeners
- **And** native thread title storage is not modified

#### Scenario: subagent consumers are independently verified

- **Then** V1 and V2 transcript producers remain connected to the membership store
- **And** the composer chain verifies parent, interaction and current-turn filters, visible rows, panel gate and panel rendering
- **And** Local Groups does not patch `canInteract` or change user Multi-Agent configuration

#### Scenario: structural decoys cannot satisfy the release gate

- **Given** a required Metadata or composer action is removed from its real call site
- **When** the same text is left in a later function, nested function or standalone object in the same `try`
- **Then** engine postconditions and the external verifier both fail closed
- **And** only the unique call argument object and expected brace depth may satisfy the contract

### Requirement: user Codex configuration is read only

Plan, apply, repair, verify, install and upgrade steps MUST NOT write, reorder or restore `config.toml`. The current content hash and mtime MUST remain identical before and after automated work.

#### Scenario: historical config baseline differs

- **Given** the current config hash differs from an older OpenSpec record
- **Then** the current value becomes the read-only baseline
- **And** the upgrade MUST NOT restore the historical value

### Requirement: official acquisition rejects partial artifacts

The VSIX MUST come from the Marketplace asset for linux-x64 and match the Marketplace SHA-256 before extraction. Range parts and interrupted files MUST NOT be used as official clean evidence.

#### Scenario: parallel Range download completes

- **Then** all byte ranges are concatenated in order
- **And** final size is `222415919` bytes
- **And** SHA-256 is `a25dc61555d079b989e32c22017cd5e43e0b6894d3428481ae34581838c66708`
- **And** ZIP validation passes before extraction

#### Scenario: installer resolves a different channel

- **Given** the Remote CLI installs a stable build instead of the requested prerelease
- **Then** that directory MUST NOT be used as official clean or live evidence
- **And** the verified local VSIX MUST be installed before checking the active registry and applying patches
