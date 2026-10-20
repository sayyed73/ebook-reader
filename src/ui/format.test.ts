import { describeSourceFolder } from './format';

describe('describeSourceFolder', () => {
  it.each([
    ['/Users/me/Downloads/guide.html', 'Downloads'],
    ['C:\\Users\\me\\Desktop\\guide.html', 'Desktop'],
    ['/guide.html', null],
    ['content://downloads/document/msf%3A12', null],
    [null, null],
  ])('%s → %s', (location, folder) => {
    expect(describeSourceFolder(location)).toBe(folder);
  });
});
