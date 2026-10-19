import { cspMetaTag, insertAtDocumentStart } from './html-injection';

describe('insertAtDocumentStart', () => {
  it('keeps the doctype first so the page stays in standards mode', () => {
    expect(insertAtDocumentStart('<!DOCTYPE html>\n<html>', '<X>')).toBe(
      '<!DOCTYPE html><X>\n<html>',
    );
  });

  it('skips leading whitespace and comments before the doctype', () => {
    expect(insertAtDocumentStart('  <!-- c --><!doctype html><p>', '<X>')).toBe(
      '  <!-- c --><!doctype html><X><p>',
    );
  });

  it('prepends when there is no doctype', () => {
    expect(insertAtDocumentStart('<p>hi</p>', '<X>')).toBe('<X><p>hi</p>');
  });
});

describe('cspMetaTag', () => {
  it('escapes the policy into an attribute', () => {
    expect(cspMetaTag(`script-src 'none' "x"`)).toBe(
      `<meta http-equiv="Content-Security-Policy" content="script-src 'none' &quot;x&quot;">`,
    );
  });
});
