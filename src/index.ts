/**
 * @kache/sdk — dApp connector for the Kache Kaspa wallet.
 *
 * Top-level helpers wait for the provider (`getProvider`) and forward to it, so a
 * dApp can call `connect()` on page load without racing the extension injection.
 * For finer control, use `getProvider()` directly.
 */
import { getProvider } from './provider';

export { getProvider, isInstalled, type KacheProvider, type KacheEvent, type KacheListener } from './provider';
export { kasToSompi, sompiToKas, SOMPI_PER_KAS } from './units';

export async function connect(): Promise<{ address: string }> {
  return (await getProvider()).connect();
}
export async function disconnect(): Promise<void> {
  return (await getProvider()).disconnect();
}
export async function getAccount(): Promise<string | null> {
  return (await getProvider()).getAccount();
}
export async function getBalance(): Promise<string> {
  return (await getProvider()).getBalance();
}
export async function signMessage(message: string): Promise<string> {
  return (await getProvider()).signMessage(message);
}
export async function sendKaspa(to: string, amountSompi: string | bigint): Promise<{ txid: string }> {
  return (await getProvider()).sendKaspa(to, amountSompi);
}
/**
 * Subscribe to a wallet event. NOTE: these helpers `await` the provider, so an
 * event fired in that gap could be missed. To catch events from the very first
 * tick (and to unsubscribe synchronously), grab the provider once instead:
 *   `const kache = await getProvider(); kache.on('accountsChanged', cb);`
 */
export async function on(event: string, cb: (...args: unknown[]) => void): Promise<void> {
  (await getProvider()).on(event, cb);
}
export async function off(event: string, cb: (...args: unknown[]) => void): Promise<void> {
  (await getProvider()).off(event, cb);
}
