# @kache/sdk

A tiny TypeScript library for integrating the **Kache** Kaspa wallet into web
apps. It wraps the `window.kache` provider the Kache browser extension injects —
connect, read the active account/balance, sign messages, and request KAS
transfers.

> Its own git repo (gitignored by the extension). MIT licensed.

## Install

```bash
npm install @kache/sdk
```

## Quick start

```ts
import { connect, getAccount, getBalance, signMessage, sendKaspa, kasToSompi } from '@kache/sdk';

// Opens the Kache approval popup; resolves once the user approves.
const { address } = await connect();

const account = await getAccount();          // 'kaspa:…' (or null if not connected)
const balance = await getBalance();          // bigint sompi as a string

const sig = await signMessage('Login to Acme #42');

const { txid } = await sendKaspa(address, kasToSompi('1.5')); // 1.5 KAS
```

The top-level helpers **wait for the extension to inject** (`kache#initialized`),
so you can call `connect()` on page load without racing the injection.

## Detect / wait explicitly

```ts
import { isInstalled, getProvider } from '@kache/sdk';

if (!isInstalled()) {
  // prompt the user to install Kache
}

const kache = await getProvider(5000); // wait up to 5s for injection
await kache.connect();
```

## API

| Function | Description |
|---|---|
| `connect()` | Request connection. Opens an approval popup. → `{ address }` |
| `disconnect()` | Forget this site's connection. |
| `getAccount()` | Active `kaspa:` address if connected, else `null`. No popup. |
| `getBalance()` | Confirmed balance in **sompi** (string). No popup. |
| `signMessage(msg)` | Sign a message (KIP-0005). Opens an approval popup. → hex |
| `sendKaspa(to, amountSompi)` | Request a KAS transfer. Opens an approval popup. → `{ txid }` |
| `getProvider(timeoutMs?)` | The raw `window.kache` provider once injected. |
| `isInstalled()` | `true` if Kache injected its provider. |
| `kasToSompi(kas)` / `sompiToKas(sompi)` | Unit helpers (1 KAS = 100,000,000 sompi). |

### Events

```ts
import { getProvider } from '@kache/sdk';
const kache = await getProvider();
kache.on('disconnect', () => { /* user disconnected */ });
kache.on('accountsChanged', () => { /* re-read getAccount() */ });
```

## Notes
- Amounts are in **sompi** (`bigint`/string). Use `kasToSompi` to convert.
- `kasToSompi` **throws** on more than 8 decimal places — it never silently
  truncates a send amount. Prefer passing a **string** for user-entered amounts
  (a JS `number` can't represent every 8-dp value exactly).
- The wallet never exposes keys — you only ever get an address, a signature, or a
  txid. Every signature/transfer requires explicit user approval in Kache.

## Security

This SDK is a thin client over the `window.kache` provider the extension injects:

- **An address from `connect()`/`getAccount()` is not proof of identity.** Like
  every injected wallet provider, if the real Kache extension isn't installed a
  page could expose a look-alike `window.kache`. When the extension *is* installed
  it defines `window.kache` as non-writable at `document_start`, so it can't be
  overridden — but for authentication, always **verify a `signMessage` signature
  server-side** against the claimed address; don't trust the address alone.
- **Treat every result as untrusted until verified** (e.g. confirm a `txid`
  on-chain before crediting anything).
- The SDK has **no runtime dependencies** and never sees your keys; all signing
  and sending happens inside the extension behind an explicit approval prompt.

## License
MIT
