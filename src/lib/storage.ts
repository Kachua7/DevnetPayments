import {
  UserProfile,
  WalletState,
  Transaction,
  Vault,
  InheritancePlan,
  SipPlan,
  GroupInvestmentPool,
  InvestmentExecution,
} from '../types';
import { isTestnetAddressForPublicKey } from './crypto';

const STORAGE_KEYS = {
  USER: 'bitkosh_user_profile_v1',
  WALLET: 'bitkosh_wallet_state_v1',
  TXS: 'bitkosh_transactions_v1',
  VAULTS: 'bitkosh_vaults_v1',
  INHERITANCE: 'bitkosh_inheritance_v1',
  SIPS: 'bitkosh_sips_v1',
  GROUP_POOLS: 'bitkosh_group_pools_v1',
  EXECUTIONS: 'bitkosh_executions_v1',
  SCHEMA_VERSION: 'bitkosh_storage_schema_v3',
  // Legacy keys remain listed only so clearAllStorage can remove old plaintext secrets.
  SESSION_PIN: 'bitkosh_session_pin_v1',
  SESSION_WORDS: 'bitkosh_session_words_v1',
};

export const DEFAULT_INHERITANCE: InheritancePlan = {
  // Never preload a beneficiary or an active transfer rule with fabricated details.
  enabled: false,
  nomineeName: '',
  nomineePhone: '',
  nomineeRelationship: '',
  checkInIntervalDays: 90,
  gracePeriodDays: 30,
  lastCheckedInAt: Date.now(),
  allocatedPercent: 100,
  status: 'active',
};

function migrateLegacyDemoData(): void {
  if (localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION) === '3') return;

  // The earlier build persisted simulated balances, txids, vaults and payments.
  // They cannot be treated as verified chain records. Clear those app caches
  // once, but preserve the encrypted profile so a valid seed can be restored.
  for (const key of [
    STORAGE_KEYS.WALLET,
    STORAGE_KEYS.TXS,
    STORAGE_KEYS.VAULTS,
    STORAGE_KEYS.INHERITANCE,
    STORAGE_KEYS.SIPS,
    STORAGE_KEYS.GROUP_POOLS,
    STORAGE_KEYS.EXECUTIONS,
  ]) {
    localStorage.removeItem(key);
  }
  // Remove legacy secrets previously written to sessionStorage.
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_PIN);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_WORDS);

  // Old releases set these flags without implementing biometric auth or a
  // verifiable backup flow. Do not carry those untrusted claims forward.
  try {
    const rawProfile = localStorage.getItem(STORAGE_KEYS.USER);
    if (rawProfile) {
      const parsed: unknown = JSON.parse(rawProfile);
      if (isPlainRecord(parsed)) {
        parsed.isBackedUp = false;
        parsed.isBiometricEnabled = false;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(parsed));
      }
    }
  } catch {
    // Corrupt profile data remains unreadable and is handled by normal validation.
  }

  localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '3');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.phone === 'string' &&
    typeof value.name === 'string' &&
    typeof value.avatarSeed === 'string' &&
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) &&
    typeof value.pinHash === 'string' && (
      /^v2:[0-9a-f]{64}$/i.test(value.pinHash) || /^[0-9a-f]{64}$/i.test(value.pinHash)
    ) &&
    typeof value.pinSalt === 'string' && /^[0-9a-f]{32}$/i.test(value.pinSalt) &&
    typeof value.encryptedSeedPhrase === 'string' &&
    value.encryptedSeedPhrase.length <= 4096 &&
    /^(?:v2:)?[A-Za-z0-9+/=]+$/.test(value.encryptedSeedPhrase) &&
    typeof value.isBackedUp === 'boolean' &&
    typeof value.isBiometricEnabled === 'boolean' &&
    typeof value.failedPinAttempts === 'number' && Number.isInteger(value.failedPinAttempts) && value.failedPinAttempts >= 0 &&
    (value.lockoutUntil === null || (typeof value.lockoutUntil === 'number' && Number.isFinite(value.lockoutUntil)))
  );
}

