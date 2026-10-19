import { installLinkGuard, isInPageHref } from './link-guard';

describe('isInPageHref', () => {
  it.each(['#chapter-1', '  #top', 'javascript:void(0)', 'JavaScript:go()'])(
    'allows %s',
    (href) => {
      expect(isInPageHref(href)).toBe(true);
    },
  );
  it.each(['https://example.com', '/page', 'other.html', '', '?q=1', 'mailto:a@b.c'])(
    'blocks %j',
    (href) => {
      expect(isInPageHref(href)).toBe(false);
    },
  );
});

describe('installLinkGuard', () => {
  it('prevents navigation for external links only', () => {
    const onBlocked = vi.fn();
    installLinkGuard(window, onBlocked);
    document.body.innerHTML =
      '<a id="ext" href="https://example.com"><span id="inner">x</span></a><a id="frag" href="#a">y</a>';

    const inner = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('inner')?.dispatchEvent(inner);
    const frag = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('frag')?.dispatchEvent(frag);

    expect(inner.defaultPrevented).toBe(true);
    expect(frag.defaultPrevented).toBe(false);
    expect(onBlocked).toHaveBeenCalledOnce();
  });
});
