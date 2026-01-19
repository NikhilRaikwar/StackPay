import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { getUSDCxBalance, resolveStacksRecipient, sendUSDCx } from '../utils/stacksUtils';
import { usePayment } from '../hooks/usePayment';

export const SendPayment = () => {
  const { address, isConnected } = useWallet();
  const { addPayment } = usePayment();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [txId, setTxId] = useState('');

  useEffect(() => {
    if (address) {
      getUSDCxBalance(address).then(setBalance).catch(() => setBalance(0));
    }
  }, [address]);

  const [recipientStatus, setRecipientStatus] = useState<'valid' | 'invalid' | 'checking' | 'idle'>('idle');

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!recipient.trim()) {
        setRecipientStatus('idle');
        return;
      }

      setRecipientStatus('checking');
      try {
        const resolved = await resolveStacksRecipient(recipient);
        if (resolved === address) {
          setRecipientStatus('invalid');
        } else {
          setRecipientStatus('valid');
        }
      } catch (error) {
        setRecipientStatus('invalid');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [recipient, address]);

  const handleSend = async () => {
    if (!address || !recipient || !amount) return;
    if (recipientStatus === 'invalid') {
      alert('Invalid recipient.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Enter a valid amount.');
      return;
    }
    if (recipient.trim() === address) {
      alert('Recipient must be different from the sender.');
      return;
    }
    if (parsedAmount > balance) {
      alert('Insufficient USDCx balance.');
      return;
    }

    setLoading(true);
    try {
      const resolvedRecipient = await resolveStacksRecipient(recipient);

      const tx = await sendUSDCx(resolvedRecipient, parsedAmount, address);
      setTxId(tx);
      addPayment({
        id: tx,
        amount: parsedAmount,
        recipient: resolvedRecipient,
        memo: 'Direct transfer',
        status: 'completed',
        txId: tx,
        createdAt: new Date().toISOString(),
      });

      const newBalance = await getUSDCxBalance(address);
      setBalance(newBalance);
      setRecipient('');
      setAmount('');
      setRecipientStatus('idle');
    } catch (error) {
      console.error('Error sending payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="card-premium p-12">
          <div className="w-20 h-20 bg-accent-indigo/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="font-serif text-3xl mb-4">Connection Required</h2>
          <p className="text-text-dim mb-8 max-w-xs mx-auto">Please connect your wallet to access the transfer terminal.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-0 overflow-hidden"
      >
        {/* Header Section */}
        <div className="p-8 border-b border-app-border bg-app-hover/30">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-4xl mb-1">Transfer</h2>
              <p className="text-sm text-text-pale font-medium uppercase tracking-widest">USDCx Assets</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-pale font-bold uppercase tracking-widest mb-1">Available</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-serif text-accent-indigo">${balance.toFixed(2)}</span>
                <span className="text-xs font-bold text-text-pale uppercase">USDCx</span>
              </div>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-2">
            {[10, 25, 50, 100].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className="px-4 py-2 bg-white border border-app-border rounded-xl text-sm font-semibold text-text-dim hover:border-accent-indigo hover:text-accent-indigo transition-all duration-200"
              >
                + ${val}
              </button>
            ))}
            <button
              onClick={() => setAmount(balance.toString())}
              className="px-4 py-2 bg-accent-indigo/5 border border-accent-indigo/10 rounded-xl text-sm font-bold text-accent-indigo hover:bg-accent-indigo/10 transition-all duration-200"
            >
              Max
            </button>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 space-y-8">
          {/* Recipient Input */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Recipient</label>
              <AnimatePresence>
                {recipientStatus === 'valid' && (
                  <motion.span 
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Valid Address
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Stacks Address or @username"
                className={`input-premium pr-12 ${recipientStatus === 'invalid' ? 'border-red-300 focus:border-red-400' : ''}`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {recipientStatus === 'checking' && (
                  <div className="w-4 h-4 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" />
                )}
                {recipientStatus === 'valid' && <span className="text-emerald-500 font-bold">✓</span>}
                {recipientStatus === 'invalid' && <span className="text-red-500 font-bold">×</span>}
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-serif text-text-pale">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="input-premium pl-10 pr-20 text-3xl font-serif text-accent-indigo h-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-pale uppercase tracking-widest">
                USDCx
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleSend}
            disabled={loading || !recipient || !amount || recipientStatus === 'invalid'}
            className="w-full btn-primary h-16 text-lg flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Transaction...</span>
              </div>
            ) : (
              <>
                <span>Confirm Transfer</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </>
            )}
          </button>

          {/* Success State */}
          <AnimatePresence>
            {txId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px]">✓</div>
                  <span className="text-sm font-bold text-emerald-800">Transfer Successful</span>
                </div>
                <p className="text-[11px] text-emerald-600 mb-2 truncate font-mono">TX: {txId}</p>
                <a
                  href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-emerald-700 underline uppercase tracking-widest"
                >
                  View on Explorer ↗
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Security Tip */}
      <div className="mt-8 flex items-center gap-4 px-6 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
        <span className="text-xl">🛡️</span>
        <p className="text-xs text-amber-800 leading-relaxed">
          Ensure the recipient address is correct. Transactions on the Stacks blockchain are immutable and cannot be reversed once confirmed.
        </p>
      </div>
    </div>
  );
};
