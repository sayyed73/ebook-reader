import { LocalRecoveryStore } from './local-recovery-store';

describe('LocalRecoveryStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips and clears the marker', () => {
    const store = new LocalRecoveryStore();
    store.write({ bookId: 'b1', openedAt: 3 });
    expect(new LocalRecoveryStore().read()).toEqual({ bookId: 'b1', openedAt: 3 });
    store.write(null);
    expect(store.read()).toBeNull();
  });

  it('ignores malformed values', () => {
    localStorage.setItem('reader.open-book', '{"bookId":5}');
    expect(new LocalRecoveryStore().read()).toBeNull();
  });
});