function isUTXO(value: unknown): value is WalletState['utxos'][number] {
  if (!isPlainRecord(value) || !isPlainRecord(value.status)) return false;
  return (
    typeof value.txid === 'string' && /^[0-9a-f]{64}$/i.test(value.txid) &&
    typeof value.vout === 'number' && Number.isSafeInteger(value.vout) && value.vout >= 0 &&
    typeof value.value === 'number' && Number.isSafeInteger(value.value) && value.value > 0 &&
    typeof value.status.confirmed === 'boolean' &&
    (value.status.block_height === undefined || (typeof value.status.block_height === 'number' && Number.isSafeInteger(value.status.block_height) && value.status.block_height >= 0))
  );
}

function isWalletState(value: unknown): value is WalletState {
  if (!isPlainRecord(value)) return false;
  if (
    typeof value.address !== 'string' ||
    typeof value.publicKeyHex !== 'string' ||
    typeof value.bipPath !== 'string' || value.bipPath !== "m/84'/1'/0'/0/0" ||
    typeof value.balanceSats !== 'number' || !Number.isSafeInteger(value.balanceSats) || value.balanceSats < 0 ||
    typeof value.unconfirmedSats !== 'number' || !Number.isSafeInteger(value.unconfirmedSats) ||
    !Array.isArray(value.utxos) || !value.utxos.every(isUTXO) ||
    typeof value.lastSyncedAt !== 'number' || !Number.isFinite(value.lastSyncedAt) ||
    value.network !== 'testnet3'
  ) return false;

  return isTestnetAddressForPublicKey(value.address, value.publicKeyHex);
}

function isTransaction(value: unknown): value is Transaction {
  if (!isPlainRecord(value)) return false;
  const transactionTypes = ['receive', 'send', 'faucet', 'vault_deposit', 'vault_payout', 'inheritance_claim'];
  const statuses = ['confirmed', 'pending', 'failed'];
  return (
    typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.txid === 'string' && /^[0-9a-f]{64}$/i.test(value.txid) &&
    typeof value.type === 'string' && transactionTypes.includes(value.type) &&
    typeof value.amountSats === 'number' && Number.isSafeInteger(value.amountSats) && value.amountSats >= 0 &&
    typeof value.feeSats === 'number' && Number.isSafeInteger(value.feeSats) && value.feeSats >= 0 &&
    typeof value.status === 'string' && statuses.includes(value.status) &&
    typeof value.timestamp === 'number' && Number.isFinite(value.timestamp) &&
    typeof value.counterparty === 'string' &&
    typeof value.confirmations === 'number' && Number.isSafeInteger(value.confirmations) && value.confirmations >= 0
  );
}

function isInheritancePlan(value: unknown): value is InheritancePlan {
  return isPlainRecord(value) &&
    typeof value.enabled === 'boolean' &&
    typeof value.nomineeName === 'string' &&
    typeof value.nomineePhone === 'string' &&
    typeof value.nomineeRelationship === 'string' &&
    Number.isInteger(value.checkInIntervalDays) && (value.checkInIntervalDays as number) > 0 &&
    Number.isInteger(value.gracePeriodDays) && (value.gracePeriodDays as number) >= 0 &&
    typeof value.lastCheckedInAt === 'number' && Number.isFinite(value.lastCheckedInAt) &&
    typeof value.allocatedPercent === 'number' && Number.isFinite(value.allocatedPercent) && value.allocatedPercent >= 0 && value.allocatedPercent <= 100 &&
    ['active', 'grace_period', 'triggered', 'claimed'].includes(String(value.status));
}

const FREQUENCIES = ['daily', 'weekly', 'monthly'];

function isSipPlan(value: unknown): value is SipPlan {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.name === 'string' &&
    typeof value.amountInr === 'number' && Number.isFinite(value.amountInr) && value.amountInr >= 0 &&
    FREQUENCIES.includes(String(value.frequency)) &&
    typeof value.upiId === 'string' &&
    typeof value.mandateId === 'string' &&
    ['active', 'paused', 'completed'].includes(String(value.status)) &&
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) &&
    typeof value.nextExecutionAt === 'number' && Number.isFinite(value.nextExecutionAt) &&
    typeof value.totalInvestedInr === 'number' && Number.isFinite(value.totalInvestedInr) && value.totalInvestedInr >= 0 &&
    typeof value.totalAccumulatedSats === 'number' && Number.isSafeInteger(value.totalAccumulatedSats) && value.totalAccumulatedSats >= 0 &&
    (value.lastExecutedAt === undefined || (typeof value.lastExecutedAt === 'number' && Number.isFinite(value.lastExecutedAt)))
  );
}

