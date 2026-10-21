import { applyKey, type KeypadKey, keypadNumber, keypadText, REPS_RULES, WEIGHT_RULES } from './keypad';

// Presses keys one after another, starting from `start`.
const type = (keys: KeypadKey[], rules = WEIGHT_RULES, start = '') =>
  keys.reduce((value, key) => applyKey(value, key, rules), start);

describe('applyKey (weight)', () => {
  it('types an ordinary weight', () => {
    expect(type(['6', '2', '.', '5'])).toBe('62.5');
  });

  it('allows one decimal point only', () => {
    expect(type(['6', '0', '.', '.', '5', '.'])).toBe('60.5');
  });

  it('starts "." as "0."', () => {
    expect(type(['.', '5'])).toBe('0.5');
  });

  it('allows up to two decimals (e.g. 1.25 kg plates)', () => {
    expect(type(['1', '.', '2', '5', '9'])).toBe('1.25');
  });

  it('drops a leading zero', () => {
    expect(type(['0', '0', '5'])).toBe('5');
  });

  it('allows at most four digits before the point', () => {
    expect(type(['1', '2', '3', '4', '5'])).toBe('1234');
  });

  it('backspace removes the last character; clear empties it', () => {
    expect(type(['6', '2', '.', '5', 'backspace'])).toBe('62.');
    expect(type(['6', '2', 'backspace', 'backspace', 'backspace'])).toBe('');
    expect(type(['6', '2', 'clear'])).toBe('');
  });
});

describe('applyKey (reps)', () => {
  it('ignores the decimal point', () => {
    expect(type(['8', '.', '5'], REPS_RULES)).toBe('85');
  });

  it('allows at most three digits', () => {
    expect(type(['1', '0', '0', '0'], REPS_RULES)).toBe('100');
  });
});

describe('keypadNumber / keypadText', () => {
  it('parses typed text, treating empty and "." as no value', () => {
    expect(keypadNumber('62.5')).toBe(62.5);
    expect(keypadNumber('62.')).toBe(62);
    expect(keypadNumber('0')).toBe(0);
    expect(keypadNumber('')).toBeNull();
    expect(keypadNumber('.')).toBeNull();
  });

  it('turns stored numbers back into editable text without float noise', () => {
    expect(keypadText(60)).toBe('60');
    expect(keypadText(62.5)).toBe('62.5');
    expect(keypadText(0.1 + 0.2)).toBe('0.3');
    expect(keypadText(null)).toBe('');
  });
});
