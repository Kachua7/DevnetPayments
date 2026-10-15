import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Scan,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  X,
  Sparkles,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playBiometricSound, triggerHaptic } from '../../lib/audio';

export type BiometricAuthMode = 'faceid' | 'fingerprint';

interface BiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFallbackToPin?: () => void;
  title?: string;
  subtitle?: string;
  initialMode?: BiometricAuthMode;
  userName?: string;
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onFallbackToPin,
  title = 'Biometric Security Layer',
  subtitle = 'Visual preview only; no device biometric sensor is checked.',
  initialMode = 'faceid',
  userName = 'Wallet owner',
}) => {
  const [mode, setMode] = useState<BiometricAuthMode>(initialMode);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('scanning');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [touchHolding, setTouchHolding] = useState(false);

  // Sync mode with initialMode when opened
  useEffect(() => {
    if (isOpen) {
      const targetMode: BiometricAuthMode = initialMode === 'fingerprint' ? 'fingerprint' : 'faceid';
      setMode(targetMode);
      startScan(targetMode);
    } else {
      setStatus('idle');
      setProgress(0);
      setErrorMessage('');
      setTouchHolding(false);
    }
  }, [isOpen, initialMode]);

  const startScan = (_authMode: BiometricAuthMode = mode) => {
    setStatus('scanning');
    setProgress(40);
    setErrorMessage('');
    playBiometricSound('scan');
    triggerHaptic('light');

    // Biometric hardware sensors (WebAuthn / Secure Enclave) are not connected.
    // Never simulate successful biometric authentication; fail closed and require PIN.
    setTimeout(() => {
      setStatus('failed');
      setProgress(0);
      playBiometricSound('fail');
      triggerHaptic('warning');
      setErrorMessage('Hardware biometric sensor (WebAuthn) is not connected. Authenticate with your 6-digit PIN.');
    }, 450);
  };

  const handleFailSimulation = () => {
    setStatus('failed');
    playBiometricSound('fail');
    triggerHaptic('warning');
    setErrorMessage('Biometric data did not match enrolled profile.');
  };

  const handleModeSwitch = (newMode: BiometricAuthMode) => {
    setMode(newMode);
    startScan(newMode);
  };

  if (!isOpen) return null;

  return (
    <div
      id="biometric-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 text-white relative shadow-2xl overflow-hidden flex flex-col items-center"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Biometric Type Switcher Pill */}
        <div className="flex bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 mb-5 text-xs font-semibold">
          <button
            type="button"
            id="btn-switch-faceid"
            onClick={() => handleModeSwitch('faceid')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'faceid'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Face ID</span>
          </button>
          <button
            type="button"
            id="btn-switch-fingerprint"
            onClick={() => handleModeSwitch('fingerprint')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'fingerprint'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Fingerprint</span>
          </button>
        </div>

        {/* Header Titles */}
        <h3 className="text-base font-bold text-center tracking-tight text-white mb-1">
          {mode === 'faceid' ? 'Face ID UI Preview' : 'Fingerprint UI Preview'}
        </h3>
        <p className="text-xs text-zinc-400 text-center max-w-xs mb-6">
          {userName ? `Visual-only animation for ${userName}; no device sensor is checked.` : subtitle}
        </p>

        {/* Scanning Centerpiece */}
        <div className="relative w-44 h-44 flex items-center justify-center mb-6">
          {mode === 'faceid' ? (
            /* FACE ID SCANNER SIMULATION */
            <div className="relative w-36 h-36 rounded-3xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 p-3 flex items-center justify-center overflow-hidden">
              {/* Corner Viewfinder brackets */}
              <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-white rounded-br-lg" />

              {/* Laser Scanning Beam */}
              {status === 'scanning' && (
                <motion.div
                  animate={{ y: [-55, 55, -55] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] z-10"
                />
              )}

              {/* Visual Facial Silhouette */}
              <div className="flex flex-col items-center justify-center transition-transform">
                {status === 'success' ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                  </motion.div>
                ) : status === 'failed' ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center"
                  >
                    <AlertTriangle className="w-10 h-10" />
                  </motion.div>
                ) : (
                  <div className="relative flex flex-col items-center">
                    <Scan className="w-16 h-16 text-zinc-300 stroke-[1.5]" />
                    {/* Face feature dots */}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* FINGERPRINT SCANNER SIMULATION */
            <div className="relative flex items-center justify-center">
              {/* Radial Ripple Waves */}
              {status === 'scanning' && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0.1, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="absolute w-36 h-36 rounded-full border border-emerald-500/30"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: 0.3 }}
                    className="absolute w-44 h-44 rounded-full border border-zinc-700"
                  />
                </>
              )}

              {/* Central Touch Sensor Button */}
              <button
                type="button"
                id="btn-biometric-touch-sensor"
                onClick={() => startScan('fingerprint')}
                className={`relative w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
                  status === 'success'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-emerald-500/20'
                    : status === 'failed'
                    ? 'border-rose-500 bg-rose-950/30 text-rose-400'
                    : 'border-zinc-700 hover:border-white bg-zinc-900/90 text-zinc-200'
                }`}
              >
                {status === 'success' ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                ) : status === 'failed' ? (
                  <AlertTriangle className="w-12 h-12 text-rose-400" />
                ) : (
                  <Fingerprint className="w-12 h-12 text-zinc-300 hover:text-white transition-colors" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Status Text */}
        <div className="text-center mb-5 min-h-[44px] flex flex-col items-center justify-center">
          {status === 'scanning' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {mode === 'faceid'
                  ? 'Analyzing face geometry & 3D mesh...'
                  : 'Scanning fingerprint ridge patterns...'}
              </span>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Biometric Authenticated • Access Granted</span>
            </motion.div>
          )}

          {status === 'failed' && (
            <div className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage || 'Verification failed. Try again.'}</span>
            </div>
          )}
        </div>

        {/* Action Controls & Fallbacks */}
        <div className="w-full space-y-2.5">
          {status === 'failed' ? (
            <button
              type="button"
              id="btn-retry-biometric"
              onClick={() => startScan(mode)}
              className="w-full py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Biometric Scan</span>
            </button>
          ) : (
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-emerald-400 h-full transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {onFallbackToPin && (
            <button
              type="button"
              id="btn-fallback-pin"
              onClick={onFallbackToPin}
              className="w-full py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-zinc-800 cursor-pointer transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              <span>Use 6-Digit Security PIN Instead</span>
            </button>
          )}

          {/* Tester toggle for evaluators */}
          <div className="pt-2 flex justify-between items-center text-[10px] text-zinc-500 px-1 border-t border-zinc-900">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-zinc-400" />
              <span>Encrypted Secure Enclave Simulation</span>
            </span>
            <button
              type="button"
              onClick={handleFailSimulation}
              className="text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
            >
              Simulate Fail
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
