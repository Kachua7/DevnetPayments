import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, ShieldAlert, ArrowDownLeft, Camera } from 'lucide-react';
import { shortAddress } from '../../lib/constants';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  title?: string;
  subtitle?: string;
  amountSats?: number;
  mode?: 'receive' | 'scan';
  onScanResult?: (scannedAddress: string) => void;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  address,
  title = 'Your Bitcoin Savings Address',
  subtitle = 'Native SegWit (BIP-84) • Testnet Only',
  amountSats,
  mode = 'receive',
  onScanResult,
}) => {
  const [copied, setCopied] = useState(false);
  const [manualInput, setManualInput] = useState('');

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Clipboard access is unavailable. Please copy the address manually.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim() && onScanResult) {
      onScanResult(manualInput.trim());
      onClose();
    }
  };

  return (
    <div id="qr-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'receive' ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center mb-3">
              <ArrowDownLeft className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-white mb-0.5">{title}</h3>
            <p className="text-xs text-zinc-400 mb-5">{subtitle}</p>

            {/* QR Container */}
            <div className="p-4 bg-white rounded-2xl shadow-inner mb-4 flex items-center justify-center">
              <QRCodeSVG
                value={`bitcoin:${address}${amountSats ? `?amount=${amountSats / 100000000}` : ''}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Address Pill */}
            <div className="w-full bg-zinc-900 rounded-xl p-2.5 border border-zinc-800 flex items-center justify-between mb-4">
              <div className="text-left overflow-hidden mr-2">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Testnet Address</div>
                <div className="text-xs font-mono text-zinc-200 truncate">{address}</div>
              </div>
              <button
                id="btn-copy-address"
                onClick={handleCopy}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 active:scale-95 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 text-white" />
              <span>Send only Bitcoin Testnet (tb1q...) coins to this address. Mainnet funds will be lost.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center mb-3">
              <Camera className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-white mb-0.5">Scan Bitcoin QR Code</h3>
            <p className="text-xs text-zinc-400 mb-5">Point camera or paste testnet address</p>

            {/* Simulated Camera Viewfinder */}
            <div className="w-full h-44 rounded-2xl bg-zinc-900 border border-zinc-800 relative flex items-center justify-center overflow-hidden mb-4">
              <div className="text-xs text-zinc-400 z-10 bg-zinc-950/90 px-3 py-1.5 rounded-lg border border-zinc-800">
                Camera viewfinder ready
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="w-full flex flex-col gap-2">
              <div className="text-left text-[11px] text-zinc-400 font-semibold">Or Paste Address / URI</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="tb1q... or bitcoin:tb1q..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
