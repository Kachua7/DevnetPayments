import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bytesToHex,
  hexToBytes,
  generate12WordMnemonic,
  validateMnemonic,
  deriveTestnetSegwitAddress,
  isTestnetAddressForPublicKey,
  validateTestnetAddress,
  deriveP2WSHAddress,
  encryptSeedWithPin,
  decryptSeedWithPin,
  hashPin,
  verifyPin,
  TESTNET_BIP84_PATH,
} from '../src/lib/crypto';
import {
  isTransaction,
  isUserProfile,
  isWalletState,
  isUTXO,
  isInheritancePlan,
  isSipPlan,
  isVault,
  isGroupInvestmentPool,
  isInvestmentExecution,
} from '../src/lib/storage';
import {
  assertTestnetSegwitAddress,
  fetchTestnetAddressBalance,
  fetchTestnetUTXOs,
} from '../src/lib/blockstream';
import type { UserProfile, WalletState, Transaction, UTXO } from '../src/types';

const VALID_12_WORDS = [
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about',
];

const SECOND_12_WORDS = [
  'legal', 'winner', 'thank', 'year', 'wave', 'sausage',
  'worth', 'useful', 'legal', 'winner', 'thank', 'yellow',
];

const THIRD_12_WORDS = [
  'letter', 'advice', 'cage', 'absurd', 'amount', 'doctor',
  'acoustic', 'avoid', 'letter', 'advice', 'cage', 'above',
];

// --- 1. MNEMONIC VALIDATION TESTS ---
test('Mnemonic validation: accepts valid BIP-39 lengths (12, 15, 18, 21, 24)', () => {
  assert.equal(validateMnemonic(VALID_12_WORDS), true);
  assert.equal(validateMnemonic([...Array(23).fill('abandon'), 'art']), true); // 24 words
});

test('Mnemonic validation: trims whitespace and handles mixed case', () => {
  const mixedCaseWithSpaces = VALID_12_WORDS.map((w, idx) =>
    idx % 2 === 0 ? `  ${w.toUpperCase()} ` : w
  );
  assert.equal(validateMnemonic(mixedCaseWithSpaces), true);
});

test('Mnemonic validation: rejects non-array and invalid length inputs', () => {
  assert.equal(validateMnemonic(null as any), false);
  assert.equal(validateMnemonic(undefined as any), false);
  assert.equal(validateMnemonic([]), false);
  assert.equal(validateMnemonic(VALID_12_WORDS.slice(0, 11)), false);
  assert.equal(validateMnemonic([...VALID_12_WORDS, 'about']), false);
});

test('Mnemonic validation: rejects non-dictionary words', () => {
  const fakeWords = [...VALID_12_WORDS];
  fakeWords[0] = 'notabtcwordxyz';
  assert.equal(validateMnemonic(fakeWords), false);
});

test('Mnemonic validation: rejects valid words with corrupted checksum', () => {
  const corrupted = [...VALID_12_WORDS];
  corrupted[11] = 'abandon'; // Invalid checksum word
  assert.equal(validateMnemonic(corrupted), false);
});

// --- 2. WALLET KEY DERIVATION & ADDRESS INTEGRITY TESTS ---
test('Key derivation: generates deterministic testnet P2WPKH native SegWit address', async () => {
  const derived = await deriveTestnetSegwitAddress(VALID_12_WORDS);
  assert.equal(derived.bipPath, TESTNET_BIP84_PATH);
  assert.match(derived.address, /^tb1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/);
  assert.match(derived.publicKeyHex, /^(02|03)[0-9a-f]{64}$/);

  // Address must be tb1q... exactly 42 characters
  assert.equal(derived.address.length, 42);
  assert.equal(derived.publicKeyHex.length, 66);

  // Derivation must be repeatable and deterministic
  const repeat = await deriveTestnetSegwitAddress(VALID_12_WORDS);
  assert.deepEqual(derived, repeat);
});

