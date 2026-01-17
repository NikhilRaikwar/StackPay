import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

const navLinks = [
  { path: '/send', label: 'Send', icon: '↗' },
  { path: '/request', label: 'Request', icon: '⬇' },
  { path: '/scan', label: 'Scan', icon: '◎' },
  { path: '/bridge', label: 'Bridge', icon: '⇌' },
  { path: '/username', label: 'Identity', icon: '@' },
  { path: '/history', label: 'History', icon: '☰' },
];

function Navigation() {
  const location = useLocation();
  const { isConnected } = useWallet();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-terminal-bg/80 backdrop-blur-xl border-b border-terminal-border">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-neon-cyan/10 border-2 border-neon-cyan rounded-lg flex items-center justify-center group-hover:shadow-neon-cyan transition-all duration-300">
                <span className="font-display font-bold text-neon-cyan text-lg">S</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg text-white tracking-wider">
                STACKS<span className="text-neon-cyan">PAY</span>
              </h1>
              <p className="text-[10px] font-mono text-text-muted tracking-widest">TERMINAL v1.0</p>
            </div>
          </Link>

          {/* Nav Links - Desktop (Only show when connected) */}
          {isConnected && (
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-4 py-2 font-mono text-sm tracking-wider transition-all duration-300 ${isActive
                      ? 'text-neon-cyan'
                      : 'text-text-secondary hover:text-white'
                      }`}
                  >
                    <span className="mr-2 opacity-50">{link.icon}</span>
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Wallet */}
          <WalletConnect />
        </div>

        {/* Mobile Nav (Only show when connected) */}
        {isConnected && (
          <div className="flex lg:hidden items-center gap-2 mt-3 overflow-x-auto pb-2 -mx-4 px-4">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full font-mono text-xs tracking-wider transition-all duration-300 ${isActive
                    ? 'bg-neon-cyan text-terminal-bg'
                    : 'bg-terminal-card text-text-secondary border border-terminal-border'
                    }`}
                >
                  <span className="mr-1">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
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

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="pt-32 pb-12 px-4"
    >
      {children}
    </motion.div>
  );
}

function App() {
  return (
    <WalletProvider>
      <PaymentProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-terminal-bg grid-bg relative overflow-hidden">
            {/* Scanline Effect */}
            <div className="scanline-overlay" />

            {/* Floating Orbs */}
            <div className="orb orb-cyan w-96 h-96 -top-48 -left-48" />
            <div className="orb orb-magenta w-80 h-80 top-1/3 -right-40" style={{ animationDelay: '2s' }} />
            <div className="orb orb-green w-64 h-64 bottom-20 left-1/4" style={{ animationDelay: '4s' }} />

            <Navigation />
            <main className="relative z-10">
              <AnimatedRoutes />
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-terminal-border py-8 px-4">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
                  <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                  NETWORK: STACKS TESTNET
                </div>
                <div className="font-mono text-xs text-text-muted">
                  © 2026 STACKSPAY PRO // BUILT FOR THE FUTURE
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </PaymentProvider>
    </WalletProvider>
  );
}

