import React, { useEffect, useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Smartphone,
  RotateCcw,
  Check,
  AlertTriangle,
  Fingerprint,
  Radio,
  ExternalLink,
  Receipt,
  Download,
  Scan,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { UserProfile, WalletState, Transaction, InvestmentExecution } from '../../types';
import { decryptSeedWithPin, encryptSeedWithPin, hashPin } from '../../lib/crypto';
import { blockIfIntegrationMissing } from '../../lib/runtime';
import { PinModal } from '../common/PinModal';
import { BiometricModal, BiometricAuthMode } from '../common/BiometricModal';
import { TaxReportModal } from '../tax/TaxReportModal';

interface YouTabProps {
  user: UserProfile;
  wallet: WalletState;
  transactions?: Transaction[];
  executions?: InvestmentExecution[];
  onResetApp: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

export const YouTab: React.FC<YouTabProps> = ({
  user,
  wallet,
  transactions = [],
  executions = [],
  onResetApp,
  onUpdateUser,
}) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricPurpose, setBiometricPurpose] = useState<'reveal_seed' | 'test_scan'>('reveal_seed');
  const [isTaxReportOpen, setIsTaxReportOpen] = useState(false);
  const [decryptedWords, setDecryptedWords] = useState<string[] | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (!decryptedWords) return;
    const timeoutId = window.setTimeout(() => setDecryptedWords(null), 30_000);
    return () => window.clearTimeout(timeoutId);
  }, [decryptedWords]);

  const currentBiometricType: BiometricAuthMode =
    user.biometricType === 'fingerprint' ? 'fingerprint' : 'faceid';

  // Trigger unlock for 12-word seed
  const handleStartReveal = () => {
    // The current biometric screen is only a visual simulation, not WebAuthn.
    // It can never authorize secret recovery in a production bundle.
    if (user.isBiometricEnabled && import.meta.env.DEV) {
      setBiometricPurpose('reveal_seed');
      setIsBiometricModalOpen(true);
    } else {
      setIsPinModalOpen(true);
    }
  };

  const handleTestBiometric = () => {
    blockIfIntegrationMissing('Native biometric authentication');
  };

  // Never let an animation or simulated biometric scan reveal a recovery phrase.
  const handleBiometricSuccess = () => {
    setIsBiometricModalOpen(false);
    if (biometricPurpose === 'reveal_seed') setIsPinModalOpen(true);
  };

  // PIN authentication succeeded
  const handlePinSuccess = async (pin: string) => {
    setIsPinModalOpen(false);
    try {
      const words = await decryptSeedWithPin(
        user.encryptedSeedPhrase,
        pin,
        user.pinSalt
      );
      setDecryptedWords(words);

      // Migrate older, weaker stored verifiers/ciphertext after a successful unlock.
      if (!user.pinHash.startsWith('v2:') || !user.encryptedSeedPhrase.startsWith('v2:')) {
        const [pinHash, encryptedSeedPhrase] = await Promise.all([
          hashPin(pin, user.pinSalt),
          encryptSeedWithPin(words, pin, user.pinSalt),
        ]);
        onUpdateUser({ ...user, pinHash, encryptedSeedPhrase, failedPinAttempts: 0, lockoutUntil: null });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('BIP-39 validation')) {
        alert('This saved recovery phrase is not a valid BIP-39 phrase. Earlier prototype versions generated non-standard phrases; the old displayed address and balance were not a real wallet. Do not reset or overwrite this profile if you may need to preserve its encrypted data.');
      } else {
        alert('Could not unlock the recovery phrase. Check the PIN, and try again.');
      }
    }
  };

  // Toggle biometric enable
  const handleToggleBiometric = () => {
    blockIfIntegrationMissing('Native biometric authentication');
  };

  // Changing this preference would imply native device integration is active.
  const handleSelectBiometricType = (_type: BiometricAuthMode) => {
    blockIfIntegrationMissing('Native biometric authentication');
  };

  return (
    <div className="space-y-4 pb-24 text-white">
      {/* Profile Header */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-black text-lg flex items-center justify-center shadow-sm">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{user.name}</h2>
            <div className="text-xs text-zinc-400 font-mono flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
              <span>{user.phone}</span>
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
          Local Profile
        </span>
      </div>

      {/* 12-Word Secret Backup Card (Biometric / PIN Protected) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3 shadow-sm">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">Secret Recovery Phrase</span>
          </div>
          <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{user.isBackedUp ? 'Backed Up' : 'Backup Not Verified'}</span>
          </span>
        </div>

        <p className="text-xs text-zinc-400 px-1">
          Encrypted in this browser with PBKDF2 + AES-GCM-256. The 6-digit PIN is vulnerable to offline guessing if someone copies browser data; native biometric protection is not connected. Recovery words auto-hide after 30 seconds.
        </p>

        {decryptedWords ? (
          <div className="space-y-3">
            <div className="bg-zinc-900 rounded-2xl p-3 grid grid-cols-3 gap-2 border border-zinc-800">
              {decryptedWords.map((w, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-950 rounded-xl px-2 py-1.5 border border-zinc-800 flex justify-between items-center text-xs"
                >
                  <span className="text-[10px] text-zinc-500 font-bold">#{idx + 1}</span>
                  <span className="font-mono text-zinc-200 font-bold">{w}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDecryptedWords(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Secret Words</span>
            </button>
          </div>
        ) : (
          <button
            id="btn-reveal-seed"
            onClick={handleStartReveal}
            className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {user.isBiometricEnabled ? (
              currentBiometricType === 'faceid' ? (
                <Scan className="w-4 h-4" />
              ) : (
                <Fingerprint className="w-4 h-4" />
              )
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>
              {user.isBiometricEnabled
                ? `Open recovery unlock (${currentBiometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} unavailable)`
                : 'Enter PIN to Reveal Recovery Phrase'}
            </span>
          </button>
        )}
      </div>

      {/* Tax & Regulatory Compliance Card (Section 115BBH) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3 shadow-sm">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">Local Activity Export</span>
          </div>
          <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            Not Tax Advice
          </span>
        </div>

        <p className="text-xs text-zinc-400 px-1">
          Export locally recorded activity for review. This prototype does not verify transaction history, classify taxable events, determine tax, or calculate TDS.
        </p>

        {/* Badges strip */}
        <div className="grid grid-cols-3 gap-2 px-1">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2 text-center">
            <div className="text-[10px] text-zinc-400">Tax calculation</div>
            <div className="text-xs font-bold text-white">Not assessed</div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2 text-center">
            <div className="text-[10px] text-zinc-400">TDS calculation</div>
            <div className="text-xs font-bold text-white">Not assessed</div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2 text-center">
            <div className="text-[10px] text-zinc-400">Export format</div>
            <div className="text-xs font-bold text-white">CSV & JSON</div>
          </div>
        </div>

        {/* Generate Tax Report Button */}
        <button
          id="btn-generate-tax-report"
          onClick={() => setIsTaxReportOpen(true)}
          className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-zinc-800 cursor-pointer transition-all shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export Activity for Review</span>
          <Download className="w-3.5 h-3.5 text-zinc-400 ml-1" />
        </button>
      </div>

      {/* Security & Hardware Section */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3 shadow-sm">
        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 flex items-center justify-between">
          <span>Security & Hardware</span>
          <span className="text-[10px] text-zinc-500 font-mono">Browser-only storage</span>
        </div>

        <div className="space-y-2.5">
          {/* Biometric Toggle Card */}
          <div className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 text-white flex items-center justify-center border border-zinc-700">
                  {currentBiometricType === 'faceid' ? (
                    <Scan className="w-4 h-4" />
                  ) : (
                    <Fingerprint className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Biometric Unlock Layer</div>
                  <div className="text-[10px] text-zinc-400">
                    Native biometric integration unavailable in this build
                  </div>
                </div>
              </div>
              <button
                id="toggle-biometric-auth"
                onClick={handleToggleBiometric}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 border border-zinc-700 ${
                  user.isBiometricEnabled ? 'bg-white' : 'bg-zinc-800'
                }`}
                aria-label="Toggle Biometric Authentication"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform ${
                    user.isBiometricEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            {/* Mode selection buttons if enabled */}
            {user.isBiometricEnabled && (
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectBiometricType('faceid')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentBiometricType === 'faceid'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Face ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBiometricType('fingerprint')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentBiometricType === 'fingerprint'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Fingerprint</span>
                  </button>
                </div>

                {/* Test Biometric Button */}
                <button
                  type="button"
                  id="btn-test-biometric"
                  onClick={handleTestBiometric}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border border-zinc-700 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Test Scan</span>
                </button>
              </div>
            )}
          </div>

          {/* Network Node Status */}
          <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center border border-zinc-700">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Bitcoin Testnet API</div>
                <div className="text-[10px] text-zinc-400">Blockstream REST API · status not pre-verified</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              Unverified
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset App */}
      <div className="pt-2 text-center">
        <button
          id="btn-reset-app"
          onClick={() => setIsResetConfirmOpen(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset App & Clear Local Storage</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-5 text-white space-y-3 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">Reset BitKosh Prototype?</h3>
            <p className="text-xs text-zinc-400">
              This will wipe local encrypted keys, transactions, and custom vaults from this browser. Make sure you have your 12 words written down.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-wipe"
                onClick={onResetApp}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow cursor-pointer transition-colors"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Authentication Modal */}
      <BiometricModal
        isOpen={isBiometricModalOpen}
        onClose={() => setIsBiometricModalOpen(false)}
        onSuccess={handleBiometricSuccess}
        onFallbackToPin={() => {
          setIsBiometricModalOpen(false);
          setIsPinModalOpen(true);
        }}
        initialMode={currentBiometricType}
        userName={user.name}
        title={
          biometricPurpose === 'reveal_seed'
            ? 'Biometric UI Preview'
            : 'Biometric Sensor UI Preview'
        }
        subtitle="Visual preview only; native biometric integration is unavailable."
      />

      {/* Pin Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        verifyAgainstHash={{
          hash: user.pinHash,
          salt: user.pinSalt,
          failedAttempts: user.failedPinAttempts,
          lockoutUntil: user.lockoutUntil,
          onFailedAttempt: (failedPinAttempts, lockoutUntil) =>
            onUpdateUser({ ...user, failedPinAttempts, lockoutUntil }),
        }}
        title="Enter PIN to Reveal Recovery Phrase"
        subtitle="Verify the PIN for the encrypted recovery phrase stored in this browser."
      />

      {/* Tax Report Modal */}
      <TaxReportModal
        isOpen={isTaxReportOpen}
        onClose={() => setIsTaxReportOpen(false)}
        transactions={transactions}
        executions={executions}
        user={user}
        wallet={wallet}
      />
    </div>
  );
};
