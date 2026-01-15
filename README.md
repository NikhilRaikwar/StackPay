# StacksPay Pro

Secure P2P USDCx payments on Stacks with QR codes, Escrow protection, and Ethereum-to-Stacks bridging.

## Features

-   **QR Code Payments**: Generate payment links that lock funds securely in a smart contract.
-   **Escrow Security**: Funds are deducted from the sender immediately and held by the contract until the intended recipient claims them.
-   **Username Integration**: Send to `@usernames` directly (resolves to BNS/Stacks addresses).
-   **Payment History**: Track sent, received, and pending payments with real-time status updates via Firebase.
-   **Bridge**: Integrated styling for bridging USDC from Ethereum.

## How It Works (Escrow Model)

1.  **Sender** creates a request: Enters amount & recipient.
    *   Funds are **transferred** from Sender to the Payment Contract.
2.  **QR Code** is generated.
3.  **Recipient** scans the QR code.
4.  **Recipient** claims the payment.
    *   Contract verifies identity and **transfers** funds to Recipient.

## Quickstart

### Prerequisites
-   Node.js & npm
-   Clarinet (for contract development)
-   Stacks Wallet (Leather or Xverse)

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Contracts
Deployed to Stacks Testnet.

-   **USDCx**: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx`
-   **Payment Contract**: Check `frontend/src/utils/stacksUtils.ts` for the latest deployment address.

## Configuration

Create a `.env` file in `frontend/` (see `.env.example` if available) with:
-   `VITE_FIREBASE_...` (Firebase Config)
-   `NEXT_PUBLIC_STACKS_NETWORK=testnet`

## Project Structure

-   `contracts/`: Clarity smart contracts (`payment-requests.clar`).
-   `frontend/`: React + Vite application.
    -   `src/components/QRGenerator.tsx`: Handles locking funds and generating codes.
    -   `src/components/ClaimPayment.tsx`: Handles claiming funds from escrow.
    -   `src/components/PaymentHistory.tsx`: Transaction tracking.

