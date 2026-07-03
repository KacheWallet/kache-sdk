/** KAS unit helpers. 1 KAS = 100,000,000 sompi. */
export const SOMPI_PER_KAS = 100_000_000n;

/**
 * Convert a KAS amount (string or number) to sompi (bigint), exact to 8 dp.
 * Prefer a string for user-entered amounts — a JS number can't represent every
 * 8-dp value exactly. Throws (never silently truncates) on >8 decimal places.
 */
export function kasToSompi(kas: string | number): bigint {
  const s = typeof kas === 'number' ? kas.toString() : kas.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid KAS amount: ${kas}`);
  const [whole, frac = ''] = s.split('.');
  if (frac.length > 8) throw new Error(`Invalid KAS amount: more than 8 decimal places (${kas})`);
  const fracPadded = (frac + '00000000').slice(0, 8);
  return BigInt(whole) * SOMPI_PER_KAS + BigInt(fracPadded);
}

/** Convert sompi (bigint/string) to a KAS string, trimming trailing zeros. */
export function sompiToKas(sompi: bigint | string): string {
  const v = typeof sompi === 'string' ? BigInt(sompi) : sompi;
  const neg = v < 0n;
  const a = neg ? -v : v;
  const frac = (a % SOMPI_PER_KAS).toString().padStart(8, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${a / SOMPI_PER_KAS}${frac ? `.${frac}` : ''}`;
}
