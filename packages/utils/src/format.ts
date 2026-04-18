/**
 * Swedish krona display, no decimals, space as thousands separator:
 *   formatKr(780000)      // "780 000 kr"
 *   formatKr("1040000.00") // "1 040 000 kr"
 *   formatKr(null)         // "–"
 *
 * Coerces string inputs to numbers on the way in — Postgres `numeric`
 * columns come back as strings via Drizzle, and calling `.toLocaleString`
 * on a string is a no-op (the string's toLocaleString just returns
 * itself), which is the bug this helper exists to prevent.
 */
export function formatKr(value: number | string | null | undefined): string {
  const n = coerce(value);
  if (n == null) return "–";
  return `${n.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`;
}

/**
 * Same formatting as formatKr but without the "kr" suffix — for UIs that
 * render the unit separately (e.g. a large display number plus a small
 * suffix beside it).
 */
export function formatKrNumber(
  value: number | string | null | undefined,
): string {
  const n = coerce(value);
  if (n == null) return "–";
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

function coerce(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
