/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Users,
  HeartHandshake,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TabType,
  UserProfile,
  WalletState,
  Transaction,
  Vault,
  InheritancePlan,
  SipPlan,
  GroupInvestmentPool,
  InvestmentExecution,
} from './types';
import {
  loadUserProfile,
  saveUserProfile,
  loadWalletState,
  saveWalletState,
  loadTransactions,
  saveTransactions,
  loadVaults,
  loadInheritancePlan,
  saveInheritancePlan,
  loadSipPlans,
  loadGroupPools,
  loadExecutions,
  clearAllStorage,
} from './lib/storage';
import { Header } from './components/common/Header';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { SaveTab } from './components/tabs/SaveTab';
import { InvestTab } from './components/tabs/InvestTab';
import { VaultsTab } from './components/tabs/VaultsTab';
import { ProtectTab } from './components/tabs/ProtectTab';
import { YouTab } from './components/tabs/YouTab';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => loadUserProfile());
  const [wallet, setWallet] = useState<WalletState | null>(() => loadWalletState());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [vaults] = useState<Vault[]>(() => loadVaults());
  const [inheritance, setInheritance] = useState<InheritancePlan>(() => loadInheritancePlan());
  const [sips] = useState<SipPlan[]>(() => loadSipPlans());
  const [groupPools] = useState<GroupInvestmentPool[]>(() => loadGroupPools());
  const [executions] = useState<InvestmentExecution[]>(() => loadExecutions());

  const [activeTab, setActiveTab] = useState<TabType>('save');

  // Sync states to local storage
  const handleUpdateUser = (updatedUser: UserProfile) => {
    saveUserProfile(updatedUser);
    setUser(updatedUser);
  };

  const handleUpdateWallet = (updatedWallet: WalletState) => {
    saveWalletState(updatedWallet);
    setWallet(updatedWallet);
  };

  const handleUpdateInheritance = (updatedPlan: InheritancePlan) => {
    saveInheritancePlan(updatedPlan);
    setInheritance(updatedPlan);
  };

  const handleOnboardingComplete = (newUser: UserProfile, newWallet: WalletState) => {
    // Persist first. Do not transition into the wallet if browser storage failed.
    saveUserProfile(newUser);
    saveWalletState(newWallet);
    saveTransactions([]);

    setUser(newUser);
    setWallet(newWallet);
    setTransactions([]);
  };

  const handleResetApp = () => {
    clearAllStorage();
    setUser(null);
    setWallet(null);
    setTransactions([]);
    setActiveTab('save');
  };

  // If user is not onboarded, show PhonePe-style Onboarding flow
  if (!user || !wallet) {
    return (
      <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans',sans-serif]">
        <OnboardingFlow onComplete={handleOnboardingComplete} existingProfile={user} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-zinc-800 selection:text-white">
      {/* Top App Header */}
      <Header />

      {/* Main Content Area (Max width phone container) */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 pt-3">
        <AnimatePresence mode="wait">
          {activeTab === 'save' && (
            <motion.div
              key="tab-save"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SaveTab
                wallet={wallet}
                transactions={transactions}
                onUpdateWallet={handleUpdateWallet}
              />
            </motion.div>
          )}

          {activeTab === 'invest' && (
            <motion.div
              key="tab-invest"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <InvestTab
                sips={sips || []}
                groupPools={groupPools || []}
                executions={executions || []}
                wallet={wallet}
              />
            </motion.div>
          )}

          {activeTab === 'vaults' && (
            <motion.div
              key="tab-vaults"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <VaultsTab
                vaults={vaults}
              />
            </motion.div>
          )}

          {activeTab === 'protect' && (
            <motion.div
              key="tab-protect"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ProtectTab
                inheritance={inheritance}
                wallet={wallet}
                onUpdateInheritance={handleUpdateInheritance}
              />
            </motion.div>
          )}

          {activeTab === 'you' && (
            <motion.div
              key="tab-you"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <YouTab
                user={user}
                wallet={wallet}
                transactions={transactions || []}
                executions={executions || []}
                onResetApp={handleResetApp}
                onUpdateUser={handleUpdateUser}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 5-Tab Minimalist Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-900 px-2 py-2">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {/* TAB 1: SAVE */}
          <button
            id="nav-tab-save"
            onClick={() => setActiveTab('save')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'save'
                ? 'text-white bg-zinc-900 font-bold border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <Wallet className={`w-4 h-4 ${activeTab === 'save' ? 'text-white' : ''}`} />
            <span className="text-[10px] tracking-tight">Save</span>
          </button>

          {/* TAB 2: INVEST */}
          <button
            id="nav-tab-invest"
            onClick={() => setActiveTab('invest')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'invest'
                ? 'text-white bg-zinc-900 font-bold border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <TrendingUp className={`w-4 h-4 ${activeTab === 'invest' ? 'text-white' : ''}`} />
            <span className="text-[10px] tracking-tight">Invest</span>
          </button>

          {/* TAB 3: VAULTS */}
          <button
            id="nav-tab-vaults"
            onClick={() => setActiveTab('vaults')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'vaults'
                ? 'text-white bg-zinc-900 font-bold border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'vaults' ? 'text-white' : ''}`} />
            <span className="text-[10px] tracking-tight">Vaults</span>
            {vaults.some((v) => v.proposals.some((p) => p.status === 'pending')) && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {/* TAB 4: PROTECT */}
          <button
            id="nav-tab-protect"
            onClick={() => setActiveTab('protect')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'protect'
                ? 'text-white bg-zinc-900 font-bold border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <HeartHandshake className={`w-4 h-4 ${activeTab === 'protect' ? 'text-white' : ''}`} />
            <span className="text-[10px] tracking-tight">Protect</span>
            {inheritance.status === 'triggered' && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </button>

          {/* TAB 5: YOU */}
          <button
            id="nav-tab-you"
            onClick={() => setActiveTab('you')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'you'
                ? 'text-white bg-zinc-900 font-bold border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <User className={`w-4 h-4 ${activeTab === 'you' ? 'text-white' : ''}`} />
            <span className="text-[10px] tracking-tight">You</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
