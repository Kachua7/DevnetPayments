import React, { useState } from 'react';
import {
  QrCode,
  Send,
  ArrowDownLeft,
  Coins,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Sliders,
} from 'lucide-react';
import {
  formatInr,
  formatBtc,
  formatSats,
  satsToInr,
  inrToSats,
  shortAddress,
  formatDate,
  BTC_INR_RATE,
} from '../../lib/constants';
import { WalletState, Transaction } from '../../types';
import { fetchTestnetAddressBalance, fetchTestnetUTXOs } from '../../lib/blockstream';
import { QrModal } from '../common/QrModal';

interface SaveTabProps {
  wallet: WalletState;
  transactions: Transaction[];
  onUpdateWallet: (wallet: WalletState) => void;
}

export const SaveTab: React.FC<SaveTabProps> = ({
  wallet,
  transactions,
  onUpdateWallet,
}) => {
  const [isQrReceiveOpen, setIsQrReceiveOpen] = useState(false);
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Send Form State
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmountInput, setSendAmountInput] = useState('');
  const [sendUnit, setSendUnit] = useState<'INR' | 'SATS'>('INR');
  const [sendNote, setSendNote] = useState('');
  const [sendError, setSendError] = useState('');

  const calculatedSats =
    sendUnit === 'INR'
      ? inrToSats(parseFloat(sendAmountInput) || 0)
      : parseInt(sendAmountInput, 10) || 0;

  const handleSyncBalance = async () => {
    setIsSyncing(true);
    try {
      const [balance, utxos] = await Promise.all([
        fetchTestnetAddressBalance(wallet.address),
        fetchTestnetUTXOs(wallet.address),
      ]);
      onUpdateWallet({
        ...wallet,
        ...balance,
        utxos,
        lastSyncedAt: Date.now(),
        network: 'testnet3',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      window.alert(`Could not sync with Bitcoin testnet. No local balance was changed. ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFaucetTopup = () => {
    window.alert(
      'BitKosh cannot mint testnet bitcoin. Use a trusted Bitcoin testnet faucet, send funds to your address, then tap Refresh. No local balance was credited.'
    );
  };

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(
      'Sending is disabled in this release: transaction building, signing, trusted fee quotes, and broadcast verification are not implemented. No Bitcoin was sent and no balance was changed.'
    );
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Hero Balance Card - Minimal Monochrome */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 shadow-sm relative overflow-hidden text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Testnet Bitcoin Balance
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-semibold border border-zinc-800">
              Bitcoin testnet only
            </span>
          </div>
          <button
            id="btn-sync-balance"
            onClick={handleSyncBalance}
            disabled={isSyncing}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Refresh on-chain balance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* INR conversion is illustrative; no live market-price source is connected. */}
        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-baseline gap-1">
            <span>{formatInr(wallet.balanceSats)}</span>
          </div>
          <div className="text-[10px] text-zinc-500">Illustrative INR conversion · no live BTC price connected</div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span className="text-zinc-200 font-medium">₿ {formatBtc(wallet.balanceSats)} BTC</span>
            <span>•</span>
            <span>{formatSats(wallet.balanceSats)} sats</span>
          </div>
        </div>

        {/* Mini Address Pill */}
        <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
          <div className="text-zinc-400 flex items-center gap-1 font-mono text-[11px]">
            <span className="text-zinc-300">BIP-84:</span>
            <span>{shortAddress(wallet.address, 10, 6)}</span>
          </div>
          <button
            onClick={() => setIsQrReceiveOpen(true)}
            className="text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Show QR</span>
          </button>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 shadow-sm">
        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3 px-1">
          Instant Actions
        </div>
        <div className="grid grid-cols-4 gap-2">
          {/* Scan */}
          <button
            id="action-scan-qr"
            onClick={() => setIsQrScanOpen(true)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-zinc-900 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-300">Scan QR</span>
          </button>

          {/* Send */}
          <button
            id="action-send-btc"
            onClick={() => setIsSendOpen(true)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-zinc-900 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all shadow-sm">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-300">Send ₹</span>
          </button>

          {/* Receive */}
          <button
            id="action-receive-btc"
            onClick={() => setIsQrReceiveOpen(true)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-zinc-900 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all shadow-sm">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-300">Receive</span>
          </button>

          {/* Topup / Inflow */}
          <button
            id="action-faucet-topup"
            onClick={handleFaucetTopup}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-zinc-900 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all shadow-sm">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-300">Top Up</span>
          </button>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Savings Activity & UTXOs
          </h3>
          <span className="text-xs text-zinc-300 font-medium">
            {transactions.length} Records
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-900 shadow-sm">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No transactions recorded. Receive testnet bitcoin at this address, then tap Refresh; Top Up does not credit funds.
            </div>
          ) : (
            transactions.map((tx) => {
              const isOutgoing = tx.type === 'send' || tx.type === 'vault_deposit';
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-3.5 hover:bg-zinc-900/60 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isOutgoing
                          ? 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                          : 'bg-zinc-900 text-white border border-zinc-800'
                      }`}
                    >
                      {isOutgoing ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{tx.note || (isOutgoing ? 'Sent to' : 'Received from')}</span>
                        <Info
                          className="w-3 h-3 text-zinc-500"
                          aria-label="Locally stored status; not independently verified"
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium">
                        {formatDate(tx.timestamp)} • {shortAddress(tx.counterparty, 8, 4)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-bold ${
                        isOutgoing ? 'text-zinc-400' : 'text-white'
                      }`}
                    >
                      {isOutgoing ? '-' : '+'}
                      {formatInr(tx.amountSats)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {formatSats(tx.amountSats)} sats
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Send Bitcoin Modal / Sheet */}
      {isSendOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 p-5 text-white max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Send Bitcoin</h3>
                  <p className="text-[11px] text-zinc-400">Available: {formatInr(wallet.balanceSats)}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSendOpen(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded-lg"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleInitiateSend} className="space-y-3.5">
              {/* Recipient */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Recipient testnet address (send unavailable)
                </label>
                <input
                  type="text"
                  required
                  placeholder="tb1q… (Bitcoin testnet address)"
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Amount */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Amount
                  </label>
                  <div className="flex rounded-lg bg-zinc-900 p-0.5 text-[10px] font-bold border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setSendUnit('INR')}
                      className={`px-2 py-0.5 rounded-md ${
                        sendUnit === 'INR' ? 'bg-white text-black' : 'text-zinc-400'
                      }`}
                    >
                      ₹ Rupees
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendUnit('SATS')}
                      className={`px-2 py-0.5 rounded-md ${
                        sendUnit === 'SATS' ? 'bg-white text-black' : 'text-zinc-400'
                      }`}
                    >
                      Sats
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-zinc-400">
                    {sendUnit === 'INR' ? '₹' : '⚡'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={sendUnit === 'INR' ? 'e.g. 5000' : 'e.g. 60000'}
                    value={sendAmountInput}
                    onChange={(e) => setSendAmountInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {calculatedSats > 0 && (
                  <div className="mt-1 text-[11px] text-zinc-400 flex justify-between px-1">
                    <span>Illustrative estimate only:</span>
                    <span className="text-zinc-200 font-mono">
                      {sendUnit === 'INR'
                        ? `${formatSats(calculatedSats)} sats (${formatBtc(calculatedSats)} BTC)`
                        : formatInr(calculatedSats)}
                    </span>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Payment Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chai, Groceries, Rent split"
                  value={sendNote}
                  onChange={(e) => setSendNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Network Fee Tier */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Network Fee Quote (unavailable)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['slow', 'normal', 'fast'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      disabled
                      className="p-2 rounded-xl text-left border text-xs border-slate-800 bg-slate-950 text-slate-400"
                    >
                      <div className="font-bold capitalize">{tier}</div>
                      <div className="text-[10px] text-purple-300 font-mono">
                        Not quoted
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {sendError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {sendError}
                </div>
              )}

              <button
                id="btn-confirm-send-proceed"
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Check send integration</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-purple-500/30 p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Transaction Details</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Amount</div>
                <div className="text-lg font-bold text-purple-300">{formatInr(selectedTx.amountSats)}</div>
                <div className="text-[11px] font-mono text-slate-400">
                  {formatBtc(selectedTx.amountSats)} BTC ({formatSats(selectedTx.amountSats)} sats)
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="text-zinc-300 font-semibold">
                    Stored status: {selectedTx.status} · not re-verified
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stored fee</span>
                  <span className="font-mono text-slate-300">{selectedTx.feeSats} sats · unverified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time</span>
                  <span className="text-slate-300">{formatDate(selectedTx.timestamp)}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Bitcoin Testnet TxID</div>
                <div className="font-mono text-[10px] text-purple-300 break-all">{selectedTx.txid}</div>
              </div>

              <a
                href={`https://blockstream.info/testnet/tx/${selectedTx.txid}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View on Blockstream Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <QrModal
        isOpen={isQrReceiveOpen}
        onClose={() => setIsQrReceiveOpen(false)}
        address={wallet.address}
        title="Your Personal Bitcoin Address"
        subtitle="Native SegWit tb1q • PhonePe-Simple"
      />

      <QrModal
        isOpen={isQrScanOpen}
        onClose={() => setIsQrScanOpen(false)}
        address={wallet.address}
        mode="scan"
        onScanResult={(scanned) => {
          setSendRecipient(scanned.replace('bitcoin:', '').split('?')[0]);
          setIsSendOpen(true);
        }}
      />

    </div>
  );
};
