// Shared between modernization-wizard and replacement-page drafts. Drafts
// older than this are ignored on load and cleared — the elevator's current
// values may have changed in the meantime, so restoring a stale draft would
// silently overwrite unrelated work.
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