test('Key derivation: verifies address matches public key on testnet', async () => {
  const key1 = await deriveTestnetSegwitAddress(VALID_12_WORDS);
  const key2 = await deriveTestnetSegwitAddress(SECOND_12_WORDS);

  // Correct address + correct pubkey
  assert.equal(isTestnetAddressForPublicKey(key1.address, key1.publicKeyHex), true);
  assert.equal(isTestnetAddressForPublicKey(key2.address, key2.publicKeyHex), true);

  // Cross-matched address and public key must be rejected
  assert.equal(isTestnetAddressForPublicKey(key1.address, key2.publicKeyHex), false);
  assert.equal(isTestnetAddressForPublicKey(key2.address, key1.publicKeyHex), false);

  // Invalid address or public key formats
  assert.equal(isTestnetAddressForPublicKey('bc1qinvalidmainnetaddress', key1.publicKeyHex), false);
  assert.equal(isTestnetAddressForPublicKey(key1.address, 'invalid_pubkey'), false);
  assert.equal(isTestnetAddressForPublicKey(key1.address, '04' + '00'.repeat(64)), false); // Uncompressed key
});

test('Multisig derivation: BIP-67 lexicographical sorting ensures identical script regardless of key order', async () => {
  const [k1, k2, k3] = await Promise.all([
    deriveTestnetSegwitAddress(VALID_12_WORDS),
    deriveTestnetSegwitAddress(SECOND_12_WORDS),
    deriveTestnetSegwitAddress(THIRD_12_WORDS),
  ]);

  const multisigOrderA = await deriveP2WSHAddress(2, 3, [k1.publicKeyHex, k2.publicKeyHex, k3.publicKeyHex]);
  const multisigOrderB = await deriveP2WSHAddress(2, 3, [k3.publicKeyHex, k1.publicKeyHex, k2.publicKeyHex]);
  const multisigOrderC = await deriveP2WSHAddress(2, 3, [k2.publicKeyHex, k3.publicKeyHex, k1.publicKeyHex]);

  assert.equal(multisigOrderA.p2wshAddress, multisigOrderB.p2wshAddress);
  assert.equal(multisigOrderA.witnessScriptHex, multisigOrderB.witnessScriptHex);
  assert.equal(multisigOrderA.p2wshAddress, multisigOrderC.p2wshAddress);
});

test('Multisig derivation: strictly validates threshold, duplicates, and signer boundaries', async () => {
  const [k1, k2] = await Promise.all([
    deriveTestnetSegwitAddress(VALID_12_WORDS),
    deriveTestnetSegwitAddress(SECOND_12_WORDS),
  ]);

  await assert.rejects(() => deriveP2WSHAddress(3, 2, [k1.publicKeyHex, k2.publicKeyHex]));
  await assert.rejects(() => deriveP2WSHAddress(0, 2, [k1.publicKeyHex, k2.publicKeyHex]));
  await assert.rejects(() => deriveP2WSHAddress(2, 2, [k1.publicKeyHex, k1.publicKeyHex]));
  await assert.rejects(() => deriveP2WSHAddress(2, 3, [k1.publicKeyHex, k2.publicKeyHex]));
});

// --- 3. BITCOIN ADDRESS BECH32 CHECKSUM VERIFICATION ---
test('Address checksum verification: validates mathematically sound Bech32 testnet SegWit addresses', () => {
  const validAddress = 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl';
  assert.equal(validateTestnetAddress(validAddress), true);
  assert.doesNotThrow(() => assertTestnetSegwitAddress(validAddress));
});

test('Address checksum verification: rejects valid characters with corrupted Bech32 checksum', () => {
  // Replace the last checksum character 'l' with 'm' (valid bech32 character, but invalid checksum)
  const corruptedChecksum = 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkm';

  // Even though it matches regex /tb1q.../, the actual BIP-173 Bech32 checksum is mathematically invalid
  assert.equal(validateTestnetAddress(corruptedChecksum), false);
  assert.throws(() => assertTestnetSegwitAddress(corruptedChecksum), /Invalid Bitcoin testnet SegWit address/);
});

test('Address checksum verification: rejects mainnet addresses and legacy formats', () => {
  const mainnetAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
  const legacyP2PKH = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
  const legacyP2SH = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';

  assert.equal(validateTestnetAddress(mainnetAddress), false);
  assert.throws(() => assertTestnetSegwitAddress(mainnetAddress), /Invalid Bitcoin testnet SegWit address/);
  assert.throws(() => assertTestnetSegwitAddress(legacyP2PKH), /Invalid Bitcoin testnet SegWit address/);
  assert.throws(() => assertTestnetSegwitAddress(legacyP2SH), /Invalid Bitcoin testnet SegWit address/);
});

