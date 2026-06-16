/**
 * Meridian plugin: strip Hermes Agent's coding-harness fingerprint from the
 * system prompt before it reaches Claude.
 *
 * CONTENT-SCOPED, not adapter-scoped: runs on EVERY adapter and self-scopes by
 * content. `scrubHermesFingerprints` only rewrites the prompt when Hermes'
 * "# Finishing the job" harness block is actually present, and is otherwise an
 * exact no-op. This matters because Hermes (by Nous Research) speaks the
 * Anthropic Messages API but sends no distinguishing header — its traffic
 * arrives under whatever adapter Meridian falls back to (commonly pi or the
 * default), so an adapter-scoped filter would miss it and let the fingerprint
 * reach Claude, which Anthropic meters as agentic / Extra-Usage traffic.
 * Running everywhere + the idempotent regex is safe for genuine Claude Code /
 * OpenCode / pi prompts (no match → unchanged).
 */

import type { Transform, RequestContext } from "./types.js"
import { scrubHermesFingerprints } from "./scrub.js"

// Re-export so consumers can import types without needing @rynfar/meridian
// installed; these are structurally compatible with meridian's exported types.
export type { Transform, RequestContext } from "./types.js"

const plugin: Transform = {
  name: "hermes-scrub",
  version: "0.1.0",
  description: "Strip Hermes Agent's coding-harness fingerprint from the system prompt before it reaches Claude (all adapters; content-scoped)",
  // No `adapters` restriction — undefined means all adapters. The scrub is a
  // content-based no-op when no Hermes fingerprint is present.

  onRequest(ctx: RequestContext): RequestContext {
    if (!ctx.systemContext) return ctx
    const scrubbed = scrubHermesFingerprints(ctx.systemContext)
    if (scrubbed === ctx.systemContext) return ctx
    return { ...ctx, systemContext: scrubbed }
  },
}

export default plugin
export { scrubHermesFingerprints }
