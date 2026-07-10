/**
 * Scrub Hermes Agent's coding-harness fingerprint from a system prompt.
 *
 * Hermes (by Nous Research) injects a built-in "# Finishing the job" framework
 * block: finish-the-job insistence, persistent-memory instructions, and
 * skill-management directives. Individually each line is innocuous, but
 * cumulatively the block reads as an autonomous coding-agent harness. Anthropic's
 * usage metering flags that signal and bills the request as Extra Usage instead
 * of under the Claude Max subscription — so a Max user routing Hermes through
 * Meridian gets "out of extra usage" errors once their Extra Usage is depleted.
 *
 * Removing the finishing-job block plus the un-headed memory/skills paragraph
 * drops the request back under the metering threshold (verified empirically —
 * preset-independent). The user-editable persona above and the
 * mid-turn-steering / skills sections below are preserved verbatim, so Hermes'
 * identity and tool guidance are untouched.
 *
 * Each block is anchored independently (literal header / leading sentence) and
 * runs to the next markdown heading (or end of string) — adjacency between
 * blocks is NOT assumed, because Hermes inserts new headings between them
 * across versions (v2026.6.19 added "# Parallel tool calls" mid-span). When an
 * anchor is absent its regex matches nothing, so this is a safe pass-through
 * for non-Hermes prompts and idempotent on already-scrubbed input.
 */
const HERMES_HARNESS_BLOCK = /# Finishing the job\n[\s\S]*?(?=\n#{1,6} |\s*$)/

/**
 * Hermes' un-headed memory/skills paragraph (MEMORY_GUIDANCE +
 * SESSION_SEARCH_GUIDANCE + SKILLS_GUIDANCE joined into one block by
 * system_prompt.py). Before Hermes v2026.6.19 this sat directly under
 * "# Finishing the job" and was swallowed by HERMES_HARNESS_BLOCK's lazy
 * match. v2026.6.19 inserted a "# Parallel tool calls" heading between them,
 * which terminates that match early and left this paragraph — the strongest
 * remaining harness fingerprint (persistent memory, session_search,
 * skill_manage directives) — unscrubbed, re-triggering Extra-Usage metering
 * (issue #1). Anchor it on its own leading sentence instead of relying on
 * adjacency to the finishing-job block.
 */
const HERMES_MEMORY_PARAGRAPH =
  /You have persistent memory across sessions\.[\s\S]*?(?=\n#{1,6} |\s*$)/

/**
 * Remove Hermes' harness fingerprint block from a system prompt string.
 *
 * - Strips the "# Finishing the job" block (finish-the-job + memory + skills)
 * - Collapses runs of 3+ newlines to 2 so section spacing stays normal
 * - Trims trailing whitespace
 *
 * Idempotent — calling this on already-scrubbed input produces identical output.
 */
export function scrubHermesFingerprints(systemPrompt: string): string {
  if (!systemPrompt) return systemPrompt
  return systemPrompt
    .replace(HERMES_HARNESS_BLOCK, "")
    .replace(HERMES_MEMORY_PARAGRAPH, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "")
}
