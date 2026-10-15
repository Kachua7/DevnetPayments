import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  KeyRound,
  FileCode,
  Share2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Vault, VaultProposal } from '../../types';
import {
  formatInr,
  formatBtc,
  formatSats,
  shortAddress,
  formatDate,
} from '../../lib/constants';
import { blockIfIntegrationMissing } from '../../lib/runtime';

interface VaultsTabProps {
  vaults: Vault[];
}

export const VaultsTab: React.FC<VaultsTabProps> = ({
  vaults,
}) => {
  const [selectedVault, setSelectedVault] = useState<Vault | null>(vaults[0] || null);
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);
  const [isNewProposalOpen, setIsNewProposalOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [showWitnessScript, setShowWitnessScript] = useState(false);

  // New Vault Wizard State
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultTagline, setNewVaultTagline] = useState('');
  const [newVaultThreshold, setNewVaultThreshold] = useState<'2-of-2' | '2-of-3' | '3-of-5'>('2-of-3');
  const [member2Name, setMember2Name] = useState('');
  const [member2Phone, setMember2Phone] = useState('');
  const [member3Name, setMember3Name] = useState('');
  const [member3Phone, setMember3Phone] = useState('');

  // New Proposal State
  const [propTitle, setPropTitle] = useState('');
  const [propAmountInr, setPropAmountInr] = useState('');
  const [propToAddress, setPropToAddress] = useState('');
  const [propRecipientName, setPropRecipientName] = useState('');

  const handleCopyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(true);
      window.setTimeout(() => setCopiedAddr(false), 2000);
    } catch {
      window.alert('Clipboard access failed. Copy the address manually.');
    }
  };

  const handleOpenCreateVault = () => {
    setIsCreateVaultOpen(true);
  };

  const handleExecuteCreateVault = () => {
    blockIfIntegrationMissing('Multisig vault creation');
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    blockIfIntegrationMissing('Multisig transaction proposal');
  };

  const handleSignProposal = (_proposal: VaultProposal, _signerMember: any) => {
    blockIfIntegrationMissing('Multisig transaction signing');
  };

  const handleBroadcastProposal = (_proposal: VaultProposal) => {
    blockIfIntegrationMissing('Multisig transaction broadcast');
  };

  return (
    <div className="space-y-4 pb-24 text-white">
      {/* Vault Switcher & Create Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <span>Family & Joint Vaults</span>
          </h2>
          <p className="text-xs text-zinc-400">Multisig preview · signing integration unavailable</p>
        </div>
        <button
          id="btn-create-vault-modal"
          onClick={handleOpenCreateVault}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Vault</span>
        </button>
      </div>

      {/* Vault Pills Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {vaults.map((vault) => {
          const isSelected = selectedVault?.id === vault.id;
          return (
            <button
              key={vault.id}
              onClick={() => setSelectedVault(vault)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{vault.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono border border-zinc-800">
                {vault.threshold}
              </span>
            </button>
          );
        })}
      </div>

      {!selectedVault && (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 text-center space-y-2">
          <ShieldCheck className="w-7 h-7 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No configured vaults</h3>
          <p className="text-xs text-zinc-400">Vault setup, cosigner coordination, signing, and broadcasting are not implemented. No funds are held or protected by this preview.</p>
        </div>
      )}

      {/* Selected Vault Card */}
      {selectedVault && (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">{selectedVault.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                  {selectedVault.threshold} Multisig
                </span>
              </div>
              <p className="text-xs text-zinc-400">{selectedVault.tagline}</p>
            </div>
            <button
              onClick={() => setIsNewProposalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Request Payout</span>
            </button>
          </div>

          {/* Vault Rupee Balance */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Vault Joint Reserve</div>
              <div className="text-2xl font-bold text-white">{formatInr(selectedVault.balanceSats)}</div>
              <div className="text-xs font-mono text-zinc-300">
                {formatBtc(selectedVault.balanceSats)} BTC ({formatSats(selectedVault.balanceSats)} sats)
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Policy</div>
              <div className="text-xs font-bold text-zinc-200">
                {selectedVault.threshold.split('-')[0]} of {selectedVault.members.length} Approvals Needed
              </div>
            </div>
          </div>

          {/* P2WSH Address Pill */}
          <div className="bg-zinc-900 rounded-xl p-2.5 border border-zinc-800 flex items-center justify-between text-xs">
            <div className="overflow-hidden mr-2">
              <div className="text-[10px] text-zinc-400 font-semibold uppercase">P2WSH Witness Address</div>
              <div className="font-mono text-zinc-300 truncate text-[11px]">
                {selectedVault.p2wshAddress}
              </div>
            </div>
            <button
              onClick={() => handleCopyAddress(selectedVault.p2wshAddress)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
            >
              {copiedAddr ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
              <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Witness Script Inspector Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowWitnessScript(!showWitnessScript)}
              className="text-xs text-zinc-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{showWitnessScript ? 'Hide P2WSH Witness Script' : 'Inspect Bitcoin OP_CHECKMULTISIG Script'}</span>
            </button>

            {showWitnessScript && (
              <div className="mt-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1.5">
                <div className="text-zinc-400 text-[10px] uppercase font-bold">Script Structure</div>
                <div className="text-zinc-200">
                  OP_{selectedVault.threshold.split('-')[0]} &lt;{selectedVault.members.length} Public Keys&gt; OP_{selectedVault.members.length} OP_CHECKMULTISIG
                </div>
                <div className="text-zinc-400 text-[10px] uppercase font-bold pt-1">BIP-67 Lexicographical Public Keys</div>
                {selectedVault.members.map((m, idx) => (
                  <div key={idx} className="truncate text-zinc-400 text-[10px]">
                    Key #{idx + 1} ({m.name}): <span className="text-zinc-200">{m.publicKey}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vault Co-Signers List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Co-Signers ({selectedVault.members.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedVault.members.map((member) => (
                <div
                  key={member.id}
                  className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-xs font-bold border border-zinc-700"
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span>{member.name}</span>
                        {member.isCurrentUser && (
                          <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">You</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400">{member.phone}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {member.role}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proposals & Approvals */}
          <div className="space-y-2 pt-2 border-t border-zinc-900">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Payout Proposal Preview
              </span>
              <span className="text-xs text-zinc-300 font-semibold">
                {selectedVault.proposals.length} Proposals
              </span>
            </div>

            {selectedVault.proposals.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs bg-zinc-900/50 rounded-2xl border border-zinc-800/60">
                No local proposals. Creating, signing, and broadcasting multisig transactions are unavailable in this release.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedVault.proposals.map((prop) => {
                  const currentSigs = prop.signatures.length;
                  const reqSigs = prop.requiredSignatures;
                  const isReady = prop.status === 'ready_to_broadcast';
                  const isDone = prop.status === 'broadcasted';

                  return (
                    <div
                      key={prop.id}
                      className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-bold text-white">{prop.title}</div>
                          <div className="text-xs text-zinc-300 font-semibold">
                            {formatInr(prop.amountSats)} • {formatSats(prop.amountSats)} sats
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            To: {prop.recipientName} ({shortAddress(prop.toAddress, 8, 4)})
                          </div>
                        </div>
                        <div
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            isDone
                              ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                              : isReady
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {isDone ? 'Broadcasted' : isReady ? 'Ready (Threshold Met)' : 'Awaiting Signatures'}
                        </div>
                      </div>

                      {/* Local Signature Data Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-400">
                          <span>Local Signature Data</span>
                          <span className="font-bold text-white font-mono">
                            {currentSigs} of {reqSigs} Signed
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-white transition-all"
                            style={{ width: `${Math.min(100, (currentSigs / reqSigs) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Signed By Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prop.signatures.map((sig, idx) => (
                          <div
                            key={idx}
                            className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>Signed by {sig.memberName}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      {!isDone && (
                        <div className="flex gap-2 pt-2 border-t border-zinc-800">
                          {/* Sign as second party */}
                          {selectedVault.members
                            .filter((m) => !prop.signatures.some((s) => s.memberPhone === m.phone))
                            .map((otherMember) => (
                              <button
                                key={otherMember.id}
                                type="button"
                                onClick={() => handleSignProposal(prop, otherMember)}
                                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-700 cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Sign as {otherMember.name.split(' ')[0]}</span>
                              </button>
                            ))}

                          {/* Broadcast when ready */}
                          {isReady && (
                            <button
                              type="button"
                              onClick={() => handleBroadcastProposal(prop)}
                              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Broadcast P2WSH to Testnet</span>
                            </button>
                          )}
                        </div>
                      )}

                      {prop.txid && (
                        <div className="text-[10px] text-zinc-400 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-800 break-all">
                          TxID: <span className="text-zinc-200">{prop.txid}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Vault Modal */}
      {isCreateVaultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-5 text-white max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold">Create Multisig Vault</h3>
              </div>
              <button
                onClick={() => setIsCreateVaultOpen(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Vault Name</label>
                <input
                  type="text"
                  placeholder="e.g. Agarwal Gold Locker, Startup Ops"
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Signature Threshold</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['2-of-2', '2-of-3', '3-of-5'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewVaultThreshold(t)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        newVaultThreshold === t
                          ? 'border-white bg-white text-black'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Co-signer 2 */}
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-2">
                <div className="text-xs font-bold text-zinc-300">Co-Signer #2</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. Spouse)"
                    value={member2Name}
                    onChange={(e) => setMember2Name(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="tel"
                    placeholder="+91 98112 34567"
                    value={member2Phone}
                    onChange={(e) => setMember2Phone(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Co-signer 3 if 2-of-3 or 3-of-5 */}
              {newVaultThreshold !== '2-of-2' && (
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <div className="text-xs font-bold text-zinc-300">Co-Signer #3 (Guardian)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name (e.g. Father)"
                      value={member3Name}
                      onChange={(e) => setMember3Name(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="tel"
                      placeholder="+91 98450 12345"
                      value={member3Phone}
                      onChange={(e) => setMember3Phone(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExecuteCreateVault}
                className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Derive P2WSH Address & Create Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Proposal Modal */}
      {isNewProposalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-5 text-white space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold">Request Vault Payout</h3>
              <button
                onClick={() => setIsNewProposalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded-lg"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Purpose / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Gold, Office Vendor Payment"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Amount (₹ Rupees)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={propAmountInr}
                  onChange={(e) => setPropAmountInr(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Recipient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Joyalukkas Jewellers"
                  value={propRecipientName}
                  onChange={(e) => setPropRecipientName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Recipient Testnet Address</label>
                <input
                  type="text"
                  required
                  placeholder="tb1q..."
                  value={propToAddress}
                  onChange={(e) => setPropToAddress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-sm cursor-pointer transition-colors"
              >
                Sign with Your Key & Submit Proposal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

