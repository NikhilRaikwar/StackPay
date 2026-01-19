import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { parsePaymentIdFromUrl } from '../utils/qrUtils';
import { useNavigate } from 'react-router-dom';

export const QRScanner = () => {
  const [scanResult, setScanResult] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-scanner',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        const playScanSound = () => {
          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch (e) {
            console.warn('Audio play failed', e);
          }
        };

        playScanSound();
        setScanResult(decodedText);
        setIsScanning(false);
        const paymentId = parsePaymentIdFromUrl(decodedText);
        if (paymentId) {
          void scanner.clear();
          navigate(`/pay/${paymentId}`);
        }
      },
      () => { }
    );

    return () => {
      void scanner.clear();
    };
  }, [navigate]);

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-app-border bg-app-hover/30">
          <h2 className="font-serif text-4xl mb-1">Scan</h2>
          <p className="text-sm text-text-pale font-medium uppercase tracking-widest">QR Code Scanner</p>
        </div>

        <div className="p-8">
          {/* Scanner Status */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className={`w-3 h-3 rounded-full ${isScanning ? 'bg-accent-indigo animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-xs font-bold text-text-pale uppercase tracking-widest">
              {isScanning ? 'Awaiting QR Code...' : 'Code Detected'}
            </span>
          </div>

          {/* Scanner Container */}
          <div className="relative rounded-3xl overflow-hidden border-2 border-dashed border-app-border bg-app-bg">
            {/* Scanner Frame Corners */}
            <div className="absolute inset-0 pointer-events-none z-10 p-4">
              <div className="relative w-full h-full">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent-indigo rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent-indigo rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent-indigo rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent-indigo rounded-br-2xl" />
              </div>
            </div>

            {/* QR Scanner */}
            <div
              id="qr-scanner"
              className="rounded-3xl overflow-hidden"
            />

            {/* Scan Line Animation */}
            {isScanning && (
              <motion.div
                animate={{ y: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                className="absolute left-8 right-8 h-1 bg-gradient-to-r from-transparent via-accent-indigo to-transparent pointer-events-none z-20 rounded-full shadow-glow-indigo"
              />
            )}
          </div>

          {/* Result */}
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">QR Code Detected</span>
              </div>
              <p className="text-xs text-emerald-600 font-mono break-all">{scanResult}</p>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-6 bg-app-bg/50 rounded-2xl border border-app-border">
            <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest mb-4">How to Scan</p>
            <ul className="space-y-3">
              {[
                'Position the QR code within the frame',
                'Ensure adequate lighting for best results',
                'Auto-detection will redirect you to claim',
                'Works with all StackPay payment QR codes',
              ].map((instruction, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-dim">
                  <span className="flex-shrink-0 w-6 h-6 bg-accent-indigo/10 rounded-lg flex items-center justify-center text-[10px] font-bold text-accent-indigo">{i + 1}</span>
                  {instruction}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Custom styles for html5-qrcode */}
      <style>{`
        #qr-scanner {
          border: none !important;
        }
        #qr-scanner > div:first-child {
          display: none !important;
        }
        #qr-scanner video {
          border-radius: 24px !important;
        }
        #qr-scanner__scan_region {
          background: transparent !important;
        }
        #qr-scanner__dashboard_section {
          padding: 16px !important;
        }
        #qr-scanner__dashboard_section_csr button {
          background: #4F46E5 !important;
          color: white !important;
          border: none !important;
          padding: 14px 28px !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
          border-radius: 9999px !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
        }
        #qr-scanner__dashboard_section_csr button:hover {
          background: #4338CA !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2) !important;
        }
        #qr-scanner__dashboard_section_csr select {
          background: white !important;
          color: #111827 !important;
          border: 1px solid #E5E7EB !important;
          padding: 12px 16px !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 13px !important;
          border-radius: 12px !important;
          margin: 12px 0 !important;
        }
        #qr-scanner__dashboard_section_csr span {
          color: #9CA3AF !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 12px !important;
        }
        #html5-qrcode-anchor-scan-type-change {
          color: #4F46E5 !important;
          text-decoration: none !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 12px !important;
          font-weight: 600 !important;
        }
      `}</style>
    </div>
  );
};
