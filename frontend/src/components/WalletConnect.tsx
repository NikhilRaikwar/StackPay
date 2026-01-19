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
      {/* Ethereum Wallet Badge */}
      {ethAddress && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            ETH: {ethAddress.substring(0, 4)}...{ethAddress.substring(ethAddress.length - 3)}
          </span>
        </div>
      )}

      {/* Stacks Wallet Toggle */}
      {!isConnected ? (
        <button
          onClick={connectWallet}
          className="btn-primary"
        >
          Connect Wallet
        </button>
      ) : (
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-3 pl-4 pr-3 py-2 bg-white border border-app-border rounded-full shadow-premium hover:shadow-floating transition-all duration-300"
        >
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-semibold text-sm text-text-main">
            {username ? `@${username}` : `${address?.substring(0, 6)}...`}
          </span>
          <div className={`p-1 bg-app-hover rounded-full transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4 text-text-pale" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </motion.button>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isConnected && menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-14 w-80 glass border border-app-border rounded-2xl shadow-floating overflow-hidden z-50 p-2"
          >
            {/* Header */}
            <div className="px-4 py-3 mb-2">
              <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest">Connected Accounts</p>
            </div>

            {/* Wallet Info Cards */}
            <div className="space-y-2 mb-4">
              {/* Stacks Card */}
              <div className="p-4 bg-app-bg/50 rounded-xl border border-app-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest">Stacks</span>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                </div>
                <p className="text-[11px] font-mono text-text-dim break-all mb-2">{address}</p>
                {username ? (
                  <div className="inline-flex px-2 py-0.5 bg-accent-indigo/10 text-accent-indigo text-[10px] font-bold rounded-md">
                    @{username}
                  </div>
                ) : (
                  <div className="space-y-2 mt-3">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Claim @username"
                      className="w-full px-3 py-2 bg-white border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-accent-indigo outline-none"
                    />
                    <button
                      onClick={handleClaimIdentity}
                      disabled={!usernameInput.trim() || claiming}
                      className="w-full py-2 bg-accent-indigo text-white rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      {claiming ? 'Registering...' : 'Register Identity'}
                    </button>
                  </div>
                )}
              </div>

              {/* Ethereum Card */}
              <div className="p-4 bg-app-bg/50 rounded-xl border border-app-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Ethereum</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${ethAddress ? 'bg-emerald-500' : 'bg-text-pale'}`} />
                </div>
                {ethAddress ? (
                  <p className="text-[11px] font-mono text-text-dim break-all">{ethAddress}</p>
                ) : (
                  <button
                    onClick={connectEthereumWallet}
                    className="text-xs text-blue-600 hover:underline font-bold"
                  >
                    + Connect Ethereum Wallet
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1">
              {ethAddress && (
                <button
                  onClick={disconnectEthereumWallet}
                  className="w-full py-2.5 text-xs font-semibold text-text-dim hover:bg-app-hover rounded-xl transition-colors"
                >
                  Disconnect Ethereum
                </button>
              )}
              <button
                onClick={disconnectWallet}
                className="w-full py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                Sign Out
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
