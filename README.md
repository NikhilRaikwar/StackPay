<div align="center">
<img width="1431" height="744" alt="Screenshot 2026-01-19 235713" src="https://github.com/user-attachments/assets/f531dea9-f3de-4d4b-95bb-e682289b860e" />

# StackPay

### Secure P2P USDCx Payments on Stacks

[![Built on Stacks](https://img.shields.io/badge/Built%20on-Stacks-5546FF?style=for-the-badge&logo=stacks&logoColor=white)](https://www.stacks.co/)
[![USDCx Integration](https://img.shields.io/badge/USDCx-Integrated-2775CA?style=for-the-badge&logo=circle&logoColor=white)](https://www.circle.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

[![Hackathon](https://img.shields.io/badge/Hackathon-Programming%20USDCx%20on%20Stacks-FF6B35?style=for-the-badge)](https://dorahacks.io/)
[![Network](https://img.shields.io/badge/Network-Stacks%20Testnet-5546FF?style=flat-square)](https://explorer.hiro.so/?chain=testnet)
[![Smart Contracts](https://img.shields.io/badge/Contracts-Clarity-purple?style=flat-square)](https://clarity-lang.org/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

[Live Demo](https://stackspay-pro.vercel.app/) | [Video Link](https://youtu.be/M06o_ZFQtzE) | [GitHub](https://github.com/NikhilRaikwar/StackPay)

---

**StackPay** is a comprehensive peer-to-peer payment solution built on the Stacks blockchain, leveraging **USDCx** (bridged USDC via Circle's xReserve protocol) to enable secure, trustless transactions with escrow protection, QR code payments, and seamless Ethereum-to-Stacks bridging.

</div>

---

## Programming USDCx on Stacks - Builder Challenge

This project is submitted to the **Programming USDCx on Stacks Builder Challenge** (January 19-25, 2026), organized by **Stacks Labs**.

### Challenge Overview

USDCx on Stacks opens stablecoin liquidity into the decentralized Stacks ecosystem via Circle's xReserve protocol. This enables:
- Asset transfers from Ethereum to Stacks
- Enhanced DeFi offerings on Stacks
- Stable asset maintenance for users
- Increased liquidity in the ecosystem
- Reliable option for transactions and investments

### How StackPay Integrates USDCx

StackPay demonstrates deep integration with USDCx through:

1. **Direct P2P Transfers** - Send USDCx directly to any Stacks address or @username
2. **Escrow-Protected Payments** - Lock USDCx in smart contracts with secure claim mechanisms
3. **Invoice System** - Create payment requests that others can fulfill with USDCx
4. **Bridge Interface** - Seamlessly bridge USDC from Ethereum to Stacks as USDCx
5. **QR Code Payments** - Generate scannable payment links for merchant/retail use cases

---

## Architecture

```mermaid
flowchart TB
    subgraph Ethereum["Ethereum Network"]
        USDC["USDC Token"]
        xReserve["Circle xReserve"]
    end

    subgraph Bridge["Cross-Chain Bridge"]
        Attestation["Stacks Attestation Service"]
    end

    subgraph Stacks["Stacks Blockchain"]
        USDCx["USDCx Token Contract"]
        
        subgraph Contracts["StackPay Smart Contracts"]
            PaymentContract["payment-requests.clar"]
            UsernameRegistry["username-registry.clar"]
        end
    end

    subgraph Frontend["React Frontend"]
        WalletConnect["Wallet Connection"]
        BridgeUI["Bridge Interface"]
        SendPayment["P2P Transfer"]
        QRGenerator["QR Generator"]
        QRScanner["QR Scanner"]
        ClaimPayment["Claim Payment"]
        UsernameUI["Username Registry"]
        PaymentHistory["Payment History"]
    end

    subgraph Wallets["Supported Wallets"]
        Leather["Leather Wallet"]
        Xverse["Xverse Wallet"]
        MetaMask["MetaMask (Ethereum)"]
    end

    USDC -->|Deposit| xReserve
    xReserve -->|Attestation| Attestation
    Attestation -->|Mint| USDCx

    USDCx <-->|Transfer| PaymentContract
    PaymentContract <-->|Resolve| UsernameRegistry

    WalletConnect --> Leather
    WalletConnect --> Xverse
    BridgeUI --> MetaMask
    BridgeUI --> Attestation

    SendPayment --> PaymentContract
    QRGenerator --> PaymentContract
    QRScanner --> ClaimPayment
    ClaimPayment --> PaymentContract
    UsernameUI --> UsernameRegistry
    PaymentHistory --> PaymentContract
```

---

## Payment Flow

```mermaid
sequenceDiagram
    participant Sender
    participant Frontend
    participant Contract as Payment Contract
    participant USDCx as USDCx Token
    participant Recipient

    Note over Sender, Recipient: Escrow Payment Flow
    
    Sender->>Frontend: Create Payment Request
    Frontend->>USDCx: Approve Transfer
    USDCx-->>Frontend: Approved
    Frontend->>Contract: create-payment-request()
    Contract->>USDCx: Transfer to Escrow
    USDCx-->>Contract: Funds Locked
    Contract-->>Frontend: QR Code Generated
    Frontend-->>Sender: Share QR/Link
    
    Sender->>Recipient: Share QR Code
    Recipient->>Frontend: Scan QR Code
    Frontend->>Contract: claim-payment()
    Contract->>USDCx: Release from Escrow
    USDCx-->>Recipient: Funds Received
    Contract-->>Frontend: Payment Complete
```

---

## Features

| Feature | Description | USDCx Integration |
|---------|-------------|-------------------|
| **P2P Transfer** | Direct wallet-to-wallet transfers | Native USDCx transfers |
| **@Username Transfer** | Send to human-readable names | Resolves to address, transfers USDCx |
| **QR Scan Payment** | Scan and pay instantly | USDCx escrow claim |
| **Bridge Transfer** | Ethereum USDC to Stacks USDCx | xReserve protocol integration |
| **Escrow Payments** | Smart contract secured transfers | USDCx locked in contract |
| **Invoice Creation** | Request payments from others | USDCx payment fulfillment |

---

## Screenshots

### Username Transfer
*Register and send payments using @usernames instead of complex addresses*

<img width="1301" height="732" alt="image" src="https://github.com/user-attachments/assets/dc6f5ea9-638d-4422-9802-855de5160637" />


### QR Scan Payment
*Scan QR codes to instantly claim escrowed payments*

<img width="1293" height="848" alt="image" src="https://github.com/user-attachments/assets/3b547dc4-15fe-421c-8599-7250095de406" />


### Bridge Transfer
*Bridge USDC from Ethereum to Stacks as USDCx*

<img width="1920" height="1707" alt="screencapture-stackspay-pro-vercel-app-bridge-2026-01-19-21_45_46" src="https://github.com/user-attachments/assets/e028704b-5a7b-4689-ad9a-673c5e746491" />


### P2P Transfer
*Direct peer-to-peer USDCx transfers with real-time validation*

<img width="1323" height="840" alt="image" src="https://github.com/user-attachments/assets/2d9585a2-4892-49ac-9986-c27a81e87045" />


### Escrow Created
*Secure payment requests with funds locked in smart contract*

<img width="1332" height="843" alt="image" src="https://github.com/user-attachments/assets/78454267-e044-459d-a1e6-8fa18807b31e" />


### Invoice
*Create payment invoices for others to fulfill*

<img width="1280" height="855" alt="image" src="https://github.com/user-attachments/assets/4593465d-8e08-495b-a82b-f267377bfb30" />


---

## Project Structure

```
StackPay/
├── contracts/                    # Clarity Smart Contracts
│   ├── contracts/
│   │   ├── payment-requests.clar # Escrow & Invoice Payment Logic
│   │   └── username-registry.clar# On-chain Username Registry
│   ├── deployments/              # Deployment configurations
│   ├── settings/                 # Clarinet settings
│   └── tests/                    # Contract unit tests
│
├── frontend/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/           # React UI Components
│   │   │   ├── BridgeInterface.tsx
│   │   │   ├── SendPayment.tsx
│   │   │   ├── QRGenerator.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── ClaimPayment.tsx
│   │   │   ├── UsernameRegistry.tsx
│   │   │   ├── PaymentHistory.tsx
│   │   │   └── WalletConnect.tsx
│   │   ├── context/              # React Context Providers
│   │   ├── hooks/                # Custom React Hooks
│   │   ├── utils/                # Utility Functions
│   │   │   ├── stacksUtils.ts    # Stacks blockchain utilities
│   │   │   ├── bridgeUtils.ts    # Bridge integration
│   │   │   └── qrUtils.ts        # QR code utilities
│   │   └── App.tsx               # Main Application
│   └── public/                   # Static assets
│
├── screenshots/                  # Application screenshots
├── LICENSE                       # MIT License
└── README.md                     # This file
```

---

## Quick Start

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **Clarinet** for contract development ([Install](https://docs.hiro.so/clarinet/getting-started))
- **Stacks Wallet**: [Leather](https://leather.io/) or [Xverse](https://www.xverse.app/)
- **MetaMask** for Ethereum bridging ([Install](https://metamask.io/))

### Installation

```bash
# Clone the repository
git clone https://github.com/NikhilRaikwar/StackPay.git
cd StackPay

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file in the `frontend/` directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 📜 Smart Contracts (Testnet)
 
| Contract | Explorer Link |
|----------|---------------|
| 📄 **payment-requests-v9** | [View on Explorer](https://explorer.hiro.so/txid/ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5.payment-requests-v9?chain=testnet) |
| 📄 **username-registry** | [View on Explorer](https://explorer.hiro.so/txid/ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5.username-registry?chain=testnet) |

### Contract Functions

**payment-requests.clar:**
- `create-payment-request` - Lock funds in escrow
- `create-invoice-request` - Create payment invoice
- `claim-payment` - Claim escrowed funds
- `pay-invoice` - Fulfill invoice payment
- `cancel-payment-request` - Refund escrowed funds

**username-registry.clar:**
- `register-username` - Claim @username
- `get-address` - Resolve username to address
- `get-username` - Reverse lookup address to username

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Stacks (Bitcoin L2) |
| Smart Contracts | Clarity |
| Stablecoin | USDCx (via Circle xReserve) |
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| QR Codes | qrcode.react |
| Wallet Integration | @stacks/connect |
| Ethereum Bridge | ethers.js + MetaMask |

---

## Resources

- [USDCx Bridging Guide](https://docs.stacks.co/more-guides/bridging-usdcx)
- [Stacks Documentation](https://docs.stacks.co/)
- [Clarinet Contracts](https://docs.stacks.co/clarinet/overview)
- [Circle xReserve Protocol](https://www.circle.com/)
- [Hackathon Community (Skool)](https://www.skool.com/stackers/about)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Team

Built with passion for the **Programming USDCx on Stacks Builder Challenge** 

[![GitHub](https://img.shields.io/badge/GitHub-NikhilRaikwar-181717?style=for-the-badge&logo=github)](https://github.com/NikhilRaikwar/StackPay)

---

<div align="center">

**Built on Bitcoin. Powered by Stacks. Stabilized by USDCx.**

</div>
