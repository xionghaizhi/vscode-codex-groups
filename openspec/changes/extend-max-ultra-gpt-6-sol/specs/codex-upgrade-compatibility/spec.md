# Spec: Max/Ultra 覆盖 gpt-6-sol

## ADDED Requirements

### Requirement: current Sol/Astra Max Ultra set includes gpt-6-sol

Supported Codex variants that already patch Sol/Astra Max and Ultra MUST treat `gpt-6-sol` like `gpt-5.6-sol` and `gpt-6-astra` when that model is available.

#### Scenario: 6 Sol compact slider is widened

- **Given** an available `gpt-6-sol` whose native picker efforts end at `xhigh`
- **When** the Power slider consumer finishes its native array
- **Then** Max and Ultra are inserted before the compact and expanded sliders consume that array
- **And** the reasoning menu and saved-effort validation accept `max` and `ultra` for `gpt-6-sol`
- **And** Terra, Luna and other models keep their existing behavior

#### Scenario: future upgrades keep the model set visible

- **Given** a later supported Codex build that still adapts Sol/Astra Max and Ultra
- **When** the upgrade checklist is executed
- **Then** `gpt-5.6-sol`, `gpt-6-sol` and `gpt-6-astra` are all verified
- **And** a newly catalogued Sol slug with `max`/`ultra` is added to the same guard instead of being assumed covered by `gpt-5.6-sol`
