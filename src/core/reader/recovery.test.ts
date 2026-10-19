import { InMemoryRecoveryStore } from '@/test/fakes';
import { RecoveryService } from './recovery';

describe('RecoveryService', () => {
  it('reports the book left open by an interrupted session, once', () => {
    const store = new InMemoryRecoveryStore();
    new RecoveryService(store, () => 5).readingStarted('b1');

    const next = new RecoveryService(store);
    expect(next.takeInterruptedBook()).toBe('b1');
    expect(next.takeInterruptedBook()).toBeNull();
  });

  it('reports nothing after a normal stop', () => {
    const store = new InMemoryRecoveryStore();
    const service = new RecoveryService(store);
    service.readingStarted('b1');
    service.readingStopped();
    expect(new RecoveryService(store).takeInterruptedBook()).toBeNull();
  });

  it('never throws when storage fails', () => {
    const broken = {
      read: () => {
        throw new Error('blocked');
      },
      write: () => {
        throw new Error('blocked');
      },
    };
    const service = new RecoveryService(broken);
    expect(() => {
      service.readingStarted('b1');
    }).not.toThrow();
    expect(service.takeInterruptedBook()).toBeNull();
  });
});
