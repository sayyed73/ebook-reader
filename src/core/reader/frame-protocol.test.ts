import { parseFrameMessage, parseLoadBookMessage, toEnvelope } from './frame-protocol';
import { STORAGE_QUOTA_BYTES } from './storage-quota';

describe('parseFrameMessage', () => {
  it('accepts well-formed messages', () => {
    expect(parseFrameMessage(toEnvelope({ type: 'ready' }))).toEqual({ type: 'ready' });
    expect(parseFrameMessage(toEnvelope({ type: 'storage-set', key: 'k', value: 'v' }))).toEqual({
      type: 'storage-set',
      key: 'k',
      value: 'v',
    });
  });

  it.each([
    ['null', null],
    ['a string', 'ready'],
    ['an array', [1]],
    ['no channel', { type: 'ready', version: 1 }],
    ['wrong version', { channel: 'book-frame', version: 2, type: 'ready' }],
    ['unknown type', toEnvelope({ type: 'run-command' })],
    ['non-string value', toEnvelope({ type: 'storage-set', key: 'k', value: 1 })],
    ['missing key', toEnvelope({ type: 'storage-remove' })],
    [
      'an oversized entry',
      toEnvelope({ type: 'storage-set', key: 'k', value: 'x'.repeat(STORAGE_QUOTA_BYTES) }),
    ],
  ])('rejects %s', (_label, data) => {
    expect(parseFrameMessage(data)).toBeNull();
  });

  it('drops unexpected extra fields', () => {
    expect(parseFrameMessage(toEnvelope({ type: 'storage-clear', extra: 'x' }))).toEqual({
      type: 'storage-clear',
    });
  });
});

describe('parseLoadBookMessage', () => {
  it('keeps only string storage values', () => {
    const message = parseLoadBookMessage(
      toEnvelope({ type: 'load', html: '<p>', storage: { a: '1', b: 2 }, safeMode: false }),
    );
    expect(message).toEqual({ type: 'load', html: '<p>', storage: { a: '1' }, safeMode: false });
  });

  it('rejects malformed load messages', () => {
    expect(parseLoadBookMessage(toEnvelope({ type: 'load', html: 1 }))).toBeNull();
    expect(parseLoadBookMessage(toEnvelope({ type: 'ready' }))).toBeNull();
  });
});
