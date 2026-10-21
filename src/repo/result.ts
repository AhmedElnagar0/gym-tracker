// What every repo write returns: a value, or a message for the user (plus optional
// per-field messages for forms). Writes never throw for expected problems.

export type FieldErrors = Partial<Record<string, string>>;
export type Failure<F extends FieldErrors = FieldErrors> = { ok: false; error: string; fields?: F };
export type Result<T = void, F extends FieldErrors = FieldErrors> = { ok: true; value: T } | Failure<F>;

export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value });
export const done = (): { ok: true; value: void } => ({ ok: true, value: undefined });
export const fail = <F extends FieldErrors = FieldErrors>(error: string, fields?: F): Failure<F> => ({
  ok: false,
  error,
  fields,
});
