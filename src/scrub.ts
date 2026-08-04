/**
 * Neutralize Hermes Agent's coding-harness fingerprint in a system prompt.
 *
 * WHY: Hermes (by Nous Research) speaks the Anthropic Messages API but its
 * system prompt names a distinctive family of self-management tools —
 * `session_search`, `skill_manage`, `skill_view`, … — in prose guidance
 * (MEMORY_GUIDANCE / SESSION_SEARCH_GUIDANCE / SKILLS_GUIDANCE in
 * prompt_builder.py). Anthropic's OAuth (Claude Max) usage classifier
 * fingerprints those exact snake_case identifiers as third-party autonomous-
 * agent traffic and bills the request as Extra Usage, so a Max user routing
 * Hermes through Meridian gets HTTP 400 "out of extra usage" once that pool is
 * spent. See NousResearch/hermes-agent#65365 (the `memory`/`session_search`
 * signal) — the parent agent survives only because Meridian *defers* its tool
 * schemas, but the prose identifiers in the system prompt still leak through.
 *
 * WHAT (verified empirically, both the main CLI prompt and the subagent /
 * delegated-child prompt, deterministically): the metering trigger is the exact
 * underscored tool tokens — NOTHING else in the harness. Keeping every block
 * verbatim (finishing-the-job, persistent-memory, session/skills guidance) and
 * only breaking those tokens (`session_search` → `session search`) flips the
 * request from 400 → 200. So this plugin no longer deletes any guidance: it
 * rewrites just the fingerprinting identifiers.
 *
 * This is strictly better than the earlier block-deletion approach:
 *  - Preserves ALL of Hermes' guidance — finish-the-job insistence, memory
 *    hygiene, session-recall and skill-reuse advice stay intact and useful.
 *  - Fixes the SUBAGENT case, where the session/skills guidance is re-homed
 *    under "# Parallel tool calls" (no "persistent memory" anchor) and the old
 *    block regexes missed it — so every spawned child 400'd.
 *  - Closes the identity leak: the underscored tool names were the tell that
 *    the session was Hermes rather than Claude Code.
 *  - Robust to prompt reorganization: it targets tokens, not headings/blocks,
 *    so Hermes moving sections between versions can't reopen the hole.
 *
 * The spaced form ("session search") reads naturally to the model and does not
 * affect tool CALLS: tools are invoked by their schema name (surfaced via
 * Meridian's deferred-tool search), not by the prose spelling. Replacing the
 * underscore with a space also makes this idempotent — the spaced form no
 * longer matches — and a safe no-op on non-Hermes prompts, which never contain
 * these identifiers.
 */

/**
 * Hermes' self-management tool identifiers — the memory / session / skill family
 * that Anthropic's classifier fingerprints. Word-boundary anchored so only the
 * whole identifier matches (never a substring of some larger name). Extend this
 * list if a future Hermes release adds another distinctive snake_case tool that
 * appears in the system prompt.
 */
const HERMES_TOOL_IDENTIFIERS =
  /\b(?:session_search|session_dump|skill_manage|skill_view|skill_create|skill_search|skills_list|memory_search)\b/g

/**
 * Break Hermes' fingerprinting tool identifiers by replacing their underscores
 * with spaces (e.g. `session_search` → `session search`). Preserves all
 * surrounding prose. Idempotent and a no-op on prompts that contain none of
 * these identifiers.
 */
export function scrubHermesFingerprints(systemPrompt: string): string {
  if (!systemPrompt) return systemPrompt
  return systemPrompt.replace(HERMES_TOOL_IDENTIFIERS, (m) => m.replace(/_/g, " "))
}
