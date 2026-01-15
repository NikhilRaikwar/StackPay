import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
import { db, isFirebaseConfigured } from '../utils/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const apiUrl = STACKS_TESTNET.client.baseUrl ?? 'https://api.testnet.hiro.so';

const callReadOnly = async (functionName: string, args: any[]) => {
  const response = await fetch(
    `${apiUrl}/v2/contracts/call-read/${USERNAME_CONTRACT_ADDRESS}/${USERNAME_CONTRACT_NAME}/${functionName}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        arguments: args.map((arg) => `0x${serializeCV(arg)}`),
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to call read-only function');
  }

  const result = await response.json();
  if (!result.okay) {
    throw new Error('Read-only call failed');
  }
  const clarityValue = deserializeCV(result.result);
  return cvToJSON(clarityValue);
};

export const UsernameRegistry = () => {
  const { address, isConnected } = useWallet();
  const [username, setUsername] = useState('');
  const [lookup, setLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<string>('');
  const [myUsername, setMyUsername] = useState<string>('');
  const [availability, setAvailability] = useState<'available' | 'taken' | ''>('');
  const [loading, setLoading] = useState(false);

  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    const loadMyUsername = async () => {
      if (!address) return;
      try {
        const result = await callReadOnly('get-username', [
          standardPrincipalCV(address),
        ]);
        if (result.value) {
          setMyUsername(result.value.value as string);
        }
      } catch {
        setMyUsername('');
      }
    };

    void loadMyUsername();
  }, [address]);

  // Auto-check availability with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.trim() && !myUsername) {
        void handleCheckAvailability();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Auto-lookup with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (lookup.trim()) {
        void handleLookup();
      } else {
        setLookupResult('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [lookup]);

  const handleRegister = async () => {
    if (!address || !username.trim()) return;

    try {
      const result = await callReadOnly('get-address', [
        stringAsciiCV(username.trim()),
      ]);
      if (result.value) {
        setAvailability('taken');
        alert('Username already taken.');
        return;
      }
      setAvailability('available');
    } catch {
      setAvailability('available');
    }

    setLoading(true);
    try {
      await openContractCall({
        contractAddress: USERNAME_CONTRACT_ADDRESS,
        contractName: USERNAME_CONTRACT_NAME,
        functionName: 'register-username',
        functionArgs: [stringAsciiCV(username.trim())],
        network: STACKS_TESTNET,
        onFinish: async () => {
          setMyUsername(username.trim());
          if (db && isFirebaseConfigured) {
            await setDoc(doc(db, 'usernames', username.trim()), {
              username: username.trim(),
              address,
              registeredAt: serverTimestamp(),
            });
          }
        },
      });
    } catch (error) {
      console.error('Username registration failed:', error);
      alert('Username registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookup.trim()) return;
    setLookingUp(true);
    setLookupResult('');

    try {
      const result = await callReadOnly('get-address', [
        stringAsciiCV(lookup.trim()),
      ]);

      // Check if value exists and is a valid Stacks address (starts with S)
      if (result.value && typeof result.value.value === 'string' && result.value.value.startsWith('S')) {
        setLookupResult(result.value.value);
      } else {
        setLookupResult('Not found');
      }
    } catch (error) {
      console.error('Lookup failed:', error);
      setLookupResult('Not found');
    } finally {
      setLookingUp(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!username.trim()) return;

    try {
      const result = await callReadOnly('get-address', [
        stringAsciiCV(username.trim()),
      ]);
      setAvailability(result.value ? 'taken' : 'available');
    } catch {
      setAvailability('available');
    } finally {
      // Done
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="terminal-card p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">WALLET REQUIRED</h2>
          <p className="font-mono text-sm text-text-muted mb-6">Connect your wallet to claim your identity</p>
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
    <div className="max-w-4xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Register Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="terminal-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-pink/10 border border-neon-pink/50 rounded-lg flex items-center justify-center">
                <span className="text-neon-pink text-xl">@</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">CLAIM IDENTITY</h2>
                <p className="font-mono text-xs text-text-muted">Register your @username</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Current Username */}
            {myUsername && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                  <span className="font-mono text-xs text-neon-green tracking-wider">IDENTITY CLAIMED</span>
                </div>
                <p className="font-display font-bold text-2xl text-white">@{myUsername}</p>
              </motion.div>
            )}

            {/* Username Input */}
            <div>
              <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
                CHOOSE YOUR USERNAME
              </label>
              <div className="flex items-center px-4 py-3 bg-terminal-bg border border-terminal-border rounded-lg focus-within:border-neon-cyan focus-within:ring-2 focus-within:ring-neon-cyan/20 transition-all duration-300">
                <span className="text-neon-pink text-lg mr-1 select-none font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setAvailability('');
                  }}
                  placeholder="yourname"
                  maxLength={20}
                  className="flex-1 bg-transparent !border-none !outline-none !ring-0 !shadow-none font-mono text-white placeholder-text-muted p-0 focus:ring-0 focus:outline-none focus:border-none"
                  style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                  disabled={!!myUsername}
                />
              </div>
              <p className="font-mono text-xs text-text-muted mt-2">3-20 characters, letters and numbers only</p>
            </div>

            {/* Availability Status */}
            {availability && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg border ${availability === 'available'
                  ? 'bg-neon-green/10 border-neon-green/30'
                  : 'bg-status-error/10 border-status-error/30'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className={availability === 'available' ? 'text-neon-green' : 'text-status-error'}>
                    {availability === 'available' ? '✓' : '✗'}
                  </span>
                  <span className={`font-mono text-sm ${availability === 'available' ? 'text-neon-green' : 'text-status-error'
                    }`}>
                    {availability === 'available' ? 'Username available!' : 'Username taken'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            {!myUsername && (
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={handleRegister}
                disabled={loading || !username.trim() || availability !== 'available'}
                className="w-full btn-neon-solid py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    REGISTERING...
                  </>
                ) : (
                  'REGISTER'
                )}
              </motion.button>
            )}

            {/* Benefits */}
            <div className="pt-4 border-t border-terminal-border">
              <p className="font-mono text-xs text-text-muted mb-3">BENEFITS</p>
              <ul className="space-y-2">
                {[
                  'Easy to share and remember',
                  'Send/receive with @username',
                  'Stored on-chain forever',
                  'Professional payment links',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 font-mono text-xs text-text-secondary">
                    <span className="text-neon-green">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Lookup Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="terminal-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-cyan/10 border border-neon-cyan/50 rounded-lg flex items-center justify-center">
                <span className="text-neon-cyan text-xl">🔍</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">LOOKUP USER</h2>
                <p className="font-mono text-xs text-text-muted">Find address by @username</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Lookup Input */}
            <div>
              <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
                ENTER USERNAME
              </label>
              <div className="flex items-center px-4 py-3 bg-terminal-bg border border-terminal-border rounded-lg focus-within:border-neon-cyan focus-within:ring-2 focus-within:ring-neon-cyan/20 transition-all duration-300 relative">
                <span className="text-neon-cyan text-lg mr-1 select-none font-mono">@</span>
                <input
                  type="text"
                  value={lookup}
                  onChange={(event) => setLookup(event.target.value)}
                  placeholder="alice"
                  className="flex-1 bg-transparent !border-none !outline-none !ring-0 !shadow-none font-mono text-white placeholder-text-muted p-0 focus:ring-0 focus:outline-none focus:border-none"
                  style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                />
                {lookingUp && <div className="spinner w-4 h-4 border-2" />}
              </div>
            </div>

            {/* Result */}
            {lookupResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${lookupResult === 'Not found'
                  ? 'bg-status-error/10 border-status-error/30'
                  : 'bg-terminal-bg border-terminal-border'
                  }`}
              >
                <p className="font-mono text-xs text-text-muted mb-2">RESULT FOR @{lookup}</p>
                {lookupResult === 'Not found' ? (
                  <div className="flex items-center gap-2 text-status-error">
                    <span>✗</span>
                    <p className="font-mono text-sm">Username does not exist</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-mono text-xs text-text-secondary break-all">{lookupResult}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(lookupResult)}
                      className="mt-2 font-mono text-xs text-neon-cyan hover:underline"
                    >
                      Copy address
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Empty State */}
            {!lookupResult && !lookingUp && (
              <div className="py-12 text-center">
                <div className="w-20 h-20 bg-terminal-bg border-2 border-dashed border-terminal-border rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-text-muted">🔍</span>
                </div>
                <p className="font-mono text-sm text-text-muted">Enter a username to find</p>
                <p className="font-mono text-xs text-text-muted">their Stacks address</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
