import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import {
  claimPayment,
  payInvoice,
  getPaymentRequest,
  getUSDCxBalance,
} from '../utils/stacksUtils';
import { db, isFirebaseConfigured } from '../utils/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface PaymentRequestData {
  creator: string;
  recipient: string;
  amount: number;
  memo: string;
  status: 'pending' | 'completed' | 'cancelled';
  requestType?: 'escrow' | 'invoice';
}

export const ClaimPayment = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { address, isConnected, connectWallet } = useWallet();
  const [paymentData, setPaymentData] = useState<PaymentRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchPayment = async () => {
      if (!paymentId) {
        setError('Invalid payment link');
        setLoading(false);
        return;
      }

      try {
        let paymentInfo: PaymentRequestData | null = null;

        if (db && isFirebaseConfigured) {
          try {
            const docRef = doc(db, 'payments', paymentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              paymentInfo = {
                creator: data.creator,
                recipient: data.recipient,
                amount: data.amount,
                memo: data.memo,
                status: data.status,
                requestType: data.requestType || 'escrow',
              };
            }
          } catch (firebaseError: any) {
            if (firebaseError?.code !== 'permission-denied') {
              console.warn('Firebase fetch failed:', firebaseError);
            }
          }
        }

        if (!paymentInfo) {
          const onChainData = await getPaymentRequest(paymentId);
          if (onChainData) {
            paymentInfo = {
              creator: onChainData.creator,
              recipient: onChainData.recipient,
              amount: onChainData.amount,
              memo: onChainData.memo || 'Payment Request',
              status: onChainData.claimed ? 'completed' : 'pending',
              requestType: 'escrow',
            };
          }
        }

        if (paymentInfo) {
          setPaymentData(paymentInfo);
        } else {
          setError('Payment request not found');
        }
      } catch (err) {
        console.error('Error fetching payment:', err);
        setError('Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    void fetchPayment();
  }, [paymentId]);

  useEffect(() => {
    if (address) {
      getUSDCxBalance(address).then(setBalance).catch(() => setBalance(null));
    }
  }, [address]);

  const handleClaim = async () => {
    if (!paymentId || !address || !paymentData) return;

    setClaiming(true);
    setError('');
    try {
      let tx: string;
      if (paymentData.requestType === 'invoice') {
        if (balance !== null && balance < paymentData.amount) {
          setError(`Insufficient balance. You need ${paymentData.amount} USDCx.`);
          setClaiming(false);
          return;
        }
        tx = await payInvoice(paymentId, paymentData.amount, address);
      } else {
        tx = await claimPayment(paymentId, paymentData.amount);
      }
      setTxId(tx);

      if (db && isFirebaseConfigured) {
        try {
          const docRef = doc(db, 'payments', paymentId);
          await updateDoc(docRef, {
            status: 'completed',
            claimedBy: address,
            claimedAt: new Date().toISOString(),
            txId: tx,
          });
        } catch (firebaseError: any) {
          if (firebaseError?.code !== 'permission-denied') {
            console.warn('Firebase update failed:', firebaseError);
          }
        }
      }

      setPaymentData({ ...paymentData, status: 'completed' });
    } catch (err: any) {
      console.error('Claim failed:', err);
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto text-center py-32">
        <div className="card-premium p-16">
          <div className="w-16 h-16 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Loading Payment Request...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="card-premium p-12">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✕</span>
          </div>
          <h2 className="font-serif text-3xl mb-4 text-text-main">Request Not Found</h2>
          <p className="text-text-dim mb-8">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const isEscrow = paymentData?.requestType !== 'invoice';
  const isRecipient = address && paymentData?.recipient.toLowerCase() === address.toLowerCase();
  const canClaim = isEscrow ? isRecipient : true;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-0 overflow-hidden"
      >
        {/* Header */}
        <div className={`p-8 border-b border-app-border ${paymentData?.status === 'completed' ? 'bg-emerald-50' : isEscrow ? 'bg-accent-indigo/5' : 'bg-amber-50'
          }`}>
          <div className="flex items-center justify-between mb-6">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isEscrow ? 'bg-accent-indigo/10 text-accent-indigo' : 'bg-amber-100 text-amber-700'
              }`}>
              {isEscrow ? 'Escrow Payment' : 'Invoice Request'}
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${paymentData?.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                paymentData?.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-white text-text-dim border border-app-border'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${paymentData?.status === 'completed' ? 'bg-emerald-500' :
                  paymentData?.status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                }`} />
              {paymentData?.status}
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest mb-2">
              {isEscrow ? 'Amount to Receive' : 'Amount Requested'}
            </p>
            <h1 className="font-serif text-7xl text-text-main mb-2">
              ${paymentData?.amount.toFixed(2)}
            </h1>
            <p className="text-xs font-bold text-text-pale uppercase tracking-widest">USDCx</p>
          </div>
        </div>

        {/* Details */}
        <div className="p-8 space-y-6">
          <div className="p-4 bg-app-bg/50 rounded-2xl border border-app-border space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-text-pale uppercase tracking-widest">From</span>
              <span className="text-xs font-mono text-text-dim">{paymentData?.creator.slice(0, 12)}...{paymentData?.creator.slice(-6)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-text-pale uppercase tracking-widest">To</span>
              <span className="text-xs font-mono text-text-dim">{paymentData?.recipient.slice(0, 12)}...{paymentData?.recipient.slice(-6)}</span>
            </div>
            {paymentData?.memo && (
              <div className="flex justify-between items-start pt-2 border-t border-app-border">
                <span className="text-[10px] font-bold text-text-pale uppercase tracking-widest">Memo</span>
                <span className="text-sm text-text-main text-right max-w-[200px]">{paymentData.memo}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <AnimatePresence mode="wait">
            {paymentData?.status === 'completed' ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✓</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 text-emerald-700">Payment Complete</h3>
                <p className="text-sm text-emerald-600 mb-6">This request has been successfully claimed.</p>

                {txId && (
                  <a
                    href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-accent-indigo underline uppercase tracking-widest"
                  >
                    View Transaction ↗
                  </a>
                )}
              </motion.div>
            ) : paymentData?.status === 'cancelled' ? (
              <motion.div
                key="cancelled"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✕</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 text-red-700">Request Cancelled</h3>
                <p className="text-sm text-red-600">This payment request is no longer valid.</p>
              </motion.div>
            ) : !isConnected ? (
              <motion.div
                key="connect"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4"
              >
                <p className="text-sm text-text-dim mb-6">Connect your wallet to {isEscrow ? 'claim this payment' : 'pay this invoice'}</p>
                <button onClick={connectWallet} className="btn-primary w-full h-14 text-lg">
                  Connect Wallet
                </button>
              </motion.div>
            ) : !canClaim && isEscrow ? (
              <motion.div
                key="wrong-wallet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 bg-amber-50 border border-amber-100 rounded-2xl text-center"
              >
                <p className="text-sm text-amber-800 font-medium">
                  This payment is designated for a different wallet address. Please connect the correct wallet to claim.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="claim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {!isEscrow && balance !== null && (
                  <div className="flex justify-between items-center p-4 bg-app-bg/50 rounded-xl border border-app-border">
                    <span className="text-[10px] font-bold text-text-pale uppercase tracking-widest">Your Balance</span>
                    <span className={`font-serif text-xl ${balance >= (paymentData?.amount || 0) ? 'text-emerald-600' : 'text-red-500'}`}>
                      ${balance.toFixed(2)} USDCx
                    </span>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleClaim}
                  disabled={claiming || (!isEscrow && balance !== null && balance < (paymentData?.amount || 0))}
                  className={`w-full h-16 rounded-full font-bold text-lg transition-all duration-300 shadow-premium active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 ${isEscrow ? 'bg-accent-indigo text-white hover:bg-accent-indigo-hover' : 'bg-accent-gold text-white hover:bg-accent-gold-hover'
                    }`}
                >
                  {claiming ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isEscrow ? 'Claim Payment' : 'Pay Invoice'}</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Note */}
        <div className="px-8 pb-8">
          <div className="flex items-start gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <span className="text-xl">🛡️</span>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {isEscrow
                ? 'This payment is held in a secure smart contract escrow. Once claimed, funds will be transferred directly to your wallet.'
                : 'Paying this invoice will transfer USDCx directly from your wallet to the recipient.'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
