import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { WalletProvider } from './context/WalletContext';
import { PaymentProvider } from './context/PaymentContext';
import { WalletConnect } from './components/WalletConnect';
import { SendPayment } from './components/SendPayment';
import { QRGenerator } from './components/QRGenerator';
import { ClaimPayment } from './components/ClaimPayment';
import { BridgeInterface } from './components/BridgeInterface';
import { PaymentHistory } from './components/PaymentHistory';
import { QRScanner } from './components/QRScanner';
import { UsernameRegistry } from './components/UsernameRegistry';
import { ContractDebug } from './components/ContractDebug';
import { useWallet } from './hooks/useWallet';
import { useState, useEffect } from 'react';
import { getUsername } from './utils/stacksUtils';

const navLinks = [
  { path: '/send', label: 'Transfer', icon: '↗', description: 'Send USDCx to any address or username', color: 'bg-indigo-50 text-indigo-600' },
  { path: '/request', label: 'Request', icon: '⬇', description: 'Create a payment link or QR code', color: 'bg-emerald-50 text-emerald-600' },
  { path: '/scan', label: 'Scan', icon: '◎', description: 'Scan QR codes to pay instantly', color: 'bg-amber-50 text-amber-600' },
  { path: '/bridge', label: 'Bridge', icon: '⇌', description: 'Move assets from Ethereum to Stacks', color: 'bg-blue-50 text-blue-600' },
  { path: '/username', label: 'Identity', icon: '@', description: 'Claim your unique on-chain name', color: 'bg-purple-50 text-purple-600' },
  { path: '/history', label: 'History', icon: '☰', description: 'View your transaction records', color: 'bg-slate-50 text-slate-600' },
];

function AuthManager() {
  const { isConnected, address } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkIdentity = async () => {
      // Skip if not connected
      if (!isConnected || !address) return;

      // Skip check if already on identity page
      if (location.pathname === '/username') return;

      // Check for pending registration to avoid blocking user during confirmation
      const pendingUsername = localStorage.getItem(`pending_username_${address}`);
      if (pendingUsername) return;

      // Check contract
      const username = await getUsername(address);
      if (!username) {
        // Enforce identity claim
        console.log('No identity found, redirecting to /username');
        navigate('/username');
      }
    };

    // Check shortly after connection/mount
    const timer = setTimeout(checkIdentity, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, address, location.pathname, navigate]);

  return null;
}

