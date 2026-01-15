import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import { bridgeUSDCFromEthereum, pollBridgeStatus } from '../utils/bridgeUtils';

export const BridgeInterface = () => {
  const { address, ethAddress, connectEthereumWallet } = useWallet();
  const [amount, setAmount] = useState('');
  const [bridging, setBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<string>('');
  const [txHash, setTxHash] = useState('');

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

      pollBridgeStatus(hash, (status) => {
        setBridgeStatus(status);
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

  const steps = [
    { label: 'ETHEREUM TX', status: txHash ? 'complete' : 'pending' },
    { label: 'ATTESTATION', status: bridgeStatus === 'completed' ? 'complete' : txHash ? 'active' : 'pending' },
    { label: 'STACKS MINT', status: bridgeStatus === 'completed' ? 'complete' : 'pending' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bridge Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="terminal-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-magenta/10 border border-neon-magenta/50 rounded-lg flex items-center justify-center">
                <span className="text-neon-magenta text-xl">⇌</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">BRIDGE ASSETS</h2>
                <p className="font-mono text-xs text-text-muted">Ethereum → Stacks</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Chain Flow Visual */}
            <div className="flex items-center justify-between p-4 bg-terminal-bg rounded-lg border border-terminal-border">
              <div className="text-center">
                <div className="w-12 h-12 bg-neon-magenta/10 border border-neon-magenta/50 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="font-display font-bold text-neon-magenta">ETH</span>
                </div>
                <p className="font-mono text-xs text-text-muted">USDC</p>
              </div>

              <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full h-0.5 bg-gradient-to-r from-neon-magenta via-neon-cyan to-neon-green relative">
                  <motion.div
                    animate={{ x: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-neon-cyan rounded-full shadow-neon-cyan"
                  />
                </div>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-neon-green/10 border border-neon-green/50 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="font-display font-bold text-neon-green">STX</span>
                </div>
                <p className="font-mono text-xs text-text-muted">USDCx</p>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
                AMOUNT (USDC)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="10"
                  className="terminal-input pl-10 text-xl font-display"
                  disabled={bridging}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-magenta text-xl">$</span>
              </div>
              <p className="font-mono text-xs text-text-muted mt-2">Minimum: 10 USDC</p>
            </div>

            {/* Destination */}
            <div>
              <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
                DESTINATION (STACKS)
              </label>
              <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                <p className="font-mono text-xs text-text-secondary break-all">
                  {address || 'Connect Stacks wallet first'}
                </p>
              </div>
            </div>

            {/* ETH Wallet Status */}
            {!ethAddress ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={connectEthereumWallet}
                className="w-full py-3 bg-neon-magenta/10 border border-neon-magenta/50 rounded-lg
                           font-mono text-sm text-neon-magenta
                           hover:bg-neon-magenta hover:text-terminal-bg transition-all duration-300"
              >
                CONNECT ETHEREUM WALLET
              </motion.button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-neon-magenta/10 border border-neon-magenta/30 rounded-lg">
                <span className="w-2 h-2 bg-neon-magenta rounded-full animate-pulse" />
                <span className="font-mono text-xs text-neon-magenta">
                  ETH: {ethAddress.substring(0, 6)}...{ethAddress.substring(ethAddress.length - 4)}
                </span>
              </div>
            )}

            {/* Bridge Button */}
            <motion.button
              whileHover={{ scale: bridging ? 1 : 1.02 }}
              whileTap={{ scale: bridging ? 1 : 0.98 }}
              onClick={handleBridge}
              disabled={bridging || !amount || !address || !ethAddress}
              className="w-full btn-neon-solid py-4 text-base flex items-center justify-center gap-3"
            >
              {bridging ? (
                <>
                  <span className="spinner" />
                  BRIDGING...
                </>
              ) : (
                <>
                  <span>⇌</span>
                  START BRIDGE
                </>
              )}
            </motion.button>

            {/* Fee Info */}
            <div className="p-3 bg-status-warning/10 border border-status-warning/30 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-status-warning">⚡</span>
                <div className="font-mono text-xs text-text-muted">
                  <p>Bridge fee: ~$4.80 USD (ETH gas)</p>
                  <p>Estimated time: 2-5 minutes</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="terminal-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${bridgeStatus ? 'bg-neon-cyan animate-pulse' : 'bg-text-muted'}`} />
              <span className="font-mono text-xs text-text-muted tracking-wider">
                {bridgeStatus ? 'BRIDGE IN PROGRESS' : 'AWAITING BRIDGE'}
              </span>
            </div>
          </div>

          <div className="p-6">
            {bridgeStatus ? (
              <div className="space-y-6">
                {/* Progress Steps */}
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${
                        step.status === 'complete'
                          ? 'bg-neon-green/10 border-neon-green text-neon-green'
                          : step.status === 'active'
                          ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan animate-pulse'
                          : 'bg-terminal-bg border-terminal-border text-text-muted'
                      }`}>
                        {step.status === 'complete' ? '✓' : step.status === 'active' ? '◎' : i + 1}
                      </div>
                      <div>
                        <p className={`font-mono text-sm ${
                          step.status === 'complete'
                            ? 'text-neon-green'
                            : step.status === 'active'
                            ? 'text-neon-cyan'
                            : 'text-text-muted'
                        }`}>
                          {step.label}
                        </p>
                        <p className="font-mono text-xs text-text-muted">
                          {step.status === 'complete' ? 'CONFIRMED' : step.status === 'active' ? 'PROCESSING...' : 'WAITING'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Status */}
                <div className={`p-4 rounded-lg border ${
                  bridgeStatus === 'completed'
                    ? 'bg-neon-green/10 border-neon-green/30'
                    : bridgeStatus === 'failed'
                    ? 'bg-status-error/10 border-status-error/30'
                    : 'bg-neon-cyan/10 border-neon-cyan/30'
                }`}>
                  <p className={`font-display font-bold text-lg ${
                    bridgeStatus === 'completed'
                      ? 'text-neon-green'
                      : bridgeStatus === 'failed'
                      ? 'text-status-error'
                      : 'text-neon-cyan'
                  }`}>
                    {bridgeStatus.toUpperCase()}
                  </p>
                </div>

                {/* TX Hash */}
                {txHash && (
                  <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                    <p className="font-mono text-xs text-text-muted mb-2">ETHEREUM TX</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-neon-magenta hover:underline break-all"
                    >
                      {txHash} ↗
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 bg-terminal-bg border-2 border-dashed border-terminal-border rounded-xl flex items-center justify-center mb-4">
                  <span className="text-4xl text-text-muted">⇌</span>
                </div>
                <p className="font-mono text-sm text-text-muted">Enter amount and initiate</p>
                <p className="font-mono text-xs text-text-muted">bridge to see status</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {[
          {
            icon: '💡',
            title: 'GET TESTNET USDC',
            description: 'Visit Circle faucet to get free testnet USDC on Sepolia',
            link: 'https://faucet.circle.com',
          },
          {
            icon: '⛽',
            title: 'GET TESTNET ETH',
            description: 'Need Sepolia ETH for gas? Get it from a faucet',
            link: 'https://sepoliafaucet.com',
          },
          {
            icon: '📖',
            title: 'HOW IT WORKS',
            description: 'Learn about USDCx bridging powered by Circle xReserve',
            link: 'https://docs.stacks.co/learn/bridging/usdcx',
          },
        ].map((card) => (
          <a
            key={card.title}
            href={card.link}
            target="_blank"
            rel="noopener noreferrer"
            className="terminal-card p-4 group cursor-pointer"
          >
            <span className="text-2xl">{card.icon}</span>
            <h3 className="font-mono text-sm text-white mt-2 group-hover:text-neon-cyan transition-colors">
              {card.title}
            </h3>
            <p className="font-mono text-xs text-text-muted mt-1">{card.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
};
