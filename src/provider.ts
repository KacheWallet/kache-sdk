/** Events the wallet pushes to connected sites. */
export type KacheEvent = 'disconnect' | 'accountsChanged';

/** Event subscriber. `accountsChanged` is called with the new address or null. */
export type KacheListener = (...args: unknown[]) => void;

// `KacheEvent | (string & {})` keeps the literal autocomplete while still
// accepting any future event name (a bare union with `string` would discard it).
type EventName = KacheEvent | (string & {});

/**
 * The `window.kache` provider the Kache extension injects, plus a ready-handshake
 * so dApps never race the injection.
 */
export interface KacheProvider {
  readonly isKache: boolean;
  /** Request connection — opens a Kache approval popup. Resolves with the account. */
  connect(): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  /** Active account if connected + the wallet has been unlocked at least once, else null. */
  getAccount(): Promise<string | null>;
  /** Confirmed balance of the active account, in sompi (string). */
  getBalance(): Promise<string>;
  /** Sign an arbitrary message (KIP-0005). Opens an approval popup. */
  signMessage(message: string): Promise<string>;
  /** Request a KAS transfer (opens an approval popup). Resolves with the txid. */
  sendKaspa(to: string, amountSompi: string | bigint): Promise<{ txid: string }>;
  on(event: EventName, cb: KacheListener): void;
  off(event: EventName, cb: KacheListener): void;
}

declare global {
  interface Window {
    kache?: KacheProvider;
  }
}

/** True if the Kache extension has injected its provider on this page. */
export function isInstalled(): boolean {
  return typeof window !== 'undefined' && Boolean(window.kache?.isKache);
}

/**
 * Resolve `window.kache`, waiting for the extension to inject it (the provider
 * fires a `kache#initialized` event at document_start). Rejects after `timeoutMs`
 * if the wallet isn't found.
 */
export function getProvider(timeoutMs = 3000): Promise<KacheProvider> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Kache SDK can only run in a browser.'));
  }
  if (window.kache) return Promise.resolve(window.kache);

  return new Promise<KacheProvider>((resolve, reject) => {
    const onReady = () => {
      if (!window.kache) return;
      cleanup();
      resolve(window.kache);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Kache wallet not found — is the extension installed and enabled?'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('kache#initialized', onReady);
    };
    window.addEventListener('kache#initialized', onReady);
    onReady(); // in case it injected between the check above and the listener
  });
}
