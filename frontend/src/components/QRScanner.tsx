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
        // Play success sound
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
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="terminal-card overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-terminal-border bg-terminal-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-yellow/10 border border-neon-yellow/50 rounded-lg flex items-center justify-center">
              <span className="text-neon-yellow text-xl">◎</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">SCAN QR CODE</h2>
              <p className="font-mono text-xs text-text-muted">Point camera at payment QR</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Scanner Status */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-neon-green animate-pulse' : 'bg-neon-cyan'}`} />
            <span className="font-mono text-xs text-text-muted tracking-wider">
              {isScanning ? 'SCANNING...' : 'DETECTED'}
            </span>
          </div>

          {/* Scanner Container */}
          <div className="relative">
            {/* Scanner Frame */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-neon-cyan" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neon-cyan" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-neon-cyan" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-neon-cyan" />
            </div>

            {/* QR Scanner */}
            <div
              id="qr-scanner"
              className="rounded-lg overflow-hidden bg-terminal-bg [&_video]:rounded-lg"
              style={{
                // Override html5-qrcode default styles
              }}
            />

            {/* Scan Line Animation */}
            {isScanning && (
              <motion.div
                animate={{ y: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent pointer-events-none z-20"
              />
            )}
          </div>

          {/* Result */}
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-terminal-bg rounded-lg border border-neon-green/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-neon-green rounded-full" />
                <span className="font-mono text-xs text-neon-green tracking-wider">QR DETECTED</span>
              </div>
              <p className="font-mono text-xs text-text-secondary break-all">{scanResult}</p>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-terminal-bg/50 rounded-lg border border-terminal-border">
            <p className="font-mono text-xs text-text-muted mb-3">INSTRUCTIONS</p>
            <ul className="space-y-2">
              {[
                'Position the QR code within the frame',
                'Make sure the code is well-lit and in focus',
                'The scanner will automatically detect payment QRs',
                'You will be redirected to claim the payment',
              ].map((instruction, i) => (
                <li key={i} className="flex items-start gap-2 font-mono text-xs text-text-secondary">
                  <span className="text-neon-cyan">{i + 1}.</span>
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
          border-radius: 8px !important;
        }
        #qr-scanner__scan_region {
          background: transparent !important;
        }
        #qr-scanner__dashboard_section {
          padding: 0 !important;
        }
        #qr-scanner__dashboard_section_csr button {
          background: #00f5ff !important;
          color: #0a0a0f !important;
          border: none !important;
          padding: 12px 24px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
        }
        #qr-scanner__dashboard_section_csr button:hover {
          transform: scale(1.02) !important;
          box-shadow: 0 0 20px rgba(0, 245, 255, 0.3) !important;
        }
        #qr-scanner__dashboard_section_csr select {
          background: #1a1a24 !important;
          color: white !important;
          border: 1px solid #2a2a3a !important;
          padding: 8px 12px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px !important;
          border-radius: 8px !important;
          margin: 8px 0 !important;
        }
        #qr-scanner__dashboard_section_csr span {
          color: #a0a0b0 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
        }
        #html5-qrcode-anchor-scan-type-change {
          color: #00f5ff !important;
          text-decoration: none !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
        }
      `}</style>
    </div>
  );
};
