/**
 * Leading doctype (optionally preceded by whitespace and comments). Markup inserted before the
 * doctype would switch the page to quirks mode and change its layout.
 */
const LEADING_DOCTYPE = /^(?:\s|<!--[\s\S]*?-->)*<!doctype[^>]*>/i;

/** Inserts `snippet` at the start of the document while keeping its doctype first. */
export function insertAtDocumentStart(html: string, snippet: string): string {
  const doctype = LEADING_DOCTYPE.exec(html)?.[0];
  if (!doctype) return snippet + html;
  return doctype + snippet + html.slice(doctype.length);
}

export function cspMetaTag(policy: string): string {
  const escaped = policy.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<meta http-equiv="Content-Security-Policy" content="${escaped}">`;
}
