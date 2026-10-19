/** Links that stay inside the current page: fragments and `javascript:` handlers. */
export function isInPageHref(href: string): boolean {
  const trimmed = href.trim();
  return trimmed.startsWith('#') || /^javascript:/i.test(trimmed);
}

/**
 * Suppresses clicks on links to other pages. Navigation away from the frame is blocked by
 * the app's CSP anyway; without this guard the book would be replaced by an error page.
 */
export function installLinkGuard(win: Window, onBlocked: () => void): void {
  win.addEventListener(
    'click',
    (event) => {
      const target = event.target as { closest?: (selector: string) => Element | null } | null;
      const link = target?.closest?.('a[href], area[href]');
      if (!link || isInPageHref(link.getAttribute('href') ?? '')) return;
      event.preventDefault();
      onBlocked();
    },
    true,
  );
}
