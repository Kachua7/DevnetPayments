import { HDKey } from '@scure/bip32';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as btc from '@scure/btc-signer';

/**
 * Bitcoin key management primitives.
 *
 * This module intentionally delegates BIP-39, BIP-32/secp256k1 and Bitcoin
 * script/address construction to maintained implementations. Do not replace
 * these with hand-written cryptography or deterministic-looking placeholders.
 */
export const TESTNET_BIP84_PATH = "m/84'/1'/0'/0/0";
const CURRENT_KDF_ITERATIONS = 600_000;
const LEGACY_KDF_ITERATIONS = 100_000;
const V2_PREFIX = 'v2:';
const PIN_PATTERN = /^\d{6}$/;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(clean)) {
    throw new Error('Invalid hexadecimal input');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function generate12WordMnemonic(): string[] {
  // BIP-39 generates 128 bits of entropy plus the required 4-bit checksum.
  return bip39.generateMnemonic(wordlist, 128).split(' ');
}

export function validateMnemonic(words: string[]): boolean {
  if (!Array.isArray(words) || ![12, 15, 18, 21, 24].includes(words.length)) {
    return false;
  }
  if (!words.every((word) => typeof word === 'string' && word.trim().length > 0)) {
    return false;
  }
  return bip39.validateMnemonic(words.map((word) => word.trim().toLowerCase()).join(' '), wordlist);
}

async function deriveBip84Key(mnemonic: string[]): Promise<HDKey> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Recovery phrase is not a valid BIP-39 mnemonic');
  }
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Web Crypto is unavailable. Use a secure browser context (HTTPS or localhost).');
  }

  const normalized = mnemonic.map((word) => word.trim().toLowerCase()).join(' ').normalize('NFKD');
  const seed = await bip39.mnemonicToSeed(normalized);
  const root = HDKey.fromMasterSeed(seed);
  seed.fill(0);
  try {
    return root.derive(TESTNET_BIP84_PATH);
  } finally {
    // The derived child key is returned separately; erase the master key copy.
    root.wipePrivateData();
  }
}

export async function deriveTestnetSegwitAddress(
  mnemonic: string[]
): Promise<{ address: string; publicKeyHex: string; bipPath: string }> {
  const child = await deriveBip84Key(mnemonic);
  try {
    const publicKey = child.publicKey;
    if (!publicKey || publicKey.length !== 33) {
      throw new Error('Could not derive a valid compressed secp256k1 public key');
    }

    const payment = btc.p2wpkh(publicKey, btc.TEST_NETWORK);
    if (!payment.address) {
      throw new Error('Could not construct a Bitcoin testnet SegWit address');
    }

    return {
      address: payment.address,
      publicKeyHex: bytesToHex(publicKey),
      bipPath: TESTNET_BIP84_PATH,
    };
  } finally {
    child.wipePrivateData();
  }
}

/** Validates the address checksum/network and proves it corresponds to a public key. */
export function isTestnetAddressForPublicKey(address: string, publicKeyHex: string): boolean {
  try {
    if (!/^(02|03)[0-9a-f]{64}$/i.test(publicKeyHex)) return false;
    const payment = btc.p2wpkh(hexToBytes(publicKeyHex), btc.TEST_NETWORK);
    return payment.address === address;
  } catch {
    return false;
  }
}

/** Validates that an address is a valid Bitcoin testnet address with a mathematically correct Bech32 checksum. */
export function validateTestnetAddress(address: string): boolean {
  if (typeof address !== 'string' || address.trim().length === 0) return false;
  try {
    const decoded = btc.Address(btc.TEST_NETWORK).decode(address.trim());
    return decoded !== undefined && decoded !== null;
  } catch {
    return false;
  }
}

