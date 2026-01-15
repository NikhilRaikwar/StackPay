import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { usePayment } from '../hooks/usePayment';
import { useWallet } from '../hooks/useWallet';
import { PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, USDCX_CONTRACT_ADDRESS, USDCX_CONTRACT_NAME, USERNAME_CONTRACT_ADDRESS, USERNAME_CONTRACT_NAME } from '../utils/stacksUtils';
import { standardPrincipalCV, cvToJSON, deserializeCV, serializeCV } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { db, isFirebaseConfigured } from '../utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Transaction {
  tx_id: string;
  tx_type: string;
  tx_status: string;
  block_time: number;
  sender_address: string;
  contract_call?: {
    function_name: string;
    function_args: any[];
    contract_id: string;
  };
  token_transfer?: {
    recipient_address: string;
    amount: string;
  };
  ft_transfers?: {
    recipient: string;
    sender: string;
    amount: string;
    asset_identifier: string;
  }[];
}

interface PaymentItem {
  id: string;
  txId: string;
  amount: number;
  recipient: string;
  sender: string;
  memo: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  type: 'sent' | 'received' | 'request';
}

interface PendingClaim {
  requestId: string;
  creator: string;
  amount: number;
  memo: string;
  createdAt: any;
}

type FilterType = 'all' | 'sent' | 'received' | 'pending';

