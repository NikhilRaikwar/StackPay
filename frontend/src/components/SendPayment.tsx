import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
          // Self-sending is technically valid address wise, but invalid for transfer
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
      <div className="max-w-lg mx-auto">
        <div className="terminal-card p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">WALLET REQUIRED</h2>
          <p className="font-mono text-sm text-text-muted mb-6">Connect your wallet to send payments</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="btn-neon py-3 px-8"
          >
            CONNECT WALLET ↑
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="terminal-card overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-cyan/10 border border-neon-cyan/50 rounded-lg flex items-center justify-center">
              <span className="text-neon-cyan text-xl">↗</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">SEND PAYMENT</h2>
              <p className="font-mono text-xs text-text-muted">Transfer USDCx instantly</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Balance Display */}
          <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-text-muted mb-1">AVAILABLE BALANCE</p>
                <p className="font-display font-bold text-3xl text-white amount-display">
                  ${balance.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="status-badge-completed">USDCx</span>
              </div>
            </div>
          </div>

          {/* Recipient Input */}
          <div>
            <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
              RECIPIENT ADDRESS OR USERNAME
            </label>
            <div className={`relative flex items-center bg-terminal-bg border rounded-lg transition-all duration-300 ${recipientStatus === 'valid' ? 'border-neon-green/50' :
              recipientStatus === 'invalid' ? 'border-status-error/50' :
                'border-terminal-border focus-within:border-neon-cyan'
              }`}>
              <input
                type="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="ST2... or username"
                className="flex-1 bg-transparent !border-none !outline-none !ring-0 !shadow-none font-mono text-white placeholder-text-muted px-4 py-3"
                style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
              />

              <div className="pr-4 flex items-center">
                {recipientStatus === 'checking' && (
                  <div className="spinner w-4 h-4 border-2" />
                )}
                {recipientStatus === 'valid' && (
                  <div className="group relative cursor-help">
                    <span className="text-neon-green text-lg">✓</span>
                    <div className="absolute bottom-full right-0 mb-2 w-max hidden group-hover:block px-2 py-1 bg-terminal-bg border border-neon-green rounded text-xs text-neon-green">
                      Verified User
                    </div>
                  </div>
                )}
                {recipientStatus === 'invalid' && (
                  <div className="group relative cursor-help">
                    <span className="text-status-error text-lg">✗</span>
                    <div className="absolute bottom-full right-0 mb-2 w-max hidden group-hover:block px-2 py-1 bg-terminal-bg border border-status-error rounded text-xs text-status-error">
                      User not found
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
              AMOUNT (USDCx)
            </label>
            <div className="relative flex items-center px-4 py-3 bg-terminal-bg border border-terminal-border rounded-lg focus-within:border-neon-cyan focus-within:ring-2 focus-within:ring-neon-cyan/20 transition-all duration-300">
              <span className="text-neon-green text-xl font-display mr-1">$</span>
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                step="0.01"
                className="flex-1 bg-transparent !border-none !outline-none !ring-0 !shadow-none text-xl font-display text-white placeholder-text-muted p-0 pr-16"
                style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
              />
              <button
                onClick={() => setAmount(balance.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-neon-cyan/10 border border-neon-cyan/30 rounded
                           font-mono text-xs text-neon-cyan hover:bg-neon-cyan hover:text-terminal-bg transition-all"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-2">
            {[5, 10, 25, 50, 100].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className="px-4 py-2 bg-terminal-bg border border-terminal-border rounded-lg
                           font-mono text-sm text-text-secondary
                           hover:border-neon-cyan hover:text-neon-cyan transition-all duration-300"
              >
                ${val}
              </button>
            ))}
          </div>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            onClick={handleSend}
            disabled={loading || !recipient || !amount}
            className="w-full btn-neon-solid py-4 text-base flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <span className="spinner" />
                PROCESSING...
              </>
            ) : (
              <>
                SEND PAYMENT
                <span>→</span>
              </>
            )}
          </motion.button>

          {/* Success Message */}
          {txId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                <span className="font-mono text-xs text-neon-green tracking-wider">TRANSACTION CONFIRMED</span>
              </div>
              <a
                href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-text-secondary hover:text-neon-cyan break-all transition-colors"
              >
                {txId} ↗
              </a>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