function Navigation() {
  const location = useLocation();
  const { isConnected } = useWallet();

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass rounded-2xl px-6 py-4 border border-app-border shadow-floating flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <span className="font-serif font-bold text-2xl tracking-tighter text-text-main group-hover:text-accent-indigo transition-colors duration-300">
            STACK<span className="italic">PAY</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {isConnected && (
            <div className="flex items-center gap-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-accent-indigo text-white shadow-premium'
                      : 'text-text-dim hover:text-accent-indigo hover:bg-app-hover'
                      }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
          <div className="h-8 w-px bg-app-border" />
          <WalletConnect />
        </div>

        <div className="lg:hidden flex items-center gap-4">
          <WalletConnect />
        </div>
      </div>

      {isConnected && (
        <div className="lg:hidden flex items-center gap-3 mt-4 overflow-x-auto pb-2 px-1 no-scrollbar">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${isActive
                  ? 'bg-accent-indigo text-white shadow-premium'
                  : 'bg-white/80 backdrop-blur border border-app-border text-text-dim'
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomeView />} />
        <Route path="/send" element={<PageWrapper><SendPayment /></PageWrapper>} />
        <Route path="/request" element={<PageWrapper><QRGenerator /></PageWrapper>} />
        <Route path="/scan" element={<PageWrapper><QRScanner /></PageWrapper>} />
        <Route path="/bridge" element={<PageWrapper><BridgeInterface /></PageWrapper>} />
        <Route path="/username" element={<PageWrapper><UsernameRegistry /></PageWrapper>} />
        <Route path="/pay/:paymentId" element={<PageWrapper><ClaimPayment /></PageWrapper>} />
        <Route path="/history" element={<PageWrapper><PaymentHistory /></PageWrapper>} />
        <Route path="/debug" element={<PageWrapper><ContractDebug /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function HomeView() {
  const { isConnected } = useWallet();
  return isConnected ? <Dashboard /> : <LandingPage />;
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="pt-44 pb-24 px-6 min-h-screen"
    >
      <div className="max-w-4xl mx-auto">
        {children}
      </div>
    </motion.div>
  );
}

function App() {
  return (
    <WalletProvider>
      <PaymentProvider>
        <BrowserRouter>
          <Analytics />
          <AuthManager />
          <div className="min-h-screen bg-app-bg grid-subtle selection:bg-accent-indigo/10 selection:text-accent-indigo">
            <Navigation />
            <main className="relative">
              <AnimatedRoutes />
            </main>

            <footer className="border-t border-app-border py-16 px-6 bg-white">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex flex-col items-center md:items-start gap-5">
                  <span className="font-serif font-bold text-2xl tracking-tighter text-text-main">
                    STACK<span className="italic">PAY</span>
                  </span>
                  <p className="text-sm text-text-pale max-w-xs text-center md:text-left leading-relaxed">
                    The elegant way to send and receive crypto on the Stacks blockchain.
                  </p>
                  <a
                    href="https://github.com/NikhilRaikwar/StackPay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-text-dim hover:text-accent-indigo transition-colors group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    <span className="text-sm font-medium">GitHub</span>
                  </a>
                </div>

                <div className="flex flex-col items-center md:items-end gap-4">
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold tracking-widest uppercase">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Network: Stacks Testnet
                  </div>
                  <p className="text-xs text-text-pale uppercase tracking-widest font-medium">
                    © 2026 STACKPAY PROTOCOL
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </PaymentProvider>
    </WalletProvider>
  );
}



const processSteps = [
  { step: '01', title: 'Connect Wallet', description: 'Link your Stacks wallet securely in one click.', icon: '🔗' },
  { step: '02', title: 'Choose Action', description: 'Send payments, request funds via QR, or bridge assets.', icon: '⚡' },
  { step: '03', title: 'Confirm & Done', description: 'Transactions settle in seconds on the Stacks network.', icon: '✓' }
];

const faqs = [
  { q: 'What is StackPay?', a: 'StackPay is a modern payment terminal built on Stacks, enabling instant peer-to-peer payments using USDCx stablecoin with features like username identity, QR payments, and cross-chain bridging.' },
  { q: 'How do I get USDCx?', a: 'You can bridge USDC from Ethereum to Stacks using our built-in bridge feature, or receive USDCx from other users. The bridge typically takes 2-5 minutes.' },
  { q: 'Are transactions secure?', a: 'Absolutely. All transactions are secured by the Stacks blockchain, which inherits Bitcoin\'s security. Smart contracts handle escrow and payments trustlessly.' },
  { q: 'What are usernames for?', a: 'Usernames let you send and receive payments using a simple @name instead of complex wallet addresses.' },
  { q: 'Is there a fee?', a: 'StackPay itself charges no fees. You only pay standard Stacks network transaction fees, which are typically fractions of a cent.' },
  { q: 'Which wallets are supported?', a: 'We support Leather (formerly Hiro Wallet) for Stacks and MetaMask for Ethereum bridging.' }
];

const useCases = [
  { icon: '🏪', title: 'Merchants', desc: 'Accept payments via QR. No chargebacks, instant settlement, zero fees.' },
  { icon: '💼', title: 'Freelancers', desc: 'Send invoices, get paid in USDCx with escrow protection.' },
  { icon: '👥', title: 'Split Bills', desc: 'Dinner with friends? Split the bill in 2 clicks.' }
];

const comparisonData = [
  { feature: 'Speed', stackpay: { value: 'Instant', status: 'good' }, venmo: { value: 'Instant', status: 'good' }, crypto: { value: '10-30 min', status: 'bad' } },
  { feature: 'Security', stackpay: { value: 'Smart Contract Escrow', status: 'good' }, venmo: { value: 'Centralized', status: 'warn' }, crypto: { value: 'No Protection', status: 'bad' } },
  { feature: 'Fees', stackpay: { value: 'Near Zero', status: 'good' }, venmo: { value: '3% instant', status: 'bad' }, crypto: { value: 'Gas fees', status: 'warn' } },
  { feature: 'Decentralized', stackpay: { value: 'Yes', status: 'good' }, venmo: { value: 'No', status: 'bad' }, crypto: { value: 'Yes', status: 'good' } },
];

const PhoneMockup = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="relative bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-20" />
      <div className="bg-white rounded-[2.5rem] overflow-hidden w-64 h-[520px] relative">
        {children}
      </div>
    </div>
  </div>
);

const QRCodeDisplay = ({ amount }: { amount: number }) => (
  <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-accent-indigo/5 to-white">
    <div className="w-12 h-12 bg-accent-indigo rounded-2xl flex items-center justify-center mb-4">
      <span className="text-white text-xl font-bold">$</span>
    </div>
    <p className="text-text-pale text-sm mb-2">Request Payment</p>
    <p className="font-serif text-3xl text-text-main mb-6">${amount} USDCx</p>
    <div className="w-40 h-40 bg-white rounded-2xl p-3 shadow-lg border border-app-border">
      <div className="w-full h-full grid grid-cols-7 grid-rows-7 gap-0.5">
        {Array.from({ length: 49 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.01 }}
            className={`rounded-sm ${Math.random() > 0.5 ? 'bg-gray-900' : 'bg-transparent'}`}
          />
        ))}
      </div>
    </div>
    <p className="text-xs text-text-pale mt-4">@bob</p>
  </div>
);

const qrPattern = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
];