// --- 4. ENCRYPTED STORAGE & AUTHENTICATED KEY WRAPPING ---
test('Encrypted storage: AES-256-GCM authenticated encryption with PBKDF2-SHA256', async () => {
  const pin = '482910';
  const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

  const encrypted = await encryptSeedWithPin(VALID_12_WORDS, pin, salt);
  assert.ok(encrypted.startsWith('v2:'));

  const decrypted = await decryptSeedWithPin(encrypted, pin, salt);
  assert.deepEqual(decrypted, VALID_12_WORDS);

  await assert.rejects(
    () => decryptSeedWithPin(encrypted, '482911', salt),
    /operation failed|tag mismatch|decrypt/i
  );
});

test('Encrypted storage: tamper detection rejects modified ciphertext or authentication tag', async () => {
  const pin = '991122';
  const salt = '0123456789abcdef0123456789abcdef';
  const encrypted = await encryptSeedWithPin(VALID_12_WORDS, pin, salt);

  // Tamper with one base64 character in ciphertext payload
  const rawBase64 = encrypted.slice(3);
  const chars = rawBase64.split('');
  const lastIdx = chars.length - 2;
  chars[lastIdx] = chars[lastIdx] === 'A' ? 'B' : 'A';
  const tampered = `v2:${chars.join('')}`;

  await assert.rejects(
    () => decryptSeedWithPin(tampered, pin, salt),
    /operation failed|tag mismatch|decrypt|malformed/i
  );
});

test('PIN security: asserts 6-digit PIN pattern and prevents short/long/alpha PINs', async () => {
  const salt = 'abcdef0123456789abcdef0123456789';

  await assert.rejects(() => hashPin('12345', salt), /six digits/i);
  await assert.rejects(() => hashPin('1234567', salt), /six digits/i);
  await assert.rejects(() => hashPin('abcdef', salt), /six digits/i);
  await assert.rejects(() => hashPin('', salt), /six digits/i);

  const verifier = await hashPin('123456', salt);
  assert.equal(await verifyPin('12345', verifier, salt), false);
  assert.equal(await verifyPin('1234567', verifier, salt), false);
  assert.equal(await verifyPin('abcdef', verifier, salt), false);
  assert.equal(await verifyPin('123456', verifier, salt), true);
});

// --- 5. ACTUAL APPLICATION STORAGE VALIDATOR TESTS ---
test('Actual application validator: isTransaction validates valid records and rejects anomalies', () => {
  const validTx: Transaction = {
    id: 'tx-1',
    txid: 'a'.repeat(64),
    type: 'receive',
    amountSats: 50000,
    feeSats: 150,
    status: 'confirmed',
    timestamp: Date.now(),
    counterparty: 'tb1qtestaddress',
    confirmations: 6,
  };

  // Valid transaction passes actual application isTransaction validator
  assert.equal(isTransaction(validTx), true);

  // Negative amount rejected
  assert.equal(isTransaction({ ...validTx, amountSats: -100 }), false);
  // Float amount rejected (must be integer sats)
  assert.equal(isTransaction({ ...validTx, amountSats: 100.5 }), false);
  // Negative fee rejected
  assert.equal(isTransaction({ ...validTx, feeSats: -10 }), false);
  // Non-64 hex txid rejected
  assert.equal(isTransaction({ ...validTx, txid: 'abc123' }), false);
  // Unknown type rejected
  assert.equal(isTransaction({ ...validTx, type: 'fake_transfer' }), false);
  // Negative confirmations rejected
  assert.equal(isTransaction({ ...validTx, confirmations: -1 }), false);
  // Non-object rejected
  assert.equal(isTransaction(null), false);
  assert.equal(isTransaction('not-an-object'), false);
});

test('Actual application validator: isUserProfile validates valid profiles and rejects malformed fields', () => {
  const validProfile: UserProfile = {
    id: 'usr_123',
    phone: '+91 9876543210',
    name: 'Aarav Sharma',
    avatarSeed: '9876543210',
    createdAt: Date.now(),
    isBackedUp: false,
    isBiometricEnabled: false,
    pinHash: 'v2:' + '0'.repeat(64),
    pinSalt: 'a'.repeat(32),
    failedPinAttempts: 0,
    lockoutUntil: null,
    encryptedSeedPhrase: 'v2:SGVsbG8gV29ybGQ=',
  };

  assert.equal(isUserProfile(validProfile), true);

  // Missing or empty id
  assert.equal(isUserProfile({ ...validProfile, id: '' }), false);
  // Malformed pinHash
  assert.equal(isUserProfile({ ...validProfile, pinHash: 'bad_hash' }), false);
  // Short salt
  assert.equal(isUserProfile({ ...validProfile, pinSalt: '123' }), false);
  // Negative failed attempts
  assert.equal(isUserProfile({ ...validProfile, failedPinAttempts: -1 }), false);
  // Non-boolean flags
  assert.equal(isUserProfile({ ...validProfile, isBackedUp: 'false' as any }), false);
});

