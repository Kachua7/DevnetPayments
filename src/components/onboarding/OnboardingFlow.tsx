import React, { useState, useEffect } from 'react';
import {
  Shield,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Lock,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  generate12WordMnemonic,
  deriveTestnetSegwitAddress,
  hashPin,
  encryptSeedWithPin,
} from '../../lib/crypto';
import { UserProfile, WalletState } from '../../types';
import { RestoreWalletModal } from './RestoreWalletModal';

interface OnboardingFlowProps {
  onComplete: (user: UserProfile, wallet: WalletState) => void;
  existingProfile?: UserProfile | null;
}

type OnboardingStep = 'phone' | 'otp' | 'words' | 'pin';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, existingProfile = null }) => {
  const [step, setStep] = useState<OnboardingStep>('phone');
  const [phone, setPhone] = useState(() => (existingProfile?.phone ?? '').replace(/^\+91\s*/, '').replace(/\D/g, ''));
  const [name, setName] = useState(() => existingProfile?.name ?? '');
  const [otp, setOtp] = useState('');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  // PIN state
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [createdPin, setCreatedPin] = useState('');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Initialize 12 words on mount
  useEffect(() => {
    const words = generate12WordMnemonic();
    setMnemonic(words);
  }, []);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone) || !name.trim()) return;

    if (existingProfile && !window.confirm(
      'A saved BitKosh profile exists in this browser. Creating a new wallet will replace its encrypted recovery phrase. If you want to recover an existing wallet, choose “I already have a Recovery Phrase” first. Continue and replace the saved profile?'
    )) {
      return;
    }

    // The OTP screen is an explicit demo flow only. No SMS is sent in this build.
    if (import.meta.env.DEV) {
      setStep('otp');
    } else {
      setStep('words');
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!import.meta.env.DEV) {
      window.alert('SMS OTP verification is not implemented. Account verification is disabled until a real SMS provider is connected.');
      return;
    }
    if (otp !== '482910') {
      window.alert('The development demo code is 482910. Real SMS verification is not connected.');
      return;
    }
    setStep('words');
  };

  const handleCopyWords = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic.join(' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Clipboard access is unavailable. Please write the recovery words down offline.');
    }
  };

  const handlePinInput = async (digit: string) => {
    if (currentPinInput.length >= 6) return;
    const nextInput = currentPinInput + digit;
    setCurrentPinInput(nextInput);
    setPinError('');

    if (nextInput.length === 6) {
      if (pinStep === 'create') {
        setCreatedPin(nextInput);
        setCurrentPinInput('');
        setPinStep('confirm');
      } else {
        // Confirm step
        if (nextInput !== createdPin) {
          setPinError('PINs do not match. Please try setting your PIN again.');
          setCurrentPinInput('');
          setCreatedPin('');
          setPinStep('create');
          return;
        }

        // Complete Onboarding!
        await finalizeOnboarding(mnemonic, nextInput);
      }
    }
  };

  const handlePinBackspace = () => {
    setCurrentPinInput((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const finalizeOnboarding = async (seedWords: string[], pin: string) => {
    setIsFinalizing(true);
    setPinError('');
    try {
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const pinH = await hashPin(pin, salt);
      const encryptedSeed = await encryptSeedWithPin(seedWords, pin, salt);
      const { address, publicKeyHex, bipPath } = await deriveTestnetSegwitAddress(seedWords);

      const userProfile: UserProfile = {
        id: `usr_${crypto.randomUUID()}`,
        phone: `+91 ${phone.slice(-10)}`,
        name: name.trim(),
        avatarSeed: phone,
        createdAt: Date.now(),
        // Backup completion is not proven until a recovery-confirmation flow exists.
        isBackedUp: false,
        isBiometricEnabled: false,
        biometricType: 'faceid',
        pinHash: pinH,
        pinSalt: salt,
        failedPinAttempts: 0,
        lockoutUntil: null,
        encryptedSeedPhrase: encryptedSeed,
      };

      const walletState: WalletState = {
        address,
        publicKeyHex,
        bipPath,
        // Never fabricate a starting balance or UTXO. Balance is synced from the network.
        balanceSats: 0,
        unconfirmedSats: 0,
        utxos: [],
        lastSyncedAt: Date.now(),
        network: 'testnet3',
      };

      onComplete(userProfile, walletState);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch {
      setCurrentPinInput('');
      setPinStep('create');
      setCreatedPin('');
      setPinError('Secure wallet setup failed. No wallet was created; please try again in a secure browser context.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleRestoreComplete = (restoredWords: string[]) => {
    setMnemonic(restoredWords);
    setIsRestoreOpen(false);
    setStep('pin');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 max-w-md mx-auto relative overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between pt-2 pb-4 z-10 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-white">
            ₿
          </div>
          <span className="font-bold text-lg tracking-tight">BitKosh</span>
        </div>
        <div className="text-[11px] text-zinc-400 font-semibold px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
          Testnet Prototype
        </div>
      </div>

      {/* Step Contents */}
      <div className="flex-1 flex flex-col justify-center py-4 z-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: PHONE */}
          {step === 'phone' && (
            <motion.div
              key="step-phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-2">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Enter Mobile Number</h2>
                <p className="text-xs text-zinc-400">
                  This creates a local testnet profile in this browser. No account service, SMS verification, UPI, or inheritance service is connected.
                </p>
              </div>

              {existingProfile && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-900/70 bg-amber-950/30 p-3 text-xs text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    A saved profile was found, but its old wallet state was discarded because it contained unverified demo data. Restore using your offline recovery phrase first. Creating a new wallet will replace the saved encrypted phrase.
                  </p>
                </div>
              )}

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Karan Sharma"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Phone Number (+91)</label>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-zinc-500 rounded-2xl px-4 py-3 transition-colors">
                    <span className="text-sm font-bold text-zinc-400 mr-2">🇮🇳 +91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="98765 43210"
                      className="w-full bg-transparent text-sm font-bold text-white focus:outline-none tracking-wider"
                    />
                  </div>
                </div>

                <button
                  id="btn-phone-submit"
                  type="submit"
                  disabled={phone.length < 10}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-bold text-sm flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                >
                  <span>{import.meta.env.DEV ? 'Continue to demo OTP' : 'Continue to wallet setup'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  id="btn-restore-wallet"
                  type="button"
                  onClick={() => setIsRestoreOpen(true)}
                  className="text-xs text-zinc-400 hover:text-white font-semibold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>I already have a Recovery Phrase</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: OTP */}
          {step === 'otp' && (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Verify OTP</h2>
                <p className="text-xs text-zinc-400">
                  Development demo only. No SMS is sent to <span className="text-white font-semibold">+91 {phone}</span>.
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="482910"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center font-mono font-bold text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-zinc-500"
                  />
                  <div className="text-[11px] text-zinc-400 text-center mt-2 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>Development-only demo code: 482910</span>
                  </div>
                </div>

                <button
                  id="btn-otp-verify"
                  type="submit"
                  disabled={otp.length < 6}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-bold text-sm flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                >
                  <span>Continue to testnet wallet</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex justify-between text-xs text-zinc-400 px-1">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="hover:text-white cursor-pointer"
                >
                  Change phone number
                </button>
                <span className="text-zinc-600" aria-disabled="true">SMS resend unavailable</span>
              </div>
            </motion.div>
          )}

          {/* STEP 3: 12 WORDS */}
          {step === 'words' && (
            <motion.div
              key="step-words"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white border border-zinc-800">
                    Recovery Phrase
                  </span>
                  <span className="text-xs text-zinc-400">Client-Side Seed</span>
                </div>
                <h2 className="text-xl font-bold text-white">Your 12-Word Secret Backup Key</h2>
                <p className="text-xs text-zinc-400">
                  Write these words down offline. They recover the testnet wallet derived from this phrase; never enter a phrase that secures mainnet funds into this prototype.
                </p>
              </div>

              {/* 12-Word Grid */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 grid grid-cols-3 gap-2">
                {mnemonic.map((word, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-900 rounded-xl px-2 py-1.5 border border-zinc-800 flex items-center justify-between"
                  >
                    <span className="text-[10px] font-bold text-zinc-500">#{idx + 1}</span>
                    <span className="text-xs font-mono font-bold text-zinc-200">{word}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCopyWords}
                  className="text-xs text-zinc-300 hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy 12 Words'}</span>
                </button>
                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <AlertTriangle className="w-3 h-3 text-white" />
                  <span>No screenshots</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                Keep these words offline. The 6-digit PIN encrypts a copy stored in this browser; it is not a secure hardware-backed wallet vault.
              </div>

              <button
                id="btn-words-continue"
                type="button"
                onClick={() => setStep('pin')}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-sm flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
              >
                <span>I've Saved Them • Set 6-Digit PIN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 4: 6-DIGIT PIN */}
          {step === 'pin' && (
            <motion.div
              key="step-pin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-1">
                <Lock className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">
                  {pinStep === 'create' ? 'Set 6-Digit App PIN' : 'Confirm 6-Digit App PIN'}
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  {pinStep === 'create'
                    ? 'This PIN encrypts the recovery phrase stored in this browser. It does not authorize Bitcoin transactions in this prototype.'
                    : 'Re-enter your 6-digit PIN to confirm.'}
                </p>
              </div>

              {/* PIN Dots */}
              <div className="flex justify-center items-center gap-3 py-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = currentPinInput.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        filled
                          ? 'bg-white shadow-sm scale-110'
                          : 'bg-zinc-900 border border-zinc-800'
                      }`}
                    />
                  );
                })}
              </div>

              {pinError && (
                <div className="text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl">
                  {pinError}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    id={`onboard-pin-${num}`}
                    type="button"
                    disabled={isFinalizing}
                    onClick={() => handlePinInput(num.toString())}
                    className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-lg font-bold text-white transition-all flex items-center justify-center cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <div />
                <button
                  id="onboard-pin-0"
                  type="button"
                  disabled={isFinalizing}
                  onClick={() => handlePinInput('0')}
                  className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-lg font-bold text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  0
                </button>
                <button
                  id="onboard-pin-backspace"
                  type="button"
                  disabled={isFinalizing}
                  onClick={handlePinBackspace}
                  className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  ⌫
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Security Badge */}
      <div className="py-2 text-center border-t border-zinc-900 z-10">
        <div className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-zinc-400" />
          <span>Non-Custodial • Native BIP-84 SegWit • Testnet Only</span>
        </div>
      </div>

      {/* Restore Modal */}
      <RestoreWalletModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onRestore={handleRestoreComplete}
      />
    </div>
  );
};
