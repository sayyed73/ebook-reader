import type { StorageMessage } from '@/core/reader/frame-protocol';
import { createStorage } from './storage-shim';

function setup(seed: Record<string, string> = {}, quotaBytes?: number) {
  const changes: StorageMessage[] = [];
  const storage = createStorage(seed, (m) => changes.push(m), quotaBytes);
  return { storage, changes };
}

describe('createStorage', () => {
  it('serves seeded values and reports writes', () => {
    const { storage, changes } = setup({ done: '{"1":true}' });
    expect(storage.getItem('done')).toBe('{"1":true}');
    expect(storage.getItem('missing')).toBeNull();

    storage.setItem('n', 5 as unknown as string);
    storage.removeItem('done');
    storage.removeItem('done');
    storage.clear();

    expect(changes).toEqual([
      { type: 'storage-set', key: 'n', value: '5' },
      { type: 'storage-remove', key: 'done' },
      { type: 'storage-clear' },
    ]);
  });

  it('supports property-style access like the real Storage', () => {
    const { storage, changes } = setup({ a: '1' });
    const record = storage as unknown as Record<string, string | undefined>;

    expect(record['a']).toBe('1');
    record['b'] = '2';
    expect('b' in storage).toBe(true);
    expect(Object.keys(storage)).toEqual(['a', 'b']);
    delete record['a'];
    expect(storage.length).toBe(1);
    expect(storage.key(0)).toBe('b');
    expect(changes.map((c) => c.type)).toEqual(['storage-set', 'storage-remove']);
  });

  it('keeps methods when a key shares their name', () => {
    const { storage } = setup();
    storage.setItem('getItem', 'x');
    expect(typeof storage.getItem).toBe('function');
    expect(storage.getItem('getItem')).toBe('x');
  });

  it('throws QuotaExceededError and leaves data unchanged', () => {
    const { storage, changes } = setup({}, 20);
    storage.setItem('k', '1234');
    expect(() => {
      storage.setItem('k', '1234567890');
    }).toThrow(expect.objectContaining({ name: 'QuotaExceededError' }) as Error);
    expect(storage.getItem('k')).toBe('1234');
    expect(changes).toHaveLength(1);
  });
});
