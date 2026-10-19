import { InMemoryBookStorageRepository } from '@/test/fakes';
import { BookStorageSession } from './book-storage-session';

function setup(initial: Record<string, string> = {}, quotaBytes?: number) {
  const repository = new InMemoryBookStorageRepository();
  const session = new BookStorageSession('b1', initial, repository, {
    saveDelayMs: 100,
    ...(quotaBytes === undefined ? {} : { quotaBytes }),
  });
  return { repository, session };
}

describe('BookStorageSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches changes into one save after the quiet period', async () => {
    const { repository, session } = setup({ a: '1' });
    session.apply({ type: 'storage-set', key: 'b', value: '2' });
    session.apply({ type: 'storage-remove', key: 'a' });
    expect(repository.saveCount).toBe(0);

    await vi.advanceTimersByTimeAsync(100);
    expect(repository.saveCount).toBe(1);
    expect(repository.saved.get('b1')).toEqual({ b: '2' });
  });

  it('flush saves immediately and does nothing when clean', async () => {
    const { repository, session } = setup();
    await session.flush();
    expect(repository.saveCount).toBe(0);

    session.apply({ type: 'storage-set', key: 'k', value: 'v' });
    await session.flush();
    expect(repository.saved.get('b1')).toEqual({ k: 'v' });
    await vi.advanceTimersByTimeAsync(500);
    expect(repository.saveCount).toBe(1);
  });

  it('rejects writes over the quota and keeps the previous value', () => {
    // 20 bytes = 10 UTF-16 characters.
    const { session } = setup({}, 20);
    expect(session.apply({ type: 'storage-set', key: 'k', value: '1234' })).toBe(true);
    expect(session.apply({ type: 'storage-set', key: 'k', value: '123456789' })).toBe(true);
    expect(session.apply({ type: 'storage-set', key: 'k', value: '1234567890' })).toBe(false);
    expect(session.snapshot()).toEqual({ k: '123456789' });
  });

  it('frees quota on remove and clear', () => {
    const { session } = setup({}, 20);
    session.apply({ type: 'storage-set', key: 'a', value: '123456789' });
    session.apply({ type: 'storage-clear' });
    expect(session.apply({ type: 'storage-set', key: 'b', value: '123456789' })).toBe(true);
  });

  it('reports save errors without losing later saves', async () => {
    const repository = new InMemoryBookStorageRepository();
    const onSaveError = vi.fn();
    const save = vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('disk full'));
    const session = new BookStorageSession('b1', {}, repository, { onSaveError });

    session.apply({ type: 'storage-set', key: 'a', value: '1' });
    await session.flush();
    session.apply({ type: 'storage-set', key: 'b', value: '2' });
    await session.flush();

    expect(onSaveError).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledTimes(2);
    expect(repository.saved.get('b1')).toEqual({ a: '1', b: '2' });
  });
});
