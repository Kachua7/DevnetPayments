import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  ArrowUpRight,
  Play,
  Pause,
  Trash2,
  Users,
  Check,
  Calendar,
  CreditCard,
  Zap,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  Sparkles,
  Info,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SipPlan,
  GroupInvestmentPool,
  InvestmentExecution,
  WalletState,
} from '../../types';
import { blockIfIntegrationMissing } from '../../lib/runtime';
import {
  formatInr,
  formatInrRaw,
  formatBtc,
  formatSats,
  inrToSats,
  satsToInr,
  formatDate,
  BTC_INR_RATE,
  shortAddress,
} from '../../lib/constants';

interface InvestTabProps {
  sips: SipPlan[];
  groupPools: GroupInvestmentPool[];
  executions: InvestmentExecution[];
  wallet: WalletState;
}

export const InvestTab: React.FC<InvestTabProps> = ({
  sips = [],
  groupPools = [],
  executions = [],
  wallet,
}) => {
  const safeSips = sips || [];
  const safeGroupPools = groupPools || [];
  const safeExecutions = executions || [];

  const [subSection, setSubSection] = useState<'autopay' | 'group' | 'instant' | 'history'>('autopay');

  // Modals
  const [isCreateSipOpen, setIsCreateSipOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isInstantBuyOpen, setIsInstantBuyOpen] = useState(false);

  // New SIP form state
  const [sipName, setSipName] = useState('');
  const [sipAmount, setSipAmount] = useState('1000');
  const [sipFrequency, setSipFrequency] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [sipUpiId, setSipUpiId] = useState('');

  // New Group Pool form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupTarget, setGroupTarget] = useState('100000');
  const [groupSplitAmount, setGroupSplitAmount] = useState('2000');
  const [groupFrequency, setGroupFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [friendName1, setFriendName1] = useState('');
  const [friendPhone1, setFriendPhone1] = useState('');
  const [friendUpi1, setFriendUpi1] = useState('');

  // Instant Buy form state
  const [instantBuyAmount, setInstantBuyAmount] = useState('2500');
  const [instantUpiId, setInstantUpiId] = useState('');

  // AutoPay Execution loading
  // Calculate totals
  const totalSipInvestedInr = safeSips.reduce((acc, s) => acc + (s.totalInvestedInr || 0), 0);
  const totalSipAccumulatedSats = safeSips.reduce((acc, s) => acc + (s.totalAccumulatedSats || 0), 0);
  const currentSipValueInr = satsToInr(totalSipAccumulatedSats);
  const sipProfitInr = currentSipValueInr - totalSipInvestedInr;
  const sipProfitPercent = totalSipInvestedInr > 0 ? ((sipProfitInr / totalSipInvestedInr) * 100).toFixed(1) : '0.0';

  // These screens remain as UI previews, but no payments, mandates, or shared
  // investment actions are implemented. Every action fails closed.
  const handleCreateSip = (e: React.FormEvent) => {
    e.preventDefault();
    blockIfIntegrationMissing('UPI AutoPay mandate registration');
  };

  const handleTriggerAutoPayNow = (_plan: SipPlan) => {
    blockIfIntegrationMissing('UPI AutoPay execution');
  };

  const handleToggleSipStatus = (_planId: string) => {
    blockIfIntegrationMissing('UPI AutoPay mandate update');
  };

  const handleDeleteSip = (_planId: string) => {
    blockIfIntegrationMissing('UPI AutoPay mandate cancellation');
  };

  const handleExecuteInstantBuy = (e: React.FormEvent) => {
    e.preventDefault();
    blockIfIntegrationMissing('Instant Bitcoin purchase');
  };

  const handleCreateGroupPool = (e: React.FormEvent) => {
    e.preventDefault();
    blockIfIntegrationMissing('Shared group-investment setup');
  };

  const handleContributeToPool = (_poolId: string) => {
    blockIfIntegrationMissing('Group-pool contribution');
  };

  return (
    <div className="space-y-4 pb-24 text-white">
      {/* Portfolio Overview Card - Minimal Monochrome */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Bitcoin investment previews · no live pricing
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>UPI integration unavailable</span>
          </div>
        </div>

        {/* Big Numbers */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <div className="text-[11px] text-zinc-400">Total Value</div>
            <div className="text-2xl font-bold tracking-tight text-white mt-0.5">
              {formatInr(totalSipAccumulatedSats)}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
              ₿ {formatBtc(totalSipAccumulatedSats)} BTC
            </div>
          </div>
          <div className="border-l border-zinc-800 pl-4">
            <div className="text-[11px] text-zinc-400">Total Invested</div>
            <div className="text-2xl font-bold tracking-tight text-zinc-200 mt-0.5">
              {formatInrRaw(totalSipInvestedInr)}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-0.5 flex items-center gap-1">
              <span>P&L:</span>
              <span className="text-white font-medium">+{formatInrRaw(Math.max(0, sipProfitInr))} ({sipProfitPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Top Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900">
          <button
            id="btn-new-autopay-sip"
            onClick={() => setIsCreateSipOpen(true)}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start Monthly SIP</span>
          </button>
          <button
            id="btn-instant-buy-btc"
            onClick={() => setIsInstantBuyOpen(true)}
            className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs border border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Buy (UPI)</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex rounded-2xl bg-zinc-950 p-1 border border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setSubSection('autopay')}
          className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer ${
            subSection === 'autopay'
              ? 'bg-zinc-800 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          AutoPay Previews ({safeSips.length})
        </button>
        <button
          onClick={() => setSubSection('group')}
          className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer ${
            subSection === 'group'
              ? 'bg-zinc-800 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Friends Pools ({safeGroupPools.length})
        </button>
        <button
          onClick={() => setSubSection('history')}
          className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer ${
            subSection === 'history'
              ? 'bg-zinc-800 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Debits Log ({safeExecutions.length})
        </button>
      </div>

      {/* SUB-SECTION 1: AUTOPAY SIP MANDATES */}
      {subSection === 'autopay' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Saved AutoPay previews (local only)
            </span>
            <button
              onClick={() => setIsCreateSipOpen(true)}
              className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Plan</span>
            </button>
          </div>

          {safeSips.length === 0 ? (
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No Saved AutoPay Preview</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  UPI payment and mandate services are not connected in this build. No mandate can be created.
                </p>
              </div>
              <button
                onClick={() => setIsCreateSipOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-white text-black font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First SIP</span>
              </button>
            </div>
          ) : (
            safeSips.map((plan) => {
              const estSats = inrToSats(plan.amountInr);

              return (
                <div
                  key={plan.id}
                  className="rounded-3xl bg-zinc-950 border border-zinc-800 p-4 space-y-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            plan.status === 'active'
                              ? 'bg-zinc-900 text-zinc-200 border-zinc-700'
                              : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                          }`}
                        >
                          {plan.status === 'active' ? 'Saved preview' : 'Paused preview'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {plan.frequency === 'monthly' ? 'Monthly debit preview' : plan.frequency === 'weekly' ? 'Weekly debit preview' : 'Daily debit preview'} • {plan.upiId}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        ₹{plan.amountInr}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        ≈ {formatSats(estSats)} sats
                      </div>
                    </div>
                  </div>

                  {/* Mandate Details Pill */}
                  <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-[11px] flex items-center justify-between">
                    <div className="text-zinc-400 font-mono flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                      <span className="text-zinc-300">{plan.mandateId.slice(0, 18)}...</span>
                    </div>
                    <div className="text-zinc-300 font-medium">
                      Next: in {Math.max(1, Math.round((plan.nextExecutionAt - Date.now()) / (24 * 3600 * 1000)))} days
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-900">
                    <div>
                      <span className="text-zinc-400 text-[11px]">Total Stacked:</span>
                      <span className="ml-1 text-white font-mono font-medium">{formatSats(plan.totalAccumulatedSats)} sats</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-400 text-[11px]">Invested:</span>
                      <span className="ml-1 text-white font-medium">₹{plan.totalInvestedInr}</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id={`btn-trigger-autopay-${plan.id}`}
                      disabled={plan.status !== 'active'}
                      onClick={() => handleTriggerAutoPayNow(plan)}
                      className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Check AutoPay integration</span>
                    </button>

                    <button
                      onClick={() => handleToggleSipStatus(plan.id)}
                      className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
                      title={plan.status === 'active' ? 'Pause AutoPay' : 'Resume AutoPay'}
                    >
                      {plan.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleDeleteSip(plan.id)}
                      className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
                      title="Cancel Mandate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-SECTION 2: FRIENDS & GROUP POOLS */}
      {subSection === 'group' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Group Investment Circles
            </span>
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Circle</span>
            </button>
          </div>

          {safeGroupPools.map((pool) => {
            const userMember = (pool.members || []).find((m) => m.isCurrentUser);
            const hasContributed = userMember?.hasContributedThisPeriod;

            return (
              <div
                key={pool.id}
                className="rounded-3xl bg-zinc-950 border border-zinc-800 p-4 space-y-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{pool.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                        {(pool.members || []).length} Members
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{pool.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">₹{pool.amountPerMemberInr}/mo</div>
                    <div className="text-[10px] text-zinc-400">per member</div>
                  </div>
                </div>

                {/* Pool Stacking Progress */}
                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Total Group Sats Stacked</span>
                    <span className="font-mono font-bold text-white">₿ {formatBtc(pool.totalPooledSats)} BTC</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Your Share: <strong className="text-white font-mono">{formatSats(userMember?.shareSats || 0)} sats</strong></span>
                    <span>Target: ₹{pool.targetInr.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Members list */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Member Contribution Status
                  </div>
                  <div className="space-y-1">
                    {(pool.members || []).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-200">{member.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500">{member.upiId}</span>
                        </div>
                        <div>
                          {member.hasContributedThisPeriod ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                              Paid (₹{pool.amountPerMemberInr})
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contribution button */}
                <div className="pt-1">
                  {hasContributed ? (
                    <div className="py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-white" />
                      <span>You've Contributed ₹{pool.amountPerMemberInr} For This Cycle</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleContributeToPool(pool.id)}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Contribute Your Share (₹{pool.amountPerMemberInr} via UPI)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-SECTION 3: EXECUTION / DEBITS LOG */}
      {subSection === 'history' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
            Completed AutoPay & Investment Debits
          </div>

          {safeExecutions.length === 0 ? (
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 text-center text-xs text-zinc-400">
              No past debits recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {safeExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                      {exec.type === 'sip_autopay' ? <Calendar className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{exec.title}</div>
                      <div className="text-[11px] text-zinc-400">{formatDate(exec.timestamp)} • {exec.upiRef}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-white">+{formatSats(exec.satsReceived)} sats</div>
                    <div className="text-[11px] text-zinc-400 font-mono">₹{exec.amountInr}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE NEW SIP AUTOPAY */}
      <AnimatePresence>
        {isCreateSipOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">New Bitcoin UPI AutoPay</h3>
                  <p className="text-xs text-zinc-400">Preview only · no UPI mandate provider is connected</p>
                </div>
                <button
                  onClick={() => setIsCreateSipOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSip} className="space-y-3.5">
                {/* Plan Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Plan Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly Wealth Fund"
                    value={sipName}
                    onChange={(e) => setSipName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Amount per Auto-Debit (₹)</label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={sipAmount}
                    onChange={(e) => setSipAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <div className="flex gap-1.5">
                    {['500', '1000', '2500', '5000'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSipAmount(preset)}
                        className={`flex-1 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          sipAmount === preset
                            ? 'bg-white text-black border-white'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">AutoPay Frequency</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'daily', label: 'Daily' },
                    ].map((freq) => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setSipFrequency(freq.id as any)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          sipFrequency === freq.id
                            ? 'bg-white text-black border-white'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* UPI VPA */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">UPI Handle / VPA</label>
                  <input
                    type="text"
                    required
                    value={sipUpiId}
                    onChange={(e) => setSipUpiId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <span className="text-[10px] text-zinc-500">
                    UPI mandate integration is unavailable. Submitting this form will not create a bank mandate.
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Estimated Sats:</span>
                    <span className="font-mono font-bold text-white">≈ {formatSats(inrToSats(parseFloat(sipAmount) || 0))} sats</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Delivery Address:</span>
                    <span className="font-mono text-zinc-300">{shortAddress(wallet.address, 6, 4)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <span>Check UPI integration</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: INSTANT BUY VIA UPI */}
      <AnimatePresence>
        {isInstantBuyOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Instant Bitcoin Buy</h3>
                  <p className="text-xs text-zinc-400">Preview only · UPI purchase integration is unavailable</p>
                </div>
                <button
                  onClick={() => setIsInstantBuyOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

                              <form onSubmit={handleExecuteInstantBuy} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Amount in ₹</label>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      required
                      value={instantBuyAmount}
                      onChange={(e) => setInstantBuyAmount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-base font-bold placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                    <div className="grid grid-cols-4 gap-1.5">
                      {['500', '1000', '2500', '10000'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setInstantBuyAmount(val)}
                          className={`py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            instantBuyAmount === val
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                          }`}
                        >
                          ₹{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">Your UPI ID</label>
                    <input
                      type="text"
                      required
                      value={instantUpiId}
                      onChange={(e) => setInstantUpiId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Rate:</span>
                      <span className="font-mono text-white">Illustrative rate only · 1 BTC ≈ ₹{(BTC_INR_RATE / 100000).toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">You Receive:</span>
                      <span className="font-mono font-bold text-white">≈ {formatSats(inrToSats(parseFloat(instantBuyAmount) || 0))} sats</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <span>Check purchase integration</span>
                  </button>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE GROUP POOL */}
      <AnimatePresence>
        {isCreateGroupOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">New Friends Stacking Circle</h3>
                  <p className="text-xs text-zinc-400">Pool recurring Bitcoin investments with friends</p>
                </div>
                <button
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGroupPool} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Circle Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Goa Trip 2025 BTC Fund"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">Target (₹)</label>
                    <input
                      type="number"
                      required
                      value={groupTarget}
                      onChange={(e) => setGroupTarget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">Monthly Split (₹)</label>
                    <input
                      type="number"
                      required
                      value={groupSplitAmount}
                      onChange={(e) => setGroupSplitAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                {/* Invite Friend */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-900">
                  <label className="text-xs font-semibold text-zinc-300">Invite Friend #1</label>
                  <input
                    type="text"
                    placeholder="Friend's Name (e.g. Aman)"
                    value={friendName1}
                    onChange={(e) => setFriendName1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <input
                    type="text"
                    placeholder="Friend's UPI ID (e.g. aman@ybl)"
                    value={friendUpi1}
                    onChange={(e) => setFriendUpi1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <span>Preview Group Setup (no invites sent)</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
