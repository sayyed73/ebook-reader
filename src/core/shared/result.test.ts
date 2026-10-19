import { err, ok, type Result } from './result';

function parsePositive(input: number): Result<number, 'not-positive'> {
  return input > 0 ? ok(input) : err('not-positive');
}

describe('Result', () => {
  it('narrows to the value on success', () => {
    const result = parsePositive(3);
    expect(result.ok && result.value).toBe(3);
  });

  it('narrows to the error on failure', () => {
    const result = parsePositive(-1);
    expect(!result.ok && result.error).toBe('not-positive');
  });
});
