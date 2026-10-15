# BitKosh — Bitcoin testnet wallet prototype

BitKosh is a browser-based React/Vite prototype for experimenting with Bitcoin testnet wallet flows. It is **not ready for real funds or mainnet deployment**. Transaction signing and broadcasting, SMS verification, native biometric authentication, UPI/AutoPay, multisig coordination, and inheritance execution are not implemented. Those actions fail closed instead of creating fake payments or transaction records.

## Requirements

- Node.js 20 or newer
- npm (canonical package manager with committed package-lock.json)
- A modern browser with Web Crypto support

## Run locally

```sh
npm ci
npm run dev
```

The Vite development server listens on port `3000`. The dependency tree is locked via `package-lock.json`. Use `npm ci` for reproducible CI/deployment. For verification and production builds, run:

```sh
npm run typecheck
npm test
npm run build
```

Only use this app with Bitcoin **testnet** data. The app currently uses Blockstream's testnet API for read-only address-balance and UTXO sync. Do not infer that an address has spendable funds merely because a UI view contains a balance; only verified network data is authoritative.

## Security status

Read [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) before testing or deploying. This application has no backend service or device-keystore integration. The browser's local storage is not a secure vault against same-origin script compromise, and a six-digit PIN is not strong enough to protect a copied encrypted wallet against offline guessing. Passing local tests alone would not establish production readiness.

## Environment variables

No client-side environment variables are required. Never expose signing keys, provider secrets, or API credentials through `VITE_*` variables; they are bundled for browser access.
