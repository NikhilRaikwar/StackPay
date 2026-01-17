# 💸 StacksPay Pro

**Secure P2P USDCx payments on Stacks with QR codes, Escrow protection, and Ethereum-to-Stacks bridging.** 🚀

StacksPay Pro revolutionizes peer-to-peer payments on the Stacks blockchain. By leveraging smart contracts for escrow and utilizing the speed of USDCx, we ensure that every transaction is secure, transparent, and user-friendly.

---

## ✨ Features

-   **📱 QR Code Payments**: Instantly generate payment links that lock funds securely in a smart contract. Scan and pay in seconds!
-   **🔒 Escrow Security**: Trustless transactions! Funds are deducted from the sender immediately and held safely by the contract until the intended recipient claims them.
-   **🆔 Username Integration**: Say goodbye to long addresses. Send crypto directly to BNS `@usernames` (automatically resolves to Stacks addresses).
-   **📜 Payment History**: Keep track of your financial life. Monitor sent, received, and pending payments with real-time status updates powered by Firebase.
-   **🌉 Bridge Integration**: Seamlessly bridge USDC from Ethereum to Stacks directly within the app.

---

## 🛠️ How It Works (Escrow Model)

1.  **Sender Initiates** 🟢: The sender enters the amount and the recipient's details.
2.  **Funds Locked** 🔒: Funds are automatically transferred from the Sender's wallet to the **Payment Smart Contract**.
3.  **QR Code Generated** 🏁: A unique QR code is created for the transaction.
4.  **Scan & Claim** 📸: The Recipient scans the QR code.
5.  **Secure Transfer** 💸: The smart contract verifies the recipient's identity and instantly transfers the funds.

---

## 🚀 Quickstart

Get up and running in minutes!

### Prerequisites

*   🟢 **Node.js & npm**: [Download Here](https://nodejs.org/)
*   ⚡ **Clarinet**: For local contract development and testing.
*   👛 **Stacks Wallet**: Install [Leather](https://leather.io/) or [Xverse](https://www.xverse.app/).

### 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 🔗 Smart Contracts (Testnet)

We are live on the Stacks Testnet!

*   **🪙 USDCx Token**: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`
*   **📜 Payment Contract**: *(Check `frontend/src/utils/stacksUtils.ts` for the latest dynamic address)*

---

## ⚙️ Configuration

Create a `.env` file in the `frontend/` directory (copy `.env.example` if available):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config
NEXT_PUBLIC_STACKS_NETWORK=testnet
```

---

## 📂 Project Structure

*   `contracts/` 📜 - Clarity smart contracts (e.g., `payment-requests.clar`).
*   `frontend/` ⚛️ - The React + Vite web application.
    *   `src/components/QRGenerator.tsx` 🔳 - Locks funds & generates payment codes.
    *   `src/components/ClaimPayment.tsx` 📥 - Recipient claiming logic.
    *   `src/components/PaymentHistory.tsx` 🕒 - Transaction history & status.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request to help us improve StacksPay Pro.

## 📄 License

This project is open source.
