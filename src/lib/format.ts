/** Short, human-readable reference derived from the request's UUID — not a
 * separate stored field, so it can never drift out of sync with the id. */
export function referenceNumber(id: string): string {
  return `SVT-${id.split("-")[0].toUpperCase()}`;
}
