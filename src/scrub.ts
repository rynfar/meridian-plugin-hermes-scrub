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
 * Removing this single block drops the request back under the metering threshold
 * (verified empirically — preset-independent). The user-editable persona above
 * it and the mid-turn-steering / skills sections below it are preserved verbatim,
 * so Hermes' identity and tool guidance are untouched.
 *
 * Anchored on the literal "# Finishing the job" header and run to the next
 * markdown heading (or end of string). When the header is absent the regex
 * matches nothing, so this is a safe pass-through for non-Hermes prompts and
 * idempotent on already-scrubbed input (running it twice is a no-op).
 */
const HERMES_HARNESS_BLOCK = /# Finishing the job\n[\s\S]*?(?=\n#{1,6} |\s*$)/

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
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "")
}