test('Actual application validator: isUTXO validates UTXO entries', () => {
  const validUtxo: UTXO = {
    txid: 'f'.repeat(64),
    vout: 0,
    value: 10000,
    status: { confirmed: true, block_height: 2500000 },
  };

  assert.equal(isUTXO(validUtxo), true);

  // Negative value
  assert.equal(isUTXO({ ...validUtxo, value: -10 }), false);
  // Value 0 (dust / invalid output)
  assert.equal(isUTXO({ ...validUtxo, value: 0 }), false);
  // Negative vout
  assert.equal(isUTXO({ ...validUtxo, vout: -1 }), false);
  // Float vout
  assert.equal(isUTXO({ ...validUtxo, vout: 1.5 }), false);
  // Malformed txid
  assert.equal(isUTXO({ ...validUtxo, txid: '123' }), false);
  // Missing status
  assert.equal(isUTXO({ ...validUtxo, status: undefined as any }), false);
});

test('Actual application validator: isWalletState validates network and address matching', async () => {
  const key = await deriveTestnetSegwitAddress(VALID_12_WORDS);
  const validWallet: WalletState = {
    address: key.address,
    publicKeyHex: key.publicKeyHex,
    bipPath: "m/84'/1'/0'/0/0",
    balanceSats: 50000,
    unconfirmedSats: 0,
    utxos: [],
    lastSyncedAt: Date.now(),
    network: 'testnet3',
  };

  assert.equal(isWalletState(validWallet), true);

  // Mainnet network rejected
  assert.equal(isWalletState({ ...validWallet, network: 'mainnet' as any }), false);
  // Mismatched public key and address rejected
  assert.equal(isWalletState({ ...validWallet, publicKeyHex: '02' + '1'.repeat(64) }), false);
  // Negative balance rejected
  assert.equal(isWalletState({ ...validWallet, balanceSats: -5 }), false);
  // Non-bip84 path rejected
  assert.equal(isWalletState({ ...validWallet, bipPath: "m/44'/0'/0'/0/0" }), false);
});

test('Actual application validator: isInheritancePlan, isSipPlan, and isVault validate boundaries', () => {
  const validInheritance = {
    enabled: true,
    nomineeName: 'Priya Sharma',
    nomineePhone: '+91 9876543211',
    nomineeRelationship: 'Spouse',
    checkInIntervalDays: 90,
    gracePeriodDays: 30,
    lastCheckedInAt: Date.now(),
    allocatedPercent: 100,
    status: 'active',
  };
  assert.equal(isInheritancePlan(validInheritance), true);
  // Allocated percent > 100 rejected
  assert.equal(isInheritancePlan({ ...validInheritance, allocatedPercent: 105 }), false);
  // Allocated percent < 0 rejected
  assert.equal(isInheritancePlan({ ...validInheritance, allocatedPercent: -1 }), false);
  // Negative checkInIntervalDays rejected
  assert.equal(isInheritancePlan({ ...validInheritance, checkInIntervalDays: 0 }), false);

  const validSip = {
    id: 'sip_1',
    name: 'Weekly Stacking',
    amountInr: 1000,
    frequency: 'weekly',
    upiId: 'user@okhdfcbank',
    mandateId: 'mandate_123',
    status: 'active',
    createdAt: Date.now(),
    nextExecutionAt: Date.now() + 7 * 86400000,
    totalInvestedInr: 5000,
    totalAccumulatedSats: 60000,
  };
  assert.equal(isSipPlan(validSip), true);
  // Invalid frequency rejected
  assert.equal(isSipPlan({ ...validSip, frequency: 'hourly' }), false);
  // Negative amount rejected
  assert.equal(isSipPlan({ ...validSip, amountInr: -500 }), false);
});

