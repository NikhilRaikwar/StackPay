import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { useWallet } from '../hooks/useWallet';
import { createPaymentRequest, createInvoiceRequest, resolveStacksRecipient, getUSDCxBalance } from '../utils/stacksUtils';
import { buildPaymentUrl } from '../utils/qrUtils';
import { usePayment } from '../hooks/usePayment';
import { db, isFirebaseConfigured } from '../utils/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

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
          memo || 'Payment Request'
        );
      } else {
        // Invoice logic
        await createInvoiceRequest(
          requestId,
          parseFloat(amount),
          memo || 'Invoice Request'
        );
      }

      const paymentUrl = buildPaymentUrl(requestId);
      setQrData(paymentUrl);
      setPaymentId(requestId);

      // Update local state
      addPayment({
        id: requestId,
        amount: parseFloat(amount),
        recipient: resolvedRecipient,
        memo: memo || (paymentType === 'escrow' ? 'Payment Request' : 'Invoice Request'),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      if (db && isFirebaseConfigured) {
        try {
          await setDoc(doc(db, 'payments', requestId), {
            requestId,
            creator: address,
            recipient: resolvedRecipient, // For invoice, this is the creator (me)
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
    link.download = `stackspay-${paymentId.substring(0, 8)}.png`;
    link.href = url;
    link.click();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrData);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="terminal-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-magenta/10 border border-neon-magenta/50 rounded-lg flex items-center justify-center">
                <span className="text-neon-magenta text-xl">◎</span>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">SEND PAYMENT VIA QR</h2>
                <p className="font-mono text-xs text-text-muted">Funds will be held in escrow until claimed</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Payment Type Toggle */}
            <div className="flex p-1 bg-terminal-bg border border-terminal-border rounded-lg mb-6">
              <button
                onClick={() => setPaymentType('escrow')}
                className={`flex-1 py-2 text-sm font-mono transition-all duration-300 rounded ${paymentType === 'escrow'
                  ? 'bg-neon-magenta text-black font-bold shadow-[0_0_10px_rgba(255,0,255,0.3)]'
                  : 'text-text-muted hover:text-white'
                  }`}
              >
                SEND (ESCROW)
              </button>
              <button
                onClick={() => setPaymentType('invoice')}
                className={`flex-1 py-2 text-sm font-mono transition-all duration-300 rounded ${paymentType === 'invoice'
                  ? 'bg-neon-cyan text-black font-bold shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                  : 'text-text-muted hover:text-white'
                  }`}
              >
                REQUEST (INVOICE)
              </button>
            </div>

            {/* Recipient - Only show for Escrow */}
            {paymentType === 'escrow' && (
              <div>
                <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
                  RECIPIENT (WHO WILL SCAN THIS?)
                </label>
                <div className={`relative flex items-center bg-terminal-bg border rounded-lg transition-all duration-300 ${recipientStatus === 'valid' ? 'border-neon-green/50' :
                  recipientStatus === 'invalid' ? 'border-status-error/50' :
                    'border-terminal-border focus-within:border-neon-cyan'
                  }`}>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(event) => setRecipient(event.target.value)}
                    placeholder="@alice or ST2..."
                    className="flex-1 bg-transparent !border-none !outline-none !ring-0 !shadow-none font-mono text-white placeholder-text-muted px-4 py-3"
                    style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                  />
                  <div className="pr-4 flex items-center">
                    {recipientStatus === 'checking' && (
                      <div className="spinner w-4 h-4 border-2" />
                    )}
                    {recipientStatus === 'valid' && (
                      <div className="group relative cursor-help">
                        <span className="text-green-500 text-lg">✓</span>
                        <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-black border border-terminal-border text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                          Valid Recipient
                        </div>
                      </div>
                    )}
                    {recipientStatus === 'invalid' && (
                      <span className="text-red-500 text-lg">!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="block font-mono text-xs text-text-muted tracking-wider">
                  AMOUNT (USDC)
                </label>
                <div className="text-xs text-neon-cyan/80 font-mono">
                  Balance: {balance !== null ? `$${balance.toFixed(2)}` : '--'} USDC
                </div>
              </div>
              <div className="relative flex items-center bg-terminal-bg border border-terminal-border rounded-lg focus-within:border-neon-cyan transition-all duration-300">
                <span className="pl-4 text-text-muted">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent !border-none !outline-none !ring-0 !shadow-none font-mono text-white placeholder-text-muted px-2 py-3"
                  style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                />
                <span className="pr-4 text-xs text-text-muted font-mono">USDC</span>
              </div>
            </div>

            {/* Memo */}
            <div>
              <label className="block font-mono text-xs text-text-muted mb-2 tracking-wider">
                MEMO (OPTIONAL)
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="What's this for?"
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-4 py-3 font-mono text-sm text-white focus:border-neon-cyan outline-none transition-all duration-300"
              />
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateQR}
              disabled={loading || (paymentType === 'escrow' && !recipient.trim()) || !amount}
              className={`w-full py-4 mt-2 rounded-lg font-display font-bold text-black uppercase tracking-wider transition-all duration-300 ${loading || (paymentType === 'escrow' && !recipient.trim()) || !amount
                ? 'bg-terminal-border cursor-not-allowed opacity-50'
                : paymentType === 'escrow'
                  ? 'bg-neon-magenta hover:bg-neon-magenta/90 shadow-[0_0_20px_rgba(255,0,255,0.3)]'
                  : 'bg-neon-cyan hover:bg-neon-cyan/90 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4 border-2 border-black" />
                  <span>Processing...</span>
                </div>
              ) : (
                paymentType === 'escrow' ? 'CREATE PAYMENT LINK' : 'CREATE INVOICE LINK'
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* QR Display Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="terminal-card flex flex-col items-center justify-center p-8 text-center min-h-[400px]"
        >
          {qrData ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6 w-full max-w-sm"
            >
              <div className="relative group">
                {/* Scanner corners */}
                <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-neon-cyan" />
                <div className="absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 border-neon-cyan" />
                <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 border-neon-cyan" />
                <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-neon-cyan" />

                <div className="bg-white p-4 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                  <QRCodeCanvas
                    id="qr-code"
                    value={qrData}
                    size={250}
                    level="H"
                    includeMargin={true}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-display tracking-wide">
                  PAYMENT LINK READY
                </h3>
                <p className="text-sm text-text-muted font-mono">
                  {paymentType === 'escrow'
                    ? 'Amount locked in escrow. Share this code with the recipient.'
                    : 'Invoice created. Share this code to get paid.'}
                </p>
              </div>

              {/* Payment Details */}
              <div className="space-y-3">
                <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                  <p className="font-mono text-xs text-text-muted">AMOUNT</p>
                  <p className="font-display font-bold text-2xl text-neon-green">${amount} USDCx</p>
                </div>

                {memo && (
                  <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                    <p className="font-mono text-xs text-text-muted">DESCRIPTION</p>
                    <p className="font-body text-white">{memo}</p>
                  </div>
                )}

                <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                  <p className="font-mono text-xs text-text-muted">PAYMENT ID</p>
                  <p className="font-mono text-xs text-text-secondary break-all">{paymentId}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadQR}
                  className="py-3 bg-neon-cyan/10 border border-neon-cyan/50 rounded-lg
                               font-mono text-sm text-neon-cyan
                               hover:bg-neon-cyan hover:text-terminal-bg transition-all duration-300"
                >
                  ↓ DOWNLOAD
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={copyLink}
                  className="py-3 bg-neon-green/10 border border-neon-green/50 rounded-lg
                               font-mono text-sm text-neon-green
                               hover:bg-neon-green hover:text-terminal-bg transition-all duration-300"
                >
                  ⎘ COPY LINK
                </motion.button>
              </div>

              {/* Link Display */}
              <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border">
                <p className="font-mono text-xs text-text-muted mb-2">SHARE LINK</p>
                <a
                  href={qrData}
                  className="font-mono text-xs text-neon-cyan hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {qrData}
                </a>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center">
              <div className="w-32 h-32 bg-terminal-bg border-2 border-dashed border-terminal-border rounded-xl flex items-center justify-center mb-4">
                <span className="text-4xl text-text-muted">◎</span>
              </div>
              <p className="font-mono text-sm text-text-muted">Fill out the form and generate</p>
              <p className="font-mono text-xs text-text-muted">a payment request QR code</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
