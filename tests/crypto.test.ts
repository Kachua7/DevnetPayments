import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveP2WSHAddress,
  deriveTestnetSegwitAddress,
  decryptSeedWithPin,
  encryptSeedWithPin,
  generate12WordMnemonic,
  hashPin,
  validateMnemonic,
  verifyPin,
} from '../src/lib/crypto';

const BIP39_VECTOR = [
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about',
];

const SECOND_BIP39_VECTOR = [
  'legal', 'winner', 'thank', 'year', 'wave', 'sausage',
  'worth', 'useful', 'legal', 'winner', 'thank', 'yellow',
];

const THIRD_BIP39_VECTOR = [
  'letter', 'advice', 'cage', 'absurd', 'amount', 'doctor',
  'acoustic', 'avoid', 'letter', 'advice', 'cage', 'above',
];

test('generates a valid 12-word BIP-39 mnemonic', () => {
  const words = generate12WordMnemonic();
  assert.equal(words.length, 12);
  assert.equal(validateMnemonic(words), true);
});

test('validates the BIP-39 checksum instead of only checking dictionary membership', () => {
  assert.equal(validateMnemonic(BIP39_VECTOR), true);
  assert.equal(validateMnemonic([...Array(23).fill('abandon'), 'art']), true);
  const invalidChecksum = [...BIP39_VECTOR];
  invalidChecksum[11] = 'ability';
  assert.equal(validateMnemonic(invalidChecksum), false);
  assert.equal(validateMnemonic([...BIP39_VECTOR, 'abandon']), false);
});

test('derives a stable native SegWit testnet address and a real compressed public key', async () => {
  const first = await deriveTestnetSegwitAddress(BIP39_VECTOR);
  const second = await deriveTestnetSegwitAddress(BIP39_VECTOR);
  assert.deepEqual(first, second);
  assert.match(first.address, /^tb1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/);
  assert.match(first.publicKeyHex, /^(02|03)[0-9a-f]{64}$/);
  assert.equal(first.bipPath, "m/84'/1'/0'/0/0");
});

test('constructs a valid 2-of-3 P2WSH address and rejects a signer-count mismatch', async () => {
  const [key1, key2, key3] = await Promise.all([
    deriveTestnetSegwitAddress(BIP39_VECTOR),
    deriveTestnetSegwitAddress(SECOND_BIP39_VECTOR),
    deriveTestnetSegwitAddress(THIRD_BIP39_VECTOR),
  ]);
  const multisig = await deriveP2WSHAddress(2, 3, [key1.publicKeyHex, key2.publicKeyHex, key3.publicKeyHex]);
  assert.match(multisig.p2wshAddress, /^tb1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$/);
  assert.match(multisig.witnessScriptHex, /^[0-9a-f]+$/);
  await assert.rejects(() => deriveP2WSHAddress(3, 5, [key1.publicKeyHex, key2.publicKeyHex, key3.publicKeyHex]));
});

test('encrypts and decrypts a valid recovery phrase with authenticated encryption', async () => {
  const salt = '0123456789abcdef0123456789abcdef';
  const pin = '573104';
  const encrypted = await encryptSeedWithPin(BIP39_VECTOR, pin, salt);
  assert.ok(encrypted.startsWith('v2:'));
  assert.deepEqual(await decryptSeedWithPin(encrypted, pin, salt), BIP39_VECTOR);
  await assert.rejects(() => decryptSeedWithPin(encrypted, '573105', salt));
});

test('uses a versioned, salted PIN verifier and verifies it safely', async () => {
  const salt = 'abcdef0123456789abcdef0123456789';
  const verifier = await hashPin('573104', salt);
  assert.ok(verifier.startsWith('v2:'));
  assert.equal(await verifyPin('573104', verifier, salt), true);
  assert.equal(await verifyPin('573105', verifier, salt), false);
  assert.equal(await verifyPin('123', verifier, salt), false);
});
