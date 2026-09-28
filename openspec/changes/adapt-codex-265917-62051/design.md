# Design: Codex 26.5917.62051

## Constraints

- Unknown 5917 builds, suffixed versions and future minors fail closed before restore or write.
- 62051 host aliases are `aD`, `dm`, `SM`, `oLe`, `ate` and metadata anchor `Z2e/O/gT/xB/yG/Zt`.
- Header, UI, Power and Server consumers stay on the verified 61114 semantic anchors.
- 61114 host aliases remain required for that exact build. A 62051 bundle with 61114 host symbols must not be written.

## Codex Audio on Remote-SSH

`openai.chatgpt@26.5917.62051` depends on `openai.codex-audio`. Matching marketplace build is `openai.codex-audio@26.917.62051` (same 62051, version string has no `5`).

Codex Audio `package.json` has `"extensionKind": ["ui"]`. VS Code disables UI extensions on the SSH remote. Observed errors:

1. Codex Audio not installed: `无法激活 Codex，因为它依赖于 OpenAI 中的 Codex Audio 扩展，而该扩展未安装`.
2. After copying the VSIX into `~/.vscode-server/extensions` only: `无法激活 Codex，因为它依赖于被禁用的 Codex Audio 扩展`.
3. Clicking the dialog `安装并重新加载` can install a second copy. Reload after a correct enablement instead.
4. A separate Remote-SSH toast `Failed to set up dynamic port forwarding connection over SSH` is client/SSH forwarding, not Local Groups. This host `sshd` allows forwarding for the current user; `Match User sftpuser` is the only `AllowTcpForwarding no`.

Working remote-server path used this time:

- Install `openai.codex-audio-26.917.62051` next to Codex, keep the old Codex directory.
- Set remote Machine settings `remote.extensionKind["openai.codex-audio"] = ["workspace"]` so the UI-kind extension is allowed to run on the remote host.
- Reload Window. Dictation then uses the Linux host; missing audio devices must not block Codex activation.

Do not put this setting in `~/.codex/config.toml`.

## Verification

- Fixture plan/apply for both exact builds, zero-write negative case, locator uniqueness, official clean plan/apply/verifier/second plan, and no `config.toml` change.
- After live install: Codex activates, Local Groups status is compatible, Reload Window is required.
