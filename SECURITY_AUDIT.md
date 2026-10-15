# BitKosh — Security and Engineering Audit

**Audit date:** 2026-10-15  
**Scope:** supplied source archive, React/Vite frontend, wallet/key helpers, local persistence, transaction and payment flows, tax export, dependency manifest, metadata, and existing UI actions.  
**Release decision:** **NO-GO for mainnet, real funds, or production financial use.** This change set is a safer testnet prototype baseline, not a production certification.

## Executive summary

The supplied project is a browser-only React/Vite app. It has no backend API, no secure server-side integration layer, no native key store, no Bitcoin node, and no implemented transaction-signing workflow. Several screens looked like working payments, biometrics, multisig, inheritance automation, or tax tooling despite relying on local simulation or fabricated data. Those claims created a risk of users treating local UI state as real financial/security outcomes.

The critical fake wallet primitives were replaced with maintained Bitcoin libraries for BIP-39, BIP-32/secp256k1 public-key derivation, native SegWit testnet addresses, and P2WSH multisig script/address construction. A private-key extraction helper remains out of scope until a complete transaction-signing flow exists. The app now creates an empty testnet wallet, fetches read-only address balance/UTXO data from Blockstream's testnet REST API, rejects invalid returned shapes, removes prior demo balances and fake histories on migration, and blocks money/security actions that do not have their actual integration. Recovery phrase encryption is authenticated AES-GCM with a PBKDF2-SHA-256 key derivation at 600,000 iterations; old local ciphertext remains readable for migration after successful PIN verification.

**Do not interpret the new cryptographic primitives or passing local tests as proof that a wallet is safe for funds.** Build, type-check, and tests could not be executed because dependencies could not be installed in this environment. The TypeScript/TSX sources were parsed statically without syntax diagnostics; that is not equivalent to a full compile/test run.

## Findings addressed in this change set

### Critical — fake wallet cryptography

**Before:** the recovery phrase was assembled by selecting words from a local list without the BIP-39 checksum; the supposed public key/address were not valid derived Bitcoin key material. This could produce an unusable or incorrect wallet and falsely imply standards compliance.

**Change:** `src/lib/crypto.ts` now delegates mnemonic generation/validation to `@scure/bip39`, HD derivation to `@scure/bip32`, and script/address construction to `@scure/btc-signer`. It derives BIP-84 `m/84'/1'/0'/0/0` addresses on Bitcoin testnet and validates P2WSH signer count, compressed public-key encoding, duplicate keys, BIP-67 lexicographic sorting, and threshold consistency.

### Critical — fake send/broadcast success

**Before:** send flows changed the local balance, generated random-looking transaction IDs, and recorded successful/confirmed outcomes without creating, signing, or broadcasting a Bitcoin transaction.

**Change:** the send path no longer alters balances or writes a transaction record. It explicitly reports that transaction construction, fee quoting, signing, broadcast, and network reconciliation are unavailable. The unused raw-transaction broadcast helper was removed so there is no exposed broadcast path without a valid signing/reconciliation caller.

### Critical — fabricated starting funds and activity

**Before:** onboarding seeded a balance, fake UTXOs, and a welcome transaction; the faucet control credited local funds.

**Change:** new wallets start with zero balance and no UTXOs/transactions. The faucet control no longer credits anything. Legacy demo wallet/transaction/payment/vault/inheritance data is cleared once when the v3 storage migration runs. The app retains the old encrypted profile, but the old pseudo-derived wallet state is discarded because it was not a valid Bitcoin wallet representation.

### High — weak recovery phrase encryption and secret caching

**Before:** the secret could be cached in `sessionStorage` and legacy PIN checking/encryption was weaker and misleadingly presented as hardware-secure.

