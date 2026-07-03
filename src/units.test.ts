import { describe, it, expect } from 'vitest';
import { kasToSompi, sompiToKas, SOMPI_PER_KAS } from './units';

describe('kasToSompi', () => {
  it('converts whole + fractional KAS exactly', () => {
    expect(kasToSompi('1')).toBe(100_000_000n);
    expect(kasToSompi('1.5')).toBe(150_000_000n);
    expect(kasToSompi('0.00000001')).toBe(1n); // one sompi
    expect(kasToSompi('0')).toBe(0n);
  });

  it('accepts numbers (with the float caveat)', () => {
    expect(kasToSompi(2)).toBe(200_000_000n);
    expect(kasToSompi(0.25)).toBe(25_000_000n);
  });

  it('pads short fractions, not over-counts', () => {
    expect(kasToSompi('1.1')).toBe(110_000_000n);
    expect(kasToSompi('1.0000001')).toBe(100_000_010n);
  });

  it('throws on >8 decimal places (never silently truncates a send amount)', () => {
    expect(() => kasToSompi('0.123456789')).toThrow(/8 decimal/);
  });

  it('rejects malformed input', () => {
    for (const bad of ['', '-1', '1.2.3', 'abc', '1e3', '.5', ' ']) {
      expect(() => kasToSompi(bad)).toThrow(/Invalid KAS amount/);
    }
  });
});

describe('sompiToKas', () => {
  it('formats and trims trailing zeros', () => {
    expect(sompiToKas(100_000_000n)).toBe('1');
    expect(sompiToKas(150_000_000n)).toBe('1.5');
    expect(sompiToKas(1n)).toBe('0.00000001');
    expect(sompiToKas(0n)).toBe('0');
  });

  it('accepts a string and handles negatives', () => {
    expect(sompiToKas('250000000')).toBe('2.5');
    expect(sompiToKas(-150_000_000n)).toBe('-1.5');
  });
});

describe('round-trip', () => {
  it('kas → sompi → kas is stable', () => {
    for (const kas of ['0', '1', '1.5', '0.00000001', '123456.78901234']) {
      expect(sompiToKas(kasToSompi(kas))).toBe(kas);
    }
  });

  it('SOMPI_PER_KAS is 1e8', () => {
    expect(SOMPI_PER_KAS).toBe(100_000_000n);
  });
});
