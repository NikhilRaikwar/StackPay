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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.trim() && !myUsername) {
        void handleCheckAvailability();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

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
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="card-premium p-12">
          <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">@</span>
          </div>
          <h2 className="font-serif text-3xl mb-4">Connection Required</h2>
          <p className="text-text-dim mb-8 max-w-xs mx-auto">Please connect your wallet to claim your on-chain identity.</p>
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
    <div className="max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Register Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-premium p-0 overflow-hidden"
        >
          <div className="p-8 border-b border-app-border bg-purple-50/50">
            <h2 className="font-serif text-4xl mb-1">Identity</h2>
            <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Claim Your @Username</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Current Username */}
            <AnimatePresence>
              {myUsername && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Identity Claimed</span>
                  </div>
                  <p className="font-serif text-4xl text-emerald-800">@{myUsername}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username Input */}
            {!myUsername && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-text-pale uppercase tracking-widest">
                  Choose Your Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-serif text-purple-400">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setAvailability('');
                    }}
                    placeholder="yourname"
                    maxLength={20}
                    className="input-premium pl-12 text-2xl font-serif h-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {availability === 'available' && <span className="text-emerald-500 text-xl font-bold">✓</span>}
                    {availability === 'taken' && <span className="text-red-500 text-xl font-bold">×</span>}
                  </div>
                </div>
                <p className="text-xs text-text-pale">3-20 characters, letters and numbers only</p>
              </div>
            )}

            {/* Availability Status */}
            <AnimatePresence>
              {availability && !myUsername && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border ${availability === 'available'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-red-50 border-red-100 text-red-700'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{availability === 'available' ? '✓' : '×'}</span>
                    <span className="text-sm font-bold">
                      {availability === 'available' ? 'Username available!' : 'Username taken'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Register Button */}
            {!myUsername && (
              <button
                onClick={handleRegister}
                disabled={loading || !username.trim() || availability !== 'available'}
                className="w-full h-16 bg-purple-600 text-white rounded-full font-bold text-lg transition-all duration-300 hover:bg-purple-700 shadow-premium active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Register Identity</span>
                    <span>→</span>
                  </>
                )}
              </button>
            )}

            {/* Benefits */}
            <div className="pt-6 border-t border-app-border">
              <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest mb-4">Benefits</p>
              <ul className="grid grid-cols-2 gap-3">
                {[
                  'Easy to share',
                  'Send/receive with @name',
                  'Stored on-chain',
                  'Payment links',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm text-text-dim">
                    <span className="w-5 h-5 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-[10px]">✓</span>
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
          className="card-premium p-0 overflow-hidden"
        >
          <div className="p-8 border-b border-app-border bg-app-hover/30">
            <h2 className="font-serif text-4xl mb-1">Lookup</h2>
            <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Find Address by Username</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Lookup Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-pale uppercase tracking-widest">
                Enter Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-serif text-accent-indigo">@</span>
                <input
                  type="text"
                  value={lookup}
                  onChange={(event) => setLookup(event.target.value)}
                  placeholder="alice"
                  className="input-premium pl-12 text-2xl font-serif h-16"
                />
                {lookingUp && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>

            {/* Result */}
            <AnimatePresence mode="wait">
              {lookupResult ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-6 rounded-2xl border ${lookupResult === 'Not found'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-app-bg/50 border-app-border'
                    }`}
                >
                  <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest mb-3">Result for @{lookup}</p>
                  {lookupResult === 'Not found' ? (
                    <div className="flex items-center gap-3 text-red-600">
                      <span className="text-xl">×</span>
                      <p className="font-bold">Username does not exist</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-mono text-text-dim break-all mb-4 p-3 bg-white rounded-xl border border-app-border">{lookupResult}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(lookupResult)}
                        className="text-xs font-bold text-accent-indigo hover:underline uppercase tracking-widest"
                      >
                        Copy Address →
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-16 text-center"
                >
                  <div className="w-20 h-20 bg-app-bg border-2 border-dashed border-app-border rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl text-text-pale">🔍</span>
                  </div>
                  <p className="font-serif text-xl text-text-pale mb-1">Enter a username</p>
                  <p className="text-xs text-text-pale uppercase tracking-widest">to find their Stacks address</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
