import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '../hooks/useWallet';
import {
  claimPayment,
  PAYMENT_CONTRACT_ADDRESS,
  PAYMENT_CONTRACT_NAME,
} from '../utils/stacksUtils';
import { cvToJSON, deserializeCV, serializeCV, stringAsciiCV } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';
import { db, isFirebaseConfigured } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface PaymentDetails {
  creator: string;
  recipient: string;
  amount: number;
  memo: string;
  status: string;
}

export const ClaimPayment = () => {
  const { paymentId } = useParams();
  const { address, isConnected, connectWallet } = useWallet();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    void loadPaymentDetails();
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    if (!paymentId) return;

    try {
      const apiUrl = STACKS_TESTNET.client.baseUrl ?? 'https://api.testnet.hiro.so';
      const args = [stringAsciiCV(paymentId)];
      const response = await fetch(
        `${apiUrl}/v2/contracts/call-read/${PAYMENT_CONTRACT_ADDRESS}/${PAYMENT_CONTRACT_NAME}/get-payment-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
            arguments: args.map((arg) => `0x${serializeCV(arg)}`),
          }),
        }
      );

      const result = await response.json();
      if (!result.okay) {
        throw new Error('Read-only call failed.');
      }
      const clarityValue = deserializeCV(result.result);
      const jsonResult = cvToJSON(clarityValue);
      if (jsonResult.value) {
        const data = jsonResult.value.value;
        setPayment({
          creator: data.creator.value,
          recipient: data.recipient.value,
          amount: parseInt(data.amount.value, 10) / 1_000_000,
          memo: data.memo.value,
          status: data.status.value,
        });
      }
    } catch (error) {
      console.error('Error loading payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!address || !paymentId) return;

    setClaiming(true);
    if (!payment) return;
    try {
      await claimPayment(paymentId, payment.amount);

      if (db && isFirebaseConfigured) {
        try {
          await updateDoc(doc(db, 'payments', paymentId), {
            status: 'completed',
            claimedAt: new Date().toISOString(),
          });
        } catch (firebaseError) {
          console.warn('Firebase update failed:', firebaseError);
        }
      }
      navigate('/history');
    } catch (error) {
      console.error('Error claiming payment:', error);
      alert('Failed to claim payment');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="terminal-card p-12 text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="font-mono text-sm text-text-muted">LOADING PAYMENT DATA...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="terminal-card p-12 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">PAYMENT NOT FOUND</h2>
          <p className="font-mono text-sm text-text-muted">This payment request does not exist</p>
        </div>
      </div>
    );
  }

  const isRecipient = address?.toLowerCase() === payment.recipient.toLowerCase();
  const canClaim = isRecipient && payment.status === 'pending';

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="terminal-card overflow-hidden relative"
      >
        {/* Corner Decorations */}
        <div className="corner-decoration corner-tl" />
        <div className="corner-decoration corner-tr" />
        <div className="corner-decoration corner-bl" />
        <div className="corner-decoration corner-br" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-green/10 border border-neon-green/50 rounded-lg flex items-center justify-center">
              <span className="text-neon-green text-xl">⬇</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">INCOMING PAYMENT</h2>
              <p className="font-mono text-xs text-text-muted">Payment Request #{paymentId?.substring(0, 8)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Amount Hero */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="p-8 bg-gradient-to-br from-neon-green/10 to-neon-cyan/5 rounded-xl border border-neon-green/30 text-center"
          >
            <p className="font-mono text-xs text-text-muted mb-2">AMOUNT TO CLAIM</p>
            <p className="font-display font-black text-5xl text-white amount-display">
              ${payment.amount.toFixed(2)}
            </p>
            <p className="font-mono text-sm text-neon-green mt-2">USDCx</p>
          </motion.div>

          {/* Details */}
          <div className="space-y-3">
            {payment.memo && (
              <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-border">
                <p className="font-mono text-xs text-text-muted mb-1">DESCRIPTION</p>
                <p className="font-body text-white">{payment.memo}</p>
              </div>
            )}

            <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-border">
              <p className="font-mono text-xs text-text-muted mb-1">FROM</p>
              <p className="font-mono text-xs text-text-secondary break-all">{payment.creator}</p>
            </div>

            <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-border">
              <p className="font-mono text-xs text-text-muted mb-1">TO</p>
              <p className="font-mono text-xs text-text-secondary break-all">{payment.recipient}</p>
            </div>

            <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-border">
              <p className="font-mono text-xs text-text-muted mb-1">STATUS</p>
              <div className="flex items-center gap-2">
                {payment.status === 'completed' ? (
                  <span className="status-badge-completed">✓ COMPLETED</span>
                ) : payment.status === 'pending' ? (
                  <span className="status-badge-pending">◎ PENDING</span>
                ) : (
                  <span className="status-badge-error">✗ CANCELLED</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4">
            {!isConnected ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={connectWallet}
                className="w-full btn-neon-solid py-4 text-base"
              >
                CONNECT WALLET TO CLAIM
              </motion.button>
            ) : !isRecipient ? (
              <div className="p-4 bg-status-warning/10 border border-status-warning/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-status-warning">⚠️</span>
                  <span className="font-mono text-sm text-status-warning">WRONG RECIPIENT</span>
                </div>
                <p className="font-mono text-xs text-text-muted">
                  This payment is intended for a different wallet address
                </p>
              </div>
            ) : payment.status === 'completed' ? (
              <div className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg text-center">
                <span className="text-neon-green text-2xl">✓</span>
                <p className="font-mono text-sm text-neon-green mt-2">PAYMENT ALREADY CLAIMED</p>
              </div>
            ) : canClaim ? (
              <motion.button
                whileHover={{ scale: claiming ? 1 : 1.02 }}
                whileTap={{ scale: claiming ? 1 : 0.98 }}
                onClick={handleClaim}
                disabled={claiming}
                className="w-full btn-neon-green py-4 text-base flex items-center justify-center gap-3"
              >
                {claiming ? (
                  <>
                    <span className="spinner" />
                    CLAIMING...
                  </>
                ) : (
                  <>
                    <span>⬇</span>
                    CLAIM ${payment.amount.toFixed(2)} USDCx
                  </>
                )}
              </motion.button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