**Change:** legacy session PIN/phrase keys are removed during migration; recovery phrase encryption uses AES-GCM and a PBKDF2-SHA-256-derived key at 600,000 iterations, with a random 96-bit IV and versioned ciphertext. The decrypted phrase is checked for BIP-39 validity. Recovery words in the account tab auto-hide after 30 seconds and the restore modal clears its input after close/success. PIN lockout state is persisted across reloads.

**Remaining risk:** a six-digit PIN is low entropy. An attacker who copies local storage can attempt offline PIN guesses; localStorage-based lockout is editable and cannot provide a trusted brute-force limit. Browser-only storage is vulnerable to same-origin script compromise, malicious extensions, and compromised devices. JavaScript memory clearing is best-effort only.

### High — simulated financial/security features

**Before:** UI actions represented UPI AutoPay, instant buy, group-pool contributions, multisig signing/broadcast, biometric authorization, and inheritance claims as though they had occurred.

**Change:** actions now fail closed with a clear unavailable-integration message; they do not fabricate transaction IDs, balances, signatures, payment references, mandate states, or inheritance transfers. Demo family-member defaults and auto-generated UPI IDs were removed. Development-only OTP accepts only its exact demo code; production no longer treats the demo code as real SMS verification.

### High — fabricated tax calculations

**Before:** the tax export had synthetic sample transactions and assumed gain/tax/TDS calculations without transaction-level source data or verified historic price/cost-basis information.

**Change:** the export is a local activity ledger only. Unverified valuation, cost basis, gain, tax, and TDS fields remain unavailable/not assessed rather than being filled with made-up amounts. CSV fields are quoted and values beginning with spreadsheet formula characters are escaped. The UI describes the export as review material, not a calculation or compliance guarantee.

### Medium — unsafe or corrupt local data

**Before:** many local-storage JSON values were accepted through casts without validating the expected shape.

**Change:** profile, wallet, UTXO, transaction, vault, proposal, SIP, group pool, execution, and inheritance values are validated before being loaded. Local wallet validation checks the BIP-84 path, network, address/public-key relationship, integer amounts, UTXO txid/index/value/status fields, and transaction record shapes. Network requests now have timeouts, avoid browser caching, validate returned response structure, and throw on HTTP failures rather than silently substituting values.

### Medium — stale claims and dead wiring

**Change:** interface copy was updated where necessary to label testnet-only state, illustrative INR conversions, unavailable fee quotes, locally stored inheritance reminders, unassessed tax values, and unavailable native integrations. Dead mutation callbacks for integration-gated screens were removed from the app wiring. The overall frontend layout/styling was not redesigned.

## Known release blockers (not solved by this patch)

1. **No real transaction pipeline.** Implement and test UTXO selection, input/output construction, change and dust handling, fee estimation, sighash/signatures, network-bound transaction serialization, broadcast, timeout recovery using the locally computed txid, confirmation tracking, and replacement/reorg handling. Keep this testnet-only until independently reviewed.
2. **No secure signing boundary.** Define the threat model first. For a browser-only wallet, assess isolated signing, strict content security policy, dependency/supply-chain hardening, secret-exposure prevention, backup/import flows, and whether a native wrapper with platform keystore is needed. A browser PIN alone is not a hardware security boundary.
3. **No backend/provider integrations.** SMS, UPI mandates, fiat on-ramp, account linking, and any remote coordination require actual providers, server-side credential handling, idempotency, reconciliation, abuse controls, audit logs, rate limits, and failure-state handling. Never put provider secrets in `VITE_*` variables.
4. **Multisig is only a script/address primitive.** No authenticated cosigner key exchange, PSBT proposal transport, independent signer confirmation, signature validation, threshold state machine, hardware signing, or broadcast verification exists. A displayed P2WSH address must not be treated as a coordinated vault.
5. **Inheritance is only a local reminder.** A browser timer cannot monitor inactivity when the browser/device is offline and is not a Bitcoin timelock or enforceable inheritance plan. Any future design needs a dedicated threat model and independent cryptographic/legal review.
6. **Network source trust.** Balance/UTXO reads depend on a third-party Blockstream testnet API. The client does not verify against its own Bitcoin node or independently validate chain state. Avoid sending secrets to external services; the current balance calls use only the derived public address.
7. **Pricing and history are incomplete.** The INR conversion is an explicitly illustrative fixed value, not a live quote. The app doesn't independently sync verified transaction history or provide historic rates, acquisition lots, taxable-event classification, or TDS/tax calculation. Do not use the export to file taxes without verification by a qualified professional.
8. **Operational security isn't configured.** Before deployment, set a restrictive Content Security Policy and other security headers at the host, use HTTPS only, harden the production build/hosting and dependency pipeline, review logs/telemetry/privacy, and run a penetration test. There is no deployment target/backend in the supplied project to configure those safely here.
9. **Build & lockfile verification required.** The environment had no installed dependencies and package-registry access failed, so `npm run typecheck`, `npm test`, and `npm run build` could not run. The stale `bun.lock` was removed rather than shipping a lockfile inconsistent with the edited `package.json`. Generate and commit a current `package-lock.json` in a networked clean environment, then use `npm ci` in CI.
10. **External audit required.** Any wallet intended to hold funds requires an independent review of the full key lifecycle and transaction code plus a supply-chain audit. Passing a handful of unit tests does not substitute for an audit.

