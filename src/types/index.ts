export type TabType = 'save' | 'invest' | 'vaults' | 'protect' | 'you';

export type SipFrequency = 'daily' | 'weekly' | 'monthly';

export interface SipPlan {
  id: string;
  name: string;
  amountInr: number;
  frequency: SipFrequency;
  upiId: string;
  mandateId: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  nextExecutionAt: number;
  totalInvestedInr: number;
  totalAccumulatedSats: number;
  lastExecutedAt?: number;
}

export interface GroupMember {
  id: string;
  name: string;
  phone: string;
  upiId: string;
  isCurrentUser: boolean;
  hasContributedThisPeriod: boolean;
  totalContributedInr: number;
  shareSats: number;
}

export interface GroupInvestmentPool {
  id: string;
  name: string;
  description: string;
  targetInr: number;
  frequency: SipFrequency;
  amountPerMemberInr: number;
  totalPooledSats: number;
  createdAt: number;
  members: GroupMember[];
}

export interface InvestmentExecution {
  id: string;
  planId?: string;
  poolId?: string;
  type: 'sip_autopay' | 'instant_buy' | 'group_pool_contribution';
  title: string;
  amountInr: number;
  satsReceived: number;
  btcPriceInr: number;
  timestamp: number;
  upiRef: string;
  txid: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  avatarSeed: string;
  createdAt: number;
  isBackedUp: boolean;
  isBiometricEnabled: boolean;
  biometricType?: 'fingerprint' | 'faceid';
  pinHash: string; // Versioned PBKDF2 verifier; legacy profiles migrate after unlock
  pinSalt: string;
  failedPinAttempts: number;
  lockoutUntil: number | null;
  encryptedSeedPhrase: string; // AES-GCM encrypted 12 words with PIN
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number; // in sats
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

export interface WalletState {
  address: string; // Native SegWit tb1q...
  publicKeyHex: string;
  bipPath: string; // m/84'/1'/0'/0/0
  balanceSats: number;
  unconfirmedSats: number;
  utxos: UTXO[];
  lastSyncedAt: number;
  network: 'testnet3';
}

export type TransactionType =
  | 'receive'
  | 'send'
  | 'faucet'
  | 'vault_deposit'
  | 'vault_payout'
  | 'inheritance_claim';

export interface Transaction {
  id: string;
  txid: string;
  type: TransactionType;
  amountSats: number;
  feeSats: number;
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: number;
  counterparty: string;
  counterpartyPhone?: string;
  note?: string;
  blockHeight?: number;
  confirmations: number;
}

export type MultisigThreshold = '2-of-2' | '2-of-3' | '3-of-5';

export interface VaultMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  isCurrentUser: boolean;
  publicKey: string;
  avatarColor: string;
}

export interface VaultProposal {
  id: string;
  vaultId: string;
  title: string;
  amountSats: number;
  toAddress: string;
  recipientName: string;
  createdBy: string;
  creatorPhone: string;
  createdAt: number;
  requiredSignatures: number;
  signatures: {
    memberPhone: string;
    memberName: string;
    signedAt: number;
    signatureHex: string;
  }[];
  status: 'pending' | 'ready_to_broadcast' | 'broadcasted' | 'rejected';
  txid?: string;
  note?: string;
}

export interface Vault {
  id: string;
  name: string;
  tagline: string;
  threshold: MultisigThreshold;
  p2wshAddress: string;
  witnessScriptHex: string;
  balanceSats: number;
  createdAt: number;
  colorTheme: string;
  members: VaultMember[];
  proposals: VaultProposal[];
}

export interface InheritancePlan {
  enabled: boolean;
  nomineeName: string;
  nomineePhone: string;
  nomineeRelationship: string;
  nomineeBtcAddress?: string;
  checkInIntervalDays: number; // 90 (3 mo), 180 (6 mo), 365 (12 mo)
  gracePeriodDays: number; // 30 days
  lastCheckedInAt: number;
  allocatedPercent: number;
  status: 'active' | 'grace_period' | 'triggered' | 'claimed';
  triggerLog?: {
    triggeredAt: number;
    claimedAt?: number;
    claimTxid?: string;
    transferredSats?: number;
  };
}

export interface PresentationSlide {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  bullets: {
    title: string;
    description: string;
    highlight?: string;
  }[];
  keyTakeaway: string;
  speakerNotes: string;
  badge?: string;
}
