import { describe, it, expect } from 'vitest';
import {
  KACHE_EVM_CHAINS,
  KASPLEX_MAINNET,
  IGRA_MAINNET,
  KASPLEX_TESTNET,
  IGRA_TESTNET,
  getChain,
  isEvmInstalled,
} from './evm';

describe('chain constants', () => {
  it('carry the authoritative Kaspa L2 chain ids', () => {
    expect(KASPLEX_MAINNET.id).toBe(202_555);
    expect(IGRA_MAINNET.id).toBe(38_833);
    expect(KASPLEX_TESTNET.id).toBe(167_012);
    expect(IGRA_TESTNET.id).toBe(38_836);
  });

  it('derive hexId consistently from the decimal id', () => {
    for (const c of KACHE_EVM_CHAINS) {
      expect(c.hexId).toBe(`0x${c.id.toString(16)}`);
      expect(parseInt(c.hexId, 16)).toBe(c.id);
    }
    // Guard the known-correct hex (the extension's initial placeholder was wrong).
    expect(KASPLEX_MAINNET.hexId).toBe('0x3173b');
    expect(IGRA_MAINNET.hexId).toBe('0x97b1');
  });

  it('all use 18-decimal native currencies', () => {
    for (const c of KACHE_EVM_CHAINS) expect(c.nativeCurrency.decimals).toBe(18);
  });
});

describe('getChain', () => {
  it('looks up by decimal id', () => {
    expect(getChain(202_555)).toBe(KASPLEX_MAINNET);
    expect(getChain(38_833)).toBe(IGRA_MAINNET);
  });

  it('looks up by hex chain id', () => {
    expect(getChain('0x3173b')).toBe(KASPLEX_MAINNET);
    expect(getChain('0x97B1')).toBe(IGRA_MAINNET); // case-insensitive
  });

  it('returns undefined for unsupported chains', () => {
    expect(getChain(1)).toBeUndefined();
    expect(getChain('0x1')).toBeUndefined();
  });
});

describe('isEvmInstalled', () => {
  it('is false with no window.ethereum', () => {
    expect(isEvmInstalled()).toBe(false);
  });
});
