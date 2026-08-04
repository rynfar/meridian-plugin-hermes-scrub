import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { scrubHermesFingerprints } from "../scrub"

const fixture = (name: string) =>
  readFileSync(join(import.meta.dir, "fixtures", name), "utf-8")

const HERMES_SYSTEM = fixture("hermes-system.txt")
// Hermes v2026.6.19+ layout: a "# Parallel tool calls" heading sits between
// "# Finishing the job" and the memory/skills paragraph.
const HERMES_SYSTEM_V2026_6_19 = fixture("hermes-system-v2026.6.19.txt")
// A real spawned-subagent / delegated-child prompt: it has NO "persistent
// memory" anchor, and the session/skills guidance is re-homed under the
// "# Parallel tool calls" heading — the layout that 400'd every subagent.
const HERMES_SUBAGENT = fixture("hermes-system-subagent.txt")

// The fingerprinting identifiers, and their neutralized (spaced) forms.
const IDENTIFIERS = ["session_search", "skill_manage", "skill_view"]

describe("scrubHermesFingerprints — token neutralization", () => {
  for (const src of [HERMES_SYSTEM, HERMES_SYSTEM_V2026_6_19, HERMES_SUBAGENT]) {
    test("breaks every underscored Hermes tool identifier", () => {
      const out = scrubHermesFingerprints(src)
      for (const id of IDENTIFIERS) {
        // No bare snake_case identifier survives...
        expect(out).not.toMatch(new RegExp(`\\b${id}\\b`))
        // ...but its spaced form is present iff the identifier was in the input
        if (new RegExp(`\\b${id}\\b`).test(src)) {
          expect(out).toContain(id.replace(/_/g, " "))
        }
      }
    })
  }

  test("PRESERVES all guidance blocks (no deletion)", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM)
    // The whole point of the new approach: guidance stays, only tokens change.
    expect(out).toContain("# Finishing the job")
    expect(out).toContain("NEVER substitute plausible-looking fabricated output")
    expect(out).toContain("You have persistent memory across sessions")
    expect(out).toContain("## Mid-turn user steering")
    expect(out).toContain("<available_skills>")
  })

  test("preserves length except for the removed underscores", () => {
    const underscores = (HERMES_SYSTEM.match(
      /\b(?:session_search|session_dump|skill_manage|skill_view|skill_create|skill_search|skills_list|memory_search)\b/g,
    ) || []).reduce((n, m) => n + (m.match(/_/g)?.length ?? 0), 0)
    const out = scrubHermesFingerprints(HERMES_SYSTEM)
    // Same length: each "_" became a " ", nothing else touched.
    expect(out.length).toBe(HERMES_SYSTEM.length)
    expect(underscores).toBeGreaterThan(0)
  })

  test("subagent layout: session/skills guidance is de-fingerprinted", () => {
    // This is the case the old block regexes missed entirely.
    const out = scrubHermesFingerprints(HERMES_SUBAGENT)
    expect(out).not.toMatch(/\bsession_search\b/)
    expect(out).not.toMatch(/\bskill_manage\b/)
    // The guidance prose itself is preserved (just re-spelled).
    expect(out).toContain("references something from a past conversation")
  })

  test("is idempotent — scrubbing twice equals scrubbing once", () => {
    for (const src of [HERMES_SYSTEM, HERMES_SYSTEM_V2026_6_19, HERMES_SUBAGENT]) {
      const once = scrubHermesFingerprints(src)
      expect(scrubHermesFingerprints(once)).toBe(once)
    }
  })

  test("no-op on a prompt without Hermes identifiers", () => {
    const plain =
      "You are Claude Code, Anthropic's CLI.\n\n# Tone\nBe concise and direct."
    expect(scrubHermesFingerprints(plain)).toBe(plain)
  })

  test("no-op on empty / falsy input", () => {
    expect(scrubHermesFingerprints("")).toBe("")
  })

  test("word-boundary anchored — does not corrupt a larger identifier", () => {
    const s = "call my_session_searcher(x) and note session_search below"
    const out = scrubHermesFingerprints(s)
    expect(out).toContain("my_session_searcher(x)") // untouched substring
    expect(out).toContain("session search") // the standalone token neutralized
  })
})