// Landing Page Component
const LandingPage = () => {
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            {/* Terminal Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-terminal-card border border-terminal-border mb-8"
            >
              <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <span className="font-mono text-xs text-text-secondary tracking-wider">
                {isConnected ? 'WALLET CONNECTED // READY TO TRANSACT' : 'SYSTEM ONLINE // CONNECT WALLET TO START'}
              </span>
            </motion.div>

            {/* Main Title */}
            <h1 className="font-display font-black text-5xl md:text-7xl lg:text-8xl text-white mb-6 leading-tight">
              <span className="block">SEND</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan animate-gradient bg-[length:200%_auto]">
                CRYPTO
              </span>
              <span className="block">LIKE CASH</span>
            </h1>

            {/* Subtitle */}
            <p className="font-body text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              The future of peer-to-peer payments. Send <span className="text-neon-cyan">USDCx</span> instantly on Stacks blockchain.
              Scan QR codes. Use @usernames. Bridge from Ethereum.
              <span className="text-neon-magenta"> Zero friction.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isConnected ? (
                <>
                  <Link to="/send">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-neon-solid px-10 py-4 text-base"
                    >
                      START SENDING →
                    </motion.button>
                  </Link>
                  <Link to="/request">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-neon px-10 py-4 text-base"
                    >
                      REQUEST PAYMENT
                    </motion.button>
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="font-mono text-sm text-text-muted">👆 Connect your wallet above to get started</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-terminal-card border border-terminal-border rounded-lg">
                      <img src="https://leather.io/leather-logo.svg" alt="Leather" className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      <span className="font-mono text-xs text-text-muted">Leather</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-terminal-card border border-terminal-border rounded-lg">
                      <span className="font-mono text-xs text-text-muted">Xverse</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-20"
          >
            {[
              { label: 'BLOCK TIME', value: '~30s', icon: '⚡' },
              { label: 'GAS COST', value: '<$0.01', icon: '💰' },
              { label: 'SECURITY', value: 'BITCOIN', icon: '🔒' },
              { label: 'STATUS', value: 'LIVE', icon: '●', iconColor: 'text-neon-green' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="terminal-card p-4 text-center"
              >
                <div className={`text-2xl mb-2 ${stat.iconColor || ''}`}>{stat.icon}</div>
                <div className="font-display font-bold text-xl text-neon-cyan">{stat.value}</div>
                <div className="font-mono text-xs text-text-muted">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 border-t border-terminal-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              SYSTEM <span className="text-neon-cyan">CAPABILITIES</span>
            </h2>
            <p className="font-mono text-sm text-text-muted">// CORE FEATURES</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '↗',
                title: 'INSTANT TRANSFER',
                description: 'Send USDCx to any Stacks address or @username in seconds. Fast, secure, borderless.',
                color: 'cyan',
                link: '/send',
              },
              {
                icon: '◎',
                title: 'QR PAYMENTS',
                description: 'Generate scannable payment requests. Share QR codes or links for seamless collection.',
                color: 'magenta',
                link: '/request',
              },
              {
                icon: '⇌',
                title: 'ETH BRIDGE',
                description: 'Bridge USDC from Ethereum to Stacks automatically when you need more USDCx.',
                color: 'green',
                link: '/bridge',
              },
              {
                icon: '@',
                title: 'IDENTITY SYSTEM',
                description: 'Claim your unique @username on-chain. Make peer discovery easy and memorable.',
                color: 'pink',
                link: '/username',
              },
              {
                icon: '⬇',
                title: 'CLAIM PAYMENTS',
                description: 'Receive funds by scanning QR codes or opening payment links shared with you.',
                color: 'yellow',
                link: '/scan',
              },
              {
                icon: '☰',
                title: 'FULL HISTORY',
                description: 'Track all your transactions with detailed records fetched directly from blockchain.',
                color: 'orange',
                link: '/history',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {isConnected ? (
                  <Link to={feature.link}>
                    <FeatureCard feature={feature} />
                  </Link>
                ) : (
                  <FeatureCard feature={feature} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-t border-terminal-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              HOW IT <span className="text-neon-magenta">WORKS</span>
            </h2>
            <p className="font-mono text-sm text-text-muted">// THREE SIMPLE STEPS</p>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'CONNECT WALLET',
                description: 'Link your Leather or Xverse wallet to access the terminal. Your keys, your control.',
              },
              {
                step: '02',
                title: 'CLAIM IDENTITY',
                description: 'Register your unique @username on the Stacks blockchain. Easy to share, impossible to forget.',
              },
              {
                step: '03',
                title: 'START TRANSACTING',
                description: 'Send payments, generate QR codes, bridge from Ethereum, and track your history.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex items-start gap-6"
              >
                <div className="flex-shrink-0 w-16 h-16 bg-terminal-card border-2 border-neon-cyan rounded-lg flex items-center justify-center">
                  <span className="font-display font-bold text-xl text-neon-cyan">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-white mb-2">{item.title}</h3>
                  <p className="font-body text-text-secondary">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4 border-t border-terminal-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              POWERED <span className="text-neon-green">BY</span>
            </h2>
            <p className="font-mono text-sm text-text-muted">// TECHNOLOGY STACK</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Stacks', desc: 'Bitcoin L2' },
              { name: 'Clarity', desc: 'Smart Contracts' },
              { name: 'USDCx', desc: 'Stablecoin' },
              { name: 'Bitcoin', desc: 'Security' },
            ].map((tech, i) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="terminal-card p-4 text-center"
              >
                <p className="font-display font-bold text-lg text-white">{tech.name}</p>
                <p className="font-mono text-xs text-text-muted">{tech.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-terminal-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="terminal-card p-8 md:p-12 text-center relative overflow-hidden"
          >
            <div className="corner-decoration corner-tl" />
            <div className="corner-decoration corner-tr" />
            <div className="corner-decoration corner-bl" />
            <div className="corner-decoration corner-br" />

            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              READY TO <span className="text-neon-green">BEGIN</span>?
            </h2>
            <p className="font-body text-text-secondary mb-8 max-w-xl mx-auto">
              Join the future of payments. Fast, secure, and borderless
              transactions powered by Stacks and secured by Bitcoin.
            </p>

            {isConnected ? (
              <Link to="/send">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-neon-green px-12 py-4 text-lg"
                >
                  LAUNCH TERMINAL
                </motion.button>
              </Link>
            ) : (
              <div className="space-y-4">
                <p className="font-mono text-sm text-neon-cyan animate-pulse">
                  ↑ Connect your wallet to unlock all features
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ feature }: { feature: any }) => (
  <div className="terminal-card p-6 h-full group cursor-pointer relative overflow-hidden">
    {/* Corner decorations */}
    <div className="corner-decoration corner-tl" />
    <div className="corner-decoration corner-br" />

    <div className={`text-4xl mb-4 text-neon-${feature.color} group-hover:scale-110 transition-transform`}>
      {feature.icon}
    </div>
    <h3 className="font-display font-bold text-lg text-white mb-2 group-hover:text-neon-cyan transition-colors">
      {feature.title}
    </h3>
    <p className="font-body text-sm text-text-secondary">
      {feature.description}
    </p>

    {/* Hover glow */}
    <div className={`absolute inset-0 bg-neon-${feature.color}/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
  </div>
);

export default App;
