import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { scrubHermesFingerprints } from "../scrub"

const HERMES_SYSTEM = readFileSync(
  join(import.meta.dir, "fixtures", "hermes-system.txt"),
  "utf-8",
)

// Hermes v2026.6.19+ layout: a new "# Parallel tool calls" heading sits between
// "# Finishing the job" and the un-headed memory/skills paragraph, so the
// finishing-job regex no longer swallows that paragraph (the regression behind
// issue #1 — extra-usage 400s returned on Hermes 0.17.0).
const HERMES_SYSTEM_V2026_6_19 = readFileSync(
  join(import.meta.dir, "fixtures", "hermes-system-v2026.6.19.txt"),
  "utf-8",
)

describe("scrubHermesFingerprints", () => {
  test("removes the 'Finishing the job' harness block", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM)
    expect(out).not.toContain("# Finishing the job")
    // A distinctive phrase from inside the block must be gone
    expect(out).not.toContain("NEVER substitute plausible-looking fabricated output")
    // The persistent-memory / skill-management instructions are part of the block
    expect(out).not.toContain("You have persistent memory across sessions")
    expect(out).not.toContain("patch it immediately with skill_manage")
  })

  test("preserves the user-editable persona (section above the block)", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM)
    expect(out).toContain("You run on Hermes Agent (by Nous Research)")
    expect(out).toContain("# Hermes Agent Persona")
  })

  test("preserves sections after the block (mid-turn steering, skills list)", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM)
    expect(out).toContain("## Mid-turn user steering")
    expect(out).toContain("[OUT-OF-BAND USER MESSAGE")
    expect(out).toContain("<available_skills>")
  })

  test("is idempotent — scrubbing twice equals scrubbing once", () => {
    const once = scrubHermesFingerprints(HERMES_SYSTEM)
    const twice = scrubHermesFingerprints(once)
    expect(twice).toBe(once)
  })

  test("no-op on a prompt without the Hermes harness block", () => {
    const plain =
      "You are Claude Code, Anthropic's CLI.\n\n# Tone\nBe concise and direct."
    expect(scrubHermesFingerprints(plain)).toBe(plain)
  })

  test("no-op on empty / falsy input", () => {
    expect(scrubHermesFingerprints("")).toBe("")
  })

  test("does not leave a triple-newline gap where the block was", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM)
    expect(out).not.toContain("\n\n\n")
  })
})

describe("scrubHermesFingerprints — v2026.6.19+ layout (issue #1)", () => {
  test("removes the 'Finishing the job' block", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM_V2026_6_19)
    expect(out).not.toContain("# Finishing the job")
    expect(out).not.toContain("NEVER substitute plausible-looking fabricated output")
  })

  test("removes the memory/skills paragraph even with the new heading before it", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM_V2026_6_19)
    expect(out).not.toContain("You have persistent memory across sessions")
    expect(out).not.toContain("patch it immediately with skill_manage")
    expect(out).not.toContain("session_search to recall")
  })

  test("preserves identity, steering, and skills sections", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM_V2026_6_19)
    expect(out).toContain("You are Hermes Agent, an intelligent AI assistant")
    expect(out).toContain("## Mid-turn user steering")
    expect(out).toContain("## Skills (mandatory)")
    expect(out).toContain("<available_skills>")
  })

  test("is idempotent on the new layout", () => {
    const once = scrubHermesFingerprints(HERMES_SYSTEM_V2026_6_19)
    expect(scrubHermesFingerprints(once)).toBe(once)
  })

  test("leaves no triple-newline gaps on the new layout", () => {
    const out = scrubHermesFingerprints(HERMES_SYSTEM_V2026_6_19)
    expect(out).not.toContain("\n\n\n")
  })
})
