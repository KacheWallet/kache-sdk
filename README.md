<div align="center">

# @kache/sdk

**The dApp connector for the [Kache](https://github.com/KacheWallet) wallet — Kaspa L1 + the Kasplex / Igra L2s.**

A tiny, typed wrapper over the providers the Kache browser extension injects: `window.kache` for Kaspa L1 (connect, read account/balance, sign messages, send KAS) and a standard EIP-1193 `window.ethereum` for the Kasplex and Igra EVM L2s.

[![npm version](https://img.shields.io/npm/v/@kache/sdk.svg?color=%2349C5B1)](https://www.npmjs.com/package/@kache/sdk)
[![license](https://img.shields.io/npm/l/@kache/sdk.svg?color=%2349C5B1)](./LICENSE)
[![types](https://img.shields.io/npm/types/@kache/sdk.svg?color=%2349C5B1)](https://www.typescriptlang.org/)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-49C5B1.svg)](./package.json)

</div>

---

## Why

- **Zero runtime dependencies** — a thin, auditable client over the injected provider.
- **Fully typed** — first-class TypeScript with autocomplete for every call and event.
- **No injection races** — top-level helpers wait for the extension to load, so `connect()` works on page load.
- **Keys never leave the wallet** — you only ever receive an address, a signature, or a txid, each behind an explicit in-wallet approval.

## Install

```bash
npm install @kache/sdk
```

```bash
pnpm add @kache/sdk
```

```bash
yarn add @kache/sdk
```

## Quick start

```ts
import {
  connect,
  getAccount,
  getBalance,
  signMessage,
  sendKaspa,
  kasToSompi,
} from '@kache/sdk';

// Opens the Kache approval popup; resolves once the user approves.
const { address } = await connect();

const account = await getAccount();          // 'kaspa:…' (or null if not connected)
const balance = await getBalance();          // confirmed balance in sompi, as a string

const signature = await signMessage('Login to Acme #42');

const { txid } = await sendKaspa(address, kasToSompi('1.5')); // 1.5 KAS
```

Every top-level helper **waits for the extension to inject** its provider (via the
`kache#initialized` event), so you can call `connect()` on page load without racing
the injection.

## Detecting the wallet

Prompt users to install Kache when it isn't present, or wait explicitly for injection:

```ts
import { isInstalled, getProvider } from '@kache/sdk';

if (!isInstalled()) {
  // Direct the user to install the Kache extension.
}

const kache = await getProvider(5000); // wait up to 5s (default: 3000ms)
await kache.connect();
```

## API

| Function | Description |
| --- | --- |
| `connect()` | Request a connection. Opens an approval popup. → `{ address }` |
| `disconnect()` | Forget this site's connection. |
| `getAccount()` | Active `kaspa:` address if connected, else `null`. No popup. |
| `getBalance()` | Confirmed balance in **sompi** (string). No popup. |
| `signMessage(msg)` | Sign a message (KIP-0005). Opens an approval popup. → hex signature |
| `sendKaspa(to, amountSompi)` | Request a KAS transfer. Opens an approval popup. → `{ txid }` |
| `on(event, cb)` / `off(event, cb)` | Subscribe / unsubscribe to wallet events. |
| `getProvider(timeoutMs?)` | Resolve the raw `window.kache` provider once injected (default timeout: 3000ms). |
| `isInstalled()` | `true` if Kache has injected its provider. |
| `kasToSompi(kas)` / `sompiToKas(sompi)` | Unit helpers (`1 KAS = 100,000,000 sompi`). |

## Events

The wallet pushes `disconnect` and `accountsChanged` events to connected sites:

```ts
import { getProvider } from '@kache/sdk';

const kache = await getProvider();

kache.on('disconnect', () => {
  // The user disconnected this site.
});

kache.on('accountsChanged', () => {
  // Re-read getAccount() — the active address changed.
});
```

> **Tip:** the top-level `on()`/`off()` helpers `await` the provider, so an event
> fired in that gap could be missed. To catch events from the very first tick (and
> to unsubscribe synchronously), grab the provider once with `getProvider()` and
> subscribe on it directly, as shown above.

## EVM L2 (Kasplex / Igra)

On the Kaspa L2s, Kache injects a standard **EIP-1193** `window.ethereum` provider
and announces it via **EIP-6963**. You can hand it straight to viem/wagmi/ethers,
or use the thin helpers below. Discovery targets Kache specifically (by its
`com.kache.wallet` rdns), so it never grabs another wallet's `window.ethereum`.

```ts
import { connectEvm, getChainId, switchChain, KASPLEX_MAINNET, IGRA_MAINNET } from '@kache/sdk';

const [account] = await connectEvm();          // eth_requestAccounts → 0x… address
const chainId = await getChainId();             // e.g. 202555 (Kasplex)
await switchChain(IGRA_MAINNET.id);             // hop to Igra
```

Or drive it with any EIP-1193 library:

```ts
import { getEthereumProvider } from '@kache/sdk';
import { createWalletClient, custom } from 'viem';

const provider = await getEthereumProvider();   // Kache's window.ethereum, once injected
const client = createWalletClient({ transport: custom(provider) });
```

| Function | Description |
| --- | --- |
| `connectEvm()` | Request L2 connection. Opens an approval popup. → `string[]` of 0x accounts |
| `getEvmAccounts()` | Authorized 0x accounts (empty if not connected). No popup. |
| `getChainId()` | Active L2 chain id as a decimal number. |
| `switchChain(id)` | Switch the active L2 (Kasplex ↔ Igra). |
| `personalSign(msg, addr)` | `personal_sign` with the active account. Opens a popup. → signature |
| `sendEvmTransaction(tx)` | `eth_sendTransaction`. Opens a popup. → tx hash |
| `getEthereumProvider(timeoutMs?)` | Kache's raw EIP-1193 provider once injected (default 3000ms). |
| `isEvmInstalled()` | `true` if Kache injected its EVM provider. |
| `getChain(id)` | Look up a supported chain by decimal or hex id. |

Chain constants — `KASPLEX_MAINNET`, `IGRA_MAINNET`, `KASPLEX_TESTNET`,
`IGRA_TESTNET` (and `KACHE_EVM_CHAINS`) — carry each network's `id`, `hexId`,
`rpcUrl`, `explorerUrl`, and native currency, so you don't hardcode them.

Subscribe to EIP-1193 events on the provider directly:

```ts
const provider = await getEthereumProvider();
provider.on('accountsChanged', (accts) => { /* string[] — empty when disconnected */ });
provider.on('chainChanged', (chainId) => { /* hex string, e.g. '0x3173b' */ });
```

## Working with amounts

Amounts are denominated in **sompi** — the atomic unit of Kaspa, where
`1 KAS = 100,000,000 sompi` — and passed as a `string` or `bigint`.

```ts
import { kasToSompi, sompiToKas } from '@kache/sdk';

kasToSompi('1.5');   // → '150000000'
sompiToKas('150000000'); // → '1.5'
```

- `kasToSompi` **throws** on more than 8 decimal places — it never silently
  truncates a send amount.
- Prefer passing a **string** for user-entered amounts. A JavaScript `number`
  can't represent every 8-decimal value exactly.

## Security

This SDK is a thin client over the `window.kache` provider the extension injects.
Treat the network boundary accordingly:

- **An address is not proof of identity.** As with every injected wallet provider,
  a page could expose a look-alike `window.kache` if the real extension isn't
  installed. When Kache *is* installed it defines `window.kache` as non-writable at
  `document_start`, so it can't be overridden — but for authentication, always
  **verify a `signMessage` signature server-side** against the claimed address.
  Never trust the address alone.
- **Treat every result as untrusted until verified** — e.g. confirm a `txid`
  on-chain before crediting anything.
- **The wallet never exposes keys.** All signing and sending happens inside the
  extension, behind an explicit user-approval prompt. The SDK has no runtime
  dependencies and never sees your secrets.

## License

[MIT](./LICENSE) © Kache