## Regression tests added

`tests/crypto.test.ts` covers:

- BIP-39 mnemonic generation and checksum rejection;
- deterministic BIP-84 testnet address/public-key derivation;
- P2WSH 2-of-3 address construction and signer-count mismatch rejection;
- authenticated recovery phrase encryption/decryption and wrong-PIN rejection;
- versioned PIN-verifier success/failure.

These six tests are present but **not executed in this environment** because dependencies were unavailable. Run after installing dependencies:

```sh
npm install
npm run typecheck
npm test
npm run build
```

Commit the generated lockfile, then replace `npm install` with `npm ci` in CI.

## Legacy user data / restore note

The earlier demo build persisted values that looked like funds and transaction records but were not verified blockchain state. On first startup with this hardened build, those old cached wallet and activity entries are discarded. The encrypted profile is preserved, and profile name/phone are prefilled into onboarding when possible. Earlier versions generated recovery words by selecting random dictionary entries without BIP-39 checksum validation, so phrases created by that generator are not valid standard Bitcoin wallet mnemonics and cannot be safely migrated into a standards-based wallet. If a user imported a valid BIP-39 phrase into the old build, that phrase may be restored in a clean standards-based wallet, but it must first be validated and the derived address independently checked. The old displayed balance, address, UTXOs, and activity history were not real chain state and must not be relied on. This migration resets legacy backup/biometric flags because those capabilities were not implemented. Preserve any encrypted profile until the user decides whether its data may be needed. Any phrase used on mainnet elsewhere must not be entered into this testnet prototype.

## Source areas inspected

- app entry, navigation and state wiring (`src/App.tsx`, `src/main.tsx`);
- crypto, address and persistence primitives (`src/lib/crypto.ts`, `storage.ts`, `blockstream.ts`, `constants.ts`, `runtime.ts`, `audio.ts`);
- onboarding and restore (`OnboardingFlow.tsx`, `RestoreWalletModal.tsx`);
- wallet send/receive and transaction details (`SaveTab.tsx`, QR modal components);
- investment/UPI/group pool previews (`InvestTab.tsx`);
- multisig/vault preview (`VaultsTab.tsx`);
- inheritance/timer preview (`ProtectTab.tsx`);
- recovery-key/PIN/biometric and export UI (`YouTab.tsx`, `PinModal.tsx`, `BiometricModal.tsx`, `TaxReportModal.tsx`);
- app metadata, package manifest, Vite config, TypeScript config and documentation.

This is a source audit and remediation pass, not a claim that every possible bug has been found. The project is not production-ready for real funds until the blockers above are implemented, verified and independently reviewed.