function isGroupMember(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.id === 'string' && typeof value.name === 'string' &&
    typeof value.phone === 'string' && typeof value.upiId === 'string' &&
    typeof value.isCurrentUser === 'boolean' &&
    typeof value.hasContributedThisPeriod === 'boolean' &&
    typeof value.totalContributedInr === 'number' && Number.isFinite(value.totalContributedInr) && value.totalContributedInr >= 0 &&
    typeof value.shareSats === 'number' && Number.isSafeInteger(value.shareSats) && value.shareSats >= 0
  );
}

function isGroupInvestmentPool(value: unknown): value is GroupInvestmentPool {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.name === 'string' && typeof value.description === 'string' &&
    typeof value.targetInr === 'number' && Number.isFinite(value.targetInr) && value.targetInr >= 0 &&
    FREQUENCIES.includes(String(value.frequency)) &&
    typeof value.amountPerMemberInr === 'number' && Number.isFinite(value.amountPerMemberInr) && value.amountPerMemberInr >= 0 &&
    typeof value.totalPooledSats === 'number' && Number.isSafeInteger(value.totalPooledSats) && value.totalPooledSats >= 0 &&
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) &&
    Array.isArray(value.members) && value.members.every(isGroupMember)
  );
}

function isInvestmentExecution(value: unknown): value is InvestmentExecution {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.id === 'string' && value.id.length > 0 &&
    (value.planId === undefined || typeof value.planId === 'string') &&
    (value.poolId === undefined || typeof value.poolId === 'string') &&
    ['sip_autopay', 'instant_buy', 'group_pool_contribution'].includes(String(value.type)) &&
    typeof value.title === 'string' &&
    typeof value.amountInr === 'number' && Number.isFinite(value.amountInr) && value.amountInr >= 0 &&
    typeof value.satsReceived === 'number' && Number.isSafeInteger(value.satsReceived) && value.satsReceived >= 0 &&
    typeof value.btcPriceInr === 'number' && Number.isFinite(value.btcPriceInr) && value.btcPriceInr >= 0 &&
    typeof value.timestamp === 'number' && Number.isFinite(value.timestamp) &&
    typeof value.upiRef === 'string' && typeof value.txid === 'string'
  );
}

function isVaultMember(value: unknown): boolean {
  return isPlainRecord(value) &&
    typeof value.id === 'string' && typeof value.name === 'string' &&
    typeof value.phone === 'string' && typeof value.role === 'string' &&
    typeof value.isCurrentUser === 'boolean' &&
    typeof value.publicKey === 'string' && typeof value.avatarColor === 'string';
}

function isVaultProposal(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;
  const signaturesValid = Array.isArray(value.signatures) && value.signatures.every((signature) =>
    isPlainRecord(signature) &&
    typeof signature.memberPhone === 'string' && typeof signature.memberName === 'string' &&
    typeof signature.signedAt === 'number' && Number.isFinite(signature.signedAt) &&
    typeof signature.signatureHex === 'string'
  );
  return (
    typeof value.id === 'string' && typeof value.vaultId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.amountSats === 'number' && Number.isSafeInteger(value.amountSats) && value.amountSats >= 0 &&
    typeof value.toAddress === 'string' && typeof value.recipientName === 'string' &&
    typeof value.createdBy === 'string' && typeof value.creatorPhone === 'string' &&
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) &&
    typeof value.requiredSignatures === 'number' && Number.isInteger(value.requiredSignatures) && value.requiredSignatures > 0 &&
    signaturesValid &&
    ['pending', 'ready_to_broadcast', 'broadcasted', 'rejected'].includes(String(value.status)) &&
    (value.txid === undefined || typeof value.txid === 'string') &&
    (value.note === undefined || typeof value.note === 'string')
  );
}

