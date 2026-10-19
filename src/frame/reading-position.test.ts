import { restoreReadingPosition, trackReadingPosition } from './reading-position';

describe('reading position', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports scrolling at most every 500 ms and on pagehide', () => {
    const report = vi.fn();
    const win = new EventTarget() as Window;
    Object.defineProperty(win, 'scrollY', { value: 640 });
    trackReadingPosition(win, report);

    win.dispatchEvent(new Event('scroll'));
    win.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(500);
    expect(report).toHaveBeenCalledExactlyOnceWith({ scrollY: 640 });

    win.dispatchEvent(new Event('pagehide'));
    expect(report).toHaveBeenCalledTimes(2);
  });

  it('restores the position instantly once the book has loaded', () => {
    const scrollTo = vi.fn();
    const win = Object.assign(new EventTarget(), { scrollTo }) as unknown as Window;
    restoreReadingPosition(win, { scrollY: 900 });
    expect(scrollTo).not.toHaveBeenCalled();

    win.dispatchEvent(new Event('load'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 900, behavior: 'instant' });
  });
});
