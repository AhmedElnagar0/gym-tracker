// The on-screen number pad's rules. The value is kept as the string being typed
// ("62.", "1.25") and only turned into a number when saving.

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace' | 'clear';

export type KeypadRules = {
  /** Digits allowed before the decimal point. */
  maxIntegerDigits: number;
  /** Digits allowed after it; 0 means whole numbers only (no "." key). */
  maxDecimals: number;
};

export const WEIGHT_RULES: KeypadRules = { maxIntegerDigits: 4, maxDecimals: 2 }; // up to 9999.99
export const REPS_RULES: KeypadRules = { maxIntegerDigits: 3, maxDecimals: 0 }; // up to 999

/** Returns the new text after pressing `key`. Keys that would make it invalid are ignored. */
export function applyKey(value: string, key: KeypadKey, rules: KeypadRules): string {
  if (key === 'clear') return '';
  if (key === 'backspace') return value.slice(0, -1);

  const [integerPart, decimalPart] = value.split('.');
  const hasPoint = value.includes('.');

  if (key === '.') {
    if (rules.maxDecimals === 0 || hasPoint) return value;
    return value === '' ? '0.' : `${value}.`;
  }

  // A digit.
  if (hasPoint) {
    return decimalPart.length >= rules.maxDecimals ? value : value + key;
  }
  if (integerPart === '0') return key; // no leading zeros: "0" then "5" → "5"
  if (integerPart.length >= rules.maxIntegerDigits) return value;
  return value + key;
}

/** The typed text as a number, or null if empty or just ".". "62." → 62. */
export function keypadNumber(value: string): number | null {
  if (value === '' || value === '.') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** A stored number back as editable keypad text: 62.5 → "62.5", 60 → "60". */
export function keypadText(n: number | null): string {
  if (n === null) return '';
  return String(Math.round(n * 100) / 100);
}
