import React from 'react';
import { Radio } from 'lucide-react';
import { BTC_INR_RATE } from '../../lib/constants';

export const Header: React.FC = () => {
  return (
    <header className="w-full bg-black/90 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold text-base shadow-sm">
            ₿
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm tracking-tight">BitKosh</span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                Testnet Prototype
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>Illustrative · ₹{(BTC_INR_RATE / 100000).toFixed(2)}L/BTC</span>
            </div>
          </div>
        </div>

        {/* Configured network; this view is read-only. */}
        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-white" />
            <span>Testnet3 · read-only</span>
          </div>
        </div>
      </div>
    </header>
  );
};