export async function deriveP2WSHAddress(
  threshold: number,
  totalSigners: number,
  memberPublicKeys: string[]
): Promise<{ p2wshAddress: string; witnessScriptHex: string }> {
  if (
    !Number.isInteger(threshold) ||
    !Number.isInteger(totalSigners) ||
    threshold < 1 ||
    totalSigners < 1 ||
    threshold > totalSigners ||
    totalSigners > 15 ||
    memberPublicKeys.length !== totalSigners
  ) {
    throw new Error('Invalid multisig threshold or signer count');
  }

  const normalizedKeys = memberPublicKeys.map((key) => key.replace(/^0x/i, '').toLowerCase());
  if (normalizedKeys.some((key) => !/^(02|03)[0-9a-f]{64}$/.test(key))) {
    throw new Error('Every cosigner must provide a 33-byte compressed secp256k1 public key');
  }
  if (new Set(normalizedKeys).size !== normalizedKeys.length) {
    throw new Error('Duplicate cosigner public keys are not allowed');
  }

  // BIP-67 sorts the serialized compressed public keys lexicographically.
  const sortedPublicKeys = normalizedKeys.sort().map(hexToBytes);
  const witnessScript = btc.p2ms(threshold, sortedPublicKeys);
  const payment = btc.p2wsh(witnessScript, btc.TEST_NETWORK);
  if (!payment.address || !payment.witnessScript) {
    throw new Error('Could not construct a valid P2WSH multisig address');
  }

  return {
    p2wshAddress: payment.address,
    witnessScriptHex: bytesToHex(payment.witnessScript),
  };
}

function assertPin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error('PIN must contain exactly six digits');
  }
}

async function deriveKeyFromPin(pin: string, salt: string, iterations: number): Promise<CryptoKey> {
  assertPin(pin);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) result[i] = binary.charCodeAt(i);
  return result;
}

export async function encryptSeedWithPin(mnemonic: string[], pin: string, salt: string): Promise<string> {
  if (!validateMnemonic(mnemonic)) throw new Error('Cannot encrypt an invalid recovery phrase');
  const key = await deriveKeyFromPin(pin, salt, CURRENT_KDF_ITERATIONS);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(mnemonic.join(' ').normalize('NFKD'));
  try {
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return `${V2_PREFIX}${bytesToBase64(combined)}`;
  } finally {
    plaintext.fill(0);
  }
}

export async function decryptSeedWithPin(
  encryptedData: string,
  pin: string,
  salt: string
): Promise<string[]> {
  if (typeof encryptedData !== 'string' || encryptedData.length === 0) {
    throw new Error('Encrypted recovery phrase is missing');
  }

  // Existing users' v1 blobs are still readable, so they can migrate on unlock.
  const isV2 = encryptedData.startsWith(V2_PREFIX);
  const encoded = isV2 ? encryptedData.slice(V2_PREFIX.length) : encryptedData;
  const combined = base64ToBytes(encoded);
  if (combined.length < 12 + 16) throw new Error('Encrypted recovery phrase is malformed');

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = await deriveKeyFromPin(
    pin,
    salt,
    isV2 ? CURRENT_KDF_ITERATIONS : LEGACY_KDF_ITERATIONS
  );
  const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
  try {
    const phrase = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
    const words = phrase.normalize('NFKD').trim().split(/\s+/);
    if (!validateMnemonic(words)) throw new Error('Decrypted recovery phrase failed BIP-39 validation');
    return words;
  } finally {
    plaintext.fill(0);
  }
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  assertPin(pin);
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`${salt}:bitkosh-pin-v2`),
      iterations: CURRENT_KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    256
  );
  return `${V2_PREFIX}${bytesToHex(new Uint8Array(derived))}`;
}

/** Constant-time string comparison for stored PIN verifiers. */
function constantTimeEqual(a: string, b: string): boolean {
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return difference === 0;
}

export async function verifyPin(pin: string, storedHash: string, salt: string): Promise<boolean> {
  if (!PIN_PATTERN.test(pin) || typeof storedHash !== 'string') return false;
  if (storedHash.startsWith(V2_PREFIX)) {
    return constantTimeEqual(await hashPin(pin, salt), storedHash);
  }

  // Backwards compatibility for profiles created by the original demo build.
  const legacyData = new TextEncoder().encode(`${salt}:${pin}:bitkosh_secure_pepper_2026`);
  const legacyDigest = await crypto.subtle.digest('SHA-256', legacyData);
  const legacyHash = bytesToHex(new Uint8Array(legacyDigest));
  return constantTimeEqual(legacyHash, storedHash);
}
