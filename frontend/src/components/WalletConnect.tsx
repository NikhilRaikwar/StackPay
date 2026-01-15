import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { openContractCall } from '@stacks/connect';

import {
  cvToJSON,
  deserializeCV,
  serializeCV,
  standardPrincipalCV,
  stringAsciiCV,
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { useWallet } from '../hooks/useWallet';
import {
  USERNAME_CONTRACT_ADDRESS,
  USERNAME_CONTRACT_NAME,
} from '../utils/stacksUtils';

export const WalletConnect = () => {
  const {
    isConnected,
    connectWallet,
    disconnectWallet,
    address,
    ethAddress,
    connectEthereumWallet,
    disconnectEthereumWallet,
  } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const loadUsername = async () => {
      if (!address) {
        setUsername('');
        return;
      }

      try {
        const apiUrl =
          STACKS_TESTNET.client.baseUrl ?? 'https://api.testnet.hiro.so';
        const response = await fetch(
          `${apiUrl}/v2/contracts/call-read/${USERNAME_CONTRACT_ADDRESS}/${USERNAME_CONTRACT_NAME}/get-username`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: address,
              arguments: [
                `0x${serializeCV(standardPrincipalCV(address))}`,
              ],
            }),
          }
        );

        if (!response.ok) {
          setUsername('');
          return;
        }

        const result = await response.json();
        if (!result.okay) {
          setUsername('');
          return;
        }
        const clarityValue = deserializeCV(result.result);
        const jsonResult = cvToJSON(clarityValue);
        if (jsonResult.value) {
          setUsername(jsonResult.value.value as string);
        } else {
          setUsername('');
        }
      } catch {
        setUsername('');
      }
    };

    void loadUsername();
  }, [address]);

  const handleClaimIdentity = async () => {
    if (!address || !usernameInput.trim()) return;

    setClaiming(true);
    try {
      await openContractCall({
        contractAddress: USERNAME_CONTRACT_ADDRESS,
        contractName: USERNAME_CONTRACT_NAME,
        functionName: 'register-username',
        functionArgs: [stringAsciiCV(usernameInput.trim())],
        network: STACKS_TESTNET,
        onFinish: () => {
          setUsername(usernameInput.trim());
          setUsernameInput('');
        },
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="relative flex items-center gap-3">
      {/* Ethereum Wallet */}
      {!ethAddress ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={connectEthereumWallet}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-terminal-card border border-neon-magenta/50 rounded-lg 
                     text-neon-magenta font-mono text-xs tracking-wider
                     hover:bg-neon-magenta/10 hover:border-neon-magenta transition-all duration-300"
        >
          <span className="text-lg">◈</span>
          <span className="hidden md:inline">ETH</span>
        </motion.button>
      ) : (
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-neon-magenta/10 border border-neon-magenta/30 rounded-lg">
          <span className="w-2 h-2 bg-neon-magenta rounded-full animate-pulse" />
          <span className="font-mono text-xs text-neon-magenta">
            {ethAddress.substring(0, 4)}...{ethAddress.substring(ethAddress.length - 3)}
          </span>
        </div>
      )}

      {/* Stacks Wallet */}
      {!isConnected ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={connectWallet}
          className="btn-neon py-2 px-4 text-xs"
        >
          <span className="hidden sm:inline">CONNECT WALLET</span>
          <span className="sm:hidden">CONNECT</span>
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-2 px-4 py-2 bg-terminal-card border border-neon-cyan/50 rounded-lg
                     hover:bg-neon-cyan/10 hover:border-neon-cyan transition-all duration-300"
        >
          <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
          <span className="font-mono text-sm text-white">
            {username ? `@${username}` : `${address?.substring(0, 6)}...`}
          </span>
          <svg
            className={`w-4 h-4 text-neon-cyan transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.button>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isConnected && menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-14 w-80 bg-terminal-card border border-terminal-border rounded-lg shadow-glow overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-terminal-border bg-terminal-bg/50">
              <div className="font-mono text-xs text-text-muted tracking-wider">WALLET STATUS</div>
            </div>

            {/* Wallet Info */}
            <div className="p-4 space-y-3">
              {/* Stacks Address */}
              <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-neon-cyan rounded-full" />
                  <span className="font-mono text-xs text-neon-cyan">STACKS</span>
                </div>
                <p className="font-mono text-xs text-text-secondary break-all">{address}</p>
              </div>

              {/* Ethereum Address */}
              <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${ethAddress ? 'bg-neon-magenta' : 'bg-text-muted'}`} />
                  <span className="font-mono text-xs text-neon-magenta">ETHEREUM</span>
                </div>
                {ethAddress ? (
                  <p className="font-mono text-xs text-text-secondary break-all">{ethAddress}</p>
                ) : (
                  <button
                    onClick={connectEthereumWallet}
                    className="text-xs text-neon-magenta hover:underline font-mono"
                  >
                    + Connect Ethereum
                  </button>
                )}
              </div>

              {/* Identity */}
              <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${username ? 'bg-neon-green' : 'bg-status-warning'}`} />
                  <span className="font-mono text-xs text-neon-green">IDENTITY</span>
                </div>
                {username ? (
                  <p className="font-display font-bold text-white">@{username}</p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(event) => setUsernameInput(event.target.value)}
                      placeholder="claim your @username"
                      className="w-full px-3 py-2 bg-terminal-card border border-terminal-border rounded font-mono text-xs text-white placeholder-text-muted
                                 focus:outline-none focus:border-neon-green"
                    />
                    <button
                      onClick={handleClaimIdentity}
                      disabled={!usernameInput.trim() || claiming}
                      className="w-full py-2 bg-neon-green/10 border border-neon-green/50 rounded font-mono text-xs text-neon-green
                                 hover:bg-neon-green hover:text-terminal-bg transition-all duration-300
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claiming ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="spinner" />
                          CLAIMING...
                        </span>
                      ) : (
                        'CLAIM IDENTITY'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 space-y-2">
              {ethAddress && (
                <button
                  onClick={disconnectEthereumWallet}
                  className="w-full py-2 bg-terminal-bg border border-terminal-border rounded font-mono text-xs text-text-secondary
                             hover:border-neon-magenta hover:text-neon-magenta transition-all duration-300"
                >
                  DISCONNECT ETH
                </button>
              )}
              <button
                onClick={disconnectWallet}
                className="w-full py-2 bg-status-error/10 border border-status-error/50 rounded font-mono text-xs text-status-error
                           hover:bg-status-error hover:text-white transition-all duration-300"
              >
                DISCONNECT ALL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
};
