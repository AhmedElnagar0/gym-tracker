// All timestamps in the database are unix SECONDS (integers).
// JavaScript's Date.now() returns MILLISECONDS — always convert through these helpers.

export function nowUnix(): number {
  return toUnix(new Date());
}

export function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function fromUnix(seconds: number): Date {
  return new Date(seconds * 1000);
}
