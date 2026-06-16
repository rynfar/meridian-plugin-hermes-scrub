import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { scrubHermesFingerprints } from "../scrub"

const HERMES_SYSTEM = readFileSync(
  join(import.meta.dir, "fixtures", "hermes-system.txt"),
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
