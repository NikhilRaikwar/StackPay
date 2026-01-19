import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { bridgeUSDCFromEthereum, pollBridgeStatus } from '../utils/bridgeUtils';

export const BridgeInterface = () => {
  const { address, ethAddress, connectEthereumWallet } = useWallet();
  const [amount, setAmount] = useState('');
  const [bridging, setBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<string>('');
  const [txHash, setTxHash] = useState('');
  const [history, setHistory] = useState<Array<{
    hash: string;
    amount: number;
    date: number;
    status: 'completed' | 'pending' | 'failed'
  }>>(() => {
    const saved = localStorage.getItem('bridge_history');
    return saved ? JSON.parse(saved) : [];
  });

  const saveToHistory = (hash: string, amount: number) => {
    const newTx = {
      hash,
      amount,
      date: Date.now(),
      status: 'pending' as const
    };
    const newHistory = [newTx, ...history];
    setHistory(newHistory);
    localStorage.setItem('bridge_history', JSON.stringify(newHistory));
  };

  const updateHistoryStatus = (hash: string, status: 'completed' | 'pending' | 'failed') => {
    const newHistory = history.map(tx =>
      tx.hash === hash ? { ...tx, status } : tx
    );
    setHistory(newHistory);
    localStorage.setItem('bridge_history', JSON.stringify(newHistory));
  };

  const handleBridge = async () => {
    if (!address || !amount) return;

    if (!ethAddress) {
      await connectEthereumWallet();
    }

    setBridging(true);
    try {
      const hash = await bridgeUSDCFromEthereum(parseFloat(amount), address);
      setTxHash(hash);
      setBridgeStatus('pending');
      saveToHistory(hash, parseFloat(amount));

      pollBridgeStatus(hash, (status) => {
        setBridgeStatus(status);
        updateHistoryStatus(hash, status);
        if (status === 'completed' || status === 'failed') {
          setBridging(false);
        }
      });
    } catch (error) {
      console.error('Bridge error:', error);
      alert('Failed to initiate bridge');
      setBridging(false);
    }
  };

  const loadHistoryItem = (tx: typeof history[0]) => {
    setTxHash(tx.hash);
    setAmount(tx.amount.toString());
    setBridgeStatus(tx.status);

    if (tx.status === 'pending') {
      setBridging(true);
      pollBridgeStatus(tx.hash, (status) => {
        setBridgeStatus(status);
        updateHistoryStatus(tx.hash, status);
        if (status === 'completed' || status === 'failed') {
          setBridging(false);
        }
      });
    }
  };

  const steps = [
    { label: 'ETHEREUM TX', status: txHash ? 'complete' : 'pending' },
    { label: 'ATTESTATION', status: bridgeStatus === 'completed' ? 'complete' : txHash ? 'active' : 'pending' },
    { label: 'STACKS MINT', status: bridgeStatus === 'completed' ? 'complete' : 'pending' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Bridge Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 card-premium p-0 overflow-hidden"
        >
          <div className="p-8 border-b border-app-border bg-app-hover/30">
            <h2 className="font-serif text-4xl mb-1">Bridge</h2>
            <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Cross-Chain Asset Transfer</p>
            
            {/* Visual Flow */}
            <div className="mt-8 p-6 bg-white border border-app-border rounded-3xl flex items-center justify-between gap-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-xl shadow-premium">
                  💎
                </div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Ethereum</p>
                <p className="text-xs font-bold text-text-main">USDC</p>
              </div>

              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full h-px bg-gradient-to-r from-blue-400 via-accent-indigo to-emerald-400 relative">
                  <motion.div
                    animate={{ x: ['-50%', '150%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent-indigo rounded-full shadow-glow-indigo border-2 border-white"
                  />
                </div>
                <span className="text-[10px] font-bold text-text-pale uppercase tracking-[0.2em]">Interchain</span>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-xl shadow-premium">
                  ⚡
                </div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Stacks</p>
                <p className="text-xs font-bold text-text-main">USDCx</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Amount Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Amount to Bridge</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-serif text-text-pale">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="1"
                  className="input-premium pl-10 pr-20 text-3xl font-serif text-accent-indigo h-16"
                  disabled={bridging}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-pale uppercase tracking-widest">
                  USDC
                </span>
              </div>
            </div>

            {/* Destination Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-app-bg/50 rounded-2xl border border-app-border">
                <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest mb-2">From Ethereum</p>
                <p className="text-xs font-mono text-text-dim truncate">
                  {ethAddress || 'Not Connected'}
                </p>
              </div>
              <div className="p-4 bg-app-bg/50 rounded-2xl border border-app-border">
                <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest mb-2">To Stacks</p>
                <p className="text-xs font-mono text-text-dim truncate">
                  {address || 'Not Connected'}
                </p>
              </div>
            </div>

            {/* Action Button */}
            {!ethAddress ? (
              <button onClick={connectEthereumWallet} className="w-full btn-secondary h-16 text-lg">
                Connect Ethereum Wallet
              </button>
            ) : (
              <button
                onClick={handleBridge}
                disabled={bridging || !amount || !address}
                className="w-full btn-primary h-16 text-lg flex items-center justify-center gap-3"
              >
                {bridging ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Bridge Transfer</span>
                    <span>⇌</span>
                  </>
                )}
              </button>
            )}

            {/* Fees Note */}
            <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <span className="text-xl">⛽</span>
              <div className="text-xs text-amber-800 leading-relaxed font-medium">
                Ethereum network fees apply. Bridging typically takes 2-5 minutes depending on network congestion.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Panel */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {bridgeStatus ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-premium p-8"
              >
                <h3 className="font-serif text-2xl mb-8">Process Status</h3>
                
                <div className="space-y-8 relative">
                  {/* Vertical line connector */}
                  <div className="absolute left-6 top-6 bottom-6 w-px bg-app-border -z-10" />
                  
                  {steps.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${step.status === 'complete'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-premium'
                        : step.status === 'active'
                          ? 'bg-white border-accent-indigo text-accent-indigo shadow-glow-indigo animate-soft-pulse'
                          : 'bg-white border-app-border text-text-pale'
                        }`}>
                        {step.status === 'complete' ? '✓' : i + 1}
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${
                          step.status === 'complete' ? 'text-emerald-600' :
                          step.status === 'active' ? 'text-accent-indigo' : 'text-text-pale'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-sm font-bold text-text-main">
                          {step.status === 'complete' ? 'Confirmed' : 
                           step.status === 'active' ? 'In Progress...' : 'Awaiting...'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 space-y-4">
                  <div className={`p-4 rounded-2xl text-center ${
                    bridgeStatus === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-accent-indigo/5 text-accent-indigo'
                  }`}>
                    <p className="text-sm font-bold uppercase tracking-widest">{bridgeStatus}</p>
                  </div>
                  
                  {txHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-[10px] font-bold text-text-pale hover:text-accent-indigo uppercase tracking-widest underline"
                    >
                      View Etherscan ↗
                    </a>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="card-premium p-12 text-center border-dashed border-2 flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="w-20 h-20 bg-app-bg rounded-3xl flex items-center justify-center mb-6">
                  <span className="text-4xl text-text-pale">⇌</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 text-text-pale">Active Bridge</h3>
                <p className="text-xs text-text-pale leading-relaxed max-w-[180px]">Initiate a transfer to track your cross-chain assets here</p>
              </div>
            )}
          </AnimatePresence>

          {/* History Snippet */}
          {history.length > 0 && !bridgeStatus && (
            <div className="card-premium p-6">
              <h3 className="font-serif text-xl mb-4">Recent Bridges</h3>
              <div className="space-y-3">
                {history.slice(0, 3).map((tx) => (
                  <button
                    key={tx.hash}
                    onClick={() => loadHistoryItem(tx)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-app-hover border border-transparent hover:border-app-border transition-all"
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold text-text-main">{tx.amount} USDC</p>
                      <p className="text-[10px] text-text-pale uppercase tracking-widest">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {tx.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
