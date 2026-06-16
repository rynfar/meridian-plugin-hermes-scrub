# @rynfar/meridian-plugin-hermes-scrub

A [Meridian](https://github.com/rynfar/meridian) plugin that strips [Hermes Agent](https://hermes-agent.nousresearch.com)'s coding-harness fingerprint from the system prompt before it reaches Claude.

## Why

Hermes Agent (by Nous Research) can talk to any Anthropic-compatible endpoint via `api_mode: anthropic_messages`, so you can point it straight at Meridian and use your Claude Max subscription. But Hermes injects a built-in `# Finishing the job` framework block into its system prompt — finish-the-job insistence, persistent-memory instructions, and skill-management directives.

Individually those lines are harmless. **Cumulatively the block reads as an autonomous coding-agent harness**, and Anthropic's usage metering flags that signal: the request gets billed as **Extra Usage** instead of under your Max subscription. Once your Extra Usage is depleted, every Hermes request fails with:

```
400 invalid_request_error: You're out of extra usage. Add more at claude.ai/settings/usage and keep going.
```

This plugin surgically removes that one block. The request drops back under the metering threshold and is billed under Max (verified empirically — and the fix is independent of the `codeSystemPrompt` preset). Everything else in Hermes' prompt is preserved verbatim:

- the user-editable **persona** (`# Hermes Agent Persona`, "You run on Hermes Agent…")
- **mid-turn user steering** instructions
- the full **`<available_skills>`** list
- tools, guidelines, and any user- or harness-appended content

The scrub is **content-scoped** (it runs on every adapter and self-scopes by matching Hermes' fingerprint) and **idempotent** (running it twice is a no-op). It's a safe pass-through for non-Hermes prompts — Claude Code, OpenCode, pi, etc. are left unchanged.

## Install

### Option 1: Local clone (recommended for dev)

```bash
git clone https://github.com/rynfar/meridian-plugin-hermes-scrub.git ~/repos/meridian-plugin-hermes-scrub
cd ~/repos/meridian-plugin-hermes-scrub
npm install
npm run build
```

Then point Meridian's plugin config at the built file:

```bash
mkdir -p ~/.config/meridian
# add this entry to ~/.config/meridian/plugins.json:
#   { "path": "/Users/YOU/repos/meridian-plugin-hermes-scrub/dist/index.js", "enabled": true }
```

Restart Meridian (or `curl -X POST http://localhost:3456/plugins/reload`).

Verify at `http://localhost:3456/plugins` — you should see `hermes-scrub` listed as **active**.

### Option 2: Drop-in file

Symlink or copy `dist/index.js` into `~/.config/meridian/plugins/` for auto-discovery:

```bash
ln -s ~/repos/meridian-plugin-hermes-scrub/dist/index.js ~/.config/meridian/plugins/hermes-scrub.js
```

## Point Hermes at Meridian

In `~/.hermes/config.yaml`:

```yaml
model:
  provider: custom
  base_url: http://localhost:3456     # your Meridian instance
  api_mode: anthropic_messages
  default: claude-opus-4-8            # or any model Meridian maps
  api_key: meridian-local            # any non-empty value; Meridian uses your Max auth
```

## Behavior

| Input | Output |
|---|---|
| No system prompt | unchanged |
| System prompt without the Hermes harness block | unchanged (idempotent) |
| Hermes' default system prompt | `# Finishing the job` block removed, spacing normalized; persona, steering, and skills preserved |

## Test

```bash
bun test
```

## License

MIT
