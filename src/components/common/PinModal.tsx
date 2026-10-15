import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PinModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (pin: string) => void;
  title?: string;
  subtitle?: string;
  verifyAgainstHash?: {
    hash: string;
    salt: string;
    failedAttempts?: number;
    lockoutUntil?: number | null;
    onFailedAttempt?: (failedAttempts: number, lockoutUntil: number | null) => void;
  };
  mode?: 'verify' | 'create' | 'confirm';
  confirmPinToMatch?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Enter 6-Digit Security PIN',
  subtitle = 'Verify the PIN for the encrypted recovery phrase stored in this browser.',
  verifyAgainstHash,
  mode = 'verify',
  confirmPinToMatch,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    setPin('');
    setError('');
    const attempts = verifyAgainstHash?.failedAttempts ?? 0;
    const storedLockoutUntil = verifyAgainstHash?.lockoutUntil ?? null;
    const remainingSeconds = storedLockoutUntil
      ? Math.ceil((storedLockoutUntil - Date.now()) / 1000)
      : 0;
    setFailedAttempts(attempts);
    setIsLocked(remainingSeconds > 0);
    setLockoutTimer(Math.max(0, remainingSeconds));
    if (storedLockoutUntil !== null && remainingSeconds <= 0) {
      verifyAgainstHash?.onFailedAttempt?.(0, null);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLocked && lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            verifyAgainstHash?.onFailedAttempt?.(0, null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockoutTimer]);

  const handleKeyPress = async (num: string) => {
    if (isLocked || isVerifying) return;
    if (pin.length >= 6) return;

    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 6) {
      if (mode === 'confirm' && confirmPinToMatch) {
        if (newPin !== confirmPinToMatch) {
          triggerError('PINs do not match. Please try again.');
          return;
        }
        onSuccess(newPin);
      } else if (verifyAgainstHash) {
        setIsVerifying(true);
        try {
          const { verifyPin } = await import('../../lib/crypto');
          const isValid = await verifyPin(newPin, verifyAgainstHash.hash, verifyAgainstHash.salt);
          if (isValid) {
            verifyAgainstHash.onFailedAttempt?.(0, null);
            onSuccess(newPin);
          } else {
            const newFailed = failedAttempts + 1;
            const nextLockoutUntil = newFailed >= 5 ? Date.now() + 60_000 : null;
            setFailedAttempts(newFailed);
            verifyAgainstHash.onFailedAttempt?.(newFailed, nextLockoutUntil);
            if (nextLockoutUntil !== null) {
              setIsLocked(true);
              setLockoutTimer(Math.ceil((nextLockoutUntil - Date.now()) / 1000));
              triggerError('Too many failed attempts. PIN locked for 60 seconds.');
            } else {
              triggerError(`Incorrect PIN. ${5 - newFailed} attempts remaining.`);
            }
          }
        } catch {
          triggerError('Unable to verify PIN securely. Please try again.');
        } finally {
          setIsVerifying(false);
        }
      } else {
        // Create or generic verify
        onSuccess(newPin);
      }
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPin('');
    }, 600);
  };

  const handleDelete = () => {
    if (isLocked) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div id="pin-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 text-white flex flex-col items-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4">
          <Shield className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-center tracking-tight text-white mb-1">{title}</h3>
        <p className="text-xs text-zinc-400 text-center max-w-xs mb-6">{subtitle}</p>

        {/* PIN Indicators */}
        <motion.div
          animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center items-center gap-3 mb-6"
        >
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const filled = pin.length > idx;
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
        </motion.div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-200 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700 mb-4 text-center">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLocked && (
          <div className="text-xs text-zinc-300 font-semibold mb-4 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700">
            Locked: try again in {lockoutTimer}s
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              id={`pin-key-${num}`}
              type="button"
              disabled={isLocked || isVerifying}
              onClick={() => handleKeyPress(num.toString())}
              className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-lg font-bold text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white font-medium px-2 py-1 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
          <button
            id="pin-key-0"
            type="button"
            disabled={isLocked || isVerifying}
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-lg font-bold text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            0
          </button>
          <button
            id="pin-key-backspace"
            type="button"
            disabled={isLocked || isVerifying || pin.length === 0}
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[10px] text-zinc-500 text-center flex items-center gap-1">
          <Shield className="w-3 h-3 text-zinc-400" />
          <span>PBKDF2 + AES-GCM Client Encrypted</span>
        </div>
      </motion.div>
    </div>
  );
};