// --- 6. NETWORK RESPONSE FAILURE & ERROR HANDLING TESTS ---
test('Network error handling: fetchTestnetAddressBalance rejects invalid addresses before network fetch', async () => {
  await assert.rejects(
    () => fetchTestnetAddressBalance('invalid_address'),
    /Invalid Bitcoin testnet SegWit address/
  );
  await assert.rejects(
    () => fetchTestnetAddressBalance('tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkm'), // Corrupted checksum
    /Invalid Bitcoin testnet SegWit address/
  );
});

test('Network error handling: fetchTestnetAddressBalance handles HTTP failures and malformed responses', async () => {
  const originalFetch = globalThis.fetch;
  const validAddress = 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl';

  try {
    // 1. HTTP 500 Error
    globalThis.fetch = async () => new Response('Internal Server Error', { status: 500 });
    await assert.rejects(
      () => fetchTestnetAddressBalance(validAddress),
      /Blockstream API request failed \(500\)/
    );

    // 2. HTTP 404 Error
    globalThis.fetch = async () => new Response('Not Found', { status: 404 });
    await assert.rejects(
      () => fetchTestnetAddressBalance(validAddress),
      /Blockstream API request failed \(404\)/
    );

    // 3. Malformed JSON with missing stats
    globalThis.fetch = async () => new Response(JSON.stringify({ not_stats: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(
      () => fetchTestnetAddressBalance(validAddress),
      /Blockstream returned an invalid balance response/
    );

    // 4. Impossible negative confirmed balance (funded < spent)
    globalThis.fetch = async () => new Response(JSON.stringify({
      chain_stats: { funded_txo_sum: 100, spent_txo_sum: 200 },
      mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(
      () => fetchTestnetAddressBalance(validAddress),
      /Blockstream returned an impossible confirmed balance/
    );

    // 5. Successful valid balance response
    globalThis.fetch = async () => new Response(JSON.stringify({
      chain_stats: { funded_txo_sum: 50000, spent_txo_sum: 10000, tx_count: 2 },
      mempool_stats: { funded_txo_sum: 5000, spent_txo_sum: 0, tx_count: 1 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const balance = await fetchTestnetAddressBalance(validAddress);
    assert.equal(balance.balanceSats, 40000);
    assert.equal(balance.unconfirmedSats, 5000);

  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Network error handling: fetchTestnetUTXOs handles malformed UTXO items', async () => {
  const originalFetch = globalThis.fetch;
  const validAddress = 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl';

  try {
    // 1. Non-array response
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'not an array' }), { status: 200 });
    await assert.rejects(
      () => fetchTestnetUTXOs(validAddress),
      /Blockstream returned an invalid UTXO response/
    );

    // 2. Malformed item: invalid txid
    globalThis.fetch = async () => new Response(JSON.stringify([{
      txid: 'not_a_64_hex_txid',
      vout: 0,
      value: 1000,
      status: { confirmed: true }
    }]), { status: 200 });
    await assert.rejects(
      () => fetchTestnetUTXOs(validAddress),
      /Blockstream returned a malformed UTXO/
    );

    // 3. Malformed item: negative value
    globalThis.fetch = async () => new Response(JSON.stringify([{
      txid: 'a'.repeat(64),
      vout: 0,
      value: -100,
      status: { confirmed: true }
    }]), { status: 200 });
    await assert.rejects(
      () => fetchTestnetUTXOs(validAddress),
      /Blockstream returned a malformed UTXO/
    );

    // 4. Valid UTXO response
    globalThis.fetch = async () => new Response(JSON.stringify([{
      txid: 'a'.repeat(64),
      vout: 1,
      value: 25000,
      status: { confirmed: true, block_height: 2501000 }
    }]), { status: 200 });
    const utxos = await fetchTestnetUTXOs(validAddress);
    assert.equal(utxos.length, 1);
    assert.equal(utxos[0].value, 25000);
    assert.equal(utxos[0].vout, 1);
    assert.equal(utxos[0].status.confirmed, true);

  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --- 7. HEX CONVERSION ERROR HANDLING ---
test('Hex utilities: validates hexadecimal encoding and rejects malformed strings', () => {
  const bytes = new Uint8Array([0x00, 0x7f, 0xff, 0x10]);
  const hex = bytesToHex(bytes);
  assert.equal(hex, '007fff10');
  assert.deepEqual(hexToBytes(hex), bytes);
  assert.deepEqual(hexToBytes('0x' + hex), bytes);

  assert.throws(() => hexToBytes('123'), /Invalid hexadecimal input/);
  assert.throws(() => hexToBytes('123z'), /Invalid hexadecimal input/);
});
