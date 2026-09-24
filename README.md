# @rynfar/meridian-plugin-hermes-scrub

A [Meridian](https://github.com/rynfar/meridian) plugin that strips [Hermes Agent](https://hermes-agent.nousresearch.com)'s coding-harness fingerprint from the system prompt before it reaches Claude.

## Why

Hermes Agent (by Nous Research) can talk to an Anthropic-compatible endpoint via `api_mode: anthropic_messages`, so you can point it at Meridian and use your Claude Max subscription. Its system prompt contains self-management tool identifiers such as `session_search` and `skill_manage`.

Those identifiers have triggered **Extra Usage** metering in live Hermes requests. Once Extra Usage is depleted, affected requests fail with:

```
400 invalid_request_error: You're out of extra usage. Add more at claude.ai/settings/usage and keep going.
```

The plugin changes the distinctive underscored identifiers to spaced prose (`session_search` → `session search`). Live parent and subagent checks showed the requests succeeding under Max after that change. The prompt's guidance and structure remain intact:

- the user-editable **persona** (`# Hermes Agent Persona`, "You run on Hermes Agent…")
- the **finishing-the-job**, memory, session-recall, and skill guidance
- **mid-turn user steering** instructions
- the full **`<available_skills>`** list
- tools, guidelines, and any user- or harness-appended content

The scrub is **content-scoped** (it runs on every adapter and changes only the listed identifiers) and **idempotent** (running it twice is a no-op). Prompts without those identifiers are unchanged.

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
  default: claude-opus-5-5            # or any model Meridian maps
  api_key: meridian-local            # any non-empty value; Meridian uses your Max auth
```

## Behavior

| Input | Output |
|---|---|
| No system prompt | unchanged |
| System prompt without the targeted identifiers | unchanged (idempotent) |
| Hermes' default or subagent system prompt | Targeted tool identifiers changed to spaced prose; persona, guidance, steering, and skills preserved |

## Test

```bash
bun test
```

## License

MIT
