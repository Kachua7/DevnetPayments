import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Receipt,
  Search,
} from 'lucide-react';
import { Transaction, InvestmentExecution, UserProfile, WalletState } from '../../types';
import {
  formatBtc,
  formatSats,
  shortAddress,
} from '../../lib/constants';

interface TaxReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  executions?: InvestmentExecution[];
  user: UserProfile;
  wallet: WalletState;
}

export interface TaxEntry {
  id: string;
  timestamp: number;
  dateStr: string;
  timeStr: string;
  txid: string;
  type: string;
  isOutflow: boolean;
  amountSats: number;
  amountBtc: string;
  benchmarkRateInr: number | null;
  totalValueInr: number | null;
  costBasisInr: number | null;
  realizedGainInr: number | null;
  taxPayableInr: number | null;
  tdsInr: number | null;
  taxSection: string;
  counterpartyOrNote: string;
}

export const TaxReportModal: React.FC<TaxReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  executions = [],
  user,
  wallet,
}) => {
  const [selectedFy, setSelectedFy] = useState<'FY2024-25' | 'FY2025-26' | 'FY2026-27' | 'all'>('FY2026-27');
  const [filterType, setFilterType] = useState<'all' | 'taxable' | 'inflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // This is an activity ledger only. The app does not yet have trusted
  // historical prices, acquisition lots, tax classifications or provider-verified
  // payment records, so it deliberately does not invent valuations or tax amounts.
  const allEntries: TaxEntry[] = useMemo(() => {
    const transactionEntries: TaxEntry[] = transactions.map((tx) => {
      const date = new Date(tx.timestamp);
      const isOutflow = tx.type === 'send' || tx.type === 'vault_deposit';
      return {
        id: tx.id,
        timestamp: tx.timestamp,
        dateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        timeStr: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        txid: tx.txid,
        type: tx.type === 'send'
          ? 'Wallet Outflow (classification required)'
          : tx.type === 'receive'
          ? 'Wallet Receipt'
          : tx.type === 'faucet'
          ? 'Testnet Activity'
          : tx.type === 'vault_deposit'
          ? 'Vault Outflow (classification required)'
          : tx.type === 'vault_payout'
          ? 'Vault Receipt'
          : 'Inheritance Activity (verification required)',
        isOutflow,
        amountSats: tx.amountSats,
        amountBtc: formatBtc(tx.amountSats),
        benchmarkRateInr: null,
        totalValueInr: null,
        costBasisInr: null,
        realizedGainInr: null,
        taxPayableInr: null,
        tdsInr: null,
        taxSection: 'Not assessed — transaction-level review required',
        counterpartyOrNote: tx.note || tx.counterparty || 'No note recorded',
      };
    });

    const executionEntries: TaxEntry[] = executions.map((execution) => {
      const date = new Date(execution.timestamp);
      return {
        id: execution.id,
        timestamp: execution.timestamp,
        dateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        timeStr: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        txid: execution.txid,
        type: execution.type === 'sip_autopay'
          ? 'SIP Record (provider verification required)'
          : execution.type === 'group_pool_contribution'
          ? 'Group Record (payment verification required)'
          : 'Purchase Record (provider verification required)',
        isOutflow: false,
        amountSats: execution.satsReceived,
        amountBtc: formatBtc(execution.satsReceived),
        benchmarkRateInr: null,
        totalValueInr: null,
        costBasisInr: null,
        realizedGainInr: null,
        taxPayableInr: null,
        tdsInr: null,
        taxSection: 'Not assessed — provider and tax review required',
        counterpartyOrNote: `${execution.title} (${execution.upiRef})`,
      };
    });

    return [...transactionEntries, ...executionEntries].sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, executions]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter((item) => {
      // Date FY filter
      if (selectedFy !== 'all') {
        const date = new Date(item.timestamp);
        const financialYearStart = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
        const selectedStart = Number(selectedFy.slice(2, 6));
        if (financialYearStart !== selectedStart) return false;
      }

      // Type filter
      if (filterType === 'taxable' && !item.isOutflow) return false;
      if (filterType === 'inflow' && item.isOutflow) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNote = item.counterpartyOrNote.toLowerCase().includes(q);
        const matchesTxid = item.txid.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        if (!matchesNote && !matchesTxid && !matchesType) return false;
      }

      return true;
    });
  }, [allEntries, selectedFy, filterType, searchQuery]);

  // Totals for valuation and tax remain null unless every included entry has a
  // verified value; null means unavailable, not zero.
  const summary = useMemo(() => {
    const outflows = filteredEntries.filter((item) => item.isOutflow);
    const inflows = filteredEntries.filter((item) => !item.isOutflow);
    const allHaveValues = (items: TaxEntry[], selector: (item: TaxEntry) => number | null) =>
      items.length > 0 && items.every((item) => selector(item) !== null);
    const total = (items: TaxEntry[], selector: (item: TaxEntry) => number | null) =>
      items.reduce((sum, item) => sum + (selector(item) ?? 0), 0);

    return {
      totalOutflowsInr: allHaveValues(outflows, (item) => item.totalValueInr) ? total(outflows, (item) => item.totalValueInr) : null,
      totalOutflowsSats: total(outflows, (item) => item.amountSats),
      totalInflowsInr: allHaveValues(inflows, (item) => item.totalValueInr) ? total(inflows, (item) => item.totalValueInr) : null,
      totalInflowsSats: total(inflows, (item) => item.amountSats),
      totalRealizedGainsInr: allHaveValues(outflows, (item) => item.realizedGainInr) ? total(outflows, (item) => item.realizedGainInr) : null,
      totalTaxPayableInr: allHaveValues(outflows, (item) => item.taxPayableInr) ? total(outflows, (item) => item.taxPayableInr) : null,
      totalTdsInr: allHaveValues(outflows, (item) => item.tdsInr) ? total(outflows, (item) => item.tdsInr) : null,
      netPortfolioSats: wallet.balanceSats,
    };
  }, [filteredEntries, wallet.balanceSats]);

  // Export CSV Handler
  const handleDownloadCsv = () => {
    const headers = [
      'Date',
      'Time (IST)',
      'Transaction Hash / Reference',
      'Transaction Type',
      'Asset',
      'Quantity (Sats)',
      'Quantity (BTC)',
      'Historical Valuation Rate (INR/BTC; blank if unavailable)',
      'Historical Value (INR; blank if unavailable)',
      'Verified Cost Basis (INR; blank if unavailable)',
      'Realized Gain/Loss (INR; blank if not calculated)',
      'Tax Assessed (INR; blank if not calculated)',
      'TDS Assessed (INR; blank if not calculated)',
      'Counterparty / Note',
      'Tax Review Notes',
    ];

    const csvCell = (value: string | number | null) => {
      if (value === null) return '';
      const raw = String(value);
      const safe = /^[\s\u0000-\u001f]*[=+@\-]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = filteredEntries.map((entry) => [
      entry.dateStr, entry.timeStr, entry.txid, entry.type, 'BTC',
      entry.amountSats, entry.amountBtc, entry.benchmarkRateInr,
      entry.totalValueInr, entry.costBasisInr, entry.realizedGainInr,
      entry.taxPayableInr, entry.tdsInr, entry.counterpartyOrNote, entry.taxSection,
    ].map(csvCell));

    const csvContent = [headers.map(csvCell).join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BitKosh_Activity_Export_${selectedFy}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export JSON Handler
  const handleDownloadJson = () => {
    const reportData = {
      title: 'BitKosh Recorded Activity Export — Tax Review Required',
      financialYear: selectedFy,
      generatedAt: new Date().toISOString(),
      taxpayer: {
        name: user.name,
        phone: user.phone,
        walletAddress: wallet.address,
        network: wallet.network,
      },
      summary,
      transactions: filteredEntries,
      disclaimer:
        'This export is not a tax calculation, audited ledger, or tax advice. Historical prices, acquisition lots, event classification, and provider payment records are not verified by this prototype. Have a qualified tax professional review every event before filing.',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BitKosh_Activity_Export_${selectedFy}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      id="tax-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  VDA Activity & Tax Review
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Tax review required
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Recorded Bitcoin activity; valuations and tax amounts are not calculated
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Taxpayer Meta Banner */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                Assessee / Taxpayer
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{user.name}</span>
                <span className="text-xs font-mono text-zinc-400">({user.phone})</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Wallet: {shortAddress(wallet.address, 12, 8)}
              </div>
            </div>

            {/* Assessment Year Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 ml-1.5" />
              {(['FY2024-25', 'FY2025-26', 'FY2026-27', 'all'] as const).map((fy) => (
                <button
                  key={fy}
                  onClick={() => setSelectedFy(fy)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    selectedFy === fy
                      ? 'bg-white text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {fy === 'all' ? 'All-Time' : fy}
                </button>
              ))}
            </div>
          </div>

          {/* Section 115BBH Executive Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Realized Gains */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Realized Capital Gains
              </div>
              <div className="text-base font-extrabold text-white">
                {summary.totalRealizedGainsInr === null ? 'Not available' : `₹${summary.totalRealizedGainsInr.toLocaleString('en-IN')}`}
              </div>
              <div className="text-[10px] text-zinc-400">Requires verified acquisition lots and event classification</div>
            </div>

            {/* 30% Tax Liability (+ 4% Cess) */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <span>Tax assessed</span>
              </div>
              <div className="text-base font-extrabold text-emerald-400">
                {summary.totalTaxPayableInr === null ? 'Not assessed' : `₹${summary.totalTaxPayableInr.toLocaleString('en-IN')}`}
              </div>
              <div className="text-[10px] text-zinc-400">Not calculated by this prototype</div>
            </div>

            {/* 1% TDS Tracked */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                TDS review required
              </div>
              <div className="text-base font-extrabold text-white">
                {summary.totalTdsInr === null ? 'Not assessed' : `₹${summary.totalTdsInr.toLocaleString('en-IN')}`}
              </div>
              <div className="text-[10px] text-zinc-400">Requires transaction-level review</div>
            </div>

            {/* Total Stacking / Inflows */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Recorded Inflows
              </div>
              <div className="text-base font-extrabold text-white">
                {formatSats(summary.totalInflowsSats)} sats
              </div>
              <div className="text-[10px] text-zinc-400">
                {summary.totalInflowsInr === null ? 'INR valuation unavailable' : `₹${summary.totalInflowsInr.toLocaleString('en-IN')} recorded value`}
              </div>
            </div>
          </div>

          {/* Quick Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
            <div className="flex gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filterType === 'all'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Records ({allEntries.length})
              </button>
              <button
                onClick={() => setFilterType('taxable')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filterType === 'taxable'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Recorded Outflows
              </button>
              <button
                onClick={() => setFilterType('inflow')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filterType === 'inflow'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Inflows & SIPs
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search TxID or Note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Transaction Type</th>
                    <th className="py-2.5 px-3">Volume</th>
                    <th className="py-2.5 px-3">Valuation (₹)</th>
                    <th className="py-2.5 px-3">Capital Gain (₹)</th>
                    <th className="py-2.5 px-3 text-right">Tax & TDS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-[11px]">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No transactions found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-900/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-zinc-300">
                          <div>{item.dateStr}</div>
                          <div className="text-[10px] text-zinc-500">{item.timeStr}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {item.isOutflow ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[150px]">{item.type}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate max-w-[170px]">
                            {item.counterpartyOrNote}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <div className="font-bold text-white">₿ {item.amountBtc}</div>
                          <div className="text-[10px] text-zinc-400">{formatSats(item.amountSats)} sats</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {item.totalValueInr === null ? 'Not available' : `₹${item.totalValueInr.toLocaleString('en-IN')}`}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-zinc-500">
                            {item.realizedGainInr === null ? 'Not calculated' : `₹${item.realizedGainInr.toLocaleString('en-IN')}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="text-zinc-500 text-[10px]">
                            Tax: {item.taxPayableInr === null ? 'not assessed' : `₹${item.taxPayableInr.toLocaleString('en-IN')}`}<br />
                            TDS: {item.tdsInr === null ? 'not assessed' : `₹${item.tdsInr.toLocaleString('en-IN')}`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance & Audit Disclaimer */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5 text-zinc-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-zinc-200">Important:</strong> This is an unverified activity export, not a tax calculation, audited ledger, or legal advice. Historical prices, acquisition lots, event classification, and provider payments are not verified. This report is not cryptographically timestamped on Bitcoin.
            </p>
          </div>
        </div>

        {/* Modal Footer with Download Buttons */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Recorded activity export — not filing-ready</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Download CSV */}
            <button
              id="btn-download-tax-csv"
              onClick={handleDownloadCsv}
              className="py-2 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>

            {/* Download JSON */}
            <button
              id="btn-download-tax-json"
              onClick={handleDownloadJson}
              className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-zinc-800 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>JSON</span>
            </button>

            {/* Print Statement */}
            <button
              id="btn-print-tax-report"
              onClick={handlePrint}
              className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-zinc-800 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
