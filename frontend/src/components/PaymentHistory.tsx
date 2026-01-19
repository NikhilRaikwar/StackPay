import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePayment } from '../hooks/usePayment';
import { useWallet } from '../hooks/useWallet';
import {
  cancelPaymentRequest,
  PAYMENT_CONTRACT_ADDRESS,
  PAYMENT_CONTRACT_NAME,
  USDCX_CONTRACT_ADDRESS,
  USERNAME_CONTRACT_ADDRESS,
  USERNAME_CONTRACT_NAME
} from '../utils/stacksUtils';

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
  status: 'pending' | 'completed' | 'failed' | 'paid' | 'cancelled';
  timestamp: number;
  type: 'sent' | 'received' | 'request';
}

interface PendingClaim {
  requestId: string;
  creator: string;
  amount: number;
  memo: string;
  createdAt: any;
  requestType?: string;
}

type FilterType = 'all' | 'sent' | 'received' | 'pending' | 'requests';

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
            createdAt: data.createdAt,
            requestType: data.type || 'escrow'
          });
        });
        setPendingClaims(claims);

        const creators = claims.map(c => c.creator).filter(Boolean);
        void resolveAddresses(creators);

      } catch (error: any) {
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
      void fetchPendingClaims();

      try {
        const [confirmedRes, mempoolRes] = await Promise.all([
          fetch(`https://api.testnet.hiro.so/extended/v1/address/${address}/transactions?limit=50`),
          fetch(`https://api.testnet.hiro.so/extended/v1/address/${address}/mempool?limit=50`)
        ]);

        const confirmedData = await confirmedRes.json();
        const mempoolData = await mempoolRes.json();

        // Combine confirmed and mempool transactions
        const allTxs = [
          ...(mempoolData.results || []).map((tx: any) => ({ ...tx, block_time: tx.receipt_time || Date.now() / 1000, tx_status: 'pending' })),
          ...(confirmedData.results || [])
        ];

        const items: PaymentItem[] = [];
        const requestStatusMap: Record<string, 'completed' | 'cancelled' | 'paid'> = {};

        // First pass: identify final states of requests
        for (const tx of allTxs as Transaction[]) {
          if (tx.contract_call?.contract_id === `${PAYMENT_CONTRACT_ADDRESS}.${PAYMENT_CONTRACT_NAME}` && tx.tx_status === 'success') {
            const functionName = tx.contract_call.function_name;
            const args = tx.contract_call.function_args;
            const requestId = args[0]?.repr?.replace(/"/g, '');

            if (requestId) {
              if (functionName === 'claim-payment') {
                requestStatusMap[requestId] = 'completed';
              } else if (functionName === 'pay-invoice') {
                requestStatusMap[requestId] = 'paid';
              } else if (functionName === 'cancel-payment-request') {
                requestStatusMap[requestId] = 'cancelled';
              }
            }
          }
        }

        for (const tx of allTxs as Transaction[]) {
          if (tx.contract_call?.contract_id === `${PAYMENT_CONTRACT_ADDRESS}.${PAYMENT_CONTRACT_NAME}`) {
            const functionName = tx.contract_call.function_name;

            if (functionName === 'create-payment-request' || functionName === 'create-invoice-request') {
              const isInvoice = functionName === 'create-invoice-request';
              const args = tx.contract_call.function_args;
              const requestId = args[0]?.repr?.replace(/"/g, '') || tx.tx_id.substring(0, 8);
              const recipient = args[1]?.repr || '';
              const amount = parseInt(args[2]?.repr?.replace('u', '') || '0') / 1_000_000;
              const memo = args[3]?.repr?.replace(/"/g, '') || (isInvoice ? 'Invoice' : 'Payment Request');

              let currentStatus = 'pending';
              if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') currentStatus = 'failed';
              else if (tx.tx_status === 'success' && requestStatusMap[requestId]) currentStatus = requestStatusMap[requestId];

              if (tx.tx_status === 'pending') currentStatus = 'pending';

              items.push({
                id: requestId,
                txId: tx.tx_id,
                amount,
                recipient: recipient.replace(/'/g, ''),
                sender: tx.sender_address,
                memo,
                status: currentStatus as any,
                timestamp: tx.block_time * 1000,
                type: tx.sender_address === address ? 'sent' : 'request',
              });
            } else if (functionName === 'claim-payment') {
              const args = tx.contract_call.function_args;
              const requestId = args[0]?.repr?.replace(/"/g, '') || tx.tx_id.substring(0, 8);

              const ftTransfer = tx.ft_transfers?.find(ft =>
                ft.asset_identifier.includes(USDCX_CONTRACT_ADDRESS)
              );
              const amount = ftTransfer ? parseInt(ftTransfer.amount) / 1_000_000 : 0;

              let sender = ftTransfer?.sender || '';
              if (!sender && tx.tx_status !== 'success') {
                sender = 'Unknown';
              }

              items.push({
                id: requestId,
                txId: tx.tx_id,
                amount,
                recipient: tx.sender_address,
                sender: sender, // This might be elusive in mempool without events, but we try
                memo: 'Payment Claimed',
                status: tx.tx_status === 'success' ? 'completed' : tx.tx_status === 'pending' ? 'pending' : 'failed',
                timestamp: tx.block_time * 1000,
                type: 'received',
              });
            } else if (functionName === 'pay-invoice') {
              const ftTransfer = tx.ft_transfers?.find((ft: any) =>
                ft.asset_identifier.includes(USDCX_CONTRACT_ADDRESS)
              );
              const amount = ftTransfer ? parseInt(ftTransfer.amount) / 1_000_000 : 0;
              const recipient = ftTransfer?.recipient || 'Unknown';

              items.push({
                id: tx.tx_id,
                txId: tx.tx_id,
                amount,
                recipient: recipient,
                sender: tx.sender_address,
                memo: 'Invoice Paid',
                status: tx.tx_status === 'success' ? 'completed' : tx.tx_status === 'pending' ? 'pending' : 'failed',
                timestamp: tx.block_time * 1000,
                type: tx.sender_address === address ? 'sent' : 'received',
              });
            }
          } else if (tx.contract_call?.contract_id === `${USERNAME_CONTRACT_ADDRESS}.${USERNAME_CONTRACT_NAME}`) {
            // Handle Username Registry interactions
            const functionName = tx.contract_call.function_name;
            if (functionName === 'register-username') {
              const args = tx.contract_call.function_args;
              const name = args[0]?.repr?.replace(/"/g, '') || 'Identity';

              items.push({
                id: tx.tx_id,
                txId: tx.tx_id,
                amount: 0,
                recipient: tx.contract_call.contract_id,
                sender: tx.sender_address,
                memo: `Identity Claim: @${name}`,
                status: tx.tx_status === 'success' ? 'completed' : tx.tx_status === 'pending' ? 'pending' : 'failed',
                timestamp: tx.block_time * 1000,
                type: 'sent',
              });
            }
          }

          if (tx.ft_transfers) {
            for (const ft of tx.ft_transfers) {
              if (ft.asset_identifier.includes(USDCX_CONTRACT_ADDRESS) &&
                (ft.sender === address || ft.recipient === address)) {
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

        const relevantAddresses: string[] = [];
        items.forEach(item => {
          if (item.sender && item.sender !== 'Unknown' && !item.sender.includes(PAYMENT_CONTRACT_NAME) && item.sender !== address) relevantAddresses.push(item.sender);
          if (item.recipient && item.recipient !== 'Unknown' && !item.recipient.includes(PAYMENT_CONTRACT_NAME) && item.recipient !== address) relevantAddresses.push(item.recipient);
        });

        items.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(items);
        void resolveAddresses(relevantAddresses);

      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchTransactions();
  }, [address]);

  const handleCancel = async (requestId: string) => {
    if (!requestId) return;
    try {
      await cancelPaymentRequest(requestId);
      setTransactions(prev => prev.map(t => t.id === requestId ? { ...t, status: 'cancelled' } : t));
    } catch (e) {
      console.error("Cancel failed", e);
    }
  };

  const filteredPayments = useMemo(() => {
    if (filter === 'all') return transactions;
    if (filter === 'pending') return transactions.filter((p) => p.status === 'pending');
    if (filter === 'sent') return transactions.filter((p) => p.type === 'sent');
    if (filter === 'received') return transactions.filter((p) => p.type === 'received');
    if (filter === 'requests') return transactions.filter((p) => p.type === 'request');
    return transactions;
  }, [transactions, filter]);

  const stats = useMemo(() => {
    const sent = transactions.filter(t => t.type === 'sent').reduce((acc, p) => acc + p.amount, 0);
    const received = transactions.filter(t => t.type === 'received').reduce((acc, p) => acc + p.amount, 0);
    return { sent, received, count: transactions.length };
  }, [transactions]);

  if (!address) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="card-premium p-12">
          <div className="w-20 h-20 bg-accent-indigo/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="font-serif text-3xl mb-4">Connection Required</h2>
          <p className="text-text-dim mb-8 max-w-xs mx-auto">Please connect your wallet to view your transaction history.</p>
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
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Pending Claims Banner */}
      <AnimatePresence>
        {pendingClaims.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-xl shadow-premium animate-float">
                  ↓
                </div>
                <div>
                  <h3 className="font-serif text-3xl text-emerald-900">Incoming Payments</h3>
                  <p className="text-sm text-emerald-700 font-medium">{pendingClaims.length} payments waiting for your action</p>
                </div>
              </div>

              <div className="space-y-3">
                {pendingClaims.map((claim) => (
                  <div key={claim.requestId} className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between border border-emerald-200/50 hover:bg-white transition-all">
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-serif italic text-emerald-600 w-12 text-center">
                        {claim.requestType === 'invoice' ? 'Invoice' : 'Escrow'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main">{claim.memo || 'Payment Request'}</p>
                        <p className="text-[10px] text-text-pale font-medium uppercase tracking-widest">
                          From: {addressMap[claim.creator] ? `@${addressMap[claim.creator]}` : `${claim.creator.slice(0, 6)}...${claim.creator.slice(-4)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-serif text-2xl text-emerald-600">${claim.amount.toFixed(2)}</span>
                      <button
                        onClick={() => navigate(`/pay/${claim.requestId}`)}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-premium hover:bg-emerald-700 transition-all"
                      >
                        Claim Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card-premium p-0 overflow-hidden">
        {/* Header & Stats */}
        <div className="p-8 border-b border-app-border bg-app-hover/30">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <h2 className="font-serif text-5xl mb-1">Activity</h2>
              <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Blockchain Ledger</p>
            </div>

            <div className="flex items-center gap-12">
              <div className="text-right">
                <p className="text-[10px] text-text-pale font-bold uppercase tracking-widest mb-1">Total Sent</p>
                <p className="font-serif text-3xl text-accent-indigo">${stats.sent.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-pale font-bold uppercase tracking-widest mb-1">Total Received</p>
                <p className="font-serif text-3xl text-emerald-600">${stats.received.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {(['all', 'sent', 'received', 'requests', 'pending'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${filter === f
                  ? 'bg-accent-indigo text-white shadow-premium'
                  : 'bg-white text-text-dim border border-app-border hover:bg-app-hover'
                  }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-app-border">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Syncing with Stacks...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-serif text-2xl text-text-pale mb-2">Quiet on the chain.</p>
              <p className="text-xs text-text-pale uppercase tracking-widest">No transactions found for this filter</p>
            </div>
          ) : (
            filteredPayments.map((payment, i) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={payment.txId + i}
                className="p-6 flex items-center justify-between hover:bg-app-hover/50 transition-colors group"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${payment.type === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                    {payment.type === 'received' ? '↓' : '↑'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-text-main">{payment.memo || 'USDCx Transfer'}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${payment.status === 'completed' || payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                          'bg-red-100 text-red-700'
                        }`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-pale font-medium uppercase tracking-widest">
                      <span>{payment.type === 'sent' ? 'To: ' : 'From: '}</span>
                      <span className="text-text-dim">
                        {(() => {
                          const target = payment.type === 'sent' ? payment.recipient : payment.sender;
                          return addressMap[target] ? `@${addressMap[target]}` : `${target.slice(0, 8)}...`;
                        })()}
                      </span>
                      <span className="mx-1">•</span>
                      <span>{new Date(payment.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className={`font-serif text-2xl ${payment.type === 'received' ? 'text-emerald-600' : 'text-text-main'}`}>
                      {payment.type === 'received' ? '+' : '-'}${payment.amount.toFixed(2)}
                    </p>
                    {payment.status === 'pending' && payment.type === 'sent' && payment.id.length < 50 && (
                      <button
                        onClick={() => handleCancel(payment.id)}
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <a
                    href={`https://explorer.hiro.so/txid/${payment.txId}?chain=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 border border-app-border rounded-xl flex items-center justify-center text-text-pale hover:text-accent-indigo hover:border-accent-indigo transition-all"
                  >
                    ↗
                  </a>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-app-bg/50 text-center">
          <p className="text-[9px] text-text-pale font-bold uppercase tracking-[0.2em]">
            Immutable Blockchain Ledger // Network: Stacks Testnet
          </p>
        </div>
      </div>
    </div>
  );
};
