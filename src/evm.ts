/**
 * EVM (Kasplex / Igra L2) connector for `@kache/sdk`.
 *
 * The Kache extension injects a standard EIP-1193 `window.ethereum` provider for
 * the Kaspa L2s and announces it via EIP-6963. These helpers discover *Kache
 * specifically* (by its `com.kache.wallet` rdns) rather than grabbing whatever
 * `window.ethereum` happens to be, wait out the injection race, and forward
 * requests to it. The wallet never exposes keys — every signature/transaction
 * requires explicit user approval in Kache.
 */

/** EIP-6963 rdns the Kache extension announces its EVM provider under. */
export const KACHE_RDNS = 'com.kache.wallet';

/** Minimal EIP-1193 provider surface Kache injects as `window.ethereum`. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
  /** Set to `true` on the provider Kache injects. */
  readonly isKache?: boolean;
}

/** A Kaspa L2 network Kache supports over EVM. */
export interface KacheEvmChain {
  /** Decimal chain id (e.g. 202555). */
  id: number;
  /** Hex chain id for `eth_chainId` / `wallet_switchEthereumChain` (e.g. "0x3173b"). */
  hexId: string;
  name: string;
  network: 'mainnet' | 'testnet';
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  explorerUrl: string;
}

const toHex = (id: number): string => `0x${id.toString(16)}`;

export const KASPLEX_MAINNET: KacheEvmChain = {
  id: 202_555,
  hexId: toHex(202_555),
  name: 'Kasplex',
  network: 'mainnet',
  nativeCurrency: { name: 'Wrapped Kaspa', symbol: 'wKAS', decimals: 18 },
  rpcUrl: 'https://evmrpc.kasplex.org',
  explorerUrl: 'https://explorer.kasplex.org',
};

export const IGRA_MAINNET: KacheEvmChain = {
  id: 38_833,
  hexId: toHex(38_833),
  name: 'Igra',
  network: 'mainnet',
  nativeCurrency: { name: 'Igra KAS', symbol: 'iKAS', decimals: 18 },
  rpcUrl: 'https://rpc.igralabs.com:8545',
  explorerUrl: 'https://explorer.igralabs.com',
};

export const KASPLEX_TESTNET: KacheEvmChain = {
  id: 167_012,
  hexId: toHex(167_012),
  name: 'Kasplex Testnet',
  network: 'testnet',
  nativeCurrency: { name: 'Wrapped Kaspa', symbol: 'wKAS', decimals: 18 },
  rpcUrl: 'https://rpc.kasplextest.xyz',
  explorerUrl: 'https://explorer.testnet.kasplextest.xyz',
};

export const IGRA_TESTNET: KacheEvmChain = {
  id: 38_836,
  hexId: toHex(38_836),
  name: 'Igra Testnet',
  network: 'testnet',
  nativeCurrency: { name: 'Igra KAS', symbol: 'iKAS', decimals: 18 },
  rpcUrl: 'https://galleon-testnet.igralabs.com:8545',
  explorerUrl: 'https://explorer.galleon-testnet.igralabs.com',
};

/** Every Kaspa L2 chain Kache supports over EVM. */
export const KACHE_EVM_CHAINS: readonly KacheEvmChain[] = [
  KASPLEX_MAINNET,
  IGRA_MAINNET,
  KASPLEX_TESTNET,
  IGRA_TESTNET,
];

/** Look up a supported chain by decimal id or hex chain id. */
export function getChain(chainId: number | string): KacheEvmChain | undefined {
  const id = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
  return KACHE_EVM_CHAINS.find((c) => c.id === id);
}

interface Eip6963Detail {
  info?: { rdns?: string };
  provider?: Eip1193Provider;
}
interface EthereumWindow {
  ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] };
}

/** Find an already-injected Kache EVM provider, if present. */
function findInjected(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as unknown as EthereumWindow).ethereum;
  if (!eth) return null;
  if (eth.isKache) return eth;
  // Coexisting wallets (e.g. MetaMask) may occupy `window.ethereum`; Kache also
  // publishes itself into the `providers` array.
  if (Array.isArray(eth.providers)) {
    const kache = eth.providers.find((p) => p?.isKache);
    if (kache) return kache;
  }
  return null;
}

/** True if Kache has injected its EVM (`window.ethereum`) provider on this page. */
export function isEvmInstalled(): boolean {
  return findInjected() !== null;
}

/**
 * Resolve Kache's EIP-1193 provider, waiting for injection (the extension
 * announces via EIP-6963 and fires `kache#initialized` at document_start).
 * Prefers EIP-6963 discovery by rdns so it never returns another wallet's
 * provider. Rejects after `timeoutMs` if Kache isn't found.
 */
export function getEthereumProvider(timeoutMs = 3000): Promise<Eip1193Provider> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Kache SDK can only run in a browser.'));
  }
  const immediate = findInjected();
  if (immediate) return Promise.resolve(immediate);

  return new Promise<Eip1193Provider>((resolve, reject) => {
    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent<Eip6963Detail>).detail;
      if (detail?.info?.rdns === KACHE_RDNS && detail.provider) {
        cleanup();
        resolve(detail.provider);
      }
    };
    const onReady = () => {
      const p = findInjected();
      if (p) {
        cleanup();
        resolve(p);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      const p = findInjected();
      if (p) resolve(p);
      else reject(new Error('Kache wallet not found — is the extension installed and enabled?'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      window.removeEventListener('kache#initialized', onReady);
    };
    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.addEventListener('kache#initialized', onReady);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    onReady(); // in case it injected between the check above and the listeners
  });
}

/** Request connection to the L2 (opens a Kache approval popup). → connected 0x addresses. */
export async function connectEvm(): Promise<string[]> {
  const p = await getEthereumProvider();
  return (await p.request({ method: 'eth_requestAccounts' })) as string[];
}

/** Currently-authorized 0x accounts (empty if not connected). No popup. */
export async function getEvmAccounts(): Promise<string[]> {
  const p = await getEthereumProvider();
  return (await p.request({ method: 'eth_accounts' })) as string[];
}

/** Active L2 chain id as a decimal number (e.g. 202555). */
export async function getChainId(): Promise<number> {
  const p = await getEthereumProvider();
  const hex = (await p.request({ method: 'eth_chainId' })) as string;
  return parseInt(hex, 16);
}

/** Ask Kache to switch the active L2 (Kasplex ↔ Igra). Rejects on unsupported chains. */
export async function switchChain(chainId: number): Promise<void> {
  const p = await getEthereumProvider();
  await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: toHex(chainId) }] });
}

/** Sign a message with the active account (`personal_sign`). Opens an approval popup. → signature hex. */
export async function personalSign(message: string, address: string): Promise<string> {
  const p = await getEthereumProvider();
  return (await p.request({ method: 'personal_sign', params: [message, address] })) as string;
}

/** A transaction request for {@link sendEvmTransaction}. All numeric fields are hex-quantity strings. */
export interface EvmTransactionRequest {
  from?: string;
  to?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
}

/** Build, sign, and broadcast an L2 transaction (`eth_sendTransaction`). Opens an approval popup. → tx hash. */
export async function sendEvmTransaction(tx: EvmTransactionRequest): Promise<string> {
  const p = await getEthereumProvider();
  return (await p.request({ method: 'eth_sendTransaction', params: [tx] })) as string;
}
