<div align="center">

# StackPay Frontend

### React + TypeScript + Vite

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Overview

The StackPay frontend is a modern React application that provides a seamless user interface for interacting with USDCx on the Stacks blockchain. It features wallet integration, cross-chain bridging, and QR-based payment flows.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI Framework |
| TypeScript | 5.6 | Type Safety |
| Vite | 6.0 | Build Tool & Dev Server |
| Tailwind CSS | 3.4 | Styling |
| Framer Motion | 11.x | Animations |
| @stacks/connect | Latest | Stacks Wallet Integration |
| @stacks/transactions | Latest | Blockchain Transactions |
| ethers.js | 6.x | Ethereum/Bridge Integration |
| qrcode.react | Latest | QR Code Generation |
| html5-qrcode | Latest | QR Code Scanning |
| Firebase | 11.x | Real-time Payment Status |

---

## Project Structure

```
frontend/
├── src/
│   ├── components/           # React UI Components
│   │   ├── BridgeInterface.tsx    # Ethereum to Stacks bridging
│   │   ├── ClaimPayment.tsx       # Claim escrowed payments
│   │   ├── ContractDebug.tsx      # Developer contract testing
│   │   ├── PaymentHistory.tsx     # Transaction history
│   │   ├── PaymentRequest.tsx     # Payment request handling
│   │   ├── QRGenerator.tsx        # Create payment QR codes
│   │   ├── QRScanner.tsx          # Scan payment QR codes
│   │   ├── SendPayment.tsx        # Direct P2P transfers
│   │   ├── UsernameRegistry.tsx   # @username registration
│   │   └── WalletConnect.tsx      # Multi-wallet connection
│   │
│   ├── context/              # React Context Providers
│   │   ├── PaymentContext.tsx     # Payment state management
│   │   └── WalletContext.tsx      # Wallet connection state
│   │
│   ├── hooks/                # Custom React Hooks
│   │   ├── useBridge.ts           # Bridge operation hooks
│   │   ├── usePayment.ts          # Payment operations
│   │   └── useWallet.ts           # Wallet connection hooks
│   │
│   ├── utils/                # Utility Functions
│   │   ├── bridgeHelpers.ts       # Bridge utility functions
│   │   ├── bridgeUtils.ts         # xReserve integration
│   │   ├── firebase.ts            # Firebase configuration
│   │   ├── qrUtils.ts             # QR code utilities
│   │   ├── stacksApi.ts           # Stacks API wrapper
│   │   └── stacksUtils.ts         # Contract interactions
│   │
│   ├── assets/               # Static assets
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── types.d.ts            # TypeScript declarations
│
├── public/                   # Public static files
├── index.html                # HTML entry point
├── package.json              # Dependencies
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite configuration
```

---

## Components

### Core Payment Components

#### `SendPayment.tsx`
Direct peer-to-peer USDCx transfers with:
- Real-time address/username validation
- Balance checking
- Quick amount buttons
- Transaction confirmation

#### `QRGenerator.tsx`
Payment request creation with:
- Escrow mode (funds locked in contract)
- Invoice mode (direct payment request)
- QR code generation and download
- Shareable payment links

#### `QRScanner.tsx`
QR code scanning for:
- Camera-based scanning
- Payment claim initiation
- Automatic redirect to claim flow

#### `ClaimPayment.tsx`
Payment claiming interface:
- Payment details display
- Escrow claim execution
- Invoice payment fulfillment

#### `BridgeInterface.tsx`
Cross-chain bridging:
- Ethereum wallet connection (MetaMask)
- USDC to USDCx conversion
- Bridge status tracking
- Transaction history

#### `UsernameRegistry.tsx`
On-chain identity:
- @username registration
- Username availability checking
- Address lookup by username
- Reverse lookup (address to username)

#### `PaymentHistory.tsx`
Transaction management:
- Sent/received payments
- Pending claims
- Payment status updates
- Cancel/refund functionality

### Supporting Components

#### `WalletConnect.tsx`
Multi-wallet support:
- Leather wallet
- Xverse wallet
- Connection state management

#### `ContractDebug.tsx`
Developer tools:
- Read-only function calls
- Contract state inspection
- Transaction testing

---

## Context Providers

### `WalletContext.tsx`
```typescript
interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  ethAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  connectEthereumWallet: () => Promise<void>;
}
```

### `PaymentContext.tsx`
```typescript
interface PaymentContextType {
  payments: Payment[];
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  removePayment: (id: string) => void;
}
```

---

## Hooks

### `useWallet()`
Access wallet connection state and methods.

### `usePayment()`
Manage payment state and operations.

### `useBridge()`
Handle bridge operations and status polling.

---

## Utilities

### `stacksUtils.ts`
- `sendUSDCx()` - Direct USDCx transfer
- `createPaymentRequest()` - Create escrow payment
- `createInvoiceRequest()` - Create invoice
- `claimPayment()` - Claim escrowed funds
- `payInvoice()` - Pay invoice
- `getUSDCxBalance()` - Fetch balance
- `resolveStacksRecipient()` - Resolve @username

### `bridgeUtils.ts`
- `bridgeUSDCFromEthereum()` - Initiate bridge
- `pollBridgeStatus()` - Track bridge progress

### `qrUtils.ts`
- `buildPaymentUrl()` - Generate payment URLs
- `parsePaymentUrl()` - Parse scanned URLs

---

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Environment Variables

Create a `.env` file:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Wallet Integration

### Stacks Wallets
- **Leather**: Primary recommended wallet
- **Xverse**: Alternative wallet support

### Ethereum Wallet
- **MetaMask**: Required for bridge operations

---

## Network Configuration

The application connects to:
- **Stacks Testnet** for blockchain operations
- **Ethereum Sepolia** for bridge deposits
- **Hiro API** for blockchain data

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## License

MIT License - See [LICENSE](../LICENSE) for details.
