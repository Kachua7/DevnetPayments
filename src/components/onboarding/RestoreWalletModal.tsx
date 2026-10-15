import React, { useEffect, useState } from 'react';
import { X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateMnemonic } from '../../lib/crypto';

interface RestoreWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (mnemonic: string[]) => void;
}

export const RestoreWalletModal: React.FC<RestoreWalletModalProps> = ({
  isOpen,
  onClose,
  onRestore,
}) => {
  const [wordsText, setWordsText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setWordsText('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestore = (e: React.FormEvent) => {
    e.preventDefault();
    const words = wordsText
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);

    if (![12, 15, 18, 21, 24].includes(words.length)) {
      setError(`Found ${words.length} words. BIP-39 phrases must contain 12, 15, 18, 21, or 24 words.`);
      return;
    }

    if (!validateMnemonic(words)) {
      setError('The phrase does not pass BIP-39 wordlist and checksum validation. Check every word.');
      return;
    }

    onRestore(words);
    setWordsText('');
    setError('');
  };

  const handleFillSample = () => {
    if (!import.meta.env.DEV) {
      window.alert('Sample recovery phrases are disabled in production.');
      return;
    }
    // Public BIP-39 test vector; never use this well-known phrase for funds.
    setWordsText('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-6 text-white relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer border border-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Restore with Backup Key</h3>
            <p className="text-xs text-zinc-400">Enter your 12-, 15-, 18-, 21-, or 24-word recovery phrase</p>
          </div>
        </div>

        <form onSubmit={handleRestore} className="space-y-4">
          <div>
            <textarea
              rows={4}
              value={wordsText}
              onChange={(e) => {
                setWordsText(e.target.value);
                setError('');
              }}
              placeholder="e.g. apple banana castle dragon elephant forest..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-zinc-400">Testnet only. Never enter a recovery phrase that controls mainnet funds into this prototype.</p>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs text-zinc-400 hover:text-white underline font-medium cursor-pointer"
            >
              Paste Test Demo Seed
            </button>
            <div className="text-[11px] text-zinc-500">BIP-84 SegWit (tb1q)</div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm border border-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow cursor-pointer transition-colors"
            >
              Restore Wallet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