export const PaymentHistory = () => {
  usePayment();
  const { address } = useWallet();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<PaymentItem[]>([]);
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [addressMap, setAddressMap] = useState<Record<string, string>>({});

  const resolveAddresses = async (addresses: string[]) => {
    const uniqueAddresses = [...new Set(addresses.filter(addr => addr && !addressMap[addr]))];
    if (uniqueAddresses.length === 0) return;

    const newMap: Record<string, string> = {};
    const promises = uniqueAddresses.map(async (addr) => {
      try {
        const response = await fetch(
          `${STACKS_TESTNET.client.baseUrl}/v2/contracts/call-read/${USERNAME_CONTRACT_ADDRESS}/${USERNAME_CONTRACT_NAME}/get-username`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: addr,
              arguments: [`0x${serializeCV(standardPrincipalCV(addr))}`],
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.okay) {
            const clarityValue = deserializeCV(result.result);
            const json = cvToJSON(clarityValue);
            if (json.value) {
              newMap[addr] = json.value.value;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to resolve', addr, e);
      }
    });

    await Promise.all(promises);
    setAddressMap(prev => ({ ...prev, ...newMap }));
  };

  useEffect(() => {
    const fetchPendingClaims = async () => {
      // Basic check before trying Firebase
      if (!address || !db || !isFirebaseConfigured) return;

      try {
        const q = query(
          collection(db, 'payments'),
          where('recipient', '==', address),
          where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);
        const claims: PendingClaim[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          claims.push({
            requestId: data.requestId,
            creator: data.creator,
            amount: data.amount,
            memo: data.memo,
            createdAt: data.createdAt
          });
        });
        setPendingClaims(claims);

        // Resolve creators of pending claims too
        const creators = claims.map(c => c.creator).filter(Boolean);
        void resolveAddresses(creators);

      } catch (error: any) {
        // Suppress permission errors to avoid console noise for users without access
        if (error?.code !== 'permission-denied') {
          console.warn("Error fetching pending claims", error);
        }
      }
    };

    const fetchTransactions = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      setLoading(true);
      void fetchPendingClaims(); // Fetch claims alongside transactions

      try {
        // Fetch transactions from Hiro API
        const response = await fetch(
          `https://api.testnet.hiro.so/extended/v1/address/${address}/transactions?limit=50`
        );
        const data = await response.json();

        const items: PaymentItem[] = [];

        for (const tx of data.results as Transaction[]) {
          // Check for payment contract interactions
          if (tx.contract_call?.contract_id === `${PAYMENT_CONTRACT_ADDRESS}.${PAYMENT_CONTRACT_NAME}`) {
            const functionName = tx.contract_call.function_name;

            if (functionName === 'create-payment-request') {
              const args = tx.contract_call.function_args;
              const requestId = args[0]?.repr?.replace(/"/g, '') || tx.tx_id.substring(0, 8);
              const recipient = args[1]?.repr || '';
              const amount = parseInt(args[2]?.repr?.replace('u', '') || '0') / 1_000_000;
              const memo = args[3]?.repr?.replace(/"/g, '') || 'Payment Request';

              items.push({
                id: requestId,
                txId: tx.tx_id,
                amount,
                recipient: recipient.replace(/'/g, ''),
                sender: tx.sender_address,
                memo,
                status: tx.tx_status === 'success' ? 'completed' : tx.tx_status === 'pending' ? 'pending' : 'failed',
                timestamp: tx.block_time * 1000,
                type: 'request',
              });
            } else if (functionName === 'claim-payment') {
              const args = tx.contract_call.function_args;
              const requestId = args[0]?.repr?.replace(/"/g, '') || tx.tx_id.substring(0, 8);

              // Find the amount from ft_transfers
              const ftTransfer = tx.ft_transfers?.find(ft =>
                ft.asset_identifier.includes(USDCX_CONTRACT_ADDRESS)
              );
              const amount = ftTransfer ? parseInt(ftTransfer.amount) / 1_000_000 : 0;

              // For received claims, the sender is usually the contract if successful
              // If failed, we don't have transfer info, so we use a fallback or the tx sender (which is self)
              // But 'sender' in PaymentItem implies 'From'.
              let sender = ftTransfer?.sender || '';
              if (!sender && tx.tx_status !== 'success') {
                sender = 'Unknown';
              }

              items.push({
                id: requestId,
                txId: tx.tx_id,
                amount,
                recipient: tx.sender_address,
                sender: sender,
                memo: 'Payment Claimed',
                status: tx.tx_status === 'success' ? 'completed' : tx.tx_status === 'pending' ? 'pending' : 'failed',
                timestamp: tx.block_time * 1000,
                type: 'received',
              });
            }
          }

          // Check for USDCx transfers
          if (tx.contract_call?.contract_id === `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}` &&
            tx.contract_call.function_name === 'transfer') {
            const args = tx.contract_call.function_args;
            const amount = parseInt(args[0]?.repr?.replace('u', '') || '0') / 1_000_000;
            const sender = args[1]?.repr?.replace(/'/g, '') || '';
            const recipient = args[2]?.repr?.replace(/'/g, '') || '';

            if (sender === address || recipient === address) {
              items.push({
                id: tx.tx_id,
                txId: tx.tx_id,
                amount,
                recipient,
                sender,
                memo: 'Direct Transfer',
                status: tx.tx_status === 'success' ? 'completed' : tx.tx_status === 'pending' ? 'pending' : 'failed',
                timestamp: tx.block_time * 1000,
                type: sender === address ? 'sent' : 'received',
              });
            }
          }

          // Also check ft_transfers for any USDCx movements
          if (tx.ft_transfers) {
            for (const ft of tx.ft_transfers) {
              if (ft.asset_identifier.includes(USDCX_CONTRACT_ADDRESS) &&
                (ft.sender === address || ft.recipient === address)) {
                // Avoid duplicates
                if (!items.find(item => item.txId === tx.tx_id)) {
                  items.push({
                    id: tx.tx_id,
                    txId: tx.tx_id,
                    amount: parseInt(ft.amount) / 1_000_000,
                    recipient: ft.recipient,
                    sender: ft.sender,
                    memo: 'USDCx Transfer',
                    status: tx.tx_status === 'success' ? 'completed' : tx.tx_status === 'pending' ? 'pending' : 'failed',
                    timestamp: tx.block_time * 1000,
                    type: ft.sender === address ? 'sent' : 'received',
                  });
                }
              }
            }
          }
        }

        // Extract relevant addresses for resolution (excluding our own and contract)
        const relevantAddresses: string[] = [];
        items.forEach(item => {
          if (item.sender && item.sender !== 'Unknown' && !item.sender.includes(PAYMENT_CONTRACT_NAME) && item.sender !== address) relevantAddresses.push(item.sender);
          if (item.recipient && item.recipient !== 'Unknown' && !item.recipient.includes(PAYMENT_CONTRACT_NAME) && item.recipient !== address) relevantAddresses.push(item.recipient);
        });

        // Sort by timestamp descending
        items.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(items);

        // Trigger resolution in background
        void resolveAddresses(relevantAddresses);

      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchTransactions();
  }, [address]);

  const filteredPayments = useMemo(() => {
    if (filter === 'all') return transactions;
    if (filter === 'pending') return transactions.filter((p) => p.status === 'pending');
    if (filter === 'sent') return transactions.filter((p) => p.type === 'sent' || p.type === 'request');
    if (filter === 'received') return transactions.filter((p) => p.type === 'received');
    return transactions;
  }, [transactions, filter]);

  const stats = useMemo(() => {
    const sent = transactions.filter(t => t.type === 'sent' || t.type === 'request').reduce((acc, p) => acc + p.amount, 0);
    const received = transactions.filter(t => t.type === 'received').reduce((acc, p) => acc + p.amount, 0);
    const pending = transactions.filter((p) => p.status === 'pending').length;
    const completed = transactions.filter((p) => p.status === 'completed').length;
    return { sent, received, pending, completed, count: transactions.length };
  }, [transactions]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'ALL' },
    { key: 'sent', label: 'SENT' },
    { key: 'received', label: 'RECEIVED' },
    { key: 'pending', label: 'PENDING' },
  ];

  const openExplorer = (txId: string) => {
    window.open(`https://explorer.hiro.so/txid/${txId}?chain=testnet`, '_blank');
  };

  if (!address) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="terminal-card p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">WALLET REQUIRED</h2>
          <p className="font-mono text-sm text-text-muted mb-6">Connect your wallet to view history</p>
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
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Pending Claims Notification Section */}
      {pendingClaims.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="terminal-card overflow-hidden border-neon-green/50"
        >
          <div className="terminal-card mb-8">
            <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-neon-cyan text-lg">↓</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-lg">INCOMING PAYMENTS</h3>
                  <p className="font-mono text-xs text-text-muted">{pendingClaims.length} waiting to be claimed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-terminal-border">
            {pendingClaims.map((claim) => (
              <div key={claim.requestId} className="p-4 flex items-center justify-between hover:bg-terminal-hover transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
                    <span className="text-neon-green">⬇</span>
                  </div>
                  <div>
                    <p className="font-body text-sm text-white">{claim.memo || 'Payment Request'}</p>
                    <p className="font-mono text-xs text-text-muted">
                      From: {(() => {
                        const resolvedName = addressMap[claim.creator];
                        return resolvedName ? <span className="text-neon-cyan">@{resolvedName}</span> : `${claim.creator.substring(0, 8)}...`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-display font-bold text-lg text-neon-green">+${claim.amount.toFixed(2)}</p>
                  <button
                    onClick={() => navigate(`/pay/${claim.requestId}`)}
                    className="px-4 py-2 bg-neon-green text-terminal-bg font-mono text-xs font-bold rounded hover:opacity-90 transition-opacity"
                  >
                    CLAIM
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="terminal-card overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-cyan/10 border border-neon-cyan/50 rounded-lg flex items-center justify-center">
                <span className="text-neon-cyan text-xl">☰</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">TRANSACTION HISTORY</h2>
                <p className="font-mono text-xs text-text-muted">
                  {loading ? 'Loading...' : `${stats.count} transactions from blockchain`}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-terminal-bg border border-terminal-border rounded-lg font-mono text-xs text-text-muted hover:border-neon-cyan hover:text-neon-cyan transition-all"
            >
              ↻ REFRESH
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 border-b border-terminal-border">
          {[
            { label: 'SENT', value: `$${stats.sent.toFixed(2)}`, color: 'magenta' },
            { label: 'RECEIVED', value: `$${stats.received.toFixed(2)}`, color: 'green' },
            { label: 'COMPLETED', value: stats.completed.toString(), color: 'cyan' },
            { label: 'PENDING', value: stats.pending.toString(), color: 'yellow' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 text-center border-r last:border-r-0 border-terminal-border">
              <p className={`font-display font-bold text-lg text-neon-${stat.color}`}>{stat.value}</p>
              <p className="font-mono text-[10px] text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-terminal-border bg-terminal-bg/30">
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-full font-mono text-xs transition-all duration-300 ${filter === f.key
                  ? 'bg-neon-cyan text-terminal-bg'
                  : 'bg-terminal-card text-text-secondary border border-terminal-border hover:border-neon-cyan/50'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-terminal-border max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="font-mono text-sm text-text-muted">FETCHING TRANSACTIONS...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-terminal-bg border-2 border-dashed border-terminal-border rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-text-muted">☰</span>
              </div>
              <p className="font-display font-bold text-lg text-white mb-2">NO TRANSACTIONS YET</p>
              <p className="font-mono text-sm text-text-muted mb-4">Your transaction history will appear here</p>
              <Link to="/send">
                <button className="btn-neon text-sm py-2 px-6">SEND YOUR FIRST PAYMENT</button>
              </Link>
            </div>
          ) : (
            filteredPayments.map((payment, i) => (
              <motion.div
                key={`${payment.txId}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 hover:bg-terminal-hover transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Direction Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${payment.type === 'sent' || payment.type === 'request'
                      ? 'bg-neon-magenta/10 border border-neon-magenta/30'
                      : 'bg-neon-green/10 border border-neon-green/30'
                      }`}>
                      <span className={payment.type === 'sent' || payment.type === 'request' ? 'text-neon-magenta' : 'text-neon-green'}>
                        {payment.type === 'sent' || payment.type === 'request' ? '↗' : '↙'}
                      </span>
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm text-white">{payment.memo || 'Payment'}</p>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${payment.type === 'request' ? 'bg-neon-cyan/10 text-neon-cyan' :
                          payment.type === 'sent' ? 'bg-neon-magenta/10 text-neon-magenta' :
                            'bg-neon-green/10 text-neon-green'
                          }`}>
                          {payment.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-text-muted">
                        {payment.type === 'sent' || payment.type === 'request' ? 'To: ' : 'From: '}
                        {(() => {
                          const targetAddr = payment.type === 'sent' || payment.type === 'request' ? payment.recipient : payment.sender;
                          const resolvedName = addressMap[targetAddr];
                          if (resolvedName) {
                            return <span className="text-white hover:text-neon-cyan transition-colors font-bold">@{resolvedName}</span>;
                          }
                          return `${targetAddr.substring(0, 8)}...`;
                        })()}
                      </p>
                      <p className="font-mono text-xs text-text-muted">
                        {payment.timestamp
                          ? new Date(payment.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : 'Pending...'}
                      </p>
                    </div>
                  </div>

                  {/* Amount, Status & Link */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-display font-bold text-lg ${payment.type === 'sent' || payment.type === 'request' ? 'text-neon-magenta' : 'text-neon-green'
                        }`}>
                        {payment.type === 'sent' || payment.type === 'request' ? '-' : '+'}${payment.amount.toFixed(2)}
                      </p>
                      {payment.status === 'completed' ? (
                        <span className="status-badge-completed text-[10px]">COMPLETED</span>
                      ) : payment.status === 'pending' ? (
                        <span className="status-badge-pending text-[10px]">PENDING</span>
                      ) : (
                        <span className="status-badge-error text-[10px]">FAILED</span>
                      )}
                    </div>

                    {/* Explorer Link */}
                    <button
                      onClick={() => openExplorer(payment.txId)}
                      className="w-10 h-10 rounded-lg bg-terminal-bg border border-terminal-border flex items-center justify-center
                                 opacity-50 group-hover:opacity-100 hover:border-neon-cyan hover:text-neon-cyan transition-all"
                      title="View on Explorer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-terminal-border bg-terminal-bg/30">
          <p className="font-mono text-[10px] text-text-muted text-center">
            Data fetched from Stacks blockchain • Contract: {PAYMENT_CONTRACT_ADDRESS.substring(0, 8)}...
          </p>
        </div>
      </motion.div>
    </div>
  );
};
