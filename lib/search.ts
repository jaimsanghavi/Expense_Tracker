/**
 * Strip characters that are significant in PostgREST's filter grammar (`,` and
 * `()` separate and group filters; `\` escapes) so a user-supplied search value
 * interpolated into an `.or("col.ilike.%term%")` expression cannot break out of
 * the pattern and inject additional conditions.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()\\]/g, "").trim();
}