const ScanningAnimation = () => (
  <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-900 relative overflow-hidden">
    <div className="w-44 h-44 bg-white rounded-xl p-2 relative overflow-hidden">
      <div className="w-full h-full grid grid-cols-[repeat(21,1fr)] grid-rows-[repeat(21,1fr)] gap-[1px]">
        {qrPattern.flat().map((cell, i) => (
          <div
            key={i}
            className={`${cell ? 'bg-gray-900' : 'bg-white'}`}
          />
        ))}
      </div>
      <motion.div
        className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.9),0_0_30px_rgba(16,185,129,0.6)]"
        animate={{ top: ['5%', '95%', '5%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[15%] left-[15%] w-6 h-6 border-t-3 border-l-3 border-emerald-400" />
      <div className="absolute top-[15%] right-[15%] w-6 h-6 border-t-3 border-r-3 border-emerald-400" />
      <div className="absolute bottom-[15%] left-[15%] w-6 h-6 border-b-3 border-l-3 border-emerald-400" />
      <div className="absolute bottom-[15%] right-[15%] w-6 h-6 border-b-3 border-r-3 border-emerald-400" />
    </div>
    <p className="text-white mt-6 text-sm font-medium">Scanning QR code...</p>
    <motion.p
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="mt-2 text-emerald-400 text-xs"
    >
      @alice is paying @bob
    </motion.p>
  </div>
);

const SuccessScreen = () => (
  <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-white">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6"
    >
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white text-4xl"
      >
        ✓
      </motion.span>
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="font-serif text-2xl text-text-main mb-2"
    >
      Payment Complete!
    </motion.p>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="text-text-pale text-sm mb-4"
    >
      $50 USDCx sent to @bob
    </motion.p>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="text-xs text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full"
    >
      Confirmed in 1.2 seconds
    </motion.div>
  </div>
);

const DemoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setDemoStep(0);
      return;
    }

    const timers = [
      setTimeout(() => setDemoStep(1), 500),
      setTimeout(() => setDemoStep(2), 3000),
      setTimeout(() => setDemoStep(3), 5500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-accent-indigo text-sm font-bold uppercase tracking-widest mb-1">Live Demo</p>
            <h3 className="font-serif text-xl sm:text-2xl">Watch a Payment in Action</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-app-bg flex items-center justify-center text-text-pale hover:text-text-main transition-colors">
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <div className="relative bg-gray-900 rounded-[2.5rem] p-1.5 shadow-xl scale-[0.85] sm:scale-100">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-xl z-20" />
              <div className="bg-white rounded-[2rem] overflow-hidden w-52 h-[420px] relative">
                <AnimatePresence mode="wait">
                  {demoStep <= 1 && (
                    <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <QRCodeDisplay amount={50} />
                    </motion.div>
                  )}
                  {demoStep === 2 && (
                    <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <ScanningAnimation />
                    </motion.div>
                  )}
                  {demoStep >= 3 && (
                    <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <SuccessScreen />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-xl mb-1">👩</div>
                <p className="font-bold text-text-main text-sm">@alice</p>
              </div>

              <motion.div
                animate={{ x: demoStep >= 2 ? [0, 5, 0] : 0 }}
                transition={{ duration: 0.5, repeat: demoStep === 2 ? Infinity : 0 }}
                className="flex items-center gap-1"
              >
                <div className={`w-8 h-0.5 rounded-full ${demoStep >= 2 ? 'bg-emerald-400' : 'bg-app-border'}`} />
                <motion.span
                  animate={{ scale: demoStep === 2 ? [1, 1.2, 1] : 1 }}
                  className={`text-lg ${demoStep >= 2 ? '' : 'grayscale opacity-30'}`}
                >
                  💸
                </motion.span>
                <div className={`w-8 h-0.5 rounded-full ${demoStep >= 3 ? 'bg-emerald-400' : 'bg-app-border'}`} />
              </motion.div>

              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-xl mb-1">👨</div>
                <p className="font-bold text-text-main text-sm">@bob</p>
              </div>
            </div>

            <div className="bg-app-bg rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-pale text-sm">Amount</span>
                <span className="font-serif text-xl text-accent-indigo">$50 USDCx</span>
              </div>

              <div className="space-y-2">
                {[
                  { step: 1, label: 'QR Code Generated', icon: '📱' },
                  { step: 2, label: 'Scanning & Confirming', icon: '🔍' },
                  { step: 3, label: 'Payment Complete', icon: '✅' },
                ].map((s) => (
                  <div key={s.step} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${demoStep >= s.step ? 'bg-white shadow-sm' : ''}`}>
                    <span className={`text-base ${demoStep >= s.step ? '' : 'grayscale opacity-30'}`}>{s.icon}</span>
                    <span className={`text-sm ${demoStep >= s.step ? 'text-text-main font-medium' : 'text-text-pale'}`}>{s.label}</span>
                    {demoStep === s.step && s.step !== 3 && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="ml-auto w-4 h-4 border-2 border-accent-indigo border-t-transparent rounded-full"
                      />
                    )}
                    {(demoStep > s.step || (demoStep === 3 && s.step === 3)) && (
                      <span className="ml-auto text-emerald-500">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {demoStep >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-emerald-600 font-medium mb-3 text-sm">This was a simulated demo. Connect your wallet to use real USDCx!</p>
                <button onClick={onClose} className="btn-primary w-full">
                  Connect Wallet to Start
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoStep, setDemoStep] = useState(1);
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev % 3) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden">
      <AnimatePresence>
        {showDemoModal && <DemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />}
      </AnimatePresence>

      <section className="min-h-screen flex items-center justify-center px-6 pt-28 pb-20 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent-indigo/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-accent-indigo/5 border border-accent-indigo/10 text-accent-indigo text-sm font-medium mb-8">
                <span className="w-2 h-2 bg-accent-indigo rounded-full animate-pulse" />
                Redefining P2P Payments
              </div>

              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-text-main leading-[0.95] mb-8">
                Pay anyone, <br />
                <span className="italic text-accent-indigo">effortlessly.</span>
              </h1>

              <p className="text-lg sm:text-xl text-text-dim max-w-lg mb-10 leading-relaxed">
                The first high-fidelity payment terminal built on Stacks. Send USDCx with usernames, QR codes, and zero friction.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="group relative px-8 py-4 bg-accent-indigo text-white font-semibold rounded-2xl transition-all duration-300 hover:shadow-floating hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🎮</span>
                    Try Live Demo
                  </span>
                  <span className="block text-xs text-white/70 mt-1">No wallet needed</span>
                </button>

                <div className="flex items-center gap-3">
                  <WalletConnect />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative hidden lg:flex justify-center"
            >
              <PhoneMockup>
                <AnimatePresence mode="wait">
                  {demoStep === 1 && (
                    <motion.div
                      key="qr"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <QRCodeDisplay amount={50} />
                    </motion.div>
                  )}
                  {demoStep === 2 && (
                    <motion.div
                      key="scan"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <ScanningAnimation />
                    </motion.div>
                  )}
                  {demoStep === 3 && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <SuccessScreen />
                    </motion.div>
                  )}
                </AnimatePresence>
              </PhoneMockup>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-2 -right-8 p-3 bg-white border border-app-border rounded-2xl shadow-floating"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-sm">✓</div>
                  <div>
                    <p className="text-sm font-bold text-text-main">Payment Sent</p>
                    <p className="text-xs text-text-pale">$50 → @bob</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-2 -left-8 p-3 bg-white border border-app-border rounded-2xl shadow-floating"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-accent-indigo/10 rounded-xl flex items-center justify-center text-accent-indigo text-sm">@</div>
                  <div>
                    <p className="text-sm font-bold text-text-main">@alice paid you</p>
                    <p className="text-xs text-text-pale">1.2 seconds ago</p>
                  </div>
                </div>
              </motion.div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-accent-indigo/5 blur-[100px] rounded-full -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white border-b border-app-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-accent-indigo font-bold text-sm tracking-widest uppercase mb-4">Comparison</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl mb-4">Why StackPay wins.</h2>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-app-border">
                  <th className="text-left py-4 px-4 text-text-pale font-medium"></th>
                  <th className="text-center py-4 px-4">
                    <div className="inline-flex items-center gap-2 bg-accent-indigo/10 text-accent-indigo px-4 py-2 rounded-full text-sm font-bold">
                      StackPay
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 text-text-dim">Venmo</th>
                  <th className="text-center py-4 px-4 text-text-dim">Traditional Crypto</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <motion.tr
                    key={row.feature}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="border-b border-app-border"
                  >
                    <td className="py-4 px-4 font-medium text-text-main">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-2 ${row.stackpay.status === 'good' ? 'text-emerald-600' : row.stackpay.status === 'warn' ? 'text-amber-600' : 'text-red-500'}`}>
                        {row.stackpay.status === 'good' ? '✅' : row.stackpay.status === 'warn' ? '⚠️' : '❌'} {row.stackpay.value}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-2 ${row.venmo.status === 'good' ? 'text-emerald-600' : row.venmo.status === 'warn' ? 'text-amber-600' : 'text-red-500'}`}>
                        {row.venmo.status === 'good' ? '✅' : row.venmo.status === 'warn' ? '⚠️' : '❌'} {row.venmo.value}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-2 ${row.crypto.status === 'good' ? 'text-emerald-600' : row.crypto.status === 'warn' ? 'text-amber-600' : 'text-red-500'}`}>
                        {row.crypto.status === 'good' ? '✅' : row.crypto.status === 'warn' ? '⚠️' : '❌'} {row.crypto.value}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-accent-indigo font-bold text-sm tracking-widest uppercase mb-4">Use Cases</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl">Real-world applications.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white border border-app-border rounded-3xl p-8 hover:shadow-floating hover:border-accent-indigo/20 transition-all duration-500 group"
              >
                <div className="w-16 h-16 bg-accent-indigo/10 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500">
                  {uc.icon}
                </div>
                <h3 className="font-serif text-2xl mb-3 group-hover:text-accent-indigo transition-colors">{uc.title}</h3>
                <p className="text-text-dim leading-relaxed">"{uc.desc}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white border-y border-app-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-text-pale text-sm uppercase tracking-widest mb-8">Powered by</p>
          <div className="flex items-center justify-center gap-8 sm:gap-16 flex-wrap">
            {[
              { name: 'Stacks', icon: '⚡' },
              { name: 'Bitcoin L2', icon: '₿' },
              { name: 'USDCx', icon: '💵' },
              { name: 'Ethereum Bridge', icon: 'Ξ' },
            ].map((tech) => (
              <div key={tech.name} className="flex items-center gap-3 text-text-dim hover:text-text-main transition-colors">
                <span className="text-2xl">{tech.icon}</span>
                <span className="font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <p className="text-accent-indigo font-bold text-sm tracking-widest uppercase mb-4">Smart Contracts</p>
            <h2 className="font-serif text-2xl sm:text-3xl">Deployed on Stacks Testnet</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            <motion.a
              href="https://explorer.hiro.so/txid/ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5.payment-requests-v9?chain=testnet"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white border border-app-border rounded-2xl p-5 hover:border-accent-indigo/30 hover:shadow-floating transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-indigo/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                  💸
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg mb-1 group-hover:text-accent-indigo transition-colors">Payment Requests</h3>
                  <p className="text-xs text-text-pale font-mono truncate mb-2">ST2Y455...payment-requests-v9</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-accent-indigo font-medium">
                    View on Explorer <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                </div>
              </div>
            </motion.a>

            <motion.a
              href="https://explorer.hiro.so/txid/ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5.username-registry?chain=testnet"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-app-border rounded-2xl p-5 hover:border-accent-indigo/30 hover:shadow-floating transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                  👤
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg mb-1 group-hover:text-accent-indigo transition-colors">Username Registry</h3>
                  <p className="text-xs text-text-pale font-mono truncate mb-2">ST2Y455...username-registry</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-accent-indigo font-medium">
                    View on Explorer <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                </div>
              </div>
            </motion.a>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white border-b border-app-border">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center mb-16"
          >
            <p className="text-accent-indigo font-bold text-sm tracking-widest uppercase mb-4">Features</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl mb-6">Built for the modern economy.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "One-Click Identity", desc: "Register a human-readable @username that replaces complex wallet addresses forever.", icon: "👤" },
              { title: "QR Ecosystem", desc: "Generate and scan QR codes for instant point-of-sale or peer-to-peer payments.", icon: "📱" },
              { title: "Cross-Chain Ready", desc: "Native Ethereum bridge ensures you always have USDCx ready to spend.", icon: "🌐" }
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-app-bg border border-app-border rounded-3xl p-8 group hover:shadow-floating hover:border-accent-indigo/20 transition-all duration-500"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-premium group-hover:scale-110 transition-transform duration-500">
                  {f.icon}
                </div>
                <h3 className="font-serif text-xl sm:text-2xl mb-4 group-hover:text-accent-indigo transition-colors">{f.title}</h3>
                <p className="text-text-dim leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center mb-16"
          >
            <p className="text-accent-indigo font-bold text-sm tracking-widest uppercase mb-4">How It Works</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl">Three simple steps.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative group"
              >
                {i < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-px bg-gradient-to-r from-app-border to-transparent" />
                )}

                <div className="bg-white border border-app-border rounded-3xl p-8 relative z-10 hover:shadow-floating hover:border-accent-indigo/20 transition-all duration-500">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-accent-indigo/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500">
                      {step.icon}
                    </div>
                    <span className="font-serif text-4xl text-accent-indigo/20">{step.step}</span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl mb-3 group-hover:text-accent-indigo transition-colors">{step.title}</h3>
                  <p className="text-text-dim leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white border-y border-app-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center mb-12"
          >
            <p className="text-accent-indigo font-bold text-sm tracking-widest uppercase mb-4">FAQ</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl">Common questions.</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border border-app-border rounded-2xl overflow-hidden bg-app-bg hover:border-accent-indigo/20 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-serif text-lg sm:text-xl text-text-main">{faq.q}</span>
                  <span className={`flex-shrink-0 w-8 h-8 bg-white border border-app-border rounded-lg flex items-center justify-center text-accent-indigo transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5">
                        <p className="text-text-dim leading-relaxed">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-accent-indigo to-indigo-700 rounded-3xl p-10 sm:p-14 text-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10">
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white mb-6">
                Ready to get started?
              </h2>
              <p className="text-lg text-white/80 max-w-xl mx-auto mb-8 leading-relaxed">
                Connect your wallet now and experience the future of peer-to-peer payments.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="px-8 py-4 bg-white text-accent-indigo font-semibold rounded-2xl hover:shadow-floating transition-all"
                >
                  🎮 Try Live Demo
                </button>
                <WalletConnect />
              </div>
              <div className="flex items-center justify-center gap-3 text-white/60 text-sm mt-8">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Stacks Testnet Live
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const Dashboard = () => {
  const { address } = useWallet();

  return (
    <div className="pt-36 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <p className="text-accent-indigo font-bold text-sm tracking-widest uppercase mb-4">Command Center</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-text-main leading-tight">
            Welcome back, <br />
            <span className="italic text-text-pale font-light">
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </span>
          </h1>
        </motion.header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {navLinks.map((link, i) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={link.path}>
                <motion.div
                  whileHover={{ y: -8 }}
                  className="bg-white border border-app-border rounded-3xl p-8 h-full flex flex-col group hover:shadow-floating hover:border-accent-indigo/20 transition-all duration-500 relative overflow-hidden"
                >
                  <div className={`w-16 h-16 ${link.color} rounded-2xl flex items-center justify-center text-3xl mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                    {link.icon}
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl mb-3 text-text-main">{link.label}</h3>
                  <p className="text-text-dim leading-relaxed flex-grow">
                    {link.description}
                  </p>

                  <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                    <span className="text-accent-indigo text-2xl">→</span>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 p-10 border border-app-border rounded-3xl bg-white flex flex-col md:flex-row items-center justify-between gap-10"
        >
          <div className="flex items-center gap-10">
            <div className="text-center md:text-left">
              <p className="text-xs uppercase tracking-widest text-text-pale font-bold mb-2">Assets</p>
              <p className="font-serif text-3xl">USDCx</p>
            </div>
            <div className="w-px h-14 bg-app-border" />
            <div className="text-center md:text-left">
              <p className="text-xs uppercase tracking-widest text-text-pale font-bold mb-2">Status</p>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-medium text-lg">Synced</span>
              </div>
            </div>
          </div>

          <Link to="/history">
            <button className="btn-secondary text-lg px-10 py-4">View Recent Activity</button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default App;
