import React, { useState } from 'react';
import {
  ShieldAlert,
  HeartHandshake,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { InheritancePlan, WalletState } from '../../types';
import { formatInr, formatDate, shortAddress } from '../../lib/constants';
import { blockIfIntegrationMissing } from '../../lib/runtime';

interface ProtectTabProps {
  inheritance: InheritancePlan;
  wallet: WalletState;
  onUpdateInheritance: (plan: InheritancePlan) => void;
}

export const ProtectTab: React.FC<ProtectTabProps> = ({
  inheritance,
  wallet,
  onUpdateInheritance,
}) => {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Calculate Days Remaining
  const intervalMs = inheritance.checkInIntervalDays * 24 * 3600 * 1000;
  const graceMs = inheritance.gracePeriodDays * 24 * 3600 * 1000;
  const dueDate = inheritance.lastCheckedInAt + intervalMs;
  const graceDeadline = dueDate + graceMs;
  const now = Date.now();

  const isGrace = inheritance.status === 'grace_period' || (now > dueDate && now <= graceDeadline);
  const isTriggered = inheritance.status === 'triggered' || now > graceDeadline;
  const isClaimed = inheritance.status === 'claimed';

  const daysLeft = Math.max(0, Math.ceil((dueDate - now) / (1000 * 3600 * 24)));

  const handleCheckInNow = () => {
    if (!import.meta.env.DEV) {
      window.alert('Inheritance check-ins are stored locally only. A remote monitoring and recovery protocol is not implemented.');
      return;
    }
    onUpdateInheritance({
      ...inheritance,
      lastCheckedInAt: Date.now(),
      status: 'active',
      triggerLog: undefined,
    });
  };

  const handleSimulateMissedCheckIn = () => {
    if (!import.meta.env.DEV) {
      window.alert('The missed-check-in simulator is development-only. A production inheritance protocol is not implemented.');
      return;
    }
    // Simulate deadline expiration
    const expiredTimestamp = Date.now() - (inheritance.checkInIntervalDays + 35) * 24 * 3600 * 1000;
    
    onUpdateInheritance({
      ...inheritance,
      lastCheckedInAt: expiredTimestamp,
      status: 'triggered',
      triggerLog: {
        triggeredAt: Date.now(),
      },
    });

  };

  const handleExecuteNomineeClaim = () => {
    blockIfIntegrationMissing('Inheritance transfer');
  };

  const handleResetToHealthy = () => {
    if (!import.meta.env.DEV) {
      window.alert('Resetting the inheritance simulator is development-only.');
      return;
    }
    onUpdateInheritance({
      ...inheritance,
      lastCheckedInAt: Date.now() - 10 * 24 * 3600 * 1000,
      status: 'active',
      triggerLog: undefined,
    });
  };

  return (
    <div className="space-y-4 pb-24 text-white">
      {/* Title & Tagline */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-white" />
            <span>Inheritance Protection</span>
          </h2>
          <p className="text-xs text-zinc-400">Local inheritance planner · protocol not implemented</p>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
          Not activated
        </span>
      </div>

      {/* Main Status Hero Card */}
      <div
        className="rounded-3xl p-5 border border-zinc-800 bg-zinc-950 shadow-sm transition-all relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isClaimed
                  ? 'bg-zinc-400'
                  : isTriggered
                  ? 'bg-white animate-pulse'
                  : isGrace
                  ? 'bg-zinc-400 animate-pulse'
                  : 'bg-white'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {isClaimed
                ? 'Claim status unverified'
                : isTriggered
                ? 'Local timer expired · no claim available'
                : isGrace
                ? 'Grace Period Warning (Check-in Due)'
                : 'Local timer only · not enforced'}
            </span>
          </div>

          <span className="text-[11px] font-mono text-zinc-400">
            {inheritance.checkInIntervalDays} Days Cycle
          </span>
        </div>

        {/* Big Countdown / Action */}
        {!isTriggered && !isClaimed ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{daysLeft}</span>
              <span className="text-sm font-medium text-zinc-400">days until the local reminder is due</span>
            </div>

            <div className="text-xs text-zinc-400">
              Last local check-in: <span className="text-white font-medium">{formatDate(inheritance.lastCheckedInAt)}</span>
            </div>

            {/* Pulse Button */}
            <button
              id="btn-checkin-pulse"
              onClick={handleCheckInNow}
              className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>I'm Safe — Check In Now (Reset Timer)</span>
            </button>
          </div>
        ) : isTriggered && !isClaimed ? (
          <div className="space-y-3">
            <div className="text-zinc-200 text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              <span>The local reminder deadline passed. The app cannot monitor check-ins or authorize an inheritance claim.</span>
            </div>
            <div className="text-xs text-zinc-300">
              No nominee has been authorized. This browser-only prototype cannot verify inactivity, authorize a beneficiary, or transfer Bitcoin.
            </div>

            <button
              id="btn-open-nominee-claim"
              onClick={() => setIsClaimModalOpen(true)}
              className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>View integration status</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-zinc-200 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <span>Local status only. No transfer has been verified.</span>
            </div>
            <button
              onClick={handleResetToHealthy}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo to Healthy Active State</span>
            </button>
          </div>
        )}
      </div>

      {/* Nominee Details Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3 shadow-sm">
        <div className="flex justify-between items-center px-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Nominee details (local only)
          </span>
          <span className="text-xs text-zinc-300 font-bold">100% Allocation</span>
        </div>

        <div className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 text-white font-bold flex items-center justify-center text-sm border border-zinc-700">
                {inheritance.nomineeName.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{inheritance.nomineeName}</div>
                <div className="text-[11px] text-zinc-400 font-mono">{inheritance.nomineePhone}</div>
              </div>
            </div>
            <div className="text-[11px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700">
              {inheritance.nomineeRelationship}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 flex justify-between">
            <span>Nominee Address:</span>
            <span className="font-mono text-zinc-300 truncate max-w-[200px]">
              {inheritance.nomineeBtcAddress || 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Protocol Simulation Drill Section */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-4 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldAlert className="w-4 h-4 text-white" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Local timer preview
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Local-only interface preview. No cryptographic time-lock, remote check-in monitor, legal beneficiary workflow, or inheritance transfer is implemented.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            id="btn-simulate-missed-checkin"
            onClick={handleSimulateMissedCheckIn}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <span>Run Failover Simulation</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
          <button
            onClick={handleResetToHealthy}
            className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer border border-zinc-800 transition-colors"
            title="Reset Protocol Status"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nominee Claim Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-5 text-white space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-white" />
                <span>Inheritance integration status</span>
              </h3>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded-lg"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1">
                <div className="text-zinc-400">Claimant</div>
                <div className="text-sm font-bold text-white">{inheritance.nomineeName}</div>
                <div className="text-[11px] text-zinc-400">{inheritance.nomineePhone} ({inheritance.nomineeRelationship})</div>
              </div>

              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1">
                <div className="text-zinc-400">Displayed testnet balance (not claimable)</div>
                <div className="text-lg font-bold text-white">{formatInr(wallet.balanceSats)}</div>
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl">
                This release cannot verify a time-lock or transfer funds. No claim is authorized by opening this screen.
              </div>

              <button
                id="btn-confirm-nominee-claim"
                onClick={handleExecuteNomineeClaim}
                className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-sm cursor-pointer transition-colors"
              >
                Check inheritance integration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