function isVault(value: unknown): value is Vault {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.name === 'string' && typeof value.tagline === 'string' &&
    ['2-of-2', '2-of-3', '3-of-5'].includes(String(value.threshold)) &&
    typeof value.p2wshAddress === 'string' && /^tb1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$/i.test(value.p2wshAddress) &&
    typeof value.witnessScriptHex === 'string' && /^(?:[0-9a-f]{2})+$/i.test(value.witnessScriptHex) &&
    typeof value.balanceSats === 'number' && Number.isSafeInteger(value.balanceSats) && value.balanceSats >= 0 &&
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) &&
    typeof value.colorTheme === 'string' &&
    Array.isArray(value.members) && value.members.every(isVaultMember) &&
    Array.isArray(value.proposals) && value.proposals.every(isVaultProposal)
  );
}

export function loadUserProfile(): UserProfile | null {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isUserProfile(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(user: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '3');
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function loadWalletState(): WalletState | null {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.WALLET);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isWalletState(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveWalletState(wallet: WalletState): void {
  localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '3');
  localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(wallet));
}

export function loadTransactions(): Transaction[] {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.TXS);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isTransaction) : [];
  } catch {
    return [];
  }
}

export function saveTransactions(txs: Transaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(txs));
}

export function loadVaults(): Vault[] {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.VAULTS);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isVault) : [];
  } catch {
    return [];
  }
}

export function saveVaults(vaults: Vault[]): void {
  localStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(vaults));
}

export function loadInheritancePlan(): InheritancePlan {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.INHERITANCE);
    if (!raw) return DEFAULT_INHERITANCE;
    const value: unknown = JSON.parse(raw);
    return isInheritancePlan(value) ? value : DEFAULT_INHERITANCE;
  } catch {
    return DEFAULT_INHERITANCE;
  }
}

export function saveInheritancePlan(plan: InheritancePlan): void {
  localStorage.setItem(STORAGE_KEYS.INHERITANCE, JSON.stringify(plan));
}

export function loadSipPlans(): SipPlan[] {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.SIPS);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSipPlan) : [];
  } catch {
    return [];
  }
}

export function saveSipPlans(sips: SipPlan[]): void {
  localStorage.setItem(STORAGE_KEYS.SIPS, JSON.stringify(sips));
}

export function loadGroupPools(): GroupInvestmentPool[] {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.GROUP_POOLS);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isGroupInvestmentPool) : [];
  } catch {
    return [];
  }
}

export function saveGroupPools(pools: GroupInvestmentPool[]): void {
  localStorage.setItem(STORAGE_KEYS.GROUP_POOLS, JSON.stringify(pools));
}

export function loadExecutions(): InvestmentExecution[] {
  try {
    migrateLegacyDemoData();
    const raw = localStorage.getItem(STORAGE_KEYS.EXECUTIONS);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isInvestmentExecution) : [];
  } catch {
    return [];
  }
}

export function saveExecutions(execs: InvestmentExecution[]): void {
  localStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(execs));
}

export function clearAllStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.WALLET);
  localStorage.removeItem(STORAGE_KEYS.TXS);
  localStorage.removeItem(STORAGE_KEYS.VAULTS);
  localStorage.removeItem(STORAGE_KEYS.INHERITANCE);
  localStorage.removeItem(STORAGE_KEYS.SIPS);
  localStorage.removeItem(STORAGE_KEYS.GROUP_POOLS);
  localStorage.removeItem(STORAGE_KEYS.EXECUTIONS);
  localStorage.removeItem(STORAGE_KEYS.SCHEMA_VERSION);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_PIN);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_WORDS);
}

export {
  STORAGE_KEYS,
  migrateLegacyDemoData,
  isPlainRecord,
  isUserProfile,
  isUTXO,
  isWalletState,
  isTransaction,
  isInheritancePlan,
  isSipPlan,
  isGroupMember,
  isGroupInvestmentPool,
  isInvestmentExecution,
  isVaultMember,
  isVaultProposal,
  isVault,
};
