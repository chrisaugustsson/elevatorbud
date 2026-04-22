/**
 * Slugify an Excel header into a stable `custom_field_defs.key`.
 *
 * Used during import to turn a column header like "Verksamhet / Användning"
 * into a key the server can match against existing defs (or create a new
 * def with this key). Labels stay human-readable — only the key is
 * normalized.
 *
 * Rules:
 *   - lowercase
 *   - strip Swedish diacritics (å/ä → a, ö → o, etc.)
 *   - non-alphanumerics collapse to a single `_`
 *   - trim leading/trailing `_`
 *
 * Two different labels can end up with the same slug ("Verksamhet" and
 * "verksamhet"). That's intentional — both point at the same def.
 */
export function slugifyHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
