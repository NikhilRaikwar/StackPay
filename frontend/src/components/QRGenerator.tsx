import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { useWallet } from '../hooks/useWallet';
import { createPaymentRequest, createInvoiceRequest, resolveStacksRecipient, getUSDCxBalance } from '../utils/stacksUtils';
import { buildPaymentUrl } from '../utils/qrUtils';
import { usePayment } from '../hooks/usePayment';
import { db, isFirebaseConfigured, auth } from '../utils/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

export const QRGenerator = () => {
  const { address } = useWallet();
  const { addPayment } = usePayment();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [qrData, setQrData] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientStatus, setRecipientStatus] = useState<'valid' | 'invalid' | 'checking' | 'idle'>('idle');
  const [paymentType, setPaymentType] = useState<'escrow' | 'invoice'>('escrow');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (address) {
      getUSDCxBalance(address)
        .then(setBalance)
        .catch((e) => {
          console.error("Failed to fetch balance", e);
          setBalance(null);
        });
    }
  }, [address]);

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

  const generateQR = async () => {
    if (!address || !amount) return;
    if (paymentType === 'escrow' && (!recipient.trim() || recipientStatus === 'invalid')) {
      if (recipientStatus === 'invalid') alert('Invalid recipient.');
      return;
    }

    setLoading(true);
    try {
      const requestId = uuidv4();
      let resolvedRecipient = address;

      if (paymentType === 'escrow') {
        resolvedRecipient = await resolveStacksRecipient(recipient);
        await createPaymentRequest(
          requestId,
          resolvedRecipient,
          parseFloat(amount),
          memo || 'Payment Request',
          address
        );
      } else {
        if (recipient.trim()) {
          resolvedRecipient = await resolveStacksRecipient(recipient);
        } else {
          resolvedRecipient = address;
        }

        await createInvoiceRequest(
          requestId,
          resolvedRecipient,
          parseFloat(amount),
          memo || 'Invoice Request'
        );
      }

      const paymentUrl = buildPaymentUrl(requestId);
      setQrData(paymentUrl);
      setPaymentId(requestId);

      addPayment({
        id: requestId,
        amount: parseFloat(amount),
        recipient: resolvedRecipient,
        memo: memo || (paymentType === 'escrow' ? 'Payment Request' : 'Invoice Request'),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      if (db && auth && isFirebaseConfigured) {
        try {
          await signInAnonymously(auth);
          await setDoc(doc(db, 'payments', requestId), {
            requestId,
            creator: address,
            recipient: resolvedRecipient,
            amount: parseFloat(amount),
            memo: memo || (paymentType === 'escrow' ? 'Payment Request' : 'Invoice Request'),
            status: 'pending',
            requestType: paymentType,
            qrCodeUrl: paymentUrl,
            createdAt: serverTimestamp(),
          });
        } catch (firebaseError) {
          console.warn('Firebase write failed:', firebaseError);
        }
      }
    } catch (error) {
      console.error('Error creating payment request:', error);
      alert('Failed to create payment request');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `stackpay-${paymentId.substring(0, 8)}.png`;
    link.href = url;
    link.click();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrData);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 card-premium p-0 overflow-hidden"
        >
          <div className="p-8 border-b border-app-border bg-app-hover/30">
            <h2 className="font-serif text-4xl mb-1">Request</h2>
            <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Generate Payment Link</p>
            
            <div className="mt-8 flex p-1 bg-white border border-app-border rounded-2xl">
              <button
                onClick={() => setPaymentType('escrow')}
                className={`flex-1 py-3 text-xs font-bold transition-all duration-300 rounded-xl ${paymentType === 'escrow'
                  ? 'bg-accent-indigo text-white shadow-premium'
                  : 'text-text-dim hover:bg-app-hover'
                  }`}
              >
                SECURE ESCROW
              </button>
              <button
                onClick={() => setPaymentType('invoice')}
                className={`flex-1 py-3 text-xs font-bold transition-all duration-300 rounded-xl ${paymentType === 'invoice'
                  ? 'bg-accent-gold text-white shadow-premium'
                  : 'text-text-dim hover:bg-app-hover'
                  }`}
              >
                DIRECT INVOICE
              </button>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Recipient Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-pale uppercase tracking-widest">
                {paymentType === 'escrow' ? 'Target Recipient' : 'Funds Recipient (Optional)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={paymentType === 'escrow' ? "@username or address" : "Leave empty for self"}
                  className="input-premium pr-12"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {recipientStatus === 'checking' && (
                    <div className="w-4 h-4 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" />
                  )}
                  {recipientStatus === 'valid' && <span className="text-emerald-500 font-bold">✓</span>}
                  {recipientStatus === 'invalid' && <span className="text-red-500 font-bold">×</span>}
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Requested Amount</label>
                <span className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest">
                  Bal: {balance?.toFixed(2) || '0.00'} USDCx
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-serif text-text-pale">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="input-premium pl-10 pr-20 text-3xl font-serif text-accent-indigo h-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-pale uppercase tracking-widest">
                  USDCx
                </span>
              </div>
            </div>

            {/* Memo Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Description / Memo</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="What is this for?"
                className="input-premium"
              />
            </div>

            <button
              onClick={generateQR}
              disabled={loading || (paymentType === 'escrow' && !recipient.trim()) || !amount}
              className={`w-full h-16 rounded-full font-bold text-lg transition-all duration-300 shadow-premium active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 ${
                paymentType === 'escrow' ? 'bg-accent-indigo text-white hover:bg-accent-indigo-hover' : 'bg-accent-gold text-white hover:bg-accent-gold-hover'
              }`}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{paymentType === 'escrow' ? 'Lock Funds & Create' : 'Create Invoice Link'}</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* QR Display Section */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {qrData ? (
              <motion.div
                key="qr-active"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card-premium p-8 text-center"
              >
                <div className="p-4 bg-white border border-app-border rounded-3xl shadow-premium mb-8 inline-block overflow-hidden">
                  <QRCodeCanvas
                    id="qr-code"
                    value={qrData}
                    size={220}
                    level="H"
                    includeMargin={true}
                    className="w-full h-auto"
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-serif text-2xl mb-1">Request Generated</h3>
                    <p className="text-xs text-text-pale font-medium uppercase tracking-widest">Scan or share link</p>
                  </div>

                  <div className="p-4 bg-app-bg rounded-2xl border border-app-border space-y-2">
                    <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest">Direct Link</p>
                    <p className="text-xs text-accent-indigo font-mono break-all line-clamp-2">{qrData}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={downloadQR}
                      className="py-3 px-4 bg-white border border-app-border rounded-xl text-xs font-bold text-text-main hover:bg-app-hover transition-all"
                    >
                      Download PNG
                    </button>
                    <button
                      onClick={copyLink}
                      className="py-3 px-4 bg-accent-indigo/5 border border-accent-indigo/10 rounded-xl text-xs font-bold text-accent-indigo hover:bg-accent-indigo/10 transition-all"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="qr-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-premium p-12 text-center border-dashed border-2 flex flex-col items-center justify-center min-h-[400px]"
              >
                <div className="w-20 h-20 bg-app-bg rounded-3xl flex items-center justify-center mb-6">
                  <span className="text-4xl">◎</span>
                </div>
                <h3 className="font-serif text-2xl mb-2 text-text-pale">Awaiting Input</h3>
                <p className="text-xs text-text-pale leading-relaxed max-w-[180px]">Fill the form to generate your secure payment request</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Security Note
            </h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Escrow requests securely lock your funds until the recipient scans and claims them. You can revoke them at any time from your history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
